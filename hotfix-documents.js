(()=>{
'use strict';
const $=id=>document.getElementById(id);
const VERSION='20260816-0519';

function safeDerived(){
 try{ if(typeof window.updateDerived==='function') window.updateDerived(); }
 catch(e){ console.warn('safeDerived',e); try{ if(typeof window.renderSheet==='function') window.renderSheet(); }catch{} }
}

function forceShow(id){
 const target=$(id); if(!target)return false;
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
 target.classList.add('active');
 document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
 safeDerived();
 window.scrollTo({top:0,behavior:'auto'});
 return true;
}
window.wmForceShow=forceShow;

function installNavigationFix(){
 document.querySelectorAll('.nav[data-view]').forEach(btn=>{
  if(btn.dataset.wmFixed===VERSION)return;
  btn.dataset.wmFixed=VERSION;
  btn.addEventListener('click',e=>{
   e.preventDefault();
   e.stopImmediatePropagation();
   forceShow(btn.dataset.view);
  },true);
 });
 const docs=document.querySelector('.nav[data-view="dokumente"]');
 if(docs){ docs.title='Dokumente'; docs.setAttribute('aria-label','Dokumente öffnen'); }
}

function ensureModal(){
 let modal=$('wmDocModal');
 if(modal)return modal;
 const style=document.createElement('style');
 style.textContent=`
 #wmDocModal{position:fixed;inset:0;z-index:100000;background:#eef1ed;display:none;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
 #wmDocModal.open{display:flex}
 #wmDocModal .wmbar{flex:0 0 auto;background:#123f3e;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px}
 #wmDocModal .wmbar b{font-size:15px}
 #wmDocModal .wmclose{border:0;background:#fff;color:#123f3e;border-radius:10px;font-size:20px;font-weight:900;min-width:48px;height:44px}
 #wmDocModal .wmactions{display:flex;gap:8px}
 #wmDocModal .wmaction{border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;border-radius:9px;padding:9px 11px;font-weight:800}
 #wmDocModal .wmscroll{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:12px}
 #wmDocModal .wmstage{background:#fff;margin:auto;box-shadow:0 3px 18px rgba(0,0,0,.18);width:max-content;max-width:none;transform-origin:top left}
 #wmFixBadge{position:fixed;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:99998;background:#123f3e;color:#fff;border-radius:999px;padding:4px 7px;font:700 9px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial;opacity:.55;pointer-events:none}
 @media(max-width:600px){#wmDocModal .wmbar{position:sticky;top:0}.wmaction span{display:none}}
 `;
 document.head.appendChild(style);
 modal=document.createElement('div');
 modal.id='wmDocModal';
 modal.innerHTML=`<div class="wmbar"><b id="wmDocTitle">Dokument</b><div class="wmactions"><button class="wmaction" id="wmDocPrint">🖨️ <span>Drucken</span></button><button class="wmclose" id="wmDocClose" aria-label="Schließen">✕</button></div></div><div class="wmscroll" id="wmDocScroll"><div class="wmstage" id="wmDocStage"></div></div>`;
 document.body.appendChild(modal);
 $('wmDocClose').onclick=closeDocumentViewer;
 $('wmDocPrint').onclick=()=>{const stage=$('wmDocStage');if(!stage?.firstElementChild)return;window.print()};
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
  if(typeof window.buildDoc!=='function' && typeof buildDoc!=='function')throw new Error('Dokumentfunktion fehlt');
  const html=typeof window.buildDoc==='function'?window.buildDoc(id):buildDoc(id);
  stage.innerHTML=html;
  $('wmDocTitle').textContent=titleFor(id);
  modal.classList.add('open');document.body.style.overflow='hidden';
  setTimeout(fitStage,80);
 }catch(e){alert('Dokument konnte nicht geöffnet werden: '+(e?.message||e));}
};

function markLoaded(){
 let b=$('wmFixBadge');if(!b){b=document.createElement('div');b.id='wmFixBadge';document.body.appendChild(b)}
 b.textContent='WM '+VERSION.slice(-4);
}

const oldUpdate=window.updateDerived;
if(typeof oldUpdate==='function'){
 window.updateDerived=function(){try{return oldUpdate.apply(this,arguments)}catch(e){console.warn('updateDerived abgefangen',e);try{if(typeof window.renderSheet==='function')window.renderSheet()}catch{}}};
}

function init(){installNavigationFix();ensureModal();markLoaded();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
setTimeout(installNavigationFix,600);
window.addEventListener('pageshow',installNavigationFix);
window.addEventListener('resize',()=>{if($('wmDocModal')?.classList.contains('open'))fitStage()});
})();
