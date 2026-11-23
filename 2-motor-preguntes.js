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
    '</div>