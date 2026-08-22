const CACHE='wagenmeister-v4-20260822-0952';
const ASSETS=['./manifest.webmanifest','./%20%20%20%20wagons.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const request=event.request;
  const url=new URL(request.url);
  const isPage=request.mode==='navigate' || request.destination==='document';

  if(url.pathname.endsWith('/wagons.json')){
    const cleanUrl=new URL('./%20%20%20%20wagons.json',self.registration.scope);
    cleanUrl.search='?v=20260822-0952';
    event.respondWith(
      fetch(cleanUrl,{cache:'no-store'})
        .then(response=>{
          if(!response.ok) throw new Error('clean wagon database unavailable');
          return response;
        })
        .catch(()=>caches.match('./%20%20%20%20wagons.json'))
    );
    return;
  }

  if(isPage){
    event.respondWith(
      fetch(new Request(request,{cache:'reload'}))
        .catch(()=>caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(request,{cache:'no-store'})
      .then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(request))
  );
});