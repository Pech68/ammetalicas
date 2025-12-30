const CACHE_NAME = 'am-metalicas-v5'; // Subimos versión para forzar actualización
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
  // Eliminamos la imagen externa de aquí para evitar errores de CORS que rompen la app
];

// Instalación: Solo cacheamos archivos locales estrictamente necesarios
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cacheando archivos locales v5');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Error crítico en instalación SW:', err))
  );
  self.skipWaiting();
});

// Activación: Borrar cachés antiguas para que no quede basura
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Limpiando caché vieja:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de red (Network First)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Si la red responde bien, actualizamos la caché
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
        // Si falla la red (Offline), usamos caché
        return caches.match(event.request);
      })
  );
});
