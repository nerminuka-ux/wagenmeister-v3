(()=>{
'use strict';
const DB='wm-v3-original-template';
const STORE='files';
const KEY='gelsen-log-original-xlsx';
const XLSX='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const nativeFetch=window.fetch.bind(window);

function openDB(){
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
}
async function getStored(){
 const db=await openDB();
 return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)});
}
async function putStored(buf){
 const db=await openDB();
 return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(buf,KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});
}
function isValidXlsx(buf){
 try{
  if(!(buf instanceof ArrayBuffer)||buf.byteLength<50000)return false;
  const b=new Uint8Array(buf);
  if(b[0]!==0x50||b[1]!==0x4b)return false;
  const start=Math.max(0,b.length-65557);
  for(let i=b.length-22;i>=start;i--){if(b[i]===0x50&&b[i+1]===0x4b&&b[i+2]===0x05&&b[i+3]===0x06)return true;}
 }catch{}
 return false;
}
function chooseTemplate(){
 return new Promise((resolve,reject)=>{
  const input=document.createElement('input');input.type='file';input.accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';input.style.display='none';
  document.body.appendChild(input);
  input.onchange=async()=>{
   try{
    const file=input.files?.[0];if(!file)throw new Error('Keine Datei ausgewählt');
    const buf=await file.arrayBuffer();
    if(!isValidXlsx(buf))throw new Error('Die ausgewählte Datei ist keine vollständige Excel-XLSX-Datei');
    await putStored(buf);resolve(buf);
   }catch(e){reject(e)}finally{input.remove()}
  };
  input.click();
 });
}
async function templateBuffer(){
 const stored=await getStored().catch(()=>null);
 if(stored&&isValidXlsx(stored))return stored;
 return chooseTemplate();
}
window.fetch=async function(input,init){
 const url=typeof input==='string'?input:(input?.url||'');
 if(!/wagenmeister-original\.xlsx(?:\?|$)/i.test(url))return nativeFetch(input,init);
 try{
  const r=await nativeFetch(input,{...(init||{}),cache:'no-store'});
  if(r.ok){
   const buf=await r.arrayBuffer();
   if(isValidXlsx(buf))return new Response(buf,{status:200,headers:{'Content-Type':XLSX,'X-WM-Template':'network-valid'}});
  }
 }catch{}
 const buf=await templateBuffer();
 return new Response(buf,{status:200,headers:{'Content-Type':XLSX,'X-WM-Template':'indexeddb-valid'}});
};

window.WMTemplateStore={
 async choose(){const buf=await chooseTemplate();alert('Original-Excel-Vorlage gespeichert. Sie wird ab jetzt automatisch verwendet.');return buf},
 async exists(){const b=await getStored().catch(()=>null);return !!(b&&isValidXlsx(b))},
 isValidXlsx
};
})();
