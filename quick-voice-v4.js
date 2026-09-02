(()=> {
'use strict';
const $=id=>document.getElementById(id);
const num=v=>Number(String(v??'').trim().replace(',','.'))||0;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const getTrain=()=>{try{return (typeof train!=='undefined'&&Array.isArray(train))?train:JSON.parse(localStorage.getItem('wm4s_train')||'[]')}catch{return[]}};
const saveTrain=a=>{try{localStorage.setItem('wm4s_train',JSON.stringify(a));if(typeof persist==='function')persist();if(typeof render==='function')render()}catch{}};
const fmtNo=v=>{const d=String(v||'').replace(/\D/g,'').slice(0,12);if(d.length<=2)return d;if(d.length<=4)return d.slice(0,2)+' '+d.slice(2);if(d.length<=8)return d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4);if(d.length<=11)return d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4,8)+' '+d.slice(8);return d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4,8)+' '+d.slice(8,11)+'-'+d.slice(11)};
const normalizeLoad=v=>{if(String(v??'').trim()==='')return'';let x=num(v);if(Math.abs(x)>=1000)x=x/1000;return +x.toFixed(2)};
const shown=(v,d=2,zeroBlank=false)=>{if(v===null||v===undefined||String(v).trim()==='')return'';const x=Number(String(v).replace(',','.'));if(zeroBlank&&Number.isFinite(x)&&x===0)return'';return Number.isFinite(x)?x.toFixed(d):String(v)};
function dangerDefaults(un){const u=String(un??'').replace(/\D/g,'');if(u==='1202'||u==='1863')return{ridGef:'30',gefZettel:'3'};if(u==='1203')return{ridGef:'33',gefZettel:'3'};return null;}
function inheritCommonDanger(a){
  if(!Array.isArray(a)||a.length<2)return false;
  const keys=['unNr','ridGef','gefZettel'];
  let changed=false;
  const sources=a.filter(w=>keys.some(k=>String(w?.[k]??'').trim()!==''));
  if(!sources.length)return false;
  const common={};
  for(const k of keys){
    const vals=[...new Set(sources.map(w=>String(w?.[k]??'').trim()))];
    if(vals.length!==1)return false;
    common[k]=vals[0];
  }
  a.forEach(w=>{
    const empty=keys.every(k=>String(w?.[k]??'').trim()==='');
    if(empty){keys.forEach(k=>w[k]=common[k]);changed=true}
  });
  if(changed){try{localStorage.setItem('wm4s_train',JSON.stringify(a))}catch{}}
  return changed;
}
function syncBulkFields(a){
  const clean=v=>String(v??'').trim();
  const pairs=[['wmqAllUn','unNr']];
  pairs.forEach(([id,k])=>{
    const el=$(id);if(!el)return;
    let vals=(a||[]).map(w=>clean(w?.[k]));
    if(!vals.length){
      const key=k==='unNr'?'unNr':k==='ridGef'?'ridGef':'gefZettel';
      vals=[...document.querySelectorAll('#wmQuickRows [data-qkey="'+key+'"]')].map(x=>clean(x.value));
    }
    const same=vals.length>0&&vals.every(v=>v===vals[0]);
    el.value=same?vals[0]:'';
  });
}
function renderQuick(){
  const host=$('wmQuickRows'); if(!host)return;
  const a=getTrain();
  a.forEach(w=>{if(w.gefZettel===undefined||w.gefZettel===null||String(w.gefZettel).trim()==='')w.gefZettel='3'});
  inheritCommonDanger(a);
  host.innerHTML=a.length?a.map((w,i)=>`<div class="wmqRow" data-i="${i}">
    <div class="wmqNo"><b>${i+1}. ${esc(w.number||'')}</b></div>
    <label>Länge ü. Puffer m<input data-qkey="length" data-qi="${i}" inputmode="decimal" value="${shown(w.length,2,true)}"></label>
    <label>Eigengewicht t<input data-qkey="tare" data-qi="${i}" inputmode="decimal" value="${shown(w.tare,2,true)}"></label>
    <label>Ladungsgewicht t<input data-qkey="load" data-qi="${i}" inputmode="decimal" value="${shown(w.load)}"></label>
    <label>Gesamtgewicht t<input data-qkey="total" data-qi="${i}" value="${(shown(w.tare,2,true)!==''&&shown(w.load)!=='')?(num(w.tare)+num(w.load)).toFixed(2):''}" readonly></label>
    <label>Bremssohle<input data-qkey="brakeShoe" data-qi="${i}" value="${esc(w.brakeShoe||'')}"></label>
    <label>Bremsgewicht<input data-qkey="brakeP" data-qi="${i}" inputmode="decimal" value="${shown(w.brakeP,0,true)}"></label>
    <label>Festhaltekraft kN<input data-qkey="handBrake" data-qi="${i}" inputmode="decimal" value="${shown(w.handBrake,1,true)}"></label>
    <label>UN-Nr.<input data-qkey="unNr" data-qi="${i}" inputmode="numeric" value="${esc(w.unNr||'')}"></label>
  </div>`).join(''):'<div class="empty">Noch keine Wagen im Zug.</div>';
  syncBulkFields(a);
  setTimeout(()=>syncBulkFields(getTrain()),80);
  setTimeout(()=>syncBulkFields(getTrain()),350);
}
function applyAll(){
  const a=getTrain(),un=$('wmqAllUn')?.value.trim()||'';
  if(!a.length)return alert('Noch keine Wagen im Zug.');
  const d=dangerDefaults(un);
  a.forEach(w=>{w.unNr=un;w.ridGef=d?.ridGef||'';w.gefZettel=d?.gefZettel||'3'});
  saveTrain(a);renderQuick();
}
function refreshLiveTotals(a,i){
  const t=document.querySelector('[data-qkey="total"][data-qi="'+i+'"]');
  if(t&&a[i])t.value=(shown(a[i].tare,2,true)!==''&&shown(a[i].load)!=='')?(num(a[i].tare)+num(a[i].load)).toFixed(2):'';
  const load=a.reduce((s,w)=>s+num(w.load),0);
  const total=a.reduce((s,w)=>s+num(w.tare)+num(w.load),0);
  const sLoad=$('sLoad'),sTotal=$('sTotal');
  if(sLoad)sLoad.textContent=load.toFixed(1)+' t';
  if(sTotal)sTotal.textContent=Math.round(total)+' t';
  try{if(typeof brakeRules==='function'){const br=brakeRules(a);const e=$('sBrakeEff');if(e)e.textContent=br.effective+' t';const r=$('sBrakeRule');if(r)r.textContent=br.warning?'PRÜFEN':(br.schedule==='G'?'G':(br.weight<=1200?'alle P':br.weight<=1600?'1–5 G / Rest P':'dynamisch'))}}catch{}
}
function onQuickInput(e){
  const el=e.target.closest('[data-qkey]');if(!el)return;
  const a=getTrain(),i=+el.dataset.qi,k=el.dataset.qkey;if(!a[i]||k==='total')return;
  if(k==='load'){a[i].load=String(el.value).trim()===''?'':num(el.value);a[i].total=(a[i].load===''||shown(a[i].tare)==='')?'':+(num(a[i].tare)+num(a[i].load)).toFixed(2);refreshLiveTotals(a,i)}
  try{localStorage.setItem('wm4s_train',JSON.stringify(a))}catch{}
}
function onQuickChange(e){
  const el=e.target.closest('[data-qkey]');if(!el)return;
  const a=getTrain(),i=+el.dataset.qi,k=el.dataset.qkey;if(!a[i])return;
  if(k==='total')return;
  if(k==='load'){a[i].load=normalizeLoad(el.value);a[i].total=(a[i].load===''||shown(a[i].tare)==='')?'':+(num(a[i].tare)+num(a[i].load)).toFixed(2);el.value=a[i].load===''?'':Number(a[i].load).toFixed(2)}
  else if(['length','tare','brakeP','handBrake'].includes(k))a[i][k]=String(el.value).trim()===''?'':num(el.value);
  else a[i][k]=el.value.trim();
  if(k==='unNr'){
    const d=dangerDefaults(a[i].unNr);
    if(d){a[i].ridGef=d.ridGef;a[i].gefZettel=d.gefZettel;}
  }
  if(['length','tare','brakeShoe','brakeP','handBrake'].includes(k)&&typeof saveMasterToDB==='function')saveMasterToDB(a[i]);
  if(k==='tare')a[i].total=(shown(a[i].tare,2,true)!==''&&shown(a[i].load)!=='')?+(num(a[i].tare)+num(a[i].load)).toFixed(2):'';
  saveTrain(a);
  if(k==='unNr'||k==='tare')renderQuick(); else refreshLiveTotals(a,i);
  if(['unNr','ridGef','gefZettel'].includes(k))syncBulkFields(a);
}
function speechCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function speak(text){return new Promise(resolve=>{try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';u.rate=1;u.onend=resolve;u.onerror=resolve;speechSynthesis.speak(u)}catch{resolve()}})}
function listen(prompt){
  return new Promise(async(resolve,reject)=>{
    const C=speechCtor();if(!C)return reject(new Error('Spracherkennung wird auf diesem Gerät/Browser nicht unterstützt.'));
    await speak(prompt);
    const r=new C();r.lang='de-DE';r.interimResults=false;r.maxAlternatives=3;
    r.onresult=e=>resolve([...e.results[0]].map(x=>x.transcript).join(' | '));
    r.onerror=e=>reject(new Error(e.error==='not-allowed'?'Mikrofonzugriff wurde nicht erlaubt.':'Sprache wurde nicht erkannt.'));
    r.start();
  });
}
function transcriptDigits(s){
  const map={null:'0',eins:'1',ein:'1',eine:'1',zwei:'2',drei:'3',vier:'4',fünf:'5',funf:'5',sechs:'6',sieben:'7',acht:'8',neun:'9'};
  let out=String(s||'').toLowerCase().replace(/minus|bindestrich/g,' ');
  out=out.split(/\s+/).map(x=>map[x]??x).join(' ');
  return out.replace(/\D/g,'');
}
function yes(s){return /\b(ja|jawohl|richtig|alle|übernehmen|gleich)\b/i.test(s||'')}
function none(s){return /\b(nein|keine|kein|ohne|nichts)\b/i.test(s||'')}
function decimalFromSpeech(s){
  let t=String(s||'').toLowerCase().replace(/komma/g,'.').replace(/,/g,'.').replace(/[^0-9.]/g,'');
  const p=t.split('.');if(p.length>2)t=p.shift()+'.'+p.join('');
  return normalizeLoad(t);
}
async function speakWagonNumber(){
  try{
    const text=await listen('Bitte Wagennummer nennen.');
    const d=transcriptDigits(text).slice(0,12);
    if(d.length!==12)throw new Error('Ich habe keine vollständige zwölfstellige Wagennummer verstanden.');
    const input=$('wagonSearch');input.value=fmtNo(d);input.dispatchEvent(new Event('input',{bubbles:true}));
    await speak('Wagennummer '+fmtNo(d)+' wurde eingetragen.');
  }catch(e){alert(e.message||e)}
}
let voiceRunning=false,voiceCommonDanger=null;
async function assistant(){
  if(voiceRunning)return;voiceRunning=true;
  const b=$('wmVoiceAssistant');if(b){b.disabled=true;b.textContent='🎙️ Assistent läuft …'}
  try{
    do{
      const nrText=await listen('Bitte Wagennummer nennen.');
      const d=transcriptDigits(nrText).slice(0,12);
      if(d.length!==12){await speak('Die Wagennummer war nicht vollständig. Bitte noch einmal.');continue}
      const input=$('wagonSearch');input.value=fmtNo(d);input.dispatchEvent(new Event('input',{bubbles:true}));
      if(typeof valid==='function'&&!valid(d)){await speak('Die Prüfziffer stimmt nicht. Bitte die Wagennummer noch einmal nennen.');continue}
      const before=getTrain().length;
      if(typeof addWagon==='function')addWagon(fmtNo(d));
      await new Promise(r=>setTimeout(r,150));
      if(typeof closeW==='function')closeW();
      const a=getTrain();let idx=a.findIndex(w=>String(w.number||'').replace(/\D/g,'')===d);if(idx<0&&a.length>before)idx=a.length-1;
      if(idx<0){await speak('Der Wagen konnte nicht übernommen werden.');break}
      const loadText=await listen('Wie hoch ist die Ladung in Tonnen?');
      a[idx].load=decimalFromSpeech(loadText);a[idx].total=+(num(a[idx].tare)+num(a[idx].load)).toFixed(2);
      if(voiceCommonDanger){
        a[idx].unNr=voiceCommonDanger.unNr;
        a[idx].ridGef=voiceCommonDanger.ridGef;
        a[idx].gefZettel=voiceCommonDanger.gefZettel;
        await speak('Die gemeinsamen Gefahrdaten werden übernommen.');
      }else{
        let unText=await listen('Welche UN Nummer? Sage keine, wenn keine vorhanden ist.');
        a[idx].unNr=none(unText)?'':transcriptDigits(unText);
        const dd=dangerDefaults(a[idx].unNr);
        a[idx].ridGef=dd?.ridGef||'';
        a[idx].gefZettel=dd?.gefZettel||'3';
        if(dd)await speak('Gefahrdaten werden automatisch übernommen.');
        let allText=await listen('Gelten diese Gefahrdaten für alle Wagen im Zug?');
        if(yes(allText)){
          voiceCommonDanger={unNr:a[idx].unNr,ridGef:a[idx].ridGef,gefZettel:a[idx].gefZettel};
          a.forEach(w=>{w.unNr=voiceCommonDanger.unNr;w.ridGef=voiceCommonDanger.ridGef;w.gefZettel=voiceCommonDanger.gefZettel});
        }
      }
      saveTrain(a);renderQuick();
      await speak('Wagen gespeichert. Gesamtgewicht '+a[idx].total.toFixed(2)+' Tonnen.');
      const more=await listen('Möchtest du einen weiteren Wagen aufnehmen?');
      if(!yes(more))break;
    }while(true);
    await speak('Sprachaufnahme beendet.');
  }catch(e){alert(e.message||e)}
  finally{voiceRunning=false;voiceCommonDanger=null;if(b){b.disabled=false;b.textContent='🗣️ Sprach-Assistent'}}
}
function install(){
  if($('wmQuickEntry')){renderQuick();return}
  const zug=$('zug'), trainList=$('trainList');if(!zug||!trainList)return;
  const current=trainList.closest('.card');
  const box=document.createElement('div');box.className='card';box.id='wmQuickEntry';
  box.innerHTML=`<div class="title">Schnelleingabe Wagenwerte & UN</div>
    <div class="note">Länge über Puffer, Eigengewicht, Ladungsgewicht, Gesamtgewicht, Bremssohle, Bremsgewicht, Festhaltekraft und UN direkt bearbeiten.</div>
    <div class="wmqBulk">
      <label>UN-Nr. für alle<input id="wmqAllUn" inputmode="numeric" placeholder="z. B. 1202"></label>
      <button id="wmqApplyAll" class="btn pri" type="button">Auf alle Wagen</button>
    </div>
    <div class="wmqHint">Ladung und UN unten direkt ändern. Bremsstellung und Bremsabzüge werden automatisch aus Zuggewicht und Zuglänge berechnet.</div>
    <div id="wmQuickRows"></div>`;
  current.parentNode.insertBefore(box,current);
  $('wmqApplyAll').onclick=applyAll;
  box.addEventListener('input',onQuickInput);
  box.addEventListener('change',onQuickChange);
  const addCard=$('wagonSearch')?.closest('.card');
  const actions=addCard?.querySelector('.actions');
  if(actions&&!$('wmSpeakNumber')){
    const one=document.createElement('button');one.id='wmSpeakNumber';one.type='button';one.className='btn sec';one.textContent='🎙️ Wagennummer sprechen';one.onclick=speakWagonNumber;
    const as=document.createElement('button');as.id='wmVoiceAssistant';as.type='button';as.className='btn pri';as.textContent='🗣️ Sprach-Assistent';as.onclick=assistant;
    actions.appendChild(one);actions.appendChild(as);
  }
  const st=document.createElement('style');st.textContent=`
    #wmQuickEntry{border:2px solid #d8e3df}.wmqBulk{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;margin-top:10px}
    .wmqBulk input,.wmqRow input{background:#fffdf3;border:1px solid #c9d0cc;border-radius:8px;padding:9px 8px;font-size:15px}
    .wmqHint{font-size:11px;color:#66736f;margin:10px 0 7px}
    .wmqRow{display:grid;grid-template-columns:1.25fr repeat(8,minmax(100px,1fr));gap:7px;align-items:end;border-top:1px solid #e3e0d8;padding:9px 0;overflow-x:auto}
    .wmqNo span{display:block;font-size:11px;color:#66736f;margin-top:3px}
    .wmqRow label{font-size:10px;color:#66736f}
    @media(max-width:650px){.wmqBulk{grid-template-columns:1fr 1fr}.wmqBulk button{grid-column:1/-1}.wmqRow{grid-template-columns:1fr 1fr}.wmqNo{grid-column:1/-1}}
  `;document.head.appendChild(st);
  renderQuick();
}
setTimeout(install,0);setTimeout(install,600);
window.addEventListener('pageshow',()=>{renderQuick();setTimeout(()=>syncBulkFields(getTrain()),200)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(()=>syncBulkFields(getTrain()),150)});
window.WMQuickVoiceV4={renderQuick,assistant,speakWagonNumber};
})();