// Service worker – offline cache + scheduled notifications
const CACHE = 'noexcuses-v1';
const ASSETS = ['/'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(res => {
        const clone = res.clone();
        if (res.ok) caches.open(CACHE).then(c => c.put(e.request, clone));
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
