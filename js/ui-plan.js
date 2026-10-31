/* ============================= PLAN PAGE (برنامه تحصیلی من) =============================
   صفحهٔ جدید با هش #plan (از منوی همبرگری باز می‌شه). داده‌ها از state.profile / state.plan
   (localStorage) میان؛ منطق برنامه‌ریزی در planner.js ـه.
   ساختار برنامه (state.plan.data.terms[].courseIds) برای ویرایش در مراحل بعد آماده است. */

const pagePlan = document.getElementById('page-plan');
const planBody = document.getElementById('plan-body');

function planFaToEn(s){
  return String(s).replace(/[۰-۹]/g, d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫', '.').replace('،', '.').replace(',', '.');
}
function planEl(tag, cls, html){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(html !== undefined) e.innerHTML = html;
  return e;
}
function planBox(icon, title, sub){
  const box = planEl('div', 'suggest-box');
  box.innerHTML = `
    <div class="suggest-head">
      <div class="suggest-title-wrap">
        <div class="suggest-icon">${icon}</div>
        <div>
          <h2 class="suggest-h2">${title}</h2>
          ${sub ? '<p class="suggest-sub">' + sub + '</p>' : ''}
        </div>
      </div>
    </div>`;
  return box;
}

/* ---------------------------- فرم پروفایل ---------------------------- */
function planStatusText(gpaVal){
  const g = planGpaStatus(gpaVal);
  const caps = {probation:'سقف ۱۴ واحد', alef:'تا ۲۴ واحد', normal:'سقف ۲۰ واحد'};
  return g.known ? ('وضعیت: <b>' + g.label + '</b> — ' + caps[g.code]) : 'معدل وارد نشده؛ وضعیت عادی (سقف ۲۰ واحد) فرض می‌شود.';
}
function renderPlanForm(){
  const p = state.profile || {entryYear:'', entryTerm:'mehr', currentTerm:'', lastGpa:null, includeSummer:false, summerInternship:false, assumeStatusPersists:false, projectCurrent:true};
  const track = suggestionTrack();
  const box = planBox('🧾', 'اطلاعات تحصیلی', 'فقط روی همین دستگاه ذخیره می‌شود.');
  const form = planEl('div', 'plan-form-wrap');
  form.innerHTML = `
    <div class="plan-form">
      <label class="plan-field"><span>سال ورود (شمسی)</span>
        <input id="pf-year" class="plan-input num" type="text" inputmode="numeric" placeholder="مثلاً ۱۴۰۲" value="${p.entryYear}"></label>
      <label class="plan-field"><span>نیمسال ورود</span>
        <select id="pf-term" class="plan-input">
          <option value="mehr"${p.entryTerm==='mehr'?' selected':''}>مهر</option>
          <option value="bahman"${p.entryTerm==='bahman'?' selected':''}>بهمن</option>
        </select></label>
      <label class="plan-field"><span>شمارهٔ نیمسال فعلی</span>
        <input id="pf-cur" class="plan-input num" type="text" inputmode="numeric" placeholder="مثلاً ۷" value="${p.currentTerm}"></label>
      <label class="plan-field"><span>معدل نیمسال گذشته</span>
        <input id="pf-gpa" class="plan-input num" type="text" inputmode="decimal" placeholder="مثلاً ۱۵.۵" value="${p.lastGpa===null?'':p.lastGpa}"></label>
    </div>
    <div id="pf-status" class="plan-status">${planStatusText(p.lastGpa)}</div>
    <div class="plan-track">گرایش: <b>${escapeHtml(TRACK_LABEL[track])}</b> <span class="plan-muted">(از تنظیمات گرایش برنامه خوانده شد)</span></div>
    <label class="plan-check"><input type="checkbox" id="pf-summer"${p.includeSummer?' checked':''}>
      <span>ترم تابستان در برنامه استفاده شود <small>(اختیاری؛ در سنوات حساب نمی‌شود)</small></span></label>
    <label class="plan-check plan-sub" id="pf-intern-wrap"><input type="checkbox" id="pf-intern"${p.summerInternship?' checked':''}${p.includeSummer?'':' disabled'}>
      <span>کارآموزی را در تابستان می‌گذرانم <small>(سقف تابستان ۸ واحد)</small></span></label>
    <label class="plan-check"><input type="checkbox" id="pf-persist"${p.assumeStatusPersists?' checked':''}>
      <span>وضعیت مشروطی/معدل الف در همهٔ نیمسال‌های آینده هم ادامه دارد <small>(پیش‌فرض: فقط نیمسال اول برنامه)</small></span></label>
    <label class="plan-check"><input type="checkbox" id="pf-project"${p.projectCurrent!==false?' checked':''}>
      <span>ادامهٔ برنامه با فرض پاس شدن درس‌های ترم جاری <small>(درس جاری «پاس‌شده» حساب نمی‌شود؛ وابسته‌هایش با برچسب «مشروط» می‌آیند. خاموش = وابسته‌ها برنامه‌ریزی نمی‌شوند)</small></span></label>
    <div id="pf-errors" class="plan-note error" style="display:none"></div>
    <div class="toolbar"><button id="pf-save" class="tool-btn primary">ذخیره و ساخت برنامه</button></div>`;
  box.appendChild(form);

  const $ = id => form.querySelector('#' + id);
  const readGpa = () => { const t = planFaToEn($('pf-gpa').value).trim(); return t==='' ? null : parseFloat(t); };
  $('pf-gpa').addEventListener('input', ()=>{ const v = readGpa(); $('pf-status').innerHTML = planStatusText(isNaN(v) ? null : v); });
  $('pf-summer').addEventListener('change', ()=>{
    $('pf-intern').disabled = !$('pf-summer').checked;
    if(!$('pf-summer').checked) $('pf-intern').checked = false;
  });
  $('pf-save').addEventListener('click', ()=>{
    const prof = {
      entryYear: parseInt(planFaToEn($('pf-year').value), 10),
      entryTerm: $('pf-term').value,
      currentTerm: parseInt(planFaToEn($('pf-cur').value), 10),
      lastGpa: readGpa(),
      includeSummer: $('pf-summer').checked,
      summerInternship: $('pf-summer').checked && $('pf-intern').checked,
      assumeStatusPersists: $('pf-persist').checked,
      projectCurrent: $('pf-project').checked
    };
    if(prof.lastGpa !== null && isNaN(prof.lastGpa)) prof.lastGpa = -1;   // نامعتبر → خطای اعتبارسنجی
    const errs = planValidateProfile(prof);
    const errBox = $('pf-errors');
    if(errs.length){ errBox.innerHTML = errs.map(e=>'• ' + escapeHtml(e)).join('<br>'); errBox.style.display = 'block'; return; }
    errBox.style.display = 'none';
    state.profile = prof;
    planRefresh();
    renderPlanPage();
    const s = document.getElementById('plan-summary');
    if(s) s.scrollIntoView({behavior:'smooth', block:'start'});
  });
  return box;
}

/* ---------------------------- نمایش برنامه ---------------------------- */
function planTermShort(t){ return t.kind==='summer' ? 'تابستان ' + t.cal.year : 'نیمسال ' + t.termNo; }

function planDepLine(id, tIdx, terms, placedAt){
  const c = anyCourse(id);
  if(!c) return '';
  const nm = pid => { const p = anyCourse(pid); return escapeHtml(p ? p.title : pid); };
  const mark = (pid, isCo)=>{
    if(isPassedAny(pid)) return '<span class="dep ok">✓ ' + nm(pid) + ' (پاس‌شده)</span>';
    if(state.current.has(pid)) return '<span class="dep cur">⏳ ' + nm(pid) + ' (در حال گذراندن — مشروط به پاس شدن)</span>';
    const at = placedAt[pid];
    if(at !== undefined){
      if(at === tIdx && isCo) return '<span class="dep co">🤝 ' + nm(pid) + ' (همین نیمسال)</span>';
      if(at < tIdx) return '<span class="dep plan">📅 ' + nm(pid) + ' (برنامه: ' + planTermShort(terms[at]) + ')</span>';
    }
    return '<span class="dep bad">⚠ ' + nm(pid) + ' (در برنامه نیست)</span>';
  };
  const parts = [];
  (c.pre || []).forEach(pid=>parts.push('پیش‌نیاز: ' + mark(pid, false)));
  (c.co || []).forEach(pid=>parts.push('هم‌نیاز: ' + mark(pid, true)));
  if(c.minTotalUnits) parts.push('<span class="dep plan">🔢 حداقل ' + c.minTotalUnits + ' واحد گذرانده</span>');
  if(!parts.length) parts.push('<span class="dep ok">بدون پیش‌نیاز</span>');
  return parts.map(x=>'<div class="r">' + x + '</div>').join('');
}

function planCourseItem(id, tIdx, terms, placedAt, meta){
  const c = anyCourse(id);
  const item = planEl('div', 'suggest-item');
  if(!c){ item.innerHTML = '<div class="body"><div class="t">' + escapeHtml(id) + '</div></div>'; return item; }
  const m = (meta && meta[id]) || {kind:'mandatory', exempt:false};
  const tags = [];
  tags.push('<span class="tag ' + (m.kind==='quota' ? 'quota' : 'mandatory') + '">' + (m.kind==='quota' ? 'سهمیه‌ای' : 'اجباری') + '</span>');
  const term = terms[tIdx];
  if(m.exempt && term.exemptUnits > 0) tags.push('<span class="tag extra">مازاد بر سقف</span>');
  const code = c.code ? ' <span class="s-units num">(' + escapeHtml(c.code) + ')</span>' : '';
  const side = planEl('div', 'plan-tags', tags.join(''));
  const body = planEl('div', 'body',
    '<div class="t">' + escapeHtml(c.title) + code + ' <span class="s-units">- ' + unitsLabel(c) + '</span></div>' + planDepLine(id, tIdx, terms, placedAt));
  item.appendChild(side);
  item.appendChild(body);
  return item;
}

function renderPlanResult(plan, profile){
  const d = plan.data;
  const frag = document.createDocumentFragment();

  // قدیمی بودن
  if(plan.sig !== planInputSig(profile)){
    const stale = planEl('div', 'plan-note warn', 'تیک دروس، گرایش یا اطلاعات تحصیلی بعد از ساخت این برنامه عوض شده؛ برنامه را به‌روز کن. ');
    const b = planEl('button', 'tool-btn primary plan-inline-btn', 'به‌روزرسانی برنامه');
    b.addEventListener('click', ()=>{ planRefresh(); renderPlanPage(); });
    stale.appendChild(b);
    frag.appendChild(stale);
  }

  // خلاصه
  const t = d.totals;
  const sum = planBox('📊', 'خلاصهٔ مسیر تا فارغ‌التحصیلی', 'گرایش ' + escapeHtml(TRACK_LABEL[d.track]) + ' · وضعیت: ' + escapeHtml(d.status.label));
  sum.id = 'plan-summary';
  const grad = d.graduation;
  const gradHtml = grad
    ? `<div class="plan-grad${grad.exceedsLimit ? ' bad' : ''}">
         <div class="plan-grad-l">فارغ‌التحصیلی احتمالی</div>
         <div class="plan-grad-v">${escapeHtml(grad.dateText)}</div>
         <div class="plan-grad-s">${escapeHtml(grad.termLabel)} · نیمسال شمارهٔ ${grad.lastRegularTermNo}${grad.slotKind==='summer' ? ' (ترم تابستان بعد از آن)' : ''}${grad.atCurrentTerm ? ' · با پاس شدن همین ترم' : ''}</div>
       </div>`
    : `<div class="plan-grad bad"><div class="plan-grad-l">فارغ‌التحصیلی احتمالی</div><div class="plan-grad-v">قابل محاسبه نیست</div><div class="plan-grad-s">${d.blocked.length ? 'برای بعضی دروس برنامه‌ای پیدا نشد (هشدارها را ببین).' : 'همهٔ دروس چارت پاس شده‌اند یا درسی برای برنامه‌ریزی نمانده.'}</div></div>`;
  const stats = planEl('div', 'plan-stats',
    `<div class="plan-stat"><div class="l">گذرانده</div><div class="v ok num">${t.passedUnits}</div></div>
     <div class="plan-stat"><div class="l">در حال گذراندن</div><div class="v cur num">${t.currentUnits}</div></div>
     <div class="plan-stat"><div class="l">باقی‌مانده</div><div class="v num">${t.plannedUnits}</div></div>
     <div class="plan-stat"><div class="l">کل چارت</div><div class="v num">${t.requiredTotal}</div></div>
     <div class="plan-stat"><div class="l">نیمسال لازم</div><div class="v num">${t.regularTermsRemaining}${t.summerTermsUsed ? '<small> +' + t.summerTermsUsed + ' تابستان</small>' : ''}</div></div>`);
  const inner = planEl('div', 'plan-sum-body');
  inner.innerHTML = gradHtml;
  inner.appendChild(stats);
  inner.appendChild(planEl('div', 'plan-muted plan-foot', 'واحد باقی‌مانده یعنی دروسی که نه پاس شده‌اند نه در حال گذراندن. تاریخ‌ها تقریبی‌اند (فرض: پایان نیمسال اول = ۳۰ دی، نیمسال دوم = ۳۱ خرداد، تابستان = ۳۱ مرداد).'));
  sum.appendChild(inner);
  frag.appendChild(sum);

  // هشدارها
  const warns = d.warnings.slice().sort((a,b)=>({error:0, warn:1, info:2}[a.level]) - ({error:0, warn:1, info:2}[b.level]));
  if(warns.length){
    const wb = planEl('div', 'plan-notes');
    warns.forEach(w=>wb.appendChild(planEl('div', 'plan-note ' + w.level, escapeHtml(w.text))));
    frag.appendChild(wb);
  }
  // معرفی به استاد
  if(d.instructorOption){
    const names = d.instructorOption.courseIds.map(id=>{ const c = anyCourse(id); return c ? escapeHtml(c.title) : escapeHtml(id); }).join('، ');
    frag.appendChild(planEl('div', 'plan-note info',
      '<b>گزینهٔ جداگانه: «معرفی به استاد»</b><br>در آخرین نیمسال برنامه فقط <b class="num">' + d.instructorOption.units + '</b> واحد نظری مانده (' + names + '). ممکن است بتوانی مسیر «معرفی به استاد» را بررسی کنی؛ شرایطش را حتماً از آموزش بپرس. این گزینه به‌صورت خودکار وارد برنامه نشده است.'));
  }

  // نیمسال جاری
  const curBox = planBox('⏳', 'نیمسال جاری (' + d.current.termNo + ')', escapeHtml(d.current.cal.label) + ' · ' + d.current.units + ' واحد در حال گذراندن');
  const curList = planEl('div', 'suggest-list');
  if(d.current.courseIds.length===0) curList.appendChild(planEl('div', 'suggest-empty', '<div>درسی با وضعیت «در حال گذراندن» علامت نخورده است.</div>'));
  d.current.courseIds.forEach(id=>{
    const c = anyCourse(id); if(!c) return;
    const it = planEl('div', 'suggest-item');
    it.appendChild(planEl('div', 'plan-tags', '<span class="tag cur">در حال گذراندن</span>'));
    it.appendChild(planEl('div', 'body', '<div class="t">' + escapeHtml(c.title) + ' <span class="s-units">- ' + unitsLabel(c) + '</span></div>'));
    curList.appendChild(it);
  });
  curBox.appendChild(curList);
  frag.appendChild(curBox);

  // نیمسال‌ها
  const placedAt = {};
  d.terms.forEach((tm, i)=>tm.courseIds.forEach(id=>{ placedAt[id] = i; }));
  d.terms.forEach((tm, i)=>{
    const title = tm.kind==='summer' ? 'ترم تابستان (اختیاری)' : 'نیمسال ' + tm.termNo;
    const sub = escapeHtml(tm.cal.label) + (tm.kind==='regular' ? ' · ' + escapeHtml(tm.cal.monthLabel) : '') + (tm.isLast ? ' · <b>ترم آخر</b>' : '');
    const box = planBox(tm.kind==='summer' ? '☀️' : '📅', title, sub);
    const unitsTxt = tm.units + ' واحد' + (tm.exemptUnits ? ' (شامل ' + tm.exemptUnits + ' واحد مازاد بر سقف)' : '');
    box.appendChild(planEl('div', 'plan-term-stats',
      `<span>مجموع: <b class="num">${unitsTxt}</b></span>
       <span>سقف مجاز: <b class="num">${tm.cap}</b> واحد</span>
       <span>باقی‌مانده پس از این نیمسال: <b class="num">${tm.remainingAfter}</b> واحد</span>`));
    box.appendChild(planEl('div', 'plan-muted plan-capnote', escapeHtml(tm.capNote) + (tm.needsApproval ? ' — نیازمند مجوز آموزش' : '')));
    const list = planEl('div', 'suggest-list');
    if(tm.courseIds.length===0) list.appendChild(planEl('div', 'suggest-empty', '<div>در این نیمسال درس جدیدی قابل برنامه‌ریزی نیست.</div>'));
    tm.courseIds.forEach(id=>list.appendChild(planCourseItem(id, i, d.terms, placedAt, d.meta)));
    box.appendChild(list);
    frag.appendChild(box);
  });

  frag.appendChild(planEl('div', 'plan-note warn',
    '<b>توجه:</b> این برنامه فقط یک نقشهٔ پیشنهادی برای فارغ‌التحصیلی است. الگوی قطعی ارائهٔ دروس تخصصی در نیمسال‌های مهر/بهمن (و تابستان) مشخص نیست و فرض نشده؛ ارائهٔ واقعی هر درس را حتماً با چارت ارائه‌شدهٔ دانشگاه و آموزش دانشکده تطبیق بده.'));
  return frag;
}

function renderPlanPage(){
  if(!pagePlan || pagePlan.style.display === 'none') return;
  planBody.innerHTML = '';
  planBody.appendChild(renderPlanForm());
  if(state.profile && state.plan){
    planBody.appendChild(renderPlanResult(state.plan, state.profile));
  }else if(state.profile){
    planBody.appendChild(planEl('div', 'plan-note info', 'برنامه‌ای ساخته نشده؛ روی «ذخیره و ساخت برنامه» بزن.'));
  }else{
    planBody.appendChild(planEl('div', 'plan-note info', 'اطلاعات بالا را وارد کن تا برنامهٔ نیمسال‌های باقی‌مانده ساخته شود. گرایش و وضعیت دروس از خود برنامه خوانده می‌شوند و دوباره پرسیده نمی‌شوند.'));
  }
}

/* ---------------------------- باز/بسته شدن صفحه ---------------------------- */
let planPushed = false;
function applyPlanView(){
  const open = location.hash === '#plan';
  pagePlan.style.display = open ? 'block' : 'none';
  document.body.style.overflow = (open || location.hash === '#suggest') ? 'hidden' : '';
  if(open){ renderPlanPage(); pagePlan.scrollTop = 0; }
}
function openPlanPage(){ planPushed = true; location.hash = 'plan'; }
function closePlanPage(){
  if(planPushed){ planPushed = false; history.back(); }
  else { history.replaceState(null, '', location.pathname + location.search); applyPlanView(); }
}
document.getElementById('menuPlanBtn').addEventListener('click', ()=>{ closeMenu(); openPlanPage(); });
document.getElementById('planBackBtn').addEventListener('click', closePlanPage);
window.addEventListener('hashchange', applyPlanView);
applyPlanView();
