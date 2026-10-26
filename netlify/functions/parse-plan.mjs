// Netlify Function: parse-plan
// Takes raw text (e.g. pasted plan) and asks Claude to structure it into the app's PLAN format

const MODEL = 'claude-sonnet-5-5';

const SYSTEM_PROMPT = `Du bist ein Trainings-Plan-Parser für die App "WinterArc 26/27".

Du bekommst einen Trainingsplan als Freitext und musst ihn in EXAKT dieses JSON-Format umwandeln:

{
  "push": { "name": "Push", "color": "from-red-600 to-orange-600", "exercises": [...] },
  "pull": { "name": "Pull", "color": "from-red-600 to-rose-700", "exercises": [...] },
  "legs": { "name": "Beine & Core", "color": "from-red-700 to-amber-700", "exercises": [...] },
  "aesthetic": { "name": "Upper Aesthetic + KB", "color": "from-red-600 to-pink-700", "exercises": [...] },
  "cardio": { "name": "Zone-2 Cardio + Mobility", "color": "from-emerald-600 to-teal-700", "exercises": [] },
  "rest": { "name": "Pause", "color": "from-zinc-700 to-zinc-800", "exercises": [] },
  "schedule": ["rest", "push", "pull", "rest", "legs", "aesthetic", "cardio"]
}

Jede Übung hat dieses Format:
{ "name": "Bankdrücken (Smith)", "sets": 4, "reps": "6-8", "restSec": 150, "hint": "Stabil, Brust isolieren" }

REGELN:
- "schedule" ist ein Array von 7 Einträgen (So, Mo, Di, Mi, Do, Fr, Sa) – nur die Keys "push", "pull", "legs", "aesthetic", "cardio", "rest"
- Wenn der User keine klare Aufteilung Push/Pull/Beine/Aesthetic hat, mappe trotzdem auf diese 4 Kategorien (z.B. "Brust+Trizeps" → push, "Rücken+Bizeps" → pull, "Beine" → legs, "Ganzkörper/Optional" → aesthetic)
- Bei weniger als 4 Krafttagen: nicht benötigte Blöcke weglassen
- "sets" ist eine Zahl, "reps" ein String, "restSec" eine Zahl in Sekunden
- restSec: 60–90 für Isolation, 120–180 für Grundübungen wie Kniebeugen, Bankdrücken, Kreuzheben
- "hint": kurzer Coaching-Tipp für die Übung (z.B. "Volle Streckung", "Kein Schwung")
- Übersetze englische Übungsnamen ins Deutsche wenn sinnvoll
- Wenn unklar wo eine Übung hingehört: am ehesten passende Kategorie wählen

Antworte NUR mit dem JSON, keine Erklärungen, keine Markdown-Codeblocks.`;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = (process.env.COACH_API_KEY || (globalThis.Netlify?.env?.get('COACH_API_KEY')) || '').trim();
  if (!apiKey) return json({ error: 'API key not configured' }, 500);

  try {
    const { text } = await req.json();
    if (!text || String(text).trim().length < 20) {
      return json({ error: 'Plan-Text zu kurz' }, 400);
    }

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
          output_config: { effort: 'low' },
          system: SYSTEM_PROMPT,
          messages: [
            { role: 'user', content: `Hier ist mein Trainingsplan:\n\n${String(text).slice(0, 20000)}` },
          ],
        }),
        signal: controller.signal,
      });
    } catch (e) {
      if (e.name === 'AbortError') {
        return json({ error: 'Verarbeitung dauert zu lange – Plan kürzer fassen und nochmal versuchen.' }, 504);
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
      return json({ error: 'Plan konnte nicht verarbeitet werden' }, 422);
    }
    const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

    // Try to parse JSON out of the response (strip code fences just in case)
    let plan;
    try {
      let cleaned = reply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      // Fallback: grab the outermost {...} if the model added prose around it
      if (!cleaned.startsWith('{')) {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
      }
      plan = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse error:', e, 'reply was:', reply);
      return json({ error: 'Plan konnte nicht strukturiert werden', raw: reply }, 500);
    }

    return json({ plan });
  } catch (e) {
    console.error('Function error:', e);
    return json({ error: e.message }, 500);
  }
};
