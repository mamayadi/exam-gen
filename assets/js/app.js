'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const AR_ORDINALS = [
  'الأول','الثاني','الثالث','الرابع','الخامس',
  'السادس','السابع','الثامن','التاسع','العاشر'
];

let _nextId = 1;
function gid() { return _nextId++; }

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

/** @type {{ model: string, header: object, sections: Array }} */
let S = {
  model: 'C',
  header: {
    teacherGender: 'أستاذة',
    teacherName: '',
    duration: '30',
    examType: 'الفرض العادي',
    examNumber: '1',
    subject: 'التاريخ',
    level: 'التاسعة أساسي',
    yearStart: new Date().getFullYear(),
  },
  sections: [],
  seq: null,              // 1, 2, 3… added to the name when an exam with the same name exists (see computeSeq)
  docId: null,            // id in the library (null = never saved)
  decor: defaultDecor(),  // Model C watermark
  opts: defaultOpts()     // options shared by all models
};

function defaultDecor() {
  return { watermark: 'europe', imageData: null, imageName: '' };
}

function defaultOpts() {
  // bw: black & white rendering (default — the exams are printed and photocopied in B&W)
  return { icons: true, closing: 'بالتوفيق والنجاح', bw: true };
}

// Template registry — order = order in the picker
const MODELS = [
  { id: 'C', label: 'مزخرف',         gen: genExamC },
  { id: 'D', label: 'مخطوطة',      gen: genExamD },
  { id: 'I', label: 'الكرة الأرضية',          gen: genExamI },
  { id: 'J', label: 'قرطاج',       gen: genExamJ },
  { id: 'K', label: 'أنيق',        gen: genExamK },
  { id: 'M', label: 'روما',           gen: genExamM },
  { id: 'N', label: 'الجم',         gen: genExamN },
  { id: 'G', label: 'الخط الزمني',   gen: genExamG },
  { id: 'H', label: 'أرشيف',       gen: genExamH },
  { id: 'A', label: 'كلاسيكي',      gen: genExamA },
  { id: 'B', label: 'عصري',        gen: genExamB },
];
const DECO_MODELS = ['C','D','G','H','I','J','K','M','N'];   // full-page decorated templates

function defaultSections() {
  return [
    { id: gid(), points: 6,  questions: [] },
    { id: gid(), points: 12, questions: [] }
  ];
}

function defaultParams(type) {
  switch (type) {
    case 'paragraph':   return { lines: 12 };
    case 'definition':  return { lines: 3 };
    case 'timeline':    return { count: 4, events: [] };
    case 'map':         return { imageData: null, imageName: '', imageWidth: '100%', legendCount: 0 };
    case 'table':       return { cols: 3, rows: 3, cellHeight: 2, headers: [], cells: [] };
    default:            return {};
  }
}

function newQuestion(type = 'paragraph') {
  return { id: gid(), type, text: '', points: 0, params: defaultParams(type) };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL (TEMPLATE) SELECTION
// ─────────────────────────────────────────────────────────────────────────────

// Switch template only — sections and questions are kept
function selectModel(model) {
  S.model = model;
  renderAll();
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function totalPoints() {
  return S.sections.reduce((t, s) => t + (parseFloat(s.points) || 0), 0);
}

function sectionQTotal(section) {
  return section.questions.reduce((t, q) => t + (parseFloat(q.points) || 0), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER ALL
// ─────────────────────────────────────────────────────────────────────────────

function renderAll() {
  renderFormBody();
  renderFormFooter();
  renderExam();
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM — BODY
// ─────────────────────────────────────────────────────────────────────────────

function renderFormBody() {
  document.getElementById('form-body').innerHTML = buildFormBodyHTML();
}

function buildFormBodyHTML() {
  let h = '';
  h += `
  <div class="form-card title-card">
    <div class="form-card-body">
      <div id="title-preview" class="title-preview" dir="rtl">${esc(examTitle())}</div>
    </div>
  </div>`;
  h += buildModelPickerHTML();
  h += buildHeaderFormHTML();
  h += '<div id="secs-container">';
  S.sections.forEach((sec, si) => { h += buildSectionFormHTML(sec, si); });
  h += '</div>';
  h += `<div style="text-align:center;margin:12px 0 4px">
    <button class="btn btn-primary btn-sm" onclick="addSection()">＋ إضافة قسم</button>
  </div>`;
  return h;
}

function buildModelPickerHTML() {
  const thumbs = getModelThumbs();
  const cards = MODELS.map(({ id, label }) => `
    <button type="button" class="model-opt ${S.model === id ? 'active' : ''}" onclick="selectModel('${id}')">
      <div class="model-thumb">${thumbs[id]}</div>
      <div class="model-opt-label">${S.model === id ? '✓ ' : ''}${label}</div>
    </button>`).join('');

  const o = S.opts;
  const closings = ['', 'بالتوفيق والنجاح', 'بالتوفيق للجميع', 'عمل موفق'];

  const current = (MODELS.find(m => m.id === S.model) || MODELS[0]).label;

  return `
  <details class="form-card picker-card" ${_pickerOpen ? 'open' : ''} ontoggle="_pickerOpen=this.open">
    <summary class="form-card-header">
      <span>🎨 شكل الفرض : <b>${current}</b></span>
      <span class="picker-hint">${_pickerOpen ? 'إغلاق ▴' : 'تغيير ▾'}</span>
    </summary>
    <div class="form-card-body">
      <div class="model-picker">${cards}</div>
      ${S.model === 'C' ? buildDecorFormHTML() : ''}
      <div class="model-opts">
        <label class="chk chk-strong"><input type="checkbox" ${o.bw ? 'checked' : ''}
          onchange="S.opts.bw=this.checked;renderAll()">
          ⚫ أبيض وأسود — مناسب للطباعة والتصوير (ألغِ التحديد للحصول على نسخة ملوّنة)</label>
        <label class="chk"><input type="checkbox" ${o.icons ? 'checked' : ''}
          onchange="S.opts.icons=this.checked;renderExam()">
          أيقونة أمام كل سؤال حسب نوعه (ريشة، كتاب، ساعة رملية، خريطة، جدول)</label>
        <div class="fg" style="margin-top:8px">
          <label>عبارة نهاية الفرض</label>
          <select onchange="S.opts.closing=this.value;renderExam()">
            ${closings.map(c => `<option value="${c}" ${sel(o.closing, c)}>${c || 'بدون'}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  </details>`;
}

// UI state: is the template picker unfolded? (kept across form rebuilds)
let _pickerOpen = false;

// Picker thumbnails = real renders of a sample exam, scaled down (built once)
const _thumbs = {};
function getModelThumbs() {
  const mode = S.opts.bw ? 'bw' : 'color';
  if (_thumbs[mode]) return _thumbs[mode];
  const saved = S;
  S = {
    model: 'C',
    header: { ...saved.header, teacherName: '', subject: 'التاريخ' },
    decor: defaultDecor(),
    opts: { ...defaultOpts(), bw: saved.opts.bw },
    sections: [
      { id: -1, points: 6, questions: [
        { id: -2, type: 'timeline', text: 'ضع على السلم الزمني تواريخ هذه الأحداث:', points: 0,
          params: { count: 4, events: ['مقتل ولي عهد النمسا', 'اندلاع الحرب', 'نهاية الحرب', 'معاهدة فرساي'] } },
        { id: -3, type: 'definition', text: 'عرّف بنود ويلسون.', points: 0, params: { lines: 2 } } ] },
      { id: -4, points: 12, questions: [
        { id: -5, type: 'paragraph', text: 'حرر فقرة متماسكة تقدم فيها ما بعد الحرب العالمية الأولى.', points: 0,
          params: { lines: 12 } } ] },
    ],
  };
  const thumbs = {};
  try {
    MODELS.forEach(m => {
      S.model = m.id;
      thumbs[m.id] = `<div class="${examClass(m.id)}" dir="rtl" lang="ar">${m.gen()}</div>`;
    });
  } finally {
    S = saved;
  }
  return (_thumbs[mode] = thumbs);
}

function buildDecorFormHTML() {
  const d = S.decor;
  return `
  <div class="form-row" style="margin-top:10px">
    <div class="fg">
      <label>العلامة المائية أسفل الصفحة</label>
      <select onchange="S.decor.watermark=this.value;renderAll()">
        <option value="europe"  ${sel(d.watermark,'europe' )}>خريطة أوروبا + وردة الرياح</option>
        <option value="compass" ${sel(d.watermark,'compass')}>وردة الرياح + شبكة</option>
        <option value="image"   ${sel(d.watermark,'image'  )}>صورة شخصية (خريطة…)</option>
        <option value="none"    ${sel(d.watermark,'none'   )}>بدون</option>
      </select>
    </div>
  </div>
  ${d.watermark === 'image' ? `
  <div class="fg" style="margin-top:6px">
    <input type="file" accept="image/*" onchange="handleWatermarkImg(this)">
    ${d.imageData ? `<div class="info-text">✓ تمّ تحميل الصورة : ${esc(d.imageName)}</div>`
                  : `<div class="info-text">اختر صورة (مثل خريطة أوروبا) — ستظهر بشفافية.</div>`}
  </div>` : ''}`;
}

function handleWatermarkImg(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    S.decor.imageData = e.target.result;
    S.decor.imageName = file.name;
    renderAll();
  };
  reader.readAsDataURL(file);
}

function buildHeaderFormHTML() {
  const hd = S.header;
  return `
  <div class="form-card">
    <div class="form-card-header">📋 ترويسة الفرض</div>
    <div class="form-card-body">

      <div class="form-row">
        <div class="fg" style="flex:0 0 96px">
          <label>الصفة</label>
          <select onchange="S.header.teacherGender=this.value;renderExam()">
            <option value="أستاذة" ${sel(hd.teacherGender,'أستاذة')}>أستاذة</option>
            <option value="أستاذ"  ${sel(hd.teacherGender,'أستاذ' )}>أستاذ</option>
          </select>
        </div>
        <div class="fg">
          <label>اسم الأستاذ(ة)</label>
          <input type="text" dir="rtl" id="inp-teacher" value="${esc(hd.teacherName)}"
            oninput="S.header.teacherName=this.value;renderExam()"
            placeholder="أدخل الاسم...">
        </div>
      </div>

      <div class="form-row">
        <div class="fg">
          <label>المدة</label>
          <select onchange="S.header.duration=this.value;renderExam()">
            <option value="30" ${sel(hd.duration,'30')}>30 دقيقة</option>
            <option value="60" ${sel(hd.duration,'60')}>ساعة</option>
          </select>
        </div>
        <div class="fg">
          <label>نوع الفرض</label>
          <select onchange="S.header.examType=this.value;renderExam()">
            <option value="الفرض العادي"    ${sel(hd.examType,'الفرض العادي'   )}>فرض عادي</option>
            <option value="الفرض التأليفي"  ${sel(hd.examType,'الفرض التأليفي')}>فرض تأليفي</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="fg" style="flex:0 0 80px">
          <label>العدد</label>
          <select onchange="S.header.examNumber=this.value;renderExam()">
            ${['1','2','3'].map(n=>`<option value="${n}" ${sel(hd.examNumber,n)}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="fg">
          <label>المادة</label>
          <select onchange="S.header.subject=this.value;renderExam()">
            <option value="التاريخ"    ${sel(hd.subject,'التاريخ'   )}>التاريخ</option>
            <option value="الجغرافيا"  ${sel(hd.subject,'الجغرافيا')}>الجغرافيا</option>
          </select>
        </div>
        <div class="fg">
          <label>المستوى</label>
          <select onchange="S.header.level=this.value;renderExam()">
            <option value="السابعة أساسي"  ${sel(hd.level,'السابعة أساسي' )}>السابعة أساسي</option>
            <option value="الثامنة أساسي"  ${sel(hd.level,'الثامنة أساسي' )}>الثامنة أساسي</option>
            <option value="التاسعة أساسي"  ${sel(hd.level,'التاسعة أساسي' )}>التاسعة أساسي</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="fg">
          <label>السنة الدراسية (البداية)</label>
          <input type="number" min="2000" max="2100" value="${hd.yearStart}"
            onchange="S.header.yearStart=parseInt(this.value)||2025;renderAll()">
        </div>
        <div class="fg">
          <label>سنة النهاية (تلقائية)</label>
          <input type="number" value="${parseInt(hd.yearStart)+1}" disabled>
        </div>
      </div>

    </div>
  </div>`;
}

function buildSectionFormHTML(sec, si) {
  const name = AR_ORDINALS[si] || `${si+1}`;
  const qTotal = sectionQTotal(sec);
  // Only warn once the teacher has started giving points to questions
  const usesQPoints = sec.questions.some(q => parseFloat(q.points) > 0);
  const mismatch = usesQPoints && Math.abs(qTotal - (parseFloat(sec.points)||0)) > 0.001;
  const canDel = S.sections.length > 2;

  return `
  <div class="es-form" data-sid="${sec.id}">
    <div class="es-form-head">
      <span class="es-form-title">القسم ${name}</span>
      <div class="pts-wrap">
        <label class="pts-label">النقاط :</label>
        <input type="number" min="0" max="18" step="0.5" value="${sec.points}" class="pts-input"
          onchange="updateSecPoints(${sec.id},parseFloat(this.value))">
        <span class="pts-unit">ن</span>
        ${canDel ? `<button class="btn-icon danger" title="حذف هذا القسم" onclick="removeSection(${sec.id})">✕</button>` : ''}
      </div>
    </div>
    ${mismatch ? `<div class="es-warn">ℹ مجموع نقاط الأسئلة ${qTotal} ن بينما القسم يساوي ${sec.points} ن.</div>` : ''}
    <div class="es-form-body">
      ${sec.questions.map((q,qi) => buildQFormHTML(q, qi, sec.id)).join('')}
      <button class="btn btn-ghost btn-block" onclick="addQuestion(${sec.id})">＋ إضافة سؤال</button>
    </div>
  </div>`;
}

function buildQFormHTML(q, qi, sid) {
  const typeOptions = [
    ['paragraph', 'فقرة'],
    ['definition','تعريف'],
    ['timeline',  'سلم زمني'],
    ['map',       'خريطة'],
    ['table',     'جدول'],
  ].map(([v,l]) => `<option value="${v}" ${sel(q.type,v)}>${l}</option>`).join('');

  return `
  <div class="q-form" data-qid="${q.id}">
    <div class="q-form-head">
      <span class="q-num">${qi+1}</span>
      <select class="q-type-select" title="نوع السؤال" onchange="changeQType(${sid},${q.id},this.value)">
        ${typeOptions}
      </select>
      <input type="number" min="0" max="18" step="0.5" value="${q.points || ''}" class="pts-input" placeholder="—"
        title="نقاط السؤال (اختياري)" onchange="updateQ(${sid},${q.id},'points',parseFloat(this.value)||0)">
      <span class="pts-unit">ن</span>
      <button class="btn-icon danger" title="حذف هذا السؤال" onclick="removeQuestion(${sid},${q.id})">✕</button>
    </div>

    <div class="fg" style="margin-bottom:8px">
      <label>السؤال</label>
      <textarea dir="rtl" rows="2" placeholder="اكتب السؤال هنا…"
        oninput="updateQText(${sid},${q.id},this.value)"
        >${esc(q.text)}</textarea>
    </div>

    ${buildQParamsHTML(q, sid)}
  </div>`;
}

function buildQParamsHTML(q, sid) {
  switch (q.type) {
    case 'paragraph':
      return `<div class="form-row">
        <div class="fg">
          <label>عدد الأسطر (10 على الأقل)</label>
          <input type="number" min="10" max="30" value="${q.params.lines||12}"
            onchange="updateQParam(${sid},${q.id},'lines',Math.max(10,parseInt(this.value)||10))">
        </div>
      </div>`;

    case 'definition':
      return `<div class="form-row">
        <div class="fg">
          <label>عدد الأسطر (سطر واحد على الأقل)</label>
          <input type="number" min="1" max="15" value="${q.params.lines||3}"
            onchange="updateQParam(${sid},${q.id},'lines',Math.max(1,parseInt(this.value)||1))">
        </div>
      </div>`;

    case 'timeline':
      return buildTimelineParamsHTML(q, sid);

    case 'map':
      return buildMapParamsHTML(q, sid);

    case 'table':
      return buildTableParamsHTML(q, sid);

    default: return '';
  }
}

function buildTableParamsHTML(q, sid) {
  const p = q.params;
  const cols = tableCols(p), rows = tableRows(p);
  const cell = (r, c, val, cls) => `<td><input type="text" dir="rtl" class="${cls}" value="${esc(val)}"
      oninput="updateTableCell(${sid},${q.id},${r},${c},this.value)"></td>`;

  let grid = '<tr>';
  for (let c = 0; c < cols; c++) grid += cell(-1, c, (p.headers || [])[c] || '', 'tbl-head');
  grid += '</tr>';
  for (let r = 0; r < rows; r++) {
    grid += '<tr>';
    for (let c = 0; c < cols; c++) grid += cell(r, c, ((p.cells || [])[r] || [])[c] || '', '');
    grid += '</tr>';
  }

  return `
  <div class="form-row">
    <div class="fg">
      <label>عدد الأعمدة (1 – 6)</label>
      <input type="number" min="1" max="6" value="${cols}"
        onchange="updateQParam(${sid},${q.id},'cols',Math.min(6,Math.max(1,parseInt(this.value)||3)))">
    </div>
    <div class="fg">
      <label>عدد الصفوف (1 – 10)</label>
      <input type="number" min="1" max="10" value="${rows}"
        onchange="updateQParam(${sid},${q.id},'rows',Math.min(10,Math.max(1,parseInt(this.value)||3)))">
    </div>
    <div class="fg">
      <label>ارتفاع الخانات</label>
      <select onchange="updateQParam(${sid},${q.id},'cellHeight',parseInt(this.value))">
        ${[1,2,3,4].map(n => `<option value="${n}" ${p.cellHeight == n ? 'selected' : ''}>${n} ${n > 1 ? 'أسطر' : 'سطر'}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="sub-title">محتوى الجدول (الصف الأول = عناوين الأعمدة) :</div>
  <div class="tbl-form-wrap"><table class="tbl-form" dir="rtl">${grid}</table></div>
  <div class="info-text">الخانة التي تُترك فارغة يملؤها التلميذ.</div>`;
}

function buildTimelineParamsHTML(q, sid) {
  const count = q.params.count || 4;
  const events = q.params.events || [];
  let evInputs = '';
  for (let i = 0; i < count; i++) {
    evInputs += `<div class="form-row" style="margin-bottom:4px">
      <div class="fg">
        <label>الحدث ${i+1}</label>
        <input type="text" dir="rtl"
          value="${esc(events[i]||'')}"
          oninput="updateTLEvent(${sid},${q.id},${i},this.value)"
          placeholder="مثال: اندلاع الحرب العالمية الأولى">
      </div>
    </div>`;
  }

  return `
  <div class="form-row">
    <div class="fg">
      <label>عدد الأحداث (2 – 8)</label>
      <input type="number" min="2" max="8" value="${count}"
        onchange="updateQParam(${sid},${q.id},'count',Math.min(8,Math.max(2,parseInt(this.value)||4)))">
    </div>
  </div>
  <div class="sub-title">الأحداث المراد وضعها على السلم الزمني :</div>
  ${evInputs}
  <div class="info-text">يظهر الحدث 1 على يمين السلم الزمني (اتجاه القراءة العربية).</div>`;
}

function buildMapParamsHTML(q, sid) {
  const hasImg = !!q.params.imageData;
  return `
  <div class="fg" style="margin-bottom:6px">
    <label>صورة الخريطة (PNG / JPG)</label>
    <input type="file" accept="image/*"
      onchange="handleMapImg(${sid},${q.id},this)">
    ${hasImg ? `<div class="info-text">✓ تمّ تحميل الصورة : ${esc(q.params.imageName)}</div>` : ''}
  </div>
  <div class="form-row">
    <div class="fg">
      <label>عرض الصورة</label>
      <select onchange="updateQParam(${sid},${q.id},'imageWidth',this.value)">
        <option value="50%"  ${sel(q.params.imageWidth,'50%' )}>50 %</option>
        <option value="75%"  ${sel(q.params.imageWidth,'75%' )}>75 %</option>
        <option value="100%" ${sel(q.params.imageWidth||'100%','100%')}>100 %</option>
      </select>
    </div>
    <div class="fg">
      <label>خانات مفتاح الخريطة (0 = بدون)</label>
      <input type="number" min="0" max="12" value="${q.params.legendCount||0}"
        onchange="updateQParam(${sid},${q.id},'legendCount',Math.max(0,parseInt(this.value)||0))">
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM — FOOTER
// ─────────────────────────────────────────────────────────────────────────────

function renderFormFooter() {
  const tot = totalPoints();
  const ok  = Math.abs(tot - 18) < 0.001;
  const over = tot > 18;
  const cls = ok ? 'score-ok' : over ? 'score-error' : 'score-warn';
  const msg = ok ? '✓' : over ? '⚠ تجاوز — الطباعة متوقفة' : `⚠ ناقص (ينقص ${+(18-tot).toFixed(1)} ن)`;

  document.getElementById('form-footer').innerHTML = `
    <div class="score-bar ${cls}">المجموع : <strong>${tot}</strong> / 18 ${msg}</div>
    <div id="page-warn" class="page-warn" hidden></div>
    <div class="footer-row">
      <button class="btn btn-primary" onclick="saveExam()"
        title="حفظ هذا الفرض في «فروضي»">💾 حفظ</button>
      <button class="btn btn-success" onclick="printExam()" ${over?'disabled':''}>🖨 طباعة</button>
      <button class="btn btn-share btn-pdf" data-label="📤 مشاركة PDF" onclick="sharePDF()"
        ${over?'disabled':''} title="إنشاء ملف PDF لإرساله (واتساب، بريد…) أو الاحتفاظ به">📤 مشاركة PDF</button>
    </div>
    <div class="footer-meta"><span id="save-status"></span></div>`;
  updateSaveStatus();
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE MUTATORS
// ─────────────────────────────────────────────────────────────────────────────

function updateSecPoints(sid, val) {
  const sec = getSec(sid);
  if (sec) { sec.points = isNaN(val) ? 0 : val; renderAll(); }
}

function addSection() {
  S.sections.push({ id: gid(), points: 0, questions: [] });
  renderAll();
}

function removeSection(sid) {
  if (S.sections.length <= 2) return;
  S.sections = S.sections.filter(s => s.id !== sid);
  renderAll();
}

function addQuestion(sid) {
  const sec = getSec(sid);
  if (sec) { sec.questions.push(newQuestion()); renderAll(); }
}

function removeQuestion(sid, qid) {
  const sec = getSec(sid);
  if (sec) { sec.questions = sec.questions.filter(q => q.id !== qid); renderAll(); }
}

function changeQType(sid, qid, type) {
  const q = getQ(sid, qid);
  if (q) { q.type = type; q.params = defaultParams(type); renderAll(); }
}

function updateQ(sid, qid, key, val) {
  const q = getQ(sid, qid);
  if (q) { q[key] = val; renderAll(); }
}

// Text-only update: no form rebuild, only preview refresh
function updateQText(sid, qid, val) {
  const q = getQ(sid, qid);
  if (q) { q.text = val; renderFormFooter(); renderExam(); }
}

function updateQParam(sid, qid, key, val) {
  const q = getQ(sid, qid);
  if (q) { q.params[key] = val; renderAll(); }
}

function updateTLEvent(sid, qid, idx, val) {
  const q = getQ(sid, qid);
  if (q) {
    if (!Array.isArray(q.params.events)) q.params.events = [];
    q.params.events[idx] = val;
    renderExam();
  }
}

// Table cell typing: preview refresh only (keeps focus in the form). r = -1 → header row
function updateTableCell(sid, qid, r, c, val) {
  const q = getQ(sid, qid);
  if (!q) return;
  const p = q.params;
  if (r < 0) {
    if (!Array.isArray(p.headers)) p.headers = [];
    p.headers[c] = val;
  } else {
    if (!Array.isArray(p.cells)) p.cells = [];
    if (!Array.isArray(p.cells[r])) p.cells[r] = [];
    p.cells[r][c] = val;
  }
  renderExam();
}

function handleMapImg(sid, qid, input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    const q = getQ(sid, qid);
    if (q) {
      q.params.imageData = e.target.result;
      q.params.imageName = file.name;
      renderAll();
    }
  };
  reader.readAsDataURL(file);
}

function getSec(sid) { return S.sections.find(s => s.id === sid); }
function getQ(sid, qid) {
  const s = getSec(sid);
  return s ? s.questions.find(q => q.id === qid) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM RENDERING
// ─────────────────────────────────────────────────────────────────────────────

function renderExam() {
  const el = document.getElementById('exam-a4');
  const m = MODELS.find(x => x.id === S.model) || MODELS[0];
  el.className = examClass(m.id);
  el.setAttribute('dir', 'rtl');
  el.setAttribute('lang', 'ar');
  el.innerHTML = m.gen();
  updateTitlePreview();
  requestAnimationFrame(() => { scalePreview(); checkPageOverflow(); });
  scheduleAutosave();
}

function examClass(id) {
  return `exam-a4 model-${id.toLowerCase()}${DECO_MODELS.includes(id) ? ' deco' : ''}${S.opts.bw ? ' bw' : ''}`;
}

/* ── MODEL A ── */
function genExamA() {
  const hd = S.header;
  const yr = parseInt(hd.yearStart) + 1;
  const dur = hd.duration === '30' ? '30 دقيقة' : 'ساعة';
  let body = '';
  S.sections.forEach((sec, si) => {
    const nm = AR_ORDINALS[si] || `${si+1}`;
    body += `<div class="sec-title">القسم ${nm} (${sec.points} ن)</div>`;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-item">
        <div class="q-text">${qTitleHTML(q, `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
  });

  return `
    <div class="hdr-wrap">
      <table class="hdr-tbl">
        <tr>
          <td class="hdr-cell-r">
            ${esc(hd.teacherGender)}: ${esc(hd.teacherName)}<br>
            المدة: ${dur}
          </td>
          <td class="hdr-cell-c">
            ${esc(hd.examType)} عدد ${hd.examNumber}<br>في مادة ${esc(hd.subject)}
          </td>
          <td class="hdr-cell-l">
            المستوى: ${esc(hd.level)}<br>
            السنة الدراسية: ${hd.yearStart} - ${yr}
          </td>
        </tr>
      </table>
    </div>

    <div class="stu-row">
      <div class="stu-line">
        <span class="stu-label">الإسم واللقب :</span><span class="stu-name-line"></span><span class="stu-field">القسم : ...........</span><span class="stu-field">الرقم : ......</span>
      </div>
      <div class="grade-block">
        <div class="grade-box">${GRADE_TXT}</div>
        <div class="hw-box">+2 لوضوح الخط وسلامة اللغة</div>
      </div>
    </div>

    ${body}
    ${closingHTML()}
  `;
}

/* ── MODEL B ── */
function genExamB() {
  const hd = S.header;
  const yr = parseInt(hd.yearStart) + 1;
  const dur = hd.duration === '30' ? '30 دقيقة' : 'ساعة';
  let body = '';
  S.sections.forEach((sec, si) => {
    const nm = AR_ORDINALS[si] || `${si+1}`;
    body += `<div class="sec-wrapper">
      <div class="sec-pill">القسم ${nm}: (${sec.points} ن)</div>
    `;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-box">
        <div class="q-text">${qTitleHTML(q, `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
    body += `</div>`;
  });

  return `
    <div class="exam-inner">
      <div class="hdr-boxes">
        <div class="hdr-box hdr-box-r">
          ${esc(hd.teacherGender)}: ${esc(hd.teacherName)}<br>
          المدة: ${dur}
        </div>
        <div class="hdr-box hdr-box-c">
          ${esc(hd.examType)} عدد ${hd.examNumber}<br>في مادة ${esc(hd.subject)}
        </div>
        <div class="hdr-box hdr-box-l">
          المستوى: ${esc(hd.level)}<br>
          السنة الدراسية: ${hd.yearStart} - ${yr}
        </div>
      </div>

      <div class="separator">◆ &nbsp; ◆ &nbsp; ◆</div>

      <div class="stu-row-b">
        <div class="stu-line-b">
          <span class="stu-label">الإسم واللقب :</span><span class="stu-name-line"></span><span class="stu-field">القسم : ...........</span><span class="stu-field">الرقم : ......</span>
        </div>
        <div class="grade-box-b">${GRADE_TXT}</div>
      </div>

      <div class="hw-note">2 ن + لوضوح الخط وسلامة اللغة</div>

      ${body}
      ${closingHTML()}
    </div>
  `;
}

/* ── MODEL C ── */
function genExamC() {
  const hd = S.header;
  const yr = parseInt(hd.yearStart) + 1;
  const dur = hd.duration === '30' ? '30 دقيقة' : 'ساعة';
  let body = '';
  S.sections.forEach((sec, si) => {
    const nm = AR_ORDINALS[si] || `${si+1}`;
    const tone = si % 2 === 0 ? 'c-banner-dark' : 'c-banner-light';
    body += `<div class="c-banner ${tone}">القسم ${nm}: (${sec.points} ن)</div>`;
    if (si === 0) body += `<div class="c-hw-note">2 ن + لوضوح الخط وسلامة اللغة</div>`;
    const single = sec.questions.length === 1;
    sec.questions.forEach((q, qi) => {
      const num = single ? '' : `${qi+1}- `;
      body += `<div class="q-box">
        <div class="q-text">${qTitleHTML(q, num)}</div>
        ${renderQContent(q)}
      </div>`;
    });
  });

  return `
    <div class="c-frame-outer"></div>
    <div class="c-frame-inner"></div>
    ${['tr','tl','br','bl'].map(p => `<div class="c-corner c-corner-${p}">${CORNER_SVG}</div>`).join('')}
    ${renderWatermark()}

    <div class="c-content">
      <div class="c-hdr">
        <div class="c-hdr-side">
          <b>${esc(hd.teacherGender)}:</b> ${esc(hd.teacherName)}<br>
          <b>المدة:</b> ${dur}
        </div>
        <div class="c-hdr-title">
          ${esc(hd.examType)} عدد ${esc(hd.examNumber)}<br>في مادة ${esc(hd.subject)}
        </div>
        <div class="c-hdr-side">
          <b>المستوى:</b> ${esc(hd.level)}<br>
          <b>السنة الدراسية:</b> ${hd.yearStart} - ${yr}
        </div>
      </div>

      <div class="c-sep"><span></span><i>◆</i><b>◆</b><i>◆</i><span></span></div>

      <div class="c-stu">${studentLineHTML()}<span class="c-grade">${GRADE_TXT}</span></div>

      ${body}
      ${closingHTML()}
    </div>
  `;
}

// Greek-key corner ornament (drawn for top-right, mirrored by CSS for the others)
const CORNER_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="22" height="22" fill="#fff" stroke="#333" stroke-width="1.4"/>
  <rect x="4" y="4" width="16" height="16" fill="none" stroke="#333" stroke-width=".8"/>
  <path d="M7 17 V7 H17 V14 H10 V10 H14" fill="none" stroke="#333" stroke-width="1.2"/>
</svg>`;

function renderWatermark() {
  const d = S.decor || {};
  if (d.watermark === 'none') return '';
  if (d.watermark === 'image' && d.imageData) {
    return `<div class="c-watermark"><img src="${esc(d.imageData)}" alt=""></div>`;
  }
  if (d.watermark === 'europe' && typeof EUROPE_MAP !== 'undefined') {
    return `<div class="c-watermark c-wm-europe">
      <svg class="c-europe" viewBox="${EUROPE_MAP.viewBox}" preserveAspectRatio="xMidYMax slice"
           xmlns="http://www.w3.org/2000/svg" fill="#c9d7e5" stroke="#6d86a2" stroke-width="1.1" stroke-linejoin="round">
        ${EUROPE_MAP.paths.map(p => `<path d="${p}"/>`).join('')}
      </svg>
      ${compassSVG('c-compass', '#4c6481')}
    </div>`;
  }
  // Default: compass rose + map graticule
  let grid = '';
  for (let i = 0; i < 7; i++) {
    const y = 40 + i * 28;
    grid += `<path d="M0 ${y} Q 400 ${y - 40} 800 ${y}" />`;
  }
  for (let i = 0; i < 11; i++) {
    const x = 20 + i * 76;
    grid += `<path d="M${x} 230 Q ${x + (x - 400) * 0.15} 120 ${x + (x - 400) * 0.3} 0" />`;
  }
  return `<div class="c-watermark">
    <svg viewBox="0 0 800 230" preserveAspectRatio="none" class="c-graticule"
         xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#7d8fa3" stroke-width="1">${grid}</svg>
    ${compassSVG('c-compass', '#56677a')}
  </div>`;
}

function compassSVG(cls, c) {
  return `<svg viewBox="-60 -60 120 120" class="${cls}" xmlns="http://www.w3.org/2000/svg">
      <circle r="34" fill="none" stroke="${c}" stroke-width="1.2"/>
      <circle r="28" fill="none" stroke="${c}" stroke-width=".6"/>
      <g fill="${c}" stroke="${c}" stroke-width=".6">
        <path d="M0 -50 L6 -6 L0 0 Z"/><path d="M0 -50 L-6 -6 L0 0 Z" fill="#fff"/>
        <path d="M0 50 L-6 6 L0 0 Z"/><path d="M0 50 L6 6 L0 0 Z" fill="#fff"/>
        <path d="M50 0 L6 6 L0 0 Z"/><path d="M50 0 L6 -6 L0 0 Z" fill="#fff"/>
        <path d="M-50 0 L-6 -6 L0 0 Z"/><path d="M-50 0 L-6 6 L0 0 Z" fill="#fff"/>
        <path d="M24 -24 L4 -2 L0 0 Z"/><path d="M-24 24 L-4 2 L0 0 Z"/>
        <path d="M24 24 L2 4 L0 0 Z"/><path d="M-24 -24 L-2 -4 L0 0 Z"/>
      </g>
      <g font-family="serif" font-size="10" fill="${c}" text-anchor="middle">
        <text y="-53">N</text><text y="61">S</text><text x="57" y="4">E</text><text x="-57" y="4">W</text>
      </g>
    </svg>`;
}

/* ── SHARED HELPERS FOR TEMPLATES ── */
function ordName(si) { return AR_ORDINALS[si] || `${si+1}`; }
function durText()   { return S.header.duration === '30' ? '30 دقيقة' : 'ساعة'; }
function yearText()  { const y = parseInt(S.header.yearStart); return `<span class="nw">${y} - ${y+1}</span>`; }
function examTitleHTML() {
  const hd = S.header;
  return `${esc(hd.examType)} عدد ${esc(hd.examNumber)}<br>في مادة ${esc(hd.subject)}`;
}

// Monochrome line icons (print well in black & white)
const Q_ICONS = {
  paragraph:  '<path d="M20 3C12 4 7 10 5 19l1 1c3-7 7-11 14-17z"/><path d="M5 19l-2 2M9 13h4"/>',
  definition: '<path d="M3 5q4.5-1 8.5 1v13q-4-2-8.5-1zM21 5q-4.5-1-8.5 1v13q4-2 8.5-1z"/>',
  timeline:   '<path d="M6 3h12M6 21h12M7 3c0 6 5 7 5 9s-5 3-5 9M17 3c0 6-5 7-5 9s5 3 5 9"/>',
  map:        '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
  table:      '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14.5h18M9 4v16M15 4v16"/>',
};

function qIcon(type) {
  if (!S.opts.icons || !Q_ICONS[type]) return '';
  return `<svg class="q-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
    stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${Q_ICONS[type]}</svg>`;
}

function qTitleHTML(q, num, withPts = true) {
  const pts = withPts && q.points ? ` (${q.points}ن)` : '';
  return `${qIcon(q.type)}${num}${esc(q.text)}${pts}`;
}

function closingHTML() {
  return S.opts.closing ? `<div class="exam-closing">❖ ${esc(S.opts.closing)} ❖</div>` : '';
}

function studentLineHTML() {
  return `<div class="stu-gen">
    <span>الإسم واللقب :</span><span class="stu-gen-line"></span>
    <span>القسم : ...........</span><span>الرقم : ......</span>
  </div>`;
}

const HW_NOTE = '2 ن + لوضوح الخط وسلامة اللغة';

// Ornamental separator: line — svg — line
function ornSep(svg) {
  return `<div class="orn-sep"><span></span>${svg}<span></span></div>`;
}

// Map-style cartouche with concave corners, stretched behind the title
function cartoucheSVG(fill, stroke) {
  const ns = 'vector-effect="non-scaling-stroke"';
  return `<svg class="cartouche-bg" viewBox="0 0 200 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1H188A11 11 0 0 0 199 12V48A11 11 0 0 0 188 59H12A11 11 0 0 0 1 48V12A11 11 0 0 0 12 1Z"
      fill="${fill}" stroke="${stroke}" stroke-width="1.6" ${ns}/>
    <path d="M15 4.5H185A11 11 0 0 0 195.5 15V45A11 11 0 0 0 185 55.5H15A11 11 0 0 0 4.5 45V15A11 11 0 0 0 15 4.5Z"
      fill="none" stroke="${stroke}" stroke-width=".7" ${ns}/>
  </svg>`;
}

/* ── MODEL D — MANUSCRIT ANCIEN ── */
function genExamD() {
  const hd = S.header;
  let body = '';
  S.sections.forEach((sec, si) => {
    body += `<div class="d-ribbon"><span>القسم ${ordName(si)} — (${sec.points} ن)</span></div>`;
    const single = sec.questions.length === 1;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-item d-q">
        <div class="q-text">${qTitleHTML(q, single ? '' : `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
  });

  const flourish = `<svg class="d-flourish" viewBox="0 0 120 20" xmlns="http://www.w3.org/2000/svg"
      fill="none" stroke="#5a4630" stroke-width="1.3" stroke-linecap="round">
    <path d="M2 10C20 10 25 2 38 4S48 16 60 10C72 4 76 16 82 16S100 10 118 10"/>
    <path d="M2 10C20 10 25 18 38 16S48 4 60 10C72 16 76 4 82 4S100 10 118 10"/>
    <circle cx="60" cy="10" r="2.5" fill="#5a4630"/>
  </svg>`;

  return `
    <div class="d-roll d-roll-top"></div>
    <div class="d-roll d-roll-bottom"></div>
    <div class="d-sheet"></div>

    <div class="deco-content">
      <div class="d-hdr">
        <div class="d-hdr-side">
          <b>${esc(hd.teacherGender)}:</b> ${esc(hd.teacherName)}<br>
          <b>المدة:</b> ${durText()}
        </div>
        <div class="cartouche d-cartouche">
          ${cartoucheSVG('#f6eedb', '#5a4630')}
          <div class="cartouche-text">${examTitleHTML()}</div>
        </div>
        <div class="d-hdr-side">
          <b>المستوى:</b> ${esc(hd.level)}<br>
          <b>السنة الدراسية:</b> ${yearText()}
        </div>
      </div>

      ${ornSep(flourish)}

      <div class="d-stu-row">
        ${studentLineHTML()}
        <div class="d-seal"><span>العدد :</span><b>........ / 20</b></div>
      </div>
      <div class="hw-note-gen">${HW_NOTE}</div>

      ${body}
      ${closingHTML()}
    </div>`;
}

/* ── MODEL G — FIL DU TEMPS ── */
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];

function genExamG() {
  const hd = S.header;
  let body = '';
  S.sections.forEach((sec, si) => {
    body += `<div class="g-sec">
      <div class="g-node">${ROMAN[si] || si+1}</div>
      <div class="g-sec-title">القسم ${ordName(si)} <span class="g-sec-pts">${sec.points} ن</span></div>`;
    const single = sec.questions.length === 1;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-box g-q">
        <div class="q-text">${qTitleHTML(q, single ? '' : `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
    body += `</div>`;
  });

  const stops = [
    [esc(hd.teacherGender), esc(hd.teacherName) || '..........'],
    ['المستوى', esc(hd.level)],
    ['المدة', durText()],
    ['السنة الدراسية', yearText()],
  ].map(([k, v]) => `<div class="g-stop"><span class="g-stop-k">${k}</span><i></i><b>${v}</b></div>`).join('');

  return `
    <div class="g-frame"></div>
    <div class="deco-content">
      <div class="g-title">${examTitleHTML()}</div>
      <div class="g-frieze">${stops}</div>

      <div class="g-stu-row">
        ${studentLineHTML()}
        <div class="g-grade">${GRADE_TXT}</div>
      </div>
      <div class="hw-note-gen">${HW_NOTE}</div>

      <div class="g-timeline">
        ${body}
        <div class="g-end"></div>
      </div>
      ${closingHTML()}
    </div>`;
}

/* ── MODEL H — ARCHIVES / MUSÉE ── */
function genExamH() {
  const hd = S.header;
  let body = '';
  S.sections.forEach((sec, si) => {
    body += `<div class="h-folder">
      <div class="h-tab">القسم ${ordName(si)} <span class="h-tab-pts">${sec.points} ن</span></div>
      <div class="h-folder-body">`;
    sec.questions.forEach((q, qi) => {
      const stamp = q.points ? `<div class="h-stamp">${q.points} ن</div>` : '';
      body += `<div class="q-box h-card">
        ${stamp}
        <div class="h-card-head">
          <span class="h-card-no">بطاقة ${qi+1}</span>
          <span class="q-text">${qTitleHTML(q, '', false)}</span>
        </div>
        <div class="h-card-body">${renderQContent(q)}</div>
      </div>`;
    });
    body += `</div></div>`;
  });

  const clip = `<svg class="h-clip" viewBox="0 0 30 64" xmlns="http://www.w3.org/2000/svg"
      fill="none" stroke="#555" stroke-width="2.4" stroke-linecap="round">
    <path d="M9 14V48a8 8 0 0 0 16 0V10a6 6 0 0 0-12 0V44"/></svg>`;

  return `
    <div class="h-frame"></div>
    <div class="h-hole" style="top:25%"></div>
    <div class="h-hole" style="top:50%"></div>
    <div class="h-hole" style="top:75%"></div>
    ${clip}

    <div class="deco-content">
      <div class="h-hdr">
        <div class="h-hdr-side">
          <div><b>${esc(hd.teacherGender)}:</b> ${esc(hd.teacherName)}</div>
          <div><b>المدة:</b> ${durText()}</div>
        </div>
        <div class="h-title">
          <div class="h-title-ref">وثيقة عدد ${esc(hd.examNumber)}</div>
          ${examTitleHTML()}
        </div>
        <div class="h-hdr-side">
          <div><b>المستوى:</b> ${esc(hd.level)}</div>
          <div><b>السنة الدراسية:</b> ${yearText()}</div>
        </div>
      </div>
      <div class="h-rule"></div>

      <div class="h-stu-row">
        ${studentLineHTML()}
        <div class="h-grade-stamp"><span>العدد :</span><b>........ / 20</b></div>
      </div>
      <div class="hw-note-gen">${HW_NOTE}</div>

      ${body}
      ${closingHTML()}
    </div>`;
}

/* ── FRAMED HEADER (Globe, Carthage): teacher | title | level, then the student line — all in one frame ── */
function framedHeaderHTML(titleHTML) {
  const hd = S.header;
  return `<div class="fh">
    <div class="fh-top">
      <div class="fh-side">
        <div><b>${esc(hd.teacherGender)}:</b> ${esc(hd.teacherName)}</div>
        <div><b>المدة:</b> ${durText()}</div>
      </div>
      <div class="fh-title">${titleHTML}</div>
      <div class="fh-side">
        <div><b>المستوى:</b> ${esc(hd.level)}</div>
        <div><b>السنة الدراسية:</b> ${yearText()}</div>
      </div>
    </div>
    <div class="fh-bottom">
      <span>الإسم واللقب :</span><span class="stu-gen-line"></span>
      <span>القسم : ...........</span><span>الرقم : ......</span>
      <span class="fh-grade">${GRADE_TXT}</span>
    </div>
  </div>`;
}

// Exact wording of the grade box, identical in every template
const GRADE_TXT = 'العدد : ........ / 20';

// Small "globe" icon (meridians + parallels), used as bullet / ornament
function miniGlobeSVG(cls) {
  return `<svg class="${cls}" viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg"
      fill="none" stroke="currentColor" stroke-width="1.2">
    <circle r="10.5"/><ellipse rx="4.5" ry="10.5"/><path d="M0-10.5V10.5M-10.5 0H10.5M-9 -5.2H9M-9 5.2H9"/>
  </svg>`;
}

/* ── MODEL I — GLOBE (géographie) ── */
function genExamI() {
  let body = '';
  S.sections.forEach((sec, si) => {
    body += `<div class="i-sec">
      ${miniGlobeSVG('i-sec-globe')}
      <span class="i-sec-title">القسم ${ordName(si)}</span>
      <span class="i-equator"></span>
      <span class="i-sec-pts">${sec.points} ن</span>
    </div>`;
    const single = sec.questions.length === 1;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-box i-q">
        <div class="q-text">${qTitleHTML(q, single ? '' : `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
  });

  const globe = typeof GLOBE_MAP === 'undefined' ? '' : `
    <svg class="i-globe" viewBox="${-GLOBE_MAP.r - 6} ${-GLOBE_MAP.r - 6} ${2 * GLOBE_MAP.r + 12} ${2 * GLOBE_MAP.r + 12}"
         xmlns="http://www.w3.org/2000/svg">
      <circle class="i-globe-sea" r="${GLOBE_MAP.r}"/>
      <path class="i-globe-grid" d="${GLOBE_MAP.grid}"/>
      <g class="i-globe-land">${GLOBE_MAP.land.map(d => `<path d="${d}"/>`).join('')}</g>
      <circle class="i-globe-rim" r="${GLOBE_MAP.r}"/>
    </svg>`;

  return `
    <div class="i-frame"></div>
    ${globe}
    <div class="deco-content">
      ${framedHeaderHTML(`${miniGlobeSVG('i-title-globe')}<div>${examTitleHTML()}</div>${miniGlobeSVG('i-title-globe')}`)}
      <div class="hw-note-gen">${HW_NOTE}</div>
      ${body}
      ${closingHTML()}
    </div>`;
}

/* ── MODEL J — CARTHAGE (histoire, Antiquité) ── */
function genExamJ() {
  let body = '';
  S.sections.forEach((sec, si) => {
    body += `<div class="j-tabula"><div class="j-tabula-in">القسم ${ordName(si)} — (${sec.points} ن)</div></div>`;
    const single = sec.questions.length === 1;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-box j-q">
        <div class="q-text">${qTitleHTML(q, single ? '' : `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
  });

  const ns = 'vector-effect="non-scaling-stroke"';
  const column = `<svg class="j-column" viewBox="0 0 20 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
      fill="#fff" stroke="#000" stroke-width="1.3">
    <rect x="0.5" y="0.5" width="19" height="5" ${ns}/>
    <path d="M2 5.5 Q10 10 18 5.5" fill="none" ${ns}/>
    <rect x="3.5" y="8" width="13" height="85" ${ns}/>
    <path d="M7 9V92M10 9V92M13 9V92" fill="none" stroke-width=".7" ${ns}/>
    <rect x="1.5" y="93" width="17" height="3" ${ns}/>
    <rect x="0.5" y="96" width="19" height="3.5" ${ns}/>
  </svg>`;
  const pediment = `<svg class="j-pediment" viewBox="0 0 200 24" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
      fill="#fff" stroke="#000" stroke-width="1.5">
    <path d="M2 23 L100 1.5 L198 23 Z" ${ns}/>
    <path d="M22 20.5 L100 5 L178 20.5 Z" fill="none" stroke-width=".8" ${ns}/>
  </svg>`;
  const tanit = `<svg class="j-tanit" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"
      fill="none" stroke="#000" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="50" cy="20" r="13"/><path d="M12 26 V40 H88 V26"/><path d="M50 40 L18 112 H82 Z"/>
  </svg>`;
  const temple = `<div class="j-temple">
      <div class="j-pediment-wrap">${pediment}${tanit}</div>
      <div class="j-entablature"></div>
      <div class="j-temple-row">${column}<div class="j-title">${examTitleHTML()}</div>${column}</div>
      <div class="j-steps"></div>
    </div>`;
  const corner = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="22" height="22" fill="#fff" stroke="#000" stroke-width="1.4"/>
    <circle cx="12" cy="12" r="6.5" fill="none" stroke="#000" stroke-width="1.1"/>
    <path d="M12 5.5V18.5M5.5 12H18.5M7.4 7.4l9.2 9.2M16.6 7.4l-9.2 9.2" stroke="#000" stroke-width=".8"/>
  </svg>`;

  return `
    <div class="j-band"></div>
    ${['tr','tl','br','bl'].map(p => `<div class="j-corner j-corner-${p}">${corner}</div>`).join('')}
    <div class="deco-content">
      ${framedHeaderHTML(temple)}
      <div class="hw-note-gen">${HW_NOTE}</div>
      ${body}
      ${closingHTML()}
    </div>`;
}

/* ── MODEL K — ÉLÉGANT (diplôme : bordure guillochée, lauriers, coins marqués) ── */

// Laurel branch drawn along a curve; `mirror` gives the right-hand branch
function laurelSVG(cls, mirror = false) {
  const P0 = [24, 58], P1 = [4, 36], P2 = [13, 4];
  const at = t => [
    (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0],
    (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1],
  ];
  let leaves = '';
  for (let i = 1; i <= 7; i++) {
    const t = i / 8, [x, y] = at(t), [x2, y2] = at(t + 0.01);
    const ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;
    for (const side of [-1, 1]) {
      leaves += `<ellipse cx="0" cy="-4.6" rx="1.9" ry="4.4"
        transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(ang + 90 + side * 52).toFixed(0)})"/>`;
    }
  }
  const [tx, ty] = at(1);
  leaves += `<ellipse cx="0" cy="-3.6" rx="1.8" ry="3.8" transform="translate(${tx} ${ty}) rotate(15)"/>`;
  return `<svg class="${cls}" viewBox="0 0 30 62" xmlns="http://www.w3.org/2000/svg"
      ${mirror ? 'style="transform:scaleX(-1)"' : ''} fill="currentColor" stroke="none">
    <path d="M${P0} Q${P1} ${P2}" fill="none" stroke="currentColor" stroke-width="1.3"/>${leaves}
  </svg>`;
}

function genExamK() {
  let body = '';
  S.sections.forEach((sec, si) => {
    body += `<div class="k-sec">
      <span class="k-line"></span><i class="k-dia"></i>
      <span class="k-sec-title">القسم ${ordName(si)} <span class="k-sec-pts">(${sec.points} ن)</span></span>
      <i class="k-dia"></i><span class="k-line"></span>
    </div>`;
    const single = sec.questions.length === 1;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-box k-q">
        <div class="q-text">${qTitleHTML(q, single ? '' : `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
  });

  const corner = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor">
    <rect x="1" y="1" width="22" height="22" fill="#fff" stroke-width="1.4"/>
    <circle cx="12" cy="12" r="7" stroke-width="1"/><circle cx="12" cy="12" r="3.6" stroke-width="1"/>
    <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
  </svg>`;

  return `
    <div class="k-band"></div>
    ${['tr','tl','br','bl'].map(p => `<div class="k-corner k-corner-${p}">${corner}</div>`).join('')}
    <div class="deco-content">
      ${framedHeaderHTML(`${laurelSVG('k-laurel')}<div>${examTitleHTML()}</div>${laurelSVG('k-laurel', true)}`)}
      <div class="hw-note-gen">${HW_NOTE}</div>
      ${body}
      ${closingHTML()}
    </div>`;
}

/* ── MODEL M — ROME (tresse de mosaïque, nœud de Salomon, plaque, couronne de laurier) ── */
function wreathSVG(cls) {
  let leaves = '';
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const deg = 162 - i * 21;                            // angle from the top: bottom → up each side
      const a = deg * Math.PI / 180;
      const x = side * 9.5 * Math.sin(a), y = -9.5 * Math.cos(a);
      const rot = side * (deg - 90 - 28);                  // along the circle, tilted outwards
      leaves += `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="1.5" ry="3.3" transform="rotate(${rot.toFixed(0)} ${x.toFixed(2)} ${y.toFixed(2)})"/>`;
    }
  }
  return `<svg class="${cls}" viewBox="-14 -14 28 28" xmlns="http://www.w3.org/2000/svg" fill="currentColor">${leaves}
    <path d="M-3 11.5Q0 9.5 3 11.5" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
}

function genExamM() {
  let body = '';
  S.sections.forEach((sec, si) => {
    body += `<div class="m-sec">
      <span class="m-wreath">${wreathSVG('m-wreath-svg')}<b>${ROMAN[si] || si + 1}</b></span>
      <span class="m-sec-title">القسم ${ordName(si)}</span>
      <span class="m-line"></span>
      <span class="m-pts">${sec.points} ن</span>
    </div>`;
    const single = sec.questions.length === 1;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-box m-q">
        <div class="q-text">${qTitleHTML(q, single ? '' : `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
  });

  // Solomon's knot — a classic motif of the Roman mosaics of Tunisia
  const knot = `<svg viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg" fill="none">
    <rect x="-11.3" y="-11.3" width="22.6" height="22.6" fill="#fff" stroke="currentColor" stroke-width="1.4"/>
    <g stroke-linecap="round">
      <rect x="-7.5" y="-3" width="15" height="6" rx="3" transform="rotate(45)" stroke="currentColor" stroke-width="3.2"/>
      <rect x="-7.5" y="-3" width="15" height="6" rx="3" transform="rotate(45)" stroke="#fff" stroke-width="1.3"/>
      <rect x="-7.5" y="-3" width="15" height="6" rx="3" transform="rotate(-45)" stroke="currentColor" stroke-width="3.2"/>
      <rect x="-7.5" y="-3" width="15" height="6" rx="3" transform="rotate(-45)" stroke="#fff" stroke-width="1.3"/>
    </g>
  </svg>`;
  const rivets = ['tl','tr','bl','br'].map(p => `<i class="m-rivet m-rivet-${p}"></i>`).join('');

  return `
    <div class="m-band"></div>
    ${['tr','tl','br','bl'].map(p => `<div class="m-corner m-corner-${p}">${knot}</div>`).join('')}
    <div class="deco-content">
      <div class="m-attic"></div>
      ${framedHeaderHTML(`<div class="m-plaque">${rivets}<div>${examTitleHTML()}</div></div>`)}
      <div class="hw-note-gen">${HW_NOTE}</div>
      ${body}
      ${closingHTML()}
    </div>`;
}

/* ── MODEL N — EL JEM (plan de l'amphithéâtre, façade à arcades) ── */
function genExamN() {
  let body = '';
  S.sections.forEach((sec, si) => {
    body += `<div class="n-sec">
      <span class="n-sec-title">القسم ${ordName(si)}</span>
      <span class="n-arcade"></span>
      <span class="n-pts">${sec.points} ن</span>
    </div>`;
    const single = sec.questions.length === 1;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-box n-q">
        <div class="q-text">${qTitleHTML(q, single ? '' : `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
  });

  // Elliptical plan: outer wall, arena, and the tiers of seats between them
  let rays = '';
  for (let i = 0; i < 36; i++) {
    const a = i * Math.PI / 18, c = Math.cos(a), s = Math.sin(a);
    rays += `M${(100 + 82 * c).toFixed(1)} ${(40 + 30 * s).toFixed(1)}L${(100 + 97 * c).toFixed(1)} ${(40 + 38 * s).toFixed(1)}`;
  }
  const ns = 'vector-effect="non-scaling-stroke"';
  const arena = `<svg class="n-arena-bg" viewBox="0 0 200 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
      fill="none" stroke="currentColor">
    <ellipse cx="100" cy="40" rx="97" ry="38" stroke-width="1.6" ${ns}/>
    <ellipse cx="100" cy="40" rx="89" ry="34" stroke-width=".6" ${ns}/>
    <ellipse cx="100" cy="40" rx="82" ry="30" stroke-width="1.2" ${ns}/>
    <path d="${rays}" stroke-width=".6" ${ns}/>
  </svg>`;

  return `
    <div class="n-frame"></div>
    <div class="n-facade"></div>
    <div class="deco-content">
      ${framedHeaderHTML(`<div class="n-arena">${arena}<div class="n-arena-text">${examTitleHTML()}</div></div>`)}
      <div class="hw-note-gen">${HW_NOTE}</div>
      ${body}
      ${closingHTML()}
    </div>`;
}

/* ── QUESTION CONTENT ── */
function renderQContent(q) {
  switch (q.type) {
    case 'paragraph':
    case 'definition':
      return renderDottedLines(q.params.lines || (q.type === 'paragraph' ? 12 : 3));
    case 'timeline':
      return renderTimeline(q.params);
    case 'map':
      return renderMap(q.params);
    case 'table':
      return renderTable(q.params);
    default:
      return '';
  }
}

function tableCols(p) { return Math.min(6,  Math.max(1, parseInt(p.cols) || 3)); }
function tableRows(p) { return Math.min(10, Math.max(1, parseInt(p.rows) || 3)); }

/* ── TABLE ── */
function renderTable(p) {
  const cols = tableCols(p), rows = tableRows(p);
  const h = (parseInt(p.cellHeight) || 2) * 8;          // mm of writing space per row
  const headers = p.headers || [];
  const hasHead = headers.slice(0, cols).some(t => t && t.trim());

  let html = '<table class="q-table">';
  if (hasHead) {
    html += '<thead><tr>';
    for (let c = 0; c < cols; c++) html += `<th>${esc(headers[c] || '')}</th>`;
    html += '</tr></thead>';
  }
  html += '<tbody>';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += `<td style="height:${h}mm">${esc(((p.cells || [])[r] || [])[c] || '')}</td>`;
    }
    html += '</tr>';
  }
  return html + '</tbody></table>';
}

function renderDottedLines(n) {
  return Array.from({ length: n }, () => `<div class="dotted-line"></div>`).join('');
}

/* ── TIMELINE SVG ── */
function renderTimeline(params) {
  const count  = Math.min(8, Math.max(2, parseInt(params.count) || 4));
  const events = Array.isArray(params.events) ? params.events : [];

  const W      = 630;
  const H      = 140;
  const lineY  = 70;
  const mLeft  = 20;   // left margin (arrow tip)
  const mRight = 15;   // right margin (start of line)
  const arrowW = 10;
  const axisLen = W - mLeft - mRight - arrowW;
  const spacing = axisLen / (count + 1);
  const slotW   = spacing * 0.82;

  let ticks = '';

  for (let i = 0; i < count; i++) {
    // RTL: event[0] is rightmost (highest x in SVG)
    const x      = W - mRight - (i + 1) * spacing;
    const evt    = esc(events[i] || '');
    const sw     = slotW;
    const lx     = x - sw / 2;
    const dateY  = lineY - 18;
    const lblY   = lineY + 18;

    // graduation tick
    ticks += `<line x1="${x}" y1="${lineY-10}" x2="${x}" y2="${lineY+10}" stroke="#222" stroke-width="1.5"/>`;

    // dotted date line above
    ticks += `<line x1="${lx}" y1="${dateY}" x2="${lx+sw}" y2="${dateY}" stroke="#555" stroke-width="1" stroke-dasharray="4,3"/>`;

    // event label below via foreignObject
    ticks += `
      <foreignObject x="${lx}" y="${lblY}" width="${sw}" height="52">
        <div xmlns="http://www.w3.org/1999/xhtml"
             style="font-family:'Cairo',sans-serif;font-size:8.5pt;text-align:center;
                    direction:rtl;width:100%;line-height:1.4;word-break:break-word;color:#000">
          ${evt}
        </div>
      </foreignObject>`;
  }

  const ax = mLeft + arrowW;

  return `<div class="timeline-wrap">
    <svg viewBox="0 40 ${W} ${H - 40}" width="100%"
         xmlns="http://www.w3.org/2000/svg" style="overflow:visible;display:block">

      <!-- axis line -->
      <line x1="${ax}" y1="${lineY}" x2="${W - mRight}" y2="${lineY}"
            stroke="#222" stroke-width="2"/>

      <!-- arrowhead pointing left -->
      <polygon points="${mLeft},${lineY} ${ax+1},${lineY-5} ${ax+1},${lineY+5}" fill="#222"/>

      <!-- right end cap -->
      <line x1="${W-mRight}" y1="${lineY-7}" x2="${W-mRight}" y2="${lineY+7}"
            stroke="#222" stroke-width="2"/>

      ${ticks}
    </svg>
  </div>`;
}

/* ── MAP ── */
function renderMap(params) {
  const w = params.imageWidth || '100%';
  let html = '';

  if (params.imageData) {
    html += `<div class="map-center">
      <img src="${params.imageData}" class="map-img" style="width:${w}" alt="خريطة">
    </div>`;
  } else {
    html += `<div class="map-center" style="border:1px dashed #bbb;padding:18px;color:#aaa;font-family:'Cairo',sans-serif;font-size:10pt">
      [ يرجى تحميل صورة الخريطة ]
    </div>`;
  }

  const lc = parseInt(params.legendCount) || 0;
  if (lc > 0) {
    let items = '';
    for (let i = 1; i <= lc; i++) {
      items += `<div class="legend-item">
        <span class="legend-num">${i}</span>
        <span class="legend-dash"></span>
      </div>`;
    }
    html += `<div class="map-legend-box">
      <div class="map-legend-title">مفتاح الخريطة</div>
      ${items}
    </div>`;
  }

  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT / SAVE / LOAD / RESET
// ─────────────────────────────────────────────────────────────────────────────

function printExam() {
  if (totalPoints() > 18) {
    alert('لا يمكن الطباعة: مجموع نقاط الأقسام يتجاوز 18.');
    return;
  }
  if (isTouchDevice()) { sharePDF(); return; }
  if (storageGet(PRINT_HELP_KEY) === '1') { window.print(); return; }
  const over = !document.getElementById('page-warn')?.hidden;
  document.getElementById('print-help-over').hidden = !over;
  document.getElementById('print-help').hidden = false;
}

function closePrintHelp(go) {
  if (document.getElementById('print-help-skip').checked) storageSet(PRINT_HELP_KEY, '1');
  document.getElementById('print-help').hidden = true;
  if (go) setTimeout(() => window.print(), 50);
}

// Replace the current state with a loaded one (library, file or draft)
function applyState(loaded) {
  S = loaded;
  if (!MODELS.some(m => m.id === S.model)) S.model = 'C';
  S.decor = { ...defaultDecor(), ...(S.decor || {}) };
  S.opts  = { ...defaultOpts(),  ...(S.opts  || {}) };
  if (S.seq === undefined) S.seq = null;
  if (S.docId === undefined) S.docId = null;
  const allIds = [0, ...S.sections.flatMap(s => [s.id, ...s.questions.map(q => q.id)])];
  _nextId = Math.max(...allIds) + 1;
}

const clone = o => JSON.parse(JSON.stringify(o));

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE — IndexedDB: « Mes examens » library + draft of the exam being edited
// ─────────────────────────────────────────────────────────────────────────────

const PRINT_HELP_KEY = 'examgen.printHelpSeen';
const OLD_DRAFT_KEY  = 'examgen.current';        // former localStorage draft (migrated)

function storageGet(k)    { try { return localStorage.getItem(k); } catch { return null; } }
function storageSet(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }

let _dbp = null;
function db() {
  if (!_dbp) _dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open('examgen', 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('exams')) d.createObjectStore('exams', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('kv'))    d.createObjectStore('kv');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return _dbp;
}

async function dbReq(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx  = d.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
const dbAll = ()      => dbReq('exams', 'readonly',  s => s.getAll());
const dbGet = id      => dbReq('exams', 'readonly',  s => s.get(id));
const dbPut = rec     => dbReq('exams', 'readwrite', s => s.put(rec));
const dbDel = id      => dbReq('exams', 'readwrite', s => s.delete(id));
const kvGet = k       => dbReq('kv',    'readonly',  s => s.get(k));
const kvSet = (k, v)  => dbReq('kv',    'readwrite', s => s.put(v, k));

const newDocId = () => 'ex' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── names shown in the library ──

// Exam name = built from the header (always up to date); when an exam with the same name is already
// stored, a number is inserted before the school year:  … – التاسعة أساسي – 1 – 2026/2027
function nameParts(st) {
  const h = st.header, y = parseInt(h.yearStart);
  return { head: `${h.examType} عدد ${h.examNumber} – ${h.subject} – ${h.level}`, year: `${y}/${y + 1}` };
}
function titleFor(st, seq) {
  const { head, year } = nameParts(st);
  return seq > 0 ? `${head} – ${seq} – ${year}` : `${head} – ${year}`;
}
function nameKey(st) { const p = nameParts(st); return p.head + '|' + p.year; }

let _names = [];   // { id, key, seq } of every stored exam (refreshed after each change in the library)
async function loadNames() {
  try { _names = (await dbAll()).map(r => ({ id: r.id, key: nameKey(r.data), seq: r.seq || 0 })); }
  catch { _names = []; }
}

// 0 = no number; otherwise the number making the name unique among the OTHER stored exams.
// An already assigned number is kept as long as it stays free (names do not change by themselves).
function computeSeq(st) {
  const key = nameKey(st);
  const used = new Set(_names.filter(n => n.key === key && n.id !== st.docId).map(n => n.seq));
  if (!used.size) return 0;
  if (st.seq != null && !used.has(st.seq)) return st.seq;
  let n = 0;
  while (used.has(n)) n++;
  return n;
}

// Isolates an Arabic name inside a French sentence (keeps the right reading order)
function iso(t) { return '⁨' + t + '⁩'; }

function autoTitle(st = S) { return titleFor(st, 0); }
function examTitle(st = S) { return titleFor(st, computeSeq(st)); }
function updateTitlePreview() {
  const el = document.getElementById('title-preview');
  if (el) el.textContent = examTitle();
}

function makeRecord(data, createdAt, updatedAt) {
  const h = data.header;
  return {
    id: data.docId, title: titleFor(data, data.seq || 0), seq: data.seq || 0,
    subject: h.subject, level: h.level, examType: h.examType, examNumber: h.examNumber,
    model: data.model, createdAt, updatedAt, data,
  };
}

// ── draft: the exam being edited is kept continuously (survives closing the tab) ──
let _saveTimer = null, _draftFailed = false;
let _savedJson = null;   // JSON of the version stored in the library (null = never saved)
let _savedAt = null;
let _dirty = false;      // differences with the library version

function hasContent(st = S) {
  return st.sections.some(s => s.questions.length > 0);
}

function scheduleAutosave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(autosave, 400);
}

async function autosave() {
  clearTimeout(_saveTimer);
  _saveTimer = null;
  const json = JSON.stringify(S);
  _dirty = S.docId ? json !== _savedJson : hasContent();
  try { await kvSet('draft', json); _draftFailed = false; }
  catch { _draftFailed = true; }
  updateSaveStatus();
}

async function restoreDraft() {
  try {
    let json = await kvGet('draft');
    if (!json) {                                   // migrate the former localStorage draft
      json = storageGet(OLD_DRAFT_KEY);
      try { localStorage.removeItem(OLD_DRAFT_KEY); } catch {}
    }
    const st = json && JSON.parse(json);
    if (!st || !Array.isArray(st.sections) || !st.header) return false;
    applyState(st);
    if (S.docId) {
      const rec = await dbGet(S.docId);
      if (rec) { _savedJson = JSON.stringify(rec.data); _savedAt = new Date(rec.updatedAt); }
      else S.docId = null;                          // deleted meanwhile
    }
    _dirty = S.docId ? JSON.stringify(S) !== _savedJson : hasContent();
    return true;
  } catch { return false; }
}

function updateSaveStatus() {
  const el = document.getElementById('save-status');
  if (!el) return;
  const hm = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (_draftFailed) {
    el.className = 'save-err';
    el.textContent = '⚠ لم يعد المتصفح قادرًا على الحفظ (المساحة ممتلئة).';
  } else if (_dirty) {
    el.className = 'save-dirty';
    el.textContent = S.docId ? '● تعديلات غير محفوظة' : '● الفرض لم يُحفظ بعد';
  } else if (S.docId) {
    el.className = 'save-ok';
    el.textContent = `✓ تمّ الحفظ في «فروضي»${_savedAt ? ' على الساعة ' + hm(_savedAt) : ''}`;
  } else {
    el.className = '';
    el.textContent = '';
  }
}

window.addEventListener('beforeunload', () => { if (_saveTimer) autosave(); });

// ── save / new ──
async function saveExam() {
  try {
    if (!S.docId) S.docId = newDocId();
    await loadNames();
    S.seq = computeSeq(S);
    const now = Date.now();
    const old = await dbGet(S.docId);
    await dbPut(makeRecord(clone(S), old ? old.createdAt : now, now));
    _savedJson = JSON.stringify(S);
    _savedAt = new Date(now);
    await loadNames();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    await autosave();
    toast(`✓ تمّ حفظ «${iso(examTitle())}» في فروضي`);
    return true;
  } catch (err) {
    alert("تعذّر حفظ الفرض.\n\n(" + (err && err.message) + ')');
    return false;
  }
}

// Asks what to do with unsaved changes. Resolves true when it is OK to continue.
async function confirmLeave() {
  if (_saveTimer) await autosave();
  if (!_dirty) return true;
  const choice = await askDialog({
    title: 'تعديلات غير محفوظة',
    text: `الفرض «${iso(examTitle())}» يحتوي على تعديلات لم تُحفظ بعد.`,
    buttons: [
      { label: 'إلغاء', value: 'cancel', cls: 'btn-ghost' },
      { label: 'عدم الحفظ', value: 'discard', cls: 'btn-secondary' },
      { label: '💾 حفظ', value: 'save', cls: 'btn-primary' },
    ],
  });
  if (choice === 'save') return await saveExam();
  return choice === 'discard';
}

async function newExam() {
  if (!await confirmLeave()) return;
  S = {
    model: S.model, header: { ...S.header }, sections: defaultSections(),
    decor: S.decor, opts: S.opts, seq: null, docId: null,
  };
  _savedJson = null; _savedAt = null; _dirty = false;
  renderAll();
  toast('فرض جديد: تمّ الاحتفاظ بالترويسة والأسئلة فارغة.');
}

// ─────────────────────────────────────────────────────────────────────────────
// « MES EXAMENS » — library window
// ─────────────────────────────────────────────────────────────────────────────

let _libItems = [];

async function openLibrary() {
  if (_saveTimer) await autosave();
  try {
    _libItems = (await dbAll()).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    alert('تعذّرت قراءة «فروضي» في هذا المتصفح.\n\n(' + (err && err.message) + ')');
    return;
  }
  document.getElementById('library').hidden = false;
  renderLibraryList();
}

function closeLibrary() { document.getElementById('library').hidden = true; }

async function refreshLibrary() {
  _libItems = (await dbAll()).sort((a, b) => b.updatedAt - a.updatedAt);
  renderLibraryList();
}

function renderLibraryList() {
  const q = (document.getElementById('lib-search').value || '').trim().toLowerCase();
  const fmt = t => new Date(t).toLocaleString('ar-TN-u-nu-latn',
    { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const label = r => [r.subject, r.level, `${r.examType} عدد ${r.examNumber}`,
    (MODELS.find(m => m.id === r.model) || {}).label].filter(Boolean).join(' · ');

  const items = _libItems.filter(r =>
    !q || `${r.title} ${label(r)} ${r.subject} ${r.level}`.toLowerCase().includes(q));

  const list = document.getElementById('lib-list');
  if (!_libItems.length) {
    list.innerHTML = `<div class="lib-empty">لا يوجد أي فرض محفوظ حاليًا.<br>
      اضغط على <b>💾 حفظ</b> أسفل النموذج للاحتفاظ بالفرض الحالي هنا.</div>`;
    return;
  }
  if (!items.length) {
    list.innerHTML = `<div class="lib-empty">لا يوجد فرض مطابق لـ «${esc(q)}».</div>`;
    return;
  }
  list.innerHTML = items.map(r => {
    const current = r.id === S.docId;
    return `<div class="lib-item ${current ? 'current' : ''}">
      <div class="lib-icon">${r.subject === 'الجغرافيا' ? '🌍' : '📜'}</div>
      <div class="lib-main">
        <div class="lib-title" dir="auto">${esc(r.title)}</div>
        <div class="lib-sub">${esc(label(r))}${current ? ' <span class="lib-badge">مفتوح</span>' : ''}</div>
        <div class="lib-date">آخر تعديل : ${fmt(r.updatedAt)}</div>
      </div>
      <div class="lib-actions">
        <button class="btn btn-primary btn-sm" onclick="openFromLibrary('${r.id}')">📂 فتح</button>
        <button class="btn btn-ghost btn-sm" onclick="duplicateExam('${r.id}')"
          title="إنشاء نسخة (لقسم آخر أو للسنة القادمة…)">⧉ نسخ</button>
        <button class="btn-icon" title="تنزيل ملف الفرض (لإرساله أو الاحتفاظ به)"
          onclick="downloadExam('${r.id}')">⬇</button>
        <button class="btn-icon danger" title="حذف" onclick="deleteExam('${r.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
}

async function openFromLibrary(id) {
  if (id === S.docId && !_dirty) { closeLibrary(); return; }
  if (!await confirmLeave()) return;
  const rec = await dbGet(id);
  if (!rec) { await refreshLibrary(); return; }
  applyState(clone(rec.data));
  S.docId = rec.id;
  _savedJson = JSON.stringify(S);
  _savedAt = new Date(rec.updatedAt);
  _dirty = false;
  closeLibrary();
  renderAll();
  toast(`تمّ فتح الفرض : «${iso(examTitle())}»`);
}

async function duplicateExam(id) {
  const rec = await dbGet(id);
  if (!rec) return;
  const data = clone(rec.data);
  data.docId = newDocId();
  data.seq = null;
  await loadNames();
  data.seq = computeSeq(data);
  const now = Date.now();
  await dbPut(makeRecord(data, now, now));
  await loadNames();
  await refreshLibrary();
  toast('تمّ إنشاء نسخة : «' + iso(examTitle(data)) + '»');
}

async function deleteExam(id) {
  const rec = await dbGet(id);
  if (!rec) return;
  const choice = await askDialog({
    title: 'حذف هذا الفرض؟',
    text: `«${iso(rec.title)}» سيُحذف نهائيًا من فروضي.`,
    buttons: [
      { label: 'إلغاء', value: 'cancel', cls: 'btn-ghost' },
      { label: '🗑 حذف', value: 'delete', cls: 'btn-danger' },
    ],
  });
  if (choice !== 'delete') return;
  await dbDel(id);
  await loadNames();
  if (id === S.docId) {           // the open exam stays on screen, as a not-yet-saved exam
    S.docId = null; _savedJson = null; _savedAt = null;
    await autosave();
  }
  await refreshLibrary();
  toast('تمّ حذف الفرض.');
}

// ── files: one exam, or a backup of the whole library ──
function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const safeName = s => s.replace(/[\\/:*?"<>|]/g, '-').slice(0, 90);

async function downloadExam(id) {
  const rec = await dbGet(id);
  if (rec) downloadJSON(rec.data, safeName(rec.title) + '.json');
}

async function exportAll() {
  const exams = await dbAll();
  if (!exams.length) { toast('لا توجد فروض للنسخ الاحتياطي.'); return; }
  const day = new Date().toISOString().slice(0, 10);
  downloadJSON({ type: 'examgen-backup', version: 1, exportedAt: Date.now(), exams },
    `نسخة احتياطية - فروضي ${day}.json`);
  toast(`تمّ حفظ ${exams.length} فرض في مجلد التنزيلات.`);
}

function importFile(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const obj = JSON.parse(e.target.result);
      const now = Date.now();
      let n = 0;
      if (obj && obj.type === 'examgen-backup' && Array.isArray(obj.exams)) {
        for (const rec of obj.exams) {
          if (!rec || !rec.data || !rec.data.header || !Array.isArray(rec.data.sections)) continue;
          if (!/^[\w-]+$/.test(rec.id || '')) rec.id = newDocId();
          rec.data.docId = rec.id;
          await dbPut(makeRecord(rec.data, rec.createdAt || now, rec.updatedAt || now));
          n++;
        }
      } else if (obj && obj.header && Array.isArray(obj.sections)) {   // a single exam
        const data = clone(obj);
        data.docId = newDocId();
        data.seq = null;
        await loadNames();
        data.seq = computeSeq(data);
        await dbPut(makeRecord(data, now, now));
        n = 1;
      } else {
        throw new Error('format inconnu');
      }
      await loadNames();
      await refreshLibrary();
      toast(n ? `تمّت إضافة ${n} فرض إلى فروضي.` : 'لم يُعثر على أي فرض في هذا الملف.');
    } catch (err) {
      alert("تعذّر استيراد هذا الملف. اختر ملف فرض (.json).\n\n(" + err.message + ')');
    }
  };
  reader.readAsText(file);
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF — built in the browser (works on phones, where printing often does nothing),
// then shared (WhatsApp, e-mail…) through the phone's share menu, or downloaded
// ─────────────────────────────────────────────────────────────────────────────

const PDF_LIBS = [
  'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
];
let _pdfLibs = null, _pdfFile = null, _pdfBusy = false;

// 794 px (A4 width) × 3.5 ≈ 2780 px → about 340 DPI: sharp text, good master for photocopies
const PDF_PIXEL_RATIO  = 3.5;
const PDF_JPEG_QUALITY = 0.95;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Chargement impossible : ' + src));
    document.head.appendChild(s);
  });
}

function loadPdfLibs() {
  if (!_pdfLibs) _pdfLibs = Promise.all(PDF_LIBS.map(loadScript)).catch(err => { _pdfLibs = null; throw err; });
  return _pdfLibs;
}

// Phones / tablets: no usable print dialog → the print button makes a PDF instead
function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 1024;
}

async function makePdfBlob() {
  await loadPdfLibs();
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  // Render a clean, unzoomed copy of the page off-screen (the preview may be scaled or hidden on phones)
  const src = document.getElementById('exam-a4');
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;background:#fff;';
  const page = document.createElement('div');
  page.className = src.className;
  page.setAttribute('dir', 'rtl');
  page.setAttribute('lang', 'ar');
  page.innerHTML = src.innerHTML;
  page.querySelectorAll('.page-guide').forEach(n => n.remove());
  page.style.boxShadow = 'none';
  holder.appendChild(page);
  document.body.appendChild(holder);

  try {
    const W = page.offsetWidth;
    const pageH = Math.round(W * 297 / 210);
    const pages = Math.max(1, Math.ceil((Math.max(examContentHeight(page), pageH) - 2) / pageH));

    // Each A4 page is captured on its own through a page-sized window, so the resolution
    // stays high (≈ 340 DPI) without exceeding phone canvas limits (~16 Mpx on iPhone).
    const clip = document.createElement('div');
    clip.style.cssText = `position:relative;width:${W}px;height:${pageH}px;overflow:hidden;background:#fff;`;
    holder.appendChild(clip);
    clip.appendChild(page);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    for (let i = 0; i < pages; i++) {
      page.style.marginTop = `${-i * pageH}px`;
      const canvas = await htmlToImage.toCanvas(clip, {
        pixelRatio: PDF_PIXEL_RATIO, backgroundColor: '#ffffff', width: W, height: pageH,
      });
      if (i) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', PDF_JPEG_QUALITY), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }
    pdf.setProperties({ title: examTitle() });
    return pdf.output('blob');
  } finally {
    holder.remove();
  }
}

async function sharePDF() {
  if (_pdfBusy) return;
  if (totalPoints() > 18) {
    alert('لا يمكن إنشاء ملف PDF: مجموع نقاط الأقسام يتجاوز 18.');
    return;
  }
  _pdfBusy = true;
  setPdfButtons(true);
  try {
    const blob = await makePdfBlob();
    _pdfFile = new File([blob], safeName(examTitle()) + '.pdf', { type: 'application/pdf' });
  } catch (err) {
    alert("تعذّر إنشاء ملف PDF. تحقّق من اتصال الإنترنت ثم أعد المحاولة.\n\n(" + (err && err.message) + ')');
    return;
  } finally {
    _pdfBusy = false;
    setPdfButtons(false);
  }

  // Share right away (phone share menu: WhatsApp, e-mail…). Phones only allow it shortly after
  // the tap; if the moment has passed or it is refused, ask for one more tap in the « PDF prêt » window.
  if (canShareFile(_pdfFile)) {
    const tapStillValid = !navigator.userActivation || navigator.userActivation.isActive;
    if (tapStillValid) {
      try {
        await navigator.share({ files: [_pdfFile], title: examTitle() });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;      // the user closed the share menu
      }
    }
    showPdfReady();
    return;
  }
  downloadPdf();                                          // computer without share menu: save the file
}

// Load the PDF tools in the background once the page is idle, so the first tap is quick
window.addEventListener('load', () => {
  const warm = () => loadPdfLibs().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 5000 });
  else setTimeout(warm, 3000);
});

function setPdfButtons(busy) {
  document.querySelectorAll('.btn-pdf').forEach(b => {
    b.disabled = busy;
    b.textContent = busy ? '⏳ جارٍ التحضير…' : b.dataset.label;
  });
}

function canShareFile(file) {
  try { return !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch { return false; }
}

// Second step with a fresh tap: phones only allow the share menu right after a user gesture
function showPdfReady() {
  const kb = Math.max(1, Math.round(_pdfFile.size / 1024));
  document.getElementById('pdf-name').textContent = `${_pdfFile.name} (${kb < 1024 ? kb + ' KB' : (kb / 1024).toFixed(1) + ' MB'})`;
  document.getElementById('pdf-share').hidden = !canShareFile(_pdfFile);
  document.getElementById('pdf-ready').hidden = false;
}

function closePdfReady() { document.getElementById('pdf-ready').hidden = true; }

async function doSharePdf() {
  try {
    await navigator.share({ files: [_pdfFile], title: examTitle() });
    closePdfReady();
  } catch (err) {
    if (err && err.name === 'AbortError') return;           // the user closed the share menu
    downloadPdf();
  }
}

function downloadPdf() {
  const url = URL.createObjectURL(_pdfFile);
  Object.assign(document.createElement('a'), { href: url, download: _pdfFile.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  closePdfReady();
  toast('📄 تمّ حفظ ملف PDF (مجلد التنزيلات).');
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL UI HELPERS — dialog with custom buttons, toast message
// ─────────────────────────────────────────────────────────────────────────────

function askDialog({ title, text, buttons }) {
  return new Promise(resolve => {
    const box = document.getElementById('dialog');
    document.getElementById('dlg-title').textContent = title;
    document.getElementById('dlg-text').textContent = text;
    const btns = document.getElementById('dlg-btns');
    btns.innerHTML = '';
    buttons.forEach(b => {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || 'btn-ghost');
      el.textContent = b.label;
      el.onclick = () => { box.hidden = true; resolve(b.value); };
      btns.appendChild(el);
    });
    box.hidden = false;
    btns.lastChild.focus();
  });
}

let _toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('dialog').hidden) closeLibrary();
});

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Escape HTML special chars */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Generate selected attribute */
function sel(current, value) {
  return current === value ? 'selected' : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE — MOBILE TAB SWITCHING & A4 SCALING
// ─────────────────────────────────────────────────────────────────────────────

/** Switch between Formulaire / Aperçu on mobile */
function showTab(tab) {
  document.getElementById('screen-app').classList.toggle('show-preview', tab === 'preview');
  document.querySelectorAll('#mobile-tabs .tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  if (tab === 'preview') requestAnimationFrame(scalePreview);
}

/**
 * Scale the A4 preview to fit the available width on small screens.
 *
 * We use CSS `zoom` (not transform) because zoom shrinks the element
 * in the layout flow — the print-zone naturally wraps the reduced size
 * and preview-panel centers it without any manual offset calculation.
 * `zoom: 1 !important` in @media print resets it for full-A4 output.
 */
/**
 * Warn when the exam no longer fits on one A4 page: red guide line in the
 * preview at the end of page 1 + message in the form footer.
 * Width and height are read in the same (zoomed) space, so the ratio holds on mobile too.
 */
/**
 * Height actually used by the exam content. Decorations (frames, watermarks, a globe
 * sticking out of a corner) are absolutely positioned and must not count — scrollHeight
 * would include them even when they are clipped.
 */
function examContentHeight(el) {
  let bottom = 0;
  for (const child of el.children) {
    if (getComputedStyle(child).position === 'absolute') continue;
    bottom = Math.max(bottom, child.offsetTop + child.offsetHeight);
  }
  return bottom + parseFloat(getComputedStyle(el).paddingBottom || 0);
}

// Is the exam longer than one A4 page? Measured on an off-screen copy at the real page width,
// so the answer is right even when the preview is hidden (phone: « Formulaire » tab) or zoomed out.
function examIsTooLong() {
  const src = document.getElementById('exam-a4');
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;visibility:hidden;pointer-events:none;';
  const page = document.createElement('div');
  page.className = src.className;
  page.setAttribute('dir', 'rtl');
  page.setAttribute('lang', 'ar');
  page.innerHTML = src.innerHTML;
  page.querySelectorAll('.page-guide').forEach(n => n.remove());
  page.style.zoom = '1';
  holder.appendChild(page);
  document.body.appendChild(holder);
  try {
    return examContentHeight(page) > page.offsetWidth * 297 / 210 + 2;
  } finally {
    holder.remove();
  }
}

function checkPageOverflow() {
  const el = document.getElementById('exam-a4');
  if (!el) return;
  el.querySelector('.page-guide')?.remove();
  const over = examIsTooLong();
  if (over) {
    el.insertAdjacentHTML('beforeend',
      '<div class="page-guide"><span>نهاية الصفحة 1 — الباقي سيُطبع في صفحة ثانية</span></div>');
  }
  const warn = document.getElementById('page-warn');
  if (warn) {
    warn.hidden = !over;
    warn.textContent = over
      ? "⚠ الفرض يتجاوز صفحة واحدة (الخط الأحمر في المعاينة) : قلّل عدد الأسطر."
      : '';
  }
}

function scalePreview() {
  const panel = document.getElementById('preview-panel');
  const exam  = document.getElementById('exam-a4');
  if (!panel || !exam) return;

  // Reset any previously applied scaling
  exam.style.zoom = '';

  // The form takes most of the width: shrink the A4 page to fit the space left for the preview
  // (210 mm = 794 px at the CSS reference pixel, 96 dpi). Printing is never affected (zoom reset in @media print).
  const A4_W  = 794;
  const cs    = getComputedStyle(panel);
  const pad   = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  if (!panel.clientWidth) return;         // preview hidden (phone, « Formulaire » tab): scaled when it is shown
  const scale = (panel.clientWidth - pad) / A4_W;

  if (scale >= 1) return;                 // container already wider than A4

  exam.style.zoom = Math.max(scale, 0.3); // zoom affects layout → auto-centering works
}

window.addEventListener('resize', scalePreview);

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

S.sections = defaultSections();
renderAll();
loadNames().then(restoreDraft).then(ok => { if (ok) renderAll(); else updateTitlePreview(); });

