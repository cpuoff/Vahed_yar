function renderTrackNote(){
  document.querySelectorAll('.sub-pill').forEach(b=>b.classList.toggle('active', b.dataset.sub===state.elecSub));
  const el = document.getElementById('elec-track-note');
  const lt = lockedTrack();
  let msg;
  if(hasBothTracks()) msg = '⚠ از هر دو گرایش درس اختصاصی گذروندی؛ طبق مقررات فقط یک گرایش مجازه. آمار بر اساس گرایش ' + TRACK_LABEL[lt] + ' حساب می‌شه.';
  else if(lt) msg = 'گرایش فعلی: ' + TRACK_LABEL[lt] + ' (چون درس اختصاصی این گرایش رو گذرونده‌ای، درس‌های گرایش دیگه غیرقابل اخذ شدن).';
  else msg = 'هنوز درس اختصاصی هیچ گرایشی رو نگذرونده‌ای؛ آمار و پیشنهادها بر اساس گرایش ' + TRACK_LABEL[currentTrack()] + ' حساب می‌شه (آخرین گرایشی که بازش کردی).';
  el.textContent = msg;
  el.className = 'track-note' + (hasBothTracks() ? ' warn' : '');
}

function renderAll(){
  renderMasterSummary();

  renderTrackNote();
  renderSummary('elec-summary', trackGroups(), trackCourses(), state.elec, 'برق-' + TRACK_LABEL[currentTrack()]);
  renderSuggestions('suggest-elec', trackGroups(), trackCourses(), state.elec, 'elec', undefined, 'برق - ' + TRACK_LABEL[currentTrack()]);
  renderGroups('elec-groups', viewGroups(), ELEC_COURSES, state.elec, 'elec', state.elecSub !== 'common');

  renderSummary('islamic-summary', ISLAMIC_GROUPS, ISLAMIC_COURSES, state.islamic, 'معارف اسلامی');
  renderSuggestions('suggest-islamic', ISLAMIC_GROUPS, ISLAMIC_COURSES, state.islamic, 'islamic',
    'سقف انتخاب معارف در هر ترم عادی ۲ واحد است (با مجوز مدیر گروه حداکثر ۴ واحد).', 'معارف اسلامی');
  renderGroups('islamic-groups', ISLAMIC_GROUPS, ISLAMIC_COURSES, state.islamic, 'islamic');

  renderSummary('general-summary', GENERAL_GROUPS, GENERAL_COURSES, state.general, 'دروس عمومی');
  renderSuggestions('suggest-general', GENERAL_GROUPS, GENERAL_COURSES, state.general, 'general', undefined, 'دروس عمومی');
  renderGroups('general-groups', GENERAL_GROUPS, GENERAL_COURSES, state.general, 'general');
}
