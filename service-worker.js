const CACHE='wm-v3-20260816-0147';
const ASSETS=['./','./index.html','./wagons.json','./logo.jpg','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const req=e.request;
 const isPage=req.mode==='navigate'||new URL(req.url).pathname.endsWith('/index.html');
 if(isPage){
  e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{const x=r.clone();caches.open(CACHE).then(c=>c.put(req,x)).catch(()=>{});return r}).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
  return;
 }
 e.respondWith(fetch(req).then(r=>{const x=r.clone();caches.open(CACHE).then(c=>c.put(req,x)).catch(()=>{});return r}).catch(()=>caches.match(req)));
});
