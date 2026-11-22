(()=> {
'use strict';
const $=id=>document.getElementById(id);
const norm=v=>String(v||'').replace(/\D/g,'');
const validUIC=v=>{const d=norm(v);if(d.length!==12)return false;let s=0;for(let i=0;i<11;i++){const x=Number(d[i])*(i%2?1:2);s+=Math.floor(x/10)+x%10;}return(10-s%10)%10===Number(d[11]);};
const fmt=v=>{const d=norm(v).slice(0,12);if(d.length!==12)return d;return d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4,8)+' '+d.slice(8,11)+'-'+d.slice(11);};
const input=$('cameraInput');if(!input)return;
let status=$('cameraStatus');
if(!status){status=document.createElement('div');status.id='cameraStatus';status.className='status';input.closest('.card')?.appendChild(status);}
const say=(message,ok=false)=>{status.style.display='block';status.className='status '+(ok?'good':'bad');status.textContent=message;};
let busy=false;
function knownNumbers(){const out=new Set();try{if(typeof db!=='undefined'&&Array.isArray(db))db.forEach(w=>{const d=norm(w?.number);if(d.length===12)out.add(d);});}catch{}try{const a=JSON.parse(localStorage.getItem('wm4s_db')||'[]');if(Array.isArray(a))a.forEach(w=>{const d=norm(w?.number);if(d.length===12)out.add(d);});}catch{}return out;}
function candidatesFrom(text){
 const t=String(text||'').toUpperCase().replace(/[OQ]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2');
 const out=new Set();
 for(const line of t.split(/[\r\n]+/)){
  const chunks=line.match(/[0-9OQIL|SBZ][0-9OQIL|SBZ\s.\-/]{8,40}[0-9OQIL|SBZ]/g)||[];
  for(const chunk of chunks){const d=norm(chunk);for(let i=0;i<=d.length-12;i++)out.add(d.slice(i,i+12));}
 }
 return [...out];
}
function fill(number){const field=$('wagonSearch');if(!field)throw new Error('Wagennummer-Eingabefeld fehlt.');field.value=fmt(number);field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();}
async function loadOCR(){if(window.Tesseract?.recognize)return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.async=true;s.onload=()=>window.Tesseract?.recognize?resolve():reject(new Error('Texterkennung konnte nicht gestartet werden.'));s.onerror=()=>reject(new Error('Texterkennung konnte nicht geladen werden. Internetverbindung prüfen.'));document.head.appendChild(s);});}
async function loadImage(file){const url=URL.createObjectURL(file);try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Foto konnte nicht geöffnet werden.'));img.src=url;});}finally{URL.revokeObjectURL(url);}}
function makeVariants(img){
 const scale=Math.min(1.5,3200/Math.max(img.naturalWidth,img.naturalHeight));
 const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
 const base=document.createElement('canvas');base.width=w;base.height=h;
 const ctx=base.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Bildverarbeitung nicht verfügbar.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
 const src=ctx.getImageData(0,0,w,h),gray=new Uint8ClampedArray(w*h);
 for(let i=0,p=0;i<src.data.length;i+=4,p++)gray[p]=.299*src.data[i]+.587*src.data[i+1]+.114*src.data[i+2];
 const enhanced=document.createElement('canvas');enhanced.width=w;enhanced.height=h;const ec=enhanced.getContext('2d');const out=ec.createImageData(w,h);
 for(let p=0;p<gray.length;p++){const v=Math.max(0,Math.min(255,(gray[p]-115)*2.0+128)),i=p*4;out.data[i]=out.data[i+1]=out.data[i+2]=v;out.data[i+3]=255;}ec.putImageData(out,0,0);
 const threshold=document.createElement('canvas');threshold.width=w;threshold.height=h;const tc=threshold.getContext('2d');const ti=tc.createImageData(w,h);
 for(let p=0;p<gray.length;p++){const v=gray[p]>155?255:0,i=p*4;ti.data[i]=ti.data[i+1]=ti.data[i+2]=v;ti.data[i+3]=255;}tc.putImageData(ti,0,0);
 return [base,enhanced,threshold];
}
async function recognize(canvas,psm){const r=await window.Tesseract.recognize(canvas,'eng',{tessedit_char_whitelist:'0123456789OQILSBZ',tessedit_pageseg_mode:String(psm),preserve_interword_spaces:'1'});return r?.data?.text||'';}
input.addEventListener('change',async()=>{
 const file=input.files?.[0];if(!file||busy)return;busy=true;say('Foto erhalten – Bild wird vorbereitet …');
 try{
  if(!file.type.startsWith('image/'))throw new Error('Bitte ein Foto auswählen.');
  await loadOCR();const img=await loadImage(file);const variants=makeVariants(img);let texts=[];
  for(let i=0;i<variants.length;i++){say('Texterkennung läuft ('+(i+1)+'/3) …');texts.push(await recognize(variants[i],i===0?11:6));}
  const all=new Set(texts.flatMap(candidatesFrom)),valid=[...all].filter(validUIC),known=knownNumbers();
  const match=valid.find(n=>known.has(n))||valid[0];
  if(match){fill(match);say((known.has(match)?'✓ Wagennummer aus Datenbank erkannt: ':'Nummer erkannt – bitte mit dem Wagen vergleichen: ')+fmt(match),true);}
  else say('Keine gültige 12-stellige Wagennummer erkannt. Bitte näher herangehen, Nummer gerade ausrichten und Spiegelungen vermeiden.');
 }catch(e){console.error('Kamera/OCR:',e);say(e?.message||'Foto konnte nicht verarbeitet werden.');}
 finally{input.value='';busy=false;}
});
})();