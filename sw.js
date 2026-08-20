/* 公考工作台 · Service Worker（离线缓存静态资源） */
const CACHE = 'gk-workbench-v3';
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
  './js/asr.js',
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

  const put = (res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    return res;
  };

  const isCode = req.mode === 'navigate' || /\.(?:html|js|mjs|css|webmanifest)$/i.test(url.pathname);
  const isModel = /\/models\//i.test(url.pathname) || /\.(?:onnx|wasm|bin)$/i.test(url.pathname);

  // 代码类资源（页面 / JS / CSS / manifest）走「网络优先」并强制跳过 HTTP 缓存：
  // 保证修复能立刻生效，不会被旧缓存长期钉死；断网时回退缓存，离线可用不受影响。
  if (isCode) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(put)
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // 模型 / wasm / bin 文件：直接透传网络，不做 SW 缓存。
  // 原因：这些文件很大（wasm 21MB、onnx 数十 MB），若 SW 一边 clone 缓存一边
  // 给 ORT 流式编译，会并发读同一响应体导致 body 被中止（ERR_HTTP2_PROTOCOL_ERROR）。
  // 模型缓存交由 asr.js 的自定义 Cache（transformers-cache-asr-v1）负责，不经过此处 clone。
  if (isModel) {
    e.respondWith(
      fetch(req).catch(() => new Response('Not found', { status: 404, statusText: 'Not Found' }))
    );
    return;
  }

  // 其它静态资源（图标等）仍缓存优先，失败时回退首页
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(put).catch(() => caches.match('./index.html'))));
});
