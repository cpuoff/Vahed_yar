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
  lastTermCap: 24,        // ترم پایانی (از نیمسال finalFrom به بعد)
  finalFrom: 8,           // پروژه و کارآموزی از این نیمسال به بعد قابل اخذند
  lastTermMin: 7,         // ...یا از این نیمسال، اگر همین ترم آخرِ واقعیِ دانشجو باشد (مثلاً واحدهایش در ترم ۷ تمام شود)
  freeTerms: 8,           // سنوات مجاز با شهریهٔ ورودی خودت؛ ۹ تا ۱۲ فقط با درخواست و نرخ ورودی جدید
  summerBase: 6,          // تابستان
  summerInternship: 6,    // تابستان با کارآموزی: مجموع واحدها (با احتساب کارآموزی) حداکثر ۶
  internshipExtra: 14,    // در ترم کارآموزی فقط ۱۴ واحد دیگر علاوه بر آن
  minRegularUnits: 12,    // حداقل واحد دانشجوی عادی (ترم آخر مستثناست)
  maarifLetter: 4,        // با نامهٔ مدیرگروه معارف: ۴ واحد معارف در یک نیمسال
  summerLastCap: 10,      // تابستانِ آخر (با مجوز آموزش)
  maarifPerTerm: 2,       // حداکثر واحد معارف در هر نیمسال
  maxRegularTerms: 12,    // سنوات کارشناسی پیوسته (تابستان حساب نمی‌شود)
  probationBelow: 12,
  alefFrom: 17,
  instructorMaxUnits: 8   // سقف واحد نظری برای بررسی «معرفی به استاد»
};

// مازاد بر سقف در ترم عادی (غیر ترم آخر، غیر مشروط) و تابستانِ غیر آخر
// بالاترین ظرفیتی که کاربر می‌تواند وارد کند (سقف قانونی جداگانه اعمال می‌شود)
const PLAN_MAX_USER_CAP = 30;
// فقط در ترم آخر قابل اخذند (پروژه و کارآموزی)
const PLAN_LAST_ONLY_IDS = ['e37', 'e52'];
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
// cap = سقف بدون شرط، alt = بالاترین مقداری که ممکن است (با شرط معدل الف). فقط در ترم عادیِ غیرمشروط alt > cap است:
// معدل نیمسال‌های آینده هنوز معلوم نیست، پس کاربر می‌تواند «فرض کند» معدل الف می‌شود و ببیند چطور می‌شود برداشت.
function planCapFor(kind, isLast, status, internship){
  const r = planCapForBase(kind, isLast, status, internship);
  r.alt = r.alt !== undefined ? r.alt : r.cap;
  return r;
}
function planCapForBase(kind, isLast, status, internship){
  if(kind==='summer'){
    if(isLast) return {cap:PLAN_RULES.summerLastCap, exempt:false, needsApproval:true, note:'تابستانِ آخر: حداکثر ۱۰ واحد (با مراجعه به آموزش و دریافت مجوز)'};
    return {cap:PLAN_RULES.summerBase, exempt:true, needsApproval:false, note:'تابستان: سقف ۶ واحد'};
  }
  if(status==='probation') return {cap:PLAN_RULES.probationCap, exempt:false, needsApproval:false, note:'مشروطی: سقف ۱۴ واحد (بدون هیچ استثنا)'};
  if(isLast) return {cap:PLAN_RULES.lastTermCap, exempt:false, needsApproval:false, note:'ترم آخر: سقف ۲۴ واحد (با رعایت شرایط آموزشی)'};
  if(status==='alef') return {cap:PLAN_RULES.alefCap, exempt:true, needsApproval:false, note:'معدل الف: سقف ۲۴ واحد'};
  return {cap:PLAN_RULES.regularBase, alt:PLAN_RULES.alefCap, exempt:true, needsApproval:false, note:'سقف عادی ۲۰ واحد (تا ۲۴ واحد با معدل الف)'};
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
  const s = 'v3' + JSON.stringify([ids, Array.from(state.current).sort(), sanitizeProfile(profile) || profile, suggestionTrack(), state.termCaps || {}]);
  let h = 5381;
  for(let i=0;i<s.length;i++){ h = (((h<<5) + h) + s.charCodeAt(i)) | 0; }
  return String(h>>>0);
}

/* ---- کمکی‌ها ---- */
function planTitle(id){ const c = anyCourse(id); return c ? c.title : id; }
function planTermKey(slot){ return slot.kind==='regular' ? 'r' + slot.termNo : 's' + slot.cal.year; }
function planSlotLabel(slot){ return slot.kind==='regular' ? 'نیمسال ' + slot.termNo : 'تابستان ' + slot.cal.year; }
function planDateInt(d){ return d.y*10000 + d.m*100 + d.d; }
// ظرفیت انتخابیِ پیش‌فرض (وقتی کاربر چیزی تعیین نکرده): ترم عادی ۲۰ (یا کمتر اگه سقف قانونی کمتره)، تابستان = سقف قانونی
function planAutoCap(kind, legalNonLast){ return kind==='regular' ? Math.min(PLAN_RULES.regularBase, legalNonLast) : legalNonLast; }

function planBuildContext(profile, opts){
  const status = planGpaStatus(profile.lastGpa);
  const projectCurrent = profile.projectCurrent !== false;
  const track = suggestionTrack();
  const before0 = new Set();
  planAllCourses().forEach(c=>{
    if(isPassedAny(c.id)) before0.add(c.id);
    else if(projectCurrent && state.current.has(c.id)) before0.add(c.id);
  });
  let currentCredit = 0;
  planAllCourses().forEach(c=>{ if(isCurrentOnly(c.id)) currentCredit += creditUnitsOf(c); });
  const sections = planSections(track);
  const order = {};
  let k = 0;
  sections.forEach(sec=>sec.groups.forEach(g=>g.ids.forEach(id=>{ if(order[id]===undefined) order[id] = k++; })));
  return {
    profile, track, status, projectCurrent, sections, order, before0,
    includeSummer: !!profile.includeSummer,
    internshipPinned0: !!profile.includeSummer && !!profile.summerInternship,
    termCaps: (opts.termCaps !== undefined ? opts.termCaps : state.termCaps) || {},
    letterKeys: new Set(),
    unitsBefore0: combinedPassedUnits() + (projectCurrent ? currentCredit : 0)
  };
}

function planMakeNode(ctx, course, sec, group, kind, tier){
  return {
    id:course.id, course, sec, group, groupId: sec + ':' + group.id, kind, tier,
    units: unitsOf(course), credit: creditUnitsOf(course),
    pre: course.pre || [], co: course.co || [], minTotal: course.minTotalUnits || 0,
    isMaarif: sec==='islamic', exempt: PLAN_EXEMPT_IDS.indexOf(course.id) >= 0, lastOnly: PLAN_LAST_ONLY_IDS.indexOf(course.id) >= 0,
    idx: ctx.order[course.id] !== undefined ? ctx.order[course.id] : 9999
  };
}

// دروس گروه‌های اجباری (هرچی نه پاس‌شده نه در حال گذراندن)
function planMandatoryNodes(ctx){
  const out = [], seen = new Set();
  ctx.sections.forEach(sec=>sec.groups.forEach(g=>{
    if(g.kind!=='all') return;
    g.ids.forEach(id=>{
      const c = byId(sec.courses, id);
      if(!c || isPassedAny(id) || state.current.has(id) || seen.has(id)) return;
      seen.add(id);
      out.push(planMakeNode(ctx, c, sec.key, g, 'mandatory', g.id==='basic' ? 0 : 1));
    });
  }));
  return out;
}

// گروه‌های سهمیه‌ای: چقدر مونده و کاندیدها چی‌ان (پاس‌شده‌ها و در حال گذراندن‌ها از سهمیه کم می‌شن؛ پاس حساب نمی‌شن)
function planQuotaGroups(ctx){
  const out = [];
  ctx.sections.forEach(sec=>sec.groups.forEach(g=>{
    if(g.kind==='all') return;
    const prog = groupProgress(g, sec.courses, sec.set);
    const unitsMode = g.kind!=='countMin';
    const w = c => unitsMode ? creditUnitsOf(c) : 1;
    let req = prog.total - prog.done;
    g.ids.forEach(id=>{ const c = byId(sec.courses, id); if(c && isCurrentOnly(id)) req -= w(c); });
    const forcedIds = (PLAN_FORCED_QUOTA[g.id] || []).filter(id=>{ const c = byId(sec.courses, id); return c && !isPassedAny(id) && !state.current.has(id); });
    const cands = [];
    g.ids.forEach(id=>{
      const c = byId(sec.courses, id);
      if(!c || isPassedAny(id) || state.current.has(id)) return;
      cands.push({course:c, forced: forcedIds.indexOf(id) >= 0});
    });
    out.push({key:sec.key + ':' + g.id, sec:sec.key, group:g, unitsMode, w, req, cands});
  }));
  return out;
}

// سطح زمانیِ هر درس (بدون ظرفیت): ۱ + بالاترین سطح پیش‌نیازها؛ هم‌نیاز هم‌سطح می‌شه
function planLevelFn(ctx, mandNodes, quota){
  const pool = new Set(mandNodes.map(n=>n.id));
  quota.forEach(q=>q.cands.forEach(c=>pool.add(c.course.id)));
  const memo = {};
  const lvl = id => {
    if(ctx.before0.has(id)) return 0;
    if(!pool.has(id)) return 1e6;
    if(memo[id] !== undefined) return memo[id];
    memo[id] = 1e6;
    const c = anyCourse(id);
    let m = 0;
    (c.pre || []).forEach(p=>{ m = Math.max(m, lvl(p)); });
    let v = m + 1;
    (c.co || []).forEach(p=>{ if(!ctx.before0.has(p)) v = Math.max(v, lvl(p)); });
    return (memo[id] = v);
  };
  return lvl;
}

function planExclusiveBlocked(c, selMap){
  const o = c.exclusiveWith;
  return !!o && (isPassedAny(o) || state.current.has(o) || selMap.has(o));
}

// انتخاب اولیهٔ دروس سهمیه‌ای: زودرس‌ترین‌ها (کمترین سطح پیش‌نیاز) اول
function planInitialSelection(ctx, mandNodes, quota){
  const sel = new Map();
  mandNodes.forEach(n=>sel.set(n.id, n));
  const warnings = [];
  const lvl = planLevelFn(ctx, mandNodes, quota);
  const okSel = p => ctx.before0.has(p) || sel.has(p);
  quota.forEach(q=>{
    let need = q.req;
    const add = cand => { sel.set(cand.course.id, planMakeNode(ctx, cand.course, q.sec, q.group, 'quota', 2)); need -= q.w(cand.course); };
    q.cands.filter(c=>c.forced).forEach(add);
    if(need <= 0) return;
    const pool = q.cands.filter(c=>!c.forced && !sel.has(c.course.id)).map(c=>({c, level:lvl(c.course.id), o:ctx.order[c.course.id]}));
    pool.sort((a,b)=> a.level-b.level || a.o-b.o);
    for(const p of pool){
      if(need <= 0) break;
      const c = p.c.course;
      if(planExclusiveBlocked(c, sel)) continue;
      if(!(c.pre || []).every(okSel) || !(c.co || []).every(okSel)) continue;
      add(p.c);
    }
    if(need > 0) warnings.push({level:'warn', text:'سهمیهٔ «' + q.group.title + '» با دروس قابل‌اخذ کامل نمی‌شود (' + need + (q.unitsMode ? ' واحد' : ' درس') + ' کم است).'});
  });
  return {sel, warnings};
}

// آیا مجموعهٔ انتخاب‌شده معتبر است؟ (پیش‌نیاز/هم‌نیاز، سهمیه‌ها، جفت‌های انحصاری)
function planSelectionValid(ctx, sel, quota){
  const ok = p => ctx.before0.has(p) || sel.has(p);
  for(const n of sel.values()){
    if(!n.pre.every(ok) || !n.co.every(ok)) return false;
    const o = n.course.exclusiveWith;
    if(o && sel.has(o)) return false;
  }
  for(const q of quota){
    let got = 0;
    sel.forEach(n=>{ if(n.groupId===q.key) got += q.w(n.course); });
    if(got < q.req) return false;
  }
  return true;
}

/* ---- آماده‌سازی گره‌ها: ارتفاع زنجیرهٔ وابستگی و حجم کار پایین‌دست ---- */
function planPrepare(nodeList){
  const nodes = nodeList.map(n=>Object.assign({}, n, {height:1, dependents:0, work:n.units}));
  const R = new Map(nodes.map(n=>[n.id, n]));
  const preDep = {}, coDep = {};
  nodes.forEach(n=>{
    n.pre.forEach(p=>{ const d = R.get(p); if(d){ d.dependents++; (preDep[p] = preDep[p] || []).push(n.id); } });
    n.co.forEach(p=>{ if(R.has(p)) (coDep[p] = coDep[p] || []).push(n.id); });
  });
  const memo = {};
  const visit = (id, stack)=>{
    if(memo[id]) return memo[id];
    const n = R.get(id);
    if(stack.has(id)) return {h:1, w:n.units};
    stack.add(id);
    let h = 1, w = n.units;
    (preDep[id] || []).forEach(d=>{ const r = visit(d, stack); h = Math.max(h, 1 + r.h); w = Math.max(w, n.units + r.w); });
    (coDep[id] || []).forEach(d=>{ const r = visit(d, stack); h = Math.max(h, r.h); w = Math.max(w, n.units + r.w); });
    stack.delete(id);
    return (memo[id] = {h, w});
  };
  nodes.forEach(n=>{ const r = visit(n.id, new Set()); n.height = r.h; n.work = r.w; });
  return nodes;
}

// چند ترتیب اولویت؛ بهترین نتیجه انتخاب می‌شه
const PLAN_PRIOS = [
  (a,b)=> (b.height-a.height) || (a.tier-b.tier) || (b.dependents-a.dependents) || (b.units-a.units) || (a.idx-b.idx),
  (a,b)=> (b.work-a.work) || (b.height-a.height) || (b.dependents-a.dependents) || (a.idx-b.idx),
  (a,b)=> (b.dependents-a.dependents) || (b.height-a.height) || (a.tier-b.tier) || (a.idx-b.idx),
  (a,b)=> (b.height-a.height) || (b.units-a.units) || (a.idx-b.idx)
];

/* ---- زمان‌بندی: نیمسال به نیمسال، هر درس واجد شرایط تا جای خالی هست همان‌جا می‌آید ---- */
function planSchedule(ctx, nodeList, opts){
  opts = opts || {};
  const prio = PLAN_PRIOS[opts.variant || 0];
  const wantWhy = !!opts.reasons;
  const profile = ctx.profile;
  const nodes = planPrepare(nodeList);
  const remaining = new Map(nodes.map(n=>[n.id, n]));
  const before = new Set(ctx.before0);
  let unitsBefore = ctx.unitsBefore0;
  const terms = [], delays = {};
  let lastRegular = profile.currentTerm;
  let lastCal = planTermCalendar(profile.entryYear, profile.entryTerm, lastRegular);
  let summerPending = ctx.includeSummer && lastCal.season==='bahman';
  let regularOrdinal = 0, emptyStreak = 0, guard = 0, slotIndex = 0;

  while(remaining.size > 0 && guard++ < 80){
    let slot;
    if(summerPending){ slot = {kind:'summer', cal:planSummerCalendar(lastCal)}; summerPending = false; }
    else { const k = lastRegular + 1; slot = {kind:'regular', termNo:k, cal:planTermCalendar(profile.entryYear, profile.entryTerm, k)}; regularOrdinal++; }
    const key = planTermKey(slot);
    const user = Object.prototype.hasOwnProperty.call(ctx.termCaps, key) ? ctx.termCaps[key] : undefined;
    const statusHere = slot.kind==='regular' ? ((profile.assumeStatusPersists || regularOrdinal===1) ? ctx.status.code : 'normal') : 'normal';
    // پروژه و کارآموزی: از نیمسال finalFrom به بعد؛ و اگر همین ترم، آخرِ واقعیِ دانشجو باشد از نیمسال lastTermMin
    // (تابستان: بر اساس نیمسال عادیِ قبل از آن)
    const baseNo = slot.kind==='regular' ? slot.termNo : lastRegular;
    const lastOnlyFrom = baseNo >= PLAN_RULES.finalFrom;
    const lastOnlyFromFinal = baseNo >= PLAN_RULES.lastTermMin;
    // سقف واحد معارف: ۲، و با «نامهٔ مدیرگروه معارف» ۴ (هم ترم عادی هم تابستان)
    const maarifLimit = ctx.letterKeys.has(key) ? PLAN_RULES.maarifLetter : PLAN_RULES.maarifPerTerm;

    const e52 = remaining.get('e52');
    const internshipPinned = ctx.internshipPinned0 && !!e52;      // کاربر کارآموزی را تابستانی خواسته
    // تابستان: دروس تخصصی قطعی نیستند؛ فقط کارآموزیِ تابستانیِ انتخابِ کاربر
    const okFrom = fin => fin ? lastOnlyFromFinal : lastOnlyFrom;
    const summerOk = (n, fin) => n.sec!=='elec' || (n.id==='e52' && internshipPinned && okFrom(fin));
    // پروژه و کارآموزی: فقط از نیمسال finalFrom به بعد، یا در ترم آخرِ واقعی از نیمسال lastTermMin
    const lastOnlyOk = (n, fin) => !n.lastOnly || (slot.kind==='regular' ? (okFrom(fin) && !(internshipPinned && n.id==='e52')) : (n.id==='e52' && internshipPinned && okFrom(fin)));
    const eligibleX = (n, fin) => lastOnlyOk(n, fin) && n.pre.every(p=>before.has(p)) && (!n.minTotal || n.minTotal <= unitsBefore) &&
      (slot.kind==='summer' ? summerOk(n, fin) : true);
    const eligible = n => eligibleX(n, false);
    const eligibleFinal = n => eligibleX(n, true);

    // سقف‌های این نیمسال: فقط «ترم آخرِ واقعی» ۲۴ واحد و بدون مازاد دارد (تابستانِ آخر: ۱۰ واحد با مجوز)
    const capBase = isFinalAttempt => slot.kind==='summer'
      ? planCapFor('summer', isFinalAttempt, 'normal', false)
      : planCapFor('regular', isFinalAttempt, statusHere, false);
    // ترم کارآموزی: فقط ۱۴ واحد دیگر علاوه بر کارآموزی (تابستان: مجموع حداکثر ۶)
    const intLimit = (cap, intUnits) => slot.kind==='summer' ? Math.min(cap, PLAN_RULES.summerInternship) : Math.min(cap, intUnits + PLAN_RULES.internshipExtra);

    // ترم آخر: همهٔ باقی‌مانده‌ها یک‌جا
    let finalPick = null;
    {
      const list = Array.from(remaining.values());
      const idset = new Set(list.map(n=>n.id));
      if(list.every(n=> eligibleFinal(n) && n.co.every(c=>before.has(c) || idset.has(c)))){
        const base = capBase(true);
        let legalCap = base.cap, alt = base.alt, note = base.note, needsApproval = !!base.needsApproval;
        const intNode = list.find(n=>n.id==='e52');
        if(intNode){
          legalCap = intLimit(legalCap, intNode.units); alt = intLimit(alt, intNode.units);
          note = slot.kind==='summer' ? 'تابستان با کارآموزی: مجموع واحدها (با احتساب کارآموزی) حداکثر ۶ واحد' : base.note + ' — با کارآموزی: حداکثر ۱۴ واحد دیگر علاوه بر آن';
          if(slot.kind==='summer') needsApproval = false;
        }
        const selL = user !== undefined ? user : legalCap;
        const effL = Math.min(selL, alt);
        const units = list.reduce((s,n)=>s+((base.exempt && n.exempt) ? 0 : n.units), 0);
        const maarif = list.reduce((s,n)=>s+(n.isMaarif ? n.units : 0), 0);
        if(units <= effL && maarif <= maarifLimit){
          finalPick = {list, capInfo:{legal:legalCap, alt, selected:selL, eff:effL, exempt:base.exempt, note, needsApproval}};
        }
      }
    }

    let chosen = [], capInfo, isLast = false;
    let usedNow = 0, maarifNow = 0, totalNow = 0;
    const chosenIds = new Set();
    if(finalPick){
      chosen = finalPick.list; capInfo = finalPick.capInfo; isLast = true;
      chosen.forEach(n=>chosenIds.add(n.id));
    }else{
      const base = capBase(false);
      const selN = user !== undefined ? user : planAutoCap(slot.kind, base.cap);
      const effN = Math.min(selN, base.alt);
      capInfo = {legal:base.cap, alt:base.alt, selected:selN, eff:effN, exempt:base.exempt, note:base.note, needsApproval:false};
      if(effN > 0){
        const unitsCap = n => (capInfo.exempt && n.exempt) ? 0 : n.units;
        const bundleFor = n => {
          const members = [], seen = new Set();
          let ok = true;
          (function visit(x){
            if(!ok || seen.has(x.id) || chosenIds.has(x.id)) return;
            seen.add(x.id);
            if(!eligible(x)){ ok = false; return; }
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
          const addTotal = m.reduce((s,x)=>s+x.units, 0);
          const intM = m.find(x=>x.id==='e52') || (chosenIds.has('e52') ? remaining.get('e52') : null);
          // ترم کارآموزی: همهٔ واحدها (حتی وصایا/انس با قرآن) داخل «۱۴ واحد دیگر» (تابستان: مجموع ۶) حساب می‌شوند
          if(intM){ if(totalNow + addTotal > intLimit(capInfo.eff, intM.units)) return; }
          else if(usedNow + addUnits > capInfo.eff) return;
          if(maarifNow + addMaarif > maarifLimit) return;
          m.forEach(x=>{ chosen.push(x); chosenIds.add(x.id); });
          usedNow += addUnits; maarifNow += addMaarif; totalNow += addTotal;
        };
        Array.from(remaining.values()).filter(n=>n.isMaarif)
          .sort((a,b)=> (a.exempt===b.exempt ? 0 : (a.exempt ? -1 : 1)) || prio(a,b))
          .forEach(tryAdd);
        Array.from(remaining.values()).filter(n=>!n.isMaarif).sort(prio).forEach(tryAdd);
      }
    }

    // دلیل ماندن هر درس باقی‌مانده در این نیمسال (فقط وقتی لازم است)
    if(wantWhy){
      const label = planSlotLabel(slot);
      remaining.forEach(n=>{
        if(chosenIds.has(n.id)) return;
        let text;
        const miss = n.pre.filter(p=>!before.has(p));
        const nm = ids => ids.slice(0,2).map(p=>'«' + planTitle(p) + '»').join('، ');
        if(n.lastOnly && !lastOnlyOk(n, false)) text = internshipPinned && n.id==='e52' && slot.kind==='regular'
          ? 'کارآموزی طبق انتخاب تو در تابستان گذاشته می‌شود'
          : 'پروژه و کارآموزی فقط از نیمسال ' + PLAN_RULES.finalFrom + ' به بعد قابل اخذ است (یا در ترم ' + PLAN_RULES.lastTermMin + ' اگر همان ترم آخرت باشد)';
        else if(miss.length){
          if(miss.every(p=>chosenIds.has(p))) text = 'پیش‌نیاز ' + nm(miss) + ' همین نیمسال گذرانده می‌شود و بعد از آن قابل‌اخذ است';
          else if(!ctx.projectCurrent && miss.some(p=>isCurrentOnly(p))) text = 'پیش‌نیاز ' + nm(miss) + ' در حال گذراندن است و پاس‌شده حساب نمی‌شود';
          else text = 'پیش‌نیاز ' + nm(miss) + ' هنوز گذرانده نشده';
        }
        else if(n.minTotal && n.minTotal > unitsBefore) text = 'برای اخذ حداقل ' + n.minTotal + ' واحد گذرانده لازم است (تا ابتدای این نیمسال ' + unitsBefore + ' واحد)';
        else if(slot.kind==='summer' && !summerOk(n, false)) text = 'ارائهٔ دروس تخصصی در تابستان قطعی نیست';
        else {
          const coMiss = n.co.filter(c=>!before.has(c) && !chosenIds.has(c));
          if(coMiss.length) text = 'هم‌نیاز ' + nm(coMiss) + ' هنوز قابل‌اخذ نیست';
          else if(n.isMaarif && maarifNow + n.units > maarifLimit) text = 'سقف ' + maarifLimit + ' واحد معارف در هر نیمسال پر شده بود';
          else if(capInfo.eff <= 0) text = 'ظرفیت انتخابی این نیمسال صفر است';
          else if(chosenIds.has('e52') && slot.kind==='regular') text = 'در ترم کارآموزی فقط ۱۴ واحد دیگر علاوه بر کارآموزی قابل‌اخذ است';
          else text = 'ظرفیت این نیمسال پر بود (' + usedNow + ' از ' + capInfo.eff + ' واحد)';
        }
        n.lastWhy = {from:label, text};
      });
    }

    // ترمی که کارآموزی دارد: سقف قانونی همان «۱۴ واحد دیگر + کارآموزی» (یا ۶ در تابستان) ثبت می‌شود
    {
      const intChosen = chosen.find(n=>n.id==='e52');
      if(intChosen && !finalPick){
        capInfo = Object.assign({}, capInfo, {
          legal:intLimit(capInfo.legal, intChosen.units), alt:intLimit(capInfo.alt, intChosen.units), eff:intLimit(capInfo.eff, intChosen.units),
          selected: user !== undefined ? capInfo.selected : Math.min(capInfo.selected, intLimit(capInfo.legal, intChosen.units)), exempt:false,
          note: slot.kind==='summer' ? 'تابستان با کارآموزی: مجموع واحدها (با احتساب کارآموزی) حداکثر ۶ واحد' : capInfo.note + ' — با کارآموزی: حداکثر ۱۴ واحد دیگر علاوه بر آن'
        });
      }
    }

    // ثبت نیمسال
    chosen.forEach(n=>{
      if(wantWhy && slotIndex > 0 && n.lastWhy) delays[n.id] = n.lastWhy;
      remaining.delete(n.id);
    });
    chosen.forEach(n=>{ before.add(n.id); unitsBefore += n.credit; });
    const exemptUnits = capInfo.exempt ? chosen.filter(n=>n.exempt).reduce((s,n)=>s+n.units, 0) : 0;
    const totalUnits = chosen.reduce((s,n)=>s+n.units, 0);
    const maarifUnits = chosen.reduce((s,n)=>s+(n.isMaarif ? n.units : 0), 0);
    terms.push({
      kind:slot.kind, termNo: slot.kind==='regular' ? slot.termNo : null, cal:slot.cal, key,
      courseIds: chosen.slice().sort(prio).map(n=>n.id),
      units: totalUnits, exemptUnits,
      cap:capInfo.eff, legalCap:capInfo.legal, altCap:capInfo.alt, selectedCap:capInfo.selected,
      userCap: user !== undefined ? user : null, capAuto: user === undefined,
      needsAlef: capInfo.eff > capInfo.legal,          // ظرفیت بیش از سقف بدون شرط: فقط با معدل الف
      overLegal: capInfo.selected > capInfo.alt,       // بیشتر از هر حد ممکن: کلیپ می‌شود
      maarifLimit, maarifUnits, letter: maarifUnits > PLAN_RULES.maarifPerTerm,
      phase: lastOnlyFrom, extension: slot.kind==='regular' && slot.termNo > PLAN_RULES.freeTerms,
      beyond: slot.kind==='regular' && slot.termNo > PLAN_RULES.maxRegularTerms,
      underMin: slot.kind==='regular' && !isLast && totalUnits < PLAN_RULES.minRegularUnits,
      hasInternship: chosen.some(n=>n.id==='e52'),
      capNote:capInfo.note, isLast, needsApproval:!!(isLast && capInfo.needsApproval),
      credit: chosen.reduce((s,n)=>s+n.credit, 0)
    });
    slotIndex++;
    emptyStreak = chosen.length ? 0 : emptyStreak + 1;
    if(slot.kind==='regular'){ lastRegular = slot.termNo; lastCal = slot.cal; summerPending = ctx.includeSummer && slot.cal.season==='bahman'; }
    if(emptyStreak >= 4) break;
  }
  while(terms.length && terms[terms.length-1].courseIds.length===0) terms.pop();
  const blockedWhy = {};
  if(wantWhy) remaining.forEach(n=>{ if(n.lastWhy) blockedWhy[n.id] = n.lastWhy; });
  return {terms, blocked:Array.from(remaining.keys()), delays, blockedWhy, nodes};
}

// امتیاز چینش (کمتر = بهتر): ۱) درس بی‌راه‌مانده ۲) زودترین تاریخ فارغ‌التحصیلی ۳) واحد کمتر ۴) متعادل‌تر
function planScore(res, nodeList){
  const last = res.terms.length ? res.terms[res.terms.length-1] : null;
  return [
    res.blocked.length,
    last ? planDateInt(last.cal.end) : 0,
    res.terms.filter(t=>t.letter).length,        // تا جای ممکن بدون نامهٔ معارف
    nodeList.reduce((s,n)=>s+n.credit, 0),
    res.terms.reduce((s,t)=>s + t.units*t.units, 0)
  ];
}
function planScoreLess(a, b){
  for(let i=0;i<a.length;i++){ if(a[i]!==b[i]) return a[i] < b[i]; }
  return false;
}

// جستجوی محلی روی انتخاب دروس سهمیه‌ای: جایگزینی/حذف تا زودتر فارغ‌التحصیل شود
function planSearchSelection(ctx, quota, init, maxEvals){
  let sel = new Map(init);
  const evalSel = s => { const list = Array.from(s.values()); const res = planSchedule(ctx, list, {variant:0}); return planScore(res, list); };
  let best = evalSel(sel), evals = 1;
  const sigOf = c => (c.pre || []).join('+') + '|' + (c.co || []).join('+') + '|' + unitsOf(c) + '|' + (c.minTotalUnits || 0) + '|' + (c.exclusiveWith || '');
  const uniq = (arr, f) => { const seen = new Set(); return arr.filter(x=>{ const k = f(x); if(seen.has(k)) return false; seen.add(k); return true; }); };
  let improved = true;
  while(improved && evals < maxEvals){
    improved = false;
    for(const q of quota){
      if(q.cands.length === 0) continue;
      let again = true;
      while(again && evals < maxEvals){
        again = false;
        const picked = Array.from(sel.values()).filter(n=>n.groupId===q.key && !q.cands.find(c=>c.course.id===n.id && c.forced));
        const free = q.cands.filter(c=>!c.forced && !sel.has(c.course.id));
        const S = uniq(picked, n=>sigOf(n.course));
        const U = uniq(free, c=>sigOf(c.course));
        const moves = [];
        S.forEach(s=>{ moves.push({rm:s.id, add:null}); U.forEach(u=>moves.push({rm:s.id, add:u})); });
        for(const m of moves){
          if(evals >= maxEvals) break;
          const ns = new Map(sel);
          ns.delete(m.rm);
          if(m.add) ns.set(m.add.course.id, planMakeNode(ctx, m.add.course, q.sec, q.group, 'quota', 2));
          if(!planSelectionValid(ctx, ns, quota)) continue;
          const sc = evalSel(ns); evals++;
          if(planScoreLess(sc, best)){ sel = ns; best = sc; improved = true; again = true; break; }
        }
      }
    }
  }
  return {sel, evals};
}

// «نامهٔ مدیرگروه معارف»: ۴ واحد معارف در یک نیمسال. فقط در نیمسال‌هایی استفاده می‌شود که تاریخ فارغ‌التحصیلی را جلو بیندازد
function planLetterSearch(ctx, list, variant){
  const run = ks => {
    const c2 = Object.assign({}, ctx, {letterKeys:new Set(ks)});
    const r = planSchedule(c2, list, {variant});
    return {keys:ks, r, sc:planScore(r, list)};
  };
  const regKeys = r => r.terms.map(t=>t.key);   // نامه هم در ترم عادی هم در تابستان قابل‌دریافت است
  const base = run([]);
  // راهبرد ۱: افزودن حریصانهٔ نیمسال‌ها
  let cur = base;
  for(let it=0; it<3; it++){
    let best = null;
    regKeys(cur.r).filter(k=>cur.keys.indexOf(k)<0).forEach(k=>{
      const t = run(cur.keys.concat([k]));
      if(planScoreLess(t.sc, best ? best.sc : cur.sc)) best = t;
    });
    if(!best) break;
    cur = best;
  }
  // راهبرد ۲: همهٔ نیمسال‌ها، بعد حذف آن‌هایی که لازم نیستند
  let all = run(regKeys(base.r));
  if(planScoreLess(all.sc, base.sc)){
    for(const k of all.keys.slice()){
      const t = run(all.keys.filter(x=>x!==k));
      if(!planScoreLess(base.sc, t.sc) && (planScoreLess(t.sc, all.sc) || t.sc.join()===all.sc.join())) all = t;
    }
  }
  const bestRun = planScoreLess(all.sc, cur.sc) ? all : cur;
  const keys = bestRun.r.terms.filter(t=>t.letter).map(t=>t.key);
  return {keys, base, best:bestRun, improves: planScoreLess(bestRun.sc, base.sc) && bestRun.sc[1] < base.sc[1]};
}

/* ---- تولید برنامه ---- */
function planGenerate(profile, opts){
  opts = opts || {};
  const ctx = planBuildContext(profile, opts);
  const warnings = [];
  const mandNodes = planMandatoryNodes(ctx);
  const quota = planQuotaGroups(ctx);
  const init = planInitialSelection(ctx, mandNodes, quota);
  init.warnings.forEach(w=>warnings.push(w));

  // انتخاب دروس سهمیه‌ای همراه با زمان‌بندی بهینه می‌شود. عمداً با ظرفیت‌های خودکار انجام می‌شود:
  // ظرفیتی که کاربر برای یک نیمسال می‌گذارد فقط «چیدمان» را عوض می‌کند، نه اینکه کدام دروس لازم‌اند
  // (کاهش ظرفیت نباید درسی را از برنامه بیرون ببرد و درس دیگری جایش بیاورد).
  const selCtx = Object.assign({}, ctx, {termCaps:{}});
  const searched = planSearchSelection(selCtx, quota, init.sel, opts.maxEvals || 260);
  const finalList = Array.from(searched.sel.values());

  // بهترین ترتیب اولویت
  let bestV = 0, bestSc = null;
  for(let v=0; v<PLAN_PRIOS.length; v++){
    const sc = planScore(planSchedule(ctx, finalList, {variant:v}), finalList);
    if(bestSc===null || planScoreLess(sc, bestSc)){ bestSc = sc; bestV = v; }
  }
  // نامهٔ مدیرگروه معارف
  let letterKeys = [], letterHint = null;
  const maarifLeft = finalList.reduce((s,n)=>s+(n.isMaarif ? n.units : 0), 0);
  if(maarifLeft > PLAN_RULES.maarifPerTerm){
    const ls = planLetterSearch(ctx, finalList, bestV);
    if(profile.maarifLetter){
      if(ls.improves) letterKeys = ls.keys;
    }else if(ls.improves){
      const lastB = ls.base.r.terms[ls.base.r.terms.length-1], lastL = ls.best.r.terms[ls.best.r.terms.length-1];
      letterHint = {keys:ls.keys, terms:ls.keys.map(k=>{ const t = ls.best.r.terms.find(x=>x.key===k); return t ? planSlotLabel(t) : k; }),
        savedTerms: ls.base.r.terms.length - ls.best.r.terms.length,
        dateText: lastL ? 'حدود ' + planFmtDate(lastL.cal.end) : '', oldDateText: lastB ? 'حدود ' + planFmtDate(lastB.cal.end) : ''};
    }
  }
  const ctxF = Object.assign({}, ctx, {letterKeys:new Set(letterKeys)});
  const res = planSchedule(ctxF, finalList, {variant:bestV, reasons:true});
  const terms = res.terms, blocked = res.blocked;
  const nodes = res.nodes;
  const R = new Map(nodes.map(n=>[n.id, n]));
  const status = ctx.status, projectCurrent = ctx.projectCurrent, internshipPinned0 = ctx.internshipPinned0;

  const plannedCredit = nodes.reduce((s,n)=>s+n.credit, 0);
  let cum = 0;
  terms.forEach(t=>{ cum += t.credit; t.remainingAfter = plannedCredit - cum; });
  const meta = {};
  nodes.forEach(n=>{ meta[n.id] = {kind:n.kind, exempt:n.exempt}; });

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
      graduation.needsExtension = lastRegularNo > PLAN_RULES.freeTerms;
    }
  }

  /* ---- هشدارها ---- */
  if(!status.known) warnings.push({level:'info', text:'معدل نیمسال گذشته وارد نشده؛ وضعیت «عادی» (سقف ۲۰ واحد) فرض شد.'});
  else if(status.code==='probation') warnings.push({level:'warn', text:'وضعیت تو «مشروط» است؛ سقف ۱۴ واحد رعایت شده و هیچ استثنایی (معدل الف، ترم آخر، مازاد وصایا/انس با قرآن) از آن عبور نمی‌کند.'});
  if(status.known && status.code!=='normal' && !profile.assumeStatusPersists){
    warnings.push({level:'info', text:'وضعیت «' + status.label + '» فقط برای اولین نیمسال برنامه اعمال شده؛ معدل نیمسال‌های بعد هنوز معلوم نیست و سقف عادی فرض شده.'});
  }
  terms.forEach(t=>{
    if(t.overLegal) warnings.push({level:'warn', text:'ظرفیت انتخابی ' + t.selectedCap + ' واحد برای «' + planSlotLabel(t) + '» از حداکثر مجاز آن (' + t.altCap + ' واحد) بیشتر است؛ ' + t.altCap + ' اعمال شد' + (t.altCap===PLAN_RULES.probationCap ? ' (وضعیت مشروطی).' : '.')});
  });
  const alefTerms = terms.filter(t=>t.needsAlef);
  if(alefTerms.length) warnings.push({level:'warn', text:'در ' + alefTerms.map(planSlotLabel).join('، ') + ' ظرفیت بیش از ۲۰ واحد انتخاب شده؛ این فقط وقتی ممکن است که معدل نیمسال قبل از آن ≥ ۱۷ (معدل الف) شود. در برنامه همین فرض شده است.'});
  if(blocked.length){
    warnings.push({level:'error', text: projectCurrent
      ? 'برای این درس‌ها در نیمسال‌های پیش‌رو راهی پیدا نشد: ' + blocked.map(planTitle).join('، ') + '.'
      : 'این درس‌ها منتظر پاس شدن درس‌های در حال گذراندن‌اند و برنامه‌ریزی نشدند؛ تاریخ فارغ‌التحصیلی تا مشخص شدن نتیجهٔ ترم جاری قابل محاسبه نیست: ' + blocked.map(planTitle).join('، ') + '.'});
  }
  if(projectCurrent){
    const dep = [];
    nodes.forEach(n=>{ if(!isPassedAny(n.id) && n.pre.concat(n.co).some(p=>isCurrentOnly(p))) dep.push(n.course.title); });
    if(dep.length) warnings.push({level:'info', text:'این درس‌ها در برنامه آمده‌اند ولی به پاس شدن درس‌های در حال گذراندنِ ترم جاری وابسته‌اند (درس جاری «پاس‌شده» حساب نشده): ' + dep.join('، ') + '.'});
  }
  if(graduation && graduation.exceedsLimit) warnings.push({level:'error', text:'هشدار سنوات: طبق این برنامه فارغ‌التحصیلی در نیمسال ' + lastRegularNo + ' است و از سقف ۱۲ نیمسال (حداکثر سنوات کارشناسی پیوسته) می‌گذرد. با آموزش دانشکده دربارهٔ تابستان، افزایش سقف واحد یا مرخصی/سنوات تکمیلی مشورت کن.'});
  else if(graduation && graduation.atLimit) warnings.push({level:'warn', text:'احتمال اتمام سنوات: آخرین نیمسال برنامه همان نیمسال ۱۲ است و هیچ حاشیه‌ای برای عقب‌افتادن نداری. نیمسال‌های ۹ تا ۱۲ نیاز به درخواست افزایش سنوات و شهریه با نرخ ورودی جدید دارند.'});
  else if(graduation && graduation.needsExtension) warnings.push({level:'warn', text:'سنوات: ۸ نیمسال اول با شهریهٔ ورودی خودت است. این برنامه تا نیمسال ' + lastRegularNo + ' ادامه دارد؛ نیمسال‌های ۹ به بعد نیازمند «درخواست افزایش سنوات» (تا سقف ۱۲ نیمسال) و پرداخت شهریه با نرخ ورودی جدید همان سال است.'});
  if(profile.currentTerm > PLAN_RULES.maxRegularTerms) warnings.push({level:'error', text:'نیمسال فعلی (' + profile.currentTerm + ') از سقف ۱۲ نیمسال عادی بیشتر است؛ وضعیت سنوات را با آموزش بررسی کن.'});
  if(summerTerms.length) warnings.push({level:'info', text:'ترم تابستان اختیاری است، حذف و اضافه ندارد، در سنوات حساب نمی‌شود ولی نمراتش در معدل کل اثر دارد. ارائهٔ دروس تخصصی در تابستان قطعی نیست؛ در تابستان فقط دروس عمومی/معارف گذاشته شد' + (internshipPinned0 && terms.some(t=>t.kind==='summer' && t.hasInternship) ? ' (به‌جز کارآموزی/پروژهٔ ترم آخر که طبق انتخاب تو تابستانی است).' : '.')});
  const lastOnlyIds = nodes.filter(n=>n.lastOnly).map(n=>n.course.title);
  if(lastOnlyIds.length) warnings.push({level:'info', text:'طبق قوانین آموزشی، ' + lastOnlyIds.join(' و ') + ' فقط از نیمسال ' + PLAN_RULES.finalFrom + ' به بعد قابل اخذ است (یا در ترم ' + PLAN_RULES.lastTermMin + ' اگر همان ترم آخرت باشد)؛ در همین بازه قرار داده شد.'});
  if(terms.some(t=>t.hasInternship && t.kind==='regular')) warnings.push({level:'info', text:'در ترم کارآموزی فقط ۱۴ واحد درسی دیگر علاوه بر کارآموزی قابل‌اخذ است. کارآموزی را همان ترم به استاد مربوطه اطلاع بده؛ مهلت استاندارد تکمیل آن یک نیمسال است.'});
  if(terms.some(t=>t.hasInternship && t.kind==='summer')) warnings.push({level:'info', text:'کارآموزی در تابستان: مجموع واحدهای انتخابی با احتساب کارآموزی حداکثر ۶ واحد است. ارائهٔ کارآموزی/پروژه در تابستان باید با آموزش هماهنگ شود.'});
  const under = terms.filter(t=>t.underMin);
  if(under.length) warnings.push({level:'warn', text:'کمتر از حداقل ۱۲ واحد (حداقل انتخاب واحد دانشجوی عادی) در ' + under.map(planSlotLabel).join('، ') + ': به‌خاطر پیش‌نیازها درس بیشتری قابل‌اخذ نبود. برای این نیمسال‌ها از آموزش موافقت بگیر؛ درس خارج از چارت اخذ نشده است.'});
  const lettered = terms.filter(t=>t.letter);
  if(lettered.length) warnings.push({level:'info', text:'در ' + lettered.map(planSlotLabel).join('، ') + ' بیش از ۲ واحد معارف گذاشته شد؛ این کار نیازمند «نامهٔ مدیرگروه معارف» است (تا ۴ واحد معارف در هر نیمسال).'});
  if(lastTerm && lastTerm.isLast) warnings.push({level:'info', text:'برای ترم آخر قبل از انتخاب واحد «فرم ترم آخر» را تکمیل کن و مجوز انتخاب واحد را در آموزشیار ثبت کن.'});
  if(terms.some(t=>t.needsApproval)) warnings.push({level:'warn', text:'سقف ۱۰ واحد تابستانِ آخر نیازمند مراجعه به آموزش و دریافت مجوز است.'});
  if(internshipPinned0 && (state.elec.has('e52') || state.current.has('e52'))) warnings.push({level:'info', text:'کارآموزی را قبلاً گذرانده‌ای یا در حال گذراندنش هستی؛ گزینهٔ «کارآموزی در تابستان» اعمال نشد.'});
  const today = opts.today !== undefined ? opts.today : planToday();
  const expected = planExpectedTerm(profile, today);
  if(expected!==null && expected!==profile.currentTerm){
    warnings.push({level:'info', text:'با توجه به تاریخ امروز و سال/نیمسال ورود، نیمسال جاری باید «' + expected + '» باشد ولی «' + profile.currentTerm + '» وارد کرده‌ای. اگر مرخصی یا وقفه داشته‌ای طبیعی است؛ تاریخ‌ها بر اساس عددی که وارد کردی حساب شده‌اند.'});
  }

  // «معرفی به استاد»: فقط به‌عنوان گزینهٔ جدا، هرگز وارد برنامه نمی‌شود.
  // شرط‌ها: حداکثر ۸ واحد باقی‌مانده، همه نظری (بدون واحد عملی)، نه ورزش، نه کارآموزی.
  let instructorOption = null;
  if(lastTerm && lastTerm.isLast){
    const lastNodes = lastTerm.courseIds.map(id=>R.get(id)).filter(Boolean);
    const eligible = n => (n.course.p || 0) === 0 && n.id.indexOf('x_pe') !== 0 && n.id !== 'e52';
    if(lastNodes.length>0 && lastNodes.every(eligible) && lastTerm.units <= PLAN_RULES.instructorMaxUnits){
      const prev = terms.length>=2 ? terms[terms.length-2] : null;
      const prevCal = prev ? prev.cal : planTermCalendar(profile.entryYear, profile.entryTerm, profile.currentTerm);
      instructorOption = {
        units: lastTerm.units, courseIds: lastTerm.courseIds.slice(),
        channel: lastTerm.units <= 4 ? 'واحد امتحانات' : 'کارشناس گروه',
        afterLabel: prev ? planSlotLabel(prev) : 'نیمسال ' + profile.currentTerm,
        earlierDateText: 'حدود ' + planFmtDate(prevCal.end)
      };
    }
  }

  const sec0 = ctx.sections[0];
  return {
    version:1, track:ctx.track, status:{code:status.code, label:status.label, known:status.known},
    current:{termNo:profile.currentTerm, cal:planTermCalendar(profile.entryYear, profile.entryTerm, profile.currentTerm),
             courseIds: planAllCourses().filter(c=>isCurrentOnly(c.id)).map(c=>c.id), units: termLoadUnits()},
    terms, meta, blocked, graduation, warnings, instructorOption,
    delays: res.delays, blockedWhy: res.blockedWhy, letterHint, letterKeys,
    totals:{
      passedUnits: combinedPassedUnits(), currentUnits: currentUnits(), plannedUnits: plannedCredit,
      requiredTotal: groupsRequiredTotal(sec0.groups, sec0.courses) +
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

// تغییر ظرفیت انتخابیِ یک نیمسال (مستقل از بقیه) و محاسبهٔ دوبارهٔ برنامه
function planSetTermCap(key, value){
  if(!/^(r\d{1,2}|s\d{4})$/.test(key)) return false;
  if(value === null || value === undefined) delete state.termCaps[key];
  else {
    const v = Math.round(Number(value));
    if(!isFinite(v)) return false;
    state.termCaps[key] = Math.max(0, Math.min(PLAN_MAX_USER_CAP, v));
  }
  planRefresh();
  return true;
}
