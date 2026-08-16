(()=>{
'use strict';
const TEMPLATE='wagenmeister-original.xlsx';
const XLSX_TYPE='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const byId=id=>document.getElementById(id);
const norm=v=>String(v??'').replace(/\D/g,'');
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:''};
const checked=id=>!!byId(id)?.checked;
const value=id=>byId(id)?.value??'';
const trainRows=()=>{ try{return (typeof train!=='undefined'&&Array.isArray(train))?train:[]}catch{return[]} };
const sum=k=>trainRows().reduce((a,w)=>a+(Number(w?.[k])||0),0);

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
function clearCellValue(c,keepFormula=false){
 [...c.children].forEach(x=>{const n=x.localName;if(n==='v'||n==='is'||(!keepFormula&&n==='f'))c.removeChild(x)});c.removeAttribute('t');
}
function setCell(doc,ref,val,type='string',keepFormula=false){
 const c=getOrCreateCell(doc,ref);clearCellValue(c,keepFormula);
 if(val===null||val===undefined||val==='')return;
 if(type==='number'&&Number.isFinite(Number(val))){const v=doc.createElementNS(c.namespaceURI,'v');v.textContent=String(Number(val));c.appendChild(v);return;}
 c.setAttribute('t','inlineStr');const is=doc.createElementNS(c.namespaceURI,'is');const t=doc.createElementNS(c.namespaceURI,'t');t.setAttribute('xml:space','preserve');t.textContent=String(val);is.appendChild(t);c.appendChild(is);
}
function setFormulaResult(doc,ref,val,type='string'){
 const c=getOrCreateCell(doc,ref);clearCellValue(c,true);
 if(val===null||val===undefined||val==='')return;
 if(type==='number'&&Number.isFinite(Number(val))){const v=doc.createElementNS(c.namespaceURI,'v');v.textContent=String(Number(val));c.appendChild(v);return;}
 const f=[...c.children].find(x=>x.localName==='f'); if(f)c.removeChild(f);
 setCell(doc,ref,val,type,false);
}
function readSheet(zip,path){return zip.file(path).async('text').then(t=>new DOMParser().parseFromString(t,'application/xml'))}
function writeSheet(zip,path,doc){zip.file(path,new XMLSerializer().serializeToString(doc))}
function setWorkbookCalc(zip,xmlText){
 try{const doc=new DOMParser().parseFromString(xmlText,'application/xml');let calc=[...doc.getElementsByTagNameNS('*','calcPr')][0];if(!calc){const wb=doc.documentElement;calc=doc.createElementNS(wb.namespaceURI,'calcPr');wb.appendChild(calc)}calc.setAttribute('calcMode','auto');calc.setAttribute('fullCalcOnLoad','1');calc.setAttribute('forceFullCalc','1');zip.file('xl/workbook.xml',new XMLSerializer().serializeToString(doc));}catch{}
}
function dateDE(){const v=value('date');if(!v)return '';const [y,m,d]=v.split('-');return `${d}. ${m} ${y}`}
function dateStamp(){const v=value('date');if(!v)return '';const [y,m,d]=v.split('-');return `${d}.${m}.${y}`}
function timeVal(){return value('time')}
function last4(numv){const d=norm(numv);return d.length>=5?d.slice(-5,-1):d}
function dangerText(){
 const rows=trainRows();const u=[...new Set(rows.map(w=>w.unNr).filter(Boolean))].map(x=>'UN '+x);const g=[...new Set(rows.map(w=>w.ridGef).filter(Boolean))].map(x=>'Gef. '+x);return [...u,...g].join('  ')
}
function taskStamp(id){return checked(id)?`${dateStamp()} - ${timeVal()||'__:__'} - ${value('createdBy')}`:''}

function fillWagenliste(doc){
 setCell(doc,'M2',value('trainNo'));
 setCell(doc,'P2',value('from'));
 setCell(doc,'U2',value('to'));
 const cols=['B','G','H','I','J','K','L','M','O','P','Q','R','S','T','U','V','W'];
 for(let r=7;r<=36;r++){for(const col of cols)setCell(doc,col+r,'');}
 trainRows().slice(0,30).forEach((w,i)=>{
  const r=7+i;
  setCell(doc,'B'+r,norm(w.number));
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
  setCell(doc,'T'+r,w.destination||value('to'));
  setCell(doc,'U'+r,num(w.vmax),'number');
  setCell(doc,'V'+r,w.routeClass||'');
  setCell(doc,'W'+r,w.remarks||'');
 });
 setCell(doc,'A42',dateDE());
 setCell(doc,'G42',timeVal());
 setCell(doc,'J42',value('createdBy'));
}
function fillBremszettel(doc){
 const rows=trainRows(),total=sum('total'),bp=sum('brakeP'),bg=sum('brakeG'),bw=bp+bg,ax=sum('axles'),len=sum('length');
 const min=Number(value('minBrakePercent'))||0;const bh=total?Math.floor((bw/total)*100):0;
 setFormulaResult(doc,'I1',value('trainNo'));setFormulaResult(doc,'R1',dateDE());setFormulaResult(doc,'W1',value('from'));
 setFormulaResult(doc,'U8',total,'number');setFormulaResult(doc,'U9',bw,'number');setFormulaResult(doc,'U10',ax,'number');
 setCell(doc,'U11',min||'','number');setCell(doc,'U12',bh||'','number');setCell(doc,'U14',min?Math.max(0,min-bh):'','number');
 setFormulaResult(doc,'U15',rows.at(-1)?.number||'');
 setCell(doc,'U16',0,'number');setFormulaResult(doc,'U17',rows.length,'number');
 setCell(doc,'U18',rows.filter(w=>String(w.brakeShoe||'').toUpperCase()==='D').length,'number');
 setFormulaResult(doc,'U19',rows.filter(w=>['K','L','LL'].includes(String(w.brakeShoe||'').toUpperCase())).length,'number');
 setCell(doc,'U20',rows.filter(w=>String(w.remarks||'').toLowerCase().includes('matrossow')).length,'number');
 setFormulaResult(doc,'U21',len,'number');setCell(doc,'U22',sum('effectiveBrakes'),'number');
 setCell(doc,'U39',rows.some(w=>w.unNr||w.ridGef)?'ja':'nein');setFormulaResult(doc,'J43',value('createdBy'));
}
function fillWU(doc){
 const rows=trainRows();const first=rows[0]?.number||'',last=rows.at(-1)?.number||'';const danger=checked('dangerous')||rows.some(w=>w.unNr||w.ridGef);
 setFormulaResult(doc,'G9',value('trainNo'));setFormulaResult(doc,'P9',dateDE());setCell(doc,'Y9',value('createdBy'));
 setFormulaResult(doc,'G11',value('to'));setFormulaResult(doc,'P11',timeVal());setCell(doc,'Y11',value('docOrderNo'));
 setFormulaResult(doc,'G13',rows.length,'number');setCell(doc,'P13',value('docLocation'));setFormulaResult(doc,'G15',sum('axles'),'number');setCell(doc,'P15',value('docTrack'));
 setCell(doc,'L18',checked('schluss')?'X':'');setCell(doc,'L20',checked('fullBrake')?'X':'');setCell(doc,'AA20',value('fullBrakeTime')||timeVal());
 setCell(doc,'F22',value('reason'));setCell(doc,'G24',danger?'X':'');setFormulaResult(doc,'I27',first);setFormulaResult(doc,'I29',last);
 setCell(doc,'I31',value('specialNotes')||dangerText());setCell(doc,'B52',value('createdBy'));setFormulaResult(doc,'AF52',dateDE());
}
function fillMeldezettel(doc){
 const rows=trainRows(),first=rows[0]?.number||'',last=rows.at(-1)?.number||'';
 setCell(doc,'E3',value('from'));setCell(doc,'M4',value('docTrack'));setCell(doc,'E6',dateDE());setCell(doc,'M6',timeVal());
 setFormulaResult(doc,'E8',sum('total'),'number');setFormulaResult(doc,'H8',sum('axles'),'number');setCell(doc,'K9',value('createdBy'));
 const a=last4(first),b=last4(last);setCell(doc,'A11',a[0]||'');setCell(doc,'C11',a[1]||'');setCell(doc,'E11',a[2]||'');setCell(doc,'I11',a[3]||'');
 setCell(doc,'K11',b[0]||'');setCell(doc,'L11',b[1]||'');setCell(doc,'M11',b[2]||'');setCell(doc,'O11',b[3]||'');
 setFormulaResult(doc,'Q2',value('trainNo'));setCell(doc,'T2',dateDE());setCell(doc,'Q4',value('from'));setCell(doc,'T5',value('docTrack'));
 setFormulaResult(doc,'Q11',first);setFormulaResult(doc,'T11',last);setFormulaResult(doc,'S13',value('createdBy'));
 setCell(doc,'Q7',checked('docsComplete')?'X  Beförderungs-/Begleitpapiere vollzählig':'Beförderungs-/Begleitpapiere vollzählig');
 setCell(doc,'T7',checked('ordersComplete')?'X  Beförderungsanordnung(en) vollzählig':'Beförderungsanordnung(en) vollzählig');
 setCell(doc,'Q8',checked('withoutDocs')?'X  Zug verkehrt ohne Beförderungs-Begleitpapiere':'Zug verkehrt ohne Beförderungs-Begleitpapiere');
 setCell(doc,'T8',checked('permanentOrder')?'X  Zug verkehrt mit Dauer-Beförderungsanordnung(en)':'Zug verkehrt mit Dauer-Beförderungsanordnung(en)');
 const stamps=[['T18','mCoupling'],['T19','mTechnical'],['T20','mFullBrake'],['T21','mEndSignal'],['T22','mOrderNotified'],['T24','mLocoCoupled'],['T25','mSecuringRemoved'],['T26','mSimpleBrake']];
 stamps.forEach(([cell,id])=>setCell(doc,cell,taskStamp(id)||'___.___.____ - ___:___ - ______________'));
}

async function buildOriginalExcel(){
 await ensureJSZip();
 const r=await fetch(TEMPLATE+'?v=20260816-0431',{cache:'no-store'});if(!r.ok)throw new Error('Originalvorlage fehlt im Repository ('+r.status+')');
 const zip=await JSZip.loadAsync(await r.arrayBuffer());
 const specs=[['xl/worksheets/sheet1.xml',fillWagenliste],['xl/worksheets/sheet3.xml',fillBremszettel],['xl/worksheets/sheet4.xml',fillWU],['xl/worksheets/sheet5.xml',fillMeldezettel]];
 for(const [path,fn] of specs){const doc=await readSheet(zip,path);if(doc.getElementsByTagName('parsererror').length)throw new Error('Excel-Blatt konnte nicht gelesen werden: '+path);fn(doc);writeSheet(zip,path,doc)}
 const wb=zip.file('xl/workbook.xml');if(wb)setWorkbookCalc(zip,await wb.async('text'));
 return zip.generateAsync({type:'blob',mimeType:XLSX_TYPE,compression:'DEFLATE'});
}
async function shareBlob(blob,name){
 const file=new File([blob],name,{type:XLSX_TYPE});
 try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e?.name==='AbortError')return;throw e}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
async function runExport(btn){
 const old=btn.textContent;btn.disabled=true;btn.textContent='Original-Excel wird erstellt …';
 try{const blob=await buildOriginalExcel();await shareBlob(blob,`GELSEN-LOG_${value('trainNo')||'Zug'}_Original.xlsx`)}catch(e){alert('Original-Excel konnte nicht erstellt werden: '+(e?.message||e))}finally{btn.disabled=false;btn.textContent=old}
}
function installButton(){
 const title=[...document.querySelectorAll('#dokumente .title h2')].find(x=>x.textContent.includes('Dokumente erstellen'));if(!title)return false;
 const card=title.closest('.card');if(!card)return false;const groups=card.querySelectorAll('.docButtons');const oldGroup=groups[2];if(!oldGroup)return false;
 oldGroup.innerHTML='';const btn=document.createElement('button');btn.className='btn gold';btn.style.width='100%';btn.style.fontSize='16px';btn.style.padding='14px';btn.textContent='📊 GELSEN-LOG Original-Excel erstellen';btn.addEventListener('click',()=>runExport(btn));oldGroup.appendChild(btn);
 const note=card.querySelector('.note');if(note)note.textContent='Die echte GELSEN-LOG Excel-Vorlage wird mit den aktuellen App-Daten gefüllt. Wagenliste, Bremszettel, WU/ZP und Meldezettel bleiben im Original-Layout erhalten.';
 return true;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installButton);else installButton();
window.buildOriginalExcel=buildOriginalExcel;
})();
