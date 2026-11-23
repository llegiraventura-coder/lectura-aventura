// =========================================================================
// CAPÍTOL 2: ACCESSIBILITAT, LECTURA EN VEU ALTA, PAGINACIÓ, CLOZE I MOTOR DE PREGUNTES
// =========================================================================

// -------------------------------------------------------------------------
// 1. ACCESSIBILITAT VISUAL (DISLÈXIA, MIDA DE LLETRA I TEMES DE LECTURA)
// -------------------------------------------------------------------------

function toggleDyslexicMode() {
  isDyslexicMode = !isDyslexicMode;
  applyReaderAccessibilityStyles();
}

function changeReaderFontSize(delta) {
  readerFontSize = Math.min(30, Math.max(14, readerFontSize + delta));
  applyReaderAccessibilityStyles();
}

function setReaderTheme(theme) {
  readerTheme = theme || 'default';
  applyReaderAccessibilityStyles();
}

function applyReaderAccessibilityStyles() {
  const textContainer = document.getElementById('reader-text-content');
  const cardContainer = document.getElementById('reader-paper-card');
  const sizeLabel = document.getElementById('reader-font-size-label');
  const dysBtn = document.getElementById('btn-toggle-dyslexic');

  if (sizeLabel) {
    sizeLabel.textContent = readerFontSize + 'px';
  }

  if (dysBtn) {
    if (isDyslexicMode) {
      dysBtn.classList.add('bg-indigo-600', 'text-white', 'border-indigo-600');
      dysBtn.classList.remove('bg-white', 'text-slate-700', 'border-slate-300');
    } else {
      dysBtn.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-600');
      dysBtn.classList.add('bg-white', 'text-slate-700', 'border-slate-300');
    }
  }

  if (textContainer) {
    textContainer.style.fontSize = readerFontSize + 'px';
    if (isDyslexicMode) {
      textContainer.classList.add('font-dyslexic');
    } else {
      textContainer.classList.remove('font-dyslexic');
    }
  }

  if (cardContainer) {
    cardContainer.classList.remove('bg-white', 'text-slate-800', 'bg-sepia', 'bg-dark-mode');
    if (readerTheme === 'sepia') {
      cardContainer.classList.add('bg-sepia');
    } else if (readerTheme === 'dark') {
      cardContainer.classList.add('bg-dark-mode');
    } else {
      cardContainer.classList.add('bg-white', 'text-slate-800');
    }
  }

  ['default', 'sepia', 'dark'].forEach(function(t) {
    const btn = document.getElementById('btn-theme-' + t);
    if (!btn) return;
    if (readerTheme === t) {
      btn.classList.add('ring-2', 'ring-indigo-500', 'scale-105');
    } else {
      btn.classList.remove('ring-2', 'ring-indigo-500', 'scale-105');
    }
  });
}

// -------------------------------------------------------------------------
// 2. LECTURA EN VEU ALTA (TEXT-TO-SPEECH EN CATALÀ)
// -------------------------------------------------------------------------

function getCatalanVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  let caVoice = voices.find(function(v) {
    return v.lang && v.lang.toLowerCase().startsWith('ca');
  });
  if (!caVoice) {
    caVoice = voices.find(function(v) {
      return v.lang && (v.lang.toLowerCase().startsWith('es') || v.lang.toLowerCase().startsWith('gl'));
    });
  }
  return caVoice || null;
}

function stopSpeechPlayback() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
  isSpeechPaused = false;
  updateSpeechControlsUI();
}

function toggleSpeechPlayback(optionalText) {
  if (!('speechSynthesis' in window)) {
    alert("El teu navegador no admet la lectura en veu alta.");
    return;
  }

  const textSource = optionalText || currentTextToRead || '';
  if (!textSource.trim()) return;

  if (isSpeaking && !isSpeechPaused) {
    window.speechSynthesis.pause();
    isSpeechPaused = true;
    updateSpeechControlsUI();
    return;
  }

  if (isSpeaking && isSpeechPaused) {
    window.speechSynthesis.resume();
    isSpeechPaused = false;
    updateSpeechControlsUI();
    return;
  }

  window.speechSynthesis.cancel();
  const cleanText = textSource
    .replace(/---CAPITOL---/g, '. ')
    .replace(/[#*_>`]/g, '')
    .replace(/\{\{([^}]+)\}\}/g, '$1');

  speechUtterance = new SpeechSynthesisUtterance(cleanText);
  const voice = getCatalanVoice();
  if (voice) {
    speechUtterance.voice = voice;
    speechUtterance.lang = voice.lang;
  } else {
    speechUtterance.lang = 'ca-ES';
  }
  speechUtterance.rate = speechRate || 1.0;

  speechUtterance.onstart = function() {
    isSpeaking = true;
    isSpeechPaused = false;
    updateSpeechControlsUI();
  };

  speechUtterance.onend = function() {
    isSpeaking = false;
    isSpeechPaused = false;
    updateSpeechControlsUI();
  };

  speechUtterance.onerror = function() {
    isSpeaking = false;
    isSpeechPaused = false;
    updateSpeechControlsUI();
  };

  isSpeaking = true;
  isSpeechPaused = false;
  updateSpeechControlsUI();
  window.speechSynthesis.speak(speechUtterance);
}

function setSpeechRate(newRate) {
  speechRate = parseFloat(newRate) || 1.0;
  const rateBadge = document.getElementById('speech-rate-label');
  if (rateBadge) rateBadge.textContent = speechRate.toFixed(1) + 'x';
  if (isSpeaking) {
    const savedText = currentTextToRead;
    stopSpeechPlayback();
    toggleSpeechPlayback(savedText);
  }
}

function updateSpeechControlsUI() {
  const playBtn = document.getElementById('btn-speech-play');
  const stopBtn = document.getElementById('btn-speech-stop');
  if (playBtn) {
    if (isSpeaking && !isSpeechPaused) {
      playBtn.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pausa</span>';
      playBtn.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm';
    } else if (isSpeaking && isSpeechPaused) {
      playBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Continua</span>';
      playBtn.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm';
    } else {
      playBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Escolta</span>';
      playBtn.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition';
    }
  }
  if (stopBtn) {
    if (isSpeaking) stopBtn.classList.remove('hidden');
    else stopBtn.classList.add('hidden');
  }
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = function() {
    getCatalanVoice();
  };
}

// -------------------------------------------------------------------------
// 3. PAGINACIÓ PER CAPÍTOLS, FORMATACIÓ DEL TEXT I GLOSSARI
// -------------------------------------------------------------------------

function splitReadingIntoChapters(rawText) {
  const text = (rawText || '').trim();
  if (!text) return [''];
  if (text.includes('---CAPITOL---')) {
    return text.split(/\n?---CAPITOL---\n?/g).map(function(part) { return part.trim(); }).filter(Boolean);
  }
  return [text];
}

function renderFormattedReadingText(rawText, glossaryList) {
  const lines = (rawText || '').split(/\r?\n/);
  const validGlossary = Array.isArray(glossaryList)
    ? glossaryList.filter(function(g) { return g && g.term && g.term.trim().length > 1; })
    : [];

  const htmlBlocks = lines.map(function(line) {
    const trimmed = line.trim();
    if (!trimmed) return '<div class="h-3"></div>';

    if (trimmed.startsWith('### ')) {
      return '<h4 class="font-bold text-lg mt-4 mb-2 text-indigo-700">' + escapeHtmlSafe(trimmed.slice(4)) + '</h4>';
    }
    if (trimmed.startsWith('## ')) {
      return '<h3 class="font-extrabold text-xl mt-5 mb-2 text-indigo-800">' + escapeHtmlSafe(trimmed.slice(3)) + '</h3>';
    }
    if (trimmed.startsWith('> ')) {
      return '<blockquote class="border-l-4 border-indigo-400 pl-4 italic my-3 opacity-90">' + escapeHtmlSafe(trimmed.slice(2)) + '</blockquote>';
    }

    let safeLine = escapeHtmlSafe(trimmed);
    safeLine = safeLine.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    safeLine = safeLine.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    validGlossary.forEach(function(item) {
      const escapedTerm = item.term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp('\\b(' + escapedTerm + ')\\b', 'gi');
      safeLine = safeLine.replace(regex, function(match) {
        return '<a href="#glossary-section" onclick="scrollToGlossary(event)" title="' +
          escapeHtmlAttr(item.definition || 'Consulta al glossari') +
          '" class="underline decoration-dotted decoration-2 decoration-amber-500 text-indigo-700 font-semibold hover:bg-amber-100/70 rounded px-0.5 transition">' +
          match + '</a>';
      });
    });

    return '<p class="mb-3 leading-relaxed">' + safeLine + '</p>';
  });

  return htmlBlocks.join('');
}

function renderGlossaryBox(glossaryList) {
  const items = Array.isArray(glossaryList)
    ? glossaryList.filter(function(g) { return g && g.term && g.definition; })
    : [];
  if (items.length === 0) return '';

  const itemsHtml = items.map(function(item) {
    return '<div class="p-3 rounded-xl bg-amber-50/80 border border-amber-200">' +
      '<span class="font-bold text-amber-900">' + escapeHtmlSafe(item.term) + ':</span> ' +
      '<span class="text-slate-700 text-sm">' + escapeHtmlSafe(item.definition) + '</span>' +
      '</div>';
  }).join('');

  return '<div id="glossary-section" class="mt-8 pt-6 border-t-2 border-dashed border-amber-300">' +
    '<h4 class="font-bold text-amber-900 text-base mb-3 flex items-center gap-2">' +
    '<i class="fa-solid fa-spell-check text-amber-600"></i> Glossari de vocabulari clau</h4>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">' + itemsHtml + '</div>' +
    '</div>';
}

// -------------------------------------------------------------------------
// 4. UTILITATS DE PREVISUALITZACIÓ D'IMATGES I CLOZE (OMPLIR BUITS)
// -------------------------------------------------------------------------

function updateImagePreview(inputElem) {
  if (!inputElem) return;
  const wrapper = inputElem.closest('.flex-col') || inputElem.parentElement;
  if (!wrapper) return;
  let preview = wrapper.querySelector('.q-img-preview');
  const val = (inputElem.value || '').trim();
  if (!val) {
    if (preview) preview.remove();
    return;
  }
  if (!preview) {
    preview = document.createElement('img');
    preview.className = 'q-img-preview mt-1.5 h-16 w-auto object-contain rounded-lg border border-slate-200 bg-white p-1';
    wrapper.appendChild(preview);
  }
  preview.src = val;
}

function extractClozeSolutions(templateText) {
  const solutions = [];
  const regex = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = regex.exec(templateText || '')) !== null) {
    solutions.push(match[1].trim());
  }
  return solutions;
}

function renderClozeInteractiveHtml(templateText, qIndex, disabled) {
  let blankIdx = 0;
  const safeTemplate = escapeHtmlSafe(templateText || '');
  return safeTemplate.replace(/\{\{([^}]+)\}\}/g, function(_, answer) {
    const currentIdx = blankIdx++;
    const widthCh = Math.max(8, answer.trim().length + 3);
    return '<input type="text" data-q-index="' + qIndex + '" data-cloze-idx="' + currentIdx + '" ' +
      (disabled ? 'disabled ' : '') +
      'style="width:' + widthCh + 'ch" ' +
      'placeholder="..." ' +
      'class="cloze-blank-input inline-block mx-1 px-2 py-0.5 text-center font-bold text-indigo-800 bg-indigo-50 border-b-2 border-indigo-500 rounded-t focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-300">';
  });
}

function moveOrderItem(btn, delta) {
  const row = btn.closest('.order-item-row');
  const list = row ? row.parentElement : null;
  if (!row || !list) return;
  if (delta < 0 && row.previousElementSibling) {
    list.insertBefore(row, row.previousElementSibling);
  } else if (delta > 0 && row.nextElementSibling) {
    list.insertBefore(row.nextElementSibling, row);
  }
  Array.from(list.children).forEach(function(el, i) {
    const badge = el.querySelector('.order-pos-badge');
    if (badge) badge.textContent = String(i + 1);
  });
}

// -------------------------------------------------------------------------
// 5. MOTOR DE PREGUNTES I CORRECCIÓ (QuestionEngine)
// -------------------------------------------------------------------------

const QuestionEngine = {
  normalizeType: function(rawType) {
    const t = (rawType || 'multiple_choice').toLowerCase();
    if (t === 'test' || t === 'multiple_choice' || t === 'mcq') return 'multiple_choice';
    if (t === 'vf' || t === 'true_false' || t === 'boolean') return 'true_false';
    if (t === 'cloze' || t === 'buits' || t === 'fill_blanks') return 'cloze';
    if (t === 'short_answer' || t === 'curta' || t === 'text') return 'short_answer';
    if (t === 'open_ai' || t === 'oberta' || t === 'open') return 'open_ai';
    if (t === 'ordering' || t === 'ordenar') return 'ordering';
    return 'multiple_choice';
  },

  renderAll: function(questions, containerId, isReadOnly) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = Array.isArray(questions) ? questions : [];

    if (list.length === 0) {
      container.innerHTML = '<div class="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">Aquesta lectura encara no té activitats associades.</div>';
      return;
    }

    if (isClassroomProjectionMode && classroomStepMode === 'single') {
      const safeIdx = Math.min(Math.max(0, classroomCurrentQuestionIndex), list.length - 1);
      classroomCurrentQuestionIndex = safeIdx;
      const singleCardHtml = this.renderQuestionCard(list[safeIdx], safeIdx, list.length, isReadOnly);
      container.innerHTML =
        '<div class="space-y-4">' +
          singleCardHtml +
          '<div class="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 p-3 rounded-2xl">' +
            '<button type="button" onclick="navigateClassroomQuestion(-1)" ' + (safeIdx === 0 ? 'disabled' : '') + ' class="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs disabled:opacity-40">' +
              '<i class="fa-solid fa-arrow-left mr-1"></i> Pregunta anterior' +
            '</button>' +
            '<span class="text-xs font-extrabold text-amber-950">Projecció PDI: Pregunta ' + (safeIdx + 1) + ' de ' + list.length + '</span>' +
            '<button type="button" onclick="navigateClassroomQuestion(1)" ' + (safeIdx >= list.length - 1 ? 'disabled' : '') + ' class="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs disabled:opacity-40">' +
              'Pregunta següent <i class="fa-solid fa-arrow-right ml-1"></i>' +
            '</button>' +
          '</div>' +
        '</div>';
      return;
    }

    const self = this;
    container.innerHTML = '<div class="space-y-4">' +
      list.map(function(q, idx) {
        return self.renderQuestionCard(q, idx, list.length, isReadOnly);
      }).join('') +
    '</div>';
  },

  renderQuestionCard: function(q, idx, totalCount, isReadOnly) {
    const qType = this.normalizeType(q.type);
    const taxKey = (q.taxonomy && TAXONOMY_CONFIG[q.taxonomy]) ? q.taxonomy : 'literal';
    const tax = TAXONOMY_CONFIG[taxKey];
    const pts = Number(q.points) || 10;

    let bodyHtml = '';

    if (qType === 'multiple_choice') {
      const options = Array.isArray(q.options) ? q.options : [];
      bodyHtml = '<div class="space-y-2.5 mt-3">' + options.map(function(opt, optIdx) {
        const optText = typeof opt === 'string' ? opt : (opt.text || '');
        const optImg = typeof opt === 'object' ? (opt.image || '') : '';
        return '<label class="flex items-start gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer transition select-none">' +
          '<input type="radio" name="q_answer_' + idx + '" value="' + optIdx + '" ' + (isReadOnly ? 'disabled' : '') + ' class="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500">' +
          '<div class="flex-grow">' +
            (optText ? '<span class="font-medium text-slate-800">' + escapeHtmlSafe(optText) + '</span>' : '') +
            (optImg ? '<div class="mt-2"><img src="' + escapeHtmlAttr(optImg) + '" onclick="event.preventDefault(); openZoomImageModal(\'' + escapeHtmlAttr(optImg) + '\', \'Opció ' + (optIdx + 1) + '\')" class="max-h-36 rounded-lg border border-slate-200 cursor-zoom-in"></div>' : '') +
          '</div>' +
        '</label>';
      }).join('') + '</div>';
    } else if (qType === 'true_false') {
      bodyHtml = '<div class="grid grid-cols-2 gap-3 mt-3">' +
        '<label class="flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer font-bold text-slate-700 transition">' +
          '<input type="radio" name="q_answer_' + idx + '" value="true" ' + (isReadOnly ? 'disabled' : '') + ' class="w-4 h-4 text-emerald-600">' +
          '<i class="fa-solid fa-check text-emerald-600"></i> Vertader' +
        '</label>' +
        '<label class="flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 cursor-pointer font-bold text-slate-700 transition">' +
          '<input type="radio" name="q_answer_' + idx + '" value="false" ' + (isReadOnly ? 'disabled' : '') + ' class="w-4 h-4 text-rose-600">' +
          '<i class="fa-solid fa-xmark text-rose-600"></i> Fals' +
        '</label>' +
      '</div>';
    } else if (qType === 'cloze') {
      const clozeSource = q.clozeText || q.question || '';
      bodyHtml = '<div class="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 leading-loose text-base text-slate-800">' +
        renderClozeInteractiveHtml(clozeSource, idx, isReadOnly) +
      '</div>';
    } else if (qType === 'short_answer') {
      bodyHtml = '<div class="mt-3">' +
        '<input type="text" id="q_short_' + idx + '" ' + (isReadOnly ? 'disabled ' : '') +
        'placeholder="Escriu la teva resposta breu aquí..." ' +
        'class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none text-slate-800 font-medium">' +
      '</div>';
    } else if (qType === 'open_ai') {
      bodyHtml = '<div class="mt-3">' +
        '<textarea id="q_open_' + idx + '" rows="3" ' + (isReadOnly ? 'disabled ' : '') +
        'placeholder="Explica la teva resposta amb les teves paraules..." ' +
        'class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none text-slate-800"></textarea>' +
        '<p class="text-xs text-purple-600 mt-1 flex items-center gap-1"><i class="fa-solid fa-wand-magic-sparkles"></i> Aquesta resposta serà avaluada amb intel·ligència artificial.</p>' +
      '</div>';
    } else if (qType === 'ordering') {
      const items = Array.isArray(q.orderItems) ? q.orderItems : [];
      const shuffled = items.map(function(txt, origI) { return { txt: txt, origI: origI }; });
      if (!isReadOnly) {
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = shuffled[i];
          shuffled[i] = shuffled[j];
          shuffled[j] = temp;
        }
      }
      bodyHtml = '<div id="q_order_list_' + idx + '" class="space-y-2 mt-3">' +
        shuffled.map(function(item, pos) {
          return '<div class="order-item-row flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200" data-orig-index="' + item.origI + '">' +
            '<span class="font-medium text-slate-800 text-sm"><span class="order-pos-badge inline-block w-6 h-6 text-center leading-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs mr-2">' + (pos + 1) + '</span>' + escapeHtmlSafe(item.txt) + '</span>' +
            (isReadOnly ? '' :
              '<div class="flex items-center gap-1 shrink-0">' +
                '<button type="button" onclick="moveOrderItem(this, -1)" class="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs" title="Pujar"><i class="fa-solid fa-arrow-up"></i></button>' +
                '<button type="button" onclick="moveOrderItem(this, 1)" class="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 text-xs" title="Baixar"><i class="fa-solid fa-arrow-down"></i></button>' +
              '</div>') +
          '</div>';
        }).join('') +
      '</div>';
    }

    const promptText = (qType === 'cloze' && !q.prompt)
      ? 'Completa els espais en blanc del text següent:'
      : (q.question || q.prompt || 'Respon la pregunta:');

    return '<div id="question-card-' + idx + '" class="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm transition-all">' +
      '<div class="flex flex-wrap items-center justify-between gap-2 mb-3">' +
        '<div class="flex items-center gap-2">' +
          '<span class="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold text-xs">Pregunta ' + (idx + 1) + ' / ' + totalCount + '</span>' +
          '<span class="px-2.5 py-1 rounded-lg border text-xs font-bold ' + tax.color + '">' +
            '<i class="fa-solid ' + tax.icon + ' mr-1"></i>' + tax.label +
          '</span>' +
        '</div>' +
        '<span class="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">' + pts + ' punts</span>' +
      '</div>' +
      '<h4 class="font-bold text-slate-800 text-base md:text-lg leading-snug">' + escapeHtmlSafe(promptText) + '</h4>' +
      (q.image ? '<div class="my-3"><img src="' + escapeHtmlAttr(q.image) + '" onclick="openZoomImageModal(\'' + escapeHtmlAttr(q.image) + '\', \'Imatge de la pregunta ' + (idx + 1) + '\')" class="max-h-56 rounded-xl border border-slate-200 cursor-zoom-in"></div>' : '') +
      bodyHtml +
      '<div id="question-feedback-' + idx + '" class="hidden mt-4 p-3.5 rounded-xl text-sm"></div>' +
    '</div>';
  },

  gradeAll: async function(questions, context) {
    const list = Array.isArray(questions) ? questions : [];
    let totalEarnedPoints = 0;
    let totalMaxPoints = 0;
    const taxonomyEarned = {};

    for (let idx = 0; idx < list.length; idx++) {
      const q = list[idx];
      const qType = this.normalizeType(q.type);
      const maxPts = Number(q.points) || 10;
      const taxKey = (q.taxonomy && TAXONOMY_CONFIG[q.taxonomy]) ? q.taxonomy : 'literal';
      totalMaxPoints += maxPts;

      let ratio = 0;
      let feedbackMsg = '';

      if (qType === 'multiple_choice') {
        const selected = document.querySelector('input[name="q_answer_' + idx + '"]:checked');
        const correctIdx = Number(q.correctIndex) || 0;
        if (selected && Number(selected.value) === correctIdx) {
          ratio = 1;
          feedbackMsg = 'Resposta correcta!';
        } else {
          const opts = Array.isArray(q.options) ? q.options : [];
          const rightOpt = opts[correctIdx];
          const rightText = typeof rightOpt === 'string' ? rightOpt : (rightOpt && rightOpt.text ? rightOpt.text : 'Opció ' + (correctIdx + 1));
          feedbackMsg = 'La resposta correcta era: <strong>' + escapeHtmlSafe(rightText) + '</strong>';
        }
      } else if (qType === 'true_false') {
        const selected = document.querySelector('input[name="q_answer_' + idx + '"]:checked');
        const expectedBool = String(q.correctBool) !== 'false' && q.correctAnswer !== false;
        if (selected && (selected.value === 'true') === expectedBool) {
          ratio = 1;
          feedbackMsg = 'Correcte!';
        } else {
          feedbackMsg = 'La resposta correcta era: <strong>' + (expectedBool ? 'Vertader' : 'Fals') + '</strong>';
        }
      } else if (qType === 'cloze') {
        const solutions = extractClozeSolutions(q.clozeText || q.question || '');
        const inputs = document.querySelectorAll('.cloze-blank-input[data-q-index="' + idx + '"]');
        let hits = 0;
        solutions.forEach(function(sol, bIdx) {
          const inp = inputs[bIdx];
          const val = inp ? normalizeForComparison(inp.value) : '';
          if (val && val === normalizeForComparison(sol)) {
            hits++;
            if (inp) inp.classList.add('border-emerald-500', 'bg-emerald-50', 'text-emerald-900');
          } else if (inp) {
            inp.classList.add('border-rose-500', 'bg-rose-50', 'text-rose-900');
          }
        });
        ratio = solutions.length > 0 ? (hits / solutions.length) : 0;
        feedbackMsg = hits === solutions.length
          ? 'Tots els buits són correctes!'
          : 'Has encertat ' + hits + ' de ' + solutions.length + ' buits. Solució: <strong>' + escapeHtmlSafe(solutions.join(', ')) + '</strong>';
      } else if (qType === 'short_answer') {
        const inp = document.getElementById('q_short_' + idx);
        const userNorm = normalizeForComparison(inp ? inp.value : '');
        const keywords = Array.isArray(q.keywords) ? q.keywords : [];
        const matched = userNorm && keywords.some(function(kw) {
          const kwNorm = normalizeForComparison(kw);
          return kwNorm && userNorm.includes(kwNorm);
        });
        if (matched) {
          ratio = 1;
          feedbackMsg = 'Molt bé! Resposta correcta.';
        } else {
          feedbackMsg = 'Paraules clau esperades: <strong>' + escapeHtmlSafe(keywords.join(', ')) + '</strong>';
        }
      } else if (qType === 'open_ai') {
        const area = document.getElementById('q_open_' + idx);
        const studentText = area ? area.value : '';
        const aiRes = await evaluateOpenAnswerWithAI(q.question || q.prompt || '', q.rubric || '', studentText, context || {});
        ratio = aiRes.ratio;
        feedbackMsg = escapeHtmlSafe(aiRes.feedback);
      } else if (qType === 'ordering') {
        const rows = document.querySelectorAll('#q_order_list_' + idx + ' .order-item-row');
        let correctPositions = 0;
        rows.forEach(function(r, pos) {
          if (Number(r.getAttribute('data-orig-index')) === pos) correctPositions++;
        });
        ratio = rows.length > 0 ? (correctPositions / rows.length) : 0;
        feedbackMsg = ratio === 1
          ? 'Seqüència ordenada perfectament!'
          : 'Has col·locat ' + correctPositions + ' de ' + rows.length + ' passos al seu lloc.';
      }

      const earned = Math.round(maxPts * ratio);
      totalEarnedPoints += earned;
      taxonomyEarned[taxKey] = (taxonomyEarned[taxKey] || 0) + earned;

      const fbEl = document.getElementById('question-feedback-' + idx);
      const cardEl = document.getElementById('question-card-' + idx);
      if (fbEl) {
        fbEl.classList.remove('hidden');
        const isGood = ratio >= 0.7;
        fbEl.className = 'mt-4 p-3.5 rounded-xl text-sm border ' + (isGood ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900');
        fbEl.innerHTML =
          '<div class="font-bold flex items-center justify-between">' +
            '<span>' + (isGood ? '<i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i>' : '<i class="fa-solid fa-circle-info text-amber-600 mr-1.5"></i>') + feedbackMsg + '</span>' +
            '<span class="font-mono text-xs font-extrabold">+' + earned + '/' + maxPts + ' pts</span>' +
          '</div>' +
          (q.explanation ? '<p class="text-xs mt-1.5 opacity-90">' + escapeHtmlSafe(q.explanation) + '</p>' : '');
      }
      if (cardEl) {
        cardEl.querySelectorAll('input, textarea, button').forEach(function(el) {
          el.disabled = true;
        });
      }
    }

    const scoreOver10 = totalMaxPoints > 0
      ? Number(((totalEarnedPoints / totalMaxPoints) * 10).toFixed(1))
      : 10;

    return {
      totalEarnedPoints: totalEarnedPoints,
      totalMaxPoints: totalMaxPoints,
      scoreOver10: scoreOver10,
      taxonomyEarned: taxonomyEarned
    };
  }
};