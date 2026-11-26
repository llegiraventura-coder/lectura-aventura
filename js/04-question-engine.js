const QuestionEngine = {
  render: function(qDocId, qData, qIndex, totalQuestions, glossaryWords) {
    totalQuestions = totalQuestions || 0;
    glossaryWords = glossaryWords || [];
    const type = qData.questionType || 'single';
    const imgMode = qData.imageSelectionMode || 'single';
    const taxonomy = qData.taxonomyType || 'literal';
    const taxConfig = TAXONOMY_CONFIG[taxonomy] || TAXONOMY_CONFIG.literal;

    let text = qData.questionText || qData.pregunta || ((isEn() ? 'Question ' : 'Pregunta ') + (qIndex + 1));
    text = parseContentWithGlossary(text, glossaryWords);
    const options = (qData.options || qData.opcions || []).filter(function(o) { return o !== null && o !== undefined && o !== ''; });

    let badgeHTML = '';
    if (type === 'multiple') badgeHTML = '<span class="text-[11px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md shrink-0">' + (isEn() ? '☑️ Multiple Choice (' + options.length + ' options)' : '☑️ Opció Múltiple (' + options.length + ' opcions)') + '</span>';
    else if (type === 'opinion') badgeHTML = '<span class="text-[11px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md shrink-0">' + (isEn() ? '💬 Reflection / Opinion' : '💬 Reflexió / Opinió') + '</span>';
    else if (type === 'ordering') badgeHTML = '<span class="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md shrink-0">' + (isEn() ? '↕️ Ordering (' + options.length + ' events)' : '↕️ Ordenació (' + options.length + ' fets)') + '</span>';
    else if (type === 'image_single') {
      const modeLabel = imgMode === 'multiple' ? (isEn() ? '☑️ Multiple' : '☑️ Múltiple') : (imgMode === 'opinion' ? (isEn() ? '💬 Opinion' : '💬 Opinió') : '');
      badgeHTML = '<span class="text-[11px] font-bold text-teal-800 bg-teal-100 border border-teal-300 px-2 py-0.5 rounded-md shrink-0">' + (isEn() ? '🖼️ Images ' : '🖼️ Imatges ') + modeLabel + '</span>';
    }
    else if (type === 'text_input') {
      const isAiRubric = qData.evaluationMode === 'ai_rubric';
      badgeHTML = isAiRubric
        ? '<span class="text-[11px] font-bold text-indigo-800 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-md shrink-0 inline-flex items-center gap-1"><i class="fa-solid fa-wand-magic-sparkles text-indigo-600"></i> ' + (isEn() ? 'Open Answer (AI Rubric)' : 'Resposta Oberta (Rúbrica IA)') + '</span>'
        : '<span class="text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md shrink-0">' + (isEn() ? '✍️ Open Answer' : '✍️ Resposta Oberta') + '</span>';
    }
    else if (type === 'cloze') {
      const clozeData = parseClozeTemplate(qData.clozeTemplate || '');
      const cModeLabel = (qData.clozeMode || 'dropdown') === 'dropdown' ? (isEn() ? 'Dropdowns' : 'Desplegables') : (isEn() ? 'Write words' : 'Escriure mots');
      badgeHTML = '<span class="text-[11px] font-bold text-cyan-900 bg-cyan-100 border border-cyan-300 px-2 py-0.5 rounded-md shrink-0">' + (isEn() ? '🧩 Fill in the Blanks · ' : '🧩 Omplir Buits · ') + cModeLabel + ' (' + clozeData.blanks.length + ')</span>';
    }

    const taxBadge = '<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ' + taxConfig.color + '">' +
      '<i class="fa-solid ' + taxConfig.icon + '"></i> ' + taxConfig.label + '</span>';

    let optionsHTML = '';

    if (type === 'cloze') {
      const clozeMode = qData.clozeMode || 'dropdown';
      const parsedCloze = parseClozeTemplate(qData.clozeTemplate || '');
      let sentenceHTML = '<div class="text-sm sm:text-base text-slate-800 leading-loose whitespace-pre-line font-medium">';

      for (let pIdx = 0; pIdx < parsedCloze.parts.length; pIdx++) {
        sentenceHTML += parseContentWithGlossary(parsedCloze.parts[pIdx], glossaryWords);
        if (pIdx < parsedCloze.blanks.length) {
          const blank = parsedCloze.blanks[pIdx];
          const fieldName = 'q_' + qDocId + '_blank_' + pIdx;

          if (clozeMode === 'dropdown') {
            const shuffledOpts = blank.allOptions.slice().sort(function() { return Math.random() - 0.5; });
            sentenceHTML += '<select name="' + fieldName + '" required class="mx-1 my-0.5 px-2.5 py-1 bg-white border-2 border-cyan-400 focus:border-cyan-600 rounded-lg text-xs sm:text-sm font-extrabold text-cyan-950 shadow-2xs outline-none cursor-pointer inline-block">' +
              '<option value="" selected disabled>' + (isEn() ? '— choose (' + (pIdx + 1) + ') —' : '— tria (' + (pIdx + 1) + ') —') + '</option>' +
              shuffledOpts.map(function(optVal) {
                return '<option value="' + escapeHtmlAttr(optVal) + '">' + escapeHtmlAttr(optVal) + '</option>';
              }).join('') +
            '</select>';
          } else {
            const inputWidthCh = Math.min(Math.max((blank.correct || '').length + 4, 9), 24);
            sentenceHTML += '<input type="text" name="' + fieldName + '" required autocomplete="off" spellcheck="false" placeholder="(' + (pIdx + 1) + ') ..." style="width: ' + inputWidthCh + 'ch;" class="mx-1 my-0.5 px-2.5 py-0.5 bg-white border-b-2 border-t border-x border-cyan-500 focus:ring-2 focus:ring-cyan-400 rounded-lg text-xs sm:text-sm font-bold text-cyan-950 text-center outline-none inline-block">';
          }
        }
      }
      sentenceHTML += '</div>';

      optionsHTML = `
        <div class="bg-cyan-50/70 p-4 rounded-xl border border-cyan-200/90 space-y-2.5">
          <p class="text-xs font-bold text-cyan-900 flex items-center gap-1.5">
            <i class="fa-solid fa-puzzle-piece text-cyan-600"></i>
            ${clozeMode === 'dropdown' ? (isEn() ? 'Select the correct word in each dropdown within the text:' : 'Selecciona la paraula adequada a cada desplegable del text:') : (isEn() ? 'Write the missing word in each blank space:' : 'Escriu la paraula que falta a cada espai en blanc:')}
          </p>
          <div class="bg-white p-3.5 rounded-xl border border-cyan-100 shadow-2xs">
            ${sentenceHTML}
          </div>
        </div>
      `;
    } else if (type === 'text_input') {
      const isAiRubric = qData.evaluationMode === 'ai_rubric';
      optionsHTML = `
        <div class="${isAiRubric ? 'bg-indigo-50/50 border-indigo-200/80' : 'bg-emerald-50/50 border-emerald-200/80'} p-3.5 rounded-xl border space-y-2">
          <div class="flex items-center justify-between flex-wrap gap-1">
            <label class="block text-xs font-bold ${isAiRubric ? 'text-indigo-950' : 'text-emerald-900'} flex items-center gap-1.5">
              <i class="fa-solid ${isAiRubric ? 'fa-robot text-indigo-600' : 'fa-pen-fancy text-emerald-600'}"></i>
              ${isAiRubric ? (isEn() ? 'Explain your reflection or opinion in your own words:' : 'Explica la teva reflexió o opinió amb les teves paraules:') : (isEn() ? 'Write your answer below:' : 'Escriu la teva resposta a continuació:')}
            </label>
            ${isAiRubric ? '<span class="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">' + (isEn() ? '✨ Intelligent grading with feedback' : '✨ Correcció intel·ligent amb feedback') + '</span>' : ''}
          </div>
          <textarea name="q_${qDocId}" rows="3" required placeholder="${isAiRubric ? (isEn() ? 'Support your answer based on the reading (do not worry about minor typos, your idea is what matters!)...' : 'Argumenta la teva resposta basant-te en la lectura (no et preocupis per petites faltes, importa la teva idea!)...') : (isEn() ? 'Write your explanation or answer here...' : 'Escriu aquí la teva explicació o resposta...')}" class="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 ${isAiRubric ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500'} outline-none"></textarea>
        </div>
      `;
    } else if (type === 'image_single') {
      const letterLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
      const colsClass = options.length > 4 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2';
      const inputType = imgMode === 'multiple' ? 'checkbox' : 'radio';
      const reqAttr = imgMode === 'multiple' ? '' : 'required';

      optionsHTML = '<div class="grid ' + colsClass + ' gap-3 mt-2">';
      options.forEach(function(optImgUrl, oIdx) {
        const letter = letterLabels[oIdx] || '';
        const imgSrc = optImgUrl.trim() || 'https://via.placeholder.com/300x200?text=Sense+Imatge';
        optionsHTML += `
          <label class="group relative flex flex-col items-center bg-white p-2.5 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-indigo-500 hover:shadow-md transition">
            <div class="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-slate-900/80 text-white text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-xs">
              <input type="${inputType}" name="q_${qDocId}" value="${oIdx}" ${reqAttr} class="w-4 h-4 text-indigo-600 focus:ring-indigo-500">
              <span>${isEn() ? 'Option ' : 'Opció '}${letter}</span>
            </div>
            <div class="w-full h-36 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
              <img src="${imgSrc}" alt="${isEn() ? 'Option ' : 'Opció '}${letter}" class="w-full h-full object-cover group-hover:scale-105 transition duration-200" onerror="this.src='https://via.placeholder.com/300x200?text=' + (isEn() ? 'Image+Error' : 'Error+Imatge')">
            </div>
          </label>
        `;
      });
      optionsHTML += '</div>';
    } else if (type === 'ordering') {
      let indexedOptions = options.map(function(opt, idx) {
        return { text: parseContentWithGlossary(opt, glossaryWords), originalIdx: idx };
      });
      indexedOptions.sort(function() { return Math.random() - 0.5; });

      optionsHTML = `
        <div class="bg-amber-50/50 p-3 rounded-xl border border-amber-200/80 mb-2">
          <p class="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5">
            <i class="fa-solid fa-up-down-left-right text-amber-600"></i>
            ${isEn() ? 'Use the arrows to order the events from first (1st) to last:' : 'Fes servir les fletxes per ordenar els fets de primer (1r) a últim:'}
          </p>
          <div id="ordering_list_${qDocId}" class="ordering-container space-y-2">
      `;

      indexedOptions.forEach(function(optObj, posIdx) {
        optionsHTML += `
          <div class="ordering-item flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs" data-original-idx="${optObj.originalIdx}">
            <div class="flex items-center space-x-3">
              <span class="pos-badge w-6 h-6 rounded-md bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                ${posIdx + 1}º
              </span>
              <span class="text-sm font-medium text-slate-800">${optObj.text}</span>
            </div>
            <div class="flex items-center space-x-1">
              <button type="button" onclick="moveOrderItem(this, -1)" class="p-1 px-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300">▲</button>
              <button type="button" onclick="moveOrderItem(this, 1)" class="p-1 px-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300">▼</button>
            </div>
          </div>
        `;
      });

      optionsHTML += `
          </div>
          <input type="hidden" name="q_${qDocId}" id="q_input_${qDocId}" value="${indexedOptions.map(function(o) { return o.originalIdx; }).join(',')}">
        </div>
      `;
    } else {
      const letterLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
      options.forEach(function(opt, oIdx) {
        const letterBadge = '<span class="w-5 h-5 rounded bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">' + (letterLabels[oIdx] || '') + '</span>';
        const optParsed = parseContentWithGlossary(opt, glossaryWords);
        if (type === 'multiple') {
          optionsHTML += `
            <label class="flex items-center space-x-3 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-purple-50/50 transition">
              <input type="checkbox" name="q_${qDocId}" value="${oIdx}" class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500">
              ${letterBadge}
              <span class="text-sm text-slate-700 font-medium">${optParsed}</span>
            </label>
          `;
        } else {
          const hoverColor = type === 'opinion' ? 'hover:bg-blue-50/50' : 'hover:bg-indigo-50/50';
          const radioColor = type === 'opinion' ? 'text-blue-600 focus:ring-blue-500' : 'text-indigo-600 focus:ring-indigo-500';
          optionsHTML += `
            <label class="flex items-center space-x-3 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer ${hoverColor} transition">
              <input type="radio" name="q_${qDocId}" value="${oIdx}" required class="w-4 h-4 ${radioColor}">
              ${letterBadge}
              <span class="text-sm text-slate-700 font-medium">${optParsed}</span>
            </label>
          `;
        }
      });
    }

    const progressIndicator = totalQuestions > 0 ? '<span class="text-xs text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">' + (isEn() ? 'Question ' + (qIndex + 1) + ' of ' + totalQuestions : 'Pregunta ' + (qIndex + 1) + ' de ' + totalQuestions) + '</span>' : '';

    // Pista / Resposta correcta per revelar opcionalment a la PDI en Mode Aula
    let classroomRevealHTML = '';
    if (isClassroomProjectionMode) {
      const letterLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
      let revealText = '';
      if (type === 'cloze') {
        const parsedCloze = parseClozeTemplate(qData.clozeTemplate || '');
        revealText = (isEn() ? 'Correct words in order: ' : 'Paraules correctes per ordre: ') + parsedCloze.blanks.map(function(b, i) { return '(' + (i + 1) + ') ' + b.correct; }).join(' · ');
      } else if (type === 'text_input') {
        if (qData.rubricPrompt) {
          revealText = (isEn() ? 'Teacher rubric: ' : 'Criteri docent: ') + escapeHtmlAttr(qData.rubricPrompt);
        } else if (Array.isArray(qData.keywords) && qData.keywords.length > 0) {
          revealText = (isEn() ? 'Expected keywords: ' : 'Paraules clau esperades: ') + escapeHtmlAttr(qData.keywords.join(', '));
        } else {
          revealText = isEn() ? 'Open-ended question for group discussion and writing.' : 'Pregunta de resposta oberta per debatre i redactar entre tots.';
        }
      } else if (type === 'ordering') {
        revealText = (isEn() ? 'Correct order: ' : 'Ordre correcte: ') + options.map(function(o, i) { return (i + 1) + '. ' + o; }).join(' → ');
      } else if (type === 'opinion' || (type === 'image_single' && imgMode === 'opinion')) {
        revealText = isEn() ? 'Discussion and opinion question: any reasoned answer is valid.' : 'Pregunta de debat i opinió: qualsevol opció argumentada és vàlida.';
      } else if (type === 'multiple' || (type === 'image_single' && imgMode === 'multiple')) {
        let cVals = Array.isArray(qData.correctAnswers) ? qData.correctAnswers.map(function(v) { return parseInt(v); }) : [parseInt(qData.correctAnswer || 0)];
        revealText = (isEn() ? 'Correct answers: ' : 'Respostes correctes: ') + cVals.map(function(i) {
          return type === 'image_single' ? ((isEn() ? 'Option ' : 'Opció ') + (letterLabels[i] || '')) : ((letterLabels[i] ? letterLabels[i] + ') ' : '') + (options[i] || ''));
        }).join(' · ');
      } else {
        const cIdx = qData.correctAnswer !== undefined ? parseInt(qData.correctAnswer) : 0;
        revealText = (isEn() ? 'Correct answer: ' : 'Resposta correcta: ') + (type === 'image_single' ? ((isEn() ? 'Option ' : 'Opció ') + (letterLabels[cIdx] || '')) : ((letterLabels[cIdx] ? letterLabels[cIdx] + ') ' : '') + (options[cIdx] || '')));
      }

      classroomRevealHTML = `
        <div class="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <button type="button" onclick="toggleClassroomRevealAnswer('${qDocId}')" class="self-start text-xs font-extrabold px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 transition inline-flex items-center gap-1.5">
            <i class="fa-solid fa-eye"></i>
            <span id="classroom-reveal-btn-label-${qDocId}">${isEn() ? 'Reveal solution on board' : 'Revelar solució a la PDI'}</span>
          </button>
          <div id="classroom-reveal-box-${qDocId}" class="hidden text-xs sm:text-sm font-bold text-emerald-950 bg-emerald-100/90 border border-emerald-300 px-3.5 py-2 rounded-xl">
            <i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i>${revealText}
          </div>
        </div>
      `;
    }

    const isSingleSlideHidden = isClassroomProjectionMode && classroomStepMode === 'single' && qIndex !== classroomCurrentQuestionIndex;
    const cardClasses = isClassroomProjectionMode
      ? ('classroom-q-card mb-6 bg-white p-5 sm:p-6 rounded-2xl border-2 border-sky-200 shadow-sm space-y-4 ' + (isSingleSlideHidden ? 'hidden' : ''))
      : 'mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3';
    const titleClasses = isClassroomProjectionMode
      ? 'font-extrabold text-slate-900 text-lg md:text-xl leading-snug'
      : 'font-bold text-slate-800 text-sm md:text-base';

    return `
      <div class="${cardClasses}" data-q-index="${qIndex}">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <span class="${isClassroomProjectionMode ? 'w-9 h-9 text-sm bg-sky-600' : 'w-7 h-7 text-xs bg-indigo-600'} rounded-xl text-white font-extrabold flex items-center justify-center shrink-0 shadow-xs">${qIndex + 1}</span>
            <div class="${titleClasses}">${text}</div>
          </div>
          <div class="flex items-center gap-1.5 flex-wrap justify-end">${progressIndicator} ${taxBadge} ${badgeHTML}</div>
        </div>
        <div class="space-y-2.5 ${isClassroomProjectionMode ? 'text-base' : ''}">${optionsHTML}</div>
        ${classroomRevealHTML}
      </div>
    `;
  },

  evaluate: async function(qData, qDocId, formData, readingContext) {
    const type = qData.questionType || 'single';
    const imgMode = qData.imageSelectionMode || 'single';
    const options = (qData.options || qData.opcions || []).filter(function(o) { return o !== null && o !== undefined && o !== ''; });
    const letterLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    readingContext = readingContext || {};

    if (type === 'cloze') {
      const clozeMode = qData.clozeMode || 'dropdown';
      const parsedCloze = parseClozeTemplate(qData.clozeTemplate || '');
      const totalBlanks = parsedCloze.blanks.length;
      if (totalBlanks === 0) {
        return { multiplier: 1, status: 'correct', studentAnswerText: isEn() ? 'No blanks configured' : 'Sense buits configurats', correctAnswerText: '' };
      }

      let correctCount = 0;
      const studentEntries = [];
      const correctEntries = [];

      parsedCloze.blanks.forEach(function(blank, bIdx) {
        const rawUserVal = (formData.get('q_' + qDocId + '_blank_' + bIdx) || '').trim();
        const expectedVal = (blank.correct || '').trim();
        let isBlankOk = false;

        if (rawUserVal) {
          if (clozeMode === 'dropdown') {
            isBlankOk = normalizeText(rawUserVal) === normalizeText(expectedVal);
          } else {
            const normUser = normalizeText(rawUserVal);
            const normExp = normalizeText(expectedVal);
            if (normUser === normExp) {
              isBlankOk = true;
            } else if (normExp.length >= 5 && Math.abs(normUser.length - normExp.length) <= 1 && levenshteinDistance(normUser, normExp) <= 1) {
              isBlankOk = true;
            }
          }
        }

        if (isBlankOk) correctCount++;
        studentEntries.push('(' + (bIdx + 1) + ') ' + (rawUserVal || '—') + (isBlankOk ? ' ✓' : ' ✕'));
        correctEntries.push('(' + (bIdx + 1) + ') ' + expectedVal);
      });

      const mult = Math.round((correctCount / totalBlanks) * 100) / 100;
      const status = correctCount === totalBlanks ? 'correct' : (correctCount > 0 ? 'partial' : 'incorrect');
      return {
        multiplier: mult,
        status: status,
        studentAnswerText: studentEntries.join(' · '),
        correctAnswerText: correctEntries.join(' · ')
      };
    } else if (type === 'text_input') {
      const userText = (formData.get('q_' + qDocId) || '').trim();
      if (!userText) {
        return {
          multiplier: 0,
          status: 'incorrect',
          feedback: isEn() ? 'You have not written any answer.' : "No has escrit cap resposta.",
          studentAnswer: '',
          isOpenQuestion: true,
          isAiEvaluated: false,
          evaluationMode: qData.evaluationMode || 'keywords'
        };
      }

      if (qData.evaluationMode === 'ai_rubric') {
        const aiResult = await evaluateOpenAnswerWithAI({
          readingTitle: readingContext.title || '',
          textFragment: readingContext.content || '',
          readingLevel: readingContext.level || 'Primària',
          question: qData.questionText || qData.pregunta || '',
          taxonomyType: qData.taxonomyType || 'opinion',
          rubricPrompt: qData.rubricPrompt || '',
          studentAnswer: userText,
          qData: qData
        });
        return {
          multiplier: aiResult.multiplier,
          status: aiResult.status,
          feedback: aiResult.feedback,
          studentAnswer: userText,
          isOpenQuestion: true,
          isAiEvaluated: !aiResult.usedFallback,
          evaluationMode: 'ai_rubric',
          usedFallback: !!aiResult.usedFallback
        };
      } else {
        const kwResult = evaluateKeywordsFallback(userText, qData);
        return {
          multiplier: kwResult.multiplier,
          status: kwResult.status,
          feedback: kwResult.feedback,
          studentAnswer: userText,
          isOpenQuestion: true,
          isAiEvaluated: false,
          evaluationMode: 'keywords'
        };
      }
    } else if (type === 'ordering') {
      const val = formData.get('q_' + qDocId);
      const correctSeqText = options.map(function(o, i) { return (i + 1) + '. ' + o; }).join(' → ');
      if (!val) {
        return { multiplier: 0, status: 'incorrect', studentAnswerText: isEn() ? 'Not ordered' : 'Sense ordenar', correctAnswerText: correctSeqText };
      }
      const userSequence = val.split(',').map(function(v) { return parseInt(v); });
      const ok = userSequence.every(function(v, idx) { return v === idx; });
      const userSeqText = userSequence.map(function(origIdx, pos) { return (pos + 1) + '. ' + (options[origIdx] || ''); }).join(' → ');
      return {
        multiplier: ok ? 1 : 0,
        status: ok ? 'correct' : 'incorrect',
        studentAnswerText: userSeqText,
        correctAnswerText: correctSeqText
      };
    } else if (type === 'opinion' || (type === 'image_single' && imgMode === 'opinion')) {
      const selected = formData.get('q_' + qDocId);
      const ok = selected !== null && selected !== undefined;
      const selIdx = parseInt(selected);
      const selLabel = type === 'image_single'
        ? ((isEn() ? 'Option ' : 'Opció ') + (letterLabels[selIdx] || ''))
        : ((letterLabels[selIdx] ? letterLabels[selIdx] + ') ' : '') + (options[selIdx] || ''));
      return {
        multiplier: ok ? 1 : 0,
        status: ok ? 'correct' : 'incorrect',
        studentAnswerText: ok ? selLabel : (isEn() ? 'No option selected' : 'Cap opció seleccionada'),
        correctAnswerText: isEn() ? 'Free opinion answer (valid)' : 'Resposta d’opinió lliure (vàlida)'
      };
    } else if (type === 'multiple' || (type === 'image_single' && imgMode === 'multiple')) {
      const selectedVals = formData.getAll('q_' + qDocId).map(function(v) { return parseInt(v); }).sort();
      let correctVals = [];
      if (Array.isArray(qData.correctAnswers)) correctVals = qData.correctAnswers.map(function(v) { return parseInt(v); }).sort();
      else if (qData.correctAnswer !== undefined) correctVals = [parseInt(qData.correctAnswer)];
      const ok = selectedVals.length === correctVals.length && selectedVals.every(function(val, idx) { return val === correctVals[idx]; });

      const formatList = function(indices) {
        if (!indices.length) return isEn() ? 'None selected' : 'Cap seleccionada';
        return indices.map(function(i) {
          return type === 'image_single'
            ? ((isEn() ? 'Option ' : 'Opció ') + (letterLabels[i] || ''))
            : ((letterLabels[i] ? letterLabels[i] + ') ' : '') + (options[i] || ''));
        }).join(' · ');
      };

      return {
        multiplier: ok ? 1 : 0,
        status: ok ? 'correct' : 'incorrect',
        studentAnswerText: formatList(selectedVals),
        correctAnswerText: formatList(correctVals)
      };
    } else {
      const selected = parseInt(formData.get('q_' + qDocId));
      const correct = qData.correctAnswer !== undefined ? parseInt(qData.correctAnswer) : 0;
      const ok = selected === correct;
      const formatSingle = function(idx) {
        if (isNaN(idx)) return isEn() ? 'No option selected' : 'Cap opció seleccionada';
        return type === 'image_single'
          ? ((isEn() ? 'Option ' : 'Opció ') + (letterLabels[idx] || ''))
          : ((letterLabels[idx] ? letterLabels[idx] + ') ' : '') + (options[idx] || ''));
      };
      return {
        multiplier: ok ? 1 : 0,
        status: ok ? 'correct' : 'incorrect',
        studentAnswerText: formatSingle(selected),
        correctAnswerText: formatSingle(correct)
      };
    }
  }
};

function moveOrderItem(btn, dir) {
  const item = btn.closest('.ordering-item');
  const container = item.parentNode;
  const items = Array.from(container.children);
  const currentIdx = items.indexOf(item);
  const targetIdx = currentIdx + dir;

  if (targetIdx >= 0 && targetIdx < items.length) {
    if (dir === -1) container.insertBefore(item, items[targetIdx]);
    else container.insertBefore(item, items[targetIdx].nextSibling);

    const updatedItems = Array.from(container.children);
    updatedItems.forEach(function(it, idx) {
      it.querySelector('.pos-badge').innerText = (idx + 1) + 'º';
    });
    const hiddenInput = container.parentNode.querySelector('input[type="hidden"]');
    if (hiddenInput) {
      hiddenInput.value = updatedItems.map(function(it) { return it.getAttribute('data-original-idx'); }).join(',');
    }
  }
}

