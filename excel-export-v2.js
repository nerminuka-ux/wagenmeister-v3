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
const activeBrake=w=>activeMode(w)==='G'?(Number(w?.brakeG)||0):(Number(w?.brakeP)||0);

function ensureJSZip(){
 if(window.JSZip)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  s.onload=resolve;s.onerror=()=>reject(new Error('JSZip konnte nicht geladen werden'));
  document.head.appendChild(s);
 });
}
function parts(ref){const m=/^([A-Z]+)(\d+)$/.exec(ref);return m?{col:m[1],row:Number(m[2])}:null}
function colNo(col){let n=0;for(const c of col)n=n*26+(c.charCodeAt(0)-64);return n}
function sheetData(doc){return doc.getElementsByTagNameNS('*','sheetData')[0]}
function rowNode(doc,rowNum){
 const sd=sheetData(doc);let r=[...sd.getElementsByTagNameNS('*','row')].find(x=>Number(x.getAttribute('r'))===rowNum);
 if(r)return r;r=doc.createElementNS(sd.namespaceURI,'row');r.setAttribute('r',String(rowNum));
 const before=[...sd.children].find(x=>Number(x.getAttribute('r'))>rowNum);before?sd.insertBefore(r,before):sd.appendChild(r);return r;
}
function cellNode(doc,ref){
 const p=parts(ref),r=rowNode(doc,p.row);let c=[...r.getElementsByTagNameNS('*','c')].find(x=>x.getAttribute('r')===ref);
 if(c)return c;c=doc.createElementNS(r.namespaceURI,'c');c.setAttribute('r',ref);
 const target=colNo(p.col),before=[...r.children].find(x=>{const q=parts(x.getAttribute('r')||'');return q&&colNo(q.col)>target});
 before?r.insertBefore(c,before):r.appendChild(c);return c;
}
function clearCell(c,keepFormula=false){
 [...c.children].forEach(x=>{const n=x.localName;if(n==='v'||n==='is'||(!keepFormula&&n==='f'))c.removeChild(x)});c.removeAttribute('t');
}
function setCell(doc,ref,val,type='string',keepFormula=false){
 const c=cellNode(doc,ref);clearCell(c,keepFormula);
 if(val===null||val===undefined||val==='')return;
 if(type==='number'&&Number.isFinite(Number(val))){const v=doc.createElementNS(c.namespaceURI,'v');v.textContent=String(Number(val));c.appendChild(v);return}
 c.setAttribute('t','inlineStr');const is=doc.createElementNS(c.namespaceURI,'is'),t=doc.createElementNS(c.namespaceURI,'t');t.setAttribute('xml:space','preserve');t.textContent=String(val);is.appendChild(t);c.appendChild(is);
}
function setResult(doc,ref,val,type='string'){
 const c=cellNode(doc,ref);clearCell(c,true);if(val===null||val===undefined||val==='')return;
 if(type==='number'&&Number.isFinite(Number(val))){const v=doc.createElementNS(c.namespaceURI,'v');v.textContent=String(Number(val));c.appendChild(v);return}
 const f=[...c.children].find(x=>x.localName==='f');if(f)c.removeChild(f);setCell(doc,ref,val,type,false);
}
async function readSheet(zip,path){return new DOMParser().parseFromString(await zip.file(path).async('text'),'application/xml')}
function writeSheet(zip,path,doc){zip.file(path,new XMLSerializer().serializeToString(doc))}
function forceRecalc(zip,text){
 try{const doc=new DOMParser().parseFromString(text,'application/xml');let c=[...doc.getElementsByTagNameNS('*','calcPr')][0];if(!c){c=doc.createElementNS(doc.documentElement.namespaceURI,'calcPr');doc.documentElement.appendChild(c)}c.setAttribute('calcMode','auto');c.setAttribute('fullCalcOnLoad','1');c.setAttribute('forceFullCalc','1');zip.file('xl/workbook.xml',new XMLSerializer().serializeToString(doc))}catch{}
}
function dateDE(){const v=value('date');if(!v)return '';const [y,m,d]=v.split('-');return `${d}. ${m} ${y}`}
function dateStamp(){const v=value('date');if(!v)return '';const [y,m,d]=v.split('-');return `${d}.${m}.${y}`}
function timeVal(){return value('time')}
function last4(v){const d=norm(v);return d.length>=5?d.slice(-5,-1):d}
function dangerText(){const u=[...new Set(rows().map(w=>w.unNr).filter(Boolean))].map(x=>'UN '+x),g=[...new Set(rows().map(w=>w.ridGef).filter(Boolean))].map(x=>'Gef. '+x);return [...u,...g].join('  ')}
function taskStamp(id){return checked(id)?`${dateStamp()} - ${timeVal()||'__:__'} - ${value('createdBy')}`:''}

function fillWagenliste(doc){
 setCell(doc,'M2',value('trainNo'));setCell(doc,'P2',value('from'));setCell(doc,'U2',value('to'));
 const cols=['B','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];
 for(let r=7;r<=36;r++)for(const c of cols)setCell(doc,c+r,'');
 rows().slice(0,30).forEach((w,i)=>{
  const r=7+i,mode=activeMode(w);
  setCell(doc,'B'+r,norm(w.number));setCell(doc,'G'+r,num(w.axles),'number');setCell(doc,'H'+r,num(w.length),'number');
  setCell(doc,'I'+r,num(w.load),'number');setCell(doc,'J'+r,num(w.total),'number');setCell(doc,'K'+r,w.brakeShoe||'');
  setCell(doc,'L'+r,mode==='P'?num(w.brakeP):'','number');setCell(doc,'M'+r,mode==='G'?num(w.brakeG):'','number');
  setCell(doc,'N'+r,num(w.effectiveBrakes),'number');setCell(doc,'O'+r,num(w.handBrake),'number');
  setCell(doc,'P'+r,w.ridGef||'');setCell(doc,'Q'+r,w.unNr||'');setCell(doc,'R'+r,w.gefZettel||'');setCell(doc,'S'+r,w.special==='1'?1:0,'number');
  setCell(doc,'T'+r,w.destination||value('to'));setCell(doc,'U'+r,num(w.vmax),'number');setCell(doc,'V'+r,w.routeClass||'');setCell(doc,'W'+r,w.remarks||'');
 });
 setCell(doc,'A42',dateDE());setCell(doc,'G42',timeVal());setCell(doc,'J42',value('createdBy'));
}
function fillBremszettel(doc){
 const rr=rows(),total=sum('total'),bw=rr.reduce((a,w)=>a+activeBrake(w),0),ax=sum('axles'),len=sum('length');
 const min=Number(value('minBrakePercent'))||0,bh=total?Math.floor((bw/total)*100):0;
 setResult(doc,'I1',value('trainNo'));setResult(doc,'R1',dateDE());setResult(doc,'W1',value('from'));
 setResult(doc,'U8',total,'number');setResult(doc,'U9',bw,'number');setResult(doc,'U10',ax,'number');setCell(doc,'U11',min||'','number');setCell(doc,'U12',bh||'','number');setCell(doc,'U14',min?Math.max(0,min-bh):'','number');
 setResult(doc,'U15',rr.at(-1)?.number||'');setCell(doc,'U16',0,'number');setResult(doc,'U17',rr.length,'number');
 setCell(doc,'U18',rr.filter(w=>String(w.brakeShoe||'').toUpperCase()==='D').length,'number');setResult(doc,'U19',rr.filter(w=>['K','L','LL'].includes(String(w.brakeShoe||'').toUpperCase())).length,'number');
 setCell(doc,'U20',rr.filter(w=>String(w.remarks||'').toLowerCase().includes('matrossow')).length,'number');setResult(doc,'U21',len,'number');setCell(doc,'U22',sum('effectiveBrakes'),'number');
 setCell(doc,'U39',rr.some(w=>w.unNr||w.ridGef)?'ja':'nein');setResult(doc,'J43',value('createdBy'));
}
function fillWU(doc){
 const rr=rows(),first=rr[0]?.number||'',last=rr.at(-1)?.number||'',danger=checked('dangerous')||rr.some(w=>w.unNr||w.ridGef);
 setResult(doc,'G9',value('trainNo'));setResult(doc,'P9',dateDE());setCell(doc,'Y9',value('createdBy'));setResult(doc,'G11',value('to'));setResult(doc,'P11',timeVal());setCell(doc,'Y11',value('docOrderNo'));
 setResult(doc,'G13',rr.length,'number');setCell(doc,'P13',value('docLocation'));setResult(doc,'G15',sum('axles'),'number');setCell(doc,'P15',value('docTrack'));
 setCell(doc,'L18',checked('schluss')?'X':'');setCell(doc,'L20',checked('fullBrake')?'X':'');setCell(doc,'AA20',value('fullBrakeTime')||timeVal());setCell(doc,'F22',value('reason'));setCell(doc,'G24',danger?'X':'');
 setResult(doc,'I27',first);setResult(doc,'I29',last);setCell(doc,'I31',value('specialNotes')||dangerText());setCell(doc,'B52',value('createdBy'));setResult(doc,'AF52',dateDE());
}
function fillMeldezettel(doc){
 const rr=rows(),first=rr[0]?.number||'',last=rr.at(-1)?.number||'';
 setCell(doc,'E3',value('from'));setCell(doc,'M4',value('docTrack'));setCell(doc,'E6',dateDE());setCell(doc,'M6',timeVal());setResult(doc,'E8',sum('total'),'number');setResult(doc,'H8',sum('axles'),'number');setCell(doc,'K9',value('createdBy'));
 const a=last4(first),b=last4(last);setCell(doc,'A11',a[0]||'');setCell(doc,'C11',a[1]||'');setCell(doc,'E11',a[2]||'');setCell(doc,'I11',a[3]||'');setCell(doc,'K11',b[0]||'');setCell(doc,'L11',b[1]||'');setCell(doc,'M11',b[2]||'');setCell(doc,'O11',b[3]||'');
 setResult(doc,'Q2',value('trainNo'));setCell(doc,'T2',dateDE());setCell(doc,'Q4',value('from'));setCell(doc,'T5',value('docTrack'));setResult(doc,'Q11',first);setResult(doc,'T11',last);setResult(doc,'S13',value('createdBy'));
 setCell(doc,'Q7',checked('docsComplete')?'X  Beförderungs-/Begleitpapiere vollzählig':'Beförderungs-/Begleitpapiere vollzählig');setCell(doc,'T7',checked('ordersComplete')?'X  Beförderungsanordnung(en) vollzählig':'Beförderungsanordnung(en) vollzählig');
 setCell(doc,'Q8',checked('withoutDocs')?'X  Zug verkehrt ohne Beförderungs-Begleitpapiere':'Zug verkehrt ohne Beförderungs-Begleitpapiere');setCell(doc,'T8',checked('permanentOrder')?'X  Zug verkehrt mit Dauer-Beförderungsanordnung(en)':'Zug verkehrt mit Dauer-Beförderungsanordnung(en)');
 [['T18','mCoupling'],['T19','mTechnical'],['T20','mFullBrake'],['T21','mEndSignal'],['T22','mOrderNotified'],['T24','mLocoCoupled'],['T25','mSecuringRemoved'],['T26','mSimpleBrake']].forEach(([c,id])=>setCell(doc,c,taskStamp(id)||'___.___.____ - ___:___ - ______________'));
}
async function build(){
 await ensureJSZip();const r=await fetch(TEMPLATE+'?v=20260816-2245',{cache:'no-store'});if(!r.ok)throw new Error('Originalvorlage fehlt ('+r.status+')');
 const zip=await JSZip.loadAsync(await r.arrayBuffer());
 for(const [path,fn] of [['xl/worksheets/sheet1.xml',fillWagenliste],['xl/worksheets/sheet3.xml',fillBremszettel],['xl/worksheets/sheet4.xml',fillWU],['xl/worksheets/sheet5.xml',fillMeldezettel]]){const doc=await readSheet(zip,path);if(doc.getElementsByTagName('parsererror').length)throw new Error('Excel-Blatt konnte nicht gelesen werden: '+path);fn(doc);writeSheet(zip,path,doc)}
 const wb=zip.file('xl/workbook.xml');if(wb)forceRecalc(zip,await wb.async('text'));
 return zip.generateAsync({type:'blob',mimeType:XLSX_TYPE,compression:'DEFLATE'});
}
async function share(blob,name){
 const file=new File([blob],name,{type:XLSX_TYPE});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e?.name==='AbortError')return;throw e}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
async function run(btn){const old=btn.textContent;btn.disabled=true;btn.textContent='Original-Excel wird erstellt …';try{await share(await build(),`GELSEN-LOG_${value('trainNo')||'Zug'}_Original.xlsx`)}catch(e){alert('Original-Excel konnte nicht erstellt werden: '+(e?.message||e))}finally{btn.disabled=false;btn.textContent=old}}

function installBrakeModeUI(){
 const trainGrid=byId('trainNo')?.closest('.grid');if(trainGrid&&!byId('trainBrakeMode')){const d=document.createElement('div');d.innerHTML='<label>Standard-Bremsstellung</label><select id="trainBrakeMode"><option value="P">P</option><option value="G">G</option></select>';trainGrid.appendChild(d);const saved=localStorage.getItem('wm_v3_brake_mode');if(saved)byId('trainBrakeMode').value=saved;byId('trainBrakeMode').addEventListener('change',e=>{localStorage.setItem('wm_v3_brake_mode',e.target.value);decorateWagons()})}
 decorateWagons();
 const list=byId('list');if(list&&!list.dataset.brakeObserver){list.dataset.brakeObserver='1';new MutationObserver(()=>setTimeout(decorateWagons,0)).observe(list,{childList:true,subtree:true})}
}
function decorateWagons(){
 const def=value('trainBrakeMode')||localStorage.getItem('wm_v3_brake_mode')||'P';
 document.querySelectorAll('#list .wagon').forEach((el,i)=>{
  const w=rows()[i];if(!w)return;if(!w.brakeMode){w.brakeMode=def;try{saveTrain()}catch{}}
  if(el.querySelector('.wmBrakeMode'))return;
  const box=document.createElement('label');box.style.cssText='font-size:10px;color:#6d7774;display:flex;align-items:center;gap:4px;margin-top:5px';box.innerHTML='Bremse <select class="wmBrakeMode" style="width:auto;font-size:13px;padding:2px;border:1px solid #bcc4bf;border-radius:6px"><option>P</option><option>G</option></select>';
  const sel=box.querySelector('select');sel.value=activeMode(w);sel.addEventListener('change',()=>{w.brakeMode=sel.value;try{saveTrain()}catch{}});el.querySelector('.meta')?.after(box);
 });
}
function installButton(){
 const card=[...document.querySelectorAll('#dokumente .title h2')].find(x=>x.textContent.includes('Dokumente erstellen'))?.closest('.card');if(!card)return;
 let group=card.querySelectorAll('.docButtons')[2];if(!group)return;group.innerHTML='';const b=document.createElement('button');b.className='btn gold';b.style.cssText='width:100%;font-size:16px;padding:14px';b.textContent='📊 Original-Excel erstellen';b.addEventListener('click',()=>run(b));group.appendChild(b);
 const note=card.querySelector('.note');if(note)note.textContent='Die echte GELSEN-LOG Excel-Vorlage wird direkt befüllt. Bremsstellung P/G wird je Wagen berücksichtigt; Formatierung, Formeln und Drucklayout der Originaldatei bleiben erhalten.';
}
function boot(){installBrakeModeUI();installButton()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.buildOriginalExcelV2=build;
})();