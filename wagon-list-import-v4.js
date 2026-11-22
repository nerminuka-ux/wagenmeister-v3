(()=> {
'use strict';
const $=id=>document.getElementById(id), norm=v=>String(v||'').replace(/\D/g,'');
const fmt=v=>{const d=norm(v).slice(0,12);return d.length===12?d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4,8)+' '+d.slice(8,11)+'-'+d.slice(11):d;};
const host=$('zug');if(!host||$('manifestImportCard'))return;
const card=document.createElement('div');card.id='manifestImportCard';card.className='card';
card.innerHTML='<div class="title">Teil-Wagenliste importieren</div><div class="note">Foto oder PDF auswählen. Wagennummern und Gewichte werden erkannt und vor dem Import zur Kontrolle angezeigt.</div><div class="actions"><input id="manifestFile" type="file" accept="image/*,.pdf,application/pdf" style="max-width:100%"><button id="manifestRead" class="btn sec" type="button">📄 Wagenliste auslesen</button></div><div id="manifestStatus" class="status"></div><div id="manifestPreview" style="overflow:auto;margin-top:8px"></div><div class="actions"><button id="manifestImport" class="btn pri" type="button" disabled>Wagen in den Zug übernehmen</button></div>';
const trainCard=host.querySelector('#trainList')?.closest('.card');if(trainCard)host.insertBefore(card,trainCard);else host.appendChild(card);
function showManifestWeights(){const list=$('trainList');if(!list)return;[...list.children].forEach((row,i)=>{const w=train[i],meta=row.querySelector('.meta');if(!w||!meta||meta.dataset.manifestShown)return;const parts=[];if(w.manifestLoadKg)parts.push('Ladung '+Number(w.manifestLoadKg).toLocaleString('de-DE')+' kg');if(w.manifestTareKg)parts.push('Tara '+Number(w.manifestTareKg).toLocaleString('de-DE')+' kg');if(w.manifestGrossKg)parts.push('Brutto '+Number(w.manifestGrossKg).toLocaleString('de-DE')+' kg');if(parts.length){meta.textContent+=(meta.textContent?' · ':'')+parts.join(' · ');meta.dataset.manifestShown='1';}});}
const trainObserver=new MutationObserver(showManifestWeights);trainObserver.observe($('trainList'),{childList:true,subtree:true});
const status=$('manifestStatus'),preview=$('manifestPreview'),importBtn=$('manifestImport');let parsed=[];
const say=(s,ok=false)=>{status.style.display='block';status.className='status '+(ok?'good':'bad');status.textContent=s;};
async function loadScript(url,ready){if(ready())return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.async=true;s.onload=()=>ready()?resolve():reject(new Error('Bibliothek konnte nicht gestartet werden.'));s.onerror=()=>reject(new Error('Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen.'));document.head.appendChild(s);});}
async function canvasesFrom(file){
 if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',()=>!!window.pdfjsLib);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise,out=[];
  for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),vp=page.getViewport({scale:2}),c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;out.push(c);}return out;
 }
 const url=URL.createObjectURL(file);try{const img=await new Promise((res,rej)=>{const el=new Image();el.onload=()=>res(el);el.onerror=()=>rej(new Error('Bild konnte nicht geöffnet werden.'));el.src=url;});const scale=Math.min(1,2800/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return[c];}finally{URL.revokeObjectURL(url);}
}
function rowsFrom(result,canvas){
 const words=result?.data?.words||[],lines=result?.data?.lines||[],found=[];
 // Wagennummern stehen links in der Wagen-Spalte. Die drei Massen werden
 // ausschließlich aus ihren festen Spalten rechts gelesen.
 for(const line of lines){
  const t=line.text||'';
  for(const m of t.matchAll(/(?:\d[\s-]*){12}/g)){
   const d=norm(m[0]);
   if(d.length===12)found.push({number:d,y:((line.bbox?.y0||0)+(line.bbox?.y1||0))/2});
  }
 }
 if(!found.length){
  for(const w of words){
   const x=((w.bbox?.x0||0)+(w.bbox?.x1||0))/2;
   const d=norm(w.text);
   if(x<canvas.width*.27&&d.length===12)found.push({number:d,y:((w.bbox?.y0||0)+(w.bbox?.y1||0))/2});
  }
 }
 const unique=[],seen=new Set();
 found.sort((a,b)=>a.y-b.y).forEach(x=>{if(!seen.has(x.number)){seen.add(x.number);unique.push(x);}});
 const zones=[
  {key:'loadKg',min:.735,max:.810},
  {key:'tareKg',min:.810,max:.880},
  {key:'grossKg',min:.880,max:.960}
 ];
 const rowTol=Math.max(7,canvas.height*.006);
 return unique.map(row=>{
  const out={number:row.number,loadKg:0,tareKg:0,grossKg:0};
  for(const z of zones){
   const candidates=words.map(w=>{
    const x0=w.bbox?.x0??0,x1=w.bbox?.x1??0,y0=w.bbox?.y0??0,y1=w.bbox?.y1??0;
    const x=(x0+x1)/2,y=(y0+y1)/2,d=norm(w.text);
    return{x,y,d};
   }).filter(w=>w.x>=canvas.width*z.min&&w.x<canvas.width*z.max&&Math.abs(w.y-row.y)<=rowTol&&/^\d{5,6}$/.test(w.d));
   candidates.sort((a,b)=>Math.abs(a.y-row.y)-Math.abs(b.y-row.y));
   if(candidates.length)out[z.key]=Number(candidates[0].d);
  }
  return out;
 });
}
function validUIC(n){
 if(!/^\d{12}$/.test(n))return false;
 let sum=0;for(let i=0;i<11;i++){let v=Number(n[i])*(i%2===0?2:1);sum+=Math.floor(v/10)+(v%10);}
 return (10-sum%10)%10===Number(n[11]);
}
function showRows(rows){
 parsed=rows;importBtn.disabled=!rows.length;importBtn.textContent=rows.length+' Wagen in den Zug übernehmen';if(!rows.length){preview.innerHTML='';return;}
 const cell=(v,i,k)=>'<td><input inputmode="numeric" data-row="'+i+'" data-key="'+k+'" value="'+(v||'')+'" placeholder="—" style="width:100%;min-width:65px;box-sizing:border-box;padding:5px;border:1px solid #bbb;border-radius:5px"></td>';
 preview.innerHTML='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th>Nr.</th><th>Wagennummer</th><th>Ladung kg</th><th>Tara kg</th><th>Brutto kg</th><th>Prüfung</th></tr></thead><tbody>'+rows.map((w,i)=>'<tr><td>'+(i+1)+'</td>'+cell(w.number,i,'number')+cell(w.loadKg,i,'loadKg')+cell(w.tareKg,i,'tareKg')+cell(w.grossKg,i,'grossKg')+'<td data-check="'+i+'">'+(validUIC(w.number)?'✓':'Prüfen')+'</td></tr>').join('')+'</tbody></table></div><div class="note">Alle Felder sind vor dem Import korrigierbar. Wagennummern mit ungültiger Prüfziffer bitte kontrollieren.</div>';
}
preview.addEventListener('change',e=>{
 const el=e.target.closest('input[data-row][data-key]');if(!el)return;
 const i=Number(el.dataset.row),k=el.dataset.key;if(!parsed[i])return;
 const value=norm(el.value);
 if(k==='number'){if(value.length!==12){say('Wagennummer muss 12 Ziffern haben.');return;}parsed[i].number=value;const check=preview.querySelector('[data-check="'+i+'"]');if(check)check.textContent=validUIC(value)?'✓':'Prüfen';}
 else parsed[i][k]=value?Number(value):0;
});

$('manifestRead').addEventListener('click',async()=>{const file=$('manifestFile').files?.[0];if(!file){say('Bitte zuerst ein Foto oder PDF auswählen.');return;}showRows([]);say('Datei wird vorbereitet …');try{
 await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',()=>!!window.Tesseract?.recognize);
 const pages=await canvasesFrom(file);let all=[];for(let i=0;i<pages.length;i++){say('Seite '+(i+1)+' von '+pages.length+' wird gelesen …');const r=await window.Tesseract.recognize(pages[i],'eng',{tessedit_char_whitelist:'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -',tessedit_pageseg_mode:'6'});all=all.concat(rowsFrom(r,pages[i]));}
 const seen=new Set();all=all.filter(w=>!seen.has(w.number)&&seen.add(w.number));showRows(all);say(all.length+' Wagen erkannt. Bitte Vorschau prüfen.',all.length>0);
 }catch(e){console.error('Teil-Wagenliste:',e);say(e?.message||'Die Wagenliste konnte nicht gelesen werden.');}});
importBtn.addEventListener('click',()=>{if(!parsed.length){say('Keine erkannten Wagen zum Übernehmen vorhanden.');return;}try{let added=0,updated=0,skipped=0;for(const w of parsed){if(w.number.length!==12){skipped++;continue;}
 const load=w.loadKg?+(w.loadKg/1000).toFixed(3):'',tare=w.tareKg?+(w.tareKg/1000).toFixed(3):'',total=w.grossKg?+(w.grossKg/1000).toFixed(3):(load!==''&&tare!==''?+(Number(load)+Number(tare)).toFixed(3):'');
 const existing=train.find(x=>norm(x.number)===w.number);
 const fields={number:fmt(w.number),type:'Kesselwagen',state:'beladen',unNr:'1202',gefZettel:'3',remarks:'Teil-Wagenliste importiert'};
 if(load!==''){fields.load=load;fields.manifestLoadKg=w.loadKg;}
 if(tare!==''){fields.tare=tare;fields.manifestTareKg=w.tareKg;}
 if(total!==''){fields.total=total;fields.manifestGrossKg=w.grossKg||'';}
 if(existing){Object.assign(existing,fields);updated++;}
 else{train.push({...fields,axles:'',length:'',load,tare,total,manifestLoadKg:w.loadKg||'',manifestTareKg:w.tareKg||'',manifestGrossKg:w.grossKg||'',brakeShoe:'',brakeP:'',brakeG:'',handBrake:'',effectiveBrakes:'',ridGef:'',vmax:'',routeClass:''});added++;}
 }
 persist();render();say(added+' neue Wagen hinzugefügt, '+updated+' vorhandene Wagen aktualisiert'+(skipped?', '+skipped+' ungültige Zeilen übersprungen.':'.'),true);parsed=[];importBtn.disabled=true;preview.innerHTML='';importBtn.textContent='Wagen in den Zug übernehmen';
 }catch(e){console.error('Import in Zug fehlgeschlagen:',e);say('Übernahme fehlgeschlagen: '+(e?.message||'Unbekannter Fehler'));}});
})();