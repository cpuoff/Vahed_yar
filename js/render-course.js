function unitsLabel(course){
  if(course.variableUnits) return 'واحد: متغیر';
  let base;
  if(typeof course.u === 'number'){
    base = '<span class="num">' + course.u + '</span> واحد';
  }else{
    const parts = [];
    if(course.t) parts.push('<span class="num">' + course.t + '</span> نظری');
    if(course.p) parts.push('<span class="num">' + course.p + '</span> عملی');
    base = parts.length ? parts.join(' + ') : '-';
  }
  if(course.excludeFromTotal) base += ' · جبرانی';
  return base;
}

function titleOf(list, id){ const c = byId(list,id); return c?c.title:id; }

function coursesRequiring(course, courses){
  const all = [...ELEC_COURSES, ...ISLAMIC_COURSES, ...GENERAL_COURSES];
  return all.filter(c => (c.pre||[]).includes(course.id));
}

function relChip(c, passedSet){
  const isDone = pidPassed(c.id, passedSet);
  return `<div class="rel-chip"><span class="rc-title">${escapeHtml(c.title)}</span>` +
    `<span class="rc-tag ${isDone?'done':'todo'}">${isDone?'گذرانده':'گذرانده نشده'}</span></div>`;
}

function openRelationshipSheet(course, courses, passedSet){
  const pre = (course.pre||[]).map(id=>byId(courses,id) || byId(ELEC_COURSES,id) || byId(ISLAMIC_COURSES,id) || byId(GENERAL_COURSES,id)).filter(Boolean);
  const co = (course.co||[]).map(id=>byId(courses,id) || byId(ELEC_COURSES,id) || byId(ISLAMIC_COURSES,id) || byId(GENERAL_COURSES,id)).filter(Boolean);
  const dependents = coursesRequiring(course, courses);

  const overlay = document.createElement('div');
  overlay.className = 'rel-overlay';
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) overlay.remove(); });

  const sheet = document.createElement('div');
  sheet.className = 'rel-sheet';

  const sectionsHtml = [];

  sectionsHtml.push(`<div class="rel-section"><h4>پیش‌نیاز این درس</h4>` +
    (pre.length || course.preText
      ? `<div class="rel-chips">${pre.map(c=>relChip(c, passedSet)).join('')}${course.preText && !pre.length ? `<div class="rel-empty">${escapeHtml(course.preText)}</div>` : ''}</div>`
      : `<div class="rel-empty">پیش‌نیازی ندارد</div>`) +
    `</div>`);

  sectionsHtml.push(`<div class="rel-section"><h4>هم‌نیاز این درس</h4>` +
    (co.length || course.coText
      ? `<div class="rel-chips">${co.map(c=>relChip(c, passedSet)).join('')}${course.coText && !co.length ? `<div class="rel-empty">${escapeHtml(course.coText)}</div>` : ''}</div>`
      : `<div class="rel-empty">هم‌نیازی ندارد</div>`) +
    `</div>`);

  sectionsHtml.push(`<div class="rel-section"><h4>درس‌هایی که این درس پیش‌نیازشونه</h4>` +
    (dependents.length
      ? `<div class="rel-chips">${dependents.map(c=>relChip(c, passedSet)).join('')}</div>`
      : `<div class="rel-empty">پیش‌نیاز هیچ درسی نیست</div>`) +
    `</div>`);

  sheet.innerHTML = `
    <div class="rel-head">
      <div>
        <div class="rel-title">${escapeHtml(course.title)}</div>
        ${course.code ? `<div class="rel-code num">کد درس: ${escapeHtml(course.code)}</div>` : ''}
      </div>
      <button type="button" class="rel-close" aria-label="بستن">✕</button>
    </div>
    ${sectionsHtml.join('')}
  `;
  sheet.querySelector('.rel-close').addEventListener('click', ()=>overlay.remove());

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
}

function renderCourseRow(course, courses, passedSet, setKey){
  const status = courseStatus(course, passedSet);
  const passed = status==='passed';
  const div = document.createElement('div');
  const isCurrent = status==='current';
  div.className = 'course' + (passed ? ' is-passed' : '') + (isCurrent ? ' is-current' : '') + (setKey==='elec' ? ' tk-' + (course.trk || 'common') : '');

  const stamp = document.createElement('div');
  stamp.className = 'stamp';
  stamp.title = passed ? 'علامت‌گذاری به‌عنوان خوانده‌نشده' : 'علامت‌گذاری به‌عنوان گذرانده';
  stamp.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  stamp.addEventListener('click', (e)=>{
    e.stopPropagation();
    const set = state[setKey];
    if(set.has(course.id)) set.delete(course.id);
    else { set.add(course.id); state.current.delete(course.id); }
    saveState();
    renderAll();
  });

  const body = document.createElement('div');
  body.className = 'c-body';

  const top = document.createElement('div');
  top.className = 'c-top';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'c-title-group';

  const title = document.createElement('span');
  title.className = 'c-title';
  title.textContent = course.title;
  title.addEventListener('click', ()=>stamp.click());

  titleGroup.appendChild(title);
  if(course.code){
    const code = document.createElement('span');
    code.className = 'c-code num';
    code.textContent = course.code;
    titleGroup.appendChild(code);
  }

  const metaBadges = document.createElement('div');
  metaBadges.className = 'c-badges';

  const units = document.createElement('span');
  units.className = 'c-units';
  units.innerHTML = unitsLabel(course);

  const badge = document.createElement('span');
  badge.className = 'c-status ' + status;
  if (status === 'passed') {
    badge.innerHTML = '✓ گذرانده';
  } else if (status === 'current') {
    badge.innerHTML = '⏳ در حال گذراندن';
  } else if (status === 'avail') {
    badge.innerHTML = '● قابل اخذ';
  } else {
    badge.innerHTML = '✗ غیرقابل اخذ';
  }

  const infoBtn = document.createElement('button');
  infoBtn.type = 'button';
  infoBtn.className = 'c-info-btn';
  infoBtn.setAttribute('aria-label', 'روابط پیش‌نیازی درس');
  infoBtn.innerHTML = '⋮';
  infoBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    openRelationshipSheet(course, courses, passedSet);
  });

  metaBadges.appendChild(units);
  metaBadges.appendChild(badge);
  if(!passed){
    const curBtn = document.createElement('button');
    curBtn.type = 'button';
    curBtn.className = 'c-cur-btn' + (isCurrent ? ' on' : '');
    curBtn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
    curBtn.textContent = isCurrent ? '✕ لغو' : '⏳ این ترم';
    curBtn.title = isCurrent ? 'حذف از درس‌های در حال گذراندن' : 'علامت‌گذاری به‌عنوان در حال گذراندن (این ترم)';
    curBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      if(state.current.has(course.id)) state.current.delete(course.id); else state.current.add(course.id);
      saveState();
      renderAll();
    });
    metaBadges.appendChild(curBtn);
  }
  metaBadges.appendChild(infoBtn);

  top.appendChild(titleGroup);
  top.appendChild(metaBadges);
  body.appendChild(top);

  if(!passed){
    const {missing} = prereqStatus(course, passedSet);
    if(missing.length){
      const meta = document.createElement('div');
      meta.className = 'c-meta';
      meta.innerHTML = '<span class="meta-label">پیش‌نیاز باقی‌مانده:</span> ' + missing.join('، ');
      body.appendChild(meta);
    }
  }
  if(course.co && course.co.length){
    const meta = document.createElement('div');
    meta.className = 'c-meta';
    meta.innerHTML = '<span class="meta-label">هم‌نیاز:</span> ' + course.co.map(id=>titleOf(courses,id)).join('، ');
    body.appendChild(meta);
  }
  if(course.coText){
    const meta = document.createElement('div');
    meta.className = 'c-meta';
    meta.innerHTML = '<span class="meta-label">هم‌نیاز:</span> ' + course.coText;
    body.appendChild(meta);
  }
  if(course.preText){
    const meta = document.createElement('div');
    meta.className = 'c-meta';
    meta.innerHTML = '<span class="meta-label">پیش‌نیاز:</span> ' + course.preText;
    body.appendChild(meta);
  }
  if(course.note){
    const note = document.createElement('div');
    note.className = 'c-note';
    note.textContent = course.note;
    body.appendChild(note);
  }

  if(passed){
    const gradeWrap = document.createElement('div');
    gradeWrap.className = 'grade-wrap';
    const label = document.createElement('label');
    label.textContent = 'نمره (اختیاری):';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0'; input.max = '20'; input.step = '0.25';
    input.className = 'grade-input';
    input.placeholder = '-';
    const existing = state.grades[course.id];
    if(typeof existing === 'number') input.value = existing;
    input.addEventListener('change', ()=>{
      const v = parseFloat(input.value);
      if(isNaN(v)){ delete state.grades[course.id]; }
      else{ state.grades[course.id] = Math.max(0, Math.min(20, v)); }
      saveState();
      renderAll();
    });
    gradeWrap.appendChild(label);
    gradeWrap.appendChild(input);
    body.appendChild(gradeWrap);
  }

  div.appendChild(stamp);
  div.appendChild(body);
  return div;
}
