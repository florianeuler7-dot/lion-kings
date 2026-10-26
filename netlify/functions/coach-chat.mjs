// Netlify Function: coach-chat
// Returns a Claude response in the context of the WinterArc coaching system

const MODEL = 'claude-sonnet-5-5';
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
  "push": { "name": "Push", "color": "from-red-600 to-orange-600", "exercises": [{ "name": "...", "sets": 4, "reps": "6-8", "restSec": 150, "hint": "..." }] },
  "pull": { "name": "Pull", "color": "from-red-600 to-rose-700", "exercises": [...] },
  "legs": { "name": "Beine & Core", "color": "from-red-700 to-amber-700", "exercises": [...] },
  "aesthetic": { "name": "Upper Aesthetic + KB", "color": "from-red-600 to-pink-700", "exercises": [...] },
  "cardio": { "name": "Zone-2 Cardio + Mobility", "color": "from-emerald-600 to-teal-700", "exercises": [] },
  "rest": { "name": "Pause", "color": "from-zinc-700 to-zinc-800", "exercises": [] },
  "schedule": ["rest", "push", "pull", "rest", "legs", "aesthetic", "cardio"]
}

REGELN:
- "schedule": 7 Einträge für So, Mo, Di, Mi, Do, Fr, Sa – NUR diese exakten Keys erlaubt: "push", "pull", "legs", "aesthetic", "cardio", "rest" – NIEMALS andere Werte wie "cardio_optional", "rest_day" o.ä.
- Bei weniger als 4 Krafttagen: lasse nicht benötigte Blöcke (z.B. "aesthetic") einfach weg
- "sets" ist eine Zahl, "reps" ein String, "restSec" eine Zahl in Sekunden
- restSec: 60–90 für Isolation, 120–180 für Grundübungen
- Antworte chat-freundlich, nicht wie ein Wall-of-Text, kein Markdown-Überschriften-Spam
- Wenn du noch Infos brauchst: KEIN JSON ausgeben, nur weiterfragen
- Wenn der User nur eine Frage stellt (z.B. "soll ich mehr Volumen machen?"), antworte ohne JSON – nur Beratung`;

function buildSystemPrompt(currentPlan, onboarding) {
  let prompt = COACH_SYSTEM_BASE;
  if (onboarding) {
    prompt += `\n\nKONTEXT: Der User ist gerade im Onboarding und erstellt seinen ersten Plan. Frage gezielt nach Trainingstagen, Ziel, Erfahrung und Cardio-Präferenz – dann erstelle den Plan.`;
  }
  if (currentPlan && typeof currentPlan === 'object') {
    // Only pass the keys the model is allowed to produce (strip app-internal "cardio_optional")
    const slim = {};
    for (const k of PLAN_KEYS) if (currentPlan[k]) slim[k] = currentPlan[k];
    if (Array.isArray(currentPlan.schedule)) {
      slim.schedule = currentPlan.schedule.map(k => (k === 'cardio_optional' ? 'cardio' : k));
    }
    prompt += `\n\nAKTUELLER PLAN DES USERS:\n${JSON.stringify(slim, null, 2)}\n\nBerücksichtige diesen Plan bei deinen Antworten. Bei Plan-Änderungen: nur die nötigen Sachen anpassen, den Rest beibehalten.`;
  }
  return prompt;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

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
  return out;
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = (process.env.COACH_API_KEY || (globalThis.Netlify?.env?.get('COACH_API_KEY')) || '').trim();
  if (!apiKey) return json({ error: 'API key not configured' }, 500);

  try {
    const { messages, currentPlan, onboarding } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Keine Messages übergeben' }, 400);
    }
    const cleanMessages = sanitizeMessages(messages);
    if (cleanMessages.length === 0) return json({ error: 'Keine Nachricht übergeben' }, 400);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let anthropicResp;
    try {
      anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          // Chat use case: keep latency low
          output_config: { effort: 'low' },
          system: buildSystemPrompt(currentPlan, onboarding),
          messages: cleanMessages,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') {
        return json({ error: 'Coach antwortet nicht – nochmal versuchen.' }, 504);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error('Anthropic error:', errText);
      return json({ error: 'Coach gerade nicht erreichbar.', detail: errText }, 502);
    }

    const data = await anthropicResp.json();

    if (data.stop_reason === 'refusal') {
      return json({ reply: 'Dabei kann ich leider nicht helfen. Frag mich gern was zu Training oder Ernährung.', plan: null });
    }

    // Response may contain thinking blocks before the text block – find the text explicitly.
    const reply = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    // Detect if the reply contains a finished plan (JSON in code block)
    let plan = null;
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/i);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed && typeof parsed === 'object') plan = parsed;
      } catch (e) {
        console.error('Coach JSON parse error:', e);
      }
    }

    // Strip the JSON block from the visible reply
    const visibleReply = reply.replace(/```json[\s\S]*?```/gi, '').trim()
      || (plan ? 'Hier ist dein Plan.' : '…');

    return json({ reply: visibleReply, plan });
  } catch (e) {
    console.error('Function error:', e);
    return json({ error: e.message }, 500);
  }
};
