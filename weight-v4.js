(()=>{
'use strict';
const parse=v=>{const x=Number(String(v??'').trim().replace(/\./g,'').replace(',','.'));return Number.isFinite(x)?x:0};
const tonnes=v=>{let x=parse(v);if(Math.abs(x)>=1000)x=x/1000;return x};
const fixTrain=()=>{
 try{
  if(typeof train==='undefined'||!Array.isArray(train))return;
  let changed=false;
  train.forEach(w=>{
   const load=tonnes(w.load),tare=tonnes(w.tare),tot=+(tare+load).toFixed(2);
   if(Number(w.load)!==load){w.load=load;changed=true}
   if(Number(w.tare)!==tare){w.tare=tare;changed=true}
   if(Number(w.total)!==tot){w.total=tot;changed=true}
  });
  if(changed){localStorage.setItem('wm4s_train',JSON.stringify(train));try{render?.()}catch{}}
 }catch{}
};
const fixEdit=()=>{
 const load=document.getElementById('eLoad'),tare=document.getElementById('eTare'),total=document.getElementById('eTotal');
 if(!load||!tare||!total)return;
 const l=tonnes(load.value),t=tonnes(tare.value);load.value=l.toFixed(2);tare.value=t.toFixed(2);total.value=(t+l).toFixed(2);
};
// Before the normal wagon save handler runs, normalize kg-style entries (e.g. 56500 -> 56.50 t).
document.addEventListener('click',e=>{
 if(e.target?.id==='saveEdit')fixEdit();
 if(e.target?.id==='wmxSave'){
  document.querySelectorAll('#wmxHost .wmxCell[data-k="load"]').forEach(el=>{el.value=tonnes(el.value).toFixed(2)});
 }
},true);
// Keep the total field live while editing in the wagon modal.
document.addEventListener('input',e=>{
 if(e.target?.id==='eLoad'||e.target?.id==='eTare'){
  const l=parse(document.getElementById('eLoad')?.value),t=parse(document.getElementById('eTare')?.value),o=document.getElementById('eTotal');if(o)o.value=(t+l).toFixed(2);
 }
});
document.addEventListener('focusout',e=>{if(e.target?.id==='eLoad'||e.target?.id==='eTare')fixEdit()});
fixTrain();
window.addEventListener('pageshow',fixTrain);
window.WMWeightV4={tonnes,fixTrain};
})();