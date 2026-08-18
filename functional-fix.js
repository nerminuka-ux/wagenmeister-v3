(()=>{
'use strict';
const VERSION='20260818-0805';
const SHEET_INDEX={wagenliste:0,bremszettel:2,wu:3,meldezettel:4};
const LABELS={wagenliste:'Wagenliste',bremszettel:'Bremszettel',wu:'WU / ZP',meldezettel:'Meldezettel'};
const RAW_TEMPLATE='https://raw.githubusercontent.com/nerminuka-ux/wagenmeister-v3/main/wagenmeister-original.xlsx';
function savedForm(){try{return JSON.parse(localStorage.getItem('wm_v3_form')||'{}')||{}}catch{return{}}}
function ensureHiddenInputs(){
 const saved=savedForm();
 const checkboxIds=['schluss','fullBrake','dangerous','docsComplete','ordersComplete','withoutDocs','permanentOrder','mCoupling','mTechnical','mFullBrake','mEndSignal','mOrderNotified','mLocoCoupled','mSecuringRemoved','mSimpleBrake'];
 const ids=['trainNo','date','from','to','time','createdBy','reason','specialNotes','docLocation','docTrack','docOrderNo','fullBrakeTime','minBrakePercent',...checkboxIds];
 for(const id of ids){
  if(document.getElementById(id))continue;
  const el=document.createElement('input');el.id=id;el.type=checkboxIds.includes(id)?'checkbox':'hidden';
  if(el.type==='checkbox')el.checked=!!saved[id];else el.value=saved[id]??'';
  el.style.display='none';document.body.appendChild(el);
 }
}
function loadScript(src){return new Promise((resolve,reject)=>{if([...document.scripts].some(s=>(s.src||'').includes(src.split('?')[0]))){resolve();return}const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
async function activateSheet(blob,id){
 if(!window.JSZip)return blob;
 const zip=await JSZip.loadAsync(blob);const f=zip.file('xl/workbook.xml');if(!f)return blob;
 let xml=await f.async('text');const idx=SHEET_INDEX[id]??0;
 if(/<workbookView\b/.test(xml))xml=xml.replace(/<workbookView\b([^>]*)>/,m=>{let x=m;if(/activeTab="\d+"/.test(x))x=x.replace(/activeTab="\d+"/,`activeTab="${idx}"`);else x=x.replace('>',' activeTab="'+idx+'">');if(/firstSheet="\d+"/.test(x))x=x.replace(/firstSheet="\d+"/,`firstSheet="${idx}"`);return x});
 zip.file('xl/workbook.xml',xml);return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
}
async function share(blob,name){
 const type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';const file=new File([blob],name,{type});
 try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e?.name==='AbortError')return}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
async function buildWithRawTemplate(){
 const nativeFetch=window.fetch.bind(window);
 window.fetch=async function(input,init){
  const u=typeof input==='string'?input:(input&&input.url)||'';
  if(u.includes('wagenmeister-original.xlsx')){
   const r=await nativeFetch(RAW_TEMPLATE+'?v='+VERSION,{cache:'no-store',mode:'cors'});
   if(!r.ok)throw new Error('Originalvorlage konnte nicht geladen werden ('+r.status+')');
   const bytes=new Uint8Array(await r.clone().arrayBuffer());
   if(bytes.length<4||bytes[0]!==0x50||bytes[1]!==0x4b)throw new Error('Geladene Originalvorlage ist keine gültige XLSX-Datei');
   return r;
  }
  return nativeFetch(input,init);
 };
 try{return await window.buildOriginalExcel()}
 finally{window.fetch=nativeFetch}
}
async function makeOriginal(id,btn){
 const old=btn.textContent;btn.disabled=true;btn.textContent='Original-Excel wird erstellt …';
 try{
  ensureHiddenInputs();
  if(!window.buildOriginalExcel)await loadScript('./original-export.js?v='+VERSION);
  if(!window.buildOriginalExcel)throw new Error('Excel-Funktion nicht geladen');
  let blob=await buildWithRawTemplate();
  blob=await activateSheet(blob,id);
  const s=savedForm();await share(blob,`GELSEN-LOG_${s.trainNo||'Zug'}_${LABELS[id]||id}.xlsx`);
 }catch(e){alert('Original-Excel konnte nicht erstellt werden: '+(e?.message||e))}finally{btn.disabled=false;btn.textContent=old}
}
function installDocumentFallback(){
 if(!location.pathname.endsWith('/documents.html'))return;
 const id=new URLSearchParams(location.search).get('id');if(!id||!(id in SHEET_INDEX))return;
 const host=document.getElementById('host');if(!host)return;
 host.innerHTML=`<div style="max-width:720px;margin:18px auto;background:#fff;border-radius:16px;padding:18px;box-shadow:0 3px 18px rgba(0,0,0,.08)"><h2 style="margin:0 0 8px">${LABELS[id]} – Original</h2><p style="font-size:14px;line-height:1.5;color:#485653">Die Browser-Vorschau wird nicht mehr verwendet. Die echte GELSEN-LOG Excel-Vorlage wird direkt geladen, mit den gespeicherten Zugdaten gefüllt und das Tabellenblatt „${LABELS[id]}“ wird geöffnet.</p><button id="wmOriginalBtn" style="width:100%;border:0;border-radius:12px;padding:15px;background:#d9ad3d;color:#352a10;font-size:16px;font-weight:900">📊 Original-Excel öffnen</button><div style="text-align:center;margin-top:8px;font-size:11px;color:#6d7774">WM FIX ${VERSION.slice(-4)}</div><a href="./index.html" style="display:block;text-align:center;margin-top:12px;color:#123f3e;font-weight:800;text-decoration:none">← Zur App</a></div>`;
 const print=document.getElementById('printBtn');if(print)print.style.display='none';
 document.getElementById('wmOriginalBtn').onclick=e=>makeOriginal(id,e.currentTarget);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installDocumentFallback,{once:true});else installDocumentFallback();
})();