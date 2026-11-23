// =========================================================================
// CAPÍTOL 1: CONFIGURACIÓ FIREBASE, ESTAT GLOBAL, UTILITATS, PUJADA IMATGES I IA GEMINI
// =========================================================================

// 1. CONFIGURACIÓ DE FIREBASE I GEMINI (Substitueix amb les teves claus)
const firebaseConfig = {
  apiKey: "EL_TEU_API_KEY",
  authDomain: "EL_TEU_PROJECTE.firebaseapp.com",
  projectId: "EL_TEU_PROJECTE",
  storageBucket: "EL_TEU_PROJECTE.appspot.com",
  messagingSenderId: "EL_TEU_MESSAGING_ID",
  appId: "EL_TEU_APP_ID"
};

const GEMINI_API_KEY = "LA_TEVA_CLAU_GEMINI_API";

let appFirebase = null;
let auth = null;
let db = null;
let storage = null;

try {
  if (typeof firebase !== 'undefined') {
    appFirebase = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    if (typeof firebase.storage === 'function') {
      storage = firebase.storage();
    }
  }
} catch (initErr) {
  console.error("Error inicialitzant Firebase:", initErr);
}

// 2. CONSTANTS DEL SISTEMA I COL·LECCIONS FIRESTORE
const DB_COLLECTION = 'lectures_catala';
const SUB_COLLECTION = 'preguntes';
const FEEDBACK_COLLECTION = 'feedback_docents';
const FOLDERS_COLLECTION = 'carpetes_lectures';
const ADMIN_SUPREMO_EMAIL = 'albert@escola.cat';

const STUDENT_RANKS = [
  { name: 'Aprenent de Lector', minPoints: 0, badgeBg: 'bg-slate-100 text-slate-700 border-slate-300', barColor: 'bg-slate-500' },
  { name: 'Explorador de Lletres', minPoints: 50, badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300', barColor: 'bg-emerald-500' },
  { name: 'Cercador d\'Històries', minPoints: 150, badgeBg: 'bg-sky-50 text-sky-800 border-sky-300', barColor: 'bg-sky-500' },
  { name: 'Mestre de la Comprensió', minPoints: 300, badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-300', barColor: 'bg-indigo-600' },
  { name: 'Lector Llegendari', minPoints: 500, badgeBg: 'bg-amber-50 text-amber-800 border-amber-300', barColor: 'bg-amber-500' }
];

const TAXONOMY_CONFIG = {
  literal: { label: 'Comprensió Literal', color: 'bg-sky-50 text-sky-800 border-sky-200', icon: 'fa-magnifying-glass' },
  inferencial: { label: 'Comprensió Inferencial', color: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: 'fa-brain' },
  figurat: { label: 'Sentit Figurat i Vocabulari', color: 'bg-purple-50 text-purple-800 border-purple-200', icon: 'fa-feather-pointed' },
  critica: { label: 'Reflexió i Opinió Crítica', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'fa-scale-balanced' },
  creativa: { label: 'Expressió Creativa', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: 'fa-palette' }
};

// 3. ESTAT GLOBAL DE L'APLICACIÓ
let currentUser = null;
let userRole = 'alumne';
let userDisplayName = '';
let userPoints = 0;
let userCompletedReadings = [];
let userScores = {};
let userReadingHistory = {};
let userTaxonomyStats = {};
let userHasImprovedScore = false;
let userTeacherUid = '';
let userTeacherName = '';
let userClassGroup = '';
let userTeacherGroups = [];

let cachedLecturesList = [];
let cachedFoldersList = [];
let currentCatalogFilter = 'tots';
let currentLevelFilter = 'tots';
let currentTypeFilter = 'tots';
let currentAuthorFilter = 'tots';
let currentSearchQuery = '';
let showOnlyMyReadings = false;
let currentLeaderboardTab = 'global';
let selectedClassroomFilter = 'all';

let editingDocId = null;
let cloningParentId = null;

let isDyslexicMode = false;
let readerFontSize = 18;
let readerTheme = 'default';
let isSpeaking = false;
let isSpeechPaused = false;
let speechUtterance = null;
let speechRate = 1.0;
let currentTextToRead = '';

let readerCurrentPartIndex = 0;
let readerCurrentDocId = null;
let isClassroomProjectionMode = false;
let classroomStepMode = 'all';
let classroomCurrentQuestionIndex = 0;

// 4. UTILITATS GENERALS, TIMEOUTS I ESCAPAT SEGUR D'HTML
function withTimeout(promise, ms, label) {
  let timer;
  const timeoutPromise = new Promise(function(_, reject) {
    timer = setTimeout(function() {
      reject(new Error('Temps exhaurit (' + Math.round(ms / 1000) + 's) en: ' + (label || 'operació')));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(function() {
    clearTimeout(timer);
  });
}

function isUserAdminOrCreator() {
  if (!currentUser) return false;
  if (currentUser.email === ADMIN_SUPREMO_EMAIL) return true;
  return userRole === 'docent';
}

function formatReadingCode(num) {
  const n = Number(num);
  if (!n || isNaN(n) || n <= 0) return '#---';
  return '#' + String(Math.floor(n)).padStart(3, '0');
}

function getStudentRankInfo(points) {
  const pts = Number(points) || 0;
  let current = STUDENT_RANKS[0];
  let next = null;
  for (let i = 0; i < STUDENT_RANKS.length; i++) {
    if (pts >= STUDENT_RANKS[i].minPoints) {
      current = STUDENT_RANKS[i];
      next = STUDENT_RANKS[i + 1] || null;
    }
  }
  let progressPercent = 100;
  let pointsNeeded = 0;
  if (next) {
    const span = next.minPoints - current.minPoints;
    const earnedInLevel = pts - current.minPoints;
    progressPercent = Math.min(100, Math.max(0, Math.round((earnedInLevel / span) * 100)));
    pointsNeeded = Math.max(0, next.minPoints - pts);
  }
  return {
    current: current,
    next: next,
    progressPercent: progressPercent,
    pointsNeeded: pointsNeeded
  };
}

function escapeHtmlSafe(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeForComparison(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:!?¡¿"'()\[\]{}\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function updateRefImagePreview(url) {
  const box = document.getElementById('ref-image-preview-box');
  const img = document.getElementById('ref-image-preview-img');
  if (!box || !img) return;
  const clean = (url || '').trim();
  if (!clean) {
    box.classList.add('hidden');
    img.src = '';
    return;
  }
  img.src = clean;
  box.classList.remove('hidden');
}

function openZoomImageModal(url, caption) {
  if (!url) return;
  const container = document.getElementById('image-zoom-modal-container');
  if (!container) return;
  const safeUrl = escapeHtmlAttr(url);
  const safeCap = escapeHtmlAttr(caption || 'Imatge ampliada');
  container.innerHTML =
    '<div onclick="closeZoomImageModal()" class="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out">' +
      '<div onclick="event.stopPropagation()" class="relative max-w-4xl w-full bg-white rounded-3xl p-3 md:p-4 shadow-2xl border border-slate-200">' +
        '<button onclick="closeZoomImageModal()" class="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-slate-900 text-white hover:bg-rose-600 shadow-lg flex items-center justify-center transition" title="Tancar">' +
          '<i class="fa-solid fa-xmark"></i>' +
        '</button>' +
        '<img src="' + safeUrl + '" alt="' + safeCap + '" class="max-h-[78vh] w-auto mx-auto rounded-2xl object-contain">' +
        (caption ? '<p class="text-center text-xs font-bold text-slate-600 mt-3">' + escapeHtmlSafe(caption) + '</p>' : '') +
      '</div>' +
    '</div>';
}

function closeZoomImageModal() {
  const container = document.getElementById('image-zoom-modal-container');
  if (container) container.innerHTML = '';
}

function scrollToGlossary(e) {
  if (e) e.preventDefault();
  const target = document.getElementById('glossary-section');
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('ring-4', 'ring-amber-300');
    setTimeout(function() {
      target.classList.remove('ring-4', 'ring-amber-300');
    }, 1800);
  }
}

// 5. COMPRESSIÓ I PUJADA D'IMATGES A FIREBASE STORAGE
function compressImageFile(file, maxWidth, quality) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new Image();
      img.onload = function() {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) {
          if (blob) resolve(blob);
          else reject(new Error('No s\'ha pogut generar la imatge comprimida.'));
        }, 'image/jpeg', quality || 0.82);
      };
      img.onerror = function() { reject(new Error('Arxiu d\'imatge invàlid.')); };
      img.src = ev.target.result;
    };
    reader.onerror = function() { reject(new Error('Error llegint l\'arxiu.')); };
    reader.readAsDataURL(file);
  });
}

async function uploadImageToFirebase(fileInput, targetInputClass, statusId, maxWidth) {
  const file = fileInput && fileInput.files && fileInput.files[0];
  if (!file) return;

  const parent = fileInput.closest('.q-block') || fileInput.closest('.mc-option-row') || document;
  const urlInput = parent.querySelector('.' + targetInputClass) || document.querySelector('.' + targetInputClass);
  const statusEl = statusId ? document.getElementById(statusId) : parent.querySelector('.q-upload-status');

  if (!storage || !currentUser) {
    alert("Has d'iniciar sessió com a docent i tenir Firebase Storage actiu per pujar imatges.");
    fileInput.value = '';
    return;
  }

  if (statusEl) {
    statusEl.innerHTML = '<span class="text-indigo-600 font-bold"><i class="fa-solid fa-spinner fa-spin mr-1"></i>Comprimint i pujant...</span>';
  }

  try {
    const compressedBlob = await compressImageFile(file, maxWidth || 800, 0.82);
    const safeName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageRef = storage.ref().child('lectures_imatges/' + currentUser.uid + '/' + safeName);
    const snapshot = await withTimeout(storageRef.put(compressedBlob, { contentType: 'image/jpeg' }), 20000, 'pujada d\'imatge');
    const downloadURL = await snapshot.ref.getDownloadURL();

    if (urlInput) {
      urlInput.value = downloadURL;
      if (targetInputClass === 'ed-cover-input') {
        updateRefImagePreview(downloadURL);
      } else if (typeof updateImagePreview === 'function') {
        updateImagePreview(urlInput);
      }
    }
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-emerald-600 font-bold"><i class="fa-solid fa-check mr-1"></i>Imatge pujada!</span>';
    }
  } catch (err) {
    console.error("Error pujant imatge:", err);
    if (statusEl) {
      statusEl.innerHTML = '<span class="text-rose-600 font-bold">Error: ' + escapeHtmlSafe(err.message) + '</span>';
    }
  } finally {
    fileInput.value = '';
  }
}

// 6. CORRECCIÓ D'ACTIVITATS OBERTES AMB IA GEMINI
async function evaluateOpenAnswerWithAI(questionPrompt, rubric, studentAnswer, context) {
  const cleanAnswer = (studentAnswer || '').trim();
  if (!cleanAnswer) {
    return { ratio: 0, feedback: 'No has escrit cap resposta.' };
  }

  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'LA_TEVA_CLAU_GEMINI_API') {
    const wordCount = cleanAnswer.split(/\s+/).length;
    const ratio = wordCount >= 5 ? 1 : 0.5;
    return {
      ratio: ratio,
      feedback: ratio === 1
        ? 'Resposta registrada correctament.'
        : 'Resposta massa breu; intenta desenvolupar una mica més la teva explicació.'
    };
  }

  try {
    const promptText =
      'Ets un mestre de primària i ESO a Catalunya avaluant la comprensió lectora d\'un alumne en català.\n' +
      'Títol lectura: ' + (context.readingTitle || '') + '\n' +
      'Nivell: ' + (context.readingLevel || '') + '\n' +
      'Pregunta: ' + questionPrompt + '\n' +
      'Criteri d\'avaluació del docent: ' + (rubric || 'Que respongui amb coherència respecte al text.') + '\n' +
      'Resposta de l\'alumne: ' + cleanAnswer + '\n\n' +
      'Respon ÚNICAMENT un JSON vàlid amb aquest format exacte: {"score": 1.0, "feedback": "Comentari breu i motivador en català per a l\'alumne"} on "score" sigui un número entre 0.0 i 1.0.';

    const response = await withTimeout(
      fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(GEMINI_API_KEY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.2 }
        })
      }),
      12000,
      'avaluació IA'
    );

    const json = await response.json();
    const rawText = json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts[0].text;
    const match = rawText ? rawText.match(/\{[\s\S]*\}/) : null;
    if (match) {
      const parsed = JSON.parse(match[0]);
      const score = Math.min(1, Math.max(0, Number(parsed.score) || 0));
      return {
        ratio: score,
        feedback: parsed.feedback || 'Resposta avaluada.'
      };
    }
  } catch (err) {
    console.warn("Fallback avaluació oberta:", err);
  }

  return {
    ratio: cleanAnswer.length >= 12 ? 1 : 0.5,
    feedback: 'Resposta enregistrada correctament.'
  };
}