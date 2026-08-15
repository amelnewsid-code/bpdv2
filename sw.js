// SIM BPD — Service Worker
// Cache "app shell" saja (HTML/manifest). Data (Apps Script API) selalu diambil online-first
// supaya angka & nomor surat tidak pernah basi; jika offline, front-end memakai cadangan
// dari localStorage (lihat index.html).

const CACHE_NAME = 'sim-bpd-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Jangan cache panggilan ke Apps Script (data harus selalu fresh)
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleusercontent.com')) {
    event.respondWith(fetch(req).catch(() => new Response('{"ok":false,"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
