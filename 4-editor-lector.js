// =========================================================================
// CAPÍTOL 4: EDITOR DE LECTURES, CLONACIÓ DUA, LECTOR INTERACTIU I MODE AULA PDI
// =========================================================================

let activeReaderDoc = null;
let activeReaderQuestions = [];
let activeReaderChapters = [];
let activeReaderVariants = [];
let isReaderSubmitted = false;

// -------------------------------------------------------------------------
// 1. LECTOR INTERACTIU, CAPÍTOLS I MODE AULA (PDI)
// -------------------------------------------------------------------------

async function openReader(docId) {
  stopSpeechPlayback();
  const app = document.getElementById('app');
  if (!app || !db) return;

  readerCurrentDocId = docId;
  readerCurrentPartIndex = 0;
  classroomCurrentQuestionIndex = 0;
  isReaderSubmitted = false;

  app.innerHTML = `
    <div class="text-center py-14">
      <i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i>
      <p class="mt-3 text-slate-500 font-medium text-sm">Preparant la lectura i les activitats...</p>
    </div>
  `;

  try {
    const docSnap = await withTimeout(db.collection(DB_COLLECTION).doc(docId).get(), 8000, 'càrrega de lectura');
    if (!docSnap.exists) {
      app.innerHTML = `<div class="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
        <p class="font-bold text-slate-700">No s'ha trobat aquesta lectura.</p>
        <button onclick="resetFiltersAndRenderCatalog()" class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">Tornar al catàleg</button>
      </div>`;
      return;
    }

    const data = Object.assign({ id: docSnap.id }, docSnap.data());
    activeReaderDoc = data;

    // Carreguem preguntes tant del camp array com de la subcol·lecció per compatibilitat
    let questionsList = Array.isArray(data.questions) ? data.questions.slice() : [];
    if (questionsList.length === 0) {
      const subSnap = await db.collection(DB_COLLECTION).doc(docId).collection(SUB_COLLECTION).get();
      subSnap.forEach(function(qDoc) {
        questionsList.push(Object.assign({ id: qDoc.id }, qDoc.data()));
      });
      questionsList.sort(function(a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); });
    }
    activeReaderQuestions = questionsList;

    // Cerquem versions vinculades (Original <-> Adaptació DUA)
    const rootId = data.parentReadingId || data.id;
    activeReaderVariants = cachedLecturesList.filter(function(item) {
      return item.id === rootId || item.parentReadingId === rootId;
    });

    activeReaderChapters = splitReadingIntoChapters(data.text || data.content || '');
    renderActiveReaderScreen();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    app.innerHTML = `<div class="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-center space-y-3">
      <p class="font-bold">Error obrint la lectura: ${escapeHtmlSafe(err.message)}</p>
      <button onclick="resetFiltersAndRenderCatalog()" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs">Tornar al catàleg</button>
    </div>`;
  }
}

function renderActiveReaderScreen() {
  const app = document.getElementById('app');
  const data = activeReaderDoc;
  if (!app || !data) return;

  const totalChapters = activeReaderChapters.length;
  const safeChapIdx = Math.min(Math.max(0, readerCurrentPartIndex), Math.max(0, totalChapters - 1));
  readerCurrentPartIndex = safeChapIdx;
  const currentChapterText = activeReaderChapters[safeChapIdx] || '';
  currentTextToRead = currentChapterText;

  const variantsBarHtml = activeReaderVariants.length > 1
    ? `<div class="flex flex-wrap items-center gap-1.5 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
        <span class="text-[11px] font-bold text-purple-900 mr-1"><i class="fa-solid fa-universal-access mr-1"></i>Versió:</span>
        ${activeReaderVariants.map(function(v) {
          const isCurrent = v.id === data.id;
          const label = v.isDuaAdaptation || v.parentReadingId ? 'Adaptada DUA' : 'Estàndard';
          return `<button type="button" onclick="openReader('${v.id}')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${isCurrent ? 'bg-purple-700 text-white shadow-sm' : 'bg-white text-purple-800 hover:bg-purple-100 border border-purple-200'}">${label}</button>`;
        }).join('')}
      </div>`
    : '';

  const chaptersNavHtml = totalChapters > 1
    ? `<div class="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/80 border border-indigo-200 px-4 py-2.5 rounded-2xl mb-5">
        <div class="flex items-center gap-1.5 flex-wrap">
          ${activeReaderChapters.map(function(_, idx) {
            const active = idx === safeChapIdx;
            return `<button type="button" onclick="goToReaderChapter(${idx})" class="px-3 py-1 rounded-xl text-xs font-bold transition ${active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-indigo-800 hover:bg-indigo-100 border border-indigo-200'}">Capítol ${idx + 1}</button>`;
          }).join('')}
        </div>
        <span class="text-xs font-bold text-indigo-900">Part ${safeChapIdx + 1} de ${totalChapters}</span>
      </div>`
    : '';

  const chaptersFooterHtml = totalChapters > 1
    ? `<div class="mt-6 pt-4 border-t border-slate-200/70 flex items-center justify-between gap-2">
        <button type="button" onclick="changeReaderChapter(-1)" ${safeChapIdx === 0 ? 'disabled' : ''} class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs disabled:opacity-40 transition">
          <i class="fa-solid fa-arrow-left mr-1"></i> Capítol anterior
        </button>
        <span class="text-xs font-bold text-slate-500">Capítol ${safeChapIdx + 1} / ${totalChapters}</span>
        <button type="button" onclick="changeReaderChapter(1)" ${safeChapIdx >= totalChapters - 1 ? 'disabled' : ''} class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs disabled:opacity-40 transition">
          Capítol següent <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </div>`
    : '';

  const canEdit = currentUser && (currentUser.email === ADMIN_SUPREMO_EMAIL || data.authorUid === currentUser.uid);

  app.innerHTML = `
    <div class="${isClassroomProjectionMode ? 'max-w-5xl' : 'max-w-4xl'} mx-auto space-y-6">
      <!-- Barra superior de navegació i Mode Aula -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" onclick="resetFiltersAndRenderCatalog()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Catàleg</span>
          </button>
          <span class="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">${formatReadingCode(data.codeNumber)}</span>
          ${data.level ? `<span class="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">${escapeHtmlSafe(data.level)}</span>` : ''}
          ${variantsBarHtml}
        </div>

        <div class="flex flex-wrap items-center gap-2">
          ${canEdit ? `
            <button type="button" onclick="openEditor('${data.id}')" class="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs transition">
              <i class="fa-solid fa-pen mr-1"></i> Editar
            </button>
          ` : ''}
          <button type="button" onclick="toggleClassroomProjectionMode()" class="px-3.5 py-2 rounded-xl font-bold text-xs border transition flex items-center gap-1.5 ${isClassroomProjectionMode ? 'bg-amber-500 text-white border-amber-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}" title="Optimitza la vista per projectar a la pissarra digital">
            <i class="fa-solid fa-chalkboard"></i>
            <span>${isClassroomProjectionMode ? 'Mode Aula PDI: ACTIU' : 'Mode Aula (PDI)'}</span>
          </button>
        </div>
      </div>

      ${isClassroomProjectionMode ? `
        <div class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-amber-950 text-xs font-bold">
            <i class="fa-solid fa-display text-amber-600 text-base"></i>
            <span>Mode Projecció d'Aula activat: tipografia ampliada i navegació guiada per al grup classe.</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="setClassroomStepMode('all')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${classroomStepMode === 'all' ? 'bg-amber-600 text-white' : 'bg-white text-amber-900 border border-amber-300'}">Totes les preguntes</button>
            <button type="button" onclick="setClassroomStepMode('single')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${classroomStepMode === 'single' ? 'bg-amber-600 text-white' : 'bg-white text-amber-900 border border-amber-300'}">1 a 1 (Guiat)</button>
          </div>
        </div>
      ` : ''}

      <!-- Barra d'accessibilitat visual i àudio -->
      <div class="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold text-slate-500 mr-1"><i class="fa-solid fa-eye mr-1"></i>Lectura:</span>
          <div class="inline-flex items-center rounded-xl border border-slate-300 overflow-hidden bg-slate-50">
            <button type="button" onclick="changeReaderFontSize(-2)" class="px-2.5 py-1.5 hover:bg-slate-200 text-xs font-extrabold text-slate-700" title="Reduir lletra">A-</button>
            <span id="reader-font-size-label" class="px-2 text-xs font-mono font-bold text-slate-700">${readerFontSize}px</span>
            <button type="button" onclick="changeReaderFontSize(2)" class="px-2.5 py-1.5 hover:bg-slate-200 text-xs font-extrabold text-slate-700" title="Augmentar lletra">A+</button>
          </div>

          <button type="button" id="btn-toggle-dyslexic" onclick="toggleDyslexicMode()" class="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 transition">
            <i class="fa-solid fa-font mr-1"></i> OpenDyslexic
          </button>

          <div class="flex items-center gap-1.5 ml-1">
            <button type="button" id="btn-theme-default" onclick="setReaderTheme('default')" class="w-6 h-6 rounded-full bg-white border-2 border-slate-300 transition" title="Fons blanc"></button>
            <button type="button" id="btn-theme-sepia" onclick="setReaderTheme('sepia')" class="w-6 h-6 rounded-full bg-[#fbf0d9] border-2 border-amber-400 transition" title="Fons sèpia"></button>
            <button type="button" id="btn-theme-dark" onclick="setReaderTheme('dark')" class="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 transition" title="Mode fosc"></button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" id="btn-speech-play" onclick="toggleSpeechPlayback()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition">
            <i class="fa-solid fa-volume-high"></i> <span>Escolta</span>
          </button>
          <button type="button" id="btn-speech-stop" onclick="stopSpeechPlayback()" class="hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-700 hover:bg-rose-200 transition" title="Atura lectura">
            <i class="fa-solid fa-stop"></i>
          </button>
          <select onchange="setSpeechRate(this.value)" class="px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white text-slate-700" title="Velocitat de veu">
            <option value="0.8" ${speechRate === 0.8 ? 'selected' : ''}>0.8x</option>
            <option value="1" ${speechRate === 1 ? 'selected' : ''}>1.0x</option>
            <option value="1.2" ${speechRate === 1.2 ? 'selected' : ''}>1.2x</option>
          </select>
        </div>
      </div>

      <!-- Full de Lectura -->
      <article id="reader-paper-card" class="bg-white text-slate-800 rounded-3xl border border-slate-200 p-6 md:p-10 shadow-sm transition-colors">
        <header class="mb-6 pb-5 border-b border-slate-200/70">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            ${data.textType ? `<span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">${escapeHtmlSafe(data.textType)}</span>` : ''}
            ${data.duration ? `<span class="text-xs text-slate-500 font-medium"><i class="fa-regular fa-clock mr-1"></i>${escapeHtmlSafe(data.duration)}</span>` : ''}
            ${data.isDuaAdaptation || data.parentReadingId ? `<span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900"><i class="fa-solid fa-universal-access mr-1"></i>Lectura Adaptada DUA</span>` : ''}
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold leading-tight">${escapeHtmlSafe(data.title || 'Sense títol')}</h1>
          ${data.bookAuthor ? `<p class="text-sm opacity-75 mt-1 font-medium"><i class="fa-solid fa-feather-pointed mr-1.5"></i>${escapeHtmlSafe(data.bookAuthor)}</p>` : ''}
        </header>

        ${data.coverImage ? `
          <div class="mb-6 text-center">
            <img src="${escapeHtmlAttr(data.coverImage)}" alt="${escapeHtmlAttr(data.title)}" onclick="openZoomImageModal('${escapeHtmlAttr(data.coverImage)}', '${escapeHtmlAttr(data.title)}')" class="max-h-72 mx-auto rounded-2xl border border-slate-200 shadow-sm cursor-zoom-in">
            <span class="text-[11px] opacity-60 block mt-1"><i class="fa-solid fa-magnifying-glass-plus mr-1"></i>Fes clic a la imatge per ampliar-la</span>
          </div>
        ` : ''}

        ${chaptersNavHtml}

        <div id="reader-text-content" style="font-size:${readerFontSize}px" class="leading-relaxed">
          ${renderFormattedReadingText(currentChapterText, data.glossary)}
        </div>

        ${chaptersFooterHtml}
        ${renderGlossaryBox(data.glossary)}
      </article>

      <!-- Secció de Preguntes de Comprensió Lectora -->
      <section id="reader-questions-section" class="space-y-4 pt-2">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-clipboard-question text-indigo-600"></i>
            <span>Activitats de Comprensió (${activeReaderQuestions.length})</span>
          </h2>
        </div>

        <div id="reader-questions-container"></div>

        <div id="reader-results-box" class="hidden"></div>

        ${activeReaderQuestions.length > 0 ? `
          <div id="reader-submit-bar" class="pt-3 flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs text-slate-500">Revisa totes les teves respostes abans d'enviar-les a corregir.</p>
            <button type="button" id="btn-submit-answers" onclick="submitReaderAnswers()" class="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg transition flex items-center gap-2">
              <i class="fa-solid fa-paper-plane"></i>
              <span>Comprova les meves respostes</span>
            </button>
          </div>
        ` : ''}
      </section>
    </div>
  `;

  applyReaderAccessibilityStyles();
  QuestionEngine.renderAll(activeReaderQuestions, 'reader-questions-container', false);
}

function goToReaderChapter(idx) {
  stopSpeechPlayback();
  readerCurrentPartIndex = idx;
  renderActiveReaderScreen();
}

function changeReaderChapter(delta) {
  stopSpeechPlayback();
  readerCurrentPartIndex += delta;
  renderActiveReaderScreen();
}

function toggleClassroomProjectionMode() {
  isClassroomProjectionMode = !isClassroomProjectionMode;
  if (isClassroomProjectionMode && readerFontSize < 22) {
    readerFontSize = 22;
  }
  renderActiveReaderScreen();
}

function setClassroomStepMode(mode) {
  classroomStepMode = mode === 'single' ? 'single' : 'all';
  classroomCurrentQuestionIndex = 0;
  QuestionEngine.renderAll(activeReaderQuestions, 'reader-questions-container', isReaderSubmitted);
}

function navigateClassroomQuestion(delta) {
  classroomCurrentQuestionIndex += delta;
  QuestionEngine.renderAll(activeReaderQuestions, 'reader-questions-container', isReaderSubmitted);
}

async function submitReaderAnswers() {
  if (!activeReaderDoc || isReaderSubmitted) return;
  const submitBtn = document.getElementById('btn-submit-answers');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Corregint activitats...</span>';
  }

  try {
    const grade = await QuestionEngine.gradeAll(activeReaderQuestions, {
      readingTitle: activeReaderDoc.title || '',
      readingLevel: activeReaderDoc.level || '',
      textFragment: activeReaderDoc.text || activeReaderDoc.content || ''
    });

    isReaderSubmitted = true;
    if (submitBtn) submitBtn.classList.add('hidden');

    let pointsAddedMessage = '';
    if (currentUser && db) {
      const readingId = activeReaderDoc.id;
      const alreadyDone = userCompletedReadings.includes(readingId);
      const prevScore = Number(userScores[readingId]) || 0;
      const newScore = grade.scoreOver10;

      let pointsToAward = 0;
      if (!alreadyDone) {
        pointsToAward = Math.max(5, grade.totalEarnedPoints);
        userCompletedReadings.push(readingId);
        pointsAddedMessage = `Has guanyat <strong>+${pointsToAward} punts</strong> al teu Passaport Lector!`;
      } else if (newScore > prevScore) {
        pointsToAward = Math.max(5, Math.round((newScore - prevScore) * 5));
        userHasImprovedScore = true;
        pointsAddedMessage = `Has millorat la teva nota anterior (${prevScore}/10 → ${newScore}/10) i guanyes <strong>+${pointsToAward} punts</strong> extra!`;
      } else {
        pointsToAward = 2;
        pointsAddedMessage = `Has practicat de nou aquesta lectura (<strong>+2 punts</strong> de constància).`;
      }

      const bestScore = Math.max(prevScore, newScore);
      userScores[readingId] = bestScore;
      userPoints = (Number(userPoints) || 0) + pointsToAward;

      Object.keys(grade.taxonomyEarned || {}).forEach(function(k) {
        userTaxonomyStats[k] = (Number(userTaxonomyStats[k]) || 0) + (Number(grade.taxonomyEarned[k]) || 0);
      });

      const prevHistoryEntry = userReadingHistory[readingId] || { attempts: 0 };
      userReadingHistory[readingId] = {
        title: activeReaderDoc.title || 'Lectura',
        bestScore: bestScore,
        lastScore: newScore,
        attempts: (Number(prevHistoryEntry.attempts) || 0) + 1,
        lastCompletedAt: new Date().toISOString()
      };

      await db.collection('users').doc(currentUser.uid).update({
        points: userPoints,
        completedReadings: userCompletedReadings,
        scores: userScores,
        readingHistory: userReadingHistory,
        taxonomyStats: userTaxonomyStats,
        hasImprovedScore: userHasImprovedScore
      });

      renderNavActions();
      renderMotivationBanner();
    } else {
      pointsAddedMessage = `Inicia sessió per desar aquesta nota al teu Passaport Lector.`;
    }

    const resBox = document.getElementById('reader-results-box');
    if (resBox) {
      const isPass = grade.scoreOver10 >= 5;
      resBox.classList.remove('hidden');
      resBox.innerHTML = `
        <div class="p-6 rounded-3xl border-2 ${isPass ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'} shadow-md space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span class="text-xs font-extrabold uppercase tracking-wider ${isPass ? 'text-emerald-700' : 'text-amber-700'}">Resultat de la lectura</span>
              <h3 class="text-2xl font-extrabold mt-0.5">${isPass ? '🎉 Molt bona feina!' : '💪 Continua practicant!'}</h3>
              <p class="text-sm mt-1">${pointsAddedMessage}</p>
            </div>
            <div class="bg-white px-5 py-3 rounded-2xl border border-slate-200 text-center shrink-0 shadow-sm">
              <div class="text-3xl font-black text-indigo-700">${grade.scoreOver10}<span class="text-base text-slate-400">/10</span></div>
              <div class="text-[11px] font-bold text-slate-500">${grade.totalEarnedPoints} / ${grade.totalMaxPoints} pts</div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-2">
            <button type="button" onclick="openReader('${activeReaderDoc.id}')" class="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs transition">
              <i class="fa-solid fa-rotate-right mr-1"></i> Tornar a intentar
            </button>
            <button type="button" onclick="resetFiltersAndRenderCatalog()" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition">
              <i class="fa-solid fa-book-open mr-1"></i> Explorar més lectures
            </button>
          </div>
        </div>
      `;
      resBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } catch (err) {
    alert("Error corregint les respostes: " + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Comprova les meves respostes</span>';
    }
  }
}

// -------------------------------------------------------------------------
// 2. EDITOR DE LECTURES I PREGUNTES (DOCENTS)
// -------------------------------------------------------------------------

let editorQuestionCounter = 0;

async function openEditor(docId, prefillData) {
  if (!isUserAdminOrCreator()) {
    alert("Només els comptes docents poden crear o editar lectures.");
    return;
  }
  stopSpeechPlayback();
  editingDocId = docId || null;
  editorQuestionCounter = 0;

  const app = document.getElementById('app');
  if (!app) return;

  let initialData = prefillData || {
    title: '',
    bookAuthor: '',
    level: 'Cicle Mitjà',
    textType: 'Narratiu',
    duration: '15 min',
    coverImage: '',
    text: '',
    isDuaAdaptation: false,
    parentReadingId: '',
    glossary: [],
    questions: []
  };

  if (editingDocId && !prefillData) {
    app.innerHTML = `<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-600"></i><p class="mt-2 text-xs text-slate-500">Carregant lectura a l'editor...</p></div>`;
    try {
      const snap = await db.collection(DB_COLLECTION).doc(editingDocId).get();
      if (snap.exists) {
        initialData = Object.assign({ id: snap.id }, snap.data());
        if (!Array.isArray(initialData.questions) || initialData.questions.length === 0) {
          const subSnap = await db.collection(DB_COLLECTION).doc(editingDocId).collection(SUB_COLLECTION).get();
          const subQs = [];
          subSnap.forEach(function(d) { subQs.push(d.data()); });
          initialData.questions = subQs;
        }
      }
    } catch (err) {
      alert("Error carregant lectura: " + err.message);
      return;
    }
  }

  const pageHeading = editingDocId
    ? `Editant lectura ${formatReadingCode(initialData.codeNumber)}`
    : (initialData.isDuaAdaptation ? 'Nova Adaptació DUA' : 'Crear Nova Lectura');

  app.innerHTML = `
    <form onsubmit="saveLectureFromEditor(event)" class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <span class="text-xs font-bold text-indigo-600 uppercase tracking-wider">Taller de Creació Docent</span>
          <h1 class="text-2xl font-extrabold text-slate-800">${pageHeading}</h1>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="resetFiltersAndRenderCatalog()" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">Cancel·lar</button>
          <button type="submit" id="btn-save-lecture" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition flex items-center gap-1.5">
            <i class="fa-solid fa-floppy-disk"></i>
            <span>Desar lectura</span>
          </button>
        </div>
      </div>

      <!-- Dades Generals -->
      <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 class="font-extrabold text-base text-slate-800 border-b border-slate-100 pb-2">1. Fitxa tècnica de la lectura</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-slate-700 mb-1">Títol de la lectura *</label>
            <input type="text" id="ed-title" required value="${escapeHtmlAttr(initialData.title || '')}" placeholder="Ex: El misteri del rellotge de sorra" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-sm font-semibold">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Autor/a del text o font</label>
            <input type="text" id="ed-book-author" value="${escapeHtmlAttr(initialData.bookAuthor || '')}" placeholder="Ex: Mercè Rodoreda / Text propi" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nivell educatiu recomanat</label>
            <select id="ed-level" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white">
              <option value="Cicle Inicial" ${initialData.level === 'Cicle Inicial' ? 'selected' : ''}>Cicle Inicial (1r - 2n)</option>
              <option value="Cicle Mitjà" ${initialData.level === 'Cicle Mitjà' ? 'selected' : ''}>Cicle Mitjà (3r - 4t)</option>
              <option value="Cicle Superior" ${initialData.level === 'Cicle Superior' ? 'selected' : ''}>Cicle Superior (5è - 6è)</option>
              <option value="ESO" ${initialData.level === 'ESO' ? 'selected' : ''}>ESO</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tipologia textual</label>
            <select id="ed-text-type" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white">
              <option value="Narratiu" ${initialData.textType === 'Narratiu' ? 'selected' : ''}>Narratiu</option>
              <option value="Informatiu" ${initialData.textType === 'Informatiu' ? 'selected' : ''}>Informatiu / Expositiu</option>
              <option value="Poètic" ${initialData.textType === 'Poètic' ? 'selected' : ''}>Poètic</option>
              <option value="Teatral" ${initialData.textType === 'Teatral' ? 'selected' : ''}>Teatral</option>
              <option value="Instructiu" ${initialData.textType === 'Instructiu' ? 'selected' : ''}>Instructiu</option>
              <option value="Argumentatiu" ${initialData.textType === 'Argumentatiu' ? 'selected' : ''}>Argumentatiu</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Temps estimat</label>
            <select id="ed-duration" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white">
              <option value="10 min" ${initialData.duration === '10 min' ? 'selected' : ''}>10 min</option>
              <option value="15 min" ${initialData.duration === '15 min' || !initialData.duration ? 'selected' : ''}>15 min</option>
              <option value="20 min" ${initialData.duration === '20 min' ? 'selected' : ''}>20 min</option>
              <option value="30 min" ${initialData.duration === '30 min' ? 'selected' : ''}>30 min</option>
            </select>
          </div>
        </div>

        <div class="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-wrap items-center justify-between gap-3">
          <label class="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-purple-950">
            <input type="checkbox" id="ed-is-dua" ${initialData.isDuaAdaptation || initialData.parentReadingId ? 'checked' : ''} class="w-4 h-4 text-purple-600 rounded">
            <span><i class="fa-solid fa-universal-access mr-1"></i>Aquesta lectura és una adaptació DUA (lectura fàcil / suport visual)</span>
          </label>
          <input type="hidden" id="ed-parent-id" value="${escapeHtmlAttr(initialData.parentReadingId || '')}">
        </div>

        <!-- Imatge de portada / referència -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700">Imatge de portada o il·lustració de suport (URL o puja un arxiu)</label>
          <div class="flex flex-col sm:flex-row gap-2">
            <input type="text" id="ed-cover-url" value="${escapeHtmlAttr(initialData.coverImage || '')}" oninput="updateRefImagePreview(this.value)" placeholder="https://... o puja una imatge des del dispositiu" class="ed-cover-input flex-grow px-3.5 py-2 rounded-xl border border-slate-300 text-xs">
            <label class="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0">
              <i class="fa-solid fa-image"></i>
              <span>Pujar imatge</span>
              <input type="file" accept="image/*" class="hidden" onchange="uploadImageToFirebase(this, 'ed-cover-input', 'ed-cover-status', 900)">
            </label>
          </div>
          <span id="ed-cover-status" class="text-xs"></span>
          <div id="ref-image-preview-box" class="${initialData.coverImage ? '' : 'hidden'} mt-2">
            <img id="ref-image-preview-img" src="${escapeHtmlAttr(initialData.coverImage || '')}" class="max-h-40 rounded-xl border border-slate-200">
          </div>
        </div>
      </div>

      <!-- Text i Glossari -->
      <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 class="font-extrabold text-base text-slate-800">2. Text de la lectura i Glossari</h2>
          <button type="button" onclick="insertChapterBreakInEditor()" class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs">
            <i class="fa-solid fa-scissors mr-1"></i> Inserir salt de capítol
          </button>
        </div>

        <div>
          <textarea id="ed-text" rows="11" required placeholder="Escriu o enganxa aquí el text de la lectura. Pots usar **negreta**, *cursiva*, ## Subtítol, o dividir en capítols amb ---CAPITOL---" class="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-sm leading-relaxed">${escapeHtmlSafe(initialData.text || initialData.content || '')}</textarea>
        </div>

        <div class="pt-2 space-y-2.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-amber-900"><i class="fa-solid fa-spell-check mr-1"></i>Glossari de paraules difícils (es ressaltaran automàticament al text)</label>
            <button type="button" onclick="addGlossaryEditorRow('', '')" class="px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs">
              <i class="fa-solid fa-plus mr-1"></i> Afegir paraula
            </button>
          </div>
          <div id="ed-glossary-list" class="space-y-2"></div>
        </div>
      </div>

      <!-- Preguntes -->
      <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <h2 class="font-extrabold text-base text-slate-800">3. Preguntes de Comprensió Lectora</h2>
            <p class="text-xs text-slate-500">Combina preguntes literals, inferencials, sentit figurat, opinió i creatives.</p>
          </div>
          <button type="button" onclick="addQuestionEditorBlock(null)" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow">
            <i class="fa-solid fa-plus mr-1"></i> Nova pregunta
          </button>
        </div>

        <div id="ed-questions-list" class="space-y-4"></div>
      </div>

      <div class="flex justify-end gap-3 pb-8">
        <button type="button" onclick="resetFiltersAndRenderCatalog()" class="px-5 py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs">Cancel·lar</button>
        <button type="submit" class="px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg">
          <i class="fa-solid fa-floppy-disk mr-1.5"></i> Desar i publicar lectura
        </button>
      </div>
    </form>
  `;

  // Omplim el glossari existent
  const glossaryArr = Array.isArray(initialData.glossary) ? initialData.glossary : [];
  glossaryArr.forEach(function(item) {
    addGlossaryEditorRow(item.term || '', item.definition || '');
  });

  // Omplim les preguntes existents (o n'afegim una per defecte)
  const qArr = Array.isArray(initialData.questions) ? initialData.questions : [];
  if (qArr.length > 0) {
    qArr.forEach(function(q) { addQuestionEditorBlock(q); });
  } else {
    addQuestionEditorBlock(null);
  }
}

function insertChapterBreakInEditor() {
  const area = document.getElementById('ed-text');
  if (!area) return;
  const start = area.selectionStart || area.value.length;
  const snippet = '\n---CAPITOL---\n';
  area.value = area.value.slice(0, start) + snippet + area.value.slice(start);
  area.focus();
}

function addGlossaryEditorRow(term, definition) {
  const container = document.getElementById('ed-glossary-list');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'glossary-ed-row grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-amber-50/60 p-2.5 rounded-xl border border-amber-200';
  row.innerHTML = `
    <input type="text" placeholder="Paraula (ex: tafaner)" value="${escapeHtmlAttr(term)}" class="gl-term sm:col-span-4 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-bold">
    <input type="text" placeholder="Definició entenedora..." value="${escapeHtmlAttr(definition)}" class="gl-def sm:col-span-7 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs">
    <button type="button" onclick="this.parentElement.remove()" class="sm:col-span-1 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold" title="Eliminar">
      <i class="fa-solid fa-trash"></i>
    </button>
  `;
  container.appendChild(row);
}

function addQuestionEditorBlock(qData) {
  const container = document.getElementById('ed-questions-list');
  if (!container) return;

  const qIdx = ++editorQuestionCounter;
  const q = qData || {
    type: 'multiple_choice',
    taxonomy: 'literal',
    points: 10,
    question: '',
    options: [{ text: '', image: '' }, { text: '', image: '' }, { text: '', image: '' }],
    correctIndex: 0,
    correctBool: true,
    clozeText: '',
    keywords: [],
    rubric: '',
    orderItems: ['', '', ''],
    explanation: '',
    image: ''
  };

  const qType = QuestionEngine.normalizeType(q.type);
  const block = document.createElement('div');
  block.className = 'q-block p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-3';
  block.setAttribute('data-q-uid', qIdx);

  const taxOptionsHtml = Object.keys(TAXONOMY_CONFIG).map(function(k) {
    return `<option value="${k}" ${(q.taxonomy || 'literal') === k ? 'selected' : ''}>${TAXONOMY_CONFIG[k].label}</option>`;
  }).join('');

  block.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
      <div class="flex flex-wrap items-center gap-2">
        <span class="q-number-badge px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs">Pregunta</span>
        <select onchange="onEditorQuestionTypeChange(this)" class="q-type-select px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800">
          <option value="multiple_choice" ${qType === 'multiple_choice' ? 'selected' : ''}>Opció múltiple (Test)</option>
          <option value="true_false" ${qType === 'true_false' ? 'selected' : ''}>Vertader / Fals</option>
          <option value="cloze" ${qType === 'cloze' ? 'selected' : ''}>Omplir buits (Cloze)</option>
          <option value="short_answer" ${qType === 'short_answer' ? 'selected' : ''}>Resposta curta (Paraules clau)</option>
          <option value="open_ai" ${qType === 'open_ai' ? 'selected' : ''}>Pregunta oberta (Correcció IA Gemini)</option>
          <option value="ordering" ${qType === 'ordering' ? 'selected' : ''}>Ordenar seqüència de fets</option>
        </select>
        <select class="q-tax-select px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700">
          ${taxOptionsHtml}
        </select>
        <div class="flex items-center gap-1">
          <input type="number" min="1" max="100" value="${Number(q.points) || 10}" class="q-points-input w-16 px-2 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-center">
          <span class="text-xs text-slate-500 font-bold">pts</span>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button type="button" onclick="moveQuestionEditorBlock(this, -1)" class="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs" title="Pujar"><i class="fa-solid fa-arrow-up"></i></button>
        <button type="button" onclick="moveQuestionEditorBlock(this, 1)" class="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs" title="Baixar"><i class="fa-solid fa-arrow-down"></i></button>
        <button type="button" onclick="this.closest('.q-block').remove()" class="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs" title="Eliminar pregunta"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>

    <div>
      <label class="block text-xs font-bold text-slate-700 mb-1">Enunciat de la pregunta *</label>
      <input type="text" required value="${escapeHtmlAttr(q.question || q.prompt || '')}" placeholder="Escriu la pregunta per a l'alumne..." class="q-prompt-input w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-medium">
    </div>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <input type="text" value="${escapeHtmlAttr(q.image || '')}" oninput="updateImagePreview(this)" placeholder="URL d'imatge de suport de la pregunta (opcional)" class="q-image-input flex-grow w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs">
      <label class="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer shrink-0">
        <i class="fa-solid fa-camera mr-1"></i> Pujar foto
        <input type="file" accept="image/*" class="hidden" onchange="uploadImageToFirebase(this, 'q-image-input', null, 750)">
      </label>
      <span class="q-upload-status text-xs"></span>
    </div>

    <div class="q-dynamic-body"></div>

    <div>
      <input type="text" value="${escapeHtmlAttr(q.explanation || '')}" placeholder="Feedback o explicació que veurà l'alumne després de respondre (opcional)" class="q-explanation-input w-full px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600">
    </div>
  `;

  container.appendChild(block);
  renderEditorQuestionDynamicBody(block, qType, q);
}

function moveQuestionEditorBlock(btn, dir) {
  const block = btn.closest('.q-block');
  const list = block ? block.parentElement : null;
  if (!block || !list) return;
  if (dir < 0 && block.previousElementSibling) list.insertBefore(block, block.previousElementSibling);
  else if (dir > 0 && block.nextElementSibling) list.insertBefore(block.nextElementSibling, block);
}

function onEditorQuestionTypeChange(selectElem) {
  const block = selectElem.closest('.q-block');
  if (!block) return;
  renderEditorQuestionDynamicBody(block, selectElem.value, {});
}

function renderEditorQuestionDynamicBody(block, qType, q) {
  const body = block.querySelector('.q-dynamic-body');
  if (!body) return;
  const uid = block.getAttribute('data-q-uid');

  if (qType === 'multiple_choice') {
    const opts = Array.isArray(q.options) && q.options.length > 0
      ? q.options
      : [{ text: '', image: '' }, { text: '', image: '' }, { text: '', image: '' }];
    const correctIdx = Number(q.correctIndex) || 0;

    body.innerHTML = `
      <div class="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-700">Opcions de resposta (marca el cercle de la correcta):</span>
          <button type="button" onclick="addMcOptionRow(this, '${uid}')" class="text-xs font-bold text-indigo-600 hover:underline">+ Afegir opció</button>
        </div>
        <div class="mc-options-container space-y-2">
          ${opts.map(function(o, i) {
            const oText = typeof o === 'string' ? o : (o.text || '');
            const oImg = typeof o === 'object' ? (o.image || '') : '';
            return buildMcOptionRowHtml(uid, i, oText, oImg, i === correctIdx);
          }).join('')}
        </div>
      </div>
    `;
  } else if (qType === 'true_false') {
    const isTrue = String(q.correctBool) !== 'false' && q.correctAnswer !== false;
    body.innerHTML = `
      <div class="flex items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200">
        <span class="text-xs font-bold text-slate-700">Resposta correcta:</span>
        <label class="flex items-center gap-1.5 text-xs font-bold text-emerald-700 cursor-pointer">
          <input type="radio" name="ed_tf_${uid}" value="true" ${isTrue ? 'checked' : ''}> Vertader
        </label>
        <label class="flex items-center gap-1.5 text-xs font-bold text-rose-700 cursor-pointer">
          <input type="radio" name="ed_tf_${uid}" value="false" ${!isTrue ? 'checked' : ''}> Fals
        </label>
      </div>
    `;
  } else if (qType === 'cloze') {
    body.innerHTML = `
      <div class="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs font-bold text-slate-700">Escriu la frase i posa entre doble claudàtor <code>{{paraula}}</code> els buits:</span>
          <button type="button" onclick="wrapSelectionAsClozeBlank(this)" class="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
            Convertir selecció en {{buit}}
          </button>
        </div>
        <textarea rows="3" placeholder="Ex: El protagonista va trobar una {{clau}} daurada sota la {{catifa}}." class="q-cloze-textarea w-full px-3 py-2 rounded-xl border border-slate-300 text-sm">${escapeHtmlSafe(q.clozeText || '')}</textarea>
      </div>
    `;
  } else if (qType === 'short_answer') {
    const kwStr = Array.isArray(q.keywords) ? q.keywords.join(', ') : (q.keywords || '');
    body.innerHTML = `
      <div class="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200">
        <label class="block text-xs font-bold text-slate-700">Paraules clau acceptades (separades per comes):</label>
        <input type="text" value="${escapeHtmlAttr(kwStr)}" placeholder="Ex: Barcelona, port, Mediterrani" class="q-keywords-input w-full px-3 py-2 rounded-xl border border-slate-300 text-xs">
      </div>
    `;
  } else if (qType === 'open_ai') {
    body.innerHTML = `
      <div class="space-y-1.5 bg-purple-50/60 p-3.5 rounded-xl border border-purple-200">
        <label class="block text-xs font-bold text-purple-900"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Rúbrica / Criteris perquè la IA Gemini avaluï la resposta:</label>
        <textarea rows="2" placeholder="Ex: L'alumne ha d'explicar per què el personatge tenia por i posar un exemple del text." class="q-rubric-textarea w-full px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs">${escapeHtmlSafe(q.rubric || '')}</textarea>
      </div>
    `;
  } else if (qType === 'ordering') {
    const items = Array.isArray(q.orderItems) && q.orderItems.length > 0 ? q.orderItems : ['', '', ''];
    body.innerHTML = `
      <div class="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-700">Escriu els fets en l'ORDRE CORRECTE (l'app els barrejarà a l'alumne):</span>
          <button type="button" onclick="addOrderEditorItem(this)" class="text-xs font-bold text-indigo-600 hover:underline">+ Afegir pas</button>
        </div>
        <div class="order-ed-items space-y-1.5">
          ${items.map(function(txt, i) {
            return `<div class="flex items-center gap-2">
              <span class="text-xs font-mono font-bold text-slate-400">${i + 1}.</span>
              <input type="text" value="${escapeHtmlAttr(txt)}" placeholder="Pas ${i + 1}..." class="q-order-item-input flex-grow px-3 py-1.5 rounded-lg border border-slate-300 text-xs">
              <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 px-1.5 text-xs"><i class="fa-solid fa-xmark"></i></button>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }
}

function buildMcOptionRowHtml(uid, idx, textVal, imgVal, isChecked) {
  return `
    <div class="mc-option-row flex flex-col gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
      <div class="flex items-center gap-2">
        <input type="radio" name="ed_mc_correct_${uid}" ${isChecked ? 'checked' : ''} class="mc-correct-radio w-4 h-4 text-emerald-600" title="Marca com a resposta correcta">
        <input type="text" value="${escapeHtmlAttr(textVal)}" placeholder="Text de l'opció ${idx + 1}..." class="mc-text-input flex-grow px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs">
        <label class="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs cursor-pointer" title="Afegir imatge a l'opció">
          <i class="fa-solid fa-image"></i>
          <input type="file" accept="image/*" class="hidden" onchange="uploadImageToFirebase(this, 'mc-img-input', null, 500)">
        </label>
        <button type="button" onclick="this.closest('.mc-option-row').remove()" class="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded text-xs"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="pl-6 flex items-center gap-2">
        <input type="text" value="${escapeHtmlAttr(imgVal)}" oninput="updateImagePreview(this)" placeholder="URL imatge opció (opcional)" class="mc-img-input flex-grow px-2.5 py-1 rounded border border-slate-200 bg-white text-[11px]">
        <span class="q-upload-status text-xs"></span>
      </div>
    </div>
  `;
}

function addMcOptionRow(btn, uid) {
  const container = btn.closest('.space-y-2').querySelector('.mc-options-container');
  if (!container) return;
  const idx = container.querySelectorAll('.mc-option-row').length;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = buildMcOptionRowHtml(uid, idx, '', '', false);
  container.appendChild(wrapper.firstElementChild);
}

function wrapSelectionAsClozeBlank(btn) {
  const area = btn.closest('.space-y-2').querySelector('.q-cloze-textarea');
  if (!area) return;
  const start = area.selectionStart;
  const end = area.selectionEnd;
  if (start === end) {
    alert("Selecciona primer amb el ratolí la paraula que vols convertir en un buit.");
    return;
  }
  const selected = area.value.slice(start, end).trim();
  area.value = area.value.slice(0, start) + '{{' + selected + '}}' + area.value.slice(end);
}

function addOrderEditorItem(btn) {
  const list = btn.closest('.space-y-2').querySelector('.order-ed-items');
  if (!list) return;
  const idx = list.children.length + 1;
  const row = document.createElement('div');
  row.className = 'flex items-center gap-2';
  row.innerHTML = `
    <span class="text-xs font-mono font-bold text-slate-400">${idx}.</span>
    <input type="text" placeholder="Pas ${idx}..." class="q-order-item-input flex-grow px-3 py-1.5 rounded-lg border border-slate-300 text-xs">
    <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 px-1.5 text-xs"><i class="fa-solid fa-xmark"></i></button>
  `;
  list.appendChild(row);
}

async function saveLectureFromEditor(e) {
  e.preventDefault();
  if (!currentUser || !db) return;

  const saveBtn = document.getElementById('btn-save-lecture');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Desant...</span>';
  }

  try {
    const title = (document.getElementById('ed-title').value || '').trim();
    const bookAuthor = (document.getElementById('ed-book-author').value || '').trim();
    const level = document.getElementById('ed-level').value || 'Cicle Mitjà';
    const textType = document.getElementById('ed-text-type').value || 'Narratiu';
    const duration = document.getElementById('ed-duration').value || '15 min';
    const coverImage = (document.getElementById('ed-cover-url').value || '').trim();
    const text = (document.getElementById('ed-text').value || '').trim();
    const isDuaAdaptation = Boolean(document.getElementById('ed-is-dua').checked);
    const parentReadingId = (document.getElementById('ed-parent-id').value || '').trim();

    // Recollim glossari
    const glossary = [];
    document.querySelectorAll('#ed-glossary-list .glossary-ed-row').forEach(function(row) {
      const term = (row.querySelector('.gl-term').value || '').trim();
      const definition = (row.querySelector('.gl-def').value || '').trim();
      if (term && definition) glossary.push({ term: term, definition: definition });
    });

    // Recollim preguntes
    const questions = [];
    document.querySelectorAll('#ed-questions-list .q-block').forEach(function(block, index) {
      const qType = block.querySelector('.q-type-select').value;
      const taxonomy = block.querySelector('.q-tax-select').value || 'literal';
      const points = Number(block.querySelector('.q-points-input').value) || 10;
      const prompt = (block.querySelector('.q-prompt-input').value || '').trim();
      const image = (block.querySelector('.q-image-input').value || '').trim();
      const explanation = (block.querySelector('.q-explanation-input').value || '').trim();

      const qObj = {
        order: index + 1,
        type: qType,
        taxonomy: taxonomy,
        points: points,
        question: prompt,
        image: image,
        explanation: explanation
      };

      if (qType === 'multiple_choice') {
        const opts = [];
        let correctIdx = 0;
        block.querySelectorAll('.mc-option-row').forEach(function(optRow, oIdx) {
          const t = (optRow.querySelector('.mc-text-input').value || '').trim();
          const im = (optRow.querySelector('.mc-img-input').value || '').trim();
          const radio = optRow.querySelector('.mc-correct-radio');
          if (radio && radio.checked) correctIdx = opts.length;
          if (t || im) opts.push({ text: t, image: im });
        });
        qObj.options = opts;
        qObj.correctIndex = correctIdx;
      } else if (qType === 'true_false') {
        const checkedRadio = block.querySelector('input[type="radio"]:checked');
        qObj.correctBool = checkedRadio ? checkedRadio.value === 'true' : true;
      } else if (qType === 'cloze') {
        const area = block.querySelector('.q-cloze-textarea');
        qObj.clozeText = area ? area.value.trim() : '';
        qObj.prompt = prompt;
      } else if (qType === 'short_answer') {
        const kwInp = block.querySelector('.q-keywords-input');
        const rawKw = kwInp ? kwInp.value : '';
        qObj.keywords = rawKw.split(',').map(function(k) { return k.trim(); }).filter(Boolean);
      } else if (qType === 'open_ai') {
        const rubArea = block.querySelector('.q-rubric-textarea');
        qObj.rubric = rubArea ? rubArea.value.trim() : '';
      } else if (qType === 'ordering') {
        const items = [];
        block.querySelectorAll('.q-order-item-input').forEach(function(inp) {
          const val = (inp.value || '').trim();
          if (val) items.push(val);
        });
        qObj.orderItems = items;
      }

      questions.push(qObj);
    });

    if (editingDocId) {
      await db.collection(DB_COLLECTION).doc(editingDocId).update({
        title: title,
        bookAuthor: bookAuthor,
        level: level,
        textType: textType,
        duration: duration,
        coverImage: coverImage,
        text: text,
        isDuaAdaptation: isDuaAdaptation,
        parentReadingId: parentReadingId,
        glossary: glossary,
        questions: questions,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      let maxCode = 0;
      cachedLecturesList.forEach(function(item) {
        const n = Number(item.codeNumber) || 0;
        if (n > maxCode) maxCode = n;
      });
      await db.collection(DB_COLLECTION).add({
        codeNumber: maxCode + 1,
        title: title,
        bookAuthor: bookAuthor,
        level: level,
        textType: textType,
        duration: duration,
        coverImage: coverImage,
        text: text,
        isDuaAdaptation: isDuaAdaptation,
        parentReadingId: parentReadingId,
        glossary: glossary,
        questions: questions,
        authorUid: currentUser.uid,
        authorName: userDisplayName || currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    editingDocId = null;
    renderCatalog();
  } catch (err) {
    alert("Error desant la lectura: " + err.message);
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Desar lectura</span>';
    }
  }
}

// -------------------------------------------------------------------------
// 3. MODAL DE CLONACIÓ I ADAPTACIÓ DUA
// -------------------------------------------------------------------------

function openCloneModal(docId) {
  if (!isUserAdminOrCreator()) return;
  const source = cachedLecturesList.find(function(r) { return r.id === docId; });
  if (!source) return;
  cloningParentId = docId;

  const container = document.getElementById('clone-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div onclick="closeCloneModal()" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div onclick="event.stopPropagation()" class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="font-extrabold text-lg text-slate-800">Duplicar o Adaptar Lectura</h3>
          <button onclick="closeCloneModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <p class="text-xs text-slate-600">Has seleccionat: <strong>${escapeHtmlSafe(source.title)}</strong> (${formatReadingCode(source.codeNumber)})</p>

        <div class="grid grid-cols-1 gap-3">
          <button type="button" onclick="executeCloneReading('${docId}', true)" class="p-4 rounded-2xl border-2 border-purple-200 hover:border-purple-500 bg-purple-50/60 text-left transition space-y-1">
            <div class="font-extrabold text-sm text-purple-900"><i class="fa-solid fa-universal-access mr-1.5"></i>Crear Adaptació DUA vinculada</div>
            <p class="text-xs text-purple-800/80">Crea una versió adaptada (lectura fàcil, frases curtes o suport visual) enllaçada directament amb la lectura original perquè l'alumnat pugui triar versió.</p>
          </button>

          <button type="button" onclick="executeCloneReading('${docId}', false)" class="p-4 rounded-2xl border-2 border-indigo-200 hover:border-indigo-500 bg-indigo-50/50 text-left transition space-y-1">
            <div class="font-extrabold text-sm text-indigo-900"><i class="fa-solid fa-copy mr-1.5"></i>Clonar com a lectura independent</div>
            <p class="text-xs text-indigo-800/80">Copia el text i totes les preguntes en una lectura nova amb codi propi per modificar-la lliurement.</p>
          </button>
        </div>
      </div>
    </div>
  `;
}

function closeCloneModal() {
  const container = document.getElementById('clone-modal-container');
  if (container) container.innerHTML = '';
}

async function executeCloneReading(docId, asDua) {
  closeCloneModal();
  const snap = await db.collection(DB_COLLECTION).doc(docId).get();
  if (!snap.exists) return;
  const orig = snap.data();

  let questions = Array.isArray(orig.questions) ? orig.questions.slice() : [];
  if (questions.length === 0) {
    const subSnap = await db.collection(DB_COLLECTION).doc(docId).collection(SUB_COLLECTION).get();
    subSnap.forEach(function(d) { questions.push(d.data()); });
  }

  const clonedPrefill = {
    title: asDua ? (orig.title + ' (Adaptació DUA)') : (orig.title + ' (Còpia)'),
    bookAuthor: orig.bookAuthor || '',
    level: orig.level || 'Cicle Mitjà',
    textType: orig.textType || 'Narratiu',
    duration: orig.duration || '15 min',
    coverImage: orig.coverImage || '',
    text: orig.text || orig.content || '',
    isDuaAdaptation: asDua,
    parentReadingId: asDua ? (orig.parentReadingId || docId) : '',
    glossary: Array.isArray(orig.glossary) ? orig.glossary.slice() : [],
    questions: questions
  };

  openEditor(null, clonedPrefill);
}