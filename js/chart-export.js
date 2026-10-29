/* ============================= FULL CHART EXPORT ============================= */

function chartSections(){
  return [
    {label:'دروس پایه، اصلی و تخصصی - برق-' + TRACK_LABEL[currentTrack()], groups: trackGroups(), courses: trackCourses(), passed: state.elec},
    {label:'معارف اسلامی', groups: ISLAMIC_GROUPS, courses: ISLAMIC_COURSES, passed: state.islamic},
    {label:'دروس عمومی', groups: GENERAL_GROUPS, courses: GENERAL_COURSES, passed: state.general},
  ];
}

function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function reqTitleHtml(id, sec){
  const c = byId(sec.courses, id) || byId(ELEC_COURSES, id) || byId(ISLAMIC_COURSES, id) || byId(GENERAL_COURSES, id);
  const title = escapeHtml(c ? c.title : id);
  return pidPassed(id, sec.passed) ? '<span class="req-done">' + title + '</span>' : title;
}

function courseRowData(c, sec){
  const isP = sec.passed.has(c.id);
  const grade = state.grades[c.id];
  const gradeTxt = (isP && typeof grade==='number') ? String(grade) : '-';
  const tUnits = c.variableUnits ? '-' : (typeof c.u === 'number' ? c.u : (c.t||0));
  const pUnits = c.variableUnits ? '-' : (typeof c.u === 'number' ? '-' : (c.p||0));
  const preTxt = (c.pre && c.pre.length)
    ? c.pre.map(id=>reqTitleHtml(id, sec)).join('، ')
    : escapeHtml(c.preText || '-');
  const coTxt = (c.co && c.co.length)
    ? c.co.map(id=>reqTitleHtml(id, sec)).join('، ')
    : escapeHtml(c.coText || '-');
  return {isP, gradeTxt, tUnits, pUnits, preTxt, coTxt};
}

function buildChartBodyHTML(){
  let body = '';
  let grandGradedUnits = 0;
  let grandGradedWeighted = 0;
  chartSections().forEach(sec=>{
    body += `<h2>${sec.label}</h2>`;
    body += `<table><thead><tr>
      <th>ردیف</th><th>عنوان درس</th><th>کد درس</th><th>واحد نظری</th><th>واحد عملی</th>
      <th>پیش‌نیاز</th><th>هم‌نیاز</th><th>نمره</th></tr></thead><tbody>`;
    let rowNum = 1;
    sec.groups.forEach(g=>{
      const prog = groupProgress(g, sec.courses, sec.passed);
      body += `<tr class="group-caption-row"><td colspan="8">${g.title} - ${g.rule} (${prog.done}/${prog.total}${prog.unitsMode?' واحد':' درس'})</td></tr>`;
      g.ids.forEach(id=>{
        const c = byId(sec.courses, id);
        const {isP, gradeTxt, tUnits, pUnits, preTxt, coTxt} = courseRowData(c, sec);
        if(isP && typeof state.grades[c.id] === 'number' && !c.variableUnits){
          const u = (typeof c.u === 'number') ? c.u : ((c.t||0)+(c.p||0));
          grandGradedUnits += u;
          grandGradedWeighted += u * state.grades[c.id];
        }
        body += `<tr class="${isP?'passed':''}">
          <td class="row-num">${rowNum++}</td>
          <td class="title-cell">${escapeHtml(c.title)}</td>
          <td class="code-cell">${c.code ? escapeHtml(c.code) : '-'}</td>
          <td class="units-cell">${tUnits}</td>
          <td class="units-cell">${pUnits}</td>
          <td>${preTxt}</td>
          <td>${coTxt}</td>
          <td class="status-cell">${gradeTxt}</td>
        </tr>`;
      });
    });
    body += `</tbody></table>`;
  });
  const gpaTxt = grandGradedUnits > 0 ? (grandGradedWeighted / grandGradedUnits).toFixed(2) : 'ثبت نشده';
  body += `<table class="gpa-table"><tbody><tr class="gpa-row">
      <td class="gpa-label">معدل کل</td><td class="gpa-value">${gpaTxt}</td>
    </tr></tbody></table>`;
  body += buildPassedSummaryHTML();
  return body;
}

function buildPassedSummaryHTML(){
  function sumProgress(groups, courses, passedSet, title){
    let done = 0, total = 0;
    groups.forEach(g=>{
      if(g.kind==='countMin'){
        const list = g.ids.map(id=>byId(courses,id));
        done += list.filter(c=>passedSet.has(c.id)).reduce((s,c)=>s+creditUnitsOf(c),0);
        total += (typeof g.unitGoal==='number') ? g.unitGoal : g.min;
      }else{
        const prog = groupProgress(g, courses, passedSet);
        done += prog.done;
        total += prog.total;
      }
    });
    return {done, total, title};
  }
  function byIds(groups, ids){ return groups.filter(g=>ids.includes(g.id)); }

  const categories = [
    sumProgress(byIds(trackGroups(), ['basic']), trackCourses(), state.elec, 'دروس پایه'),
    sumProgress(byIds(trackGroups(), ['core']), trackCourses(), state.elec, 'دروس اصلی'),
    sumProgress(byIds(trackGroups(), ['reqspec','reqspecP']), trackCourses(), state.elec, 'دروس تخصصی الزامی'),
    sumProgress(byIds(trackGroups(), ['elecTheory','elecLab','powerTheory','powerLab']), trackCourses(), state.elec, 'دروس تخصصی انتخابی'),
    sumProgress(byIds(trackGroups(), ['skills']), trackCourses(), state.elec, 'دروس مهارتی - اشتغال‌پذیری'),
    sumProgress(byIds(trackGroups(), ['electives']), trackCourses(), state.elec, 'دروس تخصصی اختیاری'),
    sumProgress(ISLAMIC_GROUPS, ISLAMIC_COURSES, state.islamic, 'دروس معارف'),
    sumProgress(GENERAL_GROUPS, GENERAL_COURSES, state.general, 'دروس عمومی'),
  ];

  let rows = '';
  let grandDone = 0, grandTotal = 0;
  categories.forEach(cat=>{
    grandDone += cat.done;
    grandTotal += cat.total;
    rows += `<tr><td class="summary-label-cell">${escapeHtml(cat.title)}</td><td class="summary-value-cell">${cat.done} واحد از ${cat.total} واحد</td></tr>`;
  });
  rows += `<tr class="summary-total-row"><td class="summary-label-cell">جمع کل</td><td class="summary-value-cell">${grandDone} واحد از ${grandTotal} واحد</td></tr>`;
  return `<h2>خلاصهٔ واحدهای گذرانده</h2>
    <table class="summary-table"><tbody>${rows}</tbody></table>`;
}

function buildChartHTML(){
  const body = buildChartBodyHTML();
  const now = new Date().toLocaleDateString('fa-IR');
  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8">
<title>درختواره دروس</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body{font-family:'Vazirmatn',Tahoma,sans-serif;padding:26px;max-width:1000px;margin:0 auto;color:#111;line-height:1.6;
    -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact;}
  *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
  h1{font-size:22px;margin:0 0 2px;}
  .meta{color:#666;font-size:13px;margin:0 0 4px;}
  .meta:last-of-type{margin-bottom:22px;}
  h2{font-size:18px;margin-top:30px;border-bottom:2px solid #222;padding-bottom:6px;}
  table{width:100%;border-collapse:collapse;margin:0 0 20px;font-size:12.5px;}
  th,td{border:1px solid #999;padding:5px 7px;text-align:center;vertical-align:middle;}
  thead th{background:#e4e4e4;font-weight:700;}
  td.title-cell{text-align:right;font-weight:600;}
  td.code-cell{width:110px;font-size:11.5px;color:#555;direction:ltr;}
  td.row-num{width:30px;color:#555;}
  td.units-cell{width:40px;}
  tr.passed td{background:#eaf6ec;}
  tr.passed td.title-cell, tr.passed td.units-cell, tr.passed td.status-cell, tr.passed td.code-cell{color:#1e7d34;font-weight:700;}
  .req-done{color:#1e7d34;font-weight:700;}
  .group-caption-row td{background:#d8d8d8;font-weight:700;text-align:right;font-size:13px;}
  table.gpa-table{margin-top:-4px;}
  .gpa-row .gpa-label{background:#0d9488;color:#fff;font-weight:700;text-align:right;width:80%;}
  .gpa-row .gpa-value{background:#0d9488;color:#fff;font-weight:700;}
  table.summary-table{font-size:13px;}
  table.summary-table td{text-align:right;}
  .summary-label-cell{width:70%;font-weight:600;}
  .summary-value-cell{direction:rtl;text-align:right;color:#333;}
  .summary-total-row td{background:#eaeaea;font-weight:700;}
  .print-btn{position:fixed;top:14px;left:14px;padding:9px 16px;background:#0d9488;color:#fff;border:0;
    border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;}
  .credit-footer{text-align:center;font-size:10.5px;color:#999;margin-top:26px;}
  .credit-footer a{color:#0d9488;text-decoration:none;}
  
  @media print{
    html, body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
    .print-btn{display:none;}
    body{padding:0;}
    table{page-break-inside:auto;}
    tr{page-break-inside:avoid; page-break-after:auto;}
    thead{display:table-header-group;}
    h2{page-break-after:avoid;}
  }
</style></head><body>
<button class="print-btn" onclick="window.print()">چاپ / ذخیره PDF</button>
<h1>درختواره دروس</h1>
<div class="meta">تولید شده بر اساس درختواره الکترونیک 1403 - دانشگاه آزاد تهران شمال</div>
<div class="meta">تاریخ تولید: ${now}</div>
${body}
<div class="credit-footer">تولید شده توسط <a href="https://a4b3c.github.io/ee__azad/" target="_blank" rel="noopener">واحد یار</a> ❤️</div>
</body></html>`;
}

function openPrintFallback(){
  const html = buildChartHTML();
  const w = window.open('', '_blank');
  if(w){
    w.document.write(html);
    w.document.close();
    const triggerPrint = ()=>{ try{ w.focus(); w.print(); }catch(e){} };
    if(w.document.fonts && w.document.fonts.ready){
      w.document.fonts.ready.then(triggerPrint).catch(triggerPrint);
      setTimeout(triggerPrint, 1200);
    }else{
      setTimeout(triggerPrint, 600);
    }
  }else{
    alert('اجازهٔ باز کردن پنجرهٔ جدید داده نشد؛ لطفاً پاپ‌آپ رو برای این صفحه فعال کن.');
  }
}

function downloadChartPDF(){
  openPrintFallback();
}

document.getElementById('chartBtn').addEventListener('click', downloadChartPDF);
