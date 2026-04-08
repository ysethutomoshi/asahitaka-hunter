const CACHE_NAME = 'asahitaka-hunter-v1';
const LOCAL_URLS = ['/', '/asahitaka-hunter.html', '/manifest.json', '/icon.svg'];

// インストール時: ローカルファイルをキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_URLS))
  );
  self.skipWaiting();
});

// 有効化時: 古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// フェッチ戦略
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.origin === self.location.origin) {
    // 同一オリジン: Network first, Cache fallback
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // CDN等: Cache first, Network fallback (オフライン対応)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            if (response && response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
      })
    );
  }
});
