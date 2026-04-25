// Local dev server for Netlify Functions
// Fetches COACH_API_KEY from Netlify at startup – no .env file needed
import http from 'node:http';
import { execSync } from 'node:child_process';

let apiKey = '';
try {
  apiKey = execSync('netlify env:get COACH_API_KEY', {
    cwd: new URL('..', import.meta.url).pathname,
    encoding: 'utf-8',
  }).trim();
  console.log('✓ COACH_API_KEY loaded from Netlify (' + apiKey.slice(0, 12) + '...)');
} catch (e) {
  console.error('✗ Could not load COACH_API_KEY from Netlify:', e.message);
}
process.env.COACH_API_KEY = apiKey;

// Provide Netlify global so functions don't throw ReferenceError
globalThis.Netlify = { env: { get: (k) => process.env[k] || '' } };

const { default: coachChatHandler } = await import('../netlify/functions/coach-chat.mjs');
const { default: parsePlanHandler } = await import('../netlify/functions/parse-plan.mjs');

const HANDLERS = {
  'coach-chat': coachChatHandler,
  'parse-plan': parsePlanHandler,
};

const server = http.createServer(async (req, res) => {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const match = req.url?.match(/^\/.netlify\/functions\/([^/?]+)/);
  if (!match) { res.writeHead(404); res.end('Not found'); return; }

  const handler = HANDLERS[match[1]];
  if (!handler) { res.writeHead(404); res.end('Function not found'); return; }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  const webReq = new Request(`http://localhost${req.url}`, {
    method: req.method,
    headers: Object.fromEntries(
      Object.entries(req.headers).filter(([k]) => k !== 'host')
    ),
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
  });

  try {
    const webRes = await handler(webReq);
    const resBody = await webRes.text();
    res.writeHead(webRes.status, { 'Content-Type': 'application/json' });
    res.end(resBody);
  } catch (e) {
    console.error('Function error:', e);
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(8889, () => {
  console.log('✓ Functions server: http://localhost:8889/.netlify/functions/');
});
