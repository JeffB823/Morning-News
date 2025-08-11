/* Morning News – lightweight PWA service worker
   - Network-first for HTML navigations (fresh when online)
   - Stale-while-revalidate for everything else (fast + cached)
*/
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // HTML navigations
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open('mn-pages-v1');
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open('mn-pages-v1');
        return (await cache.match(req)) || (await caches.match('./index.html')) || new Response('<h1>Offline</h1>', { headers: { 'content-type': 'text/html' } });
      }
    })());
    return;
  }

  // Assets & APIs: stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open('mn-assets-v1');
    const hit = await cache.match(req);
    const fetched = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await fetched) || new Response('', { status: 504 });
  })());
});
