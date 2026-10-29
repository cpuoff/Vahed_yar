/* ============================= TABS ============================= */

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
    state.trackPref = b.dataset.sub;
    saveState();
    renderAll();
  });
});
