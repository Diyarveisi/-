const C = 'irk-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.pathname.startsWith('/api/')) return;
  const isPage = r.mode === 'navigate' || (u.origin === location.origin && (u.pathname.endsWith('/') || u.pathname.endsWith('.html')));
  if (isPage) {
    // صفحه‌ی اصلی: اول اینترنت (برای آپدیت)، اگر نبود یا کند بود نسخه‌ی ذخیره‌شده
    e.respondWith(
      Promise.race([fetch(r, { cache: 'no-store' }), timeout(3500)]).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(C).then(c => { c.put(r, cp.clone()); c.put('./index.html', cp); }); }
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
