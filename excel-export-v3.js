(()=>{
'use strict';
const TEMPLATE='wagenmeister-original.xlsx';
const XLSX_TYPE='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const byId=id=>document.getElementById(id);
const norm=v=>String(v??'').replace(/\D/g,'');
const num=v=>{const x=Number(v);return Number.isFinite(x)?x:''};
const checked=id=>!!byId(id)?.checked;
const value=id=>byId(id)?.value??'';
const rows=()=>{try{return (typeof train!=='undefined'&&Array.isArray(train))?train:[]}catch{return[]}};
const sum=k=>rows().reduce((a,w)=>a+(Number(w?.[k])||0),0);
const activeMode=w=>String(w?.brakeMode||value('trainBrakeMode')||'P').toUpperCase()==='G'?'G':'P';

function ensureJSZip(){
 if(window.JSZip)return Promise.resolve();
 return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('JSZip konnte nicht geladen werden'));document.head.appendChild(s)});
}
function parts(ref){const m=/^([A-Z]+)(\d+)$/.exec(ref);return m?{col:m[1],row:Number(m[2])}:null}
function colNo(col){let n=0;for(const c of col)n=n*26+(c.charCodeAt(0)-64);return n}
function sheetData(doc){return doc.getElementsByTagNameNS('*','sheetData')[0]}
function rowNode(doc,rowNum){const sd=sheetData(doc);let r=[...sd.getElementsByTagNameNS('*','row')].find(x=>Number(x.getAttribute('r'))===rowNum);if(r)return r;r=doc.createElementNS(sd.namespaceURI,'row');r.setAttribute('r',String(rowNum));const before=[...sd.children].find(x=>Number(x.getAttribute('r'))>rowNum);before?sd.insertBefore(r,before):sd.appendChild(r);return r}
function cellNode(doc,ref){const p=parts(ref),r=rowNode(doc,p.row);let c=[...r.getElementsByTagNameNS('*','c')].find(x=>x.getAttribute('r')===ref);if(c)return c;c=doc.createElementNS(r.namespaceURI,'c');c.setAttribute('r',ref);const target=colNo(p.col),before=[...r.children].find(x=>{const q=parts(x.getAttribute('r')||'');return q&&colNo(q.col)>target});before?r.insertBefore(c,before):r.appendChild(c);return c}
function clearValue(c,keepFormula=false){[...c.children].forEach(x=>{const n=x.localName;if(n==='v'||n==='is'||(!keepFormula&&n==='f'))c.removeChild(x)});c.removeAttribute('t')}
function setCell(doc,ref,val,type='string'){const c=cellNode(doc,ref);clearValue(c,false);if(val===null||val===undefined||val==='')return;if(type==='number'&&Number.isFinite(Number(val))){const v=doc.createElementNS(c.namespaceURI,'v');v.textContent=String(Number(val));c.appendChild(v);return}c.setAttribute('t','inlineStr');const is=doc.createElementNS(c.namespaceURI,'is'),t=doc.createElementNS(c.namespaceURI,'t');t.setAttribute('xml:space','preserve');t.textContent=String(val);is.appendChild(t);c.appendChild(is)}
function setFormula(doc,ref,formula){const c=cellNode(doc,ref);clearValue(c,false);const f=doc.createElementNS(c.namespaceURI,'f');f.textContent=formula;c.appendChild(f)}
async function readSheet(zip,path){return new DOMParser().parseFromString(await zip.file(path).async('text'),'application/xml')}
function writeSheet(zip,path,doc){zip.file(path,new XMLSerializer().serializeToString(doc))}
function forceRecalc(zip,text){try{const doc=new DOMParser().parseFromString(text,'application/xml');let c=[...doc.getElementsByTagNameNS('*','calcPr')][0];if(!c){c=doc.createElementNS(doc.documentElement.namespaceURI,'calcPr');doc.documentElement.appendChild(c)}c.setAttribute('calcMode','auto');c.setAttribute('fullCalcOnLoad','1');c.setAttribute('forceFullCalc','1');zip.file('xl/workbook.xml',new XMLSerializer().serializeToString(doc))}catch{}}
function dateDE(){const v=value('date');if(!v)return '';const [y,m,d]=v.split('-');return `${d}. ${m} ${y}`}
function dateStamp(){const v=value('date');if(!v)return '';const [y,m,d]=v.split('-');return `${d}.${m}.${y}`}
function timeVal(){return value('time')}
function dangerText(){const u=[...new Set(rows().map(w=>w.unNr).filter(Boolean))].map(x=>'UN '+x),g=[...new Set(rows().map(w=>w.ridGef).filter(Boolean))].map(x=>'Gef. '+x);return [...u,...g].join('  ')}
function taskStamp(id){return checked(id)?`${dateStamp()} - ${timeVal()||'__:__'} - ${value('createdBy')}`:''}

function fillWagenliste(doc){
 setCell(doc,'M2',value('trainNo'));setCell(doc,'P2',value('from'));setCell(doc,'U2',value('to'));
 const inputs=['B','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];
 for(let r=7;r<=36;r++){for(const c of inputs)setCell(doc,c+r,'');}
 rows().slice(0,30).forEach((w,i)=>{
  const r=7+i,mode=activeMode(w);
  setCell(doc,'B'+r,norm(w.number));setCell(doc,'G'+r,num(w.axles),'number');setCell(doc,'H'+r,num(w.length),'number');
  setCell(doc,'I'+r,num(w.load),'number');setCell(doc,'J'+r,num(w.total),'number');setCell(doc,'K'+r,w.brakeShoe||'');
  setCell(doc,'L'+r,mode==='P'?num(w.brakeP):'','number');setCell(doc,'M'+r,mode==='G'?num(w.brakeG):'','number');
  setCell(doc,'N'+r,num(w.effectiveBrakes),'number');setCell(doc,'O'+r,num(w.handBrake),'number');
  setCell(doc,'P'+r,w.ridGef||'');setCell(doc,'Q'+r,w.unNr||'');setCell(doc,'R'+r,w.gefZettel||'');setCell(doc,'S'+r,w.special==='1'?1:0,'number');
  setCell(doc,'T'+r,w.destination||value('to'));setCell(doc,'U'+r,num(w.vmax),'number');setCell(doc,'V'+r,w.routeClass||'');setCell(doc,'W'+r,w.remarks||'');
 });
 setFormula(doc,'B37','COUNT(B7:F36)');setFormula(doc,'G37','SUM(G7:G36)');setFormula(doc,'H37','SUM(H7:H36)');setFormula(doc,'I37','SUM(I7:I36)');setFormula(doc,'J37','ROUNDUP(SUM(J7:J36),0)');setFormula(doc,'K37','COUNTA(K7:K36)');
 setFormula(doc,'L37','ROUNDDOWN(SUM(L7:L36),0)');setFormula(doc,'M37','SUM(M7:M36)');setFormula(doc,'N37','SUM(N7:N36)');setFormula(doc,'O37','SUM(O7:O36)');
 setCell(doc,'M38',-0.25,'number');
 // Bremslogik: P bleibt voll wirksam, nur G wird um 25 % reduziert.
 setFormula(doc,'L39','L37');setFormula(doc,'M39','IF(M37>0,M37*(100%+M38),M37)');setFormula(doc,'L40','L39+M39');
 setCell(doc,'A42',dateDE());setCell(doc,'G42',timeVal());setCell(doc,'J42',value('createdBy'));
}
function fillBremszettel(doc){
 const rr=rows(),p=rr.reduce((a,w)=>a+(activeMode(w)==='P'?(Number(w.brakeP)||0):0),0),g=rr.reduce((a,w)=>a+(activeMode(w)==='G'?(Number(w.brakeG)||0):0),0),bw=Math.floor(p)+(g*0.75),total=sum('total');
 const min=Number(value('minBrakePercent'))||0,bh=total?Math.floor((bw/total)*100):0;
 setCell(doc,'U11',min||'','number');setCell(doc,'U12',bh||'','number');setCell(doc,'U14',min?Math.max(0,min-bh):'','number');
 setCell(doc,'U16',0,'number');setCell(doc,'U18',rr.filter(w=>String(w.brakeShoe||'').toUpperCase()==='D').length,'number');setCell(doc,'U20',rr.filter(w=>String(w.remarks||'').toLowerCase().includes('matrossow')).length,'number');
 setCell(doc,'U22',sum('effectiveBrakes'),'number');setCell(doc,'U39',rr.some(w=>w.unNr||w.ridGef)?'ja':'nein');
}
function fillWU(doc){
 const rr=rows(),danger=checked('dangerous')||rr.some(w=>w.unNr||w.ridGef);
 setCell(doc,'Y9',value('createdBy'));setCell(doc,'Y11',value('docOrderNo'));setCell(doc,'P13',value('docLocation'));setCell(doc,'P15',value('docTrack'));
 setCell(doc,'L18',checked('schluss')?'X':'');setCell(doc,'L20',checked('fullBrake')?'X':'');if(value('fullBrakeTime'))setCell(doc,'AA20',value('fullBrakeTime'));
 setCell(doc,'F22',value('reason'));setCell(doc,'G24',danger?'X':'');setCell(doc,'I31',value('specialNotes')||dangerText());setCell(doc,'B52',value('createdBy'));
}
function fillMeldezettel(doc){
 setCell(doc,'E3',value('from'));setCell(doc,'M4',value('docTrack'));setCell(doc,'E6',dateDE());setCell(doc,'M6',timeVal());setCell(doc,'K9',value('createdBy'));
 if(value('date'))setCell(doc,'T2',dateDE());
 setCell(doc,'Q7',checked('docsComplete')?'X  Beförderungs-/Begleitpapiere vollzählig':'Beförderungs-/Begleitpapiere vollzählig');setCell(doc,'T7',checked('ordersComplete')?'X  Beförderungsanordnung(en) vollzählig':'Beförderungsanordnung(en) vollzählig');
 setCell(doc,'Q8',checked('withoutDocs')?'X  Zug verkehrt ohne Beförderungs-Begleitpapiere':'Zug verkehrt ohne Beförderungs-Begleitpapiere');setCell(doc,'T8',checked('permanentOrder')?'X  Zug verkehrt mit Dauer-Beförderungsanordnung(en)':'Zug verkehrt mit Dauer-Beförderungsanordnung(en)');
 [['T18','mCoupling'],['T19','mTechnical'],['T20','mFullBrake'],['T21','mEndSignal'],['T22','mOrderNotified'],['T24','mLocoCoupled'],['T25','mSecuringRemoved'],['T26','mSimpleBrake']].forEach(([c,id])=>setCell(doc,c,taskStamp(id)||'___.___.____ - ___:___ - ______________'));
}
async function build(){
 await ensureJSZip();const r=await fetch(TEMPLATE+'?v=20260817-2233',{cache:'no-store'});if(!r.ok)throw new Error('Originalvorlage fehlt ('+r.status+')');const zip=await JSZip.loadAsync(await r.arrayBuffer());
 for(const [path,fn] of [['xl/worksheets/sheet1.xml',fillWagenliste],['xl/worksheets/sheet3.xml',fillBremszettel],['xl/worksheets/sheet4.xml',fillWU],['xl/worksheets/sheet5.xml',fillMeldezettel]]){const doc=await readSheet(zip,path);if(doc.getElementsByTagName('parsererror').length)throw new Error('Excel-Blatt konnte nicht gelesen werden: '+path);fn(doc);writeSheet(zip,path,doc)}
 const wbf=zip.file('xl/workbook.xml');if(wbf)forceRecalc(zip,await wbf.async('text'));return zip.generateAsync({type:'blob',mimeType:XLSX_TYPE,compression:'DEFLATE'});
}
async function share(blob,name){const file=new File([blob],name,{type:XLSX_TYPE});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e?.name==='AbortError')return;throw e}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
async function run(btn){const old=btn.textContent;btn.disabled=true;btn.textContent='Original-Excel wird geprüft …';try{await share(await build(),`GELSEN-LOG_${value('trainNo')||'Zug'}_Original.xlsx`)}catch(e){alert('Original-Excel konnte nicht erstellt werden: '+(e?.message||e))}finally{btn.disabled=false;btn.textContent=old}}
function install(){const card=[...document.querySelectorAll('#dokumente .title h2')].find(x=>x.textContent.includes('Dokumente erstellen'))?.closest('.card');if(!card)return;const group=card.querySelectorAll('.docButtons')[2];if(!group)return;group.innerHTML='';const b=document.createElement('button');b.className='btn gold';b.style.cssText='width:100%;font-size:16px;padding:14px';b.textContent='📊 Original-Excel erstellen';b.addEventListener('click',()=>run(b));group.appendChild(b);const note=card.querySelector('.note');if(note)note.textContent='Die Original-Excel wird nur in den vorgesehenen Eingabefeldern befüllt. P bleibt voll wirksam; nur G wird um 25 % reduziert. Originalformeln und Drucklayout bleiben erhalten.'}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
window.buildOriginalExcelV3=build;
})();