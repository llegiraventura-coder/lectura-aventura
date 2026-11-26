/* ==========================================================================
   SUBRATLLADOR FLUORESCENT (HIGHLIGHTER) PER A LA VISTA DE LECTURA
   ========================================================================== */
window.highlighterSessionStore = window.highlighterSessionStore || {};
let activeHighlightRange = null;
let activeHighlightMark = null;
let highlighterListenersInitialized = false;

function showReaderToast(message) {
  let toast = document.getElementById('reader-highlighter-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'reader-highlighter-toast';
    toast.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg border border-slate-700/80 transition-all duration-200 pointer-events-none opacity-0 scale-95';
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.classList.remove('opacity-0', 'scale-95');
  toast.classList.add('opacity-100', 'scale-100');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function() {
    toast.classList.remove('opacity-100', 'scale-100');
    toast.classList.add('opacity-0', 'scale-95');
  }, 2200);
}

function ensureHighlighterPopoverInDOM() {
  if (document.getElementById('highlighter-popover')) return;
  const container = document.getElementById('highlighter-popover-container') || document.body;
  const popover = document.createElement('div');
  popover.id = 'highlighter-popover';
  popover.className = 'fixed z-50 hidden bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-1.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-1.5 transition-all duration-150 transform scale-95 opacity-0 pointer-events-none select-none max-w-[calc(100vw-16px)] overflow-x-auto';
  popover.setAttribute('role', 'toolbar');
  popover.setAttribute('aria-label', isEn() ? 'Highlight colors' : 'Colors de retolador fluorescent');

  popover.innerHTML = `
    <button type="button" data-hl-color="yellow" title="${isEn() ? 'Yellow: Important' : 'Groc: Important'}" class="hl-color-btn flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-xs font-bold text-slate-100 transition cursor-pointer">
      <span class="w-3.5 h-3.5 rounded-full bg-[#fef08a] border border-amber-300 shadow-2xs inline-block shrink-0"></span>
      <span class="text-[11px] font-bold whitespace-nowrap">${isEn() ? 'Important' : 'Important'}</span>
    </button>
    <button type="button" data-hl-color="green" title="${isEn() ? 'Green: Hint' : 'Verd: Pista'}" class="hl-color-btn flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-xs font-bold text-slate-100 transition cursor-pointer">
      <span class="w-3.5 h-3.5 rounded-full bg-[#bbf7d0] border border-emerald-300 shadow-2xs inline-block shrink-0"></span>
      <span class="text-[11px] font-bold whitespace-nowrap">${isEn() ? 'Hint' : 'Pista'}</span>
    </button>
    <button type="button" data-hl-color="pink" title="${isEn() ? 'Pink: Difficult word' : 'Rosa: Paraula difícil'}" class="hl-color-btn flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-slate-800 active:bg-slate-700 text-xs font-bold text-slate-100 transition cursor-pointer">
      <span class="w-3.5 h-3.5 rounded-full bg-[#fbcfe8] border border-pink-300 shadow-2xs inline-block shrink-0"></span>
      <span class="text-[11px] font-bold whitespace-nowrap">${isEn() ? 'Difficult word' : 'Paraula difícil'}</span>
    </button>
    <div id="hl-remove-separator" class="h-4 w-px bg-slate-700 mx-0.5 shrink-0"></div>
    <button type="button" id="hl-remove-btn" title="${isEn() ? 'Remove mark' : 'Treure marca'}" class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-rose-950/80 active:bg-rose-900/90 text-rose-300 hover:text-rose-200 text-xs font-bold transition cursor-pointer shrink-0">
      <i class="fa-solid fa-eraser text-rose-400 text-xs"></i>
      <span class="text-[11px] font-bold whitespace-nowrap">${isEn() ? 'Remove mark' : 'Treure marca'}</span>
    </button>
  `;

  popover.addEventListener('mousedown', function(e) {
    e.preventDefault();
  });
  popover.addEventListener('touchstart', function(e) {
    e.stopPropagation();
  }, { passive: false });

  popover.querySelectorAll('.hl-color-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const color = btn.getAttribute('data-hl-color');
      applyChosenColor(color);
    });
  });

  const removeBtn = popover.querySelector('#hl-remove-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      removeActiveHighlight();
    });
  }

  container.appendChild(popover);
}

function positionHighlighterPopover(popover, rect) {
  if (!rect || (rect.width === 0 && rect.height === 0)) return;

  popover.classList.remove('hidden');
  const pWidth = popover.offsetWidth || 340;
  const pHeight = popover.offsetHeight || 42;

  let top = rect.top - pHeight - 8;
  if (top < 10) {
    top = rect.bottom + 8;
  }
  let left = rect.left + (rect.width / 2) - (pWidth / 2);
  left = Math.max(8, Math.min(left, window.innerWidth - pWidth - 8));

  popover.style.top = Math.round(top) + 'px';
  popover.style.left = Math.round(left) + 'px';

  popover.classList.remove('scale-95', 'opacity-0', 'pointer-events-none');
  popover.classList.add('scale-100', 'opacity-100', 'pointer-events-auto');
}

function hideHighlighterPopover() {
  const popover = document.getElementById('highlighter-popover');
  if (!popover || popover.classList.contains('hidden')) return;

  popover.classList.remove('scale-100', 'opacity-100', 'pointer-events-auto');
  popover.classList.add('scale-95', 'opacity-0', 'pointer-events-none');
  setTimeout(function() {
    if (popover && popover.classList.contains('pointer-events-none')) {
      popover.classList.add('hidden');
    }
  }, 150);
}

function selectionIntersectsHighlight(range) {
  if (!range) return false;
  const container = document.getElementById('reading-text-box');
  if (!container) return false;
  const marks = container.querySelectorAll('mark.user-highlight');
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i];
    const markRange = document.createRange();
    markRange.selectNodeContents(mark);
    const startsBeforeRangeEnds = range.compareBoundaryPoints(Range.END_TO_START, markRange) < 0;
    const endsAfterRangeStarts = range.compareBoundaryPoints(Range.START_TO_END, markRange) > 0;
    if (startsBeforeRangeEnds && endsAfterRangeStarts) {
      return true;
    }
  }
  return false;
}

function showHighlighterPopoverForRange(range) {
  if (!range || range.collapsed) return;
  const container = document.getElementById('reading-text-box');
  if (!container) return;
  if (!container.contains(range.startContainer) && !container.contains(range.endContainer)) return;

  activeHighlightRange = range.cloneRange();
  activeHighlightMark = null;

  ensureHighlighterPopoverInDOM();
  const popover = document.getElementById('highlighter-popover');
  if (!popover) return;

  const hasExisting = selectionIntersectsHighlight(range);
  const sep = popover.querySelector('#hl-remove-separator');
  const remBtn = popover.querySelector('#hl-remove-btn');
  if (sep && remBtn) {
    if (hasExisting) {
      sep.classList.remove('hidden');
      remBtn.classList.remove('hidden');
    } else {
      sep.classList.add('hidden');
      remBtn.classList.add('hidden');
    }
  }

  popover.querySelectorAll('.hl-color-btn').forEach(function(b) {
    b.classList.remove('ring-2', 'ring-white/70', 'bg-slate-800');
  });

  const rect = range.getBoundingClientRect();
  positionHighlighterPopover(popover, rect);
}

function showHighlighterPopoverForMark(mark) {
  if (!mark) return;
  activeHighlightMark = mark;
  activeHighlightRange = null;

  ensureHighlighterPopoverInDOM();
  const popover = document.getElementById('highlighter-popover');
  if (!popover) return;

  const sep = popover.querySelector('#hl-remove-separator');
  const remBtn = popover.querySelector('#hl-remove-btn');
  if (sep && remBtn) {
    sep.classList.remove('hidden');
    remBtn.classList.remove('hidden');
  }

  const currentColor = mark.getAttribute('data-color') || 'yellow';
  popover.querySelectorAll('.hl-color-btn').forEach(function(b) {
    const btnCol = b.getAttribute('data-hl-color');
    if (btnCol === currentColor || currentColor.includes(btnCol)) {
      b.classList.add('ring-2', 'ring-white/70', 'bg-slate-800');
    } else {
      b.classList.remove('ring-2', 'ring-white/70', 'bg-slate-800');
    }
  });

  const rect = mark.getBoundingClientRect();
  positionHighlighterPopover(popover, rect);
}

function applyChosenColor(color) {
  if (activeHighlightMark) {
    activeHighlightMark.setAttribute('data-color', color);
    activeHighlightMark = null;
    activeHighlightRange = null;
    saveHighlightsToSession();
    hideHighlighterPopover();
    return;
  }

  if (activeHighlightRange && !activeHighlightRange.collapsed) {
    applyHighlightToRange(activeHighlightRange, color);
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    activeHighlightRange = null;
    activeHighlightMark = null;
    saveHighlightsToSession();
    hideHighlighterPopover();
  }
}

function removeActiveHighlight() {
  if (activeHighlightMark) {
    unwrapMark(activeHighlightMark);
    activeHighlightMark = null;
    activeHighlightRange = null;
    const container = document.getElementById('reading-text-box');
    if (container) {
      mergeAdjacentMarks(container);
      container.normalize();
    }
    saveHighlightsToSession();
    hideHighlighterPopover();
    return;
  }

  if (activeHighlightRange) {
    removeHighlightFromRange(activeHighlightRange);
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    activeHighlightRange = null;
    activeHighlightMark = null;
    saveHighlightsToSession();
    hideHighlighterPopover();
  }
}

function applyHighlightToRange(range, color) {
  if (!range || range.collapsed) return;
  const container = document.getElementById('reading-text-box');
  if (!container) return;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  const intersectingNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.nodeValue) continue;

    const nodeRange = document.createRange();
    nodeRange.selectNodeContents(node);
    const startsBeforeRangeEnds = range.compareBoundaryPoints(Range.END_TO_START, nodeRange) < 0;
    const endsAfterRangeStarts = range.compareBoundaryPoints(Range.START_TO_END, nodeRange) > 0;
    if (startsBeforeRangeEnds && endsAfterRangeStarts) {
      intersectingNodes.push(node);
    }
  }

  if (intersectingNodes.length === 0) return;

  const startContainer = range.startContainer;
  const startOffset = range.startOffset;
  const endContainer = range.endContainer;
  const endOffset = range.endOffset;

  intersectingNodes.forEach(function(node) {
    const parentMark = node.parentNode && node.parentNode.closest ? node.parentNode.closest('mark.user-highlight') : null;
    if (parentMark) {
      parentMark.setAttribute('data-color', color);
      return;
    }

    let thisStart = (node === startContainer) ? startOffset : 0;
    let thisEnd = (node === endContainer) ? endOffset : node.nodeValue.length;

    if (thisStart >= thisEnd) return;

    let targetNode = node;
    if (thisEnd < targetNode.nodeValue.length) {
      targetNode.splitText(thisEnd);
    }
    if (thisStart > 0) {
      targetNode = targetNode.splitText(thisStart);
    }

    if (targetNode.nodeValue && targetNode.nodeValue.length > 0) {
      const mark = document.createElement('mark');
      mark.className = 'user-highlight';
      mark.setAttribute('data-color', color);
      targetNode.parentNode.insertBefore(mark, targetNode);
      mark.appendChild(targetNode);
    }
  });

  mergeAdjacentMarks(container);
  saveHighlightsToSession();
}

function removeHighlightFromRange(range) {
  const container = document.getElementById('reading-text-box');
  if (!container) return;

  const marks = container.querySelectorAll('mark.user-highlight');
  marks.forEach(function(mark) {
    if (range) {
      const markRange = document.createRange();
      markRange.selectNodeContents(mark);
      const startsBeforeRangeEnds = range.compareBoundaryPoints(Range.END_TO_START, markRange) < 0;
      const endsAfterRangeStarts = range.compareBoundaryPoints(Range.START_TO_END, markRange) > 0;
      if (startsBeforeRangeEnds && endsAfterRangeStarts) {
        unwrapMark(mark);
      }
    } else {
      unwrapMark(mark);
    }
  });

  container.normalize();
  saveHighlightsToSession();
}

function unwrapMark(mark) {
  if (!mark || !mark.parentNode) return;
  while (mark.firstChild) {
    mark.parentNode.insertBefore(mark.firstChild, mark);
  }
  mark.parentNode.removeChild(mark);
}

function mergeAdjacentMarks(container) {
  if (!container) return;
  const marks = container.querySelectorAll('mark.user-highlight');
  marks.forEach(function(m) {
    if (!m.parentNode) return;
    const next = m.nextSibling;
    if (next && next.nodeType === Node.ELEMENT_NODE && next.tagName === 'MARK' && next.classList.contains('user-highlight')) {
      if (next.getAttribute('data-color') === m.getAttribute('data-color')) {
        while (next.firstChild) {
          m.appendChild(next.firstChild);
        }
        next.parentNode.removeChild(next);
      }
    }
  });
}

function clearUserHighlights() {
  const container = document.getElementById('reading-text-box');
  if (!container) return;
  const marks = container.querySelectorAll('mark.user-highlight');
  if (marks.length === 0) {
    showReaderToast(isEn() ? 'No highlights to clear' : 'No hi ha subratllats per netejar');
    return;
  }

  marks.forEach(function(m) {
    unwrapMark(m);
  });
  container.normalize();

  if (readerCurrentDocId && window.highlighterSessionStore) {
    delete window.highlighterSessionStore[readerCurrentDocId];
    try {
      sessionStorage.removeItem('la_highlights_' + readerCurrentDocId);
    } catch (e) {}
  }

  showReaderToast(isEn() ? 'Highlights cleared' : 'Subratllats netejats');
  hideHighlighterPopover();
}

function saveHighlightsToSession() {
  if (!readerCurrentDocId) return;
  const container = document.getElementById('reading-text-box');
  if (!container) return;

  const contentDivs = container.querySelectorAll('.reader-text-content');
  if (contentDivs.length === 0) return;

  const hasAnyMarks = container.querySelector('mark.user-highlight') !== null;
  if (!hasAnyMarks) {
    if (window.highlighterSessionStore) {
      delete window.highlighterSessionStore[readerCurrentDocId];
    }
    try {
      sessionStorage.removeItem('la_highlights_' + readerCurrentDocId);
    } catch (e) {}
    return;
  }

  const savedParts = [];
  contentDivs.forEach(function(div) {
    savedParts.push(div.innerHTML);
  });

  if (!window.highlighterSessionStore) window.highlighterSessionStore = {};
  window.highlighterSessionStore[readerCurrentDocId] = savedParts;

  try {
    sessionStorage.setItem('la_highlights_' + readerCurrentDocId, JSON.stringify(savedParts));
  } catch (e) {}
}

function restoreHighlightsFromSession(docId) {
  if (!docId) return;
  let savedParts = null;
  if (window.highlighterSessionStore && window.highlighterSessionStore[docId]) {
    savedParts = window.highlighterSessionStore[docId];
  } else {
    try {
      const stored = sessionStorage.getItem('la_highlights_' + docId);
      if (stored) savedParts = JSON.parse(stored);
    } catch (e) {}
  }

  if (!savedParts || !Array.isArray(savedParts)) return;

  const container = document.getElementById('reading-text-box');
  if (!container) return;

  const contentDivs = container.querySelectorAll('.reader-text-content');
  if (contentDivs.length === savedParts.length) {
    contentDivs.forEach(function(div, idx) {
      if (savedParts[idx]) {
        div.innerHTML = savedParts[idx];
      }
    });
  }
}

function setupHighlighterListeners() {
  ensureHighlighterPopoverInDOM();
  if (highlighterListenersInitialized) return;
  highlighterListenersInitialized = true;

  // Ratolí (Desktop)
  document.addEventListener('mouseup', function(e) {
    const popover = document.getElementById('highlighter-popover');
    if (popover && popover.contains(e.target)) return;

    setTimeout(function() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        if (!activeHighlightMark) hideHighlighterPopover();
        return;
      }
      const text = sel.toString().trim();
      if (!text) {
        if (!activeHighlightMark) hideHighlighterPopover();
        return;
      }
      const range = sel.getRangeAt(0);
      const container = document.getElementById('reading-text-box');
      if (container && (container.contains(range.startContainer) || container.contains(range.endContainer))) {
        showHighlighterPopoverForRange(range);
      } else {
        if (!activeHighlightMark) hideHighlighterPopover();
      }
    }, 15);
  });

  // Pantalla tàctil (Chromebooks, iPads, tauletes)
  document.addEventListener('touchend', function(e) {
    const popover = document.getElementById('highlighter-popover');
    if (popover && popover.contains(e.target)) return;

    setTimeout(function() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString().trim();
      if (!text) return;
      const range = sel.getRangeAt(0);
      const container = document.getElementById('reading-text-box');
      if (container && (container.contains(range.startContainer) || container.contains(range.endContainer))) {
        showHighlighterPopoverForRange(range);
      }
    }, 120);
  });

  // Clics per a modificar/eliminar marques existents i respectar glossari
  document.addEventListener('click', function(e) {
    const popover = document.getElementById('highlighter-popover');
    if (popover && popover.contains(e.target)) return;

    // Si és un enllaç de glossari, permetre que l'acció nativa (scrollToGlossary) s'executi
    const glossaryLink = e.target.closest('a[href*="glossari"], a[href*="glossary"]');
    if (glossaryLink) {
      hideHighlighterPopover();
      return;
    }

    const mark = e.target.closest('mark.user-highlight');
    if (mark) {
      const container = document.getElementById('reading-text-box');
      if (container && container.contains(mark)) {
        showHighlighterPopoverForMark(mark);
        return;
      }
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      hideHighlighterPopover();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      hideHighlighterPopover();
    }
  });

  window.addEventListener('resize', function() {
    hideHighlighterPopover();
  });

  window.addEventListener('scroll', function() {
    const popover = document.getElementById('highlighter-popover');
    if (!popover || popover.classList.contains('hidden')) return;
    if (activeHighlightMark) {
      positionHighlighterPopover(popover, activeHighlightMark.getBoundingClientRect());
    } else if (activeHighlightRange) {
      positionHighlighterPopover(popover, activeHighlightRange.getBoundingClientRect());
    }
  }, { passive: true });
}

function toggleSpeechSynthesis() {
  if (!('speechSynthesis' in window)) {
    alert(isEn() ? "Your browser does not support speech synthesis." : "El teu navegador no suporta la síntesi de veu.");
    return;
  }
  if (isSpeaking && !isSpeechPaused) {
    window.speechSynthesis.pause();
    isSpeechPaused = true;
    updateSpeechUI();
    return;
  }
  if (isSpeaking && isSpeechPaused) {
    window.speechSynthesis.resume();
    isSpeechPaused = false;
    updateSpeechUI();
    return;
  }
  stopSpeechSynthesis();
  const textElem = document.querySelector('#reading-text-box .reader-part-panel:not(.hidden)') || document.getElementById('reading-text-box') || document.getElementById('visual-reading-transcript');
  if (!textElem) return;

  currentTextToRead = textElem.innerText.trim();
  if (!currentTextToRead) return;

  speechUtterance = new SpeechSynthesisUtterance(currentTextToRead);
  speechUtterance.lang = isEn() ? 'en-GB' : 'ca-ES';
  speechUtterance.rate = speechRate;

  const voices = window.speechSynthesis.getVoices();
  const voice = isEn()
    ? voices.find(function(v) { return v.lang.startsWith('en'); })
    : voices.find(function(v) { return v.lang.startsWith('ca'); });
  if (voice) speechUtterance.voice = voice;

  speechUtterance.onstart = function() { isSpeaking = true; isSpeechPaused = false; updateSpeechUI(); };
  speechUtterance.onend = function() { stopSpeechSynthesis(); };
  speechUtterance.onerror = function() { stopSpeechSynthesis(); };

  window.speechSynthesis.speak(speechUtterance);
}

function stopSpeechSynthesis() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  isSpeaking = false;
  isSpeechPaused = false;
  updateSpeechUI();
}

function changeSpeechRate(rate) {
  speechRate = parseFloat(rate);
  if (isSpeaking) { toggleSpeechSynthesis(); toggleSpeechSynthesis(); }
}

function updateSpeechUI() {
  const btnPlay = document.getElementById('btn-speech-play');
  const btnStop = document.getElementById('btn-speech-stop');

  if (btnPlay) {
    if (isSpeaking && !isSpeechPaused) {
      btnPlay.innerHTML = '<i class="fa-solid fa-pause text-amber-300"></i> ' + (isEn() ? 'Pause' : 'Pausa');
      btnPlay.className = "px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 text-white border border-amber-700 shadow-xs flex items-center gap-1.5";
    } else if (isSpeaking && isSpeechPaused) {
      btnPlay.innerHTML = '<i class="fa-solid fa-play text-white"></i> ' + (isEn() ? 'Resume' : 'Reprendre');
      btnPlay.className = "px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white border border-emerald-700 shadow-xs flex items-center gap-1.5";
    } else {
      btnPlay.innerHTML = '<i class="fa-solid fa-volume-high text-indigo-200"></i> ' + (isEn() ? 'Listen' : 'Escolta');
      btnPlay.className = "px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 shadow-xs flex items-center gap-1.5";
    }
  }
  if (btnStop) {
    if (isSpeaking) btnStop.classList.remove('hidden');
    else btnStop.classList.add('hidden');
  }
}


function parseClozeTemplate(rawTemplate) {
  const text = rawTemplate || '';
  const regex = /\[\[([\s\S]*?)\]\]/g;
  const parts = [];
  const blanks = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    parts.push(text.slice(lastIndex, match.index));
    const rawInner = (match[1] || '').trim();
    const tokens = rawInner.split('|').map(function(s) { return s.trim(); }).filter(Boolean);
    const correct = tokens.length > 0 ? tokens[0] : '';
    const distractors = tokens.slice(1);
    blanks.push({
      raw: rawInner,
      correct: correct,
      distractors: distractors,
      allOptions: tokens
    });
    lastIndex = regex.lastIndex;
  }
  parts.push(text.slice(lastIndex));
  return { parts: parts, blanks: blanks };
}

function insertClozeBlankInEditor(btn) {
  const block = btn.closest('.q-block');
  if (!block) return;
  const textarea = block.querySelector('.q-cloze-template');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end).trim() || 'paraula';
  const modeSelect = block.querySelector('.q-cloze-mode');
  const mode = modeSelect ? modeSelect.value : 'dropdown';
  const snippet = mode === 'dropdown'
    ? ('[[' + selected + '|distractor1|distractor2]]')
    : ('[[' + selected + ']]');
  textarea.value = textarea.value.substring(0, start) + snippet + textarea.value.substring(end);
  textarea.focus();
  updateClozeEditorPreview(textarea);
}

function updateClozeEditorPreview(elem) {
  const block = elem.closest('.q-block');
  if (!block) return;
  const textarea = block.querySelector('.q-cloze-template');
  const modeSelect = block.querySelector('.q-cloze-mode');
  const previewBox = block.querySelector('.q-cloze-preview');
  if (!textarea || !previewBox) return;

  const mode = modeSelect ? modeSelect.value : 'dropdown';
  const parsed = parseClozeTemplate(textarea.value);

  if (parsed.blanks.length === 0) {
    previewBox.innerHTML = '<span class="text-xs text-slate-400 italic">Escriu frases amb <code class="bg-slate-200 px-1 rounded text-slate-700 font-mono">[[resposta|opció2|opció3]]</code> per generar els buits interactius.</span>';
    return;
  }

  let previewHTML = '<div class="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line">';
  for (let i = 0; i < parsed.parts.length; i++) {
    previewHTML += escapeHtmlAttr(parsed.parts[i]);
    if (i < parsed.blanks.length) {
      const b = parsed.blanks[i];
      if (mode === 'dropdown') {
        const optsPreview = b.allOptions.map(function(o, idx) {
          return idx === 0 ? ('✓ ' + o) : o;
        }).join(' / ');
        previewHTML += '<span class="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-950 border border-cyan-400 font-bold text-xs">' +
          '<i class="fa-solid fa-caret-down text-cyan-700"></i> [' + escapeHtmlAttr(optsPreview || 'buit ' + (i + 1)) + ']</span>';
      } else {
        previewHTML += '<span class="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-950 border-b-2 border-cyan-600 font-mono font-bold text-xs">' +
          '___ (' + escapeHtmlAttr(b.correct || 'buit ' + (i + 1)) + ') ___</span>';
      }
    }
  }
  previewHTML += '</div><div class="mt-2 pt-1.5 border-t border-cyan-200/70 text-[11px] font-bold text-cyan-900 flex items-center justify-between">' +
    '<span><i class="fa-solid fa-puzzle-piece text-cyan-600 mr-1"></i> Buits detectats: <strong>' + parsed.blanks.length + '</strong></span>' +
    '<span>Cada buit encertat suma la part proporcional de la pregunta.</span></div>';
  previewBox.innerHTML = previewHTML;
}

// =========================================================================
// DIVISIÓ DE LECTURES LLARGUES PER CAPÍTOLS O PÀGINES (v0.42.0)
// =========================================================================
function parseContentParts(rawContent, docType) {
  const text = (rawContent || '').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const parts = [];
  let currentTitle = null;
  let currentLines = [];

  lines.forEach(function(line) {
    const match = line.trim().match(/^===\s*(.+?)\s*===$/);
    if (match) {
      if (currentTitle !== null || currentLines.join('\n').trim().length > 0) {
        parts.push({
          title: currentTitle || (docType === 'book' ? 'Capítol 1' : 'Part 1'),
          content: currentLines.join('\n').trim()
        });
      }
      currentTitle = match[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  });

  if (currentTitle !== null || currentLines.join('\n').trim().length > 0) {
    parts.push({
      title: currentTitle || (docType === 'book' ? ('Capítol ' + (parts.length + 1)) : ('Part ' + (parts.length + 1))),
      content: currentLines.join('\n').trim()
    });
  }

  return parts;
}

function insertChapterDividerInEditor() {
  const textarea = document.getElementById('editor-content');
  if (!textarea) return;
  const typeEl = document.getElementById('editor-type');
  const isBook = typeEl && typeEl.value === 'book';
  const existingParts = parseContentParts(textarea.value, isBook ? 'book' : 'text');
  const nextNum = existingParts.length > 0 ? existingParts.length + 1 : 2;
  const defaultLabel = isBook ? ('Capítol ' + nextNum) : ('Part ' + nextNum);
  const customLabel = prompt(
    isBook
      ? "Títol del nou capítol del llibre (ex: Capítol 2: El bosc encantat):"
      : "Títol de la nova part o pàgina (ex: Part 2, Pàgina 2):",
    defaultLabel
  );
  if (customLabel === null) return;
  const cleanLabel = customLabel.trim() || defaultLabel;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);
  const prefix = before.length > 0 && !before.endsWith('\n') ? '\n\n' : (before.length > 0 ? '\n' : '');
  const suffix = after.length > 0 && !after.startsWith('\n') ? '\n\n' : '';
  const marker = prefix + '=== ' + cleanLabel + ' ===\n' + suffix;
  textarea.value = before + marker + after;
  textarea.focus();
  updateChapterButtonsInQuestions();
}

function updateChapterButtonsInQuestions() {
  const textarea = document.getElementById('editor-content');
  const typeEl = document.getElementById('editor-type');
  const isBook = typeEl && typeEl.value === 'book';
  const parts = textarea ? parseContentParts(textarea.value, isBook ? 'book' : 'text') : [];
  const hasMultipleParts = parts.length > 1;

  document.querySelectorAll('#questions-container .q-block').forEach(function(block) {
    const select = block.querySelector('.q-chapter-select');
    if (!select) return;
    const prevVal = select.value;
    let optsHTML = '<option value="all">📌 Tota la lectura / General</option>';
    if (hasMultipleParts) {
      parts.forEach(function(p, idx) {
        optsHTML += '<option value="' + idx + '">' + (isBook ? '📖 ' : '📄 ') + escapeHtmlAttr(p.title) + '</option>';
      });
    }
    select.innerHTML = optsHTML;
    if (prevVal !== 'all' && parts[parseInt(prevVal)]) {
      select.value = prevVal;
    } else {
      select.value = 'all';
    }
    if (hasMultipleParts) {
      select.classList.remove('hidden');
    } else {
      select.classList.add('hidden');
    }
  });
}

function navigateReaderPart(delta, totalParts) {
  const nextIdx = readerCurrentPartIndex + delta;
  if (nextIdx < 0 || nextIdx >= totalParts) return;
  selectReaderPart(nextIdx, totalParts);
}

function selectReaderPart(partIdx, totalParts) {
  if (partIdx < 0 || partIdx >= totalParts) return;
  stopSpeechSynthesis();
  readerCurrentPartIndex = partIdx;

  // Actualitzar panells de contingut (text o resum de capítol de llibre)
  const partPanels = document.querySelectorAll('.reader-part-panel');
  partPanels.forEach(function(panel, idx) {
    if (idx === partIdx) panel.classList.remove('hidden');
    else panel.classList.add('hidden');
  });

  // Actualitzar pestanyes / índex de capítols o parts
  const partTabs = document.querySelectorAll('.reader-part-tab');
  partTabs.forEach(function(tab, idx) {
    if (idx === partIdx) {
      tab.className = 'reader-part-tab px-3 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-600 text-white shadow-xs border border-indigo-700 transition flex items-center gap-1.5 shrink-0';
    } else {
      tab.className = 'reader-part-tab px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200 transition flex items-center gap-1.5 shrink-0';
    }
  });

  // Actualitzar barra inferior "Anterior / Següent part"
  const prevBtns = document.querySelectorAll('.btn-reader-prev-part');
  const nextBtns = document.querySelectorAll('.btn-reader-next-part');
  const counterLabels = document.querySelectorAll('.reader-part-counter-label');

  prevBtns.forEach(function(btn) {
    btn.disabled = partIdx === 0;
  });
  nextBtns.forEach(function(btn) {
    if (partIdx >= totalParts - 1) {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
    }
  });
  counterLabels.forEach(function(lbl) {
    lbl.innerText = 'Part ' + (partIdx + 1) + ' de ' + totalParts;
  });

  // Filtrar preguntes associades al capítol/part actual (o generals)
  const qWrappers = document.querySelectorAll('.reader-question-chapter-wrapper');
  let visibleQCount = 0;
  qWrappers.forEach(function(wrap) {
    const targetPart = wrap.getAttribute('data-chapter-index');
    if (targetPart === 'all' || targetPart === null || targetPart === '' || parseInt(targetPart) === partIdx) {
      wrap.classList.remove('hidden');
      visibleQCount++;
    } else {
      wrap.classList.add('hidden');
    }
  });

  const chapterQNotice = document.getElementById('chapter-questions-filter-notice');
  if (chapterQNotice) {
    const activeTab = partTabs[partIdx];
    const partName = activeTab ? activeTab.getAttribute('data-part-title') : ('Part ' + (partIdx + 1));
    chapterQNotice.innerHTML = '<i class="fa-solid fa-bookmark text-indigo-600 mr-1"></i> Mostrant preguntes de: <strong>' + escapeHtmlAttr(partName) + '</strong> (' + visibleQCount + ' ' + (visibleQCount === 1 ? 'pregunta' : 'preguntes') + ')';
  }

  // Avis final si encara queden parts per llegir abans d'enviar el qüestionari
  const pendingPartsWarning = document.getElementById('reader-pending-parts-warning');
  if (pendingPartsWarning) {
    if (partIdx < totalParts - 1) {
      pendingPartsWarning.classList.remove('hidden');
    } else {
      pendingPartsWarning.classList.add('hidden');
    }
  }

  const topAnchor = document.getElementById('reader-content-start-anchor') || document.getElementById('reader-top-anchor');
  if (topAnchor) {
    topAnchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

