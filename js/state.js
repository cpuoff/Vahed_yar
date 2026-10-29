/* ============================= STATE ============================= */

const STORAGE_KEY = 'course-tracker-state-v2';
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return {elec:[], islamic:[], general:[], current:[], grades:{}, trackPref:'elec', elecSub:'elec'};
    const parsed = JSON.parse(raw);
    return {
      elec: parsed.elec || [],
      islamic: parsed.islamic || [],
      general: parsed.general || [],
      current: parsed.current || [],
      grades: parsed.grades || {},
      trackPref: parsed.trackPref || 'elec',
      elecSub: (parsed.elecSub === 'elec' || parsed.elecSub === 'power') ? parsed.elecSub : (parsed.trackPref || 'elec')   // تب «مشترک» حذف شده
    };
  }catch(e){ return {elec:[], islamic:[], general:[], current:[], grades:{}, trackPref:'elec', elecSub:'elec'}; }
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    elec: Array.from(state.elec),
    islamic: Array.from(state.islamic),
    general: Array.from(state.general),
    current: Array.from(state.current),
    grades: state.grades,
    trackPref: state.trackPref,
    elecSub: state.elecSub
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
  elecSub: _s.elecSub || 'elec'
};
const COURSES_BY_KEY = { elec: ELEC_COURSES, islamic: ISLAMIC_COURSES, general: GENERAL_COURSES };

