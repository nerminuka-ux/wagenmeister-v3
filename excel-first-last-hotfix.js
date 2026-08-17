(()=>{
'use strict';
const byId=id=>document.getElementById(id);
const norm=v=>String(v??'').replace(/\D/g,'');
const rows=()=>{try{return (typeof train!=='undefined'&&Array.isArray(train))?train:[]}catch{return[]}};
function ensureJSZip(){
 if(window.JSZip)return Promise.resolve();
 return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('JSZip konnte nicht geladen werden'));document.head.appendChild(s)});
}
function cellParts(ref){const m=/^([A-Z]+)(\d+)$/.exec(ref);return m?{col:m[1],row:Number(m[2])}:null}
function colNo(col){let n=0;for(const c of col)n=n*26+(c.charCodeAt(0)-64);return n}
function sheetData(doc){return doc.getElementsByTagNameNS('*','sheetData')[0]}
function rowNode(doc,rowNum){const sd=sheetData(doc);let r=[...sd.getElementsByTagNameNS('*','row')].find(x=>Number(x.getAttribute('r'))===rowNum);if(r)return r;r=doc.createElementNS(sd.namespaceURI,'row');r.setAttribute('r',String(rowNum));const before=[...sd.children].find(x=>Number(x.getAttribute('r'))>rowNum);before?sd.insertBefore(r,before):sd.appendChild(r);return r}
function cellNode(doc,ref){const p=cellParts(ref),r=rowNode(doc,p.row);let c=[...r.getElementsByTagNameNS('*','c')].find(x=>x.getAttribute('r')===ref);if(c)return c;c=doc.createElementNS(r.namespaceURI,'c');c.setAttribute('r',ref);const target=colNo(p.col),before=[...r.children].find(x=>{const q=cellParts(x.getAttribute('r')||'');return q&&colNo(q.col)>target});before?r.insertBefore(c,before):r.appendChild(c);return c}
function setCell(doc,ref,val){const c=cellNode(doc,ref);[...c.children].forEach(x=>c.removeChild(x));c.removeAttribute('t');if(val===null||val===undefined||val==='')return;c.setAttribute('t','inlineStr');const is=doc.createElementNS(c.namespaceURI,'is'),t=doc.createElementNS(c.namespaceURI,'t');t.setAttribute('xml:space','preserve');t.textContent=String(val);is.appendChild(t);c.appendChild(is)}
async function patchSheet(zip,path,updates){const f=zip.file(path);if(!f)return;const doc=new DOMParser().parseFromString(await f.async('text'),'application/xml');for(const [ref,val] of updates)setCell(doc,ref,val);zip.file(path,new XMLSerializer().serializeToString(doc))}
function end4(v){const d=norm(v).padStart(12,'0');return d.slice(-4).split('')}
async function patchedBuild(){
 if(typeof window.buildOriginalExcelV3!=='function')throw new Error('Excel V3 ist noch nicht geladen');
 const rr=rows();const first=norm(rr[0]?.number||'');const last=norm(rr.at(-1)?.number||'');
 const blob=await window.buildOriginalExcelV3();if(!rr.length)return blob;
 await ensureJSZip();const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const f4=end4(first),l4=end4(last);
 await patchSheet(zip,'xl/worksheets/sheet6.xml',[['B42',last],['B47',first]]);
 await patchSheet(zip,'xl/worksheets/sheet3.xml',[['U15',last]]);
 await patchSheet(zip,'xl/worksheets/sheet4.xml',[['I27',first],['I29',last]]);
 await patchSheet(zip,'xl/worksheets/sheet5.xml',[
  ['A11',f4[0]],['C11',f4[1]],['E11',f4[2]],['I11',f4[3]],
  ['K11',l4[0]],['L11',l4[1]],['M11',l4[2]],['O11',l4[3]],
  ['Q11',first],['T11',last]
 ]);
 return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
}
async function share(blob,name){const file=new File([blob],name,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e?.name==='AbortError')return;throw e}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
function install(){
 const card=[...document.querySelectorAll('#dokumente .title h2')].find(x=>x.textContent.includes('Dokumente erstellen'))?.closest('.card');if(!card)return;
 const group=card.querySelectorAll('.docButtons')[2];if(!group)return;
 const old=group.querySelector('button');if(old)old.remove();
 const b=document.createElement('button');b.className='btn gold';b.style.cssText='width:100%;font-size:16px;padding:14px';b.textContent='📊 Original-Excel erstellen';
 b.addEventListener('click',async()=>{const txt=b.textContent;b.disabled=true;b.textContent='Original-Excel wird geprüft …';try{const blob=await patchedBuild();const trainNo=byId('trainNo')?.value||'Zug';await share(blob,`GELSEN-LOG_${trainNo}_Original.xlsx`)}catch(e){alert('Original-Excel konnte nicht erstellt werden: '+(e?.message||e))}finally{b.disabled=false;b.textContent=txt}});
 group.appendChild(b);
 const note=card.querySelector('.note');if(note)note.textContent='Originalformeln und Drucklayout bleiben erhalten. Erstes und letztes Fahrzeug werden zusätzlich direkt gesetzt, damit iPhone/Excel-Vorschau keine 0 anzeigt.';
}
function boot(){setTimeout(install,0)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.buildOriginalExcelFinal=patchedBuild;
})();