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
  model: 'A',
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
  sections: []
};

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
    default:            return {};
  }
}

function newQuestion(type = 'paragraph') {
  return { id: gid(), type, text: '', points: 0, params: defaultParams(type) };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function selectModel(model) {
  S.model = model;
  S.sections = defaultSections();
  document.getElementById('screen-model').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');
  renderAll();
}

function changeModel() {
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-model').classList.add('active');
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
  h += buildHeaderFormHTML();
  h += '<div id="secs-container">';
  S.sections.forEach((sec, si) => { h += buildSectionFormHTML(sec, si); });
  h += '</div>';
  h += `<div style="text-align:center;margin:12px 0 4px">
    <button class="btn btn-primary btn-sm" onclick="addSection()">＋ Ajouter une section</button>
  </div>`;
  return h;
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
          <select onchange="S.header.subject=this.value;renderExam()">
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
  const mismatch = sec.questions.length > 0 && Math.abs(qTotal - (parseFloat(sec.points)||0)) > 0.001;
  const canDel = S.sections.length > 2;

  return `
  <div class="es-form" data-sid="${sec.id}">
    <div class="es-form-head">
      <span class="es-form-title">القسم ${name}</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <label style="font-size:11px;font-weight:600">Barème :</label>
        <input type="number" min="0" max="18" step="0.5" value="${sec.points}"
          style="width:54px;padding:3px 6px;border:1px solid #ced4da;border-radius:5px;font-size:12px"
          onchange="updateSecPoints(${sec.id},parseFloat(this.value))">
        <span style="font-size:11px;color:#999">ن</span>
        ${canDel ? `<button class="btn-icon danger" title="Supprimer section" onclick="removeSection(${sec.id})">✕</button>` : ''}
      </div>
    </div>
    ${mismatch ? `<div class="es-warn">⚠ Somme des questions : ${qTotal}ن ≠ barème : ${sec.points}ن</div>` : ''}
    <div class="es-form-body">
      ${sec.questions.map((q,qi) => buildQFormHTML(q, qi, sec.id)).join('')}
      <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:5px"
        onclick="addQuestion(${sec.id})">＋ Ajouter une question</button>
    </div>
  </div>`;
}

function buildQFormHTML(q, qi, sid) {
  const typeOptions = [
    ['paragraph', 'Paragraphe (فقرة)'],
    ['definition','Définition (تعريف)'],
    ['timeline',  'Frise chronologique (سلم زمني)'],
    ['map',       'Carte géographique (خريطة)'],
  ].map(([v,l]) => `<option value="${v}" ${sel(q.type,v)}>${l}</option>`).join('');

  const warnText = !q.text.trim() ? `<div class="warn-text">⚠ Énoncé manquant</div>` : '';

  return `
  <div class="q-form" data-qid="${q.id}">
    <div class="q-form-head">
      <span class="q-num">${qi+1}</span>
      <select style="flex:1;font-size:11.5px;padding:4px 6px;border:1px solid #ced4da;border-radius:5px"
        onchange="changeQType(${sid},${q.id},this.value)">
        ${typeOptions}
      </select>
      <input type="number" min="0" max="18" step="0.5" value="${q.points}"
        style="width:54px;padding:4px 6px;border:1px solid #ced4da;border-radius:5px;font-size:12px"
        title="Points" onchange="updateQ(${sid},${q.id},'points',parseFloat(this.value))">
      <span style="font-size:10px;color:#999">ن</span>
      <button class="btn-icon danger" title="Supprimer" onclick="removeQuestion(${sid},${q.id})">✕</button>
    </div>

    <div class="fg" style="margin-bottom:6px">
      <label>Énoncé (en arabe)</label>
      <textarea dir="rtl" rows="2"
        oninput="updateQText(${sid},${q.id},this.value)"
        >${esc(q.text)}</textarea>
      ${warnText}
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

    default: return '';
  }
}

function buildTimelineParamsHTML(q, sid) {
  const count = q.params.count || 4;
  const events = q.params.events || [];
  let evInputs = '';
  for (let i = 0; i < count; i++) {
    evInputs += `<div class="form-row" style="margin-bottom:4px">
      <div class="fg">
        <label style="font-size:10.5px">Événement ${i+1} (libellé affiché sur la frise)</label>
        <input type="text" dir="rtl" style="font-family:'Cairo',sans-serif;font-size:11.5px"
          value="${esc(events[i]||'')}"
          oninput="updateTLEvent(${sid},${q.id},${i},this.value)"
          placeholder="مثال: اندلاع الحرب العالمية الأولى">
      </div>
    </div>`;
  }

  return `
  <div class="form-row">
    <div class="fg">
      <label>Nombre de graduations (2 – 8)</label>
      <input type="number" min="2" max="8" value="${count}"
        onchange="updateQParam(${sid},${q.id},'count',Math.min(8,Math.max(2,parseInt(this.value)||4)))">
    </div>
  </div>
  <div style="font-size:11.5px;font-weight:600;margin:5px 0 3px;color:#495057">Libellés des événements :</div>
  ${evInputs}
  <div class="info-text">Note RTL : l'événement 1 s'affiche à droite sur la frise (sens arabe).</div>`;
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
      <label>Entrées de légende (0 = aucune)</label>
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
    <div style="display:flex;gap:7px;flex-wrap:wrap">
      <button class="btn btn-success btn-sm" onclick="printExam()" ${over?'disabled':''}>🖨 Imprimer</button>
      <button class="btn btn-primary btn-sm" onclick="saveExam()">💾 Sauvegarder</button>
      <label class="btn btn-secondary btn-sm" style="cursor:pointer">
        📂 Charger
        <input type="file" accept=".json" onchange="loadExam(event)" style="display:none">
      </label>
      <button class="btn btn-warning btn-sm" onclick="resetExam()">↺ Reset</button>
    </div>`;
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
  if (q) { q.text = val; renderExam(); renderFormFooter(); }
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
  el.className = `exam-a4 model-${S.model.toLowerCase()}`;
  el.setAttribute('dir', 'rtl');
  el.setAttribute('lang', 'ar');
  el.innerHTML = S.model === 'A' ? genExamA() : genExamB();
  requestAnimationFrame(scalePreview);
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
      const pts = q.points ? ` (${q.points}ن)` : '';
      body += `<div class="q-item">
        <div class="q-text">${qi+1}- ${esc(q.text)}${pts}</div>
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
        الإسم واللقب :&nbsp;............................................&nbsp;&nbsp;
        القسم :&nbsp;..............&nbsp;&nbsp;
        الرقم :&nbsp;..............
      </div>
      <div class="grade-block">
        <div class="grade-box">............. / 20</div>
        <div class="hw-box">+2 لوضوح الخط وسلامة اللغة</div>
      </div>
    </div>

    ${body}
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
      const pts = q.points ? ` (${q.points}ن)` : '';
      body += `<div class="q-box">
        <div class="q-text">${qi+1}- ${esc(q.text)}${pts}</div>
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
    </div>
  `;
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
    default:
      return '';
  }
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
    <svg viewBox="0 0 ${W} ${H}" width="100%"
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
  window.print();
}

function saveExam() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `examen_${S.header.subject}_${S.header.examType.replace(/\s/g,'_')}_${Date.now()}.json`
  });
  a.click();
  URL.revokeObjectURL(url);
}

function loadExam(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const loaded = JSON.parse(e.target.result);
      if (!loaded.sections || !loaded.header) throw new Error('Format invalide');

      // Preserve session header overrides
      const savedTeacher = S.header.teacherName;
      const savedYear    = S.header.yearStart;

      S = loaded;
      if (savedTeacher) S.header.teacherName = savedTeacher;
      if (savedYear)    S.header.yearStart   = savedYear;

      // Sync ID counter
      const allIds = [0,
        ...S.sections.flatMap(s => [s.id, ...s.questions.map(q => q.id)])
      ];
      _nextId = Math.max(...allIds) + 1;

      document.getElementById('screen-model').classList.remove('active');
      document.getElementById('screen-app').classList.add('active');
      renderAll();
    } catch (err) {
      alert('Erreur lors du chargement : ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function resetExam() {
  if (!confirm('Réinitialiser l\'examen ? Toutes les sections et questions seront supprimées.')) return;
  const savedHdr = { ...S.header };
  S.sections = defaultSections();
  S.header = savedHdr;
  renderAll();
}

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

