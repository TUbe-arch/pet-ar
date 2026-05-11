// ── Service Worker ──
// 每次部署新版本時，只需更新下方 VERSION 字串
const VERSION = 'v0.1.1';
const CACHE   = `pet-ar-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './ar.html',
  './js/crop.js',
  './assets/cat-mask.svg',
];

// 安裝：預先快取核心檔案
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

// 啟動：刪除舊版快取
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 請求攔截
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // .mind 檔案大且少變動 → cache-first（有快取直接用，沒有才下載並存）
  if (url.pathname.endsWith('.mind')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          caches.open(CACHE).then(c => c.put(request, res.clone()));
          return res;
        });
      })
    );
    return;
  }

  // 其餘檔案 → network-first（優先從網路拿最新版，失敗才回傳快取）
  e.respondWith(
    fetch(request).then(res => {
      caches.open(CACHE).then(c => c.put(request, res.clone()));
      return res;
    }).catch(() => caches.match(request))
  );
});
