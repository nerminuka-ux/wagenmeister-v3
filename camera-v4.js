(()=>{
  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').replace(/\\D/g,'');
  const validUIC=v=>{const d=norm(v);if(d.length!==12)return false;let s=0;for(let i=0;i<11;i++){const x=Number(d[i])*(i%2?1:2);s+=Math.floor(x/10)+x%10;}return(10-s%10)%10===Number(d[11]);};
  const fmt=v=>{const d=norm(v).slice(0,12);return d.length===12?d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4,8)+' '+d.slice(8,11)+'-'+d.slice(11):v};
  const btn=$('cameraBtn'),input=$('cameraInput');if(!btn||!input)return;
  let status=$('cameraStatus');
  if(!status){status=document.createElement('div');status.id='cameraStatus';status.className='status';input.closest('.card')?.appendChild(status);}
  const say=(message,ok=false)=>{status.style.display='block';status.className='status '+(ok?'good':'bad');status.textContent=message;};
  let busy=false;
  function dbNumbers(){const out=new Set();try{if(Array.isArray(window.db))window.db.forEach(w=>{const d=norm(w?.number);if(d.length===12)out.add(d);});}catch{}try{const saved=JSON.parse(localStorage.getItem('wm4s_db')||'[]');if(Array.isArray(saved))saved.forEach(w=>{const d=norm(w?.number);if(d.length===12)out.add(d);});}catch{}return out;}
  function candidatesFrom(text){
    const cleaned=String(text||'').toUpperCase().replace(/[OQ]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2');
    const out=[];
    for(const line of cleaned.split(/[\\r\\n]+/)){const d=norm(line);if(d.length>=12&&d.length<=32)for(let i=0;i<=d.length-12;i++)out.push(d.slice(i,i+12));}
    for(const m of cleaned.matchAll(/[0-9][0-9\\s.\\-\\/]{8,50}[0-9]/g)){const d=norm(m[0]);for(let i=0;i<=d.length-12;i++)out.push(d.slice(i,i+12));}
    return [...new Set(out.filter(x=>x.length===12))];
  }
  function hamming(a,b){if(a.length!==b.length)return 99;let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n;}
  function fuzzyKnown(cands,known){let best=null;for(const c of cands)for(const k of known){const d=hamming(c,k);if(d<=1&&(!best||d<best.d))best={n:k,d};}return best?.n||null;}
  async function loadImage(file){
    if(typeof createImageBitmap==='function'){try{return await createImageBitmap(file);}catch(e){}}
    const url=URL.createObjectURL(file);
    try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Das Fotoformat konnte nicht geöffnet werden.'));img.src=url;});}
    finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
  function renderVariant(src,sx,sy,sw,sh,targetW,mode){
    const scale=targetW/sw,targetH=Math.max(1,Math.round(sh*scale)),c=document.createElement('canvas');c.width=targetW;c.height=targetH;
    const x=c.getContext('2d',{willReadFrequently:true});if(!x)throw new Error('Bildverarbeitung wird von diesem Browser nicht unterstützt.');
    x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(src,sx,sy,sw,sh,0,0,targetW,targetH);
    const img=x.getImageData(0,0,c.width,c.height),d=img.data;
    for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];let v;if(mode==='hard')v=g>170?255:0;else if(mode==='invert')v=g>170?0:255;else v=Math.max(0,Math.min(255,(g-95)*2.2));d[i]=d[i+1]=d[i+2]=v;}
    x.putImageData(img,0,0);return c;
  }
  async function makeVariants(file){
    const bmp=await loadImage(file),w=bmp.width,h=bmp.height;
    if(!w||!h)throw new Error('Das Foto hat keine lesbare Bildgröße.');
    const crops=[[Math.round(w*.10),Math.round(h*.18),Math.round(w*.80),Math.round(h*.55)],[Math.round(w*.15),Math.round(h*.28),Math.round(w*.70),Math.round(h*.35)],[0,0,w,h]];
    const fast=[renderVariant(bmp,...crops[1],2000,'contrast'),renderVariant(bmp,...crops[0],2000,'contrast')];
    const fallback=[];for(const crop of crops)for(const mode of ['contrast','hard','invert'])fallback.push(renderVariant(bmp,...crop,2200,mode));
    try{bmp.close?.();}catch{}return{fast,fallback};
  }
  function fill(number){const field=$('wagonSearch');if(!field)throw new Error('Eingabefeld für Wagennummer nicht gefunden.');field.value=fmt(number);field.dispatchEvent(new Event('input',{bubbles:true}));field.focus();}
  async function loadTesseract(){
    if(window.Tesseract?.recognize)return;
    const urls=['https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','https://unpkg.com/tesseract.js@5/dist/tesseract.min.js'];
    for(const url of urls){try{await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.async=true;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('OCR-Bibliothek konnte nicht geladen werden.'));};document.head.appendChild(s);});if(window.Tesseract?.recognize)return;}catch(e){}}
    throw new Error('OCR-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen und erneut versuchen.');
  }
  async function runOCR(canvas,label,psm='6'){status.textContent=label;const r=await window.Tesseract.recognize(canvas,'eng',{tessedit_char_whitelist:'0123456789OQILSBZ -',tessedit_pageseg_mode:String(psm)});return candidatesFrom(r?.data?.text||'');}
  btn.addEventListener('click',()=>{if(busy)return;input.click();});
  input.addEventListener('change',async()=>{
    const file=input.files?.[0];if(!file)return;
    if(busy)return;busy=true;btn.disabled=true;btn.textContent='📷 Erkennung läuft …';say('Foto wird vorbereitet …');
    try{
      if(!file.type.startsWith('image/'))throw new Error('Die ausgewählte Datei ist kein Bild.');
      await loadTesseract();
      const known=dbNumbers(),{fast,fallback}=await makeVariants(file),counts=new Map();
      const check=got=>{
        for(const c of got)counts.set(c,(counts.get(c)||0)+1);
        const direct=[...counts.keys()].find(c=>validUIC(c)&&known.has(c));
        if(direct){fill(direct);say('✓ Erkannt und in der Datenbank gefunden: '+fmt(direct),true);return true;}
        const fuzzy=fuzzyKnown(got,known);
        if(fuzzy){fill(fuzzy);say('✓ Erkannt und mit der Datenbank abgeglichen: '+fmt(fuzzy),true);return true;}
        return false;
      };
      let pass=0;
      for(const v of fast){pass++;for(const psm of [6,7]){const got=await runOCR(v,'Schnelle Erkennung '+pass+'/'+fast.length+' …',psm);if(check(got))return;}}
      for(let i=0;i<fallback.length;i++){for(const psm of [6,11,7]){const got=await runOCR(fallback[i],'Feinsuche '+(i+1)+'/'+fallback.length+' …',psm);if(check(got))return;}}
      const ranked=[...counts].map(([n,c])=>({n,c,valid:validUIC(n),known:known.has(n)})).sort((a,b)=>(Number(b.known)-Number(a.known))||(Number(b.valid)-Number(a.valid))||(b.c-a.c));
      const best=ranked.find(x=>x.valid);
      if(best){fill(best.n);say('Nummer erkannt, aber bitte vor dem Übernehmen kontrollieren: '+fmt(best.n));}
      else say('Keine sichere Wagennummer erkannt. Bitte die 12-stellige UIC-Nummer möglichst nah, scharf und gerade fotografieren.');
    }catch(err){console.error('Wagenmeister Kamera/OCR:',err);say(err?.message||'Erkennung fehlgeschlagen. Bitte erneut versuchen.');}
    finally{input.value='';busy=false;btn.disabled=false;btn.textContent='📷 Wagennummer fotografieren';}
  });
})();