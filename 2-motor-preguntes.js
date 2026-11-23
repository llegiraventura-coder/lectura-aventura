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

function escapeHtmlSafe(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
    // Negreta i cursiva bàsica Markdown
    safeLine = safeLine.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    safeLine = safeLine.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Ressaltat de paraules del glossari
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

// -------------------------------------------------------------------------
// 5. MOTOR DE PREGUNTES (QuestionEngine)
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
      bodyHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">' +
        '<label class="flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer transition">' +
          '<input type="radio" name="q_answer_' + idx + '" value="true" ' + (isReadOnly ? 'disabled' : '') + ' class="w-4 h-4 text-emerald-600">' +
          '<span class="font-bold text-emerald-800"><i class="fa-solid fa-check mr-1.5"></i>Vertader</span>' +
        '</label>' +
        '<label class="flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 cursor-pointer transition">' +
          '<input type="radio" name="q_answer_' + idx + '" value="false" ' + (isReadOnly ? 'disabled' : '') + ' class="w-4 h-4 text-rose-600">' +
          '<span class="font-bold text-rose-800"><i class="fa-solid fa-xmark mr-1.5"></i>Fals</span>' +
        '</label>' +
      '</div>';
    } else if (qType === 'cloze') {
      const clozeText = q.clozeText || q.question || '';
      bodyHtml = '<div class="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-base leading-loose text-slate-800">' +
        renderClozeInteractiveHtml(clozeText, idx, isReadOnly) +
        '</div>';
    } else if (qType === 'short_answer') {
      bodyHtml = '<div class="mt-3">' +
        '<input type="text" id="q_short_' + idx + '" ' + (isReadOnly ? 'disabled' : '') +
        ' placeholder="Escriu la teva resposta curta aquí..." ' +
        'class="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none text-slate-800 font-medium">' +
      '</div>';
    } else if (qType === 'open_ai') {
      bodyHtml = '<div class="mt-3 space-y-2">' +
        '<div class="flex items-center gap-1.5 text-xs text-purple-700 font-semibold">' +
          '<i class="fa-solid fa-wand-magic-sparkles"></i>' +
          '<span>Pregunta de reflexió oberta (avaluació intel·ligent amb rúbrica docent)</span>' +
        '</div>' +
        '<textarea id="q_open_' + idx + '" rows="3" ' + (isReadOnly ? 'disabled' : '') +
        ' placeholder="Explica la teva resposta amb una frase completa i ben argumentada..." ' +
        'class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:outline-none text-slate-800"></textarea>' +
      '</div>';
    } else if (qType === 'ordering') {
      const items = Array.isArray(q.orderItems) ? q.orderItems : (Array.isArray(q.options) ? q.options : []);
      const shuffled = items.map(function(item, i) {
        return { text: typeof item === 'string' ? item : (item.text || ''), origIdx: i };
      });
      if (!isReadOnly && shuffled.length > 1) {
        shuffled.reverse();
      }
      bodyHtml = '<div id="q_order_list_' + idx + '" class="space-y-2 mt-3">' +
        shuffled.map(function(entry, pos) {
          return '<div class="order-item-row flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-300" data-orig-idx="' + entry.origIdx + '">' +
            '<span class="font-medium text-slate-800 text-sm"><strong class="text-indigo-600 mr-2">' + (pos + 1) + '.</strong>' + escapeHtmlSafe(entry.text) + '</span>' +
            (isReadOnly ? '' :
              '<div class="flex items-center gap-1 shrink-0">' +
                '<button type="button" onclick="QuestionEngine.moveOrderItem(this, -1)" class="px-2 py-1 rounded bg-white border border-slate-300 hover:bg-indigo-50 text-slate-600 text-xs" title="Pujar"><i class="fa-solid fa-arrow-up"></i></button>' +
                '<button type="button" onclick="QuestionEngine.moveOrderItem(this, 1)" class="px-2 py-1 rounded bg-white border border-slate-300 hover:bg-indigo-50 text-slate-600 text-xs" title="Baixar"><i class="fa-solid fa-arrow-down"></i></button>' +
              '</div>') +
          '</div>';
        }).join('') +
      '</div>';
    }

    const qImageHtml = q.image
      ? '<div class="mt-3"><img src="' + escapeHtmlAttr(q.image) + '" onclick="openZoomImageModal(\'' + escapeHtmlAttr(q.image) + '\', \'Imatge de la pregunta ' + (idx + 1) + '\')" class="max-h-52 rounded-xl border border-slate-200 cursor-zoom-in shadow-sm"></div>'
      : '';

    const questionTitle = qType === 'cloze'
      ? (q.prompt || 'Completa els espais en blanc del fragment següent:')
      : (q.question || '');

    return '<div id="question-card-' + idx + '" class="bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-sm transition">' +
      '<div class="flex flex-wrap items-center justify-between gap-2 mb-2">' +
        '<div class="flex items-center gap-2">' +
          '<span class="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">' + (idx + 1) + '</span>' +
          '<span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ' + tax.color + '" title="' + escapeHtmlAttr(tax.desc) + '">' +
            '<i class="fa-solid ' + tax.icon + ' mr-1"></i>' + tax.label +
          '</span>' +
        '</div>' +
        '<span class="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">' + pts + ' pts</span>' +
      '</div>' +
      '<p class="font-bold text-slate-800 text-base md:text-lg">' + escapeHtmlSafe(questionTitle) + '</p>' +
      qImageHtml +
      bodyHtml +
      '<div id="question-feedback-' + idx + '" class="hidden mt-3 p-3 rounded-xl text-sm font-medium"></div>' +
    '</div>';
  },

  moveOrderItem: function(btn, direction) {
    const row = btn.closest('.order-item-row');
    const list = row ? row.parentElement : null;
    if (!row || !list) return;
    if (direction < 0 && row.previousElementSibling) {
      list.insertBefore(row, row.previousElementSibling);
    } else if (direction > 0 && row.nextElementSibling) {
      list.insertBefore(row.nextElementSibling, row);
    }
    Array.from(list.querySelectorAll('.order-item-row')).forEach(function(r, i) {
      const strong = r.querySelector('strong');
      if (strong) strong.textContent = (i + 1) + '.';
    });
  },

  renderAll: function(questions, containerId, isReadOnly) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const list = Array.isArray(questions) ? questions : [];
    if (list.length === 0) {
      container.innerHTML = '<div class="p-6 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">Aquesta lectura encara no té preguntes configurades.</div>';
      return;
    }

    if (isClassroomProjectionMode && classroomStepMode === 'single') {
      const safeIdx = Math.min(Math.max(0, classroomCurrentQuestionIndex), list.length - 1);
      classroomCurrentQuestionIndex = safeIdx;
      container.innerHTML = this.renderQuestionCard(list[safeIdx], safeIdx, list.length, isReadOnly) +
        '<div class="flex items-center justify-between mt-4 bg-indigo-50 p-3 rounded-xl border border-indigo-200">' +
          '<button type="button" onclick="navigateClassroomQuestion(-1)" ' + (safeIdx === 0 ? 'disabled' : '') + ' class="px-4 py-2 rounded-xl bg-white border border-indigo-300 text-indigo-800 font-bold text-xs disabled:opacity-40"><i class="fa-solid fa-arrow-left mr-1"></i> Anterior</button>' +
          '<span class="font-bold text-xs text-indigo-900">Pregunta ' + (safeIdx + 1) + ' de ' + list.length + ' (Mode Aula PDI)</span>' +
          '<button type="button" onclick="navigateClassroomQuestion(1)" ' + (safeIdx >= list.length - 1 ? 'disabled' : '') + ' class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs disabled:opacity-40">Següent <i class="fa-solid fa-arrow-right ml-1"></i></button>' +
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

  gradeAll: async function(questions, context) {
    const list = Array.isArray(questions) ? questions : [];
    let totalMaxPoints = 0;
    let totalEarnedPoints = 0;
    const taxonomyEarned = { literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 };
    const results = [];

    for (let idx = 0; idx < list.length; idx++) {
      const q = list[idx];
      const qType = this.normalizeType(q.type);
      const pts = Number(q.points) || 10;
      const taxKey = (q.taxonomy && taxonomyEarned.hasOwnProperty(q.taxonomy)) ? q.taxonomy : 'literal';
      totalMaxPoints += pts;

      let multiplier = 0;
      let status = 'incorrect';
      let feedbackMsg = '';

      if (qType === 'multiple_choice') {
        const selected = document.querySelector('input[name="q_answer_' + idx + '"]:checked');
        const chosenIdx = selected ? parseInt(selected.value, 10) : -1;
        const correctIdx = parseInt(q.correctIndex, 10);
        if (chosenIdx === correctIdx && chosenIdx >= 0) {
          multiplier = 1.0;
          status = 'correct';
          feedbackMsg = q.explanation || 'Correcte! Has encertat la resposta.';
        } else {
          const opts = Array.isArray(q.options) ? q.options : [];
          const rightOpt = opts[correctIdx];
          const rightLabel = typeof rightOpt === 'string' ? rightOpt : (rightOpt && rightOpt.text ? rightOpt.text : 'Opció ' + (correctIdx + 1));
          feedbackMsg = q.explanation || ('Resposta incorrecta. La resposta correcta era: ' + rightLabel);
        }
      } else if (qType === 'true_false') {
        const selected = document.querySelector('input[name="q_answer_' + idx + '"]:checked');
        const chosenVal = selected ? selected.value : '';
        const expectedVal = String(q.correctBool) === 'true' || q.correctAnswer === true ? 'true' : 'false';
        if (chosenVal && chosenVal === expectedVal) {
          multiplier = 1.0;
          status = 'correct';
          feedbackMsg = q.explanation || 'Molt bé! És ' + (expectedVal === 'true' ? 'Vertader.' : 'Fals.');
        } else {
          feedbackMsg = q.explanation || ('Incorrecte. La resposta correcta era ' + (expectedVal === 'true' ? 'Vertader.' : 'Fals.'));
        }
      } else if (qType === 'cloze') {
        const solutions = extractClozeSolutions(q.clozeText || q.question || '');
        const inputs = Array.from(document.querySelectorAll('.cloze-blank-input[data-q-index="' + idx + '"]'));
        let hits = 0;
        solutions.forEach(function(sol, bIdx) {
          const inp = inputs[bIdx];
          const userVal = inp ? inp.value : '';
          const isOk = normalizeText(userVal) === normalizeText(sol) && normalizeText(sol).length > 0;
          if (isOk) {
            hits++;
            if (inp) inp.classList.add('border-emerald-500', 'bg-emerald-50', 'text-emerald-900');
          } else if (inp) {
            inp.classList.add('border-rose-500', 'bg-rose-50', 'text-rose-900');
          }
        });
        multiplier = solutions.length > 0 ? (hits / solutions.length) : 0;
        if (multiplier === 1) {
          status = 'correct';
          feedbackMsg = 'Excel·lent! Has completat tots els buits (' + hits + '/' + solutions.length + ').';
        } else if (multiplier > 0) {
          status = 'partial';
          feedbackMsg = 'Has encertat ' + hits + ' de ' + solutions.length + ' buits. Solució: ' + solutions.join(', ');
        } else {
          feedbackMsg = 'Revisa el text. Les paraules esperades eren: ' + solutions.join(', ');
        }
      } else if (qType === 'short_answer') {
        const inp = document.getElementById('q_short_' + idx);
        const userText = inp ? inp.value : '';
        const evalRes = evaluateKeywordsFallback(userText, q);
        multiplier = evalRes.multiplier;
        status = evalRes.status;
        feedbackMsg = evalRes.feedback;
      } else if (qType === 'open_ai') {
        const area = document.getElementById('q_open_' + idx);
        const studentAnswer = area ? area.value.trim() : '';
        if (!studentAnswer) {
          multiplier = 0;
          status = 'incorrect';
          feedbackMsg = 'No has escrit cap resposta en aquesta pregunta oberta.';
        } else {
          const aiRes = await evaluateOpenAnswerWithAI({
            studentAnswer: studentAnswer,
            question: q.question || '',
            rubricPrompt: q.rubric || q.explanation || '',
            taxonomyType: taxKey,
            readingTitle: context ? context.readingTitle : '',
            readingLevel: context ? context.readingLevel : '',
            textFragment: context ? context.textFragment : '',
            qData: q
          });
          multiplier = aiRes.multiplier;
          status = aiRes.status;
          feedbackMsg = aiRes.feedback;
        }
      } else if (qType === 'ordering') {
        const rows = Array.from(document.querySelectorAll('#q_order_list_' + idx + ' .order-item-row'));
        let correctPositions = 0;
        rows.forEach(function(row, pos) {
          if (parseInt(row.getAttribute('data-orig-idx'), 10) === pos) {
            correctPositions++;
          }
        });
        multiplier = rows.length > 0 ? (correctPositions / rows.length) : 0;
        if (multiplier === 1) {
          status = 'correct';
          feedbackMsg = 'Ordre perfecte!';
        } else if (multiplier >= 0.5) {
          status = 'partial';
          feedbackMsg = 'Has col·locat ' + correctPositions + ' de ' + rows.length + ' elements al seu lloc correcte.';
        } else {
          feedbackMsg = 'Revisa l\'ordre cronològic dels fets a la lectura.';
        }
      }

      const earned = Math.round(pts * multiplier);
      totalEarnedPoints += earned;
      if (status === 'correct') {
        taxonomyEarned[taxKey] = (taxonomyEarned[taxKey] || 0) + 1;
      }

      this.paintQuestionFeedback(idx, status, feedbackMsg, earned, pts);
      results.push({ index: idx, status: status, earned: earned, max: pts, taxonomy: taxKey });
    }

    const scoreOver10 = totalMaxPoints > 0 ? Math.round((totalEarnedPoints / totalMaxPoints) * 100) / 10 : 0;
    return {
      totalEarnedPoints: totalEarnedPoints,
      totalMaxPoints: totalMaxPoints,
      scoreOver10: scoreOver10,
      taxonomyEarned: taxonomyEarned,
      results: results
    };
  },

  paintQuestionFeedback: function(idx, status, message, earned, maxPts) {
    const card = document.getElementById('question-card-' + idx);
    const fb = document.getElementById('question-feedback-' + idx);
    if (!fb) return;

    fb.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-900', 'border-emerald-300', 'bg-amber-50', 'text-amber-900', 'border-amber-300', 'bg-rose-50', 'text-rose-900', 'border-rose-300');
    fb.classList.add('border');

    if (card) {
      card.classList.remove('border-slate-200', 'border-emerald-400', 'border-amber-400', 'border-rose-400');
    }

    if (status === 'correct') {
      if (card) card.classList.add('border-emerald-400');
      fb.classList.add('bg-emerald-50', 'text-emerald-900', 'border-emerald-300');
      fb.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i><strong>+' + earned + '/' + maxPts + ' pts:</strong> ' + escapeHtmlSafe(message);
    } else if (status === 'partial') {
      if (card) card.classList.add('border-amber-400');
      fb.classList.add('bg-amber-50', 'text-amber-900', 'border-amber-300');
      fb.innerHTML = '<i class="fa-solid fa-circle-half-stroke text-amber-600 mr-1.5"></i><strong>+' + earned + '/' + maxPts + ' pts:</strong> ' + escapeHtmlSafe(message);
    } else {
      if (card) card.classList.add('border-rose-400');
      fb.classList.add('bg-rose-50', 'text-rose-900', 'border-rose-300');
      fb.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-600 mr-1.5"></i><strong>0/' + maxPts + ' pts:</strong> ' + escapeHtmlSafe(message);
    }
  }
};