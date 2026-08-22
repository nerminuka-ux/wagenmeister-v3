const VERSION='wm-v4-clean-20260822-0945';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.clients.claim();

    // V3 worker must no longer control V4.
    await self.registration.unregister();

    const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for (const client of clients) {
      try {
        const url = new URL(client.url);
        url.searchParams.set('v4clean', Date.now().toString());
        await client.navigate(url.toString());
      } catch (_) {}
    }
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, {cache:'no-store'}).catch(() => caches.match(event.request))
  );
});
