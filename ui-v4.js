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
    card.addEventListener('click',e=>{e.preventDefault();location.href='./documents-v4.html?id='+ids[i]+'&v=20260825-1548';});
  });
})();