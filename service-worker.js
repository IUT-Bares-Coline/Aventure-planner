const CACHE = 'velotrip-v1';
const OFFLINE_URLS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(OFFLINE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // APIs externes (météo, cartes, overpass...) : toujours réseau, jamais de cache
  if (
    url.includes('api.open-meteo') ||
    url.includes('overpass') ||
    url.includes('nominatim') ||
    url.includes('openrouteservice') ||
    url.includes('tile.openstreetmap') ||
    url.includes('qrserver')
  ) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // Assets de l'app : cache-first avec mise à jour en arrière-plan
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(resp => {
        if (e.request.method === 'GET' && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
