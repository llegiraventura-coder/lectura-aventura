    function levenshteinDistance(a, b) {
      if (!a.length) return b.length;
      if (!b.length) return a.length;
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    }

    function matchesKeywordFuzzy(rawUserText, keyword) {
      const normKw = normalizeText(keyword);
      if (!normKw) return false;
      const normFull = normalizeText(rawUserText);
      if (normFull.includes(normKw)) return true;
      if (normKw.length < 4) return false;
      const maxDist = normKw.length >= 7 ? 2 : 1;
      const words = (rawUserText || '').split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const w = normalizeText(words[i]);
        if (Math.abs(w.length - normKw.length) <= maxDist) {
          if (levenshteinDistance(w, normKw) <= maxDist) return true;
        }
      }
      return false;
    }

    function evaluateKeywordsFallback(userText, qData) {
      let keywords = [];
      if (Array.isArray(qData.keywords)) keywords = qData.keywords;
      else if (typeof qData.keywords === 'string') keywords = qData.keywords.split(',').map(function(k) { return k.trim(); }).filter(Boolean);
      else if (qData.correctAnswerText) keywords = [qData.correctAnswerText];

      const cleanWords = (userText || '').trim().split(/\s+/).filter(Boolean);
      if (cleanWords.length === 0) {
        return {
          status: 'incorrect',
          multiplier: 0,
          feedback: isEn() ? "You haven't written an answer." : "No has escrit cap resposta.",
          usedFallback: true
        };
      }

      if (keywords.length === 0) {
        const isLongEnough = cleanWords.length >= 3;
        return {
          status: isLongEnough ? 'correct' : 'partial',
          multiplier: isLongEnough ? 1.0 : 0.5,
          feedback: isLongEnough
            ? (isEn() ? "Answer recorded successfully!" : "Resposta enregistrada correctament!")
            : (isEn() ? "Your answer is very brief. Try explaining it with a more complete sentence!" : "Has escrit una resposta molt breu. Intenta explicar-ho amb una frase més completa!"),
          usedFallback: true
        };
      }

      const matched = keywords.filter(function(kw) { return matchesKeywordFuzzy(userText, kw); });
      if (matched.length > 0) {
        return {
          status: 'correct',
          multiplier: 1.0,
          feedback: isEn()
            ? "Well done! Your answer includes the expected key concepts (" + matched.join(", ") + ")."
            : "Molt bé! La teva resposta inclou els conceptes clau esperats (" + matched.join(", ") + ").",
          usedFallback: true
        };
      }
      return {
        status: 'incorrect',
        multiplier: 0,
        feedback: isEn()
          ? "Review the text and make sure to include the main idea asked in the question."
          : "Revisa el text i assegura't d'incloure la idea principal que es demana a la pregunta.",
        usedFallback: true
      };
    }

    async function evaluateOpenAnswerWithAI(params) {
      const apiKey = await fetchGlobalGeminiKey();
      if (!apiKey) {
        console.warn("Falta la clau de Gemini; s'activa el fallback local.");
        const fb = evaluateKeywordsFallback(params.studentAnswer, params.qData);
        fb.feedback = (isEn() ? "⚡ (Keyword mode) " : "⚡ (Mode paraules clau) ") + fb.feedback;
        return fb;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(function() { controller.abort(); }, 10000);

      const promptText = isEn()
        ? `You are an expert English reading comprehension teacher for ${params.readingLevel || 'Primary'} students.
Evaluate the student's open-ended answer based on the reference text and teacher rubric.

READING TITLE: ${params.readingTitle || ''}
REFERENCE TEXT:
"""
${(params.textFragment || '').slice(0, 5000)}
"""

QUESTION (${params.taxonomyType || 'opinion'}): ${params.question || ''}
TEACHER CRITERIA / RUBRIC: ${params.rubricPrompt || 'Value that the answer is consistent with the text and well argued.'}

STUDENT ANSWER: "${params.studentAnswer || ''}"

EVALUATION INSTRUCTIONS:
- Do not penalize small spelling or grammatical mistakes if the meaning is clear.
- Classify the answer into one of these three states:
  * "correct" (if it meets the criteria well and explains with coherence).
  * "partial" (if partially correct but lacks justification or is too incomplete).
  * "incorrect" (if unrelated to text, contradicts the reading, or does not answer the question).
- Write a short, warm, motivating "feedback" (1-2 sentences) in English addressed directly to the student (using "you").

Respond ONLY with a valid JSON object in this exact format:
{"status": "correct" | "partial" | "incorrect", "feedback": "feedback text"}`
        : `Ets un docent expert en comprensió lectora en llengua catalana per a alumnat de ${params.readingLevel || 'Primària'}.
Avalua la resposta oberta d'un alumne basant-te en el text i la rúbrica docent.

TÍTOL DE LA LECTURA: ${params.readingTitle || ''}
TEXT DE REFERÈNCIA:
"""
${(params.textFragment || '').slice(0, 5000)}
"""

PREGUNTA (${params.taxonomyType || 'opinió'}): ${params.question || ''}
CRITERI / RÚBRICA DEL DOCENT: ${params.rubricPrompt || 'Valora que la resposta sigui coherent amb el text i estigui ben argumentada.'}

RESPOSTA DE L'ALUMNE: "${params.studentAnswer || ''}"

INSTRUCCIONS D'AVALUACIÓ:
- No penalitzis petites faltes d'ortografia o accents si la idea s'entén clarament.
- Classifica la resposta en un d'aquests tres estats:
  * "correct" (si compleix bé el criteri i s'explica amb coherència).
  * "partial" (si té part de raó però li falta argumentar-ho o és massa incompleta).
  * "incorrect" (si no té relació amb el text, contradiu la lectura o no respon la pregunta).
- Escriu un "feedback" breu (1-2 frases), proper, motivador i en català adreçat directament a l'alumne (tractant-lo de "tu").

Respon ÚNICAMENT amb un objecte JSON vàlid amb aquest format exacte:
{"status": "correct" | "partial" | "incorrect", "feedback": "text del feedback"}`;

      try {
        const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          })
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }

        const rawJson = await response.json();
        const textResponse = rawJson.candidates[0].content.parts[0].text;
        const data = JSON.parse(textResponse);

        let mult = 0;
        if (data.status === 'correct') mult = 1.0;
        else if (data.status === 'partial') mult = 0.5;

        return {
          status: data.status || 'incorrect',
          multiplier: mult,
          feedback: data.feedback || (data.status === 'correct' ? (isEn() ? "Very well argued!" : "Molt ben argumentat!") : (isEn() ? "Review the text and complete your reflection." : "Revisa el text i completa la teva reflexió.")),
          usedFallback: false
        };
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn("Fallback automàtic activat per a la pregunta oberta:", err);
        const fb = evaluateKeywordsFallback(params.studentAnswer, params.qData);
        fb.feedback = (isEn() ? "⚡ (Local auto-grading) " : "⚡ (Correcció automàtica local) ") + fb.feedback;
        return fb;
      }
    }

    let currentUser = null;
    let currentLang = localStorage.getItem('lectura_aventura_lang') || 'ca';
    let userPoints = 0;
    let userRole = 'alumne';
    let userCompletedReadings = [];
    let userScores = {};
    let userReadingHistory = {};
    let userTaxonomyStats = { literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 };
    let userHasImprovedScore = false;
    let userDisplayName = "";
    let userSchool = "";
    let userTeacherUid = "";
    let userClassGroup = "";
    let userTeacherGroups = [];
    let selectedClassroomFilter = "all";
    let classroomTableViewMode = 'assigned'; // 'assigned' | 'all'
    let teacherAssignedReadingsMap = {}; // groupName -> array of reading IDs
    let userAssignedReadings = []; // for students: array of assigned reading IDs

    function getGroupAssignedReadings(groupName) {
      if (!groupName) return [];
      const list = teacherAssignedReadingsMap[groupName];
      return Array.isArray(list) ? list : [];
    }
    let filterMyLectures = false;
    let editingDocId = null;
    let cloningParentId = null;
    let cloningMode = 'questions';
    let currentLeaderboardTab = 'group';
    let isInitialRouteDone = false;

    let isDyslexicMode = false;
    let readerFontSize = 18;
    let readerTheme = 'default';
    let isClassroomProjectionMode = false;
    let classroomStepMode = 'all'; // 'all' | 'single'
    let classroomCurrentQuestionIndex = 0;
    let readerCurrentPartIndex = 0;
    let readerCurrentDocId = null;

    // Mesurador silenciós de velocitat lectora (PPM)
    let silentReadingDocId = null;
    let silentReadingSeconds = 0;
    let silentReadingTimeLocked = false;
    let silentReadingLastActiveTime = null;
    let silentReadingInterval = null;
    let silentReadingCenterTimeout = null;
    let silentReadingObserver = null;
    let silentReadingWordCount = 0;

    function countReadingWords(htmlOrText) {
      if (!htmlOrText) return 0;
      const tmp = document.createElement('div');
      tmp.innerHTML = htmlOrText;
      const text = (tmp.textContent || tmp.innerText || '').trim();
      if (!text) return 0;
      const words = text.split(/\s+/).filter(function(w) { return w.length > 0; });
      return words.length;
    }

    function lockReadingTimer() {
      if (silentReadingTimeLocked) return;
      if (!document.hidden && silentReadingLastActiveTime) {
        silentReadingSeconds += (Date.now() - silentReadingLastActiveTime) / 1000;
        silentReadingLastActiveTime = null;
      }
      silentReadingTimeLocked = true;
      if (silentReadingInterval) {
        clearInterval(silentReadingInterval);
        silentReadingInterval = null;
      }
      if (silentReadingCenterTimeout) {
        clearTimeout(silentReadingCenterTimeout);
        silentReadingCenterTimeout = null;
      }
      if (silentReadingObserver) {
        silentReadingObserver.disconnect();
        silentReadingObserver = null;
      }
    }

    function initSilentReadingTracker(docId, rawContent) {
      if (silentReadingInterval) clearInterval(silentReadingInterval);
      if (silentReadingCenterTimeout) clearTimeout(silentReadingCenterTimeout);
      if (silentReadingObserver) silentReadingObserver.disconnect();

      silentReadingDocId = docId;
      silentReadingSeconds = 0;
      silentReadingTimeLocked = false;
      silentReadingWordCount = countReadingWords(rawContent);
      silentReadingLastActiveTime = document.hidden ? null : Date.now();

      silentReadingInterval = setInterval(function() {
        if (!silentReadingTimeLocked && !document.hidden && silentReadingLastActiveTime) {
          const now = Date.now();
          silentReadingSeconds += (now - silentReadingLastActiveTime) / 1000;
          silentReadingLastActiveTime = now;
        } else if (!silentReadingTimeLocked && !document.hidden) {
          silentReadingLastActiveTime = Date.now();
        }
      }, 1000);
    }

    function setupSilentReadingCutoff() {
      const quizForm = document.getElementById('quiz-form');
      if (!quizForm) return;

      const handleQuizInteraction = function() {
        lockReadingTimer();
      };

      quizForm.addEventListener('click', handleQuizInteraction, { passive: true });
      quizForm.addEventListener('input', handleQuizInteraction, { passive: true });
      quizForm.addEventListener('keydown', handleQuizInteraction, { passive: true });
      quizForm.addEventListener('focus', handleQuizInteraction, true);

      if (window.IntersectionObserver) {
        silentReadingObserver = new IntersectionObserver(function(entries) {
          if (silentReadingTimeLocked) return;
          const entry = entries[0];
          if (entry && entry.isIntersecting) {
            if (!silentReadingCenterTimeout) {
              silentReadingCenterTimeout = setTimeout(function() {
                lockReadingTimer();
              }, 3000);
            }
          } else {
            if (silentReadingCenterTimeout) {
              clearTimeout(silentReadingCenterTimeout);
              silentReadingCenterTimeout = null;
            }
          }
        }, {
          root: null,
          rootMargin: '-20% 0px -20% 0px',
          threshold: 0
        });
        silentReadingObserver.observe(quizForm);
      }
    }

    document.addEventListener('visibilitychange', function() {
      if (silentReadingTimeLocked || !silentReadingDocId) return;
      if (document.hidden) {
        if (silentReadingLastActiveTime) {
          silentReadingSeconds += (Date.now() - silentReadingLastActiveTime) / 1000;
          silentReadingLastActiveTime = null;
        }
      } else {
        silentReadingLastActiveTime = Date.now();
      }
    });

    let speechUtterance = null;
    let isSpeaking = false;
    let isSpeechPaused = false;
    let speechRate = 1.0;
    let currentTextToRead = "";

    let filterSearch = "";
    let filterBookAuthor = "";
    let filterType = "all";
    let filterLevel = "all";
    let filterCategory = "all";
    let filterStatus = "all";
    let filterDuration = "all";

    const TAXONOMY_CONFIG = {
      literal: { label: "Literal", desc: "Buscar informació explícita en el text", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: "fa-magnifying-glass" },
      inferential: { label: "Inferencial", desc: "Deduir informació implícita a partir de pistes", color: "bg-blue-100 text-blue-800 border-blue-300", icon: "fa-lightbulb" },
      figurative: { label: "Sentit Figurat", desc: "Desxifrar frases fetes, dites i llenguatge no literal", color: "bg-purple-100 text-purple-800 border-purple-300", icon: "fa-comments" },
      opinion: { label: "D'Opinió", desc: "Valorar, jutjar o donar el punt de vista crític", color: "bg-amber-100 text-amber-900 border-amber-300", icon: "fa-scale-balanced" },
      creative: { label: "Creativa", desc: "Proposar alternatives o connectar amb l'expressió artística", color: "bg-rose-100 text-rose-800 border-rose-300", icon: "fa-wand-magic-sparkles" }
    };

    const STUDENT_RANKS_CATALOG = [
      { min: 0, max: 99, name: "Explorador/a d'Històries", desc: "El punt de partida de tota gran aventura.", icon: "fa-compass", color: "from-indigo-500 to-indigo-700", badgeBg: "bg-indigo-100 text-indigo-800 border-indigo-300" },
      { min: 100, max: 299, name: "Lector/a de Bronze", desc: "Ja domines les primeres lectures i reptes!", icon: "fa-award", color: "from-amber-700 to-amber-900", badgeBg: "bg-amber-100 text-amber-900 border-amber-300" },
      { min: 300, max: 699, name: "Lector/a d'Argent", desc: "La teva comprensió lectora brilla amb força.", icon: "fa-medal", color: "from-slate-400 to-slate-600", badgeBg: "bg-slate-200 text-slate-800 border-slate-300" },
      { min: 700, max: 1299, name: "Lector/a d'Or", desc: "Un referent de lectura i constància al centre.", icon: "fa-trophy", color: "from-amber-300 to-amber-500", badgeBg: "bg-yellow-100 text-yellow-900 border-yellow-400" },
      { min: 1300, max: Infinity, name: "Mestre/a de la Lectura", desc: "El màxim reconeixement de Lectura Aventura!", icon: "fa-crown", color: "from-amber-400 to-amber-600", badgeBg: "bg-amber-200 text-amber-950 border-amber-500" }
    ];

    const TEACHER_RANKS_CATALOG = [
      { min: 0, max: 0, name: "🎒 Docent Nouvingut/da", subtext: "Cercant el wifi de l'escola", icon: "fa-compass-drafting", color: "from-slate-400 to-indigo-500", badgeBg: "bg-slate-50 text-slate-600 border-slate-200" },
      { min: 1, max: 2, name: "👨‍🏫 Docent Novell", subtext: "Ajustant el projector", icon: "fa-chalkboard-user", color: "from-slate-500 to-slate-700", badgeBg: "bg-slate-100 text-slate-800 border-slate-300" },
      { min: 3, max: 5, name: "📝 Docent Col·laborador/a", subtext: "Exportador/a de fotocòpies", icon: "fa-copy", color: "from-teal-500 to-emerald-700", badgeBg: "bg-teal-50 text-teal-800 border-teal-200" },
      { min: 6, max: 9, name: "⚡ Arquitecte/a Pedagògic/a", subtext: "Dominador/a del currículum", icon: "fa-cubes", color: "from-indigo-500 to-indigo-700", badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200" },
      { min: 10, max: 14, name: "🌟 Savi/a de la Sala", subtext: "Llegenda entre cafès", icon: "fa-mug-hot", color: "from-amber-600 to-amber-800", badgeBg: "bg-amber-50 text-amber-800 border-amber-200" },
      { min: 15, max: 19, name: "📚 Docent de Docents", subtext: "Supervivent de claustres", icon: "fa-graduation-cap", color: "from-blue-600 to-indigo-800", badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-300" },
      { min: 20, max: Infinity, name: "👑 Docent Celestial", subtext: "Creador/a d'Universos Lectors", icon: "fa-wand-magic-sparkles", color: "from-amber-400 to-amber-600", badgeBg: "bg-amber-100 text-amber-900 border-amber-300" }
    ];

    const TEACHER_MEDALS = [
      {
        id: 'first_seed',
        title: function() { return isEn() ? "First Seed" : "Primera Llavor"; },
        desc: function() { return isEn() ? "Publish your first reading to the catalog." : "Publica la teva primera lectura al catàleg."; },
        requirement: function() { return isEn() ? "Publish your first reading to the catalog." : "Publica la teva primera lectura al catàleg."; },
        icon: "fa-seedling",
        color: "bg-emerald-500",
        check: function(ctx) {
          const val = ctx.createdCount || 0;
          return { unlocked: val >= 1, progress: Math.min(val, 1) + "/1" };
        }
      },
      {
        id: 'comprehension_crafter',
        title: function() { return isEn() ? "Comprehension Crafter" : "Artesà de la Comprensió"; },
        desc: function() { return isEn() ? "Create a reading combining at least 3 different question types (Literal, Inferential, Figurative, Opinion or Creative)." : "Crea una lectura que combini almenys 3 tipus de preguntes diferents (Literal, Inferencial, Sentit Figurat, Opinió o Creativa)."; },
        requirement: function() { return isEn() ? "Create a reading combining at least 3 different question types." : "Crea una lectura que combini almenys 3 tipus de preguntes diferents."; },
        icon: "fa-brain",
        color: "bg-indigo-600",
        check: function(ctx) {
          const val = ctx.maxTaxonomies || 0;
          return { unlocked: val >= 3, progress: Math.min(val, 3) + "/3" };
        }
      },
      {
        id: 'versatile_educator',
        title: function() { return isEn() ? "Versatile Educator" : "Mestre Polivalent"; },
        desc: function() { return isEn() ? "Create readings for at least 3 different educational levels or grades." : "Crea lectures per a almenys 3 cursos o nivells educatius diferents."; },
        requirement: function() { return isEn() ? "Create readings for at least 3 different educational levels." : "Crea lectures per a almenys 3 cursos o nivells educatius diferents."; },
        icon: "fa-layer-group",
        color: "bg-teal-600",
        check: function(ctx) {
          const val = ctx.distinctLevelsCount || 0;
          return { unlocked: val >= 3, progress: Math.min(val, 3) + "/3" };
        }
      },
      {
        id: 'beloved_story',
        title: function() { return isEn() ? "Beloved Story" : "Lectura Estimada"; },
        desc: function() { return isEn() ? "One of your readings has been completed at least 10 times." : "Una de les teves lectures ha estat completada almenys 10 vegades."; },
        requirement: function() { return isEn() ? "One of your readings completed at least 10 times." : "Una de les teves lectures ha estat completada almenys 10 vegades."; },
        icon: "fa-heart",
        color: "bg-rose-500",
        check: function(ctx) {
          const val = ctx.maxCompletions || 0;
          return { unlocked: val >= 10, progress: Math.min(val, 10) + "/10" };
        }
      },
      {
        id: 'classroom_hit',
        title: function() { return isEn() ? "Classroom Hit" : "Èxit d'Aula"; },
        desc: function() { return isEn() ? "A reading created by you exceeds 50 completions in the community." : "Una lectura creada per tu supera les 50 realitzacions a la comunitat."; },
        requirement: function() { return isEn() ? "A reading created by you exceeds 50 completions." : "Una lectura creada per tu supera les 50 realitzacions a la comunitat."; },
        icon: "fa-fire",
        color: "bg-amber-600",
        check: function(ctx) {
          const val = ctx.maxCompletions || 0;
          return { unlocked: val >= 50, progress: Math.min(val, 50) + "/50" };
        }
      },
      {
        id: 'educational_bestseller',
        title: function() { return isEn() ? "Educational Bestseller" : "Best-Seller Educatiu"; },
        desc: function() { return isEn() ? "Accumulate more than 100 completions across all your created readings." : "Acumula més de 100 realitzacions sumant totes les teves lectures creades."; },
        requirement: function() { return isEn() ? "Accumulate more than 100 completions across all your readings." : "Acumula més de 100 realitzacions sumant totes les teves lectures creades."; },
        icon: "fa-award",
        color: "bg-purple-600",
        check: function(ctx) {
          const val = ctx.totalCompletions || 0;
          return { unlocked: val >= 100, progress: Math.min(val, 100) + "/100" };
        }
      },
      {
        id: 'classroom_host',
        title: function() { return isEn() ? "Classroom Host" : "Amfitrió d'Aula"; },
        desc: function() { return isEn() ? "Create a classroom group and link at least 5 students." : "Crea un grup-classe i vincula-hi almenys 5 alumnes."; },
        requirement: function() { return isEn() ? "Create a classroom group and link at least 5 students." : "Crea un grup-classe i vincula-hi almenys 5 alumnes."; },
        icon: "fa-users",
        color: "bg-blue-600",
        check: function(ctx) {
          const val = ctx.maxStudentsInAnyGroup || 0;
          return { unlocked: val >= 5, progress: Math.min(val, 5) + "/5" };
        }
      },
      {
        id: 'reading_guide',
        title: function() { return isEn() ? "Reading Guide" : "Guia Lector"; },
        desc: function() { return isEn() ? "Assign a pathway of at least 3 readings to a classroom group." : "Assigna un itinerari d'almenys 3 lectures a un grup-classe."; },
        requirement: function() { return isEn() ? "Assign a pathway of at least 3 readings to a classroom." : "Assigna un itinerari d'almenys 3 lectures a un grup-classe."; },
        icon: "fa-book-bookmark",
        color: "bg-emerald-600",
        check: function(ctx) {
          const val = ctx.maxAssignedInAnyGroup || 0;
          return { unlocked: val >= 3, progress: Math.min(val, 3) + "/3" };
        }
      }
    ];

    function renderProfile() {
      return renderReaderPassport();
    }

    function isUserAdminOrCreator() {
      if (!currentUser) return false;
      if (currentUser.email === ADMIN_SUPREMO_EMAIL) return true;
      return userRole === 'docent' || userRole === 'colaborador';
    }

    function escapeHtmlAttr(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function formatReadingCode(num) {
      const prefix = currentLang === 'en' ? '#EN-' : '#CL-';
      if (!num || isNaN(num)) return prefix + '00001';
      return prefix + String(num).padStart(5, '0');
    }

    function scrollToGlossary(e) {
      if (e) e.preventDefault();
      const target = document.getElementById('glossary-section') || document.getElementById('glossari-section');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function normalizeText(str) {
      return (str || '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
    }

    function uploadImageToFirebase(fileInputElem, targetInputClass, statusSpanId, maxDim) {
      if (!fileInputElem) return;
      const file = fileInputElem.files ? fileInputElem.files[0] : fileInputElem;
      if (!file) return;

      const optionWrapper = fileInputElem.closest('.flex-col') || fileInputElem.closest('.q-block');
      const block = fileInputElem.closest('.q-block');

      let statusElem = statusSpanId ? document.getElementById(statusSpanId) : null;
      if (!statusElem && optionWrapper) {
        statusElem = optionWrapper.querySelector('.q-upload-status');
      }

      if (statusElem) {
        statusElem.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-indigo-600"></i> Compriment...';
        statusElem.className = "text-xs text-indigo-600 font-bold flex items-center gap-1";
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const MAX_WIDTH = maxDim || 900;
          const MAX_HEIGHT = maxDim || 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedDataURL = canvas.toDataURL('image/jpeg', 0.78);

          let inputElem = null;
          if (optionWrapper) inputElem = optionWrapper.querySelector('input[type="text"], input[type="url"]');
          if (!inputElem && block) inputElem = block.querySelector('.' + targetInputClass);
          if (!inputElem) inputElem = document.getElementById(targetInputClass) || document.querySelector('.' + targetInputClass);

          if (inputElem) {
            inputElem.value = compressedDataURL;
            updateImagePreview(inputElem);
            inputElem.dispatchEvent(new Event('input', { bubbles: true }));
            inputElem.dispatchEvent(new Event('change', { bubbles: true }));
          }

          if (statusElem) {
            statusElem.innerHTML = '<i class="fa-solid fa-check text-emerald-600"></i> Carregada!';
            statusElem.className = "text-xs text-emerald-600 font-bold flex items-center gap-1";
            setTimeout(function() { if (statusElem) statusElem.innerHTML = ''; }, 3000);
          }
          fileInputElem.value = '';
        };

        img.onerror = function() {
          if (statusElem) {
            statusElem.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-600"></i> Error en la imatge';
            statusElem.className = "text-xs text-red-600 font-bold flex items-center gap-1";
          }
          fileInputElem.value = '';
        };

        img.src = e.target.result;
      };

      reader.readAsDataURL(file);
    }

    function updateRefImagePreview(url) {
      const box = document.getElementById('ref-image-preview-box');
      const img = document.getElementById('ref-image-preview-img');
      if (!box || !img) return;
      const cleanUrl = (url || '').trim();
      if (cleanUrl) {
        img.src = cleanUrl;
        box.classList.remove('hidden');
      } else {
        img.src = '';
        box.classList.add('hidden');
      }
    }

    function openZoomImageModal(imgSrc, title) {
      const container = document.getElementById('zoom-modal-container');
      if (!container || !imgSrc) return;
      container.innerHTML = `
        <div onclick="closeZoomImageModal()" class="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 cursor-zoom-out">
          <div onclick="event.stopPropagation()" class="max-w-5xl w-full flex items-center justify-between text-white mb-3 px-2 cursor-default">
            <span class="font-bold text-sm sm:text-base flex items-center gap-2">
              <i class="fa-solid fa-magnifying-glass-plus text-amber-400"></i>
              <span>${escapeHtmlAttr(title || 'Imatge de referència')}</span>
            </span>
            <button onclick="closeZoomImageModal()" class="bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition">
              <i class="fa-solid fa-xmark"></i> Tancar Zoom
            </button>
          </div>
          <div onclick="event.stopPropagation()" class="max-w-5xl max-h-[82vh] overflow-auto bg-white p-2 rounded-2xl shadow-2xl cursor-default">
            <img src="${imgSrc}" alt="${escapeHtmlAttr(title)}" class="max-w-full h-auto mx-auto rounded-xl">
          </div>
        </div>
      `;
    }

    function closeZoomImageModal() {
      const container = document.getElementById('zoom-modal-container');
      if (container) container.innerHTML = '';
    }

    function toggleDyslexicFont() {
      isDyslexicMode = !isDyslexicMode;
      const box = document.getElementById('reading-text-box');
      const btn = document.getElementById('btn-dyslexia-toggle');
      if (box) {
        if (isDyslexicMode) {
          box.classList.add('font-dyslexic');
          if (btn) btn.className = "px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-xs border border-indigo-700";
        } else {
          box.classList.remove('font-dyslexic');
          if (btn) btn.className = "px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300";
        }
      }
    }

    function changeReaderFontSize(delta) {
      readerFontSize = Math.min(Math.max(readerFontSize + delta, 14), 28);
      const box = document.getElementById('reading-text-box');
      if (box) box.style.fontSize = readerFontSize + "px";
    }

    function setReaderTheme(theme) {
      readerTheme = theme;
      const box = document.getElementById('reading-text-box');
      if (!box) return;
      box.classList.remove('bg-sepia', 'bg-dark-mode', 'bg-slate-50', 'text-slate-700');
      if (theme === 'sepia') box.classList.add('bg-sepia');
      else if (theme === 'dark') box.classList.add('bg-dark-mode');
      else box.classList.add('bg-slate-50', 'text-slate-700');
    }

