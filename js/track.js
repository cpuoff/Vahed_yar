/* ===== گرایش‌ها (الکترونیک / قدرت): قفل گرایش، گرایش فعلی، گروه‌های هر نما ===== */
const TRACK_LABEL = { elec:'الکترونیک', power:'قدرت' };

// گرایشی که کاربر با گذروندن یک درس اختصاصی شروعش کرده (درس‌های noLock حساب نمی‌شن)
function lockedTrack(){
  for(const c of ELEC_COURSES){
    if(c.trk && !c.noLock && state.elec.has(c.id)) return c.trk;
  }
  return null;
}
function hasBothTracks(){
  let e=false, p=false;
  ELEC_COURSES.forEach(c=>{
    if(c.trk && !c.noLock && state.elec.has(c.id)){ if(c.trk==='elec') e=true; else p=true; }
  });
  return e && p;
}
function currentTrack(){ return lockedTrack() || state.trackPref || 'elec'; }
function trackGroups(){ const t=currentTrack(); return ALL_ELEC_GROUPS.filter(g=>!g.virtual && (!g.trk || g.trk===t)); }
function trackCourses(){ const t=currentTrack(); return ELEC_COURSES.filter(c=>!c.trk || c.trk===t); }
function viewGroups(){ const v=state.elecSub; return ALL_ELEC_GROUPS.filter(g=> v==='common' ? !g.trk : g.trk===v); }  // مشترک: گروه‌های بدون trk (+ گروه‌های virtual)
