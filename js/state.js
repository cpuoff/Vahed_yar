/* ============================= STATE ============================= */

const STORAGE_KEY = 'course-tracker-state-v2';

// پروفایل «برنامه تحصیلی من» (اگه نامعتبر بود null برمی‌گرده)
function sanitizeProfile(p){
  if(!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const y = parseInt(p.entryYear, 10), cur = parseInt(p.currentTerm, 10);
  if(!(y >= 1300 && y <= 1500) || !(cur >= 1 && cur <= 40)) return null;
  const gpa = (typeof p.lastGpa === 'number' && p.lastGpa >= 0 && p.lastGpa <= 20) ? p.lastGpa : null;
  return {
    entryYear: y, entryTerm: p.entryTerm === 'bahman' ? 'bahman' : 'mehr', currentTerm: cur, lastGpa: gpa,
    includeSummer: !!p.includeSummer, summerInternship: !!p.summerInternship,
    assumeStatusPersists: !!p.assumeStatusPersists, projectCurrent: p.projectCurrent !== false
  };
}
// برنامهٔ ذخیره‌شده (ساختار نامعتبر → null)
function sanitizePlan(p){
  if(!p || typeof p !== 'object' || Array.isArray(p) || p.version !== 1) return null;
  if(!p.data || typeof p.data !== 'object' || !Array.isArray(p.data.terms)) return null;
  return p;
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return {elec:[], islamic:[], general:[], current:[], grades:{}, trackPref:'elec', elecSub:'elec', dismissed:{}, profile:null, plan:null};
    const parsed = JSON.parse(raw);
    return {
      elec: parsed.elec || [],
      islamic: parsed.islamic || [],
      general: parsed.general || [],
      current: parsed.current || [],
      grades: parsed.grades || {},
      trackPref: parsed.trackPref || 'elec',
      elecSub: (parsed.elecSub === 'elec' || parsed.elecSub === 'power') ? parsed.elecSub : (parsed.trackPref || 'elec'),   // تب «مشترک» حذف شده
      dismissed: (parsed.dismissed && typeof parsed.dismissed === 'object' && !Array.isArray(parsed.dismissed)) ? parsed.dismissed : {},
      profile: sanitizeProfile(parsed.profile),
      plan: sanitizePlan(parsed.plan)
    };
  }catch(e){ return {elec:[], islamic:[], general:[], current:[], grades:{}, trackPref:'elec', elecSub:'elec', dismissed:{}, profile:null, plan:null}; }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    elec: Array.from(state.elec),
    islamic: Array.from(state.islamic),
    general: Array.from(state.general),
    current: Array.from(state.current),
    grades: state.grades,
    trackPref: state.trackPref,
    elecSub: state.elecSub,
    dismissed: state.dismissed,
    profile: state.profile,
    plan: state.plan
  }));
}
const _s = loadState();
const state = {
  current: new Set(_s.current),
  elec: new Set(_s.elec),
  islamic: new Set(_s.islamic),
  general: new Set(_s.general),
  grades: _s.grades || {},
  trackPref: _s.trackPref || 'elec',
  elecSub: _s.elecSub || 'elec',
  dismissed: _s.dismissed || {},
  profile: _s.profile || null,
  plan: _s.plan || null
};
const COURSES_BY_KEY = { elec: ELEC_COURSES, islamic: ISLAMIC_COURSES, general: GENERAL_COURSES };

