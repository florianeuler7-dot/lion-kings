// Shared Anthropic access for the Netlify Functions.
// Raw fetch (no SDK) keeps the function bundle tiny. Responses are streamed so
// long answers (full plans) don't run into the function execution limit.
//
// Not a function itself: Netlify only registers top-level files or
// <dir>/<dir>.mjs / <dir>/index.mjs as functions, so lib/anthropic.mjs is just a module.

const API_URL = process.env.COACH_API_URL || 'https://api.anthropic.com/v1/messages';

// Override via Netlify env if a model is unavailable for the account.
export const PRIMARY_MODEL = (process.env.COACH_MODEL || 'claude-sonnet-5-5').trim();
export const FALLBACK_MODEL = (process.env.COACH_FALLBACK_MODEL || 'claude-sonnet-4-5').trim();

// Older 4.x models reject `output_config.effort`.
const supportsEffort = (model) => !/-4-\d/.test(model);

export function getApiKey() {
  return (process.env.COACH_API_KEY || globalThis.Netlify?.env?.get('COACH_API_KEY') || '').trim();
}

export class CoachError extends Error {
  constructor(message, status = 502, detail = '') {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// Map an Anthropic error response to a German message and decide whether the
// fallback model is worth a try.
function describeError(status, text) {
  let msg = text;
  try { msg = JSON.parse(text)?.error?.message || text; } catch { /* plain text */ }
  const detail = String(msg).slice(0, 300);
  if (status === 401) return { message: 'API-Key ungültig – in Netlify die Variable COACH_API_KEY prüfen.', fallback: false, detail };
  if (/credit|billing|balance/i.test(detail)) return { message: 'Kein Guthaben auf dem Anthropic-Konto.', fallback: false, detail };
  if (status === 429) return { message: 'Zu viele Anfragen – kurz warten und nochmal.', fallback: true, detail };
  if (status === 400 || status === 403 || status === 404) return { message: 'Modell nicht verfügbar.', fallback: true, detail };
  if (status === 529 || status >= 500) return { message: 'Anthropic ist gerade überlastet – gleich nochmal versuchen.', fallback: true, detail };
  return { message: 'Coach gerade nicht erreichbar.', fallback: true, detail };
}

// Parse a Server-Sent-Events body into { event, data } objects.
async function* readSse(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = 'message';
      const dataLines = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (!dataLines.length) continue;
      let data = null;
      try { data = JSON.parse(dataLines.join('\n')); } catch { continue; }
      yield { event, data };
    }
  }
}

/**
 * Streams a Claude answer. Yields:
 *   { type: 'start', model }
 *   { type: 'text', text }          – text delta (thinking blocks are skipped)
 *   { type: 'stop', stopReason }
 * Tries PRIMARY_MODEL first and falls back to FALLBACK_MODEL when the primary
 * request is rejected (model unavailable, overloaded, rate limited).
 * Throws CoachError when no model answers.
 */
export async function* streamClaude({ apiKey, system, messages, maxTokens = 2048, stallMs = 20000, totalMs = 90000 }) {
  const models = [...new Set([PRIMARY_MODEL, FALLBACK_MODEL].filter(Boolean))];
  const startedAt = Date.now();
  let lastError = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1;
    const controller = new AbortController();
    let stallTimer = setTimeout(() => controller.abort(), stallMs);
    const touch = () => {
      clearTimeout(stallTimer);
      const remaining = totalMs - (Date.now() - startedAt);
      stallTimer = setTimeout(() => controller.abort(), Math.max(0, Math.min(stallMs, remaining)));
    };

    const body = { model, max_tokens: maxTokens, stream: true, system, messages };
    if (supportsEffort(model)) body.output_config = { effort: 'low' }; // chat: keep latency low

    let resp;
    try {
      resp = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(stallTimer);
      lastError = new CoachError(
        e.name === 'AbortError' ? 'Coach antwortet nicht – nochmal versuchen.' : 'Keine Verbindung zu Anthropic.',
        504, String(e.message || e).slice(0, 200));
      if (isLast) throw lastError;
      continue;
    }

    if (!resp.ok) {
      clearTimeout(stallTimer);
      const text = await resp.text().catch(() => '');
      const { message, fallback, detail } = describeError(resp.status, text);
      console.error(`Anthropic ${resp.status} (${model}):`, detail);
      lastError = new CoachError(message, resp.status === 429 ? 429 : 502, `${model}: ${detail}`);
      if (fallback && !isLast) continue;
      throw lastError;
    }

    yield { type: 'start', model };
    try {
      for await (const { event, data } of readSse(resp.body)) {
        touch();
        if (event === 'error' || data?.type === 'error') {
          const detail = data?.error?.message || JSON.stringify(data).slice(0, 200);
          throw new CoachError('Coach-Antwort abgebrochen – nochmal versuchen.', 502, detail);
        }
        if (data?.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
          yield { type: 'text', text: data.delta.text || '' };
        } else if (data?.type === 'message_delta' && data.delta?.stop_reason) {
          yield { type: 'stop', stopReason: data.delta.stop_reason };
        }
      }
    } catch (e) {
      if (e instanceof CoachError) throw e;
      throw new CoachError(
        e.name === 'AbortError' ? 'Coach-Antwort hat zu lange gedauert – kürzer fragen und nochmal.' : 'Coach-Antwort abgebrochen.',
        504, String(e.message || e).slice(0, 200));
    } finally {
      clearTimeout(stallTimer);
    }
    return;
  }
  throw lastError || new CoachError('Coach gerade nicht erreichbar.');
}

// ── Response helpers ──────────────────────────────────────────────────────────

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Turns an async generator of JSON-serialisable objects into an NDJSON streaming
 * Response (one JSON object per line). The first value is awaited before the
 * Response is created so that upstream errors still become proper HTTP errors.
 */
export async function ndjsonResponse(gen) {
  const first = await gen.next(); // throws CoachError → caller maps to JSON error
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const push = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      try {
        if (!first.done) push(first.value);
        for await (const value of gen) push(value);
      } catch (e) {
        console.error('Stream error:', e);
        push({ type: 'error', error: e.message || 'Fehler', detail: e.detail || '' });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

export function errorResponse(e) {
  if (e instanceof CoachError) return json({ error: e.message, detail: e.detail }, e.status);
  console.error('Function error:', e);
  return json({ error: e.message || 'Unbekannter Fehler' }, 500);
}
