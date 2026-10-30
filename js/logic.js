/* ============================= LOGIC ============================= */

function byId(list, id){ return list.find(c=>c.id===id); }

function unitsOf(course){
  if(course.variableUnits) return 0;
  if(typeof course.u === 'number') return course.u;
  return (course.t||0) + (course.p||0);
}
function creditUnitsOf(course){
  return course.excludeFromTotal ? 0 : unitsOf(course);
}

function isPassed(passedSet, id){ return passedSet.has(id); }

function combinedPassedUnits(){
  let sum = 0;
  Object.keys(COURSES_BY_KEY).forEach(key=>{
    COURSES_BY_KEY[key].forEach(c=>{ if(state[key].has(c.id)) sum += creditUnitsOf(c); });
  });
  return sum;
}

// مجموع واحدهای درس‌هایی که این ترم در حال گذراندنشونی
function currentUnits(){
  let sum = 0;
  [ELEC_COURSES, ISLAMIC_COURSES, GENERAL_COURSES].forEach(list=>{
    list.forEach(c=>{ if(state.current.has(c.id)) sum += creditUnitsOf(c); });
  });
  return sum;
}

function groupsRequiredTotal(groups, courses){
  return groups.reduce((s,g)=>{
    if(g.kind==='all') return s + g.ids.reduce((s2,id)=>s2+creditUnitsOf(byId(courses,id)),0);
    if(g.kind==='countMin') return s + (typeof g.unitGoal==='number' ? g.unitGoal : g.min);
    return s + g.min;
  },0);
}

function computeGPA(){
  let weighted = 0, gradedUnits = 0, gradedCount = 0, ungradedCount = 0;
  Object.keys(COURSES_BY_KEY).forEach(key=>{
    COURSES_BY_KEY[key].forEach(c=>{
      if(!state[key].has(c.id)) return;
      const g = state.grades[c.id];
      if(typeof g !== 'number' || isNaN(g)){ ungradedCount++; return; }
      const u = unitsOf(c);
      weighted += g*u;
      gradedUnits += u;
      gradedCount++;
    });
  });
  return { gpa: gradedUnits ? (weighted/gradedUnits) : null, gradedUnits, gradedCount, ungradedCount };
}

function coreqReachable(coId, passedSet){
  // هم‌نیازی که همین ترم داره گذرونده می‌شه هم قابل قبوله
  if(pidPassed(coId, passedSet) || state.current.has(coId)) return true;
  const co = byId(ELEC_COURSES, coId) || byId(ISLAMIC_COURSES, coId) || byId(GENERAL_COURSES, coId);
  if(!co) return true;
  return (co.pre||[]).every(pid=>pidPassed(pid, passedSet));
}

function pidPassed(pid, passedSet){
  // Prerequisites can point to a course in a different section than the
  // course that declares them (e.g. an ELEC_COURSES course requiring a
  // GENERAL_COURSES language course). Check the set that actually owns
  // that prerequisite id, not just the calling section's own passedSet.
  if(passedSet.has(pid)) return true;
  if(byId(GENERAL_COURSES, pid)) return state.general.has(pid);
  if(byId(ELEC_COURSES, pid)) return state.elec.has(pid);
  if(byId(ISLAMIC_COURSES, pid)) return state.islamic.has(pid);
  return false;
}

function prereqStatus(course, passedSet){
  const missing = [];
  if(course.trk){
    const lt = lockedTrack();
    if(lt && lt!==course.trk) missing.push('مخصوص گرایش ' + TRACK_LABEL[course.trk] + ' (درس گرایش ' + TRACK_LABEL[lt] + ' گذرونده‌ای)');
  }
  (course.pre||[]).forEach(pid=>{
    if(!pidPassed(pid, passedSet)){
      const p = byId(ELEC_COURSES, pid) || byId(ISLAMIC_COURSES, pid) || byId(GENERAL_COURSES, pid);
      missing.push(p ? p.title : pid);
    }
  });
  (course.co||[]).forEach(cid=>{
    if(!coreqReachable(cid, passedSet)){
      const c = byId(ELEC_COURSES, cid) || byId(ISLAMIC_COURSES, cid) || byId(GENERAL_COURSES, cid);
      missing.push((c ? c.title : cid) + ' (هم‌نیاز)');
    }
  });
  if(course.minTotalUnits){
    if(combinedPassedUnits() < course.minTotalUnits){
      missing.push('گذراندن حداقل ' + course.minTotalUnits + ' واحد کل');
    }
  }
  return {ok: missing.length===0, missing};
}

function courseStatus(course, passedSet){
  if(passedSet.has(course.id)) return 'passed';
  if(state.current.has(course.id)) return 'current';
  const {ok} = prereqStatus(course, passedSet);
  return ok ? 'avail' : 'locked';
}

function unlockCount(course, allCourses, passedSet){
  let n = 0;
  allCourses.forEach(c=>{
    if(c.id===course.id) return;
    if(passedSet.has(c.id)) return;
    if((c.pre||[]).includes(course.id)) n++;
  });
  return n;
}

function groupProgress(group, courses, passedSet){
  const list = group.ids.map(id=>byId(courses,id));
  if(group.kind==='all'){
    const total = list.reduce((s,c)=>s+creditUnitsOf(c),0);
    const done = list.filter(c=>passedSet.has(c.id)).reduce((s,c)=>s+creditUnitsOf(c),0);
    return {done, total, complete: done>=total, unitsMode:true};
  }
  if(group.kind==='countMin'){
    const doneCount = list.filter(c=>passedSet.has(c.id)).length;
    return {done:doneCount, total:group.min, complete: doneCount>=group.min, unitsMode:false};
  }
  let excludedIds = new Set();
  if(group.exclusivePairs){
    group.exclusivePairs.forEach(pair=>{
      const [a,b] = pair;
      if(passedSet.has(a) && passedSet.has(b)){
        excludedIds.add(b);
      }
    });
  }
  const done = list.filter(c=>passedSet.has(c.id) && !excludedIds.has(c.id)).reduce((s,c)=>s+creditUnitsOf(c),0);
  return {done, total:group.min, complete: done>=group.min, unitsMode:true};
}

function exclusivityWarning(group, passedSet){
  if(!group.exclusivePairs) return null;
  for(const [a,b] of group.exclusivePairs){
    if(passedSet.has(a) && passedSet.has(b)){
      const ca = byId(ISLAMIC_COURSES, a) || byId(ELEC_COURSES,a);
      const cb = byId(ISLAMIC_COURSES, b) || byId(ELEC_COURSES,b);
      return `طبق مقررات فقط یکی از «${ca.title}» یا «${cb.title}» مجاز به احتساب توی سهمیه‌ست. واحد اضافه به‌عنوان مازاد حساب می‌شه.`;
    }
  }
  return null;
}
