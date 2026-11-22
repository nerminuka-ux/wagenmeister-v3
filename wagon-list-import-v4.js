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
  {key:'loadKg',min:.745,max:.845},
  {key:'tareKg',min:.845,max:.915},
  {key:'grossKg',min:.915,max:.985}
 ];
 const rowTol=Math.max(13,canvas.height*.012);
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
function showRows(rows){parsed=rows;importBtn.disabled=!rows.length;importBtn.textContent=rows.length+' Wagen in den Zug übernehmen';if(!rows.length){preview.innerHTML='';return;}
 preview.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th>Nr.</th><th>Wagennummer</th><th>Ladung kg</th><th>Tara kg</th><th>Brutto kg</th></tr></thead><tbody>'+rows.map((w,i)=>'<tr><td>'+(i+1)+'</td><td>'+fmt(w.number)+'</td><td>'+(w.loadKg||'—')+'</td><td>'+(w.tareKg||'—')+'</td><td>'+(w.grossKg||'—')+'</td></tr>').join('')+'</tbody></table><div class="note">Bitte Vorschau kontrollieren. Nicht erkannte Werte bleiben leer.</div>';
}
$('manifestRead').addEventListener('click',async()=>{const file=$('manifestFile').files?.[0];if(!file){say('Bitte zuerst ein Foto oder PDF auswählen.');return;}showRows([]);say('Datei wird vorbereitet …');try{
 await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',()=>!!window.Tesseract?.recognize);
 const pages=await canvasesFrom(file);let all=[];for(let i=0;i<pages.length;i++){say('Seite '+(i+1)+' von '+pages.length+' wird gelesen …');const r=await window.Tesseract.recognize(pages[i],'eng',{tessedit_char_whitelist:'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz -',tessedit_pageseg_mode:'6'});all=all.concat(rowsFrom(r,pages[i]));}
 const seen=new Set();all=all.filter(w=>!seen.has(w.number)&&seen.add(w.number));showRows(all);say(all.length+' Wagen erkannt. Bitte Vorschau prüfen.',all.length>0);
 }catch(e){console.error('Teil-Wagenliste:',e);say(e?.message||'Die Wagenliste konnte nicht gelesen werden.');}});
importBtn.addEventListener('click',()=>{if(!parsed.length)return;let added=0,skipped=0;for(const w of parsed){if(w.number.length!==12||train.some(x=>norm(x.number)===w.number)){skipped++;continue;}
 const load=w.loadKg?+(w.loadKg/1000).toFixed(3):'',tare=w.tareKg?+(w.tareKg/1000).toFixed(3):'',total=w.grossKg?+(w.grossKg/1000).toFixed(3):(load!==''&&tare!==''?+(Number(load)+Number(tare)).toFixed(3):'');
 train.push({number:fmt(w.number),type:'Kesselwagen',axles:'',length:'',tare,load,total,manifestLoadKg:w.loadKg||'',manifestTareKg:w.tareKg||'',manifestGrossKg:w.grossKg||'',state:'beladen',brakeShoe:'',brakeP:'',brakeG:'',handBrake:'',effectiveBrakes:'',ridGef:'',unNr:'1202',gefZettel:'3',vmax:'',routeClass:'',remarks:'Teil-Wagenliste importiert'});added++;}
 persist();render();say(added+' Wagen übernommen'+(skipped?', '+skipped+' übersprungen (Duplikat oder ungültig).':''),true);parsed=[];importBtn.disabled=true;preview.innerHTML='';});
})();