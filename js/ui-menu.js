/* ============================= HAMBURGER MENU & SUGGESTIONS PAGE ============================= */
// برای اضافه‌کردن صفحه‌ی جدید: یه دکمه تو #navMenu بذار + یه <section class="page-view"> + هش مخصوصش (مثل #suggest)

const navMenu = document.getElementById('navMenu');
const pageSuggest = document.getElementById('page-suggest');
const menuToggleBtn = document.getElementById('menuToggleBtn');

function openMenu(){ navMenu.style.display = 'flex'; }
function closeMenu(){ navMenu.style.display = 'none'; }

menuToggleBtn.addEventListener('click', openMenu);
document.getElementById('closeMenuBtn').addEventListener('click', closeMenu);
navMenu.addEventListener('click', (e)=>{ if(e.target === navMenu) closeMenu(); });

document.getElementById('menuSuggestBtn').addEventListener('click', ()=>{ closeMenu(); openSuggestPage(); });
document.getElementById('menuSettingsBtn').addEventListener('click', ()=>{ closeMenu(); openSettings(); });

// صفحه‌ی پیشنهاد با هش #suggest باز می‌شه تا دکمه‌ی بازگشت گوشی هم کار کنه
let suggestPushed = false;
function applySuggestView(){
  const open = location.hash === '#suggest';
  pageSuggest.style.display = open ? 'block' : 'none';
  document.body.style.overflow = open ? 'hidden' : '';
  if(open) pageSuggest.scrollTop = 0;
}
function openSuggestPage(){ suggestPushed = true; location.hash = 'suggest'; }
function closeSuggestPage(){
  if(suggestPushed){ suggestPushed = false; history.back(); }
  else { history.replaceState(null, '', location.pathname + location.search); applySuggestView(); }
}
window.addEventListener('hashchange', applySuggestView);
document.getElementById('suggestBackBtn').addEventListener('click', closeSuggestPage);
applySuggestView();
