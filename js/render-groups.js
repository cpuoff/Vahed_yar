function renderGroups(containerId, groups, courses, passedSet, setKey){
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  groups.forEach(group=>{
    const prog = group.virtual ? {done:0,total:0,complete:false,unitsMode:true} : groupProgress(group, courses, passedSet);
    const details = document.createElement('details');
    details.className = 'group' + (setKey==='elec' ? ' tk-' + (group.trk || 'common') : '');
    // Collapse complete groups by default
    details.open = !prog.complete;

    const summary = document.createElement('summary');
    const gLeft = document.createElement('div');
    gLeft.className = 'g-left';
    const gTitle = document.createElement('div');
    gTitle.className = 'g-title';
    gTitle.innerHTML = escapeHtml(group.title) + (prog.complete ? ' <span class="complete-badge">✓ کامل شد</span>' : '');
    const gRule = document.createElement('div');
    gRule.className = 'g-rule';
    gRule.textContent = group.rule;
    gLeft.appendChild(gTitle);
    gLeft.appendChild(gRule);

    const gProgress = document.createElement('div');
    gProgress.className = 'g-progress';
    const barTrack = document.createElement('div');
    barTrack.className = 'bar-track mini';
    const barFill = document.createElement('div');
    barFill.className = 'bar-fill';
    const pct = Math.min(100, Math.round((prog.done/Math.max(prog.total,1))*100));
    barFill.style.width = pct + '%';
    barTrack.appendChild(barFill);
    const gNum = document.createElement('div');
    gNum.className = 'g-num';
    gNum.innerHTML = '<span class="num">' + prog.done + ' / ' + prog.total + '</span> ' + (prog.unitsMode ? 'واحد' : 'درس');
    gProgress.appendChild(barTrack);
    gProgress.appendChild(gNum);

    const chev = document.createElement('span');
    chev.className = 'g-chev';
    chev.innerHTML = '▾';

    summary.appendChild(gLeft);
    if(!group.virtual) summary.appendChild(gProgress);
    summary.appendChild(chev);
    details.appendChild(summary);

    const warnMsg = exclusivityWarning(group, passedSet);
    if(warnMsg){
      const w = document.createElement('div');
      w.className = 'g-warn';
      w.textContent = '⚠ ' + warnMsg;
      details.appendChild(w);
    }

    const body = document.createElement('div');
    body.className = 'g-body';
    
    group.ids.forEach(id=>{
      const course = byId(courses, id);
      body.appendChild(renderCourseRow(course, courses, passedSet, setKey));
    });

    details.appendChild(body);
    container.appendChild(details);
  });
}

function renderSummary(containerId, groups, courses, passedSet, sectionLabel){
  const container = document.getElementById(containerId);
  const totalDone = courses.reduce((s,c)=> passedSet.has(c.id) ? s+creditUnitsOf(c) : s, 0);
  const totalAll = groupsRequiredTotal(groups, courses);
  const pct = Math.min(100, Math.round(totalDone / Math.max(totalAll,1) * 100));
  container.innerHTML = `
    <div class="section-summary-pill">
      <div class="s-summary-info">
        <span class="s-summary-title">پیشرفت ${sectionLabel}</span>
        <span class="s-summary-nums"><b class="num">${totalDone}</b> / <span class="num">${totalAll}</span> واحد (<span class="num">${pct}%</span>)</span>
      </div>
      <div class="bar-track mini">
        <div class="bar-fill" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}
