const CACHE='wm-v3';
const ASSETS=['./','./index.html','./manifest.webmanifest','./logo.jpg','./icon-180.png','./icon-192.png','./icon-512.png','./wagons.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
