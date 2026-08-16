const CACHE='wm-v3-20260816-0540';
const VERSION='20260816-0540';
const ASSETS=['./','./index.html','./template-store.js','./original-export.js','./hotfix-documents.js','./wagons.json','./logo.jpg','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
 const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const client of clients){
  try{
   const u=new URL(client.url);
   if(u.searchParams.get('wmv')!==VERSION){u.searchParams.set('wmv',VERSION);await client.navigate(u.toString())}
  }catch{}
 }
})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const req=e.request,url=new URL(req.url);
 const isPage=req.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/wagenmeister-v3/');
 if(isPage){
  e.respondWith(fetch(req,{cache:'no-store'}).then(async r=>{
   let out=r;
   try{
    const ct=r.headers.get('content-type')||'';
    if(r.ok&&ct.includes('text/html')){
     let html=await r.text();

     // Safari-Fix: kein verschachteltes <script> innerhalb des Hauptscripts.
     // Das alte Druck-Snippet beendete auf iOS den Haupt-Scriptblock und zeigte
     // den restlichen JavaScript-Code als Text auf der Seite an.
     html=html.replace(
      /w\.document\.write\(`<!doctype html><html><head><meta charset="utf-8">\$\{styles\}<\/head><body style="background:#fff;margin:0">\$\{el\.outerHTML\}<script>setTimeout\(\(\)=>window\.print\(\),450\)<\\\/script><\/body><\/html>`\);\s*w\.document\.close\(\);/,
      'w.document.write(`<!doctype html><html><head><meta charset="utf-8">${styles}</head><body style="background:#fff;margin:0">${el.outerHTML}</body></html>`);\n w.document.close();\n setTimeout(()=>{try{w.print()}catch{}},450);'
     );

     const scripts=[];
     if(!html.includes('template-store.js'))scripts.push('<script src="./template-store.js?v='+VERSION+'"></script>');
     if(!html.includes('original-export.js'))scripts.push('<script src="./original-export.js?v='+VERSION+'"></script>');
     if(!html.includes('hotfix-documents.js'))scripts.push('<script src="./hotfix-documents.js?v='+VERSION+'"></script>');
     if(scripts.length)html=html.replace('</body>',scripts.join('')+'</body>');
     out=new Response(html,{status:r.status,statusText:r.statusText,headers:r.headers});
    }
   }catch{}
   const x=out.clone();caches.open(CACHE).then(c=>c.put(req,x)).catch(()=>{});return out;
  }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html'))));
  return;
 }
 e.respondWith(fetch(req,{cache:'no-store'}).then(r=>{const x=r.clone();caches.open(CACHE).then(c=>c.put(req,x)).catch(()=>{});return r}).catch(()=>caches.match(req)));
});
