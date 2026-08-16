(()=>{
'use strict';
const $=id=>document.getElementById(id);
function ensureModal(){
 let modal=$('wmDocModal');
 if(modal)return modal;
 const style=document.createElement('style');
 style.textContent=`
 #wmDocModal{position:fixed;inset:0;z-index:100000;background:#eef1ed;display:none;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
 #wmDocModal.open{display:flex}
 #wmDocModal .wmbar{flex:0 0 auto;background:#123f3e;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px}
 #wmDocModal .wmbar b{font-size:15px}
 #wmDocModal .wmclose{border:0;background:#fff;color:#123f3e;border-radius:10px;font-size:18px;font-weight:900;min-width:46px;height:42px}
 #wmDocModal .wmactions{display:flex;gap:8px}
 #wmDocModal .wmaction{border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;border-radius:9px;padding:9px 11px;font-weight:800}
 #wmDocModal .wmscroll{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:12px}
 #wmDocModal .wmstage{background:#fff;margin:auto;box-shadow:0 3px 18px rgba(0,0,0,.18);width:max-content;max-width:none;transform-origin:top left}
 @media(max-width:600px){#wmDocModal .wmbar{position:sticky;top:0}.wmaction span{display:none}}
 `;
 document.head.appendChild(style);
 modal=document.createElement('div');
 modal.id='wmDocModal';
 modal.innerHTML=`<div class="wmbar"><b id="wmDocTitle">Dokument</b><div class="wmactions"><button class="wmaction" id="wmDocPrint">🖨️ <span>Drucken</span></button><button class="wmclose" id="wmDocClose" aria-label="Schließen">✕</button></div></div><div class="wmscroll" id="wmDocScroll"><div class="wmstage" id="wmDocStage"></div></div>`;
 document.body.appendChild(modal);
 $('wmDocClose').onclick=closeDocumentViewer;
 modal.addEventListener('click',e=>{if(e.target===modal)closeDocumentViewer()});
 $('wmDocPrint').onclick=()=>{const stage=$('wmDocStage');if(!stage?.firstElementChild)return;const w=window.open('','_blank');if(!w)return alert('Druckansicht konnte nicht geöffnet werden.');const styles=[...document.querySelectorAll('style')].map(s=>s.outerHTML).join('');w.document.write(`<!doctype html><html><head><meta charset="utf-8">${styles}</head><body style="background:#fff;margin:0">${stage.innerHTML}</body></html>`);w.document.close();setTimeout(()=>w.print(),350)};
 return modal;
}
function titleFor(id){return id==='wagenliste'?'Wagenliste':id==='bremszettel'?'Bremszettel':id==='wu'?'WU / ZP-Protokoll':id==='meldezettel'?'Meldezettel':id}
function fitStage(){
 const scroll=$('wmDocScroll'),stage=$('wmDocStage');if(!scroll||!stage||!stage.firstElementChild)return;
 stage.style.transform='none';stage.style.marginBottom='0';
 const natural=stage.firstElementChild.getBoundingClientRect();
 const avail=Math.max(280,scroll.clientWidth-24);
 const scale=Math.min(1,avail/natural.width);
 stage.style.transform=`scale(${scale})`;
 stage.style.marginBottom=`${natural.height*(scale-1)}px`;
}
function closeDocumentViewer(){const m=$('wmDocModal');if(m)m.classList.remove('open');document.body.style.overflow=''}
window.closeDocumentViewer=closeDocumentViewer;
window.openDocument=id=>{
 try{
  const modal=ensureModal();
  const stage=$('wmDocStage');
  if(typeof buildDoc!=='function')throw new Error('Dokumentfunktion fehlt');
  stage.innerHTML=buildDoc(id);
  $('wmDocTitle').textContent=titleFor(id);
  modal.classList.add('open');document.body.style.overflow='hidden';
  setTimeout(fitStage,100);
 }catch(e){alert('Dokument konnte nicht geöffnet werden: '+(e?.message||e));}
};
window.addEventListener('resize',()=>{if($('wmDocModal')?.classList.contains('open'))fitStage()});
// Alte versteckte Vorschau bleibt nur Renderquelle; verhindert, dass ein fehlendes Statistikfeld die Navigation blockiert.
const oldUpdate=window.updateDerived;
if(typeof oldUpdate==='function'){
 window.updateDerived=function(){try{return oldUpdate.apply(this,arguments)}catch(e){console.warn('updateDerived hotfix',e);try{if(typeof renderSheet==='function')renderSheet()}catch{}}};
}
})();