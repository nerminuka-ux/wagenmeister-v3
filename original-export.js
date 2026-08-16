(()=>{
'use strict';
const TEMPLATE='wagenmeister-original.xlsx';
const XLSX_TYPE='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').replace(/\D/g,'');
const escXml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:''};

function ensureJSZip(){
 if(window.JSZip)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  s.onload=resolve;s.onerror=()=>reject(new Error('JSZip konnte nicht geladen werden'));
  document.head.appendChild(s);
 });
}
function cellRefToParts(ref){const m=/^([A-Z]+)(\d+)$/.exec(ref);return m?{col:m[1],row:Number(m[2])}:null}
function colToNumber(col){let n=0;for(const c of col)n=n*26+(c.charCodeAt(0)-64);return n}
function getSheetData(doc){return doc.getElementsByTagNameNS('*','sheetData')[0]}
function getOrCreateRow(doc,rowNum){
 const sheetData=getSheetData(doc);let row=[...sheetData.getElementsByTagNameNS('*','row')].find(r=>Number(r.getAttribute('r'))===rowNum);
 if(row)return row;
 row=doc.createElementNS(sheetData.namespaceURI,'row');row.setAttribute('r',String(rowNum));
 const rows=[...sheetData.children];const before=rows.find(r=>Number(r.getAttribute('r'))>rowNum);before?sheetData.insertBefore(row,before):sheetData.appendChild(row);return row;
}
function getOrCreateCell(doc,ref){
 const p=cellRefToParts(ref);const row=getOrCreateRow(doc,p.row);let c=[...row.getElementsByTagNameNS('*','c')].find(x=>x.getAttribute('r')===ref);
 if(c)return c;
 c=doc.createElementNS(row.namespaceURI,'c');c.setAttribute('r',ref);
 const target=colToNumber(p.col);const before=[...row.children].find(x=>{const q=cellRefToParts(x.getAttribute('r')||'');return q&&colToNumber(q.col)>target});before?row.insertBefore(c,before):row.appendChild(c);return c;
}
function clearCellValue(c){[...c.children].forEach(x=>{const n=x.localName;if(n==='v'||n==='is')c.removeChild(x)});c.removeAttribute('t')}
function setCell(doc,ref,value,type='string'){
 const c=getOrCreateCell(doc,ref);clearCellValue(c);
 if(value===null||value===undefined||value==='')return;
 if(type==='number'&&Number.isFinite(Number(value))){
  const v=doc.createElementNS(c.namespaceURI,'v');v.textContent=String(Number(value));c.appendChild(v);return;
 }
 c.setAttribute('t','inlineStr');const is=doc.createElementNS(c.namespaceURI,'is');const t=doc.createElementNS(c.namespaceURI,'t');t.setAttribute('xml:space','preserve');t.textContent=String(value);is.appendChild(t);c.appendChild(is);
}
function setWorkbookCalc(zip,xmlText){
 try{
  const doc=new DOMParser().parseFromString(xmlText,'application/xml');let calc=[...doc.getElementsByTagNameNS('*','calcPr')][0];
  if(!calc){const wb=doc.documentElement;calc=doc.createElementNS(wb.namespaceURI,'calcPr');wb.appendChild(calc)}
  calc.setAttribute('calcMode','auto');calc.setAttribute('fullCalcOnLoad','1');calc.setAttribute('forceFullCalc','1');
  zip.file('xl/workbook.xml',new XMLSerializer().serializeToString(doc));
 }catch{}
}
function dateDE(){const v=$('date')?.value;if(!v)return '';const [y,m,d]=v.split('-');return `${d}.${m}.${y}`}
function timeNowOrForm(){return $('time')?.value||''}
function fillWagenliste(doc){
 setCell(doc,'M2',$('trainNo')?.value||'');
 setCell(doc,'P2',$('from')?.value||'');
 setCell(doc,'U2',$('to')?.value||'');
 for(let r=7;r<=36;r++){
  for(const col of ['B','G','H','I','J','K','L','M','O','P','Q','R','S','U','V','W'])setCell(doc,col+r,'');
 }
 const train=Array.isArray(window.train)?window.train:[];
 train.slice(0,30).forEach((w,i)=>{
  const r=7+i;
  setCell(doc,'B'+r,Number(norm(w.number)),'number');
  setCell(doc,'G'+r,num(w.axles),'number');
  setCell(doc,'H'+r,num(w.length),'number');
  setCell(doc,'I'+r,num(w.load),'number');
  setCell(doc,'J'+r,num(w.total),'number');
  setCell(doc,'K'+r,w.brakeShoe||'');
  setCell(doc,'L'+r,num(w.brakeP),'number');
  setCell(doc,'M'+r,num(w.brakeG),'number');
  setCell(doc,'O'+r,num(w.handBrake),'number');
  setCell(doc,'P'+r,w.ridGef||'');
  setCell(doc,'Q'+r,w.unNr||'');
  setCell(doc,'R'+r,w.gefZettel||'');
  setCell(doc,'S'+r,w.special==='1'?1:0,'number');
  setCell(doc,'U'+r,num(w.vmax),'number');
  setCell(doc,'V'+r,w.routeClass||'');
  setCell(doc,'W'+r,w.remarks||'');
 });
 setCell(doc,'A42',dateDE());
 setCell(doc,'G42',timeNowOrForm());
 setCell(doc,'J42',$('createdBy')?.value||'');
}
async function buildOriginalExcel(){
 await ensureJSZip();
 const r=await fetch(TEMPLATE+'?v='+Date.now(),{cache:'no-store'});
 if(!r.ok)throw new Error('Originalvorlage fehlt im Repository ('+r.status+')');
 const zip=await JSZip.loadAsync(await r.arrayBuffer());
 const sheetPath='xl/worksheets/sheet1.xml';const sheetText=await zip.file(sheetPath).async('text');
 const doc=new DOMParser().parseFromString(sheetText,'application/xml');
 if(doc.getElementsByTagName('parsererror').length)throw new Error('Excel-Vorlage konnte nicht gelesen werden');
 fillWagenliste(doc);zip.file(sheetPath,new XMLSerializer().serializeToString(doc));
 const wb=zip.file('xl/workbook.xml');if(wb)setWorkbookCalc(zip,await wb.async('text'));
 return zip.generateAsync({type:'blob',mimeType:XLSX_TYPE,compression:'DEFLATE'});
}
async function shareBlob(blob,name){
 const file=new File([blob],name,{type:XLSX_TYPE});
 try{
  if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return}
 }catch(e){if(e?.name==='AbortError')return;throw e}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
async function runExport(btn){
 const old=btn.textContent;btn.disabled=true;btn.textContent='Original-Excel wird erstellt …';
 try{
  const blob=await buildOriginalExcel();
  const trainNo=$('trainNo')?.value||'Zug';await shareBlob(blob,`Wagenliste_${trainNo}.xlsx`);
 }catch(e){alert('Original-Excel konnte nicht erstellt werden: '+(e?.message||e));}
 finally{btn.disabled=false;btn.textContent=old}
}
function installButton(){
 const title=[...document.querySelectorAll('#dokumente .title h2')].find(x=>x.textContent.includes('Dokumente erstellen'));
 if(!title)return false;
 const card=title.closest('.card');if(!card)return false;
 const groups=card.querySelectorAll('.docButtons');
 const oldGroup=groups[2];if(!oldGroup)return false;
 oldGroup.innerHTML='';
 const btn=document.createElement('button');btn.className='btn gold';btn.style.width='100%';btn.style.fontSize='16px';btn.style.padding='14px';btn.textContent='📊 Original-Excel erstellen';btn.addEventListener('click',()=>runExport(btn));oldGroup.appendChild(btn);
 const note=card.querySelector('.note');if(note)note.textContent='PDF wie bisher oder die echte GELSEN-LOG Original-Excel-Datei mit den aktuellen Zugdaten erstellen und teilen.';
 return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installButton()});else installButton();
window.buildOriginalExcel=buildOriginalExcel;
})();