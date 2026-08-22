const VERSION='20260822-1224-weight-core';
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
  if(!isPage){event.respondWith(fetch(new Request(req,{cache:'no-store'})));return;}
  event.respondWith((async()=>{
    const response=await fetch(new Request(req,{cache:'no-store'}));
    const type=response.headers.get('content-type')||'';
    if(!response.ok||!type.includes('text/html')) return response;
    let html=await response.text();

    const oldOpen="$('wagonModal').classList.add('open')}";
    const newOpen="$('eTotal').value=(num($('eTare').value)+num($('eLoad').value)).toFixed(2);$('eTotal').readOnly=true;$('wagonModal').classList.add('open')}";
    html=html.replace(oldOpen,newOpen);

    const oldState="$('eState').onchange=()=>{if($('eState').value==='leer'){$('eLoad').value=0;$('eTotal').value=num($('eTare').value).toFixed(2)}};";
    const newState="function recalcWeight(){if($('eState').value==='leer')$('eLoad').value=0;$('eTotal').value=(num($('eTare').value)+num($('eLoad').value)).toFixed(2)}$('eState').onchange=recalcWeight;$('eLoad').oninput=recalcWeight;$('eTare').oninput=recalcWeight;$('eTotal').readOnly=true;";
    html=html.replace(oldState,newState);

    const oldTotal="total:num($('eTotal').value),effectiveBrakes";
    const newTotal="total:num($('eTare').value)+num($('eLoad').value),effectiveBrakes";
    html=html.replace(oldTotal,newTotal);

    const headers=new Headers(response.headers);headers.delete('content-length');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  })().catch(()=>fetch(new Request(req,{cache:'no-store'}))));
});
