(()=>{
'use strict';
const $=id=>document.getElementById(id);
const VERSION='20260817-2233';
function captureForm(){
 try{
  const out={};
  document.querySelectorAll('input[id],select[id],textarea[id]').forEach(el=>{out[el.id]=el.type==='checkbox'?!!el.checked:el.value});
  localStorage.setItem('wm_v3_form',JSON.stringify(out));
  try{if(typeof train!=='undefined'&&Array.isArray(train))localStorage.setItem('wm_v3_train',JSON.stringify(train))}catch{}
 }catch(e){console.warn('captureForm',e)}
}
function installSaveFix(){
 const b=$('saveAll');if(!b)return;
 b.addEventListener('click',()=>{captureForm();try{window.saveDB?.()}catch{}try{window.saveTrain?.()}catch{}},true);
}
function forceShow(id){const target=$(id);if(!target)return false;document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));target.classList.add('active');document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));try{window.updateDerived?.()}catch{}window.scrollTo({top:0,behavior:'auto'});return true}
function installNavigationFix(){document.querySelectorAll('.nav[data-view]').forEach(btn=>{btn.dataset.wmFixed=VERSION;btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(btn.dataset.view==='dokumente'){captureForm();location.href='./documents.html?v='+VERSION;return}forceShow(btn.dataset.view)},true)})}
function removeLeakedCode(){try{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const remove=[];let n;while((n=walker.nextNode())){const s=n.nodeValue||'';if(s.includes('async function makePDFBlob')||s.includes('function excelRows')||s.includes('w.document.close();')||s.includes('window.sharePDF=async'))remove.push(n)}remove.forEach(n=>n.remove())}catch{}}
window.openDocument=id=>{captureForm();location.href='./documents.html?id='+encodeURIComponent(id)+'&v='+VERSION};
function bindDocumentButtons(){document.querySelectorAll('button').forEach(btn=>{const txt=(btn.textContent||'').toLowerCase();let id='';if(txt.includes('wagenliste ansehen')||txt.includes('wagenliste öffnen'))id='wagenliste';else if(txt.includes('bremszettel ansehen'))id='bremszettel';else if(txt.includes('wu / zp ansehen')||txt.includes('wu ansehen'))id='wu';else if(txt.includes('meldezettel ansehen'))id='meldezettel';if(!id)return;btn.onclick=null;btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.openDocument(id)},true)})}
function installBrakeMode(){
 const drawer=$('drawer');if(!drawer||$('brakeMode'))return;
 const grids=drawer.querySelectorAll('.grid3');if(!grids.length)return;
 const box=document.createElement('div');
 box.innerHTML='<label>Bremsstellung</label><select id="brakeMode"><option value="P">P</option><option value="G">G</option></select>';
 grids[0].appendChild(box);
 const add=$('add');if(add){
  add.addEventListener('click',()=>{const mode=$('brakeMode')?.value==='G'?'G':'P';setTimeout(()=>{try{if(typeof train!=='undefined'&&Array.isArray(train)&&train.length){train[train.length-1].brakeMode=mode;localStorage.setItem('wm_v3_train',JSON.stringify(train));try{window.renderTrain?.()}catch{}try{window.updateDerived?.()}catch{}}}catch{}},0)});
 }
 // Bei jeder neuen Wagenerfassung ist P die sichere Standardauswahl; G muss bewusst gewählt werden.
 const search=$('wagonSearch');if(search)search.addEventListener('input',()=>{if(normLocal(search.value).length<12&&$('brakeMode'))$('brakeMode').value='P'});
}
function normLocal(v){return String(v||'').replace(/\D/g,'')}
function decorateBrakeModes(){
 try{
  if(typeof train==='undefined'||!Array.isArray(train))return;
  const rows=[...document.querySelectorAll('#list .wagon')];
  rows.forEach((el,i)=>{const meta=el.querySelector('.meta');if(!meta||!train[i])return;const mode=String(train[i].brakeMode||'P').toUpperCase()==='G'?'G':'P';if(!meta.textContent.includes(' · Bremse '+mode))meta.textContent+=' · Bremse '+mode;});
 }catch{}
}
function patchDocumentsPage(){return;}
function markLoaded(){if(location.pathname.endsWith('/documents.html'))return;let b=$('wmFixBadge');if(!b){b=document.createElement('div');b.id='wmFixBadge';b.style.cssText='position:fixed;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:99998;background:#123f3e;color:#fff;border-radius:999px;padding:4px 7px;font:700 9px Arial;opacity:.65;pointer-events:none';document.body.appendChild(b)}b.textContent='WM '+VERSION.slice(-4)}
function init(){if(location.pathname.endsWith('/documents.html')){patchDocumentsPage();return}removeLeakedCode();installSaveFix();installNavigationFix();bindDocumentButtons();installBrakeMode();decorateBrakeModes();markLoaded();setTimeout(()=>{removeLeakedCode();bindDocumentButtons();installBrakeMode();decorateBrakeModes()},300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();window.addEventListener('pageshow',init);
})();