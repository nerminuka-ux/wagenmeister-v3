(()=>{
'use strict';
const $=id=>document.getElementById(id);
const VERSION='20260816-0552';
function safeDerived(){try{window.updateDerived?.()}catch{}}
function forceShow(id){const target=$(id);if(!target)return false;document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));target.classList.add('active');document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===id));safeDerived();window.scrollTo({top:0,behavior:'auto'});return true}
function installNavigationFix(){document.querySelectorAll('.nav[data-view]').forEach(btn=>{btn.dataset.wmFixed=VERSION;btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();forceShow(btn.dataset.view)},true)})}
function removeLeakedCode(){try{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const remove=[];let n;while((n=walker.nextNode())){const s=n.nodeValue||'';if(s.includes('async function makePDFBlob')||s.includes('function excelRows')||s.includes('w.document.close();')||s.includes('window.sharePDF=async'))remove.push(n)}remove.forEach(n=>n.remove())}catch{}}
window.openDocument=id=>{location.href='./documents.html?id='+encodeURIComponent(id)+'&v='+VERSION};
function bindDocumentButtons(){document.querySelectorAll('button').forEach(btn=>{const txt=(btn.textContent||'').toLowerCase();let id='';if(txt.includes('wagenliste ansehen')||txt.includes('wagenliste öffnen'))id='wagenliste';else if(txt.includes('bremszettel ansehen'))id='bremszettel';else if(txt.includes('wu / zp ansehen')||txt.includes('wu ansehen'))id='wu';else if(txt.includes('meldezettel ansehen'))id='meldezettel';if(!id)return;btn.onclick=null;btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.openDocument(id)},true)})}
function markLoaded(){let b=$('wmFixBadge');if(!b){b=document.createElement('div');b.id='wmFixBadge';b.style.cssText='position:fixed;right:8px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:99998;background:#123f3e;color:#fff;border-radius:999px;padding:4px 7px;font:700 9px Arial;opacity:.65;pointer-events:none';document.body.appendChild(b)}b.textContent='WM '+VERSION.slice(-4)}
function init(){removeLeakedCode();installNavigationFix();bindDocumentButtons();markLoaded();setTimeout(()=>{removeLeakedCode();bindDocumentButtons()},300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pageshow',init);
})();