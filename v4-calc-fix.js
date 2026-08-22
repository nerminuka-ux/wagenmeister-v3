(()=>{
  function init(){
    const $=id=>document.getElementById(id);
    const n=v=>Number(String(v??'').replace(',','.'))||0;
    const recalc=()=>{
      const tare=$('eTare'), load=$('eLoad'), total=$('eTotal'), state=$('eState');
      if(!tare||!load||!total||!state) return;
      if(state.value==='leer') load.value='0';
      total.value=(n(tare.value)+n(load.value)).toFixed(2);
      total.readOnly=true;
      total.title='Wird automatisch aus Tara + Ladung berechnet';
    };
    const tare=$('eTare'), load=$('eLoad'), state=$('eState');
    if(tare) tare.addEventListener('input',recalc);
    if(load) load.addEventListener('input',recalc);
    if(state) state.addEventListener('change',recalc);

    const modal=$('wagonModal');
    if(modal){
      new MutationObserver(()=>{if(modal.classList.contains('open')) setTimeout(recalc,0)}).observe(modal,{attributes:true,attributeFilter:['class']});
    }

    document.addEventListener('click',e=>{
      const t=e.target;
      if(t && (t.id==='saveEdit' || t.id==='saveWagonEdit')) recalc();
      if(t && t.matches && (t.matches('[data-o]') || t.matches('[data-open]'))) setTimeout(recalc,0);
    },true);

    setTimeout(recalc,0);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
