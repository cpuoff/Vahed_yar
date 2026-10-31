const CACHE_NAME = 'daraskhtvareh-v10';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon_192.png',
  './icon_512.png',
  './css/styles.css',
  './js/data/elec-courses.js',
  './js/data/elec-groups.js',
  './js/data/islamic.js',
  './js/data/general.js',
  './js/state.js',
  './js/track.js',
  './js/logic.js',
  './js/render-course.js',
  './js/render-groups.js',
  './js/render-dashboard.js',
  './js/suggestions.js',
  './js/planner.js',
  './js/render.js',
  './js/chart-export.js',
  './js/ui-tabs.js',
  './js/ui-settings.js',
  './js/ui-menu.js',
  './js/ui-plan.js',
  './js/actions.js',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for core app shell, network-first fallback for everything else (e.g. fonts)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
