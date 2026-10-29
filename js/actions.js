/* ============================= ACTIONS ============================= */

document.getElementById('resetBtn').addEventListener('click', ()=>{
  if(confirm('مطمئنی می‌خوای همهٔ تیک‌ها و نمره‌های هر ۳ بخش پاک بشه؟ این کار قابل بازگشت نیست.')){
    state.elec.clear();
    state.islamic.clear();
    state.general.clear();
    state.current.clear();
    state.grades = {};
    saveState();
    settingsModal.style.display = 'none';
    renderAll();
  }
});

document.getElementById('exportBtn').addEventListener('click', ()=>{
  const data = JSON.stringify({
    elec:Array.from(state.elec),
    islamic:Array.from(state.islamic),
    general:Array.from(state.general),
    current:Array.from(state.current),
    grades: state.grades
  }, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'course-tracker-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', ()=>{
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      state.elec = new Set(parsed.elec || []);
      state.islamic = new Set(parsed.islamic || []);
      state.general = new Set(parsed.general || []);
      state.current = new Set(parsed.current || []);
      state.grades = parsed.grades || {};
      saveState();
      settingsModal.style.display = 'none';
      renderAll();
      alert('وضعیت با موفقیت بارگذاری شد.');
    }catch(err){
      alert('فایل معتبر نیست.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});
