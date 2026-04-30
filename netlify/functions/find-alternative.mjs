// Netlify Function: find-alternative
// Given a blocked exercise, returns 2-3 alternatives from Claude Haiku (fast + cheap)

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = (process.env.COACH_API_KEY || Netlify.env.get('COACH_API_KEY') || '').trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { exerciseName, exerciseHint, planKey, prevExercise, nextExercise } = await req.json();

    const system = `Du bist ein erfahrener Personal Trainer. Ein Gerät im Studio ist belegt.
Schlage genau 2-3 Alternativübungen vor. Antworte NUR mit einem JSON-Array – keine Erklärung davor oder danach:
[
  { "name": "...", "hint": "...", "reason": "..." },
  ...
]
Felder:
- name: kurzer Übungsname (max 4 Wörter)
- hint: Ausführungshinweis in einem Satz
- reason: warum diese Alternative passt – gleiche Muskelgruppe, benötigtes Equipment (1 kurzer Satz)
Equipment: Standard-Fitnessstudio (Kurzhanteln, Langhanteln, Kabelzug, Maschinen, Körpergewicht).
Wichtig: Wähle Übungen, die ohne das belegte Gerät funktionieren.`;

    const context = [
      `Belegte Übung: ${exerciseName}${exerciseHint ? ` (${exerciseHint})` : ''}`,
      `Trainingseinheit: ${planKey || 'unbekannt'}`,
      prevExercise ? `Vorherige Übung: ${prevExercise}` : null,
      nextExercise ? `Nächste Übung: ${nextExercise}` : null,
    ].filter(Boolean).join('\n');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let resp;
    try {
      resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system,
          messages: [{ role: 'user', content: context }],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!resp.ok) {
      const err = await resp.text();
      return new Response(JSON.stringify({ error: 'API error', detail: err }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text || '[]';

    let alternatives = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      alternatives = JSON.parse(match ? match[0] : text);
    } catch (e) {
      console.error('Alternative parse error:', e, text);
    }

    return new Response(JSON.stringify({ alternatives }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('find-alternative error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
