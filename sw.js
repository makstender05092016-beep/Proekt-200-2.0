/* ПРОЕКТ 200 — Service Worker: офлайн-кэш приложения */
const VERSION = 'p200-v1.2.0';
const FILES = ['./', 'index.html', 'styles.css', 'kosmos129.ttf', 'vkhute.ttf', 'core.js', 'database.js', 'content-math.js', 'content-physics.js', 'tasks.js', 'viz.js', 'labs.js', 'fx.js', 'exam.js', 'app.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

async function fillCache() {
  const c = await caches.open(VERSION);
  // cache: 'reload' — берём свежие файлы с сервера, минуя HTTP-кэш браузера
  await Promise.all(FILES.map(async f => { const r = await fetch(new Request(f, { cache: 'reload' })); if (!r.ok) throw new Error(f + ' ' + r.status); await c.put(f, r); }));
}
self.addEventListener('install', e => { e.waitUntil(fillCache()); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== VERSION && k !== 'p200-fonts' && k.startsWith('p200-')) await caches.delete(k); await self.clients.claim(); })());
});
self.addEventListener('message', e => {
  if (e.data === 'skip') self.skipWaiting();
  if (e.data === 'recache') e.waitUntil(fillCache());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') { // PT Sans: кэшируется при первой загрузке с интернетом
    e.respondWith(caches.open('p200-fonts').then(async c => { const hit = await c.match(req); if (hit) return hit; try { const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; } catch (err) { return new Response('', { status: 504 }); } }));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    if (req.mode === 'navigate') {
      const hit = await c.match('index.html');
      if (hit) return hit;
    }
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }
    catch (err) { return (await c.match('index.html')) || new Response('Нет соединения', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
  })());
});
