(()=>{
  const cards=[...document.querySelectorAll('#dokumente .doc')];
  const ids=['brems','wu','melde','abstell'];
  cards.forEach((card,i)=>{
    if(!ids[i])return;
    card.style.cursor='pointer';
    if(!card.querySelector('button')){
      const wrap=document.createElement('div');wrap.className='actions';
      const b=document.createElement('button');b.type='button';b.className='btn pri';b.textContent='Öffnen';wrap.appendChild(b);card.appendChild(wrap);
    }
    card.addEventListener('click',e=>{if(e.target.closest('button')||e.target===card||e.target.closest('.doc'))location.href='./documents-v4.html?id='+ids[i]+'&v=20260825-1445';});
  });

  const wl=document.querySelector('#wagenliste .card');
  if(wl&&!document.getElementById('originalExcelV4Fixed')){
    const bar=document.createElement('div');bar.className='actions';bar.style.margin='0 0 12px';bar.style.alignItems='center';
    const b=document.createElement('button');b.id='originalExcelV4Fixed';b.type='button';b.className='btn pri';b.textContent='📊 GELSEN-LOG Original-Excel erstellen';
    b.addEventListener('click',()=>{
      const api=window.WMExcelV4;
      if(api&&typeof api.run==='function')api.run(b);
      else alert('Excel-Funktion wird noch geladen. Bitte 2 Sekunden warten und erneut tippen.');
    });
    const n=document.createElement('div');n.className='note';n.textContent='Erstellt die originale GELSEN-LOG Excel-Wagenliste mit den aktuellen Zugdaten.';
    bar.appendChild(b);bar.appendChild(n);
    const table=wl.querySelector('.tablewrap');table?wl.insertBefore(bar,table):wl.appendChild(bar);
  }
})();