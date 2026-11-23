// =========================================================================
// CAPÍTOL 1: CONFIGURACIÓ FIREBASE, IA (GEMINI), ESTAT GLOBAL I UTILS
// =========================================================================

function withTimeout(promise, ms, label) {
  ms = ms || 8000;
  label = label || "connexió amb la base de dades";
  return Promise.race([
    promise,
    new Promise(function(_, reject) {
      setTimeout(function() {
        reject(new Error("Temps d'espera esgotat (" + (ms / 1000) + "s) en " + label + ". Comprova la connexió o torna-ho a provar."));
      }, ms);
    })
  ]);
}

const firebaseConfig = {
  apiKey: "AIzaSyCcBpg9FRwYDElWoZlYsGir4ZA_HqS0BDc",
  authDomain: "lectura-aventura.firebaseapp.com",
  projectId: "lectura-aventura",
  storageBucket: "lectura-aventura.firebasestorage.app",
  messagingSenderId: "525339295825",
  appId: "1:525339295825:web:3a5b3ea8791f6146d4b870",
  measurementId: "G-7132LXLDTR"
};

let auth = null;
let db = null;
let storage = null;

try {
  if (typeof firebase === 'undefined') {
    throw new Error("No s'ha pogut carregar l'SDK de Firebase. Revisa la connexió a Internet o bloquejadors d'scripts.");
  }
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();
} catch (initErr) {
  showGlobalError("Error iniciant Firebase: " + initErr.message);
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.innerHTML = '<div class="p-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl max-w-xl mx-auto text-center space-y-3"><h3 class="font-bold">Error d\'inicialització</h3><p class="text-xs">' + initErr.message + '</p></div>';
  }
}

const DB_COLLECTION = "lectures";
const FOLDERS_COLLECTION = "folders";
const SUB_COLLECTION = "questions";
const FEEDBACK_COLLECTION = "teacher_feedback";
const ADMIN_SUPREMO_EMAIL = "scasas26@xtec.cat";
const GEMINI_API_KEY_STORAGE = "lectura_aventura_gemini_key_v39";

function getCachedGeminiKey() {
  try {
    return (localStorage.getItem(GEMINI_API_KEY_STORAGE) || '').trim();
  } catch (e) {
    return '';
  }
}

async function fetchGlobalGeminiKey() {
  const localKey = getCachedGeminiKey();
  if (localKey) return localKey;
  if (!db) return '';
  try {
    const cfgDoc = await withTimeout(db.collection("app_config").doc("ai_settings").get(), 4000, "configuració IA");
    if (cfgDoc.exists && cfgDoc.data().geminiApiKey) {
      const remoteKey = cfgDoc.data().geminiApiKey.trim();
      try { localStorage.setItem(GEMINI_API_KEY_STORAGE, remoteKey); } catch (e) {}
      return remoteKey;
    }
  } catch (e) {
    console.warn("No s'ha pogut llegir la clau IA global:", e);
  }
  return '';
}

async function configureAiRubricEndpoint() {
  const current = await fetchGlobalGeminiKey();
  const key = prompt(
    "Enganxa aquí la teva API Key gratuïta de Google AI Studio:\n(Es desarà a Firebase perquè tots els teus alumnes la puguin utilitzar automàticament)",
    current
  );
  if (key === null) return;
  const cleanKey = key.trim();
  try {
    if (cleanKey) localStorage.setItem(GEMINI_API_KEY_STORAGE, cleanKey);
    else localStorage.removeItem(GEMINI_API_KEY_STORAGE);

    if (db && currentUser) {
      await db.collection("app_config").doc("ai_settings").set({
        geminiApiKey: cleanKey,
        updatedBy: currentUser.email,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    alert("✅ Clau de Gemini desada correctament! Ja pots avaluar preguntes obertes amb IA.");
  } catch (e) {
    alert("⚠️ Desada al navegador, però error en pujar-la a Firestore (revisa les regles): " + e.message);
  }
}

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
      feedback: "No has escrit cap resposta.",
      usedFallback: true
    };
  }

  if (keywords.length === 0) {
    const isLongEnough = cleanWords.length >= 3;
    return {
      status: isLongEnough ? 'correct' : 'partial',
      multiplier: isLongEnough ? 1.0 : 0.5,
      feedback: isLongEnough
        ? "Resposta enregistrada correctament!"
        : "Has escrit una resposta molt breu. Intenta explicar-ho amb una frase més completa!",
      usedFallback: true
    };
  }

  const matched = keywords.filter(function(kw) { return matchesKeywordFuzzy(userText, kw); });
  if (matched.length > 0) {
    return {
      status: 'correct',
      multiplier: 1.0,
      feedback: "Molt bé! La teva resposta inclou els conceptes clau esperats (" + matched.join(", ") + ").",
      usedFallback: true
    };
  }
  return {
    status: 'incorrect',
    multiplier: 0,
    feedback: "Revisa el text i assegura't d'incloure la idea principal que es demana a la pregunta.",
    usedFallback: true
  };
}

async function evaluateOpenAnswerWithAI(params) {
  const apiKey = await fetchGlobalGeminiKey();
  if (!apiKey) {
    console.warn("Falta la clau de Gemini; s'activa el fallback local.");
    const fb = evaluateKeywordsFallback(params.studentAnswer, params.qData);
    fb.feedback = "⚡ (Mode paraules clau) " + fb.feedback;
    return fb;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(function() { controller.abort(); }, 10000);

  const promptText = `Ets un docent expert en comprensió lectora en llengua catalana per a alumnat de ${params.readingLevel || 'Primària'}.
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
      feedback: data.feedback || (data.status === 'correct' ? "Molt ben argumentat!" : "Revisa el text i completa la teva reflexió."),
      usedFallback: false
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("Fallback automàtic activat per a la pregunta oberta:", err);
    const fb = evaluateKeywordsFallback(params.studentAnswer, params.qData);
    fb.feedback = "⚡ (Correcció automàtica local) " + fb.feedback;
    return fb;
  }
}

let currentUser = null;
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
  if (!num || isNaN(num)) return "#CL-00001";
  return "#CL-" + String(num).padStart(5, '0');
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