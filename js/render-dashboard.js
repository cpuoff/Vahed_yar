function renderMasterSummary(){
  const container = document.getElementById('master-summary');
  if(!container) return;
  const elecTotal = groupsRequiredTotal(trackGroups(), trackCourses());
  const islamicTotal = groupsRequiredTotal(ISLAMIC_GROUPS, ISLAMIC_COURSES);
  const generalTotal = groupsRequiredTotal(GENERAL_GROUPS, GENERAL_COURSES);
  const grandTotal = elecTotal + islamicTotal + generalTotal;
  const done = combinedPassedUnits();
  const curUnits = currentUnits();
  const {gpa, gradedUnits, gradedCount, ungradedCount} = computeGPA();
  const pct = Math.min(100, Math.round(done / Math.max(grandTotal, 1) * 100));

  container.innerHTML = `
    <div class="dash-card">
      <div class="dash-header">
        <div class="dash-title">داشبورد وضعیت تحصیلی</div>
        <div class="dash-badge"><span class="num">${pct}%</span> پیشرفت کل</div>
      </div>
      <div class="dash-stats">
        <div class="stat-box">
          <div class="stat-label">معدل کل</div>
          <div class="stat-val primary">${gpa !== null ? gpa.toFixed(2) : '-'}</div>
          <div class="stat-sub">${[gradedCount ? `${gradedCount} درس نمره‌دار` : '', ungradedCount ? `${ungradedCount} بدون نمره` : ''].filter(Boolean).join(' · ') || 'ثبت نشده'}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">واحد گذرانده</div>
          <div class="stat-val success"><span class="num">${done}</span></div>
          <div class="stat-sub">${curUnits ? ` · <span class="cur-sub"><span class="num">${curUnits}</span> در حال گذراندن</span>` : ''}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">کل واحدها</div>
          <div class="stat-val"><span class="num">${grandTotal}</span></div>
          <div class="stat-sub">دوره چارت</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">واحد باقی‌مانده</div>
          <div class="stat-val warning"><span class="num">${Math.max(0, grandTotal - done)}</span></div>
          <div class="stat-sub">تا فارغ‌التحصیلی</div>
        </div>
      </div>
      <div class="progress-wrap">
        <div class="bar-track">
          <div class="bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    </div>
  `;
}

const dismissed = { elec: new Set(), islamic: new Set(), general: new Set() };
