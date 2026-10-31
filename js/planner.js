/* ============================= PLANNER =============================
   موتور «برنامه تحصیلی من» — برنامهٔ پیشنهادی از نیمسال بعد از ترم جاری تا فارغ‌التحصیلی.
   فقط نقشهٔ پیشنهادی است؛ الگوی قطعی ارائهٔ دروس (مهر/بهمن) فرض نمی‌شود.

   قانون وضعیت دروس (همان قانون مرحلهٔ قبل):
   - «در حال گذراندن» هیچ‌وقت پاس‌شده حساب نمی‌شود و در وضعیت‌ها نمایش داده می‌شود
     «مشروط به پاس شدن». فقط برای (۱) پیشنهاد نشدن دوباره و (۲) محاسبهٔ واحدهای اخذشدهٔ ترم جاری
     استفاده می‌شود.
   - پیش‌نیاز در وضعیت واقعی فقط با درس پاس‌شده تأمین می‌شود. ولی هر برنامهٔ آینده ناگزیر باید
     نتیجهٔ ترم‌های قبل از خودش را «پیش‌بینی» کند (درس‌های برنامه‌ریزی‌شده هم همین‌طورند).
     پس وابسته‌های درس جاری از نیمسال بعد قابل برنامه‌ریزی‌اند، ولی همیشه با برچسب «مشروط» و
     فقط وقتی profile.projectCurrent روشن باشد. اگر خاموش باشد این وابسته‌ها برنامه‌ریزی نمی‌شوند
     و در فهرست «منتظر پاس شدن» می‌مانند.
   ======================================================================= */

const PLAN_RULES = {
  regularBase: 20,        // سقف عادی ترم
  probationCap: 14,       // مشروط (معدل < 12)
  alefCap: 24,            // معدل الف (معدل ≥ 17)
  lastTermCap: 24,        // ترم آخر
  summerBase: 6,          // تابستان
  summerInternship: 8,    // تابستان با کارآموزی
  summerLastCap: 10,      // تابستانِ آخر (با مجوز آموزش)
  maarifPerTerm: 2,       // حداکثر واحد معارف در هر نیمسال
  maxRegularTerms: 12,    // سنوات کارشناسی پیوسته (تابستان حساب نمی‌شود)
  probationBelow: 12,
  alefFrom: 17,
  instructorMaxUnits: 8   // سقف واحد نظری برای بررسی «معرفی به استاد»
};

// مازاد بر سقف در ترم عادی (غیر ترم آخر، غیر مشروط) و تابستانِ غیر آخر
const PLAN_EXEMPT_IDS = ['x_vasaya', 'i19'];
// درس‌هایی که در یک گروه سهمیه‌ای حتماً باید باشند
const PLAN_FORCED_QUOTA = { electives: ['e_defa'] };

// تقویم تقریبی ترم‌ها (فرض‌ها؛ فقط همین‌جا عوض می‌شوند)
const PLAN_CAL = {
  mehr:   { startM:7,  startD:1, endM:10, endD:30 },                 // ۱ مهر تا ۳۰ دی
  bahman: { startM:11, startD:1, endM:3,  endD:31, endNextYear:true }, // ۱ بهمن تا ۳۱ خرداد سال بعد
  summer: { startM:4,  startD:1, endM:5,  endD:31 }                   // ۱ تیر تا ۳۱ مرداد
};
const PLAN_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

function planFmtDate(d){ return d.d + ' ' + PLAN_MONTHS[d.m-1] + ' ' + d.y; }

function planGpaStatus(gpa){
  if(typeof gpa !== 'number' || isNaN(gpa)) return {code:'normal', known:false, label:'عادی (معدل وارد نشده)'};
  if(gpa < PLAN_RULES.probationBelow) return {code:'probation', known:true, label:'مشروط'};
  if(gpa >= PLAN_RULES.alefFrom) return {code:'alef', known:true, label:'معدل الف'};
  return {code:'normal', known:true, label:'عادی'};
}

// تقویم نیمسال عادی شمارهٔ k (۱ = نیمسال ورود)
function planTermCalendar(entryYear, entryTerm, k){
  const idx = (entryTerm==='bahman' ? 1 : 0) + (k-1);
  const year = entryYear + Math.floor(idx/2);
  const season = idx%2===0 ? 'mehr' : 'bahman';
  const c = PLAN_CAL[season];
  const acad = year + '-' + (year+1);
  return {
    kind:'regular', season, year,
    start:{y:year, m:c.startM, d:c.startD},
    end:{y:year + (c.endNextYear?1:0), m:c.endM, d:c.endD},
    label: (season==='mehr' ? 'نیمسال اول ' : 'نیمسال دوم ') + acad,
    monthLabel: (season==='mehr' ? 'مهر ' : 'بهمن ') + year
  };
}
// تابستانِ بعد از یک نیمسال دوم (بهمن)
function planSummerCalendar(bahmanCal){
  const y = bahmanCal.year + 1, c = PLAN_CAL.summer;
  return {kind:'summer', season:'summer', year:y, start:{y, m:c.startM, d:c.startD}, end:{y, m:c.endM, d:c.endD},
          label:'ترم تابستان ' + y, monthLabel:'تیر ' + y};
}

function planToday(){
  try{
    const parts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {year:'numeric', month:'numeric', day:'numeric'}).formatToParts(new Date());
    const g = t => parseInt(parts.find(p=>p.type===t).value, 10);
    const r = {y:g('year'), m:g('month'), d:g('day')};
    return (r.y>1300 && r.m>=1 && r.m<=12) ? r : null;
  }catch(e){ return null; }
}
// بر اساس تاریخ امروز و ورودی، نیمسال جاری چندم می‌شد (null در تابستان/نامعلوم)
function planExpectedTerm(profile, today){
  if(!today) return null;
  let season, year;
  if(today.m>=7 && today.m<=10){ season='mehr'; year=today.y; }
  else if(today.m>=11){ season='bahman'; year=today.y; }
  else if(today.m<=3){ season='bahman'; year=today.y-1; }
  else return null;
  const base = profile.entryTerm==='bahman' ? 1 : 0;
  return 2*(year - profile.entryYear) + (season==='bahman' ? 1 : 0) - base + 1;
}

// سقف مجاز یک نیمسال
function planCapFor(kind, isLast, status, internship){
  if(kind==='summer'){
    if(isLast) return {cap:PLAN_RULES.summerLastCap, exempt:false, needsApproval:true, note:'تابستانِ آخر: حداکثر ۱۰ واحد (با مراجعه به آموزش و دریافت مجوز)'};
    return {cap: internship ? PLAN_RULES.summerInternship : PLAN_RULES.summerBase, exempt:true, needsApproval:false,
            note: internship ? 'تابستان با کارآموزی: سقف ۸ واحد' : 'تابستان: سقف ۶ واحد'};
  }
  if(status==='probation') return {cap:PLAN_RULES.probationCap, exempt:false, needsApproval:false, note:'مشروطی: سقف ۱۴ واحد (بدون هیچ استثنا)'};
  if(isLast) return {cap:PLAN_RULES.lastTermCap, exempt:false, needsApproval:false, note:'ترم آخر: سقف ۲۴ واحد (با رعایت شرایط آموزشی)'};
  if(status==='alef') return {cap:PLAN_RULES.alefCap, exempt:true, needsApproval:false, note:'معدل الف: سقف ۲۴ واحد'};
  return {cap:PLAN_RULES.regularBase, exempt:true, needsApproval:false, note:'سقف عادی ۲۰ واحد'};
}

function planValidateProfile(p){
  const errors = [];
  if(!(Number.isInteger(p.entryYear) && p.entryYear>=1380 && p.entryYear<=1460)) errors.push('سال ورود باید یک سال شمسی معتبر باشد (مثلاً ۱۴۰۲).');
  if(p.entryTerm!=='mehr' && p.entryTerm!=='bahman') errors.push('نیمسال ورود را انتخاب کن.');
  if(!(Number.isInteger(p.currentTerm) && p.currentTerm>=1 && p.currentTerm<=30)) errors.push('شمارهٔ نیمسال فعلی باید عددی بین ۱ تا ۳۰ باشد.');
  if(p.lastGpa!==null && !(typeof p.lastGpa==='number' && p.lastGpa>=0 && p.lastGpa<=20)) errors.push('معدل باید بین ۰ تا ۲۰ باشد (یا خالی بماند).');
  return errors;
}

function planAllCourses(){ return [].concat(ELEC_COURSES, ISLAMIC_COURSES, GENERAL_COURSES); }

function planSections(track){
  return [
    {key:'elec', groups: ALL_ELEC_GROUPS.filter(g=>!g.virtual && (!g.trk || g.trk===track)),
           courses: ELEC_COURSES.filter(c=>!c.trk || c.trk===track), set: state.elec},
    {key:'islamic', groups: ISLAMIC_GROUPS, courses: ISLAMIC_COURSES, set: state.islamic},
    {key:'general', groups: GENERAL_GROUPS, courses: GENERAL_COURSES, set: state.general}
  ];
}

// امضای ورودی‌ها؛ اگه عوض شه برنامهٔ ذخیره‌شده «قدیمی» حساب می‌شه
function planInputSig(profile){
  const ids = [state.elec, state.islamic, state.general].map(s=>Array.from(s).sort().join(','));
  const s = 'v1' + JSON.stringify([ids, Array.from(state.current).sort(), profile, suggestionTrack()]);
  let h = 5381;
  for(let i=0;i<s.length;i++){ h = (((h<<5) + h) + s.charCodeAt(i)) | 0; }
  return String(h>>>0);
}

/* ---- مجموعهٔ دروس لازم (R): اجباری‌ها + انتخاب دروس برای سهمیه‌ها ---- */
function planBuildRequired(track, projectCurrent){
  const sections = planSections(track);
  const selected = new Map();
  const warnings = [];
  const okBefore = id => isPassedAny(id) || (projectCurrent && state.current.has(id));

  // ۱) گروه‌های اجباری: هرچی نه پاس‌شده نه در حال گذراندن
  sections.forEach(sec=>sec.groups.forEach(g=>{
    if(g.kind!=='all') return;
    g.ids.forEach(id=>{
      const c = byId(sec.courses, id);
      if(!c || isPassedAny(id) || state.current.has(id) || selected.has(id)) return;
      selected.set(id, {course:c, sec:sec.key, group:g, kind:'mandatory', tier: g.id==='basic' ? 0 : 1});
    });
  }));

  // ۲) گروه‌های سهمیه‌ای: سهمیهٔ باقی‌مانده بعد از کم کردن پاس‌شده‌ها و در حال گذراندن‌ها
  sections.forEach(sec=>sec.groups.forEach(g=>{
    if(g.kind==='all') return;
    const prog = groupProgress(g, sec.courses, sec.set);          // فقط پاس‌شده
    const unitsMode = g.kind!=='countMin';
    const w = c => unitsMode ? creditUnitsOf(c) : 1;
    let need = prog.total - prog.done;
    g.ids.forEach(id=>{
      const c = byId(sec.courses, id);
      if(c && (isCurrentOnly(id) || selected.has(id))) need -= w(c);
    });
    const isBlocked = c => c.exclusiveWith && (isPassedAny(c.exclusiveWith) || state.current.has(c.exclusiveWith) || selected.has(c.exclusiveWith));
    const satisfiable = c => (c.pre||[]).every(p=>okBefore(p) || selected.has(p)) && (c.co||[]).every(p=>okBefore(p) || selected.has(p));

    // درس‌های اجباریِ داخل گروه (مثل دفاع مقدس در اختیاری‌ها)
    (PLAN_FORCED_QUOTA[g.id] || []).forEach(id=>{
      const c = byId(sec.courses, id);
      if(!c || isPassedAny(id) || state.current.has(id) || selected.has(id)) return;
      selected.set(id, {course:c, sec:sec.key, group:g, kind:'quota', tier:2});
      need -= w(c);
    });
    if(need<=0) return;

    const pickable = [];
    g.ids.forEach((id, idx)=>{
      const c = byId(sec.courses, id);
      if(!c || isPassedAny(id) || state.current.has(id) || selected.has(id)) return;
      const pending = (c.pre||[]).filter(p=>!isPassedAny(p)).length + (c.co||[]).filter(p=>!isPassedAny(p)).length;
      pickable.push({c, idx, pending});
    });
    pickable.sort((a,b)=> a.pending-b.pending || a.idx-b.idx);
    for(const p of pickable){
      if(need<=0) break;
      if(isBlocked(p.c) || !satisfiable(p.c)) continue;
      selected.set(p.c.id, {course:p.c, sec:sec.key, group:g, kind:'quota', tier:2});
      need -= w(p.c);
    }
    if(need>0) warnings.push({level:'warn', text:'سهمیهٔ «' + g.title + '» با دروس قابل‌اخذ کامل نمی‌شود (' + need + (unitsMode ? ' واحد' : ' درس') + ' کم است).'});
  }));

  return {selected, warnings};
}

/* ---- تولید برنامه ---- */
function planGenerate(profile, opts){
  opts = opts || {};
  const track = suggestionTrack();
  const status = planGpaStatus(profile.lastGpa);
  const projectCurrent = profile.projectCurrent !== false;
  const includeSummer = !!profile.includeSummer;
  const internshipPinned0 = includeSummer && !!profile.summerInternship;
  const warnings = [];

  const req = planBuildRequired(track, projectCurrent);
  req.warnings.forEach(w=>warnings.push(w));

  // گره‌ها
  const nodes = [];
  req.selected.forEach((s, id)=>{
    const c = s.course;
    nodes.push({
      id, course:c, sec:s.sec, group:s.group, kind:s.kind, tier:s.tier,
      units: unitsOf(c), credit: creditUnitsOf(c),
      pre: c.pre || [], co: c.co || [], minTotal: c.minTotalUnits || 0,
      isMaarif: s.sec==='islamic', exempt: PLAN_EXEMPT_IDS.indexOf(id) >= 0,
      idx: nodes.length, height: 1, dependents: 0
    });
  });
  const R = new Map(nodes.map(n=>[n.id, n]));
  nodes.forEach(n=>n.pre.forEach(p=>{ const d = R.get(p); if(d) d.dependents++; }));
  const hmemo = {};
  const height = (id, stack)=>{
    if(hmemo[id]) return hmemo[id];
    if(stack.has(id)) return 1;
    stack.add(id);
    let h = 1;
    nodes.forEach(n=>{ if(n.pre.indexOf(id) >= 0) h = Math.max(h, 1 + height(n.id, stack)); });
    stack.delete(id);
    return (hmemo[id] = h);
  };
  nodes.forEach(n=>{ n.height = height(n.id, new Set()); });

  const prio = (a, b)=>
    (b.height - a.height) || (a.tier - b.tier) || (b.dependents - a.dependents) || (b.units - a.units) || (a.idx - b.idx);

  // وضعیت پیش‌بینی‌شدهٔ قبل از هر نیمسال
  const before = new Set();
  planAllCourses().forEach(c=>{
    if(isPassedAny(c.id)) before.add(c.id);
    else if(projectCurrent && state.current.has(c.id)) before.add(c.id);
  });
  let currentCredit = 0;
  planAllCourses().forEach(c=>{ if(isCurrentOnly(c.id)) currentCredit += creditUnitsOf(c); });
  let unitsBefore = combinedPassedUnits() + (projectCurrent ? currentCredit : 0);

  const remaining = new Map(R);
  const terms = [];
  let lastRegular = profile.currentTerm;
  let lastCal = planTermCalendar(profile.entryYear, profile.entryTerm, lastRegular);
  let summerPending = includeSummer && lastCal.season==='bahman';
  let regularOrdinal = 0, emptyStreak = 0, guard = 0;

  while(remaining.size>0 && guard++ < 80){
    let slot;
    if(summerPending){ slot = {kind:'summer', cal: planSummerCalendar(lastCal)}; summerPending = false; }
    else { const k = lastRegular + 1; slot = {kind:'regular', termNo:k, cal: planTermCalendar(profile.entryYear, profile.entryTerm, k)}; regularOrdinal++; }
    const statusHere = slot.kind==='regular' ? ((profile.assumeStatusPersists || regularOrdinal===1) ? status.code : 'normal') : 'normal';

    const e52 = remaining.get('e52');
    const internshipPinned = internshipPinned0 && !!e52;
    const summerOk = n => n.sec!=='elec' || (internshipPinned && n.id==='e52');
    const baseEligible = n => n.pre.every(p=>before.has(p)) && (!n.minTotal || n.minTotal <= unitsBefore) &&
      (slot.kind==='summer' ? summerOk(n) : !(internshipPinned && n.id==='e52'));

    // ---- تلاش برای «ترم آخر»: همهٔ باقی‌مانده‌ها یک‌جا ----
    let finalPick = null;
    {
      const list = Array.from(remaining.values());
      const idset = new Set(list.map(n=>n.id));
      const allOk = list.every(n=> baseEligible(n) && n.co.every(c=>before.has(c) || idset.has(c)));
      if(allOk){
        const capInfo = planCapFor(slot.kind, true, statusHere, false);
        const units = list.reduce((s,n)=>s+n.units, 0);
        const maarif = list.reduce((s,n)=>s+(n.isMaarif ? n.units : 0), 0);
        if(units <= capInfo.cap && maarif <= PLAN_RULES.maarifPerTerm) finalPick = {list, capInfo};
      }
    }

    let chosen = [], capInfo, isLast = false;
    if(finalPick){
      chosen = finalPick.list; capInfo = finalPick.capInfo; isLast = true;
    }else{
      const intHere = slot.kind==='summer' && internshipPinned && !!e52 && baseEligible(e52);
      capInfo = planCapFor(slot.kind, false, statusHere, intHere);
      const chosenIds = new Set();
      let used = 0, maarif = 0;
      const unitsCap = n => (capInfo.exempt && n.exempt) ? 0 : n.units;
      const bundleFor = n => {
        const members = [], seen = new Set();
        let ok = true;
        (function visit(x){
          if(!ok || seen.has(x.id) || chosenIds.has(x.id)) return;
          seen.add(x.id);
          if(!baseEligible(x)){ ok = false; return; }
          members.push(x);
          x.co.forEach(cid=>{
            if(before.has(cid) || chosenIds.has(cid)) return;
            const d = remaining.get(cid);
            if(!d){ ok = false; return; }
            visit(d);
          });
        })(n);
        return ok ? members : null;
      };
      const tryAdd = n => {
        if(chosenIds.has(n.id)) return;
        const m = bundleFor(n);
        if(!m || m.length===0) return;
        const addUnits = m.reduce((s,x)=>s+unitsCap(x), 0);
        const addMaarif = m.reduce((s,x)=>s+(x.isMaarif ? x.units : 0), 0);
        if(used + addUnits > capInfo.cap || maarif + addMaarif > PLAN_RULES.maarifPerTerm) return;
        m.forEach(x=>{ chosen.push(x); chosenIds.add(x.id); });
        used += addUnits; maarif += addMaarif;
      };
      if(intHere) tryAdd(e52);
      // معارف: هر نیمسال تا ۲ واحد، از همان ابتدا (تا در ترم آخر انباشته نشوند)
      Array.from(remaining.values()).filter(n=>n.isMaarif)
        .sort((a,b)=> (a.exempt===b.exempt ? 0 : (a.exempt ? -1 : 1)) || prio(a,b))
        .forEach(tryAdd);
      Array.from(remaining.values()).filter(n=>!n.isMaarif).sort(prio).forEach(tryAdd);
    }

    // ثبت نیمسال
    chosen.forEach(n=>{ remaining.delete(n.id); });
    chosen.forEach(n=>{ before.add(n.id); unitsBefore += n.credit; });
    const exemptUnits = capInfo.exempt ? chosen.filter(n=>n.exempt).reduce((s,n)=>s+n.units, 0) : 0;
    terms.push({
      kind: slot.kind, termNo: slot.kind==='regular' ? slot.termNo : null, cal: slot.cal,
      courseIds: chosen.sort(prio).map(n=>n.id),
      units: chosen.reduce((s,n)=>s+n.units, 0), exemptUnits,
      cap: capInfo.cap, capNote: capInfo.note, isLast, needsApproval: !!(isLast && capInfo.needsApproval),
      credit: chosen.reduce((s,n)=>s+n.credit, 0)
    });
    emptyStreak = chosen.length ? 0 : emptyStreak + 1;

    if(slot.kind==='regular'){ lastRegular = slot.termNo; lastCal = slot.cal; summerPending = includeSummer && slot.cal.season==='bahman'; }
    if(emptyStreak >= 4) break;   // بن‌بست: چند نیمسال پشت‌هم هیچ درسی قابل‌برنامه‌ریزی نیست
  }
  while(terms.length && terms[terms.length-1].courseIds.length===0) terms.pop();

  const blocked = Array.from(remaining.keys());

  // واحدهای باقی‌مانده پس از هر نیمسال (واحد چارت، بدون جبرانی)
  const plannedCredit = nodes.reduce((s,n)=>s+n.credit, 0);
  let cum = 0;
  terms.forEach(t=>{ cum += t.credit; t.remainingAfter = plannedCredit - cum; });

  // اطلاعات دروس
  const meta = {};
  nodes.forEach(n=>{ meta[n.id] = {kind:n.kind, exempt:n.exempt}; });

  // پایان
  const regularTerms = terms.filter(t=>t.kind==='regular');
  const summerTerms = terms.filter(t=>t.kind==='summer');
  const lastTerm = terms.length ? terms[terms.length-1] : null;
  const lastRegularNo = regularTerms.length ? regularTerms[regularTerms.length-1].termNo : profile.currentTerm;
  let graduation = null;
  if(blocked.length===0){
    if(lastTerm){
      graduation = {slotKind:lastTerm.kind, termLabel:lastTerm.cal.label, date:lastTerm.cal.end, dateText:'حدود ' + planFmtDate(lastTerm.cal.end)};
    }else if(state.current.size>0){
      const cal = planTermCalendar(profile.entryYear, profile.entryTerm, profile.currentTerm);
      graduation = {slotKind:'regular', termLabel:cal.label, date:cal.end, dateText:'حدود ' + planFmtDate(cal.end), atCurrentTerm:true};
    }
    if(graduation){
      graduation.lastRegularTermNo = lastRegularNo;
      graduation.exceedsLimit = lastRegularNo > PLAN_RULES.maxRegularTerms;
      graduation.atLimit = lastRegularNo === PLAN_RULES.maxRegularTerms;
    }
  }

  /* ---- هشدارها ---- */
  if(!status.known) warnings.push({level:'info', text:'معدل نیمسال گذشته وارد نشده؛ وضعیت «عادی» (سقف ۲۰ واحد) فرض شد.'});
  else if(status.code==='probation') warnings.push({level:'warn', text:'وضعیت تو «مشروط» است؛ سقف ۱۴ واحد رعایت شده و هیچ استثنایی (معدل الف، ترم آخر، مازاد وصایا/انس با قرآن) از آن عبور نمی‌کند.'});
  if(status.known && status.code!=='normal' && !profile.assumeStatusPersists){
    warnings.push({level:'info', text:'وضعیت «' + status.label + '» فقط برای اولین نیمسال برنامه اعمال شده؛ معدل نیمسال‌های بعد هنوز معلوم نیست و سقف عادی فرض شده.'});
  }
  if(blocked.length){
    warnings.push({level:'error', text: projectCurrent
      ? 'برای این درس‌ها در نیمسال‌های پیش‌رو راهی پیدا نشد: ' + blocked.map(id=>anyCourse(id).title).join('، ') + '.'
      : 'این درس‌ها منتظر پاس شدن درس‌های در حال گذراندن‌اند و برنامه‌ریزی نشدند؛ تاریخ فارغ‌التحصیلی تا مشخص شدن نتیجهٔ ترم جاری قابل محاسبه نیست: ' + blocked.map(id=>anyCourse(id).title).join('، ') + '.'});
  }
  if(projectCurrent){
    const dep = [];
    nodes.forEach(n=>{ if(!isPassedAny(n.id) && n.pre.concat(n.co).some(p=>isCurrentOnly(p))) dep.push(n.course.title); });
    if(dep.length) warnings.push({level:'info', text:'این درس‌ها در برنامه آمده‌اند ولی به پاس شدن درس‌های در حال گذراندنِ ترم جاری وابسته‌اند (درس جاری «پاس‌شده» حساب نشده): ' + dep.join('، ') + '.'});
  }
  const sunat = lastRegularNo;
  if(graduation && graduation.exceedsLimit) warnings.push({level:'error', text:'هشدار سنوات: طبق این برنامه فارغ‌التحصیلی در نیمسال ' + sunat + ' است و از سقف ۱۲ نیمسال عادی (کارشناسی پیوسته) می‌گذرد. با آموزش دانشکده دربارهٔ تابستان، افزایش سقف واحد یا مرخصی/سنوات تکمیلی مشورت کن.'});
  else if(graduation && graduation.atLimit) warnings.push({level:'warn', text:'احتمال اتمام سنوات: آخرین نیمسال برنامه همان نیمسال ۱۲ است و هیچ حاشیه‌ای برای عقب‌افتادن نداری.'});
  if(profile.currentTerm > PLAN_RULES.maxRegularTerms) warnings.push({level:'error', text:'نیمسال فعلی (' + profile.currentTerm + ') از سقف ۱۲ نیمسال عادی بیشتر است؛ وضعیت سنوات را با آموزش بررسی کن.'});
  if(terms.some(t=>t.kind==='summer')) warnings.push({level:'info', text:'ترم تابستان اختیاری است، حذف و اضافه ندارد، در سنوات حساب نمی‌شود ولی نمراتش در معدل کل اثر دارد. ارائهٔ دروس تخصصی در تابستان قطعی نیست؛ در تابستان فقط دروس عمومی/معارف گذاشته شد' + (internshipPinned0 ? ' (و کارآموزی طبق انتخاب تو).' : '.')});
  if(terms.some(t=>t.needsApproval)) warnings.push({level:'warn', text:'سقف ۱۰ واحد تابستانِ آخر نیازمند مراجعه به آموزش و دریافت مجوز است.'});
  if(internshipPinned0 && state.elec.has('e52')) warnings.push({level:'info', text:'کارآموزی را قبلاً گذرانده‌ای؛ گزینهٔ سقف ۸ واحد تابستان برای آن اعمال نشد.'});
  const today = opts.today !== undefined ? opts.today : planToday();
  const expected = planExpectedTerm(profile, today);
  if(expected!==null && expected!==profile.currentTerm){
    warnings.push({level:'info', text:'با توجه به تاریخ امروز و سال/نیمسال ورود، نیمسال جاری باید «' + expected + '» باشد ولی «' + profile.currentTerm + '» وارد کرده‌ای. اگر مرخصی یا وقفه داشته‌ای طبیعی است؛ تاریخ‌ها بر اساس عددی که وارد کردی حساب شده‌اند.'});
  }

  // «معرفی به استاد»: فقط به‌عنوان گزینهٔ جدا، هرگز وارد برنامه نمی‌شود
  let instructorOption = null;
  if(lastTerm && lastTerm.isLast){
    const lastNodes = lastTerm.courseIds.map(id=>R.get(id)).filter(Boolean);
    const theoryOnly = lastNodes.length>0 && lastNodes.every(n=>(n.course.p||0)===0);
    if(theoryOnly && lastTerm.units <= PLAN_RULES.instructorMaxUnits){
      instructorOption = {units:lastTerm.units, courseIds:lastTerm.courseIds.slice()};
    }
  }

  return {
    version:1, track, status:{code:status.code, label:status.label, known:status.known},
    current:{termNo:profile.currentTerm, cal:planTermCalendar(profile.entryYear, profile.entryTerm, profile.currentTerm),
             courseIds: planAllCourses().filter(c=>isCurrentOnly(c.id)).map(c=>c.id), units: termLoadUnits()},
    terms, meta, blocked, graduation, warnings, instructorOption,
    totals:{
      passedUnits: combinedPassedUnits(), currentUnits: currentUnits(), plannedUnits: plannedCredit,
      requiredTotal: groupsRequiredTotal(planSections(track)[0].groups, planSections(track)[0].courses) +
                     groupsRequiredTotal(ISLAMIC_GROUPS, ISLAMIC_COURSES) + groupsRequiredTotal(GENERAL_GROUPS, GENERAL_COURSES),
      regularTermsRemaining: regularTerms.length, summerTermsUsed: summerTerms.length, lastRegularTermNo: lastRegularNo
    }
  };
}

// تولید و ذخیرهٔ برنامه (ساختار terms[].courseIds برای ویرایش در مراحل بعد آماده است)
function planRefresh(){
  if(!state.profile) return null;
  const data = planGenerate(state.profile);
  state.plan = {version:1, generatedAt:new Date().toISOString(), sig:planInputSig(state.profile), edited:false, data};
  saveState();
  return state.plan;
}
