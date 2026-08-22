const VERSION='20260822-1222';
self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const req=event.request;
  const isPage=req.mode==='navigate'||req.destination==='document';
  if(!isPage){
    event.respondWith(fetch(new Request(req,{cache:'no-store'})));
    return;
  }
  event.respondWith((async()=>{
    const response=await fetch(new Request(req,{cache:'no-store'}));
    const type=response.headers.get('content-type')||'';
    if(!response.ok||!type.includes('text/html')) return response;
    let html=await response.text();
    if(!html.includes('v4-calc-fix.js')){
      const marker='</body>';
      const i=html.lastIndexOf(marker);
      const script='<script src="./v4-calc-fix.js?v='+VERSION+'"></script>';
      html=i>=0?html.slice(0,i)+script+html.slice(i):html+script;
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  })().catch(()=>fetch(new Request(req,{cache:'no-store'}))));
});