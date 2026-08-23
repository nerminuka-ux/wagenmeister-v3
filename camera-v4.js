(()=>{
  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').replace(/\D/g,'');
  const validUIC=v=>{const d=norm(v);if(d.length!==12)return false;let s=0;for(let i=0;i<11;i++){const x=Number(d[i])*(i%2?1:2);s+=Math.floor(x/10)+x%10;}return(10-s%10)%10===Number(d[11]);};
  const fmt=v=>{const d=norm(v).slice(0,12);return d.length===12?d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4,8)+' '+d.slice(8,11)+'-'+d.slice(11):v};
  const btn=$('cameraBtn'),input=$('cameraInput');if(!btn||!input)return;
  let status=$('cameraStatus');if(!status){status=document.createElement('div');status.id='cameraStatus';status.className='status';input.closest('.card').appendChild(status);}
  const say=(text,ok=false)=>{status.style.display='block';status.className='status '+(ok?'good':'bad');status.textContent=text;};

  function candidatesFrom(text){
    const cleaned=String(text||'').toUpperCase().replace(/[OQ]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2');
    const out=[];
    for(const m of cleaned.matchAll(/[0-9][0-9\s.\-\/]{9,30}[0-9]/g)){
      const d=norm(m[0]);for(let i=0;i<=d.length-12;i++)out.push(d.slice(i,i+12));
    }
    const allDigits=norm(cleaned);for(let i=0;i<=allDigits.length-12;i++)out.push(allDigits.slice(i,i+12));
    return [...new Set(out.filter(x=>x.length===12))];
  }

  function renderVariant(src,sx,sy,sw,sh,targetW,mode){
    const scale=targetW/sw,targetH=Math.max(1,Math.round(sh*scale));
    const c=document.createElement('canvas');c.width=targetW;c.height=targetH;
    const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(src,sx,sy,sw,sh,0,0,targetW,targetH);
    const img=x.getImageData(0,0,c.width,c.height),d=img.data;
    for(let i=0;i<d.length;i+=4){
      const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      let v;
      if(mode==='hard') v=g>170?255:0;
      else if(mode==='invert') v=g>170?0:255;
      else v=Math.max(0,Math.min(255,(g-95)*2.2));
      d[i]=d[i+1]=d[i+2]=v;
    }
    x.putImageData(img,0,0);return c;
  }

  async function makeVariants(file){
    const bmp=await createImageBitmap(file),w=bmp.width,h=bmp.height,v=[];
    const crops=[
      [0,0,w,h],
      [Math.round(w*.16),Math.round(h*.28),Math.round(w*.68),Math.round(h*.34)],
      [Math.round(w*.22),Math.round(h*.34),Math.round(w*.58),Math.round(h*.22)],
      [Math.round(w*.25),Math.round(h*.37),Math.round(w*.52),Math.round(h*.16)]
    ];
    for(const [sx,sy,sw,sh] of crops){
      const tw=Math.min(2600,Math.max(1400,Math.round(sw*2.2)));
      v.push(renderVariant(bmp,sx,sy,sw,sh,tw,'contrast'));
      v.push(renderVariant(bmp,sx,sy,sw,sh,tw,'hard'));
      v.push(renderVariant(bmp,sx,sy,sw,sh,tw,'invert'));
    }
    return v;
  }

  input.addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    say('Foto aufgenommen · Wagennummer wird erkannt …');
    try{
      if(!window.Tesseract){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
      const variants=await makeVariants(file);let all=[];
      for(let i=0;i<variants.length;i++){
        status.textContent='Erkennung '+(i+1)+'/'+variants.length+' …';
        const r=await window.Tesseract.recognize(variants[i],'eng',{logger:m=>{if(m.status==='recognizing text')status.textContent='Erkennung '+(i+1)+'/'+variants.length+' · '+Math.round((m.progress||0)*100)+' %';},tessedit_char_whitelist:'0123456789 -',tessedit_pageseg_mode:'7'});
        all.push(...candidatesFrom(r?.data?.text||''));
        const good=[...new Set(all)].find(validUIC);
        if(good){const field=$('wagonSearch');field.value=fmt(good);field.dispatchEvent(new Event('input',{bubbles:true}));say('✓ Erkannt: '+fmt(good),true);input.value='';return;}
      }
      const unique=[...new Set(all)],fallback=unique.find(x=>x.length===12);
      if(fallback){const field=$('wagonSearch');field.value=fmt(fallback);field.dispatchEvent(new Event('input',{bubbles:true}));say('Nummer möglicherweise erkannt – Prüfziffer kontrollieren: '+fmt(fallback));}
      else say('Keine Wagennummer sicher erkannt. Bitte die Nummer möglichst mittig und groß fotografieren.');
    }catch(err){say('Erkennung konnte nicht abgeschlossen werden. Bitte Foto erneut aufnehmen oder Wagennummer manuell eingeben.');}
    finally{input.value='';}
  });
})();