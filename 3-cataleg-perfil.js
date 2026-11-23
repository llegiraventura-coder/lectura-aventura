// =========================================================================
// CAPÍTOL 3: AUTENTICACIÓ, PASSAPORT LECTOR, BANNER MOTIVACIONAL I CATÀLEG
// =========================================================================

// -------------------------------------------------------------------------
// 1. GESTIÓ DE SESSIÓ I PERFIL D'USUARI (FIREBASE AUTH)
// -------------------------------------------------------------------------

if (auth) {
  auth.onAuthStateChanged(async function(user) {
    currentUser = user || null;
    if (currentUser) {
      await loadUserProfileData(currentUser);
    } else {
      resetLocalUserState();
    }
    renderNavActions();
    renderMotivationBanner();
    renderCatalog();
  });
} else {
  window.addEventListener('DOMContentLoaded', function() {
    renderNavActions();
    renderMotivationBanner();
    renderCatalog();
  });
}

function resetLocalUserState() {
  userRole = 'alumne';
  userDisplayName = '';
  userPoints = 0;
  userCompletedReadings = [];
  userScores = {};
  userReadingHistory = {};
  userTaxonomyStats = {};
  userHasImprovedScore = false;
  userTeacherUid = '';
  userTeacherName = '';
  userClassGroup = '';
  userTeacherGroups = [];
}

async function loadUserProfileData(user) {
  if (!user || !db) return;
  try {
    const userRef = db.collection('users').doc(user.uid);
    const snap = await withTimeout(userRef.get(), 8000, 'càrrega de perfil');

    if (snap.exists) {
      const data = snap.data();
      userRole = (user.email === ADMIN_SUPREMO_EMAIL) ? 'docent' : (data.role || 'alumne');
      userDisplayName = data.displayName || user.displayName || user.email.split('@')[0];
      userPoints = Number(data.points) || 0;
      userCompletedReadings = Array.isArray(data.completedReadings) ? data.completedReadings : [];
      userScores = data.scores || {};
      userReadingHistory = data.readingHistory || {};
      userTaxonomyStats = data.taxonomyStats || {};
      userHasImprovedScore = Boolean(data.hasImprovedScore);
      userTeacherUid = data.teacherUid || '';
      userTeacherName = data.teacherName || '';
      userClassGroup = data.classGroup || '';
      userTeacherGroups = Array.isArray(data.teacherGroups) ? data.teacherGroups : [];
    } else {
      const defaultRole = (user.email === ADMIN_SUPREMO_EMAIL) ? 'docent' : 'alumne';
      const defaultName = user.displayName || user.email.split('@')[0];
      const newProfile = {
        uid: user.uid,
        email: user.email,
        displayName: defaultName,
        role: defaultRole,
        points: 0,
        completedReadings: [],
        scores: {},
        readingHistory: {},
        taxonomyStats: {},
        hasImprovedScore: false,
        teacherUid: '',
        teacherName: '',
        classGroup: '',
        teacherGroups: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await userRef.set(newProfile);
      userRole = defaultRole;
      userDisplayName = defaultName;
      resetLocalUserState();
      userRole = defaultRole;
      userDisplayName = defaultName;
    }
  } catch (err) {
    console.error("Error carregant perfil:", err);
  }
}

// -------------------------------------------------------------------------
// 2. BARRA DE NAVEGACIÓ SUPERIOR (renderNavActions)
// -------------------------------------------------------------------------

function renderNavActions() {
  const nav = document.getElementById('nav-actions');
  if (!nav) return;

  if (!currentUser) {
    nav.innerHTML = `
      <button onclick="renderFoldersView()" class="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition flex items-center gap-1.5">
        <i class="fa-solid fa-folder-tree text-amber-600"></i>
        <span class="hidden sm:inline">Carpetes / SA</span>
      </button>
      <button onclick="renderLeaderboardView()" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5">
        <i class="fa-solid fa-trophy text-amber-500"></i>
        <span class="hidden sm:inline">Rànquing</span>
      </button>
      <button onclick="openAuthModal('login')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5">
        <i class="fa-solid fa-right-to-bracket"></i>
        <span>Entra / Registra't</span>
      </button>
    `;
    return;
  }

  const isTeacher = isUserAdminOrCreator();
  const rankInfo = getStudentRankInfo(userPoints);

  nav.innerHTML = `
    <button onclick="renderFoldersView()" class="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition flex items-center gap-1.5" title="Carpetes i Situacions d'Aprenentatge">
      <i class="fa-solid fa-folder-tree text-amber-600"></i>
      <span class="hidden md:inline">Carpetes / SA</span>
    </button>

    <button onclick="renderLeaderboardView()" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5" title="Classificació">
      <i class="fa-solid fa-trophy text-amber-500"></i>
      <span class="hidden md:inline">Rànquing</span>
    </button>

    ${isTeacher ? `
      <button onclick="renderTeacherStudentsView()" class="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition flex items-center gap-1.5" title="Seguiment del teu alumnat">
        <i class="fa-solid fa-users-line"></i>
        <span class="hidden lg:inline">Els meus Alumnes</span>
      </button>
      <button onclick="openEditor(null)" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5">
        <i class="fa-solid fa-plus"></i>
        <span>Nova Lectura</span>
      </button>
      <button onclick="openFeedbackModal()" class="p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs transition" title="Bústia de suggeriments docents">
        <i class="fa-solid fa-envelope-open-text"></i>
      </button>
    ` : ''}

    <button onclick="openStudentProfileModal()" class="px-3 py-1.5 rounded-xl border ${rankInfo.current.badgeBg} font-bold text-xs transition flex items-center gap-2 hover:shadow-sm" title="Obre el teu Passaport Lector">
      <i class="fa-solid fa-passport"></i>
      <span class="max-w-[110px] truncate">${escapeHtmlSafe(userDisplayName)}</span>
      <span class="bg-white/80 px-1.5 py-0.5 rounded font-mono text-[11px] font-extrabold">${userPoints} pts</span>
    </button>

    <button onclick="handleLogout()" class="p-2 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 text-xs transition" title="Tancar sessió">
      <i class="fa-solid fa-right-from-bracket"></i>
    </button>
  `;
}

// -------------------------------------------------------------------------
// 3. MODAL D'INICI DE SESSIÓ I REGISTRE
// -------------------------------------------------------------------------

function openAuthModal(defaultTab) {
  const container = document.getElementById('auth-modal-container');
  if (!container) return;
  const tab = defaultTab === 'register' ? 'register' : 'login';

  container.innerHTML = `
    <div onclick="closeAuthModal()" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div onclick="event.stopPropagation()" class="bg-white rounded-3xl max-w-md w-full p-6 md:p-7 shadow-2xl border border-slate-200 space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <i class="fa-solid fa-book-open-reader"></i>
            </div>
            <h3 class="font-extrabold text-lg text-slate-800">Lectura Aventura</h3>
          </div>
          <button onclick="closeAuthModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button type="button" onclick="openAuthModal('login')" class="py-2 rounded-lg text-xs font-extrabold transition ${tab === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}">Inicia sessió</button>
          <button type="button" onclick="openAuthModal('register')" class="py-2 rounded-lg text-xs font-extrabold transition ${tab === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}">Crea compte</button>
        </div>

        <div id="auth-error-box" class="hidden p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"></div>

        ${tab === 'login' ? `
          <form onsubmit="handleLoginSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Correu electrònic</label>
              <input type="email" id="auth-login-email" required placeholder="nom@escola.cat" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Contrasenya</label>
              <input type="password" id="auth-login-pass" required placeholder="••••••••" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm">
            </div>
            <button type="submit" id="btn-auth-submit" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow transition">
              Entrar a la plataforma
            </button>
          </form>
        ` : `
          <form onsubmit="handleRegisterSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nom i cognoms (o àlies lector)</label>
              <input type="text" id="auth-reg-name" required placeholder="Ex: Martina Puig" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Perfil</label>
              <select id="auth-reg-role" onchange="toggleRegisterStudentFields(this.value)" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold">
                <option value="alumne">🎒 Alumne / Lector</option>
                <option value="docent">🍎 Docent / Mestre</option>
              </select>
            </div>
            <div id="reg-student-extra" class="space-y-2.5 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
              <div>
                <label class="block text-[11px] font-bold text-indigo-900 mb-1">Codi del teu mestre/a (opcional)</label>
                <input type="text" id="auth-reg-teacher" placeholder="Enganxa aquí el codi docent..." class="w-full px-3 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-indigo-900 mb-1">Grup / Classe (opcional)</label>
                <input type="text" id="auth-reg-group" placeholder="Ex: 4t A" class="w-full px-3 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs">
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Correu electrònic</label>
              <input type="email" id="auth-reg-email" required placeholder="nom@escola.cat" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Contrasenya (mínim 6 caràcters)</label>
              <input type="password" id="auth-reg-pass" required minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
            </div>
            <button type="submit" id="btn-auth-submit" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow transition">
              Crear el meu compte
            </button>
          </form>
        `}
      </div>
    </div>
  `;
}

function closeAuthModal() {
  const container = document.getElementById('auth-modal-container');
  if (container) container.innerHTML = '';
}

function toggleRegisterStudentFields(roleVal) {
  const box = document.getElementById('reg-student-extra');
  if (!box) return;
  if (roleVal === 'docent') box.classList.add('hidden');
  else box.classList.remove('hidden');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  if (!auth) return;
  const email = (document.getElementById('auth-login-email').value || '').trim();
  const pass = document.getElementById('auth-login-pass').value || '';
  const errBox = document.getElementById('auth-error-box');
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    closeAuthModal();
  } catch (err) {
    if (errBox) {
      errBox.textContent = "Error d'accés: " + err.message;
      errBox.classList.remove('hidden');
    }
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  if (!auth || !db) return;
  const name = (document.getElementById('auth-reg-name').value || '').trim();
  const role = document.getElementById('auth-reg-role').value || 'alumne';
  const email = (document.getElementById('auth-reg-email').value || '').trim();
  const pass = document.getElementById('auth-reg-pass').value || '';
  const teacherCode = (document.getElementById('auth-reg-teacher')?.value || '').trim();
  const classGroup = (document.getElementById('auth-reg-group')?.value || '').trim();
  const errBox = document.getElementById('auth-error-box');

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    const finalRole = (email === ADMIN_SUPREMO_EMAIL) ? 'docent' : role;
    await db.collection('users').doc(cred.user.uid).set({
      uid: cred.user.uid,
      email: email,
      displayName: name,
      role: finalRole,
      points: 0,
      completedReadings: [],
      scores: {},
      readingHistory: {},
      taxonomyStats: {},
      hasImprovedScore: false,
      teacherUid: finalRole === 'alumne' ? teacherCode : '',
      classGroup: finalRole === 'alumne' ? classGroup : '',
      teacherGroups: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeAuthModal();
  } catch (err) {
    if (errBox) {
      errBox.textContent = "Error creant compte: " + err.message;
      errBox.classList.remove('hidden');
    }
  }
}

async function handleLogout() {
  if (!auth) return;
  stopSpeechPlayback();
  await auth.signOut();
}

// -------------------------------------------------------------------------
// 4. MODAL DE PASSAPORT LECTOR I CONFIGURACIÓ D'AULA
// -------------------------------------------------------------------------

function openStudentProfileModal() {
  if (!currentUser) return;
  const container = document.getElementById('profile-modal-container');
  if (!container) return;

  const rank = getStudentRankInfo(userPoints);
  const isTeacher = isUserAdminOrCreator();
  const completedCount = userCompletedReadings.length;

  const taxBarsHtml = Object.keys(TAXONOMY_CONFIG).map(function(k) {
    const cfg = TAXONOMY_CONFIG[k];
    const pts = Number(userTaxonomyStats[k]) || 0;
    return `<div class="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200">
      <span class="font-bold text-slate-700"><i class="fa-solid ${cfg.icon} mr-1.5 text-indigo-600"></i>${cfg.label}</span>
      <span class="font-mono font-extrabold text-indigo-700">${pts} pts</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div onclick="closeStudentProfileModal()" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div onclick="event.stopPropagation()" class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg">
              <i class="fa-solid fa-passport"></i>
            </div>
            <div>
              <h3 class="font-extrabold text-lg text-slate-800">${escapeHtmlSafe(userDisplayName)}</h3>
              <p class="text-xs text-slate-500">${escapeHtmlSafe(currentUser.email)} • ${isTeacher ? 'Compte Docent' : 'Passaport Lector'}</p>
            </div>
          </div>
          <button onclick="closeStudentProfileModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="p-4 rounded-2xl border ${rank.current.badgeBg} space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-extrabold uppercase tracking-wider">Rang actual</span>
            <span class="font-mono font-black text-base">${userPoints} punts</span>
          </div>
          <div class="text-lg font-extrabold">${rank.current.name}</div>
          <div class="w-full h-2.5 bg-white/80 rounded-full overflow-hidden">
            <div class="h-full ${rank.current.barColor} transition-all" style="width:${rank.progressPercent}%"></div>
          </div>
          <p class="text-[11px] opacity-85">
            ${rank.next ? `Et falten <strong>${rank.pointsNeeded} punts</strong> per pujar a <em>${rank.next.name}</em>.` : 'Has assolit el rang màxim de lector!'}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3 text-center">
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div class="text-2xl font-black text-indigo-700">${completedCount}</div>
            <div class="text-[11px] font-bold text-slate-500">Lectures completades</div>
          </div>
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div class="text-2xl font-black text-emerald-700">${userPoints}</div>
            <div class="text-[11px] font-bold text-slate-500">Punts acumulats</div>
          </div>
        </div>

        <div class="space-y-1.5">
          <h4 class="text-xs font-extrabold text-slate-700 uppercase">Punts per competència lectora</h4>
          ${taxBarsHtml}
        </div>

        ${isTeacher ? `
          <div class="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <h4 class="text-xs font-extrabold text-emerald-950"><i class="fa-solid fa-chalkboard-user mr-1"></i>El teu Codi Docent per als alumnes</h4>
            <code class="block p-2 rounded-xl bg-white border border-emerald-300 font-mono text-xs font-bold text-emerald-900 select-all text-center">${currentUser.uid}</code>
            <p class="text-[11px] text-emerald-800">Comparteix aquest codi perquè els teus alumnes es vinculin al teu panell.</p>
          </div>
        ` : `
          <form onsubmit="saveStudentTeacherLink(event)" class="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
            <h4 class="text-xs font-extrabold text-indigo-950"><i class="fa-solid fa-link mr-1"></i>Vinculació amb el teu mestre/a</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="text" id="prof-teacher-uid" value="${escapeHtmlAttr(userTeacherUid)}" placeholder="Codi docent..." class="sm:col-span-2 px-3 py-1.5 rounded-xl border border-indigo-300 bg-white text-xs font-mono">
              <input type="text" id="prof-class-group" value="${escapeHtmlAttr(userClassGroup)}" placeholder="Grup (ex: 5è B)" class="px-3 py-1.5 rounded-xl border border-indigo-300 bg-white text-xs">
            </div>
            <button type="submit" class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">Desar vinculació</button>
          </form>
        `}
      </div>
    </div>
  `;
}

function closeStudentProfileModal() {
  const container = document.getElementById('profile-modal-container');
  if (container) container.innerHTML = '';
}

async function saveStudentTeacherLink(e) {
  e.preventDefault();
  if (!currentUser || !db) return;
  const newTeacherUid = (document.getElementById('prof-teacher-uid').value || '').trim();
  const newClassGroup = (document.getElementById('prof-class-group').value || '').trim();
  try {
    await db.collection('users').doc(currentUser.uid).update({
      teacherUid: newTeacherUid,
      classGroup: newClassGroup
    });
    userTeacherUid = newTeacherUid;
    userClassGroup = newClassGroup;
    alert("Vinculació desada correctament!");
    closeStudentProfileModal();
  } catch (err) {
    alert("Error desant vinculació: " + err.message);
  }
}

// -------------------------------------------------------------------------
// 5. BANNER DE BENVINGUDA I MOTIVACIÓ
// -------------------------------------------------------------------------

function renderMotivationBanner() {
  const banner = document.getElementById('motivation-banner');
  if (!banner) return;

  if (!currentUser) {
    banner.innerHTML = `
      <div class="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-6 md:p-7 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div class="space-y-1.5">
          <span class="inline-block px-3 py-1 rounded-full bg-white/15 text-xs font-bold">🚀 Plataforma de Comprensió Lectora</span>
          <h2 class="text-xl md:text-2xl font-extrabold">Explora lectures, supera reptes i aconsegueix el teu Passaport Lector!</h2>
          <p class="text-xs md:text-sm text-indigo-100 max-w-2xl">Inicia sessió per desar les teves puntuacions, pujar de rang i accedir a les lectures adaptades DUA.</p>
        </div>
        <button onclick="openAuthModal('login')" class="px-5 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs shadow shrink-0 transition">
          Començar ara <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </div>
    `;
    return;
  }

  const rank = getStudentRankInfo(userPoints);
  const completedCount = userCompletedReadings.length;

  banner.innerHTML = `
    <div class="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${rank.current.badgeBg}">${rank.current.name}</span>
          <span class="text-xs text-slate-500 font-medium">${completedCount} lectures completades</span>
        </div>
        <h2 class="text-lg md:text-xl font-extrabold text-slate-800">Hola, ${escapeHtmlSafe(userDisplayName)}! Quina aventura llegirem avui?</h2>
      </div>

      <div class="w-full md:w-64 space-y-1.5 shrink-0">
        <div class="flex justify-between text-xs font-bold text-slate-600">
          <span>Progrés de rang</span>
          <span class="font-mono text-indigo-700">${userPoints} pts</span>
        </div>
        <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full ${rank.current.barColor} transition-all" style="width:${rank.progressPercent}%"></div>
        </div>
        <p class="text-[11px] text-slate-500 text-right">
          ${rank.next ? `${rank.pointsNeeded} pts per a ${rank.next.name}` : 'Nivell màxim assolit!'}
        </p>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------------------
// 6. CATÀLEG DE LECTURES I FILTRES
// -------------------------------------------------------------------------

async function fetchAllReadingsFromFirestore() {
  if (!db) return [];
  const snap = await withTimeout(db.collection(DB_COLLECTION).get(), 10000, 'càrrega del catàleg');
  const list = [];
  snap.forEach(function(doc) {
    list.push(Object.assign({ id: doc.id }, doc.data()));
  });
  list.sort(function(a, b) {
    return (Number(a.codeNumber) || 9999) - (Number(b.codeNumber) || 9999);
  });
  cachedLecturesList = list;
  return list;
}

function resetFiltersAndRenderCatalog() {
  currentCatalogFilter = 'tots';
  currentLevelFilter = 'tots';
  currentTypeFilter = 'tots';
  currentAuthorFilter = 'tots';
  currentSearchQuery = '';
  showOnlyMyReadings = false;
  renderCatalog();
}

async function renderCatalog() {
  stopSpeechPlayback();
  const app = document.getElementById('app');
  if (!app) return;

  if (!db) {
    app.innerHTML = `<div class="p-6 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-center text-sm font-bold">Configura les claus de Firebase a <code>1-config-ia.js</code> per carregar el catàleg de lectures.</div>`;
    return;
  }

  app.innerHTML = `
    <div class="text-center py-12">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-600"></i>
      <p class="mt-2 text-xs text-slate-500 font-medium">Carregant biblioteca de lectures...</p>
    </div>
  `;

  try {
    await fetchAllReadingsFromFirestore();
    renderCatalogGridOnly();
  } catch (err) {
    app.innerHTML = `<div class="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-center space-y-2">
      <p class="font-bold">Error carregant el catàleg: ${escapeHtmlSafe(err.message)}</p>
      <button onclick="renderCatalog()" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs">Reintentar</button>
    </div>`;
  }
}

function renderCatalogGridOnly() {
  const app = document.getElementById('app');
  if (!app) return;

  const isTeacher = isUserAdminOrCreator();
  const queryNorm = normalizeForComparison(currentSearchQuery);

  const filtered = cachedLecturesList.filter(function(item) {
    if (showOnlyMyReadings && currentUser && item.authorUid !== currentUser.uid) return false;
    if (currentLevelFilter !== 'tots' && (item.level || '') !== currentLevelFilter) return false;
    if (currentTypeFilter !== 'tots' && (item.textType || '') !== currentTypeFilter) return false;

    if (currentCatalogFilter === 'pendents' && userCompletedReadings.includes(item.id)) return false;
    if (currentCatalogFilter === 'completades' && !userCompletedReadings.includes(item.id)) return false;
    if (currentCatalogFilter === 'dua' && !item.isDuaAdaptation && !item.parentReadingId) return false;

    if (queryNorm) {
      const haystack = normalizeForComparison(
        (item.title || '') + ' ' +
        (item.bookAuthor || '') + ' ' +
        formatReadingCode(item.codeNumber) + ' ' +
        (item.level || '') + ' ' +
        (item.textType || '')
      );
      if (!haystack.includes(queryNorm)) return false;
    }
    return true;
  });

  const cardsHtml = filtered.length === 0
    ? `<div class="col-span-full bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
        <i class="fa-solid fa-book-open text-4xl text-slate-300"></i>
        <h3 class="font-bold text-slate-700">No s'han trobat lectures amb aquests filtres</h3>
        <button onclick="resetFiltersAndRenderCatalog()" class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">Mostrar totes les lectures</button>
      </div>`
    : filtered.map(function(item) {
        const isDone = userCompletedReadings.includes(item.id);
        const bestScore = userScores[item.id];
        const isDua = Boolean(item.isDuaAdaptation || item.parentReadingId);
        const canEdit = currentUser && (currentUser.email === ADMIN_SUPREMO_EMAIL || item.authorUid === currentUser.uid);
        const qCount = Array.isArray(item.questions) ? item.questions.length : 0;

        return `<article class="bg-white rounded-2xl border ${isDone ? 'border-emerald-300' : 'border-slate-200'} hover:border-indigo-400 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
          ${item.coverImage ? `
            <div class="h-40 w-full bg-slate-100 overflow-hidden relative cursor-pointer" onclick="openReader('${item.id}')">
              <img src="${escapeHtmlAttr(item.coverImage)}" alt="${escapeHtmlAttr(item.title)}" class="w-full h-full object-cover">
              <span class="absolute top-2.5 left-2.5 font-mono text-[11px] font-extrabold bg-slate-900/80 text-white px-2.5 py-0.5 rounded-lg">${formatReadingCode(item.codeNumber)}</span>
              ${isDua ? `<span class="absolute top-2.5 right-2.5 text-[10px] font-extrabold bg-purple-600 text-white px-2.5 py-0.5 rounded-full shadow"><i class="fa-solid fa-universal-access mr-1"></i>DUA</span>` : ''}
            </div>
          ` : `
            <div class="px-5 pt-4 flex items-center justify-between gap-2">
              <span class="font-mono text-xs font-extrabold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">${formatReadingCode(item.codeNumber)}</span>
              ${isDua ? `<span class="text-[10px] font-extrabold bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-universal-access mr-1"></i>Adaptació DUA</span>` : ''}
            </div>
          `}

          <div class="p-5 flex-grow space-y-2.5">
            <div class="flex flex-wrap items-center gap-1.5">
              ${item.level ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">${escapeHtmlSafe(item.level)}</span>` : ''}
              ${item.textType ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">${escapeHtmlSafe(item.textType)}</span>` : ''}
              ${isDone ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800"><i class="fa-solid fa-check mr-1"></i>${bestScore}/10</span>` : ''}
            </div>

            <h3 onclick="openReader('${item.id}')" class="font-extrabold text-base text-slate-800 hover:text-indigo-700 cursor-pointer leading-snug line-clamp-2">
              ${escapeHtmlSafe(item.title || 'Lectura sense títol')}
            </h3>

            ${item.bookAuthor ? `<p class="text-xs text-slate-500 truncate"><i class="fa-solid fa-feather-pointed mr-1"></i>${escapeHtmlSafe(item.bookAuthor)}</p>` : ''}

            <div class="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
              <span><i class="fa-regular fa-clock mr-1"></i>${escapeHtmlSafe(item.duration || '15 min')}</span>
              ${qCount > 0 ? `<span><i class="fa-solid fa-list-check mr-1"></i>${qCount} activitats</span>` : ''}
            </div>
          </div>

          <div class="px-5 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button onclick="openReader('${item.id}')" class="flex-grow py-2 px-3 rounded-xl ${isDone ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold text-xs transition">
              ${isDone ? 'Tornar a llegir' : 'Començar lectura'}
            </button>

            ${isTeacher ? `
              <button onclick="openCloneModal('${item.id}')" class="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs" title="Duplicar o crear adaptació DUA">
                <i class="fa-solid fa-copy"></i>
              </button>
            ` : ''}

            ${canEdit ? `
              <button onclick="openEditor('${item.id}')" class="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs" title="Editar lectura">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button onclick="deleteLectureFromCatalog('${item.id}', '${escapeHtmlAttr(item.title)}')" class="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs" title="Eliminar lectura">
                <i class="fa-solid fa-trash"></i>
              </button>
            ` : ''}
          </div>
        </article>`;
      }).join('');

  app.innerHTML = `
    <div class="space-y-5">
      <!-- Barra de cerca i filtres -->
      <div class="bg-white rounded-3xl border border-slate-200 p-4 md:p-5 shadow-sm space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div class="md:col-span-5 relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input type="text" value="${escapeHtmlAttr(currentSearchQuery)}" oninput="onCatalogSearchInput(this.value)" placeholder="Cerca per títol, autor o codi (#001)..." class="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-indigo-500 focus:outline-none">
          </div>

          <select onchange="setLevelFilter(this.value)" class="md:col-span-3 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white">
            <option value="tots" ${currentLevelFilter === 'tots' ? 'selected' : ''}>Tots els nivells</option>
            <option value="Cicle Inicial" ${currentLevelFilter === 'Cicle Inicial' ? 'selected' : ''}>Cicle Inicial</option>
            <option value="Cicle Mitjà" ${currentLevelFilter === 'Cicle Mitjà' ? 'selected' : ''}>Cicle Mitjà</option>
            <option value="Cicle Superior" ${currentLevelFilter === 'Cicle Superior' ? 'selected' : ''}>Cicle Superior</option>
            <option value="ESO" ${currentLevelFilter === 'ESO' ? 'selected' : ''}>ESO</option>
          </select>

          <select onchange="setTypeFilter(this.value)" class="md:col-span-2 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white">
            <option value="tots" ${currentTypeFilter === 'tots' ? 'selected' : ''}>Tipologia: Totes</option>
            <option value="Narratiu" ${currentTypeFilter === 'Narratiu' ? 'selected' : ''}>Narratiu</option>
            <option value="Informatiu" ${currentTypeFilter === 'Informatiu' ? 'selected' : ''}>Informatiu</option>
            <option value="Poètic" ${currentTypeFilter === 'Poètic' ? 'selected' : ''}>Poètic</option>
            <option value="Teatral" ${currentTypeFilter === 'Teatral' ? 'selected' : ''}>Teatral</option>
            <option value="Instructiu" ${currentTypeFilter === 'Instructiu' ? 'selected' : ''}>Instructiu</option>
            <option value="Argumentatiu" ${currentTypeFilter === 'Argumentatiu' ? 'selected' : ''}>Argumentatiu</option>
          </select>

          <select onchange="setCatalogFilter(this.value)" class="md:col-span-2 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white">
            <option value="tots" ${currentCatalogFilter === 'tots' ? 'selected' : ''}>Estat: Totes</option>
            <option value="pendents" ${currentCatalogFilter === 'pendents' ? 'selected' : ''}>Pendents</option>
            <option value="completades" ${currentCatalogFilter === 'completades' ? 'selected' : ''}>Completades</option>
            <option value="dua" ${currentCatalogFilter === 'dua' ? 'selected' : ''}>Adaptacions DUA</option>
          </select>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Mostrant <strong>${filtered.length}</strong> de ${cachedLecturesList.length} lectures disponibles</span>
          ${isTeacher ? `
            <label class="flex items-center gap-1.5 cursor-pointer font-bold text-indigo-800">
              <input type="checkbox" ${showOnlyMyReadings ? 'checked' : ''} onchange="toggleMyReadingsFilter(this.checked)" class="rounded text-indigo-600">
              <span>Només les meves lectures creades</span>
            </label>
          ` : ''}
        </div>
      </div>

      <!-- Graella de lectures -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        ${cardsHtml}
      </div>
    </div>
  `;
}

function onCatalogSearchInput(val) {
  currentSearchQuery = val;
  renderCatalogGridOnly();
}

function setLevelFilter(val) {
  currentLevelFilter = val;
  renderCatalogGridOnly();
}

function setTypeFilter(val) {
  currentTypeFilter = val;
  renderCatalogGridOnly();
}

function setCatalogFilter(val) {
  currentCatalogFilter = val;
  renderCatalogGridOnly();
}

function toggleMyReadingsFilter(checked) {
  showOnlyMyReadings = Boolean(checked);
  renderCatalogGridOnly();
}

async function deleteLectureFromCatalog(docId, title) {
  if (!confirm('Segur que vols eliminar definitivament la lectura "' + title + '"?')) return;
  try {
    await db.collection(DB_COLLECTION).doc(docId).delete();
    renderCatalog();
  } catch (err) {
    alert("Error eliminant lectura: " + err.message);
  }
}