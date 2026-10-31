/* ============================= SUGGESTIONS =============================
   منطق «پیشنهاد واحد این ترم» (فقط همین بخش؛ بقیهٔ برنامه تغییری نکرده).

   سه وضعیت کاملاً مستقل:  پاس‌شده  |  در حال گذراندن  |  باقی‌مانده
   - فقط درس پاس‌شده پیش‌نیاز را تأمین می‌کند؛ «در حال گذراندن» هرگز معادل پاس‌شده نیست.
   - درس در حال گذراندن دوباره پیشنهاد نمی‌شود و واحدش از ظرفیت ترم کم می‌شود.
   - هم‌نیازی که همین ترم در حال گذراندن است، درس را از پیشنهادها حذف نمی‌کند.
   - مجموع «در حال گذراندن + پیشنهادی» از TERM_MAX_UNITS بیشتر نمی‌شود.
   - پیشنهادهای ردشده در state.dismissed (localStorage) می‌مانند تا شرایط درس عوض شود
     یا کاربر بازیابی‌شان کند.
   ======================================================================= */

// سقف مجاز واحد در یک ترم عادی (فعلاً ثابت؛ در مرحلهٔ مشخصات تحصیلی به تنظیمات کاربر وصل می‌شود)
const TERM_MAX_UNITS = 20;

const EMPTY_SET = new Set();

function anyCourse(id){ return byId(ELEC_COURSES, id) || byId(ISLAMIC_COURSES, id) || byId(GENERAL_COURSES, id); }
// پاس‌شده؟ (در هر سه بخش، فقط تیک «گذرانده»)
function isPassedAny(id){ return pidPassed(id, EMPTY_SET); }
// در حال گذراندن؟ (و هنوز پاس نشده)
function isCurrentOnly(id){ return state.current.has(id) && !isPassedAny(id); }

// واحدهای درس‌های در حال گذراندن = بار فعلی ترم
function termLoadUnits(){
  let sum = 0;
  [ELEC_COURSES, ISLAMIC_COURSES, GENERAL_COURSES].forEach(list=>{
    list.forEach(c=>{ if(isCurrentOnly(c.id)) sum += unitsOf(c); });
  });
  return sum;
}

// اگه کاربر الان یک درس اختصاصی (غیر noLock) از یک گرایش رو در حال گذرونده، همون گرایش مبناست
function currentCourseTrack(){
  let e = false, p = false;
  ELEC_COURSES.forEach(c=>{
    if(c.trk && !c.noLock && isCurrentOnly(c.id)){ if(c.trk==='elec') e = true; else p = true; }
  });
  if(e && !p) return 'elec';
  if(p && !e) return 'power';
  return null;   // هیچ‌کدوم یا هر دو (ناسازگار) → به منطق قبلی برمی‌گردیم
}
// گرایش مبنای پیشنهادها: گرایش قفل‌شده > گرایش درس در حال گذراندن > گرایش انتخابی کاربر
function suggestionTrack(){ return lockedTrack() || currentCourseTrack() || currentTrack(); }

// «امضای شرایط» یک درس: وضعیت پیش‌نیاز/هم‌نیازها + گرایش مبنا (+ شرط حداقل واحد کل)
function reqSignature(course){
  const st = id => isPassedAny(id) ? 'P' : (isCurrentOnly(id) ? 'C' : 'N');
  const pre = (course.pre||[]).map(id=>id+':'+st(id)).join(',');
  const co = (course.co||[]).map(id=>id+':'+st(id)).join(',');
  const mt = course.minTotalUnits ? (combinedPassedUnits() >= course.minTotalUnits ? 'ok' : 'no') : '-';
  return pre + '|' + co + '|' + mt + '|' + suggestionTrack();
}

// ردشده‌هایی که شرایطشون عوض شده (یا درس پاس/جاری شده) خودکار از لیست حذف می‌شن
function pruneDismissed(){
  let changed = false;
  Object.keys(state.dismissed).forEach(id=>{
    const c = anyCourse(id);
    if(!c || isPassedAny(id) || state.current.has(id) || state.dismissed[id] !== reqSignature(c)){
      delete state.dismissed[id];
      changed = true;
    }
  });
  if(changed) saveState();
}

// درس‌هایی که در حال گذراندنند ولی پیش‌نیاز پاس‌نشده دارن — فقط اطلاع‌رسانی، هیچ اصلاح خودکاری انجام نمی‌شه
function currentPrereqWarnings(){
  const out = [];
  [ELEC_COURSES, ISLAMIC_COURSES, GENERAL_COURSES].forEach(list=>{
    list.forEach(c=>{
      if(!isCurrentOnly(c.id)) return;
      const missing = (c.pre||[]).filter(pid=>!isPassedAny(pid)).map(pid=>{ const p = anyCourse(pid); return p ? p.title : pid; });
      if(missing.length) out.push({title:c.title, missing});
    });
  });
  return out;
}

function computeTermSuggestions(){
  pruneDismissed();
  const track = suggestionTrack();
  const sections = [
    {key:'elec', groups: ALL_ELEC_GROUPS.filter(g=>!g.virtual && (!g.trk || g.trk===track)),
           courses: ELEC_COURSES.filter(c=>!c.trk || c.trk===track), set: state.elec},
    {key:'islamic', groups: ISLAMIC_GROUPS, courses: ISLAMIC_COURSES, set: state.islamic},
    {key:'general', groups: GENERAL_GROUPS, courses: GENERAL_COURSES, set: state.general}
  ];

  // ---- ۱) جمع‌آوری کاندیداها ----
  const cands = [];
  const candById = {};
  const need = {};   // سهمیهٔ باقی‌ماندهٔ هر گروه (بعد از کم کردن پاس‌شده‌ها و در حال گذراندن‌ها)
  sections.forEach(sec=>{
    sec.groups.forEach(group=>{
      const prog = groupProgress(group, sec.courses, sec.set);   // فقط پاس‌شده‌ها
      if(prog.complete) return;
      const curList = group.ids.filter(isCurrentOnly).map(id=>byId(sec.courses, id)).filter(Boolean);
      const cur = group.kind==='countMin' ? curList.length : curList.reduce((s,c)=>s+creditUnitsOf(c), 0);
      let remainNeed = Infinity;
      if(group.kind!=='all'){
        remainNeed = prog.total - prog.done - cur;
        if(remainNeed <= 0) return;   // با درس‌های در حال گذراندن سهمیه پر می‌شه؛ پاس‌شده حساب نمی‌شن، فقط پیشنهاد اضافه نمی‌دیم
      }
      need[sec.key+':'+group.id] = remainNeed;
      group.ids.forEach(id=>{
        const course = byId(sec.courses, id);
        if(!course || candById[id]) return;
        if(sec.set.has(id) || state.current.has(id)) return;                 // پاس‌شده یا در حال گذراندن → پیشنهاد نمی‌شه
        if(course.exclusiveWith && (isPassedAny(course.exclusiveWith) || state.current.has(course.exclusiveWith))) return;
        if(!prereqStatus(course, sec.set).ok) return;                         // پیش‌نیاز فقط با «پاس‌شده» تأمین می‌شه
        if(state.dismissed[id] !== undefined) return;                         // رد شده توسط کاربر

        const kind = group.kind==='all' ? 'mandatory' : 'quota';
        const uc = unlockCount(course, sec.courses, sec.set);
        const reasons = [];
        if(kind==='mandatory') reasons.push({text:'جزو دروس اجباری «' + group.title + '»ست.'});
        else reasons.push({text:'برای تکمیل سهمیهٔ «' + group.title + '» (' + prog.done + ' از ' + prog.total + (prog.unitsMode?' واحد':' درس') +
          (cur>0 ? '، به‌علاوهٔ ' + cur + (prog.unitsMode?' واحد':' درس') + ' در حال گذراندن' : '') + ').'});
        if(uc>0) reasons.push({text:'پیش‌نیاز ' + uc + ' درس دیگه است.'});

        const co = course.co || [];
        const pendingCo = co.filter(cid=>!isPassedAny(cid) && !state.current.has(cid));   // باید همراهش برداشته بشه
        const currentCo = co.filter(isCurrentOnly);                                       // همین ترم داره می‌گذرونه
        if(pendingCo.length){
          reasons.push({text:'باید همراه با «' + pendingCo.map(cid=>(anyCourse(cid)||{title:cid}).title).join('، ') + '» برداشته بشه.', warn:true});
        }
        if(currentCo.length){
          reasons.push({text:'هم‌نیازش «' + currentCo.map(cid=>(anyCourse(cid)||{title:cid}).title).join('، ') + '» همین ترم در حال گذراندنه.'});
        }
        const cand = {course, sec:sec.key, group, groupId:sec.key+':'+group.id, kind, uc, reasons, pendingCo};
        cands.push(cand);
        candById[id] = cand;
      });
    });
  });

  const rank = {mandatory:0, quota:1, optional:2};
  cands.sort((a,b)=>{
    if(rank[a.kind]!==rank[b.kind]) return rank[a.kind]-rank[b.kind];
    if(b.uc!==a.uc) return b.uc-a.uc;
    return unitsOf(b.course)-unitsOf(a.course);
  });

  // ---- ۲) انتخاب با رعایت سقف واحد ترم ----
  const load = termLoadUnits();
  let remaining = TERM_MAX_UNITS - load;
  const selected = new Set();
  const picked = [];

  // درس + هم‌نیازهای معوقش (به‌صورت بازگشتی). اگه یکی از هم‌نیازها قابل پیشنهاد نباشه، کل بسته رد می‌شه
  function bundleOf(c){
    const members = [], seen = new Set();
    let ok = true;
    (function visit(x){
      if(seen.has(x.course.id)) return;
      seen.add(x.course.id);
      members.push(x);
      x.pendingCo.forEach(cid=>{
        const d = candById[cid];
        if(!d){ ok = false; return; }
        visit(d);
      });
    })(c);
    return ok ? members : null;
  }

  cands.forEach(c=>{
    if(selected.has(c.course.id)) return;
    if(need[c.groupId] <= 0) return;
    const members = bundleOf(c);
    if(!members) return;
    const fresh = members.filter(m=>!selected.has(m.course.id));
    const units = fresh.reduce((s,m)=>s+unitsOf(m.course), 0);
    if(units > remaining) return;
    remaining -= units;
    fresh.forEach(m=>{
      selected.add(m.course.id);
      picked.push(m);
      need[m.groupId] -= (m.group.kind==='countMin' ? 1 : creditUnitsOf(m.course));
    });
  });

  const bySection = {elec:[], islamic:[], general:[]};
  picked.forEach(m=>bySection[m.sec].push(m));
  const suggestedUnits = picked.reduce((s,m)=>s+unitsOf(m.course), 0);
  return {track, cap:TERM_MAX_UNITS, load, suggestedUnits, remaining, bySection, warnings:currentPrereqWarnings()};
}

/* ------------------------------ رندر ------------------------------ */

function renderCapacityBox(res){
  const container = document.getElementById('suggest-capacity');
  if(!container) return;
  const over = res.load > res.cap;
  container.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'suggest-box';
  const warnHtml = res.warnings.map(w=>
    `<div class="suggest-item"><div class="body"><div class="r r-warn">• «${escapeHtml(w.title)}» در حال گذراندنه ولی پیش‌نیاز پاس‌نشده داره: ${escapeHtml(w.missing.join('، '))}. این وضعیت تغییر داده نشد و پیش‌نیاز تأمین‌شده حساب نمی‌شه.</div></div></div>`
  ).join('');
  box.innerHTML = `
    <div class="suggest-head">
      <div class="suggest-title-wrap">
        <div class="suggest-icon">📊</div>
        <div>
          <h2 class="suggest-h2">ظرفیت واحد این ترم</h2>
          <p class="suggest-sub">
            در حال گذراندن: <b class="num">${res.load}</b> واحد ·
            پیشنهادشده: <b class="num">${res.suggestedUnits}</b> واحد ·
            سقف: <b class="num">${res.cap}</b> واحد ·
            ${over ? 'از سقف <b class="num">' + (res.load - res.cap) + '</b> واحد بیشتر گرفته‌ای' : 'ظرفیت باقی‌مانده: <b class="num">' + res.remaining + '</b> واحد'}
          </p>
        </div>
      </div>
    </div>
    ${warnHtml ? '<div class="suggest-list">' + warnHtml + '</div>' : ''}
  `;
  container.appendChild(box);
}

function renderSuggestionSection(containerId, items, title, capNote, res){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'suggest-box';
  box.innerHTML = `
    <div class="suggest-head">
      <div class="suggest-title-wrap">
        <div class="suggest-icon">⚡</div>
        <div>
          <h2 class="suggest-h2">${escapeHtml(title || 'پیشنهاد هوشمند این ترم')}</h2>
          <p class="suggest-sub">${escapeHtml(capNote || 'بر اساس چارت، پیش‌نیازها و سهمیه باقی‌مانده مرتب‌شده است.')}</p>
        </div>
      </div>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'suggest-list';
  if(items.length===0){
    const empty = document.createElement('div');
    empty.className = 'suggest-empty';
    empty.innerHTML = res.remaining <= 0
      ? '<div><b>ظرفیت واحد این ترم پر است</b> — پیشنهاد جدیدی اضافه نمی‌شه.</div>'
      : '<div><b>پیشنهادی برای این بخش نیست</b> — یا دروس کامل شده‌اند، یا پیش‌نیاز درسی آماده نیست، یا ظرفیت باقی‌ماندهٔ ترم کافی نیست.</div>';
    list.appendChild(empty);
  }else{
    items.forEach(s=>{
      const item = document.createElement('div');
      item.className = 'suggest-item';
      const tag = document.createElement('span');
      tag.className = 'tag ' + s.kind;
      tag.textContent = s.kind==='mandatory' ? 'اجباری' : 'سهمیه‌ای';

      const body = document.createElement('div');
      body.className = 'body';
      const reasonHtml = s.reasons.map(r=>
        `<div class="r${r.warn ? ' r-warn' : ''}">• ${escapeHtml(r.text)}</div>`
      ).join('');
      const codeHtml = s.course.code ? ` <span class="s-units num">(${escapeHtml(s.course.code)})</span>` : '';
      body.innerHTML = `<div class="t">${escapeHtml(s.course.title)}${codeHtml} <span class="s-units">- ${unitsLabel(s.course)}</span></div>${reasonHtml}`;

      const dismissBtn = document.createElement('button');
      dismissBtn.className = 'dismiss-btn';
      dismissBtn.title = 'حذف از پیشنهادات (از پایین همین صفحه قابل بازیابی است)';
      dismissBtn.textContent = '✕';
      dismissBtn.addEventListener('click', ()=>{
        state.dismissed[s.course.id] = reqSignature(s.course);
        saveState();
        renderAll();
      });
      item.appendChild(tag);
      item.appendChild(body);
      item.appendChild(dismissBtn);
      list.appendChild(item);
    });
  }
  box.appendChild(list);
  container.appendChild(box);
}

function renderDismissedBox(){
  const container = document.getElementById('suggest-dismissed');
  if(!container) return;
  container.innerHTML = '';
  const ids = Object.keys(state.dismissed).filter(id=>anyCourse(id));
  if(ids.length===0) return;
  const box = document.createElement('div');
  box.className = 'suggest-box';
  box.innerHTML = `
    <div class="suggest-head">
      <div class="suggest-title-wrap">
        <div class="suggest-icon">🗂</div>
        <div>
          <h2 class="suggest-h2">پیشنهادهای حذف‌شده (<span class="num">${ids.length}</span>)</h2>
          <p class="suggest-sub">تا وقتی بازیابی نکنی برنمی‌گردن؛ فقط اگه وضعیت پیش‌نیاز یا هم‌نیاز درس عوض بشه خودکار برمی‌گردن.</p>
        </div>
      </div>
    </div>
  `;
  const list = document.createElement('div');
  list.className = 'suggest-list';
  ids.forEach(id=>{
    const c = anyCourse(id);
    const item = document.createElement('div');
    item.className = 'suggest-item';
    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = `<div class="t">${escapeHtml(c.title)} <span class="s-units">- ${unitsLabel(c)}</span></div>`;
    const btn = document.createElement('button');
    btn.className = 'restore-btn';
    btn.textContent = 'بازیابی';
    btn.addEventListener('click', ()=>{
      delete state.dismissed[id];
      saveState();
      renderAll();
    });
    item.appendChild(body);
    item.appendChild(btn);
    list.appendChild(item);
  });
  box.appendChild(list);
  const all = document.createElement('button');
  all.className = 'restore-btn restore-all';
  all.textContent = 'بازیابی همه';
  all.addEventListener('click', ()=>{
    state.dismissed = {};
    saveState();
    renderAll();
  });
  box.appendChild(all);
  container.appendChild(box);
}

function renderTermSuggestions(){
  const res = computeTermSuggestions();
  renderCapacityBox(res);
  renderSuggestionSection('suggest-elec', res.bySection.elec, 'برق - ' + TRACK_LABEL[res.track], undefined, res);
  renderSuggestionSection('suggest-islamic', res.bySection.islamic, 'معارف اسلامی',
    'سقف انتخاب معارف در هر ترم عادی ۲ واحد است (با مجوز مدیر گروه حداکثر ۴ واحد).', res);
  renderSuggestionSection('suggest-general', res.bySection.general, 'دروس عمومی', undefined, res);
  renderDismissedBox();
}
