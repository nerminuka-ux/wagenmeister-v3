(()=>{
'use strict';
const VERSION='20260818-0455';
const $=id=>document.getElementById(id);

function captureForm(){
 try{
  const out={};
  document.querySelectorAll('input[id],select[id],textarea[id]').forEach(el=>{
   out[el.id]=el.type==='checkbox'?!!el.checked:el.value;
  });
  localStorage.setItem('wm_v3_form',JSON.stringify(out));
  try{if(typeof train!=='undefined'&&Array.isArray(train))localStorage.setItem('wm_v3_train',JSON.stringify(train))}catch{}
 }catch(e){console.warn('WM captureForm',e)}
}

function forceShow(id){
 const target=$(id);if(!target)return false;
 document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
 target.classList.add('active');
 document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));
 try{window.updateDerived?.()}catch{}
 window.scrollTo({top:0,behavior:'auto'});
 return true;
}

function openStableDocument(id){
 captureForm();
 location.assign('./documents.html?id='+encodeURIComponent(id)+'&v='+VERSION);
}
window.openDocument=openStableDocument;

function installNavigationFix(){
 document.querySelectorAll('.nav[data-view]').forEach(btn=>{
  if(btn.dataset.wmStable===VERSION)return;
  btn.dataset.wmStable=VERSION;
  btn.addEventListener('click',e=>{
   e.preventDefault();e.stopImmediatePropagation();
   if(btn.dataset.view==='dokumente'){
    captureForm();
    location.assign('./documents.html?v='+VERSION);
    return;
   }
   forceShow(btn.dataset.view);
  },true);
 });
}

function bindDocumentButtons(){
 document.querySelectorAll('button').forEach(btn=>{
  const txt=(btn.textContent||'').toLowerCase();
  let id='';
  if(txt.includes('wagenliste ansehen')||txt.includes('wagenliste öffnen'))id='wagenliste';
  else if(txt.includes('bremszettel ansehen'))id='bremszettel';
  else if(txt.includes('wu / zp ansehen')||txt.includes('wu ansehen'))id='wu';
  else if(txt.includes('meldezettel ansehen'))id='meldezettel';
  if(!id||btn.dataset.wmDocStable===VERSION)return;
  btn.dataset.wmDocStable=VERSION;
  btn.onclick=null;
  btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openStableDocument(id)},true);
 });
}

function installSaveFix(){
 const b=$('saveAll');if(!b||b.dataset.wmSaveStable===VERSION)return;
 b.dataset.wmSaveStable=VERSION;
 b.addEventListener('click',()=>{
  captureForm();
  try{window.saveDB?.()}catch{}
  try{window.saveTrain?.()}catch{}
 },true);
}

function norm(v){return String(v||'').replace(/\D/g,'')}
function ensureBrakeModes(){
 try{
  if(typeof train==='undefined'||!Array.isArray(train))return;
  let changed=false;
  train.forEach(w=>{
   const m=String(w?.brakeMode||'').toUpperCase();
   if(m!=='P'&&m!=='G'){w.brakeMode='P';changed=true}
  });
  if(changed)localStorage.setItem('wm_v3_train',JSON.stringify(train));
 }catch{}
}

function decorateBrakeModes(){
 try{
  ensureBrakeModes();
  if(typeof train==='undefined'||!Array.isArray(train))return;
  const rows=[...document.querySelectorAll('#list .wagon')];
  rows.forEach((el,i)=>{
   if(!train[i])return;
   const mode=String(train[i].brakeMode||'P').toUpperCase()==='G'?'G':'P';
   const meta=el.querySelector('.meta');
   if(meta)meta.textContent=meta.textContent.replace(/ · Bremse [PG]/g,'')+' · Bremse '+mode;
   const tools=el.querySelector('.wagonTools');
   if(!tools)return;
   let b=tools.querySelector('.wmBrakeToggle');
   if(!b){
    b=document.createElement('button');
    b.className='btn secondary wmBrakeToggle';
    b.type='button';
    b.style.cssText='min-width:42px;font-weight:900;padding:8px';
    b.addEventListener('click',e=>{
     e.preventDefault();e.stopPropagation();
     if(!train[i])return;
     train[i].brakeMode=String(train[i].brakeMode||'P').toUpperCase()==='G'?'P':'G';
     localStorage.setItem('wm_v3_train',JSON.stringify(train));
     try{window.updateDerived?.()}catch{}
     decorateBrakeModes();
    });
    tools.insertBefore(b,tools.firstChild);
   }
   b.textContent=mode;b.title='Bremsstellung '+mode+' – tippen zum Wechseln';
  });
 }catch{}
}

function installBrakeMode(){
 const drawer=$('drawer');if(!drawer)return;
 if(!$('brakeMode')){
  const grids=drawer.querySelectorAll('.grid3');
  if(grids.length){
   const box=document.createElement('div');
   box.innerHTML='<label>Bremsstellung</label><select id="brakeMode"><option value="P">P</option><option value="G">G</option></select>';
   grids[0].appendChild(box);
  }
 }
 const add=$('add');
 if(add&&!add.dataset.wmBrakeStable){
  add.dataset.wmBrakeStable=VERSION;
  add.addEventListener('click',()=>{
   const selected=$('brakeMode')?.value==='G'?'G':'P';
   setTimeout(()=>{
    try{
     if(typeof train!=='undefined'&&Array.isArray(train)&&train.length){
      train[train.length-1].brakeMode=selected;
      localStorage.setItem('wm_v3_train',JSON.stringify(train));
      decorateBrakeModes();
     }
    }catch{}
   },0);
  },true);
 }
 const search=$('wagonSearch');
 if(search&&!search.dataset.wmBrakeReset){
  search.dataset.wmBrakeReset=VERSION;
  search.addEventListener('input',()=>{if(norm(search.value).length<12&&$('brakeMode'))$('brakeMode').value='P'});
 }
 const list=$('list');
 if(list&&!list.dataset.wmBrakeObserver){
  list.dataset.wmBrakeObserver='1';
  new MutationObserver(()=>setTimeout(decorateBrakeModes,0)).observe(list,{childList:true,subtree:true});
 }
 decorateBrakeModes();
}

function patchDocumentsPage(){
 const close=document.querySelector('.bar .close');
 if(close){
  close.textContent='✕ Zur App';
  close.href='./index.html?v='+VERSION+'#dokumente';
 }
 const id=new URLSearchParams(location.search).get('id');
 if(id==='wagenliste'){
  let rr=[];try{rr=JSON.parse(localStorage.getItem('wm_v3_train')||'[]')||[]}catch{}
  const table=document.querySelector('.wl table');
  if(table&&rr.length){
   const rows=[...table.querySelectorAll('tr')];let pSum=0,gSum=0;
   rr.forEach((w,i)=>{
    const tr=rows[i+1],td=tr?.children;if(!td||td.length<9)return;
    const mode=String(w.brakeMode||'P').toUpperCase()==='G'?'G':'P';
    const p=Number(w.brakeP)||0,g=Number(w.brakeG)||0;
    td[7].textContent=mode==='P'?(w.brakeP??''):'';
    td[8].textContent=mode==='G'?(w.brakeG??''):'';
    if(mode==='P')pSum+=p;else gSum+=g;
   });
   const sumRow=rows[rr.length+1];
   if(sumRow?.children?.length>=9){sumRow.children[7].textContent=Math.floor(pSum);sumRow.children[8].textContent=Math.floor(gSum)}
  }
 }
}

function markLoaded(){
 if(location.pathname.endsWith('/documents.html'))return;
 let b=$('wmFixBadge');
 if(!b){
  b=document.createElement('div');b.id='wmFixBadge';
  b.style.cssText='position:fixed;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:99998;background:#123f3e;color:#fff;border-radius:999px;padding:4px 7px;font:700 9px Arial;opacity:.75;pointer-events:none';
  document.body.appendChild(b);
 }
 b.textContent='WM FIX 0455';
}

function init(){
 if(location.pathname.endsWith('/documents.html')){patchDocumentsPage();return}
 installSaveFix();installNavigationFix();bindDocumentButtons();installBrakeMode();markLoaded();
 setTimeout(()=>{bindDocumentButtons();installBrakeMode();decorateBrakeModes()},300);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pageshow',init);
})();