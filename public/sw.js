const CACHE_NAME = 'subserver-chat-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  if (url.pathname.startsWith('/media/') || url.pathname.startsWith('/avatars/')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        }
        return response;
      })
    ).catch(() => {
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'send-message') {
    event.waitUntil(sendPendingMessages());
  }
});

async function sendPendingMessages() {
  try {
    const cache = await caches.open('pending-messages');
    const keys = await cache.keys();
    for (const key of keys) {
      const response = await cache.match(key);
      const msg = await response.json();
      try {
        await fetch('/api/chat/send', {
          method: 'POST',
          body: JSON.stringify(msg),
          headers: { 'Content-Type': 'application/json' }
        });
        await cache.delete(key);
      } catch (err) {
        console.error('Gagal kirim pesan tertunda:', err);
      }
    }
  } catch (err) {
    console.error('sendPendingMessages error:', err);
  }
}
