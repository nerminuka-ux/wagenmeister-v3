(()=>{
  function init(){
    const $=id=>document.getElementById(id);
    const tare=$('eTare'), load=$('eLoad'), total=$('eTotal'), state=$('eState');
    if(!tare||!load||!total||!state) return;
    const n=v=>Number(String(v??'').replace(',','.'))||0;
    const recalc=()=>{
      if(state.value==='leer') load.value='0';
      total.value=(n(tare.value)+n(load.value)).toFixed(2);
    };
    load.addEventListener('input',recalc);
    tare.addEventListener('input',recalc);
    state.addEventListener('change',recalc);
    total.readOnly=true;
    total.title='Wird automatisch aus Tara + Ladung berechnet';
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
