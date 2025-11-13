self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('fsm-cache-v1').then(cache => {
      return cache.addAll([
        '/',
        '/mobile-web/index.html',
        '/manifest.json',
        // Add more assets as needed
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
