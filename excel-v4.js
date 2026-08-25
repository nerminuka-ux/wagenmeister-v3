(()=>{
'use strict';
const $=id=>document.getElementById(id);
const TEMPLATE='wagenmeister-original.xlsx';
const XLSX_TYPE='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const val=id=>$(id)?.value||'';
const checked=id=>!!$(id)?.checked;
const norm=v=>String(v??'').replace(/\D/g,'');
const num=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};
const rows=()=>{try{return (typeof train!=='undefined'&&Array.isArray(train))?train:JSON.parse(localStorage.getItem('wm4s_train')||'[]')}catch{return[]}};
const sum=k=>rows().reduce((a,w)=>a+num(w?.[k]),0);
const totalWeight=()=>rows().reduce((a,w)=>a+num(w?.tare)+num(w?.load),0);
const activeMode=w=>String(w?.brakeMode||'P').toUpperCase()==='G'?'G':'P';
const effectiveBrakeWeight=()=>rows().reduce((a,w)=>a+(activeMode(w)==='G'?num(w.brakeG)*0.75:num(w.brakeP)),0);
function ensureJSZip(){if(window.JSZip)return Promise.resolve();return new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';s.onload=ok;s.onerror=()=>no(new Error('JSZip konnte nicht geladen werden'));document.head.appendChild(s)})}
function parts(ref){const m=/^([A-Z]+)(\d+)$/.exec(ref);return m?{col:m[1],row:+m[2]}:null}
function colNo(c){let n=0;for(const x of c)n=n*26+x.charCodeAt(0)-64;return n}
function row(doc,n){const sd=doc.getElementsByTagNameNS('*','sheetData')[0];let r=[...sd.getElementsByTagNameNS('*','row')].find(x=>+x.getAttribute('r')===n);if(r)return r;r=doc.createElementNS(sd.namespaceURI,'row');r.setAttribute('r',n);const before=[...sd.children].find(x=>+x.getAttribute('r')>n);before?sd.insertBefore(r,before):sd.appendChild(r);return r}
function cell(doc,ref){const p=parts(ref),r=row(doc,p.row);let c=[...r.getElementsByTagNameNS('*','c')].find(x=>x.getAttribute('r')===ref);if(c)return c;c=doc.createElementNS(r.namespaceURI,'c');c.setAttribute('r',ref);const t=colNo(p.col),before=[...r.children].find(x=>{const q=parts(x.getAttribute('r')||'');return q&&colNo(q.col)>t});before?r.insertBefore(c,before):r.appendChild(c);return c}
function clear(c,keepFormula=false){[...c.children].forEach(x=>{if(x.localName==='v'||x.localName==='is'||(!keepFormula&&x.localName==='f'))c.removeChild(x)});c.removeAttribute('t')}
function set(doc,ref,value,type='string',keepFormula=false){const c=cell(doc,ref);clear(c,keepFormula);if(value===null||value===undefined||value==='')return;if(type==='number'&&Number.isFinite(Number(value))){const v=doc.createElementNS(c.namespaceURI,'v');v.textContent=String(Number(value));c.appendChild(v);return}c.setAttribute('t','inlineStr');const is=doc.createElementNS(c.namespaceURI,'is'),t=doc.createElementNS(c.namespaceURI,'t');t.setAttribute('xml:space','preserve');t.textContent=String(value);is.appendChild(t);c.appendChild(is)}
function dateDE(){const x=val('date');if(!x)return'';const [y,m,d]=x.split('-');return `${d}. ${m} ${y}`}
function dateStamp(){const x=val('date');if(!x)return'';const [y,m,d]=x.split('-');return `${d}.${m}.${y}`}
function setCalc(zip,text){try{const doc=new DOMParser().parseFromString(text,'application/xml');let c=[...doc.getElementsByTagNameNS('*','calcPr')][0];if(!c){c=doc.createElementNS(doc.documentElement.namespaceURI,'calcPr');doc.documentElement.appendChild(c)}c.setAttribute('calcMode','auto');c.setAttribute('fullCalcOnLoad','1');c.setAttribute('forceFullCalc','1');zip.file('xl/workbook.xml',new XMLSerializer().serializeToString(doc))}catch{}}
function last4(v){const d=norm(v);return d.length>=4?d.slice(-4):d}
function dangerText(){const u=[...new Set(rows().map(w=>w.unNr).filter(Boolean))].map(x=>'UN '+x);const g=[...new Set(rows().map(w=>w.ridGef).filter(Boolean))].map(x=>'Gef. '+x);return [...u,...g].join('  ')}
function taskStamp(id){return checked(id)?`${dateStamp()} - ${val('time')||'__:__'} - ${val('createdBy')}`:''}
function fillWagenliste(doc){
 set(doc,'M2',val('trainNo'));set(doc,'P2',val('from'));set(doc,'U2',val('to'));
 const cols=['B','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];
 for(let r=7;r<=36;r++)for(const c of cols)set(doc,c+r,'');
 rows().slice(0,30).forEach((w,i)=>{const r=7+i,mode=activeMode(w);set(doc,'B'+r,norm(w.number));set(doc,'G'+r,num(w.axles),'number');set(doc,'H'+r,num(w.length),'number');set(doc,'I'+r,num(w.load),'number');set(doc,'J'+r,num(w.tare)+num(w.load),'number');set(doc,'K'+r,w.brakeShoe||'');set(doc,'L'+r,mode==='P'?num(w.brakeP):'','number');set(doc,'M'+r,mode==='G'?num(w.brakeG):'','number');set(doc,'N'+r,num(w.effectiveBrakes),'number');set(doc,'O'+r,num(w.handBrake),'number');set(doc,'P'+r,w.ridGef||'');set(doc,'Q'+r,w.unNr||'');set(doc,'R'+r,w.gefZettel||'');set(doc,'S'+r,w.special==='1'?1:0,'number');set(doc,'T'+r,w.destination||val('to'));set(doc,'U'+r,num(w.vmax)||100,'number');set(doc,'V'+r,w.routeClass||'D');set(doc,'W'+r,w.remarks||'')});
 set(doc,'A42',dateDE());set(doc,'G42',val('time'));set(doc,'J42',val('createdBy'));
}
function fillBremszettel(doc){
 const rr=rows(),tw=totalWeight(),bw=effectiveBrakeWeight(),ax=sum('axles'),len=sum('length');
 const min=Number(val('minBrakePercent'))||0,bh=tw?Math.floor((bw/tw)*100):0;
 set(doc,'I1',val('trainNo'));set(doc,'R1',dateDE());set(doc,'W1',val('from'));
 set(doc,'U8',tw,'number');set(doc,'U9',Math.floor(bw),'number');set(doc,'U10',ax,'number');
 set(doc,'U11',min||'','number');set(doc,'U12',bh||'','number');set(doc,'U14',min?Math.max(0,min-bh):'','number');
 set(doc,'U15',rr.at(-1)?.number||'');set(doc,'U16',0,'number');set(doc,'U17',rr.length,'number');
 set(doc,'U18',rr.filter(w=>String(w.brakeShoe||'').toUpperCase()==='D').length,'number');
 set(doc,'U19',rr.filter(w=>['K','L','LL'].includes(String(w.brakeShoe||'').toUpperCase())).length,'number');
 set(doc,'U20',rr.filter(w=>String(w.remarks||'').toLowerCase().includes('matrossow')).length,'number');
 set(doc,'U21',len,'number');set(doc,'U22',sum('effectiveBrakes')||ax,'number');set(doc,'U39',rr.some(w=>w.unNr||w.ridGef)?'ja':'nein');set(doc,'J43',val('createdBy'));
}
function fillWU(doc){
 const rr=rows(),first=rr[0]?.number||'',last=rr.at(-1)?.number||'',danger=rr.some(w=>w.unNr||w.ridGef);
 set(doc,'G9',val('trainNo'));set(doc,'P9',dateDE());set(doc,'Y9',val('createdBy'));
 set(doc,'G11',val('to'));set(doc,'P11',val('time'));set(doc,'Y11',val('docOrderNo'));
 set(doc,'G13',rr.length,'number');set(doc,'P13',val('docLocation'));set(doc,'G15',sum('axles'),'number');set(doc,'P15',val('docTrack'));
 set(doc,'L18',checked('schluss')?'X':'');set(doc,'L20',checked('fullBrake')?'X':'');set(doc,'AA20',val('fullBrakeTime')||val('time'));
 set(doc,'F22',val('reason'));set(doc,'G24',danger?'X':'');set(doc,'I27',first);set(doc,'I29',last);set(doc,'I31',val('specialNotes')||dangerText());set(doc,'B52',val('createdBy'));set(doc,'AF52',dateDE());
}
function fillMeldezettel(doc){
 const rr=rows(),first=rr[0]?.number||'',last=rr.at(-1)?.number||'',a=last4(first),b=last4(last);
 set(doc,'E3',val('from'));set(doc,'M4',val('docTrack'));set(doc,'E6',dateDE());set(doc,'M6',val('time'));
 set(doc,'E8',totalWeight(),'number');set(doc,'H8',sum('axles'),'number');set(doc,'K9',val('createdBy'));
 set(doc,'A11',a[0]||'');set(doc,'C11',a[1]||'');set(doc,'E11',a[2]||'');set(doc,'I11',a[3]||'');
 set(doc,'K11',b[0]||'');set(doc,'L11',b[1]||'');set(doc,'M11',b[2]||'');set(doc,'O11',b[3]||'');
 set(doc,'Q2',val('trainNo'));set(doc,'T2',dateDE());set(doc,'Q4',val('from'));set(doc,'T5',val('docTrack'));set(doc,'Q11',first);set(doc,'T11',last);set(doc,'S13',val('createdBy'));
 set(doc,'Q7',checked('docsComplete')?'X  Beförderungs-/Begleitpapiere vollzählig':'Beförderungs-/Begleitpapiere vollzählig');
 set(doc,'T7',checked('ordersComplete')?'X  Beförderungsanordnung(en) vollzählig':'Beförderungsanordnung(en) vollzählig');
 set(doc,'Q8',checked('withoutDocs')?'X  Zug verkehrt ohne Beförderungs-Begleitpapiere':'Zug verkehrt ohne Beförderungs-Begleitpapiere');
 set(doc,'T8',checked('permanentOrder')?'X  Zug verkehrt mit Dauer-Beförderungsanordnung(en)':'Zug verkehrt mit Dauer-Beförderungsanordnung(en)');
 [['T18','mCoupling'],['T19','mTechnical'],['T20','mFullBrake'],['T21','mEndSignal'],['T22','mOrderNotified'],['T24','mLocoCoupled'],['T25','mSecuringRemoved'],['T26','mSimpleBrake']].forEach(([c,id])=>set(doc,c,taskStamp(id)||'___.___.____ - ___:___ - ______________'));
}
async function readSheet(zip,path){const f=zip.file(path);if(!f)return null;const txt=await f.async('text');const doc=new DOMParser().parseFromString(txt,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw new Error('Excel-Blatt konnte nicht gelesen werden: '+path);return doc}
async function build(){
 await ensureJSZip();const r=await fetch('./'+TEMPLATE+'?v='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('Original-Excel-Vorlage fehlt ('+r.status+')');const buf=await r.arrayBuffer();if(buf.byteLength<50000)throw new Error('Bitte zuerst die Originalvorlage auswählen.');const zip=await JSZip.loadAsync(buf);
 const specs=[['xl/worksheets/sheet1.xml',fillWagenliste],['xl/worksheets/sheet3.xml',fillBremszettel],['xl/worksheets/sheet4.xml',fillWU],['xl/worksheets/sheet5.xml',fillMeldezettel]];
 for(const [path,fn] of specs){const doc=await readSheet(zip,path);if(doc){fn(doc);zip.file(path,new XMLSerializer().serializeToString(doc))}}
 const wb=zip.file('xl/workbook.xml');if(wb)setCalc(zip,await wb.async('text'));
 return zip.generateAsync({type:'blob',mimeType:XLSX_TYPE,compression:'DEFLATE'})
}
async function deliver(blob){const name=`GELSEN-LOG_${val('trainNo')||'Zug'}_Original.xlsx`,file=new File([blob],name,{type:XLSX_TYPE});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e?.name==='AbortError')return}const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
async function run(btn){const old=btn.textContent;btn.disabled=true;btn.textContent='Original-Excel wird erstellt …';try{await deliver(await build())}catch(e){alert('Original-Excel konnte nicht erstellt werden: '+(e?.message||e))}finally{btn.disabled=false;btn.textContent=old}}
function install(){const card=document.querySelector('#wagenliste .card');if(!card||document.getElementById('excelControlsV4'))return;const bar=document.createElement('div');bar.id='excelControlsV4';bar.className='actions';bar.style.marginBottom='10px';const choose=document.createElement('button');choose.type='button';choose.className='btn sec';choose.textContent='📁 Originalvorlage auswählen';choose.addEventListener('click',async()=>{try{if(!window.WMTemplateStore?.choose)throw new Error('Vorlagen-Speicher noch nicht geladen');await window.WMTemplateStore.choose();choose.textContent='✓ Originalvorlage gespeichert';setTimeout(()=>choose.textContent='📁 Originalvorlage auswählen',1800)}catch(e){if((e?.message||'').includes('Keine Datei ausgewählt'))return;alert('Vorlage konnte nicht gespeichert werden: '+(e?.message||e))}});const exp=document.createElement('button');exp.id='originalExcelV4';exp.type='button';exp.className='btn pri';exp.textContent='📊 GELSEN-LOG Original-Excel erstellen';exp.addEventListener('click',()=>run(exp));const note=document.createElement('div');note.className='note';note.textContent='Erstellt die Originaldatei mit Wagenliste, Bremszettel, WU/ZP und Melde-/Abstellzettel.';bar.appendChild(choose);bar.appendChild(exp);bar.appendChild(note);card.insertBefore(bar,card.querySelector('.tablewrap'))}
install();window.WMExcelV4={build,run};
})();