(()=>{
  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').replace(/\D/g,'');
  const validUIC=v=>{const d=norm(v);if(d.length!==12)return false;let s=0;for(let i=0;i<11;i++){const x=Number(d[i])*(i%2?1:2);s+=Math.floor(x/10)+x%10;}return(10-s%10)%10===Number(d[11]);};
  const fmt=v=>{const d=norm(v).slice(0,12);return d.length===12?d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4,8)+' '+d.slice(8,11)+'-'+d.slice(11):v};
  const btn=$('cameraBtn'),input=$('cameraInput');if(!btn||!input)return;
  let status=$('cameraStatus');if(!status){status=document.createElement('div');status.id='cameraStatus';status.className='status';input.closest('.card').appendChild(status);}
  const say=(text,ok=false)=>{status.style.display='block';status.className='status '+(ok?'good':'bad');status.textContent=text;};

  function dbNumbers(){const out=new Set();try{if(typeof db!=='undefined'&&Array.isArray(db))db.forEach(w=>{const d=norm(w?.number);if(d.length===12)out.add(d);});}catch{}try{const saved=JSON.parse(localStorage.getItem('wm4s_db')||'[]');saved.forEach(w=>{const d=norm(w?.number);if(d.length===12)out.add(d);});}catch{}return out;}
  function candidatesFrom(text){
    const cleaned=String(text||'').toUpperCase().replace(/[OQ]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2');
    const out=[];
    for(const line of cleaned.split(/\n+/)){
      const d=norm(line);
      if(d.length>=12&&d.length<=24)for(let i=0;i<=d.length-12;i++)out.push(d.slice(i,i+12));
    }
    for(const m of cleaned.matchAll(/[0-9][0-9\s.\-\/]{8,40}[0-9]/g)){
      const d=norm(m[0]);for(let i=0;i<=d.length-12;i++)out.push(d.slice(i,i+12));
    }
    return [...new Set(out.filter(x=>x.length===12))];
  }
  function hamming(a,b){if(a.length!==b.length)return 99;let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n}
  function fuzzyKnown(cands,known){
    let best=null;
    for(const c of cands)for(const k of known){const d=hamming(c,k);if(d<=1&&(!best||d<best.d))best={n:k,d};}
    return best?.n||null;
  }
  function renderVariant(src,sx,sy,sw,sh,targetW,mode){const scale=targetW/sw,targetH=Math.max(1,Math.round(sh*scale));const c=document.createElement('canvas');c.width=targetW;c.height=targetH;const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(src,sx,sy,sw,sh,0,0,targetW,targetH);const img=x.getImageData(0,0,c.width,c.height),d=img.data;for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];let v;if(mode==='hard')v=g>170?255:0;else if(mode==='invert')v=g>170?0:255;else v=Math.max(0,Math.min(255,(g-95)*2.2));d[i]=d[i+1]=d[i+2]=v;}x.putImageData(img,0,0);return c;}
  async function makeVariants(file){
    const bmp=await createImageBitmap(file),w=bmp.width,h=bmp.height;
    const crops=[
      [Math.round(w*.10),Math.round(h*.18),Math.round(w*.80),Math.round(h*.55)],
      [Math.round(w*.15),Math.round(h*.28),Math.round(w*.70),Math.round(h*.35)],
      [0,0,w,h]
    ];
    const fast=[
      renderVariant(bmp,...crops[1],2000,'contrast'),
      renderVariant(bmp,...crops[0],2000,'contrast')
    ];
    const fallback=[];
    for(const crop of crops)for(const mode of ['contrast','hard','invert'])fallback.push(renderVariant(bmp,...crop,2200,mode));
    return{fast,fallback};
  }
  function fill(number){const field=$('wagonSearch');field.value=fmt(number);field.dispatchEvent(new Event('input',{bubbles:true}));}
  async function runOCR(canvas,label,psm='6'){status.textContent=label;const r=await window.Tesseract.recognize(canvas,'eng',{tessedit_char_whitelist:'0123456789 -',tessedit_pageseg_mode:String(psm)});return candidatesFrom(r?.data?.text||'');}

  input.addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;say('Foto aufgenommen · schnelle Erkennung …');
    try{
      if(!window.Tesseract){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
      const known=dbNumbers(),{fast,fallback}=await makeVariants(file),counts=new Map();
      let pass=0;
      for(const v of fast){
        pass++;
        for(const psm of [6,7]){
          const got=await runOCR(v,'Schnelle Erkennung '+pass+'/'+fast.length+' …',psm);
          for(const c of got){counts.set(c,(counts.get(c)||0)+1);if(validUIC(c)&&known.has(c)){fill(c);say('✓ Erkannt: '+fmt(c),true);return;}}
          const fuzzy=fuzzyKnown(got,known);if(fuzzy){fill(fuzzy);say('✓ Erkannt und mit Datenbank abgeglichen: '+fmt(fuzzy),true);return;}
        }
      }
      status.textContent='Feinsuche …';
      for(let i=0;i<fallback.length;i++){
        for(const psm of [6,11,7]){
          const got=await runOCR(fallback[i],'Feinsuche '+(i+1)+'/'+fallback.length+' …',psm);
          for(const c of got)counts.set(c,(counts.get(c)||0)+1);
          const direct=[...counts.keys()].find(c=>validUIC(c)&&known.has(c));if(direct){fill(direct);say('✓ Erkannt: '+fmt(direct),true);return;}
          const fuzzy=fuzzyKnown(got,known);if(fuzzy){fill(fuzzy);say('✓ Erkannt und mit Datenbank abgeglichen: '+fmt(fuzzy),true);return;}
        }
      }
      const ranked=[...counts].map(([n,c])=>({n,c,valid:validUIC(n),known:known.has(n)})).sort((a,b)=>(b.known-a.known)||(b.valid-a.valid)||(b.c-a.c));
      const best=ranked.find(x=>x.valid);
      if(best){fill(best.n);say('Nummer erkannt, aber bitte kontrollieren: '+fmt(best.n));}
      else say('Keine sichere Wagennummer erkannt. Bitte Nummer möglichst groß und gerade fotografieren.');
    }catch(err){say('Erkennung konnte nicht abgeschlossen werden. Bitte erneut versuchen.');}
    finally{input.value='';}
  });
})();