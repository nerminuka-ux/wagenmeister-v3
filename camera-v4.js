(()=>{
  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').replace(/\D/g,'');
  const validUIC=v=>{const d=norm(v);if(d.length!==12)return false;let s=0;for(let i=0;i<11;i++){const x=Number(d[i])*(i%2?1:2);s+=Math.floor(x/10)+x%10;}return(10-s%10)%10===Number(d[11]);};
  const fmt=v=>{const d=norm(v).slice(0,12);return d.length===12?d.slice(0,2)+' '+d.slice(2,4)+' '+d.slice(4,8)+' '+d.slice(8,11)+'-'+d.slice(11):v};
  const btn=$('cameraBtn'),input=$('cameraInput');if(!btn||!input)return;
  let status=$('cameraStatus');if(!status){status=document.createElement('div');status.id='cameraStatus';status.className='status';input.closest('.card').appendChild(status);}
  const say=(text,ok=false)=>{status.style.display='block';status.className='status '+(ok?'good':'bad');status.textContent=text;};

  function candidatesFrom(text){
    const cleaned=String(text||'').toUpperCase().replace(/[OQ]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5').replace(/B/g,'8');
    const out=[];
    for(const m of cleaned.matchAll(/[0-9][0-9\s.\-\/]{9,30}[0-9]/g)){
      const d=norm(m[0]);
      for(let i=0;i<=d.length-12;i++)out.push(d.slice(i,i+12));
    }
    const allDigits=norm(cleaned);
    for(let i=0;i<=allDigits.length-12;i++)out.push(allDigits.slice(i,i+12));
    return [...new Set(out.filter(x=>x.length===12))];
  }

  async function makeVariants(file){
    const bmp=await createImageBitmap(file);
    const maxW=1800,scale=Math.min(1,maxW/bmp.width),w=Math.max(1,Math.round(bmp.width*scale)),h=Math.max(1,Math.round(bmp.height*scale));
    const base=document.createElement('canvas');base.width=w;base.height=h;const ctx=base.getContext('2d',{willReadFrequently:true});ctx.drawImage(bmp,0,0,w,h);
    const img=ctx.getImageData(0,0,w,h),d=img.data;
    for(let i=0;i<d.length;i+=4){const g=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);const c=g<145?0:g>205?255:Math.round((g-145)*255/60);d[i]=d[i+1]=d[i+2]=c;}
    ctx.putImageData(img,0,0);
    const variants=[base];
    const bands=[[0.15,0.70],[0.30,0.45],[0.40,0.35]];
    for(const [yFrac,hFrac] of bands){const y=Math.round(h*yFrac),bh=Math.max(1,Math.round(h*hFrac));if(y+bh>h)continue;const c=document.createElement('canvas');c.width=w;c.height=bh;c.getContext('2d').drawImage(base,0,y,w,bh,0,0,w,bh);variants.push(c);}
    return variants;
  }

  input.addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    say('Foto aufgenommen · Wagennummer wird erkannt …');
    try{
      if(!window.Tesseract){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
      const variants=await makeVariants(file);
      let all=[];
      for(let i=0;i<variants.length;i++){
        status.textContent='Erkennung '+(i+1)+'/'+variants.length+' …';
        const r=await window.Tesseract.recognize(variants[i],'eng',{logger:m=>{if(m.status==='recognizing text')status.textContent='Erkennung '+(i+1)+'/'+variants.length+' · '+Math.round((m.progress||0)*100)+' %';},tessedit_char_whitelist:'0123456789 -'});
        all.push(...candidatesFrom(r?.data?.text||''));
        const good=[...new Set(all)].find(validUIC);
        if(good){const field=$('wagonSearch');field.value=fmt(good);field.dispatchEvent(new Event('input',{bubbles:true}));say('✓ Erkannt: '+fmt(good),true);input.value='';return;}
      }
      const unique=[...new Set(all)];
      const fallback=unique.find(x=>x.length===12);
      if(fallback){const field=$('wagonSearch');field.value=fmt(fallback);field.dispatchEvent(new Event('input',{bubbles:true}));say('Nummer möglicherweise erkannt – Prüfziffer kontrollieren: '+fmt(fallback));}
      else say('Keine Wagennummer sicher erkannt. Bitte näher fotografieren, Wagennummer waagerecht und möglichst bildfüllend aufnehmen.');
    }catch(err){say('Erkennung konnte nicht abgeschlossen werden. Bitte Foto erneut aufnehmen oder Wagennummer manuell eingeben.');}
    finally{input.value='';}
  });
})();