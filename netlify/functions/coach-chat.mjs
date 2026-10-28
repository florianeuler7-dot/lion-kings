// Netlify Function: coach-chat
// Streams a Claude response (NDJSON) in the context of the WinterArc coaching system.
// Lines: {type:'start'} → {type:'delta', text} … → {type:'done', reply, plan} | {type:'error', error, detail}

import { getApiKey, streamClaude, ndjsonResponse, errorResponse, json } from './lib/anthropic.mjs';

const PLAN_KEYS = ['push', 'pull', 'legs', 'aesthetic', 'cardio', 'rest'];

const COACH_SYSTEM_BASE = `Du bist der Coach in der App "WinterArc 26/27", einer Trainings-App für eine kleine Crew von ambitionierten Sportlern.

DEINE ROLLE:
- Du erstellst, optimierst und besprichst Trainingspläne
- Du gibst Ernährungs-Empfehlungen wenn gewünscht
- Du sprichst Deutsch, kurz und auf den Punkt – wie ein erfahrener Personal Trainer
- Bei Erstellung eines neuen Plans: stelle gezielte Fragen (Trainingstage, Ziel, Erfahrung, Cardio, ggf. Ernährung), bevor du den Plan erstellst
- Wenn der User einen bestehenden Plan anpassen möchte: schlage konkrete Änderungen vor, frage nach was unklar ist
- Wenn der User signalisiert dass alle Infos da sind oder du genug weißt: sage "Ich erstelle den Plan jetzt." und gib am Ende deiner Nachricht das JSON in einem \`\`\`json Codeblock aus

PLAN-FORMAT (in JSON-Codeblock am Ende der Nachricht):
{
  "push": { "name": "Push", "exercises": [{ "name": "...", "sets": 4, "reps": "6-8", "restSec": 150, "hint": "..." }] },
  "pull": { "name": "Pull", "exercises": [...] },
  "legs": { "name": "Beine & Core", "exercises": [...] },
  "aesthetic": { "name": "Upper Aesthetic + KB", "exercises": [...] },
  "cardio": { "name": "Zone-2 Cardio + Mobility", "exercises": [] },
  "rest": { "name": "Pause", "exercises": [] },
  "schedule": ["rest", "push", "pull", "rest", "legs", "aesthetic", "cardio"]
}

REGELN:
- "schedule": 7 Einträge für So, Mo, Di, Mi, Do, Fr, Sa – NUR diese exakten Keys erlaubt: "push", "pull", "legs", "aesthetic", "cardio", "rest" – NIEMALS andere Werte wie "cardio_optional", "rest_day" o.ä.
- Bei weniger als 4 Krafttagen: lasse nicht benötigte Blöcke (z.B. "aesthetic") einfach weg
- "sets" ist eine Zahl, "reps" ein String, "restSec" eine Zahl in Sekunden
- restSec: 60–90 für Isolation, 120–180 für Grundübungen
- Das JSON kompakt ausgeben: eine Zeile, keine Einrückung. "hint" maximal 3 Wörter oder weglassen. Kein "color"-Feld.
- Antworte chat-freundlich, nicht wie ein Wall-of-Text, kein Markdown-Überschriften-Spam
- Wenn du noch Infos brauchst: KEIN JSON ausgeben, nur weiterfragen
- Wenn der User nur eine Frage stellt (z.B. "soll ich mehr Volumen machen?"), antworte ohne JSON – nur Beratung`;

function buildSystemPrompt(currentPlan, onboarding) {
  let prompt = COACH_SYSTEM_BASE;
  if (onboarding) {
    prompt += `\n\nKONTEXT: Der User ist gerade im Onboarding und erstellt seinen ersten Plan. Frage gezielt nach Trainingstagen, Ziel, Erfahrung und Cardio-Präferenz – dann erstelle den Plan.`;
  }
  if (currentPlan && typeof currentPlan === 'object') {
    // Only pass the keys the model is allowed to produce (strip app-internal "cardio_optional"),
    // and strip colors – the app assigns them itself.
    const slim = {};
    for (const k of PLAN_KEYS) {
      if (!currentPlan[k]) continue;
      const { color, ...rest } = currentPlan[k];
      slim[k] = rest;
    }
    if (Array.isArray(currentPlan.schedule)) {
      slim.schedule = currentPlan.schedule.map(k => (k === 'cardio_optional' ? 'cardio' : k));
    }
    prompt += `\n\nAKTUELLER PLAN DES USERS:\n${JSON.stringify(slim)}\n\nBerücksichtige diesen Plan bei deinen Antworten. Bei Plan-Änderungen: nur die nötigen Sachen anpassen, den Rest beibehalten.`;
  }
  return prompt;
}

// Anthropic requires alternating roles starting with `user`.
function sanitizeMessages(messages) {
  const out = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const content = String(m.content ?? '').trim();
    if (!content) continue;
    if (out.length === 0 && m.role !== 'user') continue;          // drop leading assistant greeting
    if (out.length && out[out.length - 1].role === m.role) {      // merge consecutive same-role
      out[out.length - 1].content += `\n\n${content}`;
    } else {
      out.push({ role: m.role, content });
    }
  }
  // Keep the request small: the last 30 turns are plenty of context for a coach chat.
  return out.slice(-30);
}

// Extract the plan JSON block and the visible reply from the full text.
export function splitReply(reply) {
  let plan = null;
  const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/i) || reply.match(/```\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed && typeof parsed === 'object') plan = parsed;
    } catch (e) {
      console.error('Coach JSON parse error:', e);
    }
  }
  const visibleReply = reply.replace(/```(?:json)?[\s\S]*?```/gi, '').trim()
    || (plan ? 'Hier ist dein Plan.' : '…');
  return { reply: visibleReply, plan };
}

async function* coachStream({ apiKey, system, messages }) {
  let full = '';
  let stopReason = null;
  for await (const ev of streamClaude({ apiKey, system, messages, maxTokens: 3000 })) {
    if (ev.type === 'start') yield { type: 'start', model: ev.model };
    else if (ev.type === 'text') { full += ev.text; yield { type: 'delta', text: ev.text }; }
    else if (ev.type === 'stop') stopReason = ev.stopReason;
  }
  if (stopReason === 'refusal') {
    yield { type: 'done', reply: 'Dabei kann ich leider nicht helfen. Frag mich gern was zu Training oder Ernährung.', plan: null };
    return;
  }
  const { reply, plan } = splitReply(full.trim());
  yield { type: 'done', reply, plan, truncated: stopReason === 'max_tokens' };
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = getApiKey();
  if (!apiKey) return json({ error: 'API-Key nicht konfiguriert (Netlify: COACH_API_KEY).' }, 500);

  try {
    const { messages, currentPlan, onboarding } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Keine Messages übergeben' }, 400);
    }
    const cleanMessages = sanitizeMessages(messages);
    if (cleanMessages.length === 0) return json({ error: 'Keine Nachricht übergeben' }, 400);

    const system = buildSystemPrompt(currentPlan, onboarding);
    return await ndjsonResponse(coachStream({ apiKey, system, messages: cleanMessages }));
  } catch (e) {
    return errorResponse(e);
  }
};
