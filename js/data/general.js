const GENERAL_COURSES = [
  {id:'x_farsi', title:'فارسی عمومی', code:'90029', u:3, pre:[]},
  {id:'x_lang_pre', title:'زبان پیش‌دانشگاهی', code:'99093', u:2, pre:[], excludeFromTotal:true, note:'واحد جبرانی است؛ در مجموع ۱۴۴ واحد فارغ‌التحصیلی محاسبه نمی‌شود، فقط پیش‌نیاز زبان ترکیبی ۱ است.'},
  {id:'x_lang1', title:'زبان ترکیبی ۱', code:'99090', u:1, pre:['x_lang_pre']},
  {id:'x_lang2', title:'زبان ترکیبی ۲', code:'99091', u:1, pre:['x_lang1']},
  {id:'x_lang3', title:'زبان ترکیبی ۳', code:'99092', u:1, pre:['x_lang2']},
  {id:'x_pe1', title:'تربیت بدنی', code:'93425', t:0.5, p:0.5, pre:[]},
  {id:'x_pe2', title:'ورزش ۱', code:'99062', p:1, pre:['x_pe1']},
  {id:'x_vasaya', title:'اندیشه‌ها و وصایای امام خمینی (ره)', code:'99073', u:1, pre:[]},
];

const GENERAL_GROUPS = [
  {id:'gen_core', title:'دروس عمومی - سایر', rule:'همه اجباری', kind:'all', ids:['x_farsi','x_pe1','x_pe2','x_vasaya']},
  {id:'gen_lang', title:'زبان عمومی', rule:'همه اجباری (پیش‌دانشگاهی جبرانیه و در جمع واحد حساب نمی‌شه)', kind:'all', ids:['x_lang_pre','x_lang1','x_lang2','x_lang3']},
];
