// Netlify Function: coach-chat
// Streams or returns a Claude response in the context of the LION KINGS coaching system

const COACH_SYSTEM_BASE = `Du bist der Coach in der App "Lion Kings", einer Trainings-App für eine kleine Crew von ambitionierten Sportlern.

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
- restSec: 60–90 für Isolation, 120–180 für Grundübungen
- Antworte chat-freundlich, nicht wie ein Wall-of-Text
- Wenn du noch Infos brauchst: KEIN JSON ausgeben, nur weiterfragen
- Wenn der User nur eine Frage stellt (z.B. "soll ich mehr Volumen machen?"), antworte ohne JSON – nur Beratung`;

function buildSystemPrompt(currentPlan, onboarding) {
  let prompt = COACH_SYSTEM_BASE;
  if (onboarding) {
    prompt += `\n\nKONTEXT: Der User ist gerade im Onboarding und erstellt seinen ersten Plan. Frage gezielt nach Trainingstagen, Ziel, Erfahrung und Cardio-Präferenz – dann erstelle den Plan.`;
  }
  if (currentPlan) {
    prompt += `\n\nAKTUELLER PLAN DES USERS:\n${JSON.stringify(currentPlan, null, 2)}\n\nBerücksichtige diesen Plan bei deinen Antworten. Bei Plan-Änderungen: nur die nötigen Sachen anpassen, den Rest beibehalten.`;
  }
  return prompt;
}

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
    const { messages, currentPlan, onboarding } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Keine Messages übergeben' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          system: buildSystemPrompt(currentPlan, onboarding),
          // Anthropic requires the first message to be from `user`.
          // Filter out a leading assistant greeting if present.
          messages: messages[0]?.role === 'assistant' ? messages.slice(1) : messages,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === 'AbortError') {
        return new Response(JSON.stringify({ error: 'Coach antwortet nicht – nochmal versuchen.' }), {
          status: 504,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

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

    // Detect if the reply contains a finished plan (JSON in code block)
    let plan = null;
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        plan = JSON.parse(jsonMatch[1].trim());
      } catch (e) {
        console.error('Coach JSON parse error:', e);
      }
    }

    // Strip the JSON block from the visible reply
    const visibleReply = reply.replace(/```json[\s\S]*?```/g, '').trim();

    return new Response(JSON.stringify({ reply: visibleReply, plan }), {
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
