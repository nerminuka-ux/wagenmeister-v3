self.addEventListener('install',event=>{self.skipWaiting();});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.map(key=>caches.delete(key)));
    await self.registration.unregister();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      try{
        const url=new URL(client.url);
        url.searchParams.set('fresh','20260822-1218');
        await client.navigate(url.toString());
      }catch(e){}
    }
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method==='GET'){
    event.respondWith(fetch(new Request(event.request,{cache:'no-store'})));
  }
});
