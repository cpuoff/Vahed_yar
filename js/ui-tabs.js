/* ============================= TABS & FILTERS ============================= */

document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    document.getElementById('elec-subbar').style.display = btn.dataset.tab==='elec' ? 'flex' : 'none';
  });
});

document.querySelectorAll('.sub-pill').forEach(b=>{
  b.addEventListener('click', ()=>{
    state.elecSub = b.dataset.sub;
    if(b.dataset.sub !== 'common') state.trackPref = b.dataset.sub;
    saveState();
    renderAll();
  });
});

document.querySelectorAll('.filter-pill').forEach(pill=>{
  pill.addEventListener('click', ()=>{
    document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
    pill.classList.add('active');
    activeFilter = pill.dataset.filter;
    renderAll();
  });
});
