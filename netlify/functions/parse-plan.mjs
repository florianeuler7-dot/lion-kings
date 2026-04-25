// Netlify Function: parse-plan
// Takes raw text or PDF-extracted text and asks Claude to structure it into the app's PLAN format

const SYSTEM_PROMPT = `Du bist ein Trainings-Plan-Parser für die App "Lion Kings".

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
- "schedule" ist ein Array von 7 Einträgen (So, Mo, Di, Mi, Do, Fr, Sa) – der Wochenstruktur
- Wenn der User keine klare Aufteilung Push/Pull/Beine/Aesthetic hat, mappe trotzdem auf diese 4 Kategorien (z.B. "Brust+Trizeps" → push, "Rücken+Bizeps" → pull, "Beine" → legs, "Ganzkörper/Optional" → aesthetic)
- restSec: 60–90 für Isolation, 120–180 für Grundübungen wie Kniebeugen, Bankdrücken, Kreuzheben
- "hint": kurzer Coaching-Tipp für die Übung (z.B. "Volle Streckung", "Kein Schwung")
- Übersetze englische Übungsnamen ins Deutsche wenn sinnvoll
- Wenn unklar wo eine Übung hingehört: am ehesten passende Kategorie wählen

Antworte NUR mit dem JSON, keine Erklärungen, keine Markdown-Codeblocks.`;

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { text } = await req.json();
    if (!text || text.trim().length < 20) {
      return new Response(JSON.stringify({ error: 'Plan-Text zu kurz' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: `Hier ist mein Trainingsplan:\n\n${text}` },
        ],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error('Anthropic error:', errText);
      return new Response(JSON.stringify({ error: 'Claude API error', detail: errText }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await anthropicResp.json();
    const reply = data.content?.[0]?.text || '';

    // Try to parse JSON out of the response
    let plan;
    try {
      // Strip code fences just in case
      const cleaned = reply.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      plan = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse error:', e, 'reply was:', reply);
      return new Response(JSON.stringify({ error: 'Plan konnte nicht strukturiert werden', raw: reply }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ plan }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Function error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
