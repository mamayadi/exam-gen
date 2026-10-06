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
  title: '',              // name shown in « Mes examens » (not printed)
  docId: null,            // id in the library (null = never saved)
  decor: defaultDecor(),  // Model C watermark
  opts: defaultOpts()     // options shared by all models
};

function defaultDecor() {
  return { watermark: 'europe', imageData: null, imageName: '' };
}

function defaultOpts() {
  return { icons: true, closing: 'بالتوفيق والنجاح', autoModel: false };
}

// Template registry — order = order in the picker
const MODELS = [
  { id: 'C', label: 'Décoré',         gen: genExamC },
  { id: 'D', label: 'Manuscrit',      gen: genExamD },
  { id: 'E', label: 'Carte ancienne', gen: genExamE },
  { id: 'G', label: 'Fil du temps',   gen: genExamG },
  { id: 'H', label: 'Archives',       gen: genExamH },
  { id: 'A', label: 'Classique',      gen: genExamA },
  { id: 'B', label: 'Moderne',        gen: genExamB },
];
const DECO_MODELS = ['C','D','E','G','H'];   // full-page decorated templates

// Model chosen automatically from the subject when opts.autoModel is on
const AUTO_MODEL = { 'التاريخ': 'D', 'الجغرافيا': 'E' };

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

function setSubject(subject) {
  S.header.subject = subject;
  if (S.opts.autoModel) S.model = AUTO_MODEL[subject] || S.model;
  renderAll();
}

function toggleAutoModel(on) {
  S.opts.autoModel = on;
  if (on) S.model = AUTO_MODEL[S.header.subject] || S.model;
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
      <div class="title-label">📝 Nom de l'examen <span class="hint">— automatique, pour le retrouver dans « Mes examens » (n'est pas imprimé)</span></div>
      <div id="title-preview" class="title-preview" dir="rtl">${esc(examTitle())}</div>
      <div class="fg">
        <label>Thème / chapitre <span class="hint">(facultatif, ajouté au nom)</span></label>
        <input type="text" dir="auto" value="${esc(S.title || '')}" placeholder="مثال: الحرب العالمية الأولى"
          oninput="S.title=this.value;updateTitlePreview();scheduleAutosave()">
      </div>
    </div>
  </div>`;
  h += buildModelPickerHTML();
  h += buildHeaderFormHTML();
  h += '<div id="secs-container">';
  S.sections.forEach((sec, si) => { h += buildSectionFormHTML(sec, si); });
  h += '</div>';
  h += `<div style="text-align:center;margin:12px 0 4px">
    <button class="btn btn-primary btn-sm" onclick="addSection()">＋ Ajouter une section</button>
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
      <span>🎨 Style de l'examen : <b>${current}</b></span>
      <span class="picker-hint">${_pickerOpen ? 'Fermer ▴' : 'Changer ▾'}</span>
    </summary>
    <div class="form-card-body">
      <div class="model-picker">${cards}</div>
      ${S.model === 'C' ? buildDecorFormHTML() : ''}
      <div class="model-opts">
        <label class="chk"><input type="checkbox" ${o.autoModel ? 'checked' : ''}
          onchange="toggleAutoModel(this.checked)">
          Style automatique selon la matière (Histoire → Manuscrit, Géographie → Carte ancienne)</label>
        <label class="chk"><input type="checkbox" ${o.icons ? 'checked' : ''}
          onchange="S.opts.icons=this.checked;renderExam()">
          Icône devant chaque question selon son type (plume, livre, sablier, carte, tableau)</label>
        <div class="fg" style="margin-top:8px">
          <label>Phrase de fin d'examen</label>
          <select onchange="S.opts.closing=this.value;renderExam()">
            ${closings.map(c => `<option value="${c}" ${sel(o.closing, c)}>${c || 'Aucune'}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  </details>`;
}

// UI state: is the template picker unfolded? (kept across form rebuilds)
let _pickerOpen = false;

// Picker thumbnails = real renders of a sample exam, scaled down (built once)
let _thumbs = null;
function getModelThumbs() {
  if (_thumbs) return _thumbs;
  const saved = S;
  S = {
    model: 'C',
    header: { ...saved.header, teacherName: '', subject: 'التاريخ' },
    decor: defaultDecor(),
    opts: defaultOpts(),
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
  _thumbs = {};
  try {
    MODELS.forEach(m => {
      S.model = m.id;
      _thumbs[m.id] = `<div class="${examClass(m.id)}" dir="rtl" lang="ar">${m.gen()}</div>`;
    });
  } finally {
    S = saved;
  }
  return _thumbs;
}

function buildDecorFormHTML() {
  const d = S.decor;
  return `
  <div class="form-row" style="margin-top:10px">
    <div class="fg">
      <label>Filigrane en bas de page</label>
      <select onchange="S.decor.watermark=this.value;renderAll()">
        <option value="europe"  ${sel(d.watermark,'europe' )}>Carte d'Europe + rose des vents</option>
        <option value="compass" ${sel(d.watermark,'compass')}>Rose des vents + quadrillage</option>
        <option value="image"   ${sel(d.watermark,'image'  )}>Image personnalisée (carte…)</option>
        <option value="none"    ${sel(d.watermark,'none'   )}>Aucun</option>
      </select>
    </div>
  </div>
  ${d.watermark === 'image' ? `
  <div class="fg" style="margin-top:6px">
    <input type="file" accept="image/*" onchange="handleWatermarkImg(this)">
    ${d.imageData ? `<div class="info-text">✓ Image chargée : ${esc(d.imageName)}</div>`
                  : `<div class="info-text">Choisir une image (ex. carte d'Europe) — elle sera affichée en transparence.</div>`}
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
    <div class="form-card-header">📋 En-tête de l'examen</div>
    <div class="form-card-body">

      <div class="form-row">
        <div class="fg" style="flex:0 0 96px">
          <label>Titre professeur</label>
          <select onchange="S.header.teacherGender=this.value;renderExam()">
            <option value="أستاذة" ${sel(hd.teacherGender,'أستاذة')}>أستاذة</option>
            <option value="أستاذ"  ${sel(hd.teacherGender,'أستاذ' )}>أستاذ</option>
          </select>
        </div>
        <div class="fg">
          <label>Nom du professeur (arabe)</label>
          <input type="text" dir="rtl" id="inp-teacher" value="${esc(hd.teacherName)}"
            oninput="S.header.teacherName=this.value;renderExam()"
            placeholder="أدخل الاسم...">
        </div>
      </div>

      <div class="form-row">
        <div class="fg">
          <label>Durée</label>
          <select onchange="S.header.duration=this.value;renderExam()">
            <option value="30" ${sel(hd.duration,'30')}>30 minutes</option>
            <option value="60" ${sel(hd.duration,'60')}>1 heure</option>
          </select>
        </div>
        <div class="fg">
          <label>Type de devoir</label>
          <select onchange="S.header.examType=this.value;renderExam()">
            <option value="الفرض العادي"    ${sel(hd.examType,'الفرض العادي'   )}>Devoir de contrôle</option>
            <option value="الفرض التأليفي"  ${sel(hd.examType,'الفرض التأليفي')}>Devoir de synthèse</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="fg" style="flex:0 0 80px">
          <label>Numéro</label>
          <select onchange="S.header.examNumber=this.value;renderExam()">
            ${['1','2','3'].map(n=>`<option value="${n}" ${sel(hd.examNumber,n)}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="fg">
          <label>Matière</label>
          <select onchange="setSubject(this.value)">
            <option value="التاريخ"    ${sel(hd.subject,'التاريخ'   )}>Histoire</option>
            <option value="الجغرافيا"  ${sel(hd.subject,'الجغرافيا')}>Géographie</option>
          </select>
        </div>
        <div class="fg">
          <label>Niveau</label>
          <select onchange="S.header.level=this.value;renderExam()">
            <option value="السابعة أساسي"  ${sel(hd.level,'السابعة أساسي' )}>7ème année</option>
            <option value="الثامنة أساسي"  ${sel(hd.level,'الثامنة أساسي' )}>8ème année</option>
            <option value="التاسعة أساسي"  ${sel(hd.level,'التاسعة أساسي' )}>9ème année</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="fg">
          <label>Année scolaire (début)</label>
          <input type="number" min="2000" max="2100" value="${hd.yearStart}"
            onchange="S.header.yearStart=parseInt(this.value)||2025;renderAll()">
        </div>
        <div class="fg">
          <label>Année de fin (auto)</label>
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
        <label class="pts-label">Points :</label>
        <input type="number" min="0" max="18" step="0.5" value="${sec.points}" class="pts-input"
          onchange="updateSecPoints(${sec.id},parseFloat(this.value))">
        <span class="pts-unit">ن</span>
        ${canDel ? `<button class="btn-icon danger" title="Supprimer cette section" onclick="removeSection(${sec.id})">✕</button>` : ''}
      </div>
    </div>
    ${mismatch ? `<div class="es-warn">ℹ Les points des questions font ${qTotal}ن, la section vaut ${sec.points}ن.</div>` : ''}
    <div class="es-form-body">
      ${sec.questions.map((q,qi) => buildQFormHTML(q, qi, sec.id)).join('')}
      <button class="btn btn-ghost btn-block" onclick="addQuestion(${sec.id})">＋ Ajouter une question</button>
    </div>
  </div>`;
}

function buildQFormHTML(q, qi, sid) {
  const typeOptions = [
    ['paragraph', 'Paragraphe (فقرة)'],
    ['definition','Définition (تعريف)'],
    ['timeline',  'Frise chronologique (سلم زمني)'],
    ['map',       'Carte géographique (خريطة)'],
    ['table',     'Tableau (جدول)'],
  ].map(([v,l]) => `<option value="${v}" ${sel(q.type,v)}>${l}</option>`).join('');

  return `
  <div class="q-form" data-qid="${q.id}">
    <div class="q-form-head">
      <span class="q-num">${qi+1}</span>
      <select class="q-type-select" title="Type de question" onchange="changeQType(${sid},${q.id},this.value)">
        ${typeOptions}
      </select>
      <input type="number" min="0" max="18" step="0.5" value="${q.points || ''}" class="pts-input" placeholder="—"
        title="Points de la question (facultatif)" onchange="updateQ(${sid},${q.id},'points',parseFloat(this.value)||0)">
      <span class="pts-unit">ن</span>
      <button class="btn-icon danger" title="Supprimer cette question" onclick="removeQuestion(${sid},${q.id})">✕</button>
    </div>

    <div class="fg" style="margin-bottom:8px">
      <label>Question (en arabe)</label>
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
          <label>Nombre de lignes (min 10)</label>
          <input type="number" min="10" max="30" value="${q.params.lines||12}"
            onchange="updateQParam(${sid},${q.id},'lines',Math.max(10,parseInt(this.value)||10))">
        </div>
      </div>`;

    case 'definition':
      return `<div class="form-row">
        <div class="fg">
          <label>Nombre de lignes (min 1)</label>
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
      <label>Colonnes (1 – 6)</label>
      <input type="number" min="1" max="6" value="${cols}"
        onchange="updateQParam(${sid},${q.id},'cols',Math.min(6,Math.max(1,parseInt(this.value)||3)))">
    </div>
    <div class="fg">
      <label>Lignes (1 – 10)</label>
      <input type="number" min="1" max="10" value="${rows}"
        onchange="updateQParam(${sid},${q.id},'rows',Math.min(10,Math.max(1,parseInt(this.value)||3)))">
    </div>
    <div class="fg">
      <label>Hauteur des cases</label>
      <select onchange="updateQParam(${sid},${q.id},'cellHeight',parseInt(this.value))">
        ${[1,2,3,4].map(n => `<option value="${n}" ${p.cellHeight == n ? 'selected' : ''}>${n} ligne${n > 1 ? 's' : ''}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="sub-title">Contenu du tableau (1re ligne = titres des colonnes) :</div>
  <div class="tbl-form-wrap"><table class="tbl-form" dir="rtl">${grid}</table></div>
  <div class="info-text">Une case laissée vide sera à compléter par l'élève.</div>`;
}

function buildTimelineParamsHTML(q, sid) {
  const count = q.params.count || 4;
  const events = q.params.events || [];
  let evInputs = '';
  for (let i = 0; i < count; i++) {
    evInputs += `<div class="form-row" style="margin-bottom:4px">
      <div class="fg">
        <label>Événement ${i+1}</label>
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
      <label>Nombre d'événements (2 – 8)</label>
      <input type="number" min="2" max="8" value="${count}"
        onchange="updateQParam(${sid},${q.id},'count',Math.min(8,Math.max(2,parseInt(this.value)||4)))">
    </div>
  </div>
  <div class="sub-title">Événements à placer sur la frise :</div>
  ${evInputs}
  <div class="info-text">L'événement 1 s'affiche à droite de la frise (sens de lecture arabe).</div>`;
}

function buildMapParamsHTML(q, sid) {
  const hasImg = !!q.params.imageData;
  return `
  <div class="fg" style="margin-bottom:6px">
    <label>Image de la carte (PNG / JPG)</label>
    <input type="file" accept="image/*"
      onchange="handleMapImg(${sid},${q.id},this)">
    ${hasImg ? `<div class="info-text">✓ Image chargée : ${esc(q.params.imageName)}</div>` : ''}
  </div>
  <div class="form-row">
    <div class="fg">
      <label>Largeur de l'image</label>
      <select onchange="updateQParam(${sid},${q.id},'imageWidth',this.value)">
        <option value="50%"  ${sel(q.params.imageWidth,'50%' )}>50 %</option>
        <option value="75%"  ${sel(q.params.imageWidth,'75%' )}>75 %</option>
        <option value="100%" ${sel(q.params.imageWidth||'100%','100%')}>100 %</option>
      </select>
    </div>
    <div class="fg">
      <label>Cases de légende (0 = aucune)</label>
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
  const msg = ok ? '✓ Total correct' : over ? '⚠ Dépassement — impression bloquée' : `⚠ Incomplet (manque ${+(18-tot).toFixed(1)}ن)`;

  document.getElementById('form-footer').innerHTML = `
    <div class="score-bar ${cls}">Total : <strong>${tot}</strong> / 18 — ${msg}</div>
    <div id="page-warn" class="page-warn" hidden></div>
    <div class="footer-row">
      <button class="btn btn-primary btn-lg" onclick="saveExam()"
        title="Garder cet examen dans « Mes examens »">💾 Enregistrer</button>
      <button class="btn btn-success btn-lg" onclick="printExam()" ${over?'disabled':''}>🖨 Imprimer / PDF</button>
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
  return `exam-a4 model-${id.toLowerCase()}${DECO_MODELS.includes(id) ? ' deco' : ''}`;
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
        <span class="stu-label">الإسم واللقب :</span><span class="stu-name-line"></span><span class="stu-field">القسم :&nbsp;&nbsp;..............&nbsp;&nbsp;</span><span class="stu-field">الرقم :&nbsp;..............</span>
      </div>
      <div class="grade-block">
        <div class="grade-box">............. / 20</div>
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
          <span class="stu-label">الإسم واللقب :</span><span class="stu-name-line"></span><span class="stu-field">القسم :&nbsp;&nbsp;..............&nbsp;&nbsp;</span><span class="stu-field">الرقم :&nbsp;..............</span>
        </div>
        <div class="grade-box-b">............ / 20</div>
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
        <div class="d-seal"><span>العدد</span><b>...... / 20</b></div>
      </div>
      <div class="hw-note-gen">${HW_NOTE}</div>

      ${body}
      ${closingHTML()}
    </div>`;
}

/* ── MODEL E — CARTE ANCIENNE ── */
function genExamE() {
  const hd = S.header;
  let body = '';
  S.sections.forEach((sec, si) => {
    body += `<div class="e-sec">
      <span class="e-sec-title">القسم ${ordName(si)}</span>
      <span class="e-route"></span>
      <span class="e-pin"><b>${sec.points} ن</b></span>
    </div>`;
    const single = sec.questions.length === 1;
    sec.questions.forEach((q, qi) => {
      body += `<div class="q-box e-q">
        <div class="q-text">${qTitleHTML(q, single ? '' : `${qi+1}- `)}</div>
        ${renderQContent(q)}
      </div>`;
    });
  });

  const lon = ['0°','10°','20°','30°','40°','50°','60°'].map(d => `<span>${d}</span>`).join('');
  const lat = ['60°','50°','40°','30°'].map(d => `<span>${d}</span>`).join('');
  const star = `<svg class="e-star" viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg" fill="#333">
    <path d="M0-11L2.5-2.5 11 0 2.5 2.5 0 11-2.5 2.5-11 0-2.5-2.5Z"/></svg>`;

  return `
    <div class="e-frame"></div>
    <div class="e-deg e-deg-top">${lon}</div>
    <div class="e-deg e-deg-bottom">${lon}</div>
    <div class="e-deg e-deg-side e-deg-right">${lat}</div>
    <div class="e-deg e-deg-side e-deg-left">${lat}</div>

    <div class="deco-content">
      <div class="e-hdr">
        <div class="e-hdr-side">
          <b>${esc(hd.teacherGender)}:</b> ${esc(hd.teacherName)}<br>
          <b>المدة:</b> ${durText()}
        </div>
        <div class="cartouche e-cartouche">
          ${cartoucheSVG('#fff', '#333')}
          <div class="cartouche-text">${examTitleHTML()}</div>
        </div>
        <div class="e-hdr-side">
          <b>المستوى:</b> ${esc(hd.level)}<br>
          <b>السنة الدراسية:</b> ${yearText()}
        </div>
      </div>

      ${ornSep(star)}

      <div class="e-stu-row">
        ${studentLineHTML()}
        <div class="e-grade"><span>العدد</span><b>...... / 20</b></div>
      </div>
      <div class="hw-note-gen">${HW_NOTE}</div>

      ${body}
      ${closingHTML()}
    </div>

    <div class="e-footer">
      <div class="e-scale">
        <div class="e-scale-title">مقياس الرسم</div>
        <div class="e-scale-bar"><i></i><i></i><i></i><i></i></div>
        <div class="e-scale-lbl"><span>0</span><span>200</span><span>400</span><span>600</span><span>800 كم</span></div>
      </div>
      ${compassSVG('e-compass', '#333')}
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
        <div class="g-grade">...... / 20</div>
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
        <div class="h-grade-stamp"><span>العدد</span><b>...... / 20</b></div>
      </div>
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
    alert('Impossible d\'imprimer : le total des sections dépasse 18 points.');
    return;
  }
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
  if (typeof S.title !== 'string') S.title = '';
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
const SUBJ_FR  = { 'التاريخ': 'Histoire', 'الجغرافيا': 'Géographie' };
const LEVEL_FR = { 'السابعة أساسي': '7e année', 'الثامنة أساسي': '8e année', 'التاسعة أساسي': '9e année' };
const TYPE_FR  = { 'الفرض العادي': 'Devoir de contrôle', 'الفرض التأليفي': 'Devoir de synthèse' };

// Exam name is built from the header (always up to date) + the optional theme typed by the teacher
function autoTitle(st = S) {
  const h = st.header;
  const y = parseInt(h.yearStart);
  return `${h.examType} عدد ${h.examNumber} – ${h.subject} – ${h.level} – ${y}/${y + 1}`;
}
function examTitle(st = S) {
  const theme = (st.title || '').trim();
  return theme ? `${autoTitle(st)} – ${theme}` : autoTitle(st);
}
function updateTitlePreview() {
  const el = document.getElementById('title-preview');
  if (el) el.textContent = examTitle();
}

function makeRecord(data, createdAt, updatedAt) {
  const h = data.header;
  return {
    id: data.docId, title: examTitle(data),
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
  return !!(st.title || '').trim() || st.sections.some(s => s.questions.length > 0);
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
    el.textContent = '⚠ Le navigateur ne peut plus rien garder (espace plein).';
  } else if (_dirty) {
    el.className = 'save-dirty';
    el.textContent = S.docId ? '● Modifications non enregistrées' : '● Examen pas encore enregistré';
  } else if (S.docId) {
    el.className = 'save-ok';
    el.textContent = `✓ Enregistré dans « Mes examens »${_savedAt ? ' à ' + hm(_savedAt) : ''}`;
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
    const now = Date.now();
    const old = await dbGet(S.docId);
    await dbPut(makeRecord(clone(S), old ? old.createdAt : now, now));
    _savedJson = JSON.stringify(S);
    _savedAt = new Date(now);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    await autosave();
    toast(`✓ « ${examTitle()} » est enregistré dans Mes examens`);
    return true;
  } catch (err) {
    alert("L'examen n'a pas pu être enregistré.\n\n(" + (err && err.message) + ')');
    return false;
  }
}

// Asks what to do with unsaved changes. Resolves true when it is OK to continue.
async function confirmLeave() {
  if (_saveTimer) await autosave();
  if (!_dirty) return true;
  const choice = await askDialog({
    title: 'Modifications non enregistrées',
    text: `L'examen « ${examTitle()} » contient des modifications qui ne sont pas encore enregistrées.`,
    buttons: [
      { label: 'Annuler', value: 'cancel', cls: 'btn-ghost' },
      { label: 'Ne pas enregistrer', value: 'discard', cls: 'btn-secondary' },
      { label: '💾 Enregistrer', value: 'save', cls: 'btn-primary' },
    ],
  });
  if (choice === 'save') return await saveExam();
  return choice === 'discard';
}

async function newExam() {
  if (!await confirmLeave()) return;
  S = {
    model: S.model, header: { ...S.header }, sections: defaultSections(),
    decor: S.decor, opts: S.opts, title: '', docId: null,
  };
  _savedJson = null; _savedAt = null; _dirty = false;
  renderAll();
  toast('Nouvel examen : l\'en-tête a été gardé, les questions sont vides.');
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
    alert('Impossible de lire « Mes examens » dans ce navigateur.\n\n(' + (err && err.message) + ')');
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
  const fmt = t => new Date(t).toLocaleString('fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const label = r => [SUBJ_FR[r.subject] || r.subject, LEVEL_FR[r.level] || r.level,
    `${TYPE_FR[r.examType] || r.examType} n°${r.examNumber}`,
    (MODELS.find(m => m.id === r.model) || {}).label].filter(Boolean).join(' · ');

  const items = _libItems.filter(r =>
    !q || `${r.title} ${label(r)} ${r.subject} ${r.level}`.toLowerCase().includes(q));

  const list = document.getElementById('lib-list');
  if (!_libItems.length) {
    list.innerHTML = `<div class="lib-empty">Aucun examen enregistré pour l'instant.<br>
      Cliquez sur <b>💾 Enregistrer</b> en bas du formulaire pour garder l'examen en cours ici.</div>`;
    return;
  }
  if (!items.length) {
    list.innerHTML = `<div class="lib-empty">Aucun examen ne correspond à « ${esc(q)} ».</div>`;
    return;
  }
  list.innerHTML = items.map(r => {
    const current = r.id === S.docId;
    return `<div class="lib-item ${current ? 'current' : ''}">
      <div class="lib-icon">${r.subject === 'الجغرافيا' ? '🌍' : '📜'}</div>
      <div class="lib-main">
        <div class="lib-title" dir="auto">${esc(r.title)}</div>
        <div class="lib-sub">${esc(label(r))}${current ? ' <span class="lib-badge">ouvert</span>' : ''}</div>
        <div class="lib-date">Modifié le ${fmt(r.updatedAt)}</div>
      </div>
      <div class="lib-actions">
        <button class="btn btn-primary btn-sm" onclick="openFromLibrary('${r.id}')">📂 Ouvrir</button>
        <button class="btn btn-ghost btn-sm" onclick="duplicateExam('${r.id}')"
          title="Faire une copie (pour une autre classe, l'année prochaine…)">⧉ Dupliquer</button>
        <button class="btn-icon" title="Télécharger ce fichier (pour l'envoyer ou le garder)"
          onclick="downloadExam('${r.id}')">⬇</button>
        <button class="btn-icon danger" title="Supprimer" onclick="deleteExam('${r.id}')">🗑</button>
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
  toast(`Examen ouvert : « ${examTitle()} »`);
}

async function duplicateExam(id) {
  const rec = await dbGet(id);
  if (!rec) return;
  const data = clone(rec.data);
  data.docId = newDocId();
  data.title = ((rec.data.title || '').trim() + ' (copie)').trim();
  const now = Date.now();
  await dbPut(makeRecord(data, now, now));
  await refreshLibrary();
  toast('Copie créée : « ' + examTitle(data) + ' »');
}

async function deleteExam(id) {
  const rec = await dbGet(id);
  if (!rec) return;
  const choice = await askDialog({
    title: 'Supprimer cet examen ?',
    text: `« ${rec.title} » sera supprimé définitivement de Mes examens.`,
    buttons: [
      { label: 'Annuler', value: 'cancel', cls: 'btn-ghost' },
      { label: '🗑 Supprimer', value: 'delete', cls: 'btn-danger' },
    ],
  });
  if (choice !== 'delete') return;
  await dbDel(id);
  if (id === S.docId) {           // the open exam stays on screen, as a not-yet-saved exam
    S.docId = null; _savedJson = null; _savedAt = null;
    await autosave();
  }
  await refreshLibrary();
  toast('Examen supprimé.');
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
  if (!exams.length) { toast('Aucun examen à sauvegarder.'); return; }
  const day = new Date().toISOString().slice(0, 10);
  downloadJSON({ type: 'examgen-backup', version: 1, exportedAt: Date.now(), exams },
    `Sauvegarde Mes examens ${day}.json`);
  toast(`${exams.length} examen(s) sauvegardé(s) dans le dossier Téléchargements.`);
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
        await dbPut(makeRecord(data, now, now));
        n = 1;
      } else {
        throw new Error('format inconnu');
      }
      await refreshLibrary();
      toast(n ? `${n} examen(s) ajouté(s) à Mes examens.` : 'Aucun examen trouvé dans ce fichier.');
    } catch (err) {
      alert("Ce fichier n'a pas pu être importé. Choisissez un fichier d'examen (.json).\n\n(" + err.message + ')');
    }
  };
  reader.readAsText(file);
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
function checkPageOverflow() {
  const el = document.getElementById('exam-a4');
  if (!el) return;
  el.querySelector('.page-guide')?.remove();
  const pageH = el.offsetWidth * 297 / 210;
  const over = el.scrollHeight > pageH + 2;
  if (over) {
    el.insertAdjacentHTML('beforeend',
      '<div class="page-guide"><span>Fin de la page 1 — la suite sera imprimée sur une 2e page</span></div>');
  }
  const warn = document.getElementById('page-warn');
  if (warn) {
    warn.hidden = !over;
    warn.textContent = over
      ? "⚠ L'examen dépasse une page (ligne rouge dans l'aperçu) : réduisez le nombre de lignes."
      : '';
  }
}

function scalePreview() {
  const panel = document.getElementById('preview-panel');
  const exam  = document.getElementById('exam-a4');
  if (!panel || !exam) return;

  // Reset any previously applied scaling
  exam.style.zoom = '';

  if (window.innerWidth >= 860) return;   // desktop — no scaling needed

  // 210 mm = 794 px at the CSS reference pixel (96 dpi)
  const A4_W  = 794;
  const pad   = 24;                       // preview-panel horizontal padding
  const avail = panel.clientWidth - pad;
  const scale = avail / A4_W;

  if (scale >= 1) return;                 // container already wider than A4

  exam.style.zoom = scale;               // zoom affects layout → auto-centering works
}

window.addEventListener('resize', scalePreview);

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

S.sections = defaultSections();
renderAll();
restoreDraft().then(ok => { if (ok) renderAll(); });

