(()=> {
'use strict';
const $=id=>document.getElementById(id);
const norm=v=>String(v||'').replace(/\\D/g,'');
const validUIC=v=>{const d=norm(v);if(d.length!==12)return false;let s=0;for(let i=0;i<11;i++){const x=Number(d[i])*(i%2?1:2);s+=Math.floor(x/10)+x%10;}return(10-s%10)%10===Number(d[11]);};
const fmt=v=>{const d=norm(v).slice(0,12);if(d.length!==12)return d;return d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4,8)+' '+d.slice(8,11)+'-'+d.slice(11);};
const input=$('cameraInput');
if(!input)return;
let status=$('cameraStatus');
if(!status){status=document.createElement('div');status.id='cameraStatus';status.className='status';input.closest('.card')?.appendChild(status);}
const say=(message,ok=false)=>{status.style.display='block';status.className='status '+(ok?'good':'bad');status.textContent=message;};
let busy=false;
function knownNumbers(){
 const out=new Set();
 try{if(typeof db!=='undefined'&&Array.isArray(db))db.forEach(w=>{const d=norm(w?.number);if(d.length===12)out.add(d);});}catch{}
 try{const a=JSON.parse(localStorage.getItem('wm4s_db')||'[]');if(Array.isArray(a))a.forEach(w=>{const d=norm(w?.number);if(d.length===12)out.add(d);});}catch{}
 return out;
}
function extractCandidates(text){
 const cleaned=String(text||'').toUpperCase().replace(/[OQ]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2');
 const out=[];
 for(const part of cleaned.split(/[\\r\\n]+/)){const d=norm(part);for(let i=0;i<=d.length-12;i++)out.push(d.slice(i,i+12));}
 for(const m of cleaned.matchAll(/[0-9][0-9\\s.\\-/]{8,50}[0-9]/g)){const d=norm(m[0]);for(let i=0;i<=d.length-12;i++)out.push(d.slice(i,i+12));}
 return [...new Set(out)];
}
function fill(number){
 const field=$('wagonSearch');if(!field)throw new Error('Wagennummer-Eingabefeld fehlt.');
 field.value=fmt(number);field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();
}
async function loadOCR(){
 if(window.Tesseract?.recognize)return;
 await new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';script.async=true;
  script.onload=()=>window.Tesseract?.recognize?resolve():reject(new Error('Texterkennung konnte nicht gestartet werden.'));
  script.onerror=()=>reject(new Error('Texterkennung konnte nicht geladen werden. Bitte Internetverbindung prüfen.'));
  document.head.appendChild(script);
 });
}
async function imageCanvas(file){
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error('Das Foto konnte nicht geöffnet werden.'));el.src=url;});
  const scale=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Bildverarbeitung wird nicht unterstützt.');
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
  for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];const v=Math.max(0,Math.min(255,(g-105)*1.9));d[i]=d[i+1]=d[i+2]=v;}
  ctx.putImageData(pixels,0,0);return canvas;
 }finally{URL.revokeObjectURL(url);}
}
input.onchange=async()=>{
 const file=input.files?.[0];if(!file)return;
 if(busy)return;
 busy=true;
 say('Foto erhalten – Texterkennung wird vorbereitet …');
 try{
  if(!file.type.startsWith('image/'))throw new Error('Die ausgewählte Datei ist kein Bild.');
  await loadOCR();
  say('Foto wird gelesen – bitte kurz warten …');
  const canvas=await imageCanvas(file);
  const result=await window.Tesseract.recognize(canvas,'eng',{tessedit_char_whitelist:'0123456789OQILSBZ -',tessedit_pageseg_mode:'11'});
  const candidates=extractCandidates(result?.data?.text||'');
  const known=knownNumbers();
  const match=candidates.find(n=>validUIC(n)&&known.has(n))||candidates.find(validUIC);
  if(match){fill(match);say((known.has(match)?'✓ Wagennummer erkannt: ':'Nummer erkannt – bitte prüfen: ')+fmt(match),true);}
  else say('Keine Wagennummer erkannt. Bitte die Nummer möglichst nah, scharf und gerade fotografieren.');
 }catch(error){console.error('Kamera/OCR:',error);say(error?.message||'Foto konnte nicht verarbeitet werden. Bitte erneut versuchen.');}
 finally{input.value='';busy=false;}
};
})();