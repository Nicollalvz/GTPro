// Service Worker para Rines y Llantas GT Pro (PWA) - v5.0
const CACHE_NAME = 'rines-gt-pro-v5.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './catalogo.html',
  './visualizador.html',
  './panel-cliente.html',
  './login.html',
  './css/estilos.css',
  './css/catalogo.css',
  './css/tutorial-avatar.css',
  './imagenes/logo-gt-pro.png',
  './imagenes/app-icon-192.png',
  './imagenes/app-icon-512.png',
  './imagenes/favicon.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purgando caché anterior:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia Network-First: Siempre consulta primero al servidor web para obtener cambios al instante
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // No interceptar llamadas a la base de datos / PHP
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la red responde bien, actualizamos la copia en caché de respaldo
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Si no hay red (modo offline), recurrir a la copia guardada
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
