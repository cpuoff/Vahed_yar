/* ============================= SETTINGS MODAL ============================= */

const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

function openSettings(){ settingsModal.style.display = 'flex'; }
document.getElementById('settingsBtn').addEventListener('click', openSettings);

closeSettingsBtn.addEventListener('click', ()=>{
  settingsModal.style.display = 'none';
});

settingsModal.addEventListener('click', (e)=>{
  if(e.target === settingsModal) settingsModal.style.display = 'none';
});
