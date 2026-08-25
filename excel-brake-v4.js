(()=>{
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const n=v=>Number(String(v??'').replace(',','.'))||0;
function rows(){try{return (typeof train!=='undefined'&&Array.isArray(train))?train:JSON.parse(localStorage.getItem('wm4s_train')||'[]')}catch{return[]}}
function form(){try{return {trainNo:document.getElementById('trainNo')?.value||'',date:document.getElementById('date')?.value||''}}catch{return{}}}
function dateDE(v){if(!v)return'';const p=v.split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:v}
function sum(a,k){return a.reduce((s,w)=>s+n(w?.[k]),0)}
function activeMode(w){return String(w?.brakeMode||'P').toUpperCase()==='G'?'G':'P'}
function brakeWeight(a){let p=0,g=0;a.forEach(w=>{if(activeMode(w)==='G')g+=n(w.brakeG);else p+=n(w.brakeP)});return Math.floor(p)+(g*.75)}
function render(){
 const host=document.getElementById('wmxHost');const tab=document.querySelector('.wmxTab.active');
 if(!host||tab?.dataset.tab!=='brems')return;
 const a=rows(),f=form(),tot=a.reduce((s,w)=>s+n(w.tare)+n(w.load),0),bw=brakeWeight(a),ax=sum(a,'axles'),len=sum(a,'length');
 const bh=tot?Math.floor((bw/tot)*100):0;
 const last=a.at(-1)?.number||'';
 const kCount=a.filter(w=>['K','L','LL'].includes(String(w.brakeShoe||'').toUpperCase())).length;
 const dCount=a.filter(w=>String(w.brakeShoe||'').toUpperCase()==='D').length;
 const mat=a.filter(w=>String(w.remarks||'').toLowerCase().includes('matrossow')).length;
 const eff=sum(a,'effectiveBrakes');
 host.innerHTML=`<div class="wmxSheet"><div class="wmxHead"><b>Bremszettel</b><span>Originalzeilen in der App</span></div>
 <div class="wmxBrakeMeta"><b>Zug:</b> ${esc(f.trainNo)} <span><b>Datum:</b> ${esc(dateDE(f.date))}</span></div>
 <div class="wmxBrakeScroll"><table class="wmxBrakeTable"><thead><tr><th>Zeile</th><th>Bezeichnung</th><th>Wert</th></tr></thead><tbody>
 <tr><td>1</td><td>Gewicht (t)</td><td>${tot.toFixed(2)}</td></tr>
 <tr><td>2</td><td>Bremsgewicht (t)</td><td>${Math.floor(bw)}</td></tr>
 <tr><td>3</td><td>Zahl der Achsen</td><td>${ax}</td></tr>
 <tr><td>4</td><td>Mindestbremshundertstel</td><td><input id="wmxMinBrake" class="wmxInline" inputmode="numeric" placeholder="eingeben"></td></tr>
 <tr><td>5</td><td>Vorhandene Bremshundertstel</td><td>${bh}</td></tr>
 <tr><td>6</td><td>Fehlende Bremshundertstel</td><td id="wmxMissingBrake">0</td></tr>
 <tr><td>7</td><td>Nummer des letzten Fahrzeugs</td><td>${esc(last)}</td></tr>
 <tr><td>8</td><td>Zahl der einlösigen Bremsen</td><td>0</td></tr>
 <tr><td>9</td><td>Zahl der mehrlösigen Bremsen</td><td>${a.length}</td></tr>
 <tr><td>10</td><td>Zahl der Bremsen mit D-Sohle</td><td>${dCount}</td></tr>
 <tr><td>11</td><td>Zahl der Bremsen mit K/L/LL-Sohle</td><td>${kCount}</td></tr>
 <tr><td>12</td><td>Zahl der Matrossow-Bremsen</td><td>${mat}</td></tr>
 <tr><td>13</td><td>Länge (m)</td><td>${len.toFixed(2)}</td></tr>
 <tr><td>14</td><td>Zahl der gebremsten Achsen</td><td>${eff||ax}</td></tr>
 <tr><td>15</td><td>Zahl der erforderlichen gebremsten Achsen</td><td>${ax}</td></tr>
 <tr><td>16</td><td>Fahrzeuge mit niedrigerer zulässiger Geschwindigkeit</td><td>${a.filter(w=>n(w.vmax)>0&&n(w.vmax)<100).map(w=>esc(w.number)).join(', ')||'—'}</td></tr>
 </tbody></table></div></div>`;
 const inp=document.getElementById('wmxMinBrake');if(inp)inp.addEventListener('input',()=>{const x=n(inp.value),m=document.getElementById('wmxMissingBrake');if(m)m.textContent=String(Math.max(0,x-bh));localStorage.setItem('wm4s_minBrakePercent',String(x))});
 const saved=localStorage.getItem('wm4s_minBrakePercent');if(inp&&saved){inp.value=saved;inp.dispatchEvent(new Event('input'))}
 if(!document.getElementById('wmxBrakeStyle')){const s=document.createElement('style');s.id='wmxBrakeStyle';s.textContent='.wmxBrakeMeta{display:flex;justify-content:space-between;gap:12px;padding:8px;background:#f1f2ee;border-radius:8px;margin-bottom:8px;font-size:12px}.wmxBrakeScroll{overflow:auto}.wmxBrakeTable{width:100%;min-width:560px;border-collapse:collapse;font-size:12px}.wmxBrakeTable th,.wmxBrakeTable td{border:1px solid #aaa;padding:7px;text-align:left}.wmxBrakeTable th:first-child,.wmxBrakeTable td:first-child{width:52px;text-align:center}.wmxBrakeTable td:last-child{font-weight:800;width:170px}.wmxInline{width:100%;min-width:100px;background:#fffbe9!important;border:0!important;border-bottom:1px solid #aaa!important;font-size:14px!important;padding:3px!important}';document.head.appendChild(s)}
}
document.addEventListener('click',e=>{const b=e.target.closest('.wmxTab');if(b?.dataset.tab==='brems')setTimeout(render,0)},true);
window.addEventListener('pageshow',()=>setTimeout(render,50));
})();