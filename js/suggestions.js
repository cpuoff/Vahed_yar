function buildSuggestions(groups, courses, passedSet, dismissedSet){
  const suggestions = [];
  groups.forEach(group=>{
    const prog = groupProgress(group, courses, passedSet);
    if(prog.complete) return;
    group.ids.forEach(id=>{
      const course = byId(courses, id);
      if(passedSet.has(course.id)) return;
      if(state.current.has(course.id)) return;
      if(dismissedSet && dismissedSet.has(course.id)) return;
      const {ok} = prereqStatus(course, passedSet);
      if(!ok) return;
      const kind = group.kind==='all' ? 'mandatory' : 'quota';
      const uc = unlockCount(course, courses, passedSet);
      const reasons = [];
      if(kind==='mandatory') reasons.push({text:'جزو دروس اجباری «' + group.title + '»ست.'});
      else reasons.push({text:'برای تکمیل سهمیهٔ «' + group.title + '» (' + prog.done + ' از ' + prog.total + (prog.unitsMode?' واحد':' درس') + ').'});
      if(uc>0) reasons.push({text:'پیش‌نیاز ' + uc + ' درس دیگه است.'});
      const pendingCo = (course.co||[]).filter(cid=>!passedSet.has(cid));
      if(pendingCo.length){
        const coTitles = pendingCo.map(cid=>titleOf(courses,cid)).join('، ');
        reasons.push({text:'باید همراه با «' + coTitles + '» برداشته بشه.', warn:true});
      }
      suggestions.push({course, kind, uc, reasons, pendingCo});
    });
  });
  const rank = {mandatory:0, quota:1, optional:2};
  suggestions.sort((a,b)=>{
    if(rank[a.kind]!==rank[b.kind]) return rank[a.kind]-rank[b.kind];
    if(b.uc!==a.uc) return b.uc-a.uc;
    return unitsOf(b.course)-unitsOf(a.course);
  });

  const suggestedIds = new Set(suggestions.map(s=>s.course.id));
  const pairedCount = {};
  const filtered = suggestions.filter(s=>{
    if(s.pendingCo.length===0) return true;
    const allReachable = s.pendingCo.every(cid=>suggestedIds.has(cid));
    if(!allReachable) return false;
    for(const cid of s.pendingCo){
      if(pairedCount[cid]) return false;
    }
    s.pendingCo.forEach(cid=>{ pairedCount[cid] = (pairedCount[cid]||0) + 1; });
    return true;
  });

  return filtered.slice(0,6);
}

function renderSuggestions(containerId, groups, courses, passedSet, key, capNote){
  const container = document.getElementById(containerId);
  const top = buildSuggestions(groups, courses, passedSet, dismissed[key]);
  container.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'suggest-box';
  box.innerHTML = `
    <div class="suggest-head">
      <div class="suggest-title-wrap">
        <div class="suggest-icon">⚡</div>
        <div>
          <h2 class="suggest-h2">پیشنهاد هوشمند این ترم</h2>
          <p class="suggest-sub">${escapeHtml(capNote || 'بر اساس چارت، پیش‌نیازها و سهمیه باقی‌مانده مرتب‌شده است.')}</p>
        </div>
      </div>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'suggest-list';
  if(top.length===0){
    const empty = document.createElement('div');
    empty.className = 'suggest-empty';
    empty.innerHTML = '<div><b>پیشنهادی برای این بخش نیست</b> — یا دروس کامل شده‌اند یا پیش‌نیاز درسی آماده نیست.</div>';
    list.appendChild(empty);
  }else{
    top.forEach(s=>{
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
      dismissBtn.title = 'حذف موقت از پیشنهادات';
      dismissBtn.textContent = '✕';
      dismissBtn.addEventListener('click', ()=>{
        dismissed[key].add(s.course.id);
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
