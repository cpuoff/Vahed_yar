/* ============================= SETTINGS MODAL ============================= */

const settingsModal = document.getElementById('settingsModal');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

menuToggleBtn.addEventListener('click', ()=>{
  settingsModal.style.display = 'flex';
});

closeSettingsBtn.addEventListener('click', ()=>{
  settingsModal.style.display = 'none';
});

settingsModal.addEventListener('click', (e)=>{
  if(e.target === settingsModal) settingsModal.style.display = 'none';
});
