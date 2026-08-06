/* 公考工作台 · Service Worker（离线缓存静态资源） */
const CACHE = 'gk-workbench-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './css/base.css',
  './css/pages.css',
  './js/util.js',
  './js/store.js',
  './js/sync.js',
  './js/media.js',
  './js/ui.js',
  './js/charts.js',
  './js/widgets.js',
  './js/app.js',
  './js/pages/home.js',
  './js/pages/modules.js',
  './js/pages/mistakes.js',
  './js/pages/review.js',
  './js/pages/checkin.js',
  './js/pages/papers.js',
  './js/pages/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // API 走网络
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return;
  // 缓存优先，失败回源
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
