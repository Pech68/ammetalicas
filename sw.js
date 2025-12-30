const CACHE_NAME = 'am-metalicas-v4';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  'https://i.imgur.com/b8MWdC2.png'
];

// Instalación: Solo cacheamos lo crítico local para evitar errores de CORS
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cacheando archivos locales críticos');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Error cacheando archivos:', err))
  );
  self.skipWaiting();
});

// Activación: Limpieza de cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de red (Estrategia: Network First, falling back to Cache)
// Esta estrategia es más segura para evitar que te quedes con versiones viejas
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si la red responde bien, guardamos una copia en caché y la devolvemos
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        // Si la red falla (Offline), buscamos en caché
        return caches.match(event.request);
      })
  );
});
