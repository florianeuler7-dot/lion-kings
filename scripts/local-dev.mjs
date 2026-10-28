// Local dev server for the Netlify Edge Functions (served under /api/*).
// API key: uses COACH_API_KEY from the environment / .env, otherwise fetches it from Netlify.
import http from 'node:http';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;

// 1. .env file (optional, gitignored)
try {
  const env = readFileSync(`${root}.env`, 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

// 2. Netlify CLI
let apiKey = (process.env.COACH_API_KEY || '').trim();
if (!apiKey) {
  try {
    apiKey = execSync('netlify env:get COACH_API_KEY', { cwd: root, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    console.error('✗ Could not load COACH_API_KEY (set it in .env or via `netlify env:get`).');
  }
}
if (apiKey) console.log('✓ COACH_API_KEY loaded (' + apiKey.slice(0, 12) + '...)');
process.env.COACH_API_KEY = apiKey;

// Provide Netlify global so functions don't throw ReferenceError
globalThis.Netlify = { env: { get: (k) => process.env[k] || '' } };

const { default: coachChatHandler } = await import('../netlify/edge-functions/coach-chat.js');
const { default: parsePlanHandler } = await import('../netlify/edge-functions/parse-plan.js');

const HANDLERS = {
  'coach-chat': coachChatHandler,
  'parse-plan': parsePlanHandler,
};

const server = http.createServer(async (req, res) => {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const match = req.url?.match(/^\/api\/([^/?]+)/);
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
    res.writeHead(webRes.status, {
      'Content-Type': webRes.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-cache',
    });
    if (!webRes.body) { res.end(); return; }
    // Stream through (NDJSON from the coach) instead of buffering
    for await (const chunk of webRes.body) res.write(chunk);
    res.end();
  } catch (e) {
    console.error('Function error:', e);
    res.writeHead(500);
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(8889, () => {
  console.log('✓ Functions server: http://localhost:8889/api/');
});
