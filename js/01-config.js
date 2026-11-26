function showGlobalError(msg) {
  var box = document.getElementById('global-error-box');
  if (box) {
    box.innerHTML = '<div class="max-w-4xl mx-auto mt-3 p-4 bg-red-100 border-2 border-red-400 text-red-900 rounded-xl text-xs font-mono shadow">' +
      '<strong>⚠️ Error detectat:</strong> ' + msg +
      '</div>';
  }
}
window.addEventListener('error', function(event) {
  showGlobalError('(Línia ' + (event.lineno || '?') + ') ' + (event.message || 'Error desconegut'));
});
window.addEventListener('unhandledrejection', function(event) {
  var reason = event.reason ? (event.reason.message || String(event.reason)) : 'Error en promesa';
  showGlobalError('(Async) ' + reason);
});

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

function getReadingsCollection() { return currentLang === 'en' ? 'lectures_en' : 'lectures'; }
function getFoldersCollection() { return currentLang === 'en' ? 'folders_en' : 'folders'; }
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

