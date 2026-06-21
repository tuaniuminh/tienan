const CACHE_NAME = 'tien-an-v2.4.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js'
];

// Cài đặt Service Worker và cache các tài nguyên chính
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching files');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Kích hoạt Service Worker và dọn dẹp các cache cũ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Xử lý các yêu cầu mạng: Ưu tiên cache trước, mạng sau
self.addEventListener('fetch', event => {
  // Chỉ xử lý các yêu cầu HTTP/HTTPS
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Trả về từ cache nếu có
        return cachedResponse;
      }

      // Nếu không có trong cache, tải từ mạng
      return fetch(event.request).then(response => {
        // Cache động cho các tài nguyên phông chữ từ Google Fonts
        if (event.request.url.startsWith('https://fonts.googleapis.com') || 
            event.request.url.startsWith('https://fonts.gstatic.com')) {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        }
        return response;
      });
    }).catch(err => {
      console.error('[Service Worker] Fetch failed:', err);
    })
  );
});

// Lắng nghe lệnh kích hoạt phiên bản mới lập tức
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
