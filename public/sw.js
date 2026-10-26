// Service worker – offline shell cache + scheduled notifications
//
// Strategy:
//   • HTML / navigation  → network-first (so a new deploy is picked up immediately),
//                           cached copy only as offline fallback
//   • Hashed build assets (/assets/*) → cache-first (immutable)
//   • Everything else (Supabase API, Netlify functions, fonts, third-party) → network only
const CACHE = 'noexcuses-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.add('/').catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // never touch third-party / API hosts
  if (url.pathname.startsWith('/.netlify/')) return;          // serverless functions

  // Navigation / HTML → network-first
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Immutable hashed assets → cache-first
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }))
    );
    return;
  }

  // Icons, manifest etc. → stale-while-revalidate
  e.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});

// ── Scheduled notifications ──────────────────────────────────────────────────
// App posts { type:'SCHEDULE_NOTIFICATION', id, endAt, title, body }
// We fire showNotification() at the right moment (survives screen lock).
const pending = new Map();

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'SCHEDULE_NOTIFICATION') {
    const { id, endAt, title, body } = msg;
    if (pending.has(id)) clearTimeout(pending.get(id));
    const delay = Math.max(0, endAt - Date.now());
    const timer = setTimeout(async () => {
      pending.delete(id);
      try {
        await self.registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          tag: id,
          renotify: true,
        });
      } catch (_) {}
    }, delay);
    pending.set(id, timer);
  }

  if (msg.type === 'CANCEL_NOTIFICATION') {
    if (pending.has(msg.id)) {
      clearTimeout(pending.get(msg.id));
      pending.delete(msg.id);
    }
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const win = list.find(c => c.url.startsWith(self.location.origin));
      return win ? win.focus() : clients.openWindow('/');
    })
  );
});
