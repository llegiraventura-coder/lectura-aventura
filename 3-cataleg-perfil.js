// =========================================================================
// CAPÍTOL 3: AUTENTICACIÓ, BARRA DE NAVEGACIÓ, PASSAPORT LECTOR I CATÀLEG
// =========================================================================

let cachedLecturesList = [];

// -------------------------------------------------------------------------
// 1. AUTENTICACIÓ I SINCRONITZACIÓ DE PERFIL A FIRESTORE
// -------------------------------------------------------------------------

function getStudentRankInfo(points) {
  const pts = Number(points) || 0;
  let current = STUDENT_RANKS_CATALOG[0];
  let next = null;
  for (let i = 0; i < STUDENT_RANKS_CATALOG.length; i++) {
    if (pts >= STUDENT_RANKS_CATALOG[i].min && pts <= STUDENT_RANKS_CATALOG[i].max) {
      current = STUDENT_RANKS_CATALOG[i];
      next = STUDENT_RANKS_CATALOG[i + 1] || null;
      break;
    }
  }
  return { current: current, next: next };
}

function getTeacherRankInfo(createdCount) {
  const count = Number(createdCount) || 0;
  let current = TEACHER_RANKS_CATALOG[0];
  let next = null;
  for (let i = 0; i < TEACHER_RANKS_CATALOG.length; i++) {
    if (count >= TEACHER_RANKS_CATALOG[i].min && count <= TEACHER_RANKS_CATALOG[i].max) {
      current = TEACHER_RANKS_CATALOG[i];
      next = TEACHER_RANKS_CATALOG[i + 1] || null;
      break;
    }
  }
  return { current: current, next: next };
}

async function loadOrCreateUserProfile(user) {
  if (!user || !db) return;
  try {
    const userRef = db.collection('users').doc(user.uid);
    const snap = await withTimeout(userRef.get(), 7000, 'càrrega de perfil');
    if (snap.exists) {
      const data = snap.data();
      userPoints = Number(data.points) || 0;
      userRole = user.email === ADMIN_SUPREMO_EMAIL ? 'docent' : (data.role || 'alumne');
      userCompletedReadings = Array.isArray(data.completedReadings) ? data.completedReadings : [];
      userScores = data.scores || {};
      userReadingHistory = data.readingHistory || {};
      userTaxonomyStats = Object.assign({ literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 }, data.taxonomyStats || {});
      userHasImprovedScore = Boolean(data.hasImprovedScore);
      userDisplayName = data.displayName || user.displayName || (user.email ? user.email.split('@')[0] : 'Lector/a');
      userSchool = data.school || '';
      userTeacherUid = data.teacherUid || '';
      userClassGroup = data.classGroup || '';
      userTeacherGroups = Array.isArray(data.teacherGroups) ? data.teacherGroups : [];
    } else {
      const defaultRole = user.email === ADMIN_SUPREMO_EMAIL ? 'docent' : 'alumne';
      const defaultName = user.displayName || (user.email ? user.email.split('@')[0] : 'Lector/a');
      const newProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: defaultName,
        role: defaultRole,
        points: 0,
        completedReadings: [],
        scores: {},
        readingHistory: {},
        taxonomyStats: { literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 },
        hasImprovedScore: false,
        school: '',
        teacherUid: '',
        classGroup: '',
        teacherGroups: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await userRef.set(newProfile);
      userPoints = 0;
      userRole = defaultRole;
      userCompletedReadings = [];
      userScores = {};
      userReadingHistory = {};
      userTaxonomyStats = { literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 };
      userHasImprovedScore = false;
      userDisplayName = defaultName;
      userSchool = '';
      userTeacherUid = '';
      userClassGroup = '';
      userTeacherGroups = [];
    }
  } catch (err) {
    console.warn("Error carregant perfil:", err);
  }
}

if (auth) {
  auth.onAuthStateChanged(async function(user) {
    currentUser = user;
    if (user) {
      await loadOrCreateUserProfile(user);
    } else {
      userPoints = 0;
      userRole = 'alumne';
      userCompletedReadings = [];
      userScores = {};
      userReadingHistory = {};
      userTaxonomyStats = { literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 };
      userHasImprovedScore = false;
      userDisplayName = '';
      userSchool = '';
      userTeacherUid = '';
      userClassGroup = '';
      userTeacherGroups = [];
      filterMyLectures = false;
    }
    renderNavActions();
    renderMotivationBanner();
    if (!isInitialRouteDone) {
      isInitialRouteDone = true;
      renderCatalog();
    } else {
      renderCatalog();
    }
  });
}

// -------------------------------------------------------------------------
// 2. MODAL D'INICI DE SESSIÓ I REGISTRE
// -------------------------------------------------------------------------

function openAuthModal(defaultTab) {
  const tab = defaultTab || 'login';
  const container = document.getElementById('auth-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div onclick="closeAuthModal()" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div onclick="event.stopPropagation()" class="bg-white rounded-3xl max-w-md w-full p-6 md:p-7 shadow-2xl border border-slate-200 relative">
        <button onclick="closeAuthModal()" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="text-center mb-5">
          <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 text-xl">
            <i class="fa-solid fa-book-open-reader"></i>
          </div>
          <h2 class="text-xl font-extrabold text-slate-800">Benvingut/da a Lectura Aventura</h2>
          <p class="text-xs text-slate-500 mt-1">Desa el teu progrés, guanya medalles o crea lectures per a l'aula</p>
        </div>

        <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-5">
          <button type="button" id="tab-btn-login" onclick="switchAuthTab('login')" class="py-2 rounded-lg text-xs font-bold transition ${tab === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}">Iniciar sessió</button>
          <button type="button" id="tab-btn-register" onclick="switchAuthTab('register')" class="py-2 rounded-lg text-xs font-bold transition ${tab === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}">Crear compte</button>
        </div>

        <div id="auth-error-msg" class="hidden mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"></div>

        <form id="form-login" onsubmit="handleLoginSubmit(event)" class="space-y-3.5 ${tab === 'login' ? '' : 'hidden'}">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Correu electrònic</label>
            <input type="email" id="login-email" required placeholder="nom@escola.cat" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Contrasenya</label>
            <input type="password" id="login-password" required placeholder="••••••••" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-sm">
          </div>
          <button type="submit" id="btn-submit-login" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-md">
            Entrar a l'aventura
          </button>
          <div class="text-center">
            <button type="button" onclick="handlePasswordReset()" class="text-xs text-indigo-600 hover:underline font-medium">Has oblidat la contrasenya?</button>
          </div>
        </form>

        <form id="form-register" onsubmit="handleRegisterSubmit(event)" class="space-y-3 ${tab === 'register' ? '' : 'hidden'}">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nom o sobrenom visible</label>
            <input type="text" id="reg-name" required placeholder="Ex: Laia M." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Sóc...</label>
            <select id="reg-role" onchange="toggleTeacherCodeField(this.value)" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-sm bg-white">
              <option value="alumne">🎒 Alumne / Alumna</option>
              <option value="docent">👩‍🏫 Docent / Mestre / Professorat</option>
            </select>
          </div>
          <div id="reg-teacher-code-box">
            <label class="block text-xs font-bold text-slate-700 mb-1">Codi del teu docent <span class="text-slate-400 font-normal">(opcional)</span></label>
            <input type="text" id="reg-teacher-uid" placeholder="Enganxa el codi que t'ha donat el/la mestre/a" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Correu electrònic</label>
            <input type="email" id="reg-email" required placeholder="correu@exemple.cat" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Contrasenya (mínim 6 caràcters)</label>
            <input type="password" id="reg-password" required minlength="6" placeholder="••••••••" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-sm">
          </div>
          <button type="submit" id="btn-submit-register" class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-md">
            Crear el meu compte
          </button>
        </form>
      </div>
    </div>
  `;
}

function closeAuthModal() {
  const container = document.getElementById('auth-modal-container');
  if (container) container.innerHTML = '';
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('form-login');
  const regForm = document.getElementById('form-register');
  const loginBtn = document.getElementById('tab-btn-login');
  const regBtn = document.getElementById('tab-btn-register');
  const errBox = document.getElementById('auth-error-msg');
  if (errBox) errBox.classList.add('hidden');

  if (tab === 'login') {
    if (loginForm) loginForm.classList.remove('hidden');
    if (regForm) regForm.classList.add('hidden');
    if (loginBtn) loginBtn.className = 'py-2 rounded-lg text-xs font-bold transition bg-white text-indigo-700 shadow-sm';
    if (regBtn) regBtn.className = 'py-2 rounded-lg text-xs font-bold transition text-slate-600';
  } else {
    if (loginForm) loginForm.classList.add('hidden');
    if (regForm) regForm.classList.remove('hidden');
    if (regBtn) regBtn.className = 'py-2 rounded-lg text-xs font-bold transition bg-white text-indigo-700 shadow-sm';
    if (loginBtn) loginBtn.className = 'py-2 rounded-lg text-xs font-bold transition text-slate-600';
  }
}

function toggleTeacherCodeField(roleVal) {
  const box = document.getElementById('reg-teacher-code-box');
  if (!box) return;
  if (roleVal === 'alumne') box.classList.remove('hidden');
  else box.classList.add('hidden');
}

function showAuthError(msg) {
  const errBox = document.getElementById('auth-error-msg');
  if (!errBox) return;
  errBox.textContent = msg;
  errBox.classList.remove('hidden');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = (document.getElementById('login-email').value || '').trim();
  const password = document.getElementById('login-password').value || '';
  const btn = document.getElementById('btn-submit-login');
  if (btn) btn.disabled = true;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
  } catch (err) {
    showAuthError("No s'ha pogut iniciar sessió: " + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = (document.getElementById('reg-name').value || '').trim();
  const role = document.getElementById('reg-role').value || 'alumne';
  const teacherUid = (document.getElementById('reg-teacher-uid').value || '').trim();
  const email = (document.getElementById('reg-email').value || '').trim();
  const password = document.getElementById('reg-password').value || '';
  const btn = document.getElementById('btn-submit-register');
  if (btn) btn.disabled = true;

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    const finalRole = email === ADMIN_SUPREMO_EMAIL ? 'docent' : role;
    await db.collection('users').doc(cred.user.uid).set({
      uid: cred.user.uid,
      email: email,
      displayName: name,
      role: finalRole,
      points: 0,
      completedReadings: [],
      scores: {},
      readingHistory: {},
      taxonomyStats: { literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 },
      hasImprovedScore: false,
      school: '',
      teacherUid: finalRole === 'alumne' ? teacherUid : '',
      classGroup: '',
      teacherGroups: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await loadOrCreateUserProfile(cred.user);
    renderNavActions();
    renderMotivationBanner();
    closeAuthModal();
  } catch (err) {
    showAuthError("Error creant el compte: " + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handlePasswordReset() {
  const email = (document.getElementById('login-email').value || '').trim();
  if (!email) {
    showAuthError("Escriu primer el teu correu electrònic al camp de dalt.");
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    alert("📧 T'hem enviat un correu per restablir la contrasenya a " + email);
  } catch (err) {
    showAuthError("Error enviant el correu: " + err.message);
  }
}

async function handleLogout() {
  stopSpeechPlayback();
  if (auth) await auth.signOut();
  resetFiltersAndRenderCatalog();
}

// -------------------------------------------------------------------------
// 3. BARRA SUPERIOR (NAV) I BANNER MOTIVACIONAL
// -------------------------------------------------------------------------

function renderNavActions() {
  const nav = document.getElementById('nav-actions');
  if (!nav) return;

  if (!currentUser) {
    nav.innerHTML = `
      <button onclick="openLeaderboardSafely()" class="text-indigo-100 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition" title="Classificació">
        <i class="fa-solid fa-trophy text-amber-300"></i>
        <span class="hidden sm:inline">Rànquing</span>
      </button>
      <button onclick="openFoldersSafely()" class="text-indigo-100 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition" title="Carpetes i Situacions d'Aprenentatge">
        <i class="fa-solid fa-folder-open text-amber-300"></i>
        <span class="hidden sm:inline">Carpetes / SA</span>
      </button>
      <button onclick="openAuthModal('login')" class="bg-amber-400 hover:bg-amber-300 text-indigo-950 font-extrabold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition">
        <i class="fa-solid fa-right-to-bracket"></i>
        <span>Entra / Registra't</span>
      </button>
    `;
    return;
  }

  const isTeacher = isUserAdminOrCreator();
  const rankData = getStudentRankInfo(userPoints);

  nav.innerHTML = `
    <button onclick="openFoldersSafely()" class="text-indigo-100 hover:text-white hover:bg-indigo-500/50 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition" title="Carpetes i SA">
      <i class="fa-solid fa-folder-open text-amber-300"></i>
      <span class="hidden md:inline">Carpetes / SA</span>
    </button>

    <button onclick="openLeaderboardSafely()" class="text-indigo-100 hover:text-white hover:bg-indigo-500/50 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition" title="Classificació">
      <i class="fa-solid fa-trophy text-amber-300"></i>
      <span class="hidden md:inline">Rànquing</span>
    </button>

    ${isTeacher ? `
      <button onclick="openTeacherStudentsSafely()" class="text-indigo-100 hover:text-white hover:bg-indigo-500/50 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition" title="Seguiment d'alumnes">
        <i class="fa-solid fa-users text-emerald-300"></i>
        <span class="hidden lg:inline">Alumnes</span>
      </button>
      <button onclick="openFeedbackSafely()" class="text-indigo-100 hover:text-white hover:bg-indigo-500/50 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition" title="Bústia de suggeriments">
        <i class="fa-solid fa-envelope-open-text text-sky-300"></i>
        <span class="hidden lg:inline">Bústia</span>
      </button>
      <button onclick="openEditorSafely(null)" class="bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition">
        <i class="fa-solid fa-plus"></i>
        <span class="hidden sm:inline">Nova Lectura</span>
      </button>
    ` : ''}

    <button onclick="openProfileModal()" class="bg-indigo-700 hover:bg-indigo-800 border border-indigo-400/50 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm" title="Obrir el meu Passaport Lector">
      <i class="fa-solid ${rankData.current.icon} text-amber-300"></i>
      <span class="max-w-[100px] truncate">${escapeHtmlSafe(userDisplayName || 'Passaport')}</span>
      <span class="bg-amber-400 text-indigo-950 font-extrabold px-1.5 py-0.5 rounded-md text-[11px]">${userPoints} pts</span>
    </button>
  `;
}

function renderMotivationBanner() {
  const banner = document.getElementById('motivation-banner');
  if (!banner) return;

  if (!currentUser) {
    banner.innerHTML = `
      <div class="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-center text-xs text-indigo-900">
        <span>👋 Estàs navegant en <strong>mode exploració</strong>. </span>
        <button onclick="openAuthModal('login')" class="underline font-bold text-indigo-700 hover:text-indigo-950">Inicia sessió</button>
        <span> per desar les teves notes, punts i medalles al Passaport Lector!</span>
      </div>
    `;
    return;
  }

  if (isUserAdminOrCreator()) {
    const myCount = cachedLecturesList.filter(function(l) { return l.authorUid === currentUser.uid; }).length;
    const tRank = getTeacherRankInfo(myCount);
    banner.innerHTML = `
      <div class="bg-slate-100 border-b border-slate-200 px-4 py-1.5">
        <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
          <div class="flex items-center gap-2">
            <span class="font-bold text-indigo-800">${tRank.current.name}</span>
            <span class="text-slate-400">•</span>
            <span class="italic text-slate-500">${tRank.current.subtext}</span>
          </div>
          <div class="flex items-center gap-3">
            <span>Codi docent per als alumnes: <code class="bg-white px-2 py-0.5 rounded border border-slate-300 font-mono font-bold text-indigo-700 select-all">${currentUser.uid}</code></span>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const rank = getStudentRankInfo(userPoints);
  const progressText = rank.next
    ? `Et falten <strong>${rank.next.min - userPoints} punts</strong> per assolir <strong>${rank.next.name}</strong>!`
    : `Has assolit el rang màxim: <strong>${rank.current.name}</strong>!`;

  banner.innerHTML = `
    <div class="bg-gradient-to-r from-indigo-50 via-amber-50/60 to-indigo-50 border-b border-indigo-100 px-4 py-2">
      <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded-full border font-bold ${rank.current.badgeBg}">${rank.current.name}</span>
          <span>${progressText}</span>
        </div>
        <div class="font-bold text-indigo-700">
          <i class="fa-solid fa-book-bookmark mr-1"></i>${userCompletedReadings.length} lectures completades
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------------------
//