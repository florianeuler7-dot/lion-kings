// Netlify Function: parse-plan
// Takes raw text (e.g. pasted plan) and asks Claude to structure it into the app's PLAN format.
// Streams NDJSON: {type:'start'} … {type:'done', plan} | {type:'error', error}

import { getApiKey, streamClaude, ndjsonResponse, errorResponse, json, CoachError } from './lib/anthropic.mjs';

const SYSTEM_PROMPT = `Du bist ein Trainings-Plan-Parser für die App "WinterArc 26/27".

Du bekommst einen Trainingsplan als Freitext und musst ihn in EXAKT dieses JSON-Format umwandeln:

{
  "push": { "name": "Push", "exercises": [...] },
  "pull": { "name": "Pull", "exercises": [...] },
  "legs": { "name": "Beine & Core", "exercises": [...] },
  "aesthetic": { "name": "Upper Aesthetic + KB", "exercises": [...] },
  "cardio": { "name": "Zone-2 Cardio + Mobility", "exercises": [] },
  "rest": { "name": "Pause", "exercises": [] },
  "schedule": ["rest", "push", "pull", "rest", "legs", "aesthetic", "cardio"]
}

Jede Übung hat dieses Format:
{ "name": "Bankdrücken (Smith)", "sets": 4, "reps": "6-8", "restSec": 150, "hint": "Brust isolieren" }

REGELN:
- "schedule" ist ein Array von 7 Einträgen (So, Mo, Di, Mi, Do, Fr, Sa) – nur die Keys "push", "pull", "legs", "aesthetic", "cardio", "rest"
- Wenn der User keine klare Aufteilung Push/Pull/Beine/Aesthetic hat, mappe trotzdem auf diese 4 Kategorien (z.B. "Brust+Trizeps" → push, "Rücken+Bizeps" → pull, "Beine" → legs, "Ganzkörper/Optional" → aesthetic)
- Bei weniger als 4 Krafttagen: nicht benötigte Blöcke weglassen
- "sets" ist eine Zahl, "reps" ein String, "restSec" eine Zahl in Sekunden
- restSec: 60–90 für Isolation, 120–180 für Grundübungen wie Kniebeugen, Bankdrücken, Kreuzheben
- "hint": kurzer Coaching-Tipp, maximal 3 Wörter (z.B. "Volle Streckung", "Kein Schwung")
- Übersetze englische Übungsnamen ins Deutsche wenn sinnvoll
- Wenn unklar wo eine Übung hingehört: am ehesten passende Kategorie wählen

Antworte NUR mit dem JSON, kompakt in einer Zeile, keine Erklärungen, keine Markdown-Codeblocks.`;

export function extractPlan(reply) {
  let cleaned = reply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // Fallback: grab the outermost {...} if the model added prose around it
  if (!cleaned.startsWith('{')) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  }
  return JSON.parse(cleaned);
}

async function* parseStream({ apiKey, text }) {
  let full = '';
  let stopReason = null;
  const messages = [{ role: 'user', content: `Hier ist mein Trainingsplan:\n\n${text}` }];
  for await (const ev of streamClaude({ apiKey, system: SYSTEM_PROMPT, messages, maxTokens: 3000 })) {
    if (ev.type === 'start') yield { type: 'start', model: ev.model };
    else if (ev.type === 'text') full += ev.text;
    else if (ev.type === 'stop') stopReason = ev.stopReason;
  }
  if (stopReason === 'refusal') throw new CoachError('Plan konnte nicht verarbeitet werden', 422);
  let plan;
  try {
    plan = extractPlan(full.trim());
  } catch (e) {
    console.error('JSON parse error:', e, 'reply was:', full);
    throw new CoachError('Plan konnte nicht strukturiert werden – Text klarer formatieren.', 500, full.slice(0, 200));
  }
  yield { type: 'done', plan };
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = getApiKey();
  if (!apiKey) return json({ error: 'API-Key nicht konfiguriert (Netlify: COACH_API_KEY).' }, 500);

  try {
    const { text } = await req.json();
    if (!text || String(text).trim().length < 20) {
      return json({ error: 'Plan-Text zu kurz' }, 400);
    }
    return await ndjsonResponse(parseStream({ apiKey, text: String(text).slice(0, 20000) }));
  } catch (e) {
    return errorResponse(e);
  }
};
