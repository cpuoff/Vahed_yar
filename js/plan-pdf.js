/* ============================= PLAN PDF (خروجی PDF برنامه تحصیلی) =============================
   مثل «دانلود چارت»: یک سند چاپی ساخته می‌شود و پنجرهٔ چاپ مرورگر باز می‌شود (Save as PDF).
   اگه پنجرهٔ جدید بلاک شد از یک iframe نامرئی استفاده می‌کنیم. کاملاً آفلاین و بدون کتابخانه. */

function planPdfDepText(id, tIdx, terms, placedAt){
  const c = anyCourse(id);
  if(!c) return '';
  const nm = pid => (anyCourse(pid) || {title:pid}).title;
  const mark = (pid, isCo)=>{
    if(isPassedAny(pid)) return nm(pid) + ' (پاس‌شده)';
    if(state.current.has(pid)) return nm(pid) + ' (در حال گذراندن؛ مشروط به پاس شدن)';
    const at = placedAt[pid];
    if(at !== undefined){
      if(at === tIdx && isCo) return nm(pid) + ' (همین نیمسال)';
      if(at < tIdx) return nm(pid) + ' (برنامه: ' + planTermShort(terms[at]) + ')';
    }
    return nm(pid) + ' (در برنامه نیست)';
  };
  const parts = [];
  (c.pre || []).forEach(p=>parts.push('پیش‌نیاز: ' + mark(p, false)));
  (c.co || []).forEach(p=>parts.push('هم‌نیاز: ' + mark(p, true)));
  if(c.minTotalUnits) parts.push('حداقل ' + c.minTotalUnits + ' واحد گذرانده');
  return parts.length ? parts.map(escapeHtml).join('<br>') : 'بدون پیش‌نیاز';
}

function buildPlanPdfHtml(d, profile){
  const now = new Date().toLocaleDateString('fa-IR');
  const t = d.totals, grad = d.graduation;
  const placedAt = {};
  d.terms.forEach((tm, i)=>tm.courseIds.forEach(id=>{ placedAt[id] = i; }));
  const swaps = (state.planSwaps || []);

  let body = '';
  // ---- خلاصه ----
  body += '<table class="summary"><tbody>' +
    '<tr><td class="lbl">واحدهای گذرانده</td><td>' + t.passedUnits + '</td><td class="lbl">واحدهای در حال گذراندن</td><td>' + t.currentUnits + '</td></tr>' +
    '<tr><td class="lbl">واحدهای باقی‌مانده (برنامه‌ریزی‌شده)</td><td>' + t.plannedUnits + '</td><td class="lbl">کل واحدهای چارت</td><td>' + t.requiredTotal + '</td></tr>' +
    '<tr><td class="lbl">نیمسال‌های لازم</td><td>' + t.regularTermsRemaining + (t.summerTermsUsed ? ' (+ ' + t.summerTermsUsed + ' تابستان)' : '') + '</td>' +
    '<td class="lbl">نیمسال/تاریخ احتمالی فارغ‌التحصیلی</td><td class="grad">' + (grad ? escapeHtml(grad.termLabel) + ' — ' + escapeHtml(grad.dateText) : 'قابل محاسبه نیست') + '</td></tr>' +
    '</tbody></table>';

  // ---- نیمسال جاری ----
  body += '<h2>نیمسال جاری (' + d.current.termNo + ') — ' + escapeHtml(d.current.cal.label) + '</h2>';
  if(d.current.courseIds.length){
    body += '<table><thead><tr><th>ردیف</th><th>درس</th><th>واحد</th><th>وضعیت</th></tr></thead><tbody>';
    d.current.courseIds.forEach((id, i)=>{
      const c = anyCourse(id); if(!c) return;
      body += '<tr><td class="n">' + (i+1) + '</td><td class="ti">' + escapeHtml(c.title) + '</td><td>' + escapeHtml(String(unitsOf(c))) + '</td><td>در حال گذراندن</td></tr>';
    });
    body += '</tbody></table>';
  }else body += '<p class="muted">درسی با وضعیت «در حال گذراندن» علامت نخورده است.</p>';

  // ---- نیمسال‌ها ----
  d.terms.forEach((tm, i)=>{
    const key = planTermKeyOf(tm);
    const title = tm.kind==='summer' ? 'ترم تابستان (اختیاری)' : 'نیمسال ' + tm.termNo;
    const flags = [];
    if(tm.isLast) flags.push('ترم آخر');
    if(tm.letter) flags.push('با نامهٔ مدیرگروه معارف');
    if(tm.beyond) flags.push('خارج از سنوات (بیش از ۱۲ نیمسال)');
    else if(tm.extension) flags.push('سنوات تمدیدی: درخواست + نرخ ورودی جدید');
    if(tm.underMin) flags.push('کمتر از حداقل ۱۲ واحد');
    const sel = tm.selectedCap !== undefined ? tm.selectedCap : tm.cap;
    body += '<div class="term"><h2>' + title + ' — ' + escapeHtml(tm.cal.label) + (tm.kind==='regular' ? ' (' + escapeHtml(tm.cal.monthLabel) + ')' : '') + '</h2>';
    body += '<div class="stats">مجموع: <b>' + tm.units + '</b> واحد' + (tm.exemptUnits ? ' (شامل ' + tm.exemptUnits + ' واحد مازاد بر سقف)' : '') +
      ' &nbsp;|&nbsp; ظرفیت انتخابی: <b>' + sel + '</b>' + (tm.capAuto ? ' (خودکار)' : '') +
      ' &nbsp;|&nbsp; سقف قانونی: <b>' + (tm.legalCap !== undefined ? tm.legalCap : tm.cap) + '</b>' + ((tm.altCap || 0) > (tm.legalCap || 0) ? ' (تا ' + tm.altCap + ' با معدل الف)' : '') +
      ' &nbsp;|&nbsp; باقی‌مانده پس از این نیمسال: <b>' + tm.remainingAfter + '</b> واحد' +
      (flags.length ? '<br><span class="flag">' + flags.map(escapeHtml).join(' · ') + '</span>' : '') + '</div>';
    body += '<table><thead><tr><th>ردیف</th><th>درس</th><th>واحد</th><th>نوع</th><th>پیش‌نیاز / هم‌نیاز (وضعیت)</th></tr></thead><tbody>';
    tm.courseIds.forEach((id, j)=>{
      const c = anyCourse(id);
      const m = (d.meta && d.meta[id]) || {kind:'mandatory', exempt:false};
      const types = [m.kind==='quota' ? 'سهمیه‌ای' : 'اجباری'];
      if(m.exempt && tm.exemptUnits > 0) types.push('مازاد بر سقف');
      if(swaps.some(r=>r.inn===id && r.key===key)) types.push('جایگزین‌شده');
      body += '<tr><td class="n">' + (j+1) + '</td><td class="ti">' + escapeHtml(c ? c.title : id) + '</td><td>' + (c ? escapeHtml(String(unitsOf(c))) : '-') + '</td><td>' + escapeHtml(types.join('، ')) + '</td><td class="dep">' + planPdfDepText(id, i, d.terms, placedAt) + '</td></tr>';
    });
    if(!tm.courseIds.length) body += '<tr><td colspan="5" class="muted">در این نیمسال درس جدیدی قابل برنامه‌ریزی نیست.</td></tr>';
    body += '</tbody></table></div>';
  });

  // ---- جایگزینی‌ها ----
  if(swaps.length){
    body += '<h2>جایگزینی‌های دستی</h2><ul>' + swaps.map(r=>'<li>' + escapeHtml(planKeyLabel(r.key)) + ': «' + escapeHtml(planTitle(r.inn)) + '» به‌جای «' + escapeHtml(planTitle(r.out)) + '»</li>').join('') + '</ul>';
  }
  // ---- معرفی به استاد ----
  if(d.instructorOption){
    const io = d.instructorOption;
    body += '<h2>گزینهٔ جداگانه: معرفی به استاد</h2><p>در آخرین نیمسال فقط ' + io.units + ' واحد نظری مانده است (' + io.courseIds.map(id=>escapeHtml(planTitle(id))).join('، ') + '). ' +
      'در صورت داشتن شرایط می‌توانی به‌جای ترم آخر عادی از مسیر «معرفی به استاد» (مرجع: ' + escapeHtml(io.channel) + ') اقدام کنی و بعد از ثبت نمرات «' + escapeHtml(io.afterLabel) + '» (' + escapeHtml(io.earlierDateText) + ') فارغ‌التحصیل شوی. این گزینه وارد برنامه نشده است.</p>';
  }
  // ---- هشدارها ----
  const order = {error:0, warn:1, info:2};
  const warns = d.warnings.slice().sort((a,b)=>order[a.level]-order[b.level]);
  if(warns.length){
    body += '<h2>هشدارها و نکته‌ها</h2><ul class="warns">' + warns.map(w=>'<li class="' + w.level + '">' + escapeHtml(w.text) + '</li>').join('') + '</ul>';
  }
  body += '<p class="disc"><b>توجه:</b> این برنامه فقط یک نقشهٔ پیشنهادی برای فارغ‌التحصیلی است. الگوی قطعی ارائهٔ دروس تخصصی در نیمسال‌های مهر/بهمن (و تابستان) مشخص نیست و فرض نشده؛ ارائهٔ واقعی هر درس را حتماً با چارت ارائه‌شدهٔ دانشگاه و آموزش دانشکده تطبیق بده. تاریخ‌ها تقریبی‌اند.</p>';

  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8">
<title>برنامه تحصیلی پیشنهادی</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page{ size:A4; margin:12mm; }
  *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; box-sizing:border-box; }
  body{ font-family:'Vazirmatn',Tahoma,sans-serif; color:#111; line-height:1.7; margin:0; padding:18px; max-width:900px; margin-inline:auto; font-size:12.5px; }
  h1{ font-size:21px; margin:0 0 2px; }
  .meta{ color:#555; font-size:12px; margin:0 0 3px; }
  h2{ font-size:15px; margin:18px 0 6px; border-bottom:2px solid #222; padding-bottom:4px; }
  table{ width:100%; border-collapse:collapse; margin:0 0 8px; font-size:11.5px; }
  th,td{ border:1px solid #999; padding:4px 6px; text-align:center; vertical-align:middle; }
  thead th{ background:#e4e4e4; }
  td.ti{ text-align:right; font-weight:600; } td.dep{ text-align:right; font-size:10.5px; color:#333; } td.n{ width:28px; color:#555; }
  .summary td.lbl{ background:#f0f0f0; font-weight:700; text-align:right; width:28%; } .summary td.grad{ font-weight:800; color:#0f766e; }
  .stats{ background:#f5f5f5; border:1px solid #ddd; padding:6px 8px; margin-bottom:6px; font-size:12px; }
  .flag{ color:#b45309; font-weight:700; }
  .term{ break-inside:avoid; page-break-inside:avoid; }
  .muted{ color:#777; } .disc{ margin-top:16px; font-size:11px; border:1px solid #f0c36d; background:#fff8e6; padding:8px; }
  ul.warns li.error{ color:#b91c1c; font-weight:700; } ul.warns li.warn{ color:#92400e; } ul.warns li{ margin-bottom:3px; font-size:11.5px; }
  .print-btn{ position:fixed; top:12px; left:12px; padding:9px 16px; background:#0d9488; color:#fff; border:0; border-radius:8px; font-family:inherit; font-weight:700; cursor:pointer; }
  @media print{ .print-btn{ display:none; } body{ padding:0; } }
</style></head><body>
<button class="print-btn" onclick="window.print()">چاپ / ذخیره PDF</button>
<h1>برنامه تحصیلی پیشنهادی تا فارغ‌التحصیلی</h1>
<div class="meta">تاریخ تهیه: ${now}</div>
<div class="meta">گرایش: ${escapeHtml(TRACK_LABEL[d.track])} &nbsp;|&nbsp; ورود: ${escapeHtml(profile.entryTerm==='bahman' ? 'بهمن' : 'مهر')} ${profile.entryYear} &nbsp;|&nbsp; نیمسال فعلی: ${profile.currentTerm}</div>
${body}
</body></html>`;
}

function printPlanHtmlInFrame(html){
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(frame);
  const w = frame.contentWindow;
  w.document.open(); w.document.write(html); w.document.close();
  w.onafterprint = ()=>frame.remove();
  const go = ()=>{ try{ w.focus(); w.print(); }catch(e){} setTimeout(()=>{ if(frame.parentNode) frame.remove(); }, 120000); };
  if(w.document.fonts && w.document.fonts.ready){ w.document.fonts.ready.then(go).catch(go); setTimeout(go, 1500); }
  else setTimeout(go, 700);
}

function printPlanPdf(){
  if(!state.profile || !state.plan) return;
  if(state.plan.sig !== planInputSig(state.profile)) planRefresh();   // نسخهٔ قدیمی چاپ نشود
  const html = buildPlanPdfHtml(state.plan.data, state.profile);
  const w = window.open('', '_blank');
  if(w){
    w.document.write(html);
    w.document.close();
    const go = ()=>{ try{ w.focus(); w.print(); }catch(e){} };
    if(w.document.fonts && w.document.fonts.ready){ w.document.fonts.ready.then(go).catch(go); setTimeout(go, 1500); }
    else setTimeout(go, 700);
  }else{
    printPlanHtmlInFrame(html);   // پنجرهٔ جدید بلاک شد
  }
}
const planPdfBtnEl = document.getElementById('planPdfBtn');
if(planPdfBtnEl) planPdfBtnEl.addEventListener('click', printPlanPdf);
