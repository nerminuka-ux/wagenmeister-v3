const CACHE='wm-v3-20260816-0213';
const ASSETS=['./','./index.html','./original-export.js','./wagons.json','./logo.jpg','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const req=e.request;
 const isPage=req.mode==='navigate'||new URL(req.url).pathname.endsWith('/index.html');
 if(isPage){
  e.respondWith(fetch(req,{cache:'no-store'}).then(async r=>{
   let out=r;
   try{
    const ct=r.headers.get('content-type')||'';
    if(r.ok&&ct.includes('text/html')){
     let html=await r.text();
     if(!html.includes('original-export.js')) html=html.replace('</body>','<script src="./original-export.js?v=20260816-0213"></script></body>');
     out=new Response(html,{status:r.status,statusText:r.statusText,headers:r.headers});
    }
   }catch{}
   const x=out.clone();caches.open(CACHE).then(c=>c.put(req,x)).catch(()=>{});return out;
  }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
  return;
 }
 e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{const x=r.clone();caches.open(CACHE).then(c=>c.put(req,x)).catch(()=>{});return r}).catch(()=>caches.match(req)));
});
