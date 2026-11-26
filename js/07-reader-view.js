function parseContentWithGlossary(rawText, glossaryList) {
  if (!rawText) return '';
  let processed = rawText;
  processed = processed.replace(/\[([^\]]+)\]\(#glossari-section\)/g, function(match, word) {
    return '<a href="#glossari-section" onclick="scrollToGlossary(event)" class="text-indigo-600 font-bold border-b-2 border-indigo-400 hover:text-indigo-800 transition" title="Consultar glossari">' + word + '</a>';
  });
  if (Array.isArray(glossaryList) && glossaryList.length > 0) {
    glossaryList.forEach(function(g) {
      if (g.word && g.word.trim()) {
        const wordToFind = g.word.trim();
        const regex = new RegExp('\\b(' + wordToFind + ')\\b(?![^<]*>|[^[]*])', 'gi');
        processed = processed.replace(regex, '<a href="#glossari-section" onclick="scrollToGlossary(event)" class="text-indigo-600 font-bold border-b-2 border-indigo-400 hover:text-indigo-800 transition" title="Consultar al Glossari">$1</a>');
      }
    });
  }
  return processed;
}

function toggleClassroomProjectionMode(docId) {
  isClassroomProjectionMode = !isClassroomProjectionMode;
  classroomStepMode = 'all';
  classroomCurrentQuestionIndex = 0;
  if (isClassroomProjectionMode && readerFontSize < 22) {
    readerFontSize = 22;
  } else if (!isClassroomProjectionMode && readerFontSize === 22) {
    readerFontSize = 18;
  }
  renderReader(docId);
}

function setClassroomStepMode(mode, totalQuestions) {
  classroomStepMode = mode;
  classroomCurrentQuestionIndex = 0;
  updateClassroomStepVisibility(totalQuestions);
}

function navigateClassroomQuestion(delta, totalQuestions) {
  const nextIdx = classroomCurrentQuestionIndex + delta;
  if (nextIdx < 0 || nextIdx >= totalQuestions) return;
  classroomCurrentQuestionIndex = nextIdx;
  updateClassroomStepVisibility(totalQuestions);
}

function updateClassroomStepVisibility(totalQuestions) {
  const cards = document.querySelectorAll('#quiz-form .classroom-q-card');
  cards.forEach(function(card, idx) {
    if (classroomStepMode === 'all') {
      card.classList.remove('hidden');
    } else {
      if (idx === classroomCurrentQuestionIndex) card.classList.remove('hidden');
      else card.classList.add('hidden');
    }
  });

  const navBar = document.getElementById('classroom-step-nav-bar');
  const counterSpan = document.getElementById('classroom-step-counter');
  const prevBtn = document.getElementById('classroom-step-prev');
  const nextBtn = document.getElementById('classroom-step-next');
  const btnModeAll = document.getElementById('btn-classroom-mode-all');
  const btnModeSingle = document.getElementById('btn-classroom-mode-single');

  if (btnModeAll && btnModeSingle) {
    if (classroomStepMode === 'all') {
      btnModeAll.className = 'px-3 py-1.5 rounded-lg text-xs font-extrabold bg-sky-600 text-white shadow-2xs transition';
      btnModeSingle.className = 'px-3 py-1.5 rounded-lg text-xs font-bold text-sky-900 hover:bg-sky-200/70 transition';
    } else {
      btnModeSingle.className = 'px-3 py-1.5 rounded-lg text-xs font-extrabold bg-sky-600 text-white shadow-2xs transition';
      btnModeAll.className = 'px-3 py-1.5 rounded-lg text-xs font-bold text-sky-900 hover:bg-sky-200/70 transition';
    }
  }

  if (navBar) {
    if (classroomStepMode === 'single' && totalQuestions > 1) {
      navBar.classList.remove('hidden');
      if (counterSpan) counterSpan.innerText = (isEn() ? 'Question ' : 'Pregunta ') + (classroomCurrentQuestionIndex + 1) + (isEn() ? ' of ' : ' de ') + totalQuestions;
      if (prevBtn) prevBtn.disabled = classroomCurrentQuestionIndex === 0;
      if (nextBtn) nextBtn.disabled = classroomCurrentQuestionIndex >= totalQuestions - 1;
    } else {
      navBar.classList.add('hidden');
    }
  }
}

function toggleClassroomRevealAnswer(qDocId) {
  const box = document.getElementById('classroom-reveal-box-' + qDocId);
  const label = document.getElementById('classroom-reveal-btn-label-' + qDocId);
  if (!box) return;
  const isHidden = box.classList.contains('hidden');
  if (isHidden) {
    box.classList.remove('hidden');
    if (label) label.innerText = isEn() ? 'Hide solution' : 'Ocultar solució';
  } else {
    box.classList.add('hidden');
    if (label) label.innerText = isEn() ? 'Reveal solution on board' : 'Revelar solució a la PDI';
  }
}

async function renderReader(docId) {
  stopSpeechSynthesis();
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? 'Loading assigned reading...' : 'Carregant la lectura assignada...') + '</p></div>';

  try {
    const doc = await withTimeout(db.collection(getReadingsCollection()).doc(docId).get(), 7000, "lectura");
    if (!doc.exists) {
      app.innerHTML = `
        <div class="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
          <i class="fa-solid fa-file-circle-xmark text-4xl text-red-400"></i>
          <h2 class="text-xl font-bold text-slate-800">${isEn() ? 'Reading not found' : 'Lectura no trobada'}</h2>
          <button onclick="resetFiltersAndRenderCatalog()" class="w-full bg-indigo-600 text-white font-bold py-2 rounded-xl text-sm">${isEn() ? 'Go to General Catalog' : 'Anar al Catàleg General'}</button>
        </div>
      `;
      return;
    }

    const data = doc.data() || {};
    if (readerCurrentDocId !== docId) {
      readerCurrentDocId = docId;
      readerCurrentPartIndex = 0;
    }

    const isBook = data.type === 'book';
    const isVisualText = !isBook && data.contentFormat === 'image';
    const refImgUrl = data.referenceImageUrl || data.imageUrl || '';
    const hasTranscript = isVisualText && (data.content || '').trim().length > 0;
    const contentParts = !isVisualText ? parseContentParts(data.content, isBook ? 'book' : 'text') : [];
    const hasMultipleParts = contentParts.length > 1;
    if (!hasMultipleParts || readerCurrentPartIndex >= contentParts.length) {
      readerCurrentPartIndex = 0;
    }

    const readingNum = data.readingNumber || 1;
    const readingCode = formatReadingCode(readingNum);
    const glossaryList = Array.isArray(data.glossary) ? data.glossary : [];

    const rootParentId = data.parentReadingId || docId;
    let parentDocData = Object.assign({ id: docId }, data);
    if (data.parentReadingId) {
      const parentSnap = await db.collection(getReadingsCollection()).doc(data.parentReadingId).get();
      if (parentSnap.exists) {
        parentDocData = Object.assign({ id: parentSnap.id }, parentSnap.data());
      }
    }

    const variantsSnap = await db.collection(getReadingsCollection()).where('parentReadingId', '==', rootParentId).get();
    let allVariants = [];
    variantsSnap.forEach(function(vDoc) {
      allVariants.push(Object.assign({ id: vDoc.id }, vDoc.data()));
    });

    const adaptedTextVariants = allVariants.filter(function(v) { return !!v.isAdaptedVersion; });
    const questionBatteryVariants = allVariants.filter(function(v) { return !v.isAdaptedVersion; });

    const hasAdaptedTextTabs = parentDocData && adaptedTextVariants.length > 0;
    const hasBatteryOptions = parentDocData && questionBatteryVariants.length > 0;

    let questionsSnap = { empty: true, size: 0, forEach: function() {} };
    try {
      questionsSnap = await withTimeout(db.collection(getReadingsCollection()).doc(docId).collection(SUB_COLLECTION).orderBy('orderIndex', 'asc').get(), 6000, "preguntes");
    } catch (qErr) {
      try {
        questionsSnap = await withTimeout(db.collection(getReadingsCollection()).doc(docId).collection(SUB_COLLECTION).get(), 6000, "preguntes");
      } catch (e) {
        console.warn("No s'han pogut carregar les preguntes:", e);
      }
    }

    const schoolSuffix = data.authorSchool ? (' (' + data.authorSchool + ')') : '';
    const teacherText = data.authorDisplayName ? (data.authorDisplayName + schoolSuffix) : 'Docent / Col·laborador/a';
    const authorPoints = data.authorPoints !== undefined ? data.authorPoints : 0;
    const authorEmail = data.authorEmail || "";
    const teacherRank = getTeacherRankDetails(authorPoints, authorEmail);

    const bookAuthorName = data.bookAuthor || '';
    const editorialOrSource = data.editorialOrSource || '';
    const ptsPerQuestion = data.pointsPerQuestion !== undefined ? data.pointsPerQuestion : 1;

    const isAdmin = currentUser && currentUser.email === ADMIN_SUPREMO_EMAIL;
    const isDocentOrCollab = isUserAdminOrCreator();
    const isAuthor = currentUser && data.authorUid === currentUser.uid;
    const isCurrentlyAdapted = !!data.isAdaptedVersion;

    const encodedRootTitle = encodeURIComponent(parentDocData.title || data.title || 'Lectura');
    const encodedDocTitle = encodeURIComponent(data.title || 'Lectura');

    let dualVersionTabsHTML = '';
    if (hasAdaptedTextTabs) {
      const isStandardActive = docId === parentDocData.id || !isCurrentlyAdapted;
      const activeAdaptedObj = adaptedTextVariants.find(function(v) { return v.id === docId; }) || adaptedTextVariants[0];

      dualVersionTabsHTML = `
        <div class="mb-5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 shadow-2xs">
          <button onclick="renderReader('${parentDocData.id}')" class="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${isStandardActive ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200' : 'text-slate-600 hover:bg-slate-200/70'}">
            <i class="fa-solid fa-file-lines ${isStandardActive ? 'text-indigo-600' : 'text-slate-400'}"></i>
            <span>${isEn() ? '📄 Standard Reading (Original)' : '📄 Lectura Estàndard (Original)'}</span>
          </button>

          <div class="flex-1 flex items-center gap-1">
            <button onclick="renderReader('${activeAdaptedObj.id}')" class="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${!isStandardActive ? 'bg-emerald-600 text-white shadow-sm border border-emerald-700' : 'bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'}">
              <i class="fa-solid fa-seedling ${!isStandardActive ? 'text-amber-300' : 'text-emerald-600'}"></i>
              <span>${isEn() ? '🌱 Adapted / Simplified Version' : '🌱 Versió Adaptada / Simplificada'}</span>
            </button>
          </div>
        </div>
      `;
    }

    let questionsHTML = '';
    if (!questionsSnap.empty) {
      const totalQuestions = questionsSnap.size;
      const maxPoints = totalQuestions * ptsPerQuestion;

      const classroomViewControlsHTML = (isClassroomProjectionMode && totalQuestions > 1) ? `
        <div class="mb-4 bg-sky-50 border border-sky-200 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-1.5 bg-sky-100/80 p-1 rounded-xl border border-sky-200">
            <button type="button" id="btn-classroom-mode-all" onclick="setClassroomStepMode('all', ${totalQuestions})" class="px-3 py-1.5 rounded-lg text-xs font-extrabold ${classroomStepMode === 'all' ? 'bg-sky-600 text-white shadow-2xs' : 'text-sky-900 hover:bg-sky-200/70'} transition">
              <i class="fa-solid fa-list mr-1"></i> ${isEn() ? 'All questions' : 'Totes les preguntes'}
            </button>
            <button type="button" id="btn-classroom-mode-single" onclick="setClassroomStepMode('single', ${totalQuestions})" class="px-3 py-1.5 rounded-lg text-xs font-extrabold ${classroomStepMode === 'single' ? 'bg-sky-600 text-white shadow-2xs' : 'text-sky-900 hover:bg-sky-200/70'} transition">
              <i class="fa-solid fa-display mr-1"></i> ${isEn() ? 'One by one (Board Slides)' : 'Una a una (Diapositives PDI)'}
            </button>
          </div>

          <div id="classroom-step-nav-bar" class="${classroomStepMode === 'single' ? '' : 'hidden'} flex items-center gap-2">
            <button type="button" id="classroom-step-prev" onclick="navigateClassroomQuestion(-1, ${totalQuestions})" ${classroomCurrentQuestionIndex === 0 ? 'disabled' : ''} class="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-100 disabled:opacity-40 text-sky-950 font-extrabold text-xs border border-sky-300 shadow-2xs transition">
              <i class="fa-solid fa-chevron-left mr-1"></i> ${isEn() ? 'Previous' : 'Anterior'}
            </button>
            <span id="classroom-step-counter" class="text-xs font-black text-sky-950 px-2">
              ${isEn() ? 'Question ' : 'Pregunta '}${classroomCurrentQuestionIndex + 1}${isEn() ? ' of ' : ' de '}${totalQuestions}
            </span>
            <button type="button" id="classroom-step-next" onclick="navigateClassroomQuestion(1, ${totalQuestions})" ${classroomCurrentQuestionIndex >= totalQuestions - 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-100 disabled:opacity-40 text-sky-950 font-extrabold text-xs border border-sky-300 shadow-2xs transition">
              ${isEn() ? 'Next' : 'Següent'} <i class="fa-solid fa-chevron-right ml-1"></i>
            </button>
          </div>
        </div>
      ` : '';

      questionsHTML = `
        <form id="quiz-form" onsubmit="submitQuiz(event, '${docId}', ${ptsPerQuestion})" class="mt-8 pt-6 border-t border-slate-200">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 class="text-xl font-bold text-slate-800 flex items-center">
              <i class="fa-solid fa-list-check ${isClassroomProjectionMode ? 'text-sky-600' : 'text-indigo-600'} mr-2"></i> ${isEn() ? 'Comprehension Questions' : 'Preguntes de Comprensió'} (${totalQuestions})
            </h2>

            ${hasBatteryOptions ? `
              <div class="flex items-center gap-2 bg-amber-50 p-2 rounded-xl border border-amber-300 text-xs shadow-2xs">
                <i class="fa-solid fa-code-fork text-amber-600 text-sm"></i>
                <span class="font-bold text-amber-900">${isEn() ? 'Battery:' : 'Bateria:'}</span>
                <select onchange="renderReader(this.value)" class="bg-white border border-amber-300 rounded-lg p-1 text-xs font-bold text-slate-800 outline-none cursor-pointer">
                  <option value="${parentDocData.id}" ${docId === parentDocData.id ? 'selected' : ''}>${isEn() ? '📌 Original' : '📌 Original'}</option>
                  ${questionBatteryVariants.map(function(v) {
                    return '<option value="' + v.id + '" ' + (v.id === docId ? 'selected' : '') + '>🔀 ' + (v.authorDisplayName || (isEn() ? 'Teacher' : 'Docent')) + '</option>';
                  }).join('')}
                </select>
              </div>
            ` : ''}

            ${isClassroomProjectionMode ? `
              <span class="text-xs bg-sky-100 text-sky-950 border border-sky-300 font-extrabold px-3 py-1 rounded-lg shrink-0 inline-flex items-center gap-1.5">
                <i class="fa-solid fa-chalkboard-user text-sky-600"></i> ${isEn() ? 'Classroom group session (No points)' : "Sessió col·lectiva a l'aula (Sense punts)"}
              </span>
            ` : `
              <span class="text-xs bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-3 py-1 rounded-lg shrink-0">
                🏆 ${ptsPerQuestion} ${ptsPerQuestion === 1 ? 'pt' : 'pts'} ${isEn() ? 'per correct answer (Max: ' : 'per encert (Màx: '}${maxPoints} PTS)
              </span>
            `}
          </div>

          ${classroomViewControlsHTML}
      `;

      const hasChapterTaggedQuestions = hasMultipleParts && Array.from(questionsSnap.docs || []).some(function(d) {
        const qd = d.data() || {};
        return qd.chapterIndex !== undefined && qd.chapterIndex !== null && qd.chapterIndex !== 'all';
      });

      if (hasChapterTaggedQuestions) {
        const activePartTitle = contentParts[readerCurrentPartIndex] ? contentParts[readerCurrentPartIndex].title : ('Part ' + (readerCurrentPartIndex + 1));
        questionsHTML += `
          <div id="chapter-questions-filter-notice" class="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-950 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between flex-wrap gap-2">
            <span><i class="fa-solid fa-bookmark text-indigo-600 mr-1"></i> ${isEn() ? 'Showing questions for: ' : 'Mostrant preguntes de: '}<strong>${escapeHtmlAttr(activePartTitle)}</strong></span>
          </div>
        `;
      }

      let qIndex = 0;
      questionsSnap.forEach(function(qDoc) {
        const q = qDoc.data() || {};
        const qChIdx = (hasChapterTaggedQuestions && q.chapterIndex !== undefined && q.chapterIndex !== null && q.chapterIndex !== 'all')
          ? parseInt(q.chapterIndex)
          : 'all';
        const isHiddenInitially = hasChapterTaggedQuestions && qChIdx !== 'all' && qChIdx !== readerCurrentPartIndex;
        questionsHTML += '<div class="reader-question-chapter-wrapper ' + (isHiddenInitially ? 'hidden' : '') + '" data-chapter-index="' + qChIdx + '">' +
          QuestionEngine.render(qDoc.id, q, qIndex, totalQuestions, glossaryList) +
          '</div>';
        qIndex++;
      });

      if (hasMultipleParts) {
        questionsHTML += `
          <div id="reader-pending-parts-warning" class="${readerCurrentPartIndex < contentParts.length - 1 ? '' : 'hidden'} mb-4 bg-amber-50 border border-amber-300 text-amber-950 p-3.5 rounded-xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-book-open-reader text-amber-600 text-base shrink-0"></i>
              <span>${isEn() ? 'There are still parts or chapters to read before submitting the entire quiz!' : "Encara queden parts o capítols per llegir abans d'enviar tot el qüestionari!"}</span>
            </div>
            <button type="button" onclick="navigateReaderPart(1, ${contentParts.length})" class="btn-reader-next-part shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow transition inline-flex items-center gap-1.5">
              <span>${isEn() ? 'Next part' : 'Següent part'}</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        `;
      }

      questionsHTML += isClassroomProjectionMode ? `
          <button type="submit" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-black py-3.5 rounded-2xl shadow-md transition text-base md:text-lg flex items-center justify-center gap-2">
            <i class="fa-solid fa-users-viewfinder"></i>
            <span>${isEn() ? 'Grade together in class (Without adding points)' : "Corregir entre tots a l'aula (Sense sumar punts)"}</span>
          </button>
        </form>
      ` : `
          <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow transition text-base">
            ${isEn() ? 'Submit answers and get points' : 'Enviar respostes i obtenir punts'}
          </button>
        </form>
      `;
    } else {
      questionsHTML = '<div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm"><i class="fa-solid fa-circle-info mr-1"></i> ' + (isEn() ? 'No registered questions found for this reading.' : "No s'han trobat preguntes enregistrades per a aquesta lectura.") + '</div>';
    }

    let glossaryHTML = '';
    if (glossaryList.length > 0) {
      glossaryHTML = `
        <div id="glossary-section" class="mt-10 bg-teal-50/90 p-6 rounded-2xl border border-teal-200/90 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-teal-200/80 pb-3">
            <div>
              <h3 class="text-sm font-black text-teal-900 uppercase tracking-wide flex items-center gap-2">
                <i class="fa-solid fa-book-bookmark text-teal-600 text-base"></i> ${isEn() ? 'Glossary and Vocabulary Clarification' : 'Glossari i Aclariment de Vocabulari'}
              </h3>
            </div>
            <a href="#reader-top-anchor" class="text-xs text-teal-800 font-bold hover:underline bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-300">${isEn() ? '⬆️ Back to text' : '⬆️ Tornar al text'}</a>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            ${glossaryList.map(function(g) {
              return '<div class="bg-white p-3.5 rounded-xl border border-teal-100 shadow-2xs space-y-1"><span class="font-black text-teal-900 text-sm block border-b border-slate-100 pb-1">' + g.word + '</span><p class="text-slate-700 leading-relaxed">' + g.definition + '</p></div>';
            }).join('')}
          </div>
        </div>
      `;
    }

    const audioControlsHTML = `
      <div class="flex items-center gap-1.5 bg-indigo-50/80 p-1.5 rounded-xl border border-indigo-200/80">
        <span class="text-xs font-black text-indigo-900 px-1.5 flex items-center gap-1">
          <i class="fa-solid fa-headphones text-indigo-600"></i> ${isEn() ? 'Audio:' : 'Àudio:'}
        </span>
        <button id="btn-speech-play" onclick="toggleSpeechSynthesis()" class="px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 shadow-xs flex items-center gap-1.5 transition">
          <i class="fa-solid fa-volume-high text-indigo-200"></i> ${isEn() ? 'Listen' : 'Escolta'}
        </button>
        <button id="btn-speech-stop" onclick="stopSpeechSynthesis()" class="hidden px-2.5 py-1 text-xs font-bold rounded-lg bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 transition">
          <i class="fa-solid fa-stop"></i>
        </button>
        <select onchange="changeSpeechRate(this.value)" class="p-1 text-xs font-bold text-indigo-900 bg-white border border-indigo-200 rounded-lg outline-none">
          <option value="0.8">${isEn() ? '🐢 0.8x Slow' : '🐢 0.8x Llent'}</option>
          <option value="1.0" selected>${isEn() ? '⚡ 1.0x Normal' : '⚡ 1.0x Normal'}</option>
          <option value="1.2">${isEn() ? '🚀 1.2x Fast' : '🚀 1.2x Ràpid'}</option>
        </select>
      </div>
    `;

    const accessibilityToolbarHTML = (!isVisualText) ? `
      <div class="bg-slate-100 p-3 rounded-2xl border border-slate-200 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        ${audioControlsHTML}

        <div class="flex items-center gap-2 flex-wrap">
          <button id="btn-dyslexia-toggle" onclick="toggleDyslexicFont()" class="px-2.5 py-1 text-xs font-bold rounded-lg ${isDyslexicMode ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-200 text-slate-700'} border border-slate-300 transition">
            ${isEn() ? '📖 Dyslexic Font' : '📖 Font Dislèxia'}
          </button>
          <div class="flex items-center bg-white rounded-lg border border-slate-300 overflow-hidden">
            <button onclick="changeReaderFontSize(-2)" class="px-2 py-0.5 text-xs font-extrabold hover:bg-slate-100 border-r border-slate-200">A-</button>
            <span class="px-2 text-xs font-mono font-bold text-slate-600">${isEn() ? 'Size' : 'Mida'}</span>
            <button onclick="changeReaderFontSize(2)" class="px-2 py-0.5 text-xs font-extrabold hover:bg-slate-100 border-l border-slate-200">A+</button>
          </div>
          <div class="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-300">
            <button onclick="setReaderTheme('default')" class="w-5 h-5 rounded-full bg-slate-100 border border-slate-300" title="${isEn() ? 'Standard Mode' : 'Mode Estàndard'}"></button>
            <button onclick="setReaderTheme('sepia')" class="w-5 h-5 rounded-full bg-amber-100 border border-amber-300" title="${isEn() ? 'Sepia Mode' : 'Mode Sèpia'}"></button>
            <button onclick="setReaderTheme('dark')" class="w-5 h-5 rounded-full bg-slate-800 border border-slate-600" title="${isEn() ? 'Dark Contrast Mode' : 'Mode Contrast Fosc'}"></button>
          </div>
          <button id="btn-clear-highlights" onclick="clearUserHighlights()" title="${isEn() ? 'Clear all highlights' : 'Netejar tots els subratllats'}" class="px-2.5 py-1 text-xs font-bold rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 transition flex items-center gap-1.5 shadow-2xs">
            <i class="fa-solid fa-eraser text-amber-500"></i>
            <span>${isEn() ? 'Clear highlights' : 'Netejar subratllats'}</span>
          </button>
        </div>
      </div>
    ` : '';

    let partsNavigationHeaderHTML = '';
    let partsNavigationFooterHTML = '';
    if (hasMultipleParts) {
      partsNavigationHeaderHTML = `
        <div id="reader-content-start-anchor" class="mb-4 bg-indigo-50/80 p-3 rounded-2xl border border-indigo-200/90 space-y-2.5">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="text-xs font-black text-indigo-950 flex items-center gap-1.5">
              <i class="fa-solid ${isBook ? 'fa-book-bookmark text-purple-600' : 'fa-book-open text-indigo-600'}"></i>
              <span>${isBook ? (isEn() ? 'Book chapters' : 'Capítols del llibre') : (isEn() ? 'Reading divided into parts' : 'Lectura dividida en parts')} (${contentParts.length}):</span>
            </span>
            <span class="reader-part-counter-label text-xs font-extrabold bg-white text-indigo-800 px-2.5 py-0.5 rounded-lg border border-indigo-200">
              ${isEn() ? 'Part ' : 'Part '}${readerCurrentPartIndex + 1}${isEn() ? ' of ' : ' de '}${contentParts.length}
            </span>
          </div>
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
            ${contentParts.map(function(p, idx) {
              const isActive = idx === readerCurrentPartIndex;
              return '<button type="button" data-part-title="' + escapeHtmlAttr(p.title) + '" onclick="selectReaderPart(' + idx + ', ' + contentParts.length + ')" class="reader-part-tab px-3 py-1.5 rounded-xl text-xs ' + (isActive ? 'font-extrabold bg-indigo-600 text-white shadow-xs border border-indigo-700' : 'font-bold bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200') + ' transition flex items-center gap-1.5 shrink-0">' +
                '<span class="opacity-75">' + (idx + 1) + '.</span>' +
                '<span>' + escapeHtmlAttr(p.title) + '</span>' +
              '</button>';
            }).join('')}
          </div>
        </div>
      `;

      partsNavigationFooterHTML = `
        <div class="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-200/80">
          <button type="button" onclick="navigateReaderPart(-1, ${contentParts.length})" ${readerCurrentPartIndex === 0 ? 'disabled' : ''} class="btn-reader-prev-part px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-bold text-xs sm:text-sm border border-slate-300 shadow-2xs transition inline-flex items-center gap-1.5">
            <i class="fa-solid fa-arrow-left"></i>
            <span>${isEn() ? 'Previous part' : 'Part anterior'}</span>
          </button>

          <span class="reader-part-counter-label text-xs font-extrabold text-slate-500">
            ${isEn() ? 'Part ' : 'Part '}${readerCurrentPartIndex + 1}${isEn() ? ' of ' : ' de '}${contentParts.length}
          </span>

          <button type="button" onclick="navigateReaderPart(1, ${contentParts.length})" class="btn-reader-next-part ${readerCurrentPartIndex >= contentParts.length - 1 ? 'hidden' : ''} px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition inline-flex items-center gap-2">
            <span>${isEn() ? 'Next part' : 'Següent part'}</span>
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      `;
    }

    let headerContentHTML = '';
    if (isBook) {
      let bookChaptersContentHTML = '';
      if (contentParts.length > 0) {
        const bookPanelsHTML = contentParts.map(function(part, idx) {
          const hiddenClass = (hasMultipleParts && idx !== readerCurrentPartIndex) ? 'hidden' : '';
          return `
            <div class="reader-part-panel ${hiddenClass} space-y-2.5">
              <div class="flex items-center gap-2 pb-1.5 border-b border-purple-200/80">
                <span class="text-xs font-black uppercase tracking-wider text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-md border border-purple-200">
                  📖 ${escapeHtmlAttr(part.title)}
                </span>
              </div>
              <div class="text-slate-700 leading-relaxed whitespace-pre-line reader-text-content" style="font-size: ${readerFontSize}px;">
                ${parseContentWithGlossary(part.content, glossaryList)}
              </div>
            </div>
          `;
        }).join('');

        bookChaptersContentHTML = `
          ${accessibilityToolbarHTML}
          ${partsNavigationHeaderHTML}
          <div id="reading-text-box" class="p-5 rounded-2xl bg-purple-50/40 border border-purple-200/90 text-slate-700 mb-6 transition-all duration-200">
            ${bookPanelsHTML}
            ${partsNavigationFooterHTML}
          </div>
        `;
      }

      headerContentHTML = `
        <div class="flex flex-col md:flex-row gap-6 items-center bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 mb-6">
          ${data.imageUrl ? '<img src="' + data.imageUrl + '" alt="' + (isEn() ? 'Cover' : 'Coberta') + '" class="w-32 h-44 object-cover rounded-xl shadow-md border border-slate-200">' : '<div class="w-32 h-44 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-400"><i class="fa-solid fa-book text-4xl"></i></div>'}
          <div class="space-y-2">
            <span class="text-xs font-bold px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full inline-block">${isEn() ? 'Book Details' : 'Fitxa del Llibre'}</span>
            <h2 class="text-xl font-bold text-slate-800">${data.title || (isEn() ? 'Untitled' : 'Sense títol')}</h2>
            ${bookAuthorName ? '<p class="text-sm text-slate-700 font-semibold flex items-center gap-1.5"><i class="fa-solid fa-feather-pointed text-amber-600"></i><span>' + (isEn() ? 'Book author: ' : 'Autor/a de l\'obra: ') + '<strong class="text-slate-900">' + bookAuthorName + '</strong></span></p>' : ''}
            ${editorialOrSource ? '<p class="text-xs text-slate-500 font-medium flex items-center gap-1.5"><i class="fa-solid fa-building-columns text-slate-400"></i><span>' + (isEn() ? 'Publisher / Edition: ' : 'Editorial / Edició: ') + '<strong>' + editorialOrSource + '</strong></span></p>' : ''}
            <div class="pt-2 border-t border-indigo-100 space-y-1">
              <span class="block text-xs text-slate-500">${isEn() ? 'Reading comprehension questions:' : 'Preguntes de comprensió lectora:'}</span>
              <div class="text-sm text-slate-800 font-bold">${teacherText}</div>
              <div class="pt-0.5"><span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${teacherRank.badgeBg}"><i class="fa-solid ${teacherRank.icon} text-[10px]"></i>${teacherRank.name}</span></div>
            </div>
          </div>
        </div>
        ${bookChaptersContentHTML}
      `;
    } else if (isVisualText) {
      headerContentHTML = `
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5 space-y-3">
          ${bookAuthorName ? '<p class="text-sm text-slate-800 font-bold flex items-center gap-2"><i class="fa-solid fa-feather-pointed text-amber-600"></i><span>' + (isEn() ? 'Book author: ' : 'Autor/a de l\'obra: ') + '<span class="text-indigo-900 font-black">' + bookAuthorName + '</span></span></p>' : ''}
          ${editorialOrSource ? '<p class="text-xs text-slate-500 font-medium flex items-center gap-2"><i class="fa-solid fa-scale-balanced text-slate-400"></i><span>' + (isEn() ? 'Source / Reference: ' : 'Font / Referència: ') + '<em>' + editorialOrSource + '</em></span></p>' : ''}
          <div class="pt-2 border-t border-slate-200 space-y-1">
            <span class="block text-xs text-slate-500">${isCurrentlyAdapted ? (isEn() ? 'Adapted visual version by:' : 'Versió visual adaptada per:') : (isEn() ? 'Visual reading created by:' : 'Lectura visual creada per:')}</span>
            <div class="text-sm text-slate-800 font-bold">${teacherText}</div>
            <div class="pt-0.5"><span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${teacherRank.badgeBg}"><i class="fa-solid ${teacherRank.icon} text-[10px]"></i>${teacherRank.name}</span></div>
          </div>
        </div>

        <div class="bg-teal-50/60 p-4 sm:p-5 rounded-2xl border-2 ${isCurrentlyAdapted ? 'border-emerald-400' : 'border-teal-200'} mb-6 space-y-3 shadow-xs">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-black text-teal-950 flex items-center gap-1.5">
              <i class="fa-solid fa-eye text-teal-600"></i> ${isEn() ? 'Carefully observe the reference image:' : 'Observa amb atenció la imatge de referència:'}
            </span>
            <div class="flex items-center gap-2 flex-wrap">
              ${hasTranscript ? audioControlsHTML : ''}
              <button type="button" onclick="openZoomImageModal('${refImgUrl}', decodeURIComponent('${encodedDocTitle}'))" class="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-xs flex items-center gap-1.5 transition">
                <i class="fa-solid fa-magnifying-glass-plus"></i> ${isEn() ? 'Enlarge / Zoom' : 'Ampliar / Zoom'}
              </button>
            </div>
          </div>

          <div onclick="openZoomImageModal('${refImgUrl}', decodeURIComponent('${encodedDocTitle}'))" class="bg-white p-2 sm:p-3 rounded-xl border border-teal-200/80 shadow-inner flex items-center justify-center cursor-zoom-in group overflow-hidden">
            <img src="${refImgUrl}" alt="${escapeHtmlAttr(data.title)}" class="max-h-[540px] w-auto max-w-full rounded-lg object-contain group-hover:scale-[1.01] transition duration-200">
          </div>

          ${hasTranscript ? '<div id="visual-reading-transcript" class="sr-only">' + data.content + '</div>' : ''}
        </div>
      `;
    } else {
      headerContentHTML = `
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3">
          ${bookAuthorName ? '<p class="text-sm text-slate-800 font-bold flex items-center gap-2"><i class="fa-solid fa-feather-pointed text-amber-600"></i><span>' + (isEn() ? 'Book author: ' : 'Autor/a de l\'obra: ') + '<span class="text-indigo-900 font-black">' + bookAuthorName + '</span></span></p>' : ''}
          ${editorialOrSource ? '<p class="text-xs text-slate-500 font-medium flex items-center gap-2"><i class="fa-solid fa-scale-balanced text-slate-400"></i><span>' + (isEn() ? 'Source / Reference: ' : 'Font / Referència: ') + '<em>' + editorialOrSource + '</em></span></p>' : ''}
          <div class="pt-2 border-t border-slate-200 space-y-1">
            <span class="block text-xs text-slate-500">${isCurrentlyAdapted ? (isEn() ? 'Adapted and simplified version by:' : 'Versió adaptada i simplificada per:') : (isEn() ? 'Adapted reading:' : 'Lectura adaptada:')}</span>
            <div class="text-sm text-slate-800 font-bold">${teacherText}</div>
            <div class="pt-0.5"><span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${teacherRank.badgeBg}"><i class="fa-solid ${teacherRank.icon} text-[10px]"></i>${teacherRank.name}</span></div>
          </div>
        </div>
        ${accessibilityToolbarHTML}
        ${partsNavigationHeaderHTML}
        <div id="reading-text-box" class="p-5 rounded-2xl bg-slate-50 border ${isCurrentlyAdapted ? 'border-emerald-300' : 'border-slate-200'} text-slate-700 leading-relaxed mb-6 transition-all duration-200" style="font-size: ${readerFontSize}px;">
          ${hasMultipleParts ? contentParts.map(function(part, idx) {
            const hiddenClass = idx !== readerCurrentPartIndex ? 'hidden' : '';
            return '<div class="reader-part-panel ' + hiddenClass + ' space-y-3">' +
              '<div class="pb-2 border-b border-slate-200/80 flex items-center justify-between">' +
                '<span class="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">' + escapeHtmlAttr(part.title) + '</span>' +
              '</div>' +
              '<div class="whitespace-pre-line reader-text-content">' + parseContentWithGlossary(part.content, glossaryList) + '</div>' +
            '</div>';
          }).join('') : '<div class="whitespace-pre-line reader-text-content">' + parseContentWithGlossary(data.content, glossaryList) + '</div>'}
          ${partsNavigationFooterHTML}
        </div>
      `;
    }

    const readerContainerClasses = isClassroomProjectionMode
      ? 'max-w-5xl mx-auto bg-white p-6 md:p-10 rounded-3xl shadow-lg border-2 border-sky-400 transition-all'
      : 'max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 transition-all';

    const classroomBannerHTML = isClassroomProjectionMode ? `
      <div class="mb-5 bg-gradient-to-r from-sky-700 via-sky-600 to-indigo-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="flex items-center gap-3 text-center sm:text-left">
          <div class="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid fa-display text-amber-300"></i>
          </div>
          <div>
            <span class="block text-xs sm:text-sm font-black tracking-wide">${isEn() ? '🖥️ Classroom Projection Mode (Digital Board)' : "🖥️ Mode Projecció a l'Aula (Panell Digital)"}</span>
            <span class="block text-[11px] text-sky-100">${isEn() ? 'Collective reading comprehension: enlarged font, group review and <strong>no points added</strong> to teacher account.' : "Comprensió lectora col·lectiva: lletra ampliada, revisió en grup i <strong>sense sumar punts</strong> al compte docent."}</span>
          </div>
        </div>
        <button type="button" onclick="toggleClassroomProjectionMode('${docId}')" class="shrink-0 bg-white/15 hover:bg-white/25 text-white border border-white/30 font-extrabold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5">
          <i class="fa-solid fa-compress"></i> ${isEn() ? 'Exit Classroom Mode' : 'Sortir del Mode Aula'}
        </button>
      </div>
    ` : '';

    app.innerHTML = `
      <div id="reader-top-anchor" class="${readerContainerClasses}">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <button onclick="isClassroomProjectionMode=false; resetFiltersAndRenderCatalog()" class="text-slate-500 hover:text-slate-800 text-sm font-medium inline-flex items-center">
            <i class="fa-solid fa-arrow-left mr-1"></i> ${isEn() ? 'Back to catalog' : 'Tornar al catàleg'}
          </button>

          <div class="flex items-center gap-2 flex-wrap">
            ${isDocentOrCollab ? '<button type="button" onclick="toggleClassroomProjectionMode(\'' + docId + '\')" title="' + (isEn() ? 'Project on digital board to solve together without adding points' : 'Projectar al panell digital per resoldre entre tots sense sumar punts') + '" class="' + (isClassroomProjectionMode ? 'bg-sky-600 hover:bg-sky-700 text-white ring-2 ring-sky-300' : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300') + ' font-extrabold px-3 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"><i class="fa-solid fa-display ' + (isClassroomProjectionMode ? 'text-amber-300' : 'text-sky-600') + '"></i><span>' + (isClassroomProjectionMode ? (isEn() ? 'Classroom Mode Active' : 'Mode Aula Actiu') : (isEn() ? 'Project to Classroom' : 'Projectar a l\'Aula')) + '</span></button>' : ''}

            ${isDocentOrCollab ? '<button onclick="openCloneReadingModal(\'' + rootParentId + '\', decodeURIComponent(\'' + encodedRootTitle + '\'), ' + (isAuthor || isAdmin) + ')" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"><i class="fa-solid fa-seedling"></i><span>🌱 ' + ((isAuthor || isAdmin) ? (isEn() ? 'Create Adapted Version' : 'Crear Versió Adaptada') : (isEn() ? 'Adapt (UDL / Questions)' : 'Adaptar (DUA / Preguntes)')) + '</span></button>' : ''}

            <button onclick="shareToGoogleClassroom('${docId}', decodeURIComponent('${encodedDocTitle}'))" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5">
              <i class="fa-solid fa-chalkboard"></i>
              <span>Classroom</span>
            </button>

            <span class="text-xs font-mono font-bold bg-indigo-50/80 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200/80 shadow-xs">
              ${readingCode}
            </span>
          </div>
        </div>

        ${classroomBannerHTML}

        ${dualVersionTabsHTML}

        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span class="text-xs font-bold text-indigo-600 uppercase">${getTranslatedLevel(data.level || (isEn() ? 'Primary' : 'Primària'))}</span>
          ${data.category ? '<span class="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">📚 ' + getTranslatedCategory(data.category) + '</span>' : ''}
          ${isVisualText ? '<span class="text-xs font-bold text-teal-800 bg-teal-100 border border-teal-200 px-2.5 py-0.5 rounded-full">' + (isEn() ? '🖼️ Visual Reading' : '🖼️ Lectura Visual') + '</span>' : ''}
          ${isCurrentlyAdapted ? '<span class="text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full">' + (isEn() ? '🌱 Adapted Version (UDL)' : '🌱 Versió Adaptada (DUA)') + '</span>' : ''}
        </div>

        <h1 class="${isClassroomProjectionMode ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'} font-bold text-slate-800 mt-1 mb-4">${data.title || (isEn() ? 'Untitled' : 'Sense títol')}</h1>

        ${headerContentHTML}
        ${questionsHTML}
        ${glossaryHTML}

        ${(isDocentOrCollab && !isClassroomProjectionMode) ? `
          <div class="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="text-xs text-slate-600">
              <span class="font-bold text-slate-800 block">${isEn() ? 'Would you like to contribute an improvement, suggestion, or request an adaptation from the author?' : "Vols aportar alguna millora, suggeriment o demanar adaptació a l'autor?"}</span>
              <span>${isEn() ? 'The author of this reading will receive your message in their inbox.' : "L'autor d'aquesta lectura rebrà el teu missatge a la seva bústia."}</span>
            </div>
            <button onclick="openTeacherFeedbackModal('${docId}', decodeURIComponent('${encodedDocTitle}'))" class="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5">
              <i class="fa-solid fa-paper-plane"></i>
              <span>${isEn() ? 'Send Suggestion' : 'Enviar Suggeriment'}</span>
            </button>
          </div>
        ` : ''}
      </div>
    `;

    if (!isBook && !isVisualText && isDyslexicMode) {
      const box = document.getElementById('reading-text-box');
      if (box) box.classList.add('font-dyslexic');
    }

    if (!isVisualText) {
      restoreHighlightsFromSession(docId);
      setupHighlighterListeners();
    }

    // Inicialització del mesurador silenciós de velocitat lectora (PPM)
    initSilentReadingTracker(docId, data.content || '');
    if (silentReadingWordCount === 0) {
      const textBox = document.getElementById('reading-text-box');
      if (textBox) silentReadingWordCount = countReadingWords(textBox.textContent || '');
    }
    setupSilentReadingCutoff();
  } catch (err) {
    console.error("Error carregant el lector:", err);
    app.innerHTML = `<div class="p-6 bg-red-50 text-red-700 rounded-xl max-w-xl mx-auto">${isEn() ? 'Error loading reading: ' : 'Error carregant la lectura: '}${err.message}</div>`;
  }
}

async function submitQuiz(e, docId, pointsPerQuestion) {
  e.preventDefault();
  pointsPerQuestion = pointsPerQuestion || 1;
  if (!currentUser) { renderLogin(); return; }

  const form = e.target;
  const formData = new FormData(form);
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles fa-spin mr-2"></i> ' + (isEn() ? 'Evaluating your answers...' : 'Avaluant les teves respostes...');
  }

  let readingContext = { title: '', content: '', level: 'Primària' };
  try {
    const rSnap = await db.collection(getReadingsCollection()).doc(docId).get();
    if (rSnap.exists) {
      const rData = rSnap.data() || {};
      readingContext = {
        title: rData.title || '',
        content: rData.content || '',
        level: rData.level || 'Primària'
      };
    }
  } catch (ctxErr) {}

  let questionsSnap;
  try {
    questionsSnap = await db.collection(getReadingsCollection()).doc(docId).collection(SUB_COLLECTION).orderBy('orderIndex', 'asc').get();
  } catch (err) {
    questionsSnap = await db.collection(getReadingsCollection()).doc(docId).collection(SUB_COLLECTION).get();
  }

  let score = 0;
  let total = questionsSnap.size;
  const stats = {
    literal: { correct: 0, total: 0 },
    inferential: { correct: 0, total: 0 },
    figurative: { correct: 0, total: 0 },
    opinion: { correct: 0, total: 0 },
    creative: { correct: 0, total: 0 }
  };
  const allQuestionFeedbackItems = [];

  const qDocsArray = [];
  questionsSnap.forEach(function(qDoc) { qDocsArray.push(qDoc); });

  try {
    for (let idx = 0; idx < qDocsArray.length; idx++) {
      const qDoc = qDocsArray[idx];
      const q = qDoc.data() || {};
      const taxKey = q.taxonomyType || 'literal';
      if (!stats[taxKey]) stats[taxKey] = { correct: 0, total: 0 };
      stats[taxKey].total++;

      const evalRes = await QuestionEngine.evaluate(q, qDoc.id, formData, readingContext);
      const mult = typeof evalRes === 'object' ? (evalRes.multiplier || 0) : (evalRes ? 1 : 0);

      score += mult;
      if (mult >= 0.5) {
        stats[taxKey].correct += mult;
      }

      allQuestionFeedbackItems.push({
        questionNumber: idx + 1,
        questionText: q.questionText || q.pregunta || ((isEn() ? 'Question ' : 'Pregunta ') + (idx + 1)),
        taxonomyType: taxKey,
        questionType: q.questionType || 'single',
        status: (evalRes && evalRes.status) ? evalRes.status : (mult >= 1 ? 'correct' : (mult >= 0.5 ? 'partial' : 'incorrect')),
        multiplier: mult,
        isOpenQuestion: !!(evalRes && evalRes.isOpenQuestion),
        isAiEvaluated: !!(evalRes && evalRes.isAiEvaluated),
        evaluationMode: (evalRes && evalRes.evaluationMode) || '',
        studentAnswer: (evalRes && (evalRes.studentAnswer || evalRes.studentAnswerText)) || '',
        correctAnswerText: (evalRes && evalRes.correctAnswerText) || '',
        feedback: (evalRes && evalRes.feedback) || ''
      });
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
    }
  }

  score = Math.round(score * 10) / 10;
  const newQuizPoints = Math.round(score * pointsPerQuestion * 10) / 10;
  const maxPossiblePoints = total * pointsPerQuestion;

  // En Mode Projecció a l'Aula no s'escriu res a Firestore ni se sumen punts al perfil docent
  if (isClassroomProjectionMode) {
    renderClassroomFeedbackModal(docId, readingContext.title || (isEn() ? 'Reading' : 'Lectura'), score, total, stats, allQuestionFeedbackItems);
    return;
  }

  // Mode Vista Prèvia Docent: no s'escriuen punts ni lectures completades ni medalles d'alumne a Firestore
  if (isUserAdminOrCreator()) {
    renderFeedbackModal(score, total, newQuizPoints, maxPossiblePoints, 0, stats, allQuestionFeedbackItems, true);
    return;
  }

  let localScores = {};
  let localTaxStats = { literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 };
  let localHasImproved = userHasImprovedScore;
  let wasAlreadyCompleted = userCompletedReadings.includes(docId);

  try {
    const userDoc = await db.collection("users").doc(currentUser.uid).get();
    if (userDoc.exists) {
      const uData = userDoc.data();
      localScores = uData.scores || {};
      localTaxStats = Object.assign(localTaxStats, uData.taxonomyStats || {});
      if (uData.hasImprovedScore) localHasImproved = true;
      if (Array.isArray(uData.completedReadings) && uData.completedReadings.includes(docId)) {
        wasAlreadyCompleted = true;
      }
    }
  } catch (err) {}

  const previousQuizPoints = localScores[docId] || 0;
  let pointsToAdd = 0;

  if (newQuizPoints > previousQuizPoints) {
    if (wasAlreadyCompleted && previousQuizPoints > 0) {
      localHasImproved = true;
    }
    pointsToAdd = newQuizPoints - previousQuizPoints;
    localScores[docId] = newQuizPoints;
    userPoints += pointsToAdd;
  }

  Object.keys(stats).forEach(function(tKey) {
    if (stats[tKey] && stats[tKey].correct > 0) {
      localTaxStats[tKey] = (localTaxStats[tKey] || 0) + stats[tKey].correct;
    }
  });

  let localReadingHistory = {};
  try {
    const userDocHist = await db.collection("users").doc(currentUser.uid).get();
    if (userDocHist.exists && userDocHist.data().readingHistory) {
      localReadingHistory = Object.assign({}, userDocHist.data().readingHistory);
    }
  } catch (err) {}

  lockReadingTimer();
  const finalReadingSeconds = Math.round(silentReadingSeconds);
  let calculatedWpm = null;
  if (finalReadingSeconds >= 5 && silentReadingWordCount > 0) {
    calculatedWpm = Math.round(silentReadingWordCount / (finalReadingSeconds / 60));
  }

  const prevHist = localReadingHistory[docId];
  const shouldUpdateHistory = !prevHist || newQuizPoints >= (prevHist.points || 0);
  if (shouldUpdateHistory) {
    localReadingHistory[docId] = {
      title: readingContext.title || '',
      score: score,
      total: total,
      points: newQuizPoints,
      maxPoints: maxPossiblePoints,
      percentage: total > 0 ? Math.round((score / total) * 100) : 0,
      stats: stats,
      wpm: calculatedWpm,
      readingSeconds: finalReadingSeconds,
      wordCount: silentReadingWordCount,
      completedAt: new Date().toISOString()
    };
  } else if (prevHist && (prevHist.wpm === undefined || prevHist.wpm === null) && calculatedWpm !== null) {
    prevHist.wpm = calculatedWpm;
    prevHist.readingSeconds = finalReadingSeconds;
    prevHist.wordCount = silentReadingWordCount;
  }

  userScores = localScores;
  userTaxonomyStats = localTaxStats;
  userHasImprovedScore = localHasImproved;

  if (!userCompletedReadings.includes(docId)) {
    userCompletedReadings.push(docId);
    try {
      db.collection(getReadingsCollection()).doc(docId).update({
        completions: firebase.firestore.FieldValue.increment(1)
      }).catch(function() {});
    } catch(cErr) {}
  }

  try {
    await db.collection("users").doc(currentUser.uid).set({
      points: userPoints,
      completedReadings: userCompletedReadings,
      scores: localScores,
      taxonomyStats: localTaxStats,
      hasImprovedScore: localHasImproved,
      readingHistory: localReadingHistory
    }, { merge: true });
  } catch (err) {}

  await loadUserData();
  renderNav();
  renderFeedbackModal(score, total, newQuizPoints, maxPossiblePoints, pointsToAdd, stats, allQuestionFeedbackItems, false);
}

function renderFeedbackModal(score, total, newQuizPoints, maxPossiblePoints, pointsToAdd, stats, questionFeedbackItems, isTeacherPreview) {
  const container = document.getElementById('feedback-modal-container');
  if (!container) return;
  questionFeedbackItems = questionFeedbackItems || [];

  let breakdownRows = '';
  Object.keys(stats).forEach(function(taxKey) {
    const item = stats[taxKey];
    if (item.total > 0) {
      const cfg = TAXONOMY_CONFIG[taxKey] || TAXONOMY_CONFIG.literal;
      const pct = Math.round((item.correct / item.total) * 100);
      breakdownRows += '<div class="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"><span class="text-[11px] font-bold px-2 py-0.5 rounded-md border ' + cfg.color + ' inline-flex items-center gap-1"><i class="fa-solid ' + cfg.icon + '"></i> ' + cfg.label + '</span><div><span class="text-xs font-black text-slate-800">' + item.correct + '/' + item.total + '</span><span class="text-[11px] font-bold ml-1 text-emerald-600">(' + pct + '%)</span></div></div>';
    }
  });

  let questionsListHTML = '';
  if (questionFeedbackItems.length > 0) {
    questionsListHTML = '<div class="space-y-2.5 pt-3 border-t border-slate-200"><h4 class="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5"><i class="fa-solid fa-list-check text-indigo-600"></i> ' + (isEn() ? 'Detailed review of each question' : 'Revisió detallada de cada pregunta') + '</h4>';

    questionFeedbackItems.forEach(function(item) {
      const isOk = item.status === 'correct';
      const isPartial = item.status === 'partial';
      const taxCfg = TAXONOMY_CONFIG[item.taxonomyType] || TAXONOMY_CONFIG.literal;

      const cardBg = isOk
        ? 'bg-emerald-50/70 border-emerald-300'
        : (isPartial ? 'bg-amber-50/80 border-amber-300' : 'bg-rose-50/70 border-rose-300');

      const numBadgeBg = isOk
        ? 'bg-emerald-600 text-white'
        : (isPartial ? 'bg-amber-500 text-slate-950' : 'bg-rose-600 text-white');

      const statusBadge = isOk
        ? '<span class="text-[11px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shrink-0">' + (isEn() ? '✓ Correct' : '✓ Correcte') + '</span>'
        : (isPartial
          ? '<span class="text-[11px] font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full shrink-0">' + (isEn() ? '◐ Partial (50%)' : '◐ Parcial (50%)') + '</span>'
          : '<span class="text-[11px] font-black bg-rose-600 text-white px-2.5 py-0.5 rounded-full shrink-0">' + (isEn() ? '✕ Incorrect' : '✕ Incorrecte') + '</span>');

      let detailBodyHTML = '';

      if (item.isOpenQuestion) {
        const aiTag = item.isAiEvaluated
          ? '<span class="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md"><i class="fa-solid fa-wand-magic-sparkles"></i> ' + (isEn() ? 'AI Correction' : 'Correcció amb IA') + '</span>'
          : '<span class="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md"><i class="fa-solid fa-spell-check"></i> ' + (isEn() ? 'Automatic correction' : 'Correcció automàtica') + '</span>';

        detailBodyHTML = `
          <div class="bg-white/90 p-2.5 rounded-lg border border-slate-200/80 space-y-1.5">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${isEn() ? 'Your answer:' : 'La teva resposta:'}</span>
              ${aiTag}
            </div>
            <p class="text-xs text-slate-700 italic">«${escapeHtmlAttr(item.studentAnswer || (isEn() ? 'No answer' : 'Sense resposta'))}»</p>
          </div>
          ${item.feedback ? `
            <div class="p-2.5 rounded-lg ${isOk ? 'bg-emerald-100/70 text-emerald-950 border border-emerald-200' : (isPartial ? 'bg-amber-100/70 text-amber-950 border border-amber-200' : 'bg-indigo-50 text-indigo-950 border border-indigo-200')} text-xs font-semibold leading-relaxed flex items-start gap-2">
              <i class="fa-solid ${item.isAiEvaluated ? 'fa-robot text-indigo-600' : 'fa-comment-dots text-slate-600'} mt-0.5 shrink-0"></i>
              <span>${escapeHtmlAttr(item.feedback)}</span>
            </div>
          ` : ''}
        `;
      } else {
        detailBodyHTML = `
          <div class="bg-white/90 p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-1">
            <p class="text-slate-700">
              <span class="font-bold text-slate-500">${isEn() ? 'Your answer:' : 'La teva resposta:'}</span>
              <span class="font-semibold ${isOk ? 'text-emerald-700' : 'text-rose-700'}">${escapeHtmlAttr(item.studentAnswer)}</span>
            </p>
            ${(!isOk && item.correctAnswerText) ? `
              <p class="text-emerald-800 pt-1 border-t border-slate-100">
                <span class="font-bold"><i class="fa-solid fa-check-circle text-emerald-600 mr-1"></i>${isEn() ? 'Correct answer:' : 'Resposta correcta:'}</span>
                <span class="font-semibold">${escapeHtmlAttr(item.correctAnswerText)}</span>
              </p>
            ` : ''}
          </div>
        `;
      }

      questionsListHTML += `
        <div class="p-3.5 rounded-xl border ${cardBg} space-y-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2">
              <span class="w-6 h-6 rounded-lg ${numBadgeBg} font-black text-xs flex items-center justify-center shrink-0 mt-0.5">${item.questionNumber}</span>
              <div class="space-y-1">
                <p class="text-xs sm:text-sm font-bold text-slate-800 leading-snug">${escapeHtmlAttr(item.questionText)}</p>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${taxCfg.color} inline-flex items-center gap-1"><i class="fa-solid ${taxCfg.icon}"></i> ${taxCfg.label}</span>
              </div>
            </div>
            ${statusBadge}
          </div>
          ${detailBodyHTML}
        </div>
      `;
    });

    questionsListHTML += '</div>';
  }

  container.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div class="bg-white p-5 sm:p-6 rounded-2xl max-w-2xl w-full space-y-4 shadow-2xl my-4 max-h-[92vh] overflow-y-auto">
        <div class="text-center space-y-1">
          <div class="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xl mx-auto shadow-inner border border-amber-200"><i class="fa-solid fa-trophy"></i></div>
          <h3 class="text-xl font-black text-slate-800">${isEn() ? 'Reading Results' : 'Resultat de la Lectura'}</h3>
          <p class="text-xs text-slate-500">${isEn() ? 'You scored ' : 'Has aconseguit '}<strong>${score} ${isEn() ? 'out of ' : 'de '}${total}</strong> ${isEn() ? 'correct points' : "punts d'encert"} (${newQuizPoints}/${maxPossiblePoints} PTS)</p>
        </div>
        ${isTeacherPreview ? `
          <div class="bg-amber-50 border border-amber-300 text-amber-900 text-xs px-3.5 py-2.5 rounded-xl text-center font-medium flex items-center justify-center gap-2">
            <i class="fa-solid fa-chalkboard-user text-amber-600"></i>
            <span>${isEn() ? 'Teacher preview mode: this test does not add points or alter student stats.' : 'Mode vista prèvia docent: aquesta prova no suma punts ni altera estadístiques d\'alumne.'}</span>
          </div>
        ` : ''}
        ${pointsToAdd > 0 ? '<div class="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center text-emerald-800 text-xs font-bold">' + (isEn() ? '🎉 Congratulations! You earned ' : '🎉 Felicitats! Has aconseguit ') + '<span class="text-sm text-emerald-700">+' + pointsToAdd + ' PTS</span> ' + (isEn() ? 'new!' : 'nous!') + '</div>' : ''}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${breakdownRows}</div>
        ${questionsListHTML}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 sticky bottom-0 bg-white pb-1">
          <button onclick="document.getElementById('feedback-modal-container').innerHTML=''; renderReaderPassport();" class="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-passport"></i> ${isEn() ? 'View my Passport' : 'Veure el meu Passaport'}
          </button>
          <button onclick="document.getElementById('feedback-modal-container').innerHTML=''; resetFiltersAndRenderCatalog();" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm shadow transition">
            ${isEn() ? 'Continue to Catalog' : 'Continuar al Catàleg'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function resetClassroomSessionAndReopen(docId) {
  const container = document.getElementById('feedback-modal-container');
  if (container) container.innerHTML = '';
  classroomCurrentQuestionIndex = 0;
  renderReader(docId);
}

function renderClassroomFeedbackModal(docId, readingTitle, score, total, stats, questionFeedbackItems) {
  const container = document.getElementById('feedback-modal-container');
  if (!container) return;
  questionFeedbackItems = questionFeedbackItems || [];
  const pctGlobal = total > 0 ? Math.round((score / total) * 100) : 0;

  let breakdownRows = '';
  Object.keys(stats).forEach(function(taxKey) {
    const item = stats[taxKey];
    if (item.total > 0) {
      const cfg = TAXONOMY_CONFIG[taxKey] || TAXONOMY_CONFIG.literal;
      const pct = Math.round((item.correct / item.total) * 100);
      breakdownRows += '<div class="px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"><span class="text-xs font-bold px-2.5 py-0.5 rounded-md border ' + cfg.color + ' inline-flex items-center gap-1.5"><i class="fa-solid ' + cfg.icon + '"></i> ' + cfg.label + '</span><div><span class="text-sm font-black text-slate-800">' + item.correct + '/' + item.total + '</span><span class="text-xs font-bold ml-1.5 text-sky-700">(' + pct + '%)</span></div></div>';
    }
  });

  let questionsListHTML = '';
  if (questionFeedbackItems.length > 0) {
    questionsListHTML = '<div class="space-y-3 pt-3 border-t border-slate-200"><h4 class="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5"><i class="fa-solid fa-comments text-sky-600"></i> ' + (isEn() ? 'Collective review for discussion on board' : 'Revisió col·lectiva per comentar a la PDI') + '</h4>';

    questionFeedbackItems.forEach(function(item) {
      const isOk = item.status === 'correct';
      const isPartial = item.status === 'partial';
      const taxCfg = TAXONOMY_CONFIG[item.taxonomyType] || TAXONOMY_CONFIG.literal;

      const cardBg = isOk
        ? 'bg-emerald-50/80 border-emerald-300'
        : (isPartial ? 'bg-amber-50/80 border-amber-300' : 'bg-rose-50/80 border-rose-300');

      const numBadgeBg = isOk
        ? 'bg-emerald-600 text-white'
        : (isPartial ? 'bg-amber-500 text-slate-950' : 'bg-rose-600 text-white');

      const statusBadge = isOk
        ? '<span class="text-xs font-black bg-emerald-600 text-white px-3 py-0.5 rounded-full shrink-0">' + (isEn() ? '✓ Correct' : '✓ Encertada') + '</span>'
        : (isPartial
          ? '<span class="text-xs font-black bg-amber-500 text-slate-950 px-3 py-0.5 rounded-full shrink-0">' + (isEn() ? '◐ Partial (50%)' : '◐ Parcial (50%)') + '</span>'
          : '<span class="text-xs font-black bg-rose-600 text-white px-3 py-0.5 rounded-full shrink-0">' + (isEn() ? '✕ To review' : '✕ A revisar') + '</span>');

      let detailBodyHTML = '';
      if (item.isOpenQuestion) {
        const aiTag = item.isAiEvaluated
          ? '<span class="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md"><i class="fa-solid fa-wand-magic-sparkles"></i> ' + (isEn() ? 'AI Assessment' : 'Valoració IA') + '</span>'
          : '<span class="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-md"><i class="fa-solid fa-spell-check"></i> ' + (isEn() ? 'Automatic assessment' : 'Valoració automàtica') + '</span>';

        detailBodyHTML = `
          <div class="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">${isEn() ? 'Class answer:' : 'Resposta de la classe:'}</span>
              ${aiTag}
            </div>
            <p class="text-sm text-slate-800 italic">«${escapeHtmlAttr(item.studentAnswer || (isEn() ? 'No answer' : 'Sense resposta'))}»</p>
          </div>
          ${item.feedback ? `
            <div class="p-3 rounded-xl ${isOk ? 'bg-emerald-100/80 text-emerald-950 border border-emerald-200' : (isPartial ? 'bg-amber-100/80 text-amber-950 border border-amber-200' : 'bg-sky-50 text-sky-950 border border-sky-200')} text-xs sm:text-sm font-semibold leading-relaxed flex items-start gap-2">
              <i class="fa-solid ${item.isAiEvaluated ? 'fa-robot text-indigo-600' : 'fa-comment-dots text-sky-600'} mt-0.5 shrink-0"></i>
              <span>${escapeHtmlAttr(item.feedback)}</span>
            </div>
          ` : ''}
        `;
      } else {
        detailBodyHTML = `
          <div class="bg-white p-3 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-1.5">
            <p class="text-slate-700">
              <span class="font-bold text-slate-500">${isEn() ? 'Answer marked on board:' : 'Resposta marcada a la pissarra:'}</span>
              <span class="font-bold ${isOk ? 'text-emerald-700' : 'text-rose-700'}">${escapeHtmlAttr(item.studentAnswer)}</span>
            </p>
            ${(!isOk && item.correctAnswerText) ? `
              <p class="text-emerald-800 pt-1.5 border-t border-slate-100">
                <span class="font-bold"><i class="fa-solid fa-check-circle text-emerald-600 mr-1"></i>${isEn() ? 'Correct answer:' : 'Resposta correcta:'}</span>
                <span class="font-bold">${escapeHtmlAttr(item.correctAnswerText)}</span>
              </p>
            ` : ''}
          </div>
        `;
      }

      questionsListHTML += `
        <div class="p-4 rounded-2xl border ${cardBg} space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <span class="w-7 h-7 rounded-lg ${numBadgeBg} font-black text-xs flex items-center justify-center shrink-0 mt-0.5">${item.questionNumber}</span>
              <div class="space-y-1">
                <p class="text-sm sm:text-base font-bold text-slate-900 leading-snug">${escapeHtmlAttr(item.questionText)}</p>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded border ${taxCfg.color} inline-flex items-center gap-1"><i class="fa-solid ${taxCfg.icon}"></i> ${taxCfg.label}</span>
              </div>
            </div>
            ${statusBadge}
          </div>
          ${detailBodyHTML}
        </div>
      `;
    });

    questionsListHTML += '</div>';
  }

  container.innerHTML = `
    <div class="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div class="bg-white p-6 sm:p-8 rounded-3xl max-w-4xl w-full space-y-5 shadow-2xl my-4 max-h-[92vh] overflow-y-auto border-2 border-sky-300">
        <div class="text-center space-y-1.5">
          <div class="inline-flex items-center gap-1.5 bg-sky-100 text-sky-900 border border-sky-300 text-xs font-black px-3 py-1 rounded-full">
            <i class="fa-solid fa-display text-sky-600"></i> ${isEn() ? 'Classroom Projection Mode · Session without scoring' : "Mode Projecció a l'Aula · Sessió sense puntuació"}
          </div>
          <h3 class="text-2xl font-black text-slate-900">${isEn() ? 'Collective Class Result' : 'Resultat Col·lectiu de la Classe'}</h3>
          <p class="text-sm text-slate-600">
            <strong>${escapeHtmlAttr(readingTitle)}</strong> — ${isEn() ? 'We got ' : 'Hem encertat '}<strong class="text-sky-700">${score} ${isEn() ? 'out of ' : 'de '}${total}</strong> ${isEn() ? 'questions correct' : 'preguntes'} (<strong class="text-emerald-700">${pctGlobal}%</strong>)
          </p>
        </div>

        <div class="bg-sky-50 border border-sky-200 p-3 rounded-xl text-center text-sky-950 text-xs font-semibold">
          <i class="fa-solid fa-shield-halved text-sky-600 mr-1"></i> ${isEn() ? 'This session is for classroom pedagogical use: <strong>no points added</strong> and teacher profile stats unmodified.' : "Aquesta sessió és d'ús pedagògic a l'aula: <strong>no ha sumat punts</strong> ni ha modificat les estadístiques del perfil docent."}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">${breakdownRows}</div>
        ${questionsListHTML}

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 sticky bottom-0 bg-white pb-1 border-t border-slate-100">
          <button type="button" onclick="document.getElementById('feedback-modal-container').innerHTML=''" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-eye"></i> ${isEn() ? 'Back to reading' : 'Tornar a la lectura'}
          </button>
          <button type="button" onclick="resetClassroomSessionAndReopen('${docId}')" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm shadow transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-rotate-right"></i> ${isEn() ? 'Restart for another group' : 'Reiniciar per a un altre grup'}
          </button>
          <button type="button" onclick="document.getElementById('feedback-modal-container').innerHTML=''; isClassroomProjectionMode=false; resetFiltersAndRenderCatalog();" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm shadow transition">
            ${isEn() ? 'Exit to Catalog' : 'Sortir al Catàleg'}
          </button>
        </div>
      </div>
    </div>
  `;
}


