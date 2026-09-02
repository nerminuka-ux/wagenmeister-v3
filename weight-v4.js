(()=>{
'use strict';
const parse=v=>{const s=String(v??'').trim().replace(',','.');const x=Number(s);return Number.isFinite(x)?x:0};
const loadTonnes=v=>{let x=parse(v);if(Math.abs(x)>=1000)x=x/1000;return x};
const norm=v=>String(v||'').replace(/\D/g,'');
function masterTare(number){
 try{
  const list=(typeof db!=='undefined'&&Array.isArray(db))?db:JSON.parse(localStorage.getItem('wm4s_db')||'[]');
  const m=list.find(x=>norm(x.number)===norm(number));
  const t=parse(m?.tare);return t>5?t:null;
 }catch{return null}
}
const fixTrain=()=>{
 try{
  if(typeof train==='undefined'||!Array.isArray(train))return;
  let changed=false;
  train.forEach(w=>{
   const loadBlank=String(w.load??'').trim()==='',tareBlank=String(w.tare??'').trim()==='';
   const load=loadBlank?'':loadTonnes(w.load);
   let tare=tareBlank?'':parse(w.tare); // Tara is always already stored in tonnes. NEVER divide it by 1000.
   const mt=masterTare(w.number);
   // Repair values damaged by the previous kg-normalizer, e.g. 22.35 t -> 2.23 t.
   if(!tareBlank&&tare>0&&tare<5&&mt){tare=mt}
   const tot=(!loadBlank&&!tareBlank)?+(Number(tare)+Number(load)).toFixed(2):'';
   if(loadBlank){if(w.load!==''&&w.load!==null&&w.load!==undefined){w.load='';changed=true}}
   else if(Math.abs(parse(w.load)-load)>0.0001){w.load=load;changed=true}
   if(tareBlank){if(w.tare!==''&&w.tare!==null&&w.tare!==undefined){w.tare='';changed=true}}
   else if(Math.abs(parse(w.tare)-tare)>0.0001){w.tare=tare;changed=true}
   if(tot===''){if(w.total!==''&&w.total!==null&&w.total!==undefined){w.total='';changed=true}}
   else if(Math.abs(parse(w.total)-tot)>0.0001){w.total=tot;changed=true}
  });
  if(changed){localStorage.setItem('wm4s_train',JSON.stringify(train));try{render?.()}catch{}}
 }catch{}
};
const fixEdit=()=>{
 const load=document.getElementById('eLoad'),tare=document.getElementById('eTare'),total=document.getElementById('eTotal');
 if(!load||!tare||!total)return;
 const le=String(load.value??'').trim()==='',te=String(tare.value??'').trim()==='';
 const l=le?'':loadTonnes(load.value),t=te?'':parse(tare.value);
 load.value=le?'':Number(l).toFixed(2);
 tare.value=te?'':Number(t).toFixed(2);
 total.value=(!le&&!te)?(Number(t)+Number(l)).toFixed(2):'';
};
document.addEventListener('click',e=>{
 if(e.target?.id==='saveEdit')fixEdit();
 if(e.target?.id==='wmxSave')document.querySelectorAll('#wmxHost .wmxCell[data-k="load"]').forEach(el=>{el.value=loadTonnes(el.value).toFixed(2)});
},true);
document.addEventListener('input',e=>{
 if(e.target?.id==='eLoad'||e.target?.id==='eTare'){
  const l=parse(document.getElementById('eLoad')?.value),t=parse(document.getElementById('eTare')?.value),o=document.getElementById('eTotal');if(o)o.value=(t+l).toFixed(2);
 }
 if(e.target?.classList?.contains('wmxCell')&&e.target.dataset.k==='load'){
  const tr=e.target.closest('tr'),cells=tr?.children;if(cells?.[6]){const i=Number(e.target.dataset.i),a=(typeof train!=='undefined'&&Array.isArray(train))?train:[];cells[6].textContent=(parse(a[i]?.tare)+loadTonnes(e.target.value)).toFixed(2)}
 }
});
document.addEventListener('focusout',e=>{if(e.target?.id==='eLoad'&&String(e.target.value).trim()!=='')e.target.value=loadTonnes(e.target.value).toFixed(2);if(e.target?.id==='eTare'&&String(e.target.value).trim()!=='')e.target.value=parse(e.target.value).toFixed(2);if(e.target?.id==='eLoad'||e.target?.id==='eTare')fixEdit()});
fixTrain();
window.addEventListener('pageshow',fixTrain);
window.WMWeightV4={loadTonnes,fixTrain};
})();