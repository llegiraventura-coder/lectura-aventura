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
// 4. PASSAPORT LECTOR I PERFIL D'USUARI
// -------------------------------------------------------------------------

function computeStudentBadges() {
  const completedCount = userCompletedReadings.length;
  const scoresList = Object.values(userScores || {}).map(Number);
  const hasPerfectScore = scoresList.some(function(s) { return s >= 10; });

  return [
    { id: 'first', name: 'Primera Aventura', desc: 'Completa la teva primera lectura', icon: 'fa-flag-checkered', unlocked: completedCount >= 1 },
    { id: 'five', name: 'Lector/a Constant', desc: 'Completa 5 lectures diferents', icon: 'fa-fire', unlocked: completedCount >= 5 },
    { id: 'perfect', name: 'Nota Excel·lent (10)', desc: 'Aconsegueix un 10 en una lectura', icon: 'fa-star', unlocked: hasPerfectScore },
    { id: 'improve', name: 'Esperit de Superació', desc: 'Millora la teva nota repetint una lectura', icon: 'fa-arrow-trend-up', unlocked: userHasImprovedScore },
    { id: 'literal', name: 'Ull de Falcó', desc: '5 encerts en preguntes literals', icon: 'fa-magnifying-glass', unlocked: (userTaxonomyStats.literal || 0) >= 5 },
    { id: 'inferential', name: 'Detectiu de Pistes', desc: '5 encerts en preguntes inferencials', icon: 'fa-lightbulb', unlocked: (userTaxonomyStats.inferential || 0) >= 5 },
    { id: 'figurative', name: 'Mestre/a de Dites', desc: '3 encerts en sentit figurat', icon: 'fa-comments', unlocked: (userTaxonomyStats.figurative || 0) >= 3 },
    { id: 'opinion', name: 'Veu Crítica', desc: '3 encerts en preguntes d\'opinió o creatives', icon: 'fa-scale-balanced', unlocked: ((userTaxonomyStats.opinion || 0) + (userTaxonomyStats.creative || 0)) >= 3 }
  ];
}

function openProfileModal() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }
  const container = document.getElementById('profile-modal-container');
  if (!container) return;

  const isTeacher = isUserAdminOrCreator();
  const rank = getStudentRankInfo(userPoints);
  const badges = computeStudentBadges();

  let pct = 100;
  if (rank.next) {
    const span = rank.next.min - rank.current.min;
    pct = Math.min(100, Math.max(5, Math.round(((userPoints - rank.current.min) / span) * 100)));
  }

  const badgesHtml = badges.map(function(b) {
    return `<div class="p-3 rounded-2xl border text-center transition ${b.unlocked ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm' : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'}">
      <div class="w-9 h-9 rounded-full mx-auto mb-1.5 flex items-center justify-center ${b.unlocked ? 'bg-amber-400 text-amber-950' : 'bg-slate-200 text-slate-400'}">
        <i class="fa-solid ${b.icon}"></i>
      </div>
      <div class="font-bold text-xs leading-tight">${b.name}</div>
      <div class="text-[10px] mt-0.5 leading-tight">${b.desc}</div>
    </div>`;
  }).join('');

  const taxBarsHtml = Object.keys(TAXONOMY_CONFIG).map(function(key) {
    const cfg = TAXONOMY_CONFIG[key];
    const count = Number(userTaxonomyStats[key]) || 0;
    const barW = Math.min(100, count * 10);
    return `<div class="space-y-1">
      <div class="flex justify-between text-xs font-bold text-slate-700">
        <span><i class="fa-solid ${cfg.icon} mr-1"></i>${cfg.label}</span>
        <span>${count} encerts</span>
      </div>
      <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div class="h-full bg-indigo-600 rounded-full" style="width:${barW}%"></div>
      </div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div onclick="closeProfileModal()" class="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div onclick="event.stopPropagation()" class="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto">
        <button onclick="closeProfileModal()" class="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-slate-200">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-br ${rank.current.color} text-white flex items-center justify-center text-2xl shadow-lg shrink-0">
            <i class="fa-solid ${rank.current.icon}"></i>
          </div>
          <div class="flex-grow">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-2xl font-extrabold text-slate-800">${escapeHtmlSafe(userDisplayName)}</h2>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border ${rank.current.badgeBg}">${rank.current.name}</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">${escapeHtmlSafe(currentUser.email)} • <strong>${userPoints} punts totals</strong> • ${userCompletedReadings.length} lectures completades</p>
            <div class="mt-3 max-w-md">
              <div class="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                <span>Progrés de rang</span>
                <span>${rank.next ? userPoints + ' / ' + rank.next.min + ' pts' : 'Nivell Màxim!'}</span>
              </div>
              <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div class="h-full bg-amber-400 rounded-full transition-all" style="width:${pct}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-slate-200">
          <div>
            <h3 class="font-extrabold text-sm text-slate-800 mb-3 flex items-center gap-2">
              <i class="fa-solid fa-medal text-amber-500"></i> Les meves Medalles
            </h3>
            <div class="grid grid-cols-2 gap-2.5">${badgesHtml}</div>
          </div>

          <div class="space-y-4">
            <h3 class="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-chart-simple text-indigo-600"></i> Habilitats de Comprensió
            </h3>
            <div class="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              ${taxBarsHtml}
            </div>
          </div>
        </div>

        <form onsubmit="saveProfileChanges(event)" class="pt-6 space-y-4">
          <h3 class="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-user-gear text-slate-600"></i> Dades del Perfil i Vinculació d'Aula
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Nom visible</label>
              <input type="text" id="prof-display-name" value="${escapeHtmlAttr(userDisplayName)}" required class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Centre educatiu</label>
              <input type="text" id="prof-school" value="${escapeHtmlAttr(userSchool)}" placeholder="Ex: Escola Els Til·lers" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
            </div>
            ${!isTeacher ? `
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Codi del docent (UID)</label>
                <input type="text" id="prof-teacher-uid" value="${escapeHtmlAttr(userTeacherUid)}" placeholder="Enganxa el codi del teu mestre/a" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">Grup / Classe</label>
                <input type="text" id="prof-class-group" value="${escapeHtmlAttr(userClassGroup)}" placeholder="Ex: 5è A" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
              </div>
            ` : `
              <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-slate-700 mb-1">Els meus grups classe (separats per comes)</label>
                <input type="text" id="prof-teacher-groups" value="${escapeHtmlAttr((userTeacherGroups || []).join(', '))}" placeholder="Ex: 4t A, 4t B, 5è A" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
              </div>
            `}
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div class="flex flex-wrap items-center gap-2">
              <button type="submit" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition">
                <i class="fa-solid fa-floppy-disk mr-1"></i> Desar canvis
              </button>
              ${isTeacher ? `
                <button type="button" onclick="configureAiRubricEndpoint()" class="px-4 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs transition">
                  <i class="fa-solid fa-robot mr-1"></i> Configurar IA Gemini
                </button>
              ` : ''}
            </div>
            <button type="button" onclick="closeProfileModal(); handleLogout();" class="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition">
              <i class="fa-solid fa-right-from-bracket mr-1"></i> Tancar sessió
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function closeProfileModal() {
  const container = document.getElementById('profile-modal-container');
  if (container) container.innerHTML = '';
}

async function saveProfileChanges(e) {
  e.preventDefault();
  if (!currentUser || !db) return;

  const newName = (document.getElementById('prof-display-name').value || '').trim();
  const newSchool = (document.getElementById('prof-school').value || '').trim();
  const isTeacher = isUserAdminOrCreator();

  const updatePayload = {
    displayName: newName || userDisplayName,
    school: newSchool
  };

  if (!isTeacher) {
    const tUid = (document.getElementById('prof-teacher-uid').value || '').trim();
    const cGrp = (document.getElementById('prof-class-group').value || '').trim();
    updatePayload.teacherUid = tUid;
    updatePayload.classGroup = cGrp;
    userTeacherUid = tUid;
    userClassGroup = cGrp;
  } else {
    const rawGroups = (document.getElementById('prof-teacher-groups').value || '');
    const parsedGroups = rawGroups.split(',').map(function(g) { return g.trim(); }).filter(Boolean);
    updatePayload.teacherGroups = parsedGroups;
    userTeacherGroups = parsedGroups;
  }

  try {
    await db.collection('users').doc(currentUser.uid).update(updatePayload);
    userDisplayName = updatePayload.displayName;
    userSchool = updatePayload.school;
    renderNavActions();
    renderMotivationBanner();
    closeProfileModal();
    alert("✅ Perfil actualitzat correctament!");
  } catch (err) {
    alert("Error desant el perfil: " + err.message);
  }
}

// -------------------------------------------------------------------------
// 5. CATÀLEG DE LECTURES I FILTRES
// -------------------------------------------------------------------------

function resetFiltersAndRenderCatalog() {
  stopSpeechPlayback();
  filterSearch = "";
  filterBookAuthor = "";
  filterType = "all";
  filterLevel = "all";
  filterCategory = "all";
  filterStatus = "all";
  filterDuration = "all";
  filterMyLectures = false;
  renderCatalog();
}

async function fetchAllReadingsFromFirestore() {
  if (!db) return [];
  const snapshot = await withTimeout(db.collection(DB_COLLECTION).get(), 9000, 'càrrega del catàleg');
  const list = [];
  snapshot.forEach(function(doc) {
    const d = doc.data();
    list.push(Object.assign({ id: doc.id }, d));
  });
  list.sort(function(a, b) {
    const numA = Number(a.codeNumber) || 0;
    const numB = Number(b.codeNumber) || 0;
    if (numB !== numA) return numB - numA;
    const tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
    const tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
    return tB - tA;
  });
  cachedLecturesList = list;
  return list;
}

function applyCatalogFilters(lectures) {
  return lectures.filter(function(item) {
    if (filterMyLectures && currentUser && item.authorUid !== currentUser.uid) {
      return false;
    }

    if (filterSearch) {
      const q = filterSearch.toLowerCase().trim();
      const codeStr = formatReadingCode(item.codeNumber).toLowerCase();
      const titleStr = (item.title || '').toLowerCase();
      const authorStr = (item.bookAuthor || item.authorName || '').toLowerCase();
      if (!titleStr.includes(q) && !codeStr.includes(q) && !authorStr.includes(q)) {
        return false;
      }
    }

    if (filterType !== 'all' && (item.textType || '') !== filterType) {
      return false;
    }

    if (filterLevel !== 'all' && (item.level || '') !== filterLevel) {
      return false;
    }

    if (filterDuration !== 'all' && (item.duration || '') !== filterDuration) {
      return false;
    }

    if (filterStatus !== 'all') {
      const isDone = userCompletedReadings.includes(item.id);
      const score = userScores[item.id];
      if (filterStatus === 'completed' && !isDone) return false;
      if (filterStatus === 'pending' && isDone) return false;
      if (filterStatus === 'improvable' && (!isDone || Number(score) >= 8)) return false;
    }

    return true;
  });
}

async function renderCatalog() {
  stopSpeechPlayback();
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="text-center py-12">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-600"></i>
      <p class="mt-2 text-slate-500 text-sm font-medium">Carregant biblioteca de lectures...</p>
    </div>
  `;

  try {
    const allReadings = await fetchAllReadingsFromFirestore();
    renderMotivationBanner();
    const filtered = applyCatalogFilters(allReadings);
    const isTeacher = isUserAdminOrCreator();

    const cardsHtml = filtered.length === 0
      ? `<div class="col-span-full bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
          <i class="fa-solid fa-book-open text-4xl text-slate-300"></i>
          <h3 class="font-bold text-slate-700 text-lg">No s'han trobat lectures amb aquests filtres</h3>
          <p class="text-xs text-slate-500">Prova de netejar la cerca o canviar el cicle educatiu.</p>
          <button onclick="resetFiltersAndRenderCatalog()" class="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs">Mostrar totes les lectures</button>
        </div>`
      : filtered.map(function(r) {
          const isCompleted = userCompletedReadings.includes(r.id);
          const myScore = userScores[r.id];
          const canEdit = currentUser && (currentUser.email === ADMIN_SUPREMO_EMAIL || r.authorUid === currentUser.uid);
          const hasDua = Boolean(r.parentReadingId || r.isDuaAdaptation);

          return `<div class="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
            <div>
              ${r.coverImage ? `
                <div class="h-36 w-full bg-slate-100 overflow-hidden relative">
                  <img src="${escapeHtmlAttr(r.coverImage)}" alt="${escapeHtmlAttr(r.title)}" class="w-full h-full object-cover">
                  <span class="absolute top-2.5 left-2.5 bg-slate-900/80 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">${formatReadingCode(r.codeNumber)}</span>
                  ${isCompleted ? `<span class="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow"><i class="fa-solid fa-check mr-1"></i>Nota: ${myScore}/10</span>` : ''}
                </div>
              ` : `
                <div class="px-5 pt-4 flex items-center justify-between gap-2">
                  <span class="bg-slate-100 text-slate-600 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">${formatReadingCode(r.codeNumber)}</span>
                  ${isCompleted ? `<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full"><i class="fa-solid fa-check mr-1"></i>Nota: ${myScore}/10</span>` : ''}
                </div>
              `}

              <div class="p-5 ${r.coverImage ? 'pt-4' : 'pt-3'}">
                <div class="flex flex-wrap items-center gap-1.5 mb-2">
                  ${r.level ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">${escapeHtmlSafe(r.level)}</span>` : ''}
                  ${r.textType ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">${escapeHtmlSafe(r.textType)}</span>` : ''}
                  ${hasDua ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300" title="Lectura adaptada DUA"><i class="fa-solid fa-universal-access mr-1"></i>DUA</span>` : ''}
                </div>

                <h3 class="font-extrabold text-slate-800 text-lg leading-snug line-clamp-2 mb-1">${escapeHtmlSafe(r.title || 'Sense títol')}</h3>
                <p class="text-xs text-slate-500 mb-3">
                  ${r.bookAuthor ? `<i class="fa-solid fa-feather-pointed mr-1"></i>${escapeHtmlSafe(r.bookAuthor)}` : `Creat per ${escapeHtmlSafe(r.authorName || 'Docent')}`}
                  ${r.duration ? ` • <i class="fa-regular fa-clock ml-1 mr-0.5"></i>${escapeHtmlSafe(r.duration)}` : ''}
                </p>
              </div>
            </div>

            <div class="px-5 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <button onclick="openReaderSafely('${r.id}')" class="flex-grow py-2.5 px-4 rounded-xl ${isCompleted ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm">
                <i class="fa-solid ${isCompleted ? 'fa-rotate-right' : 'fa-book-open'}"></i>
                <span>${isCompleted ? 'Tornar a llegir' : 'Començar lectura'}</span>
              </button>

              ${isTeacher ? `
                <div class="flex items-center gap-1">
                  <button onclick="openCloneSafely('${r.id}')" class="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs transition" title="Clonar o crear adaptació DUA">
                    <i class="fa-solid fa-clone"></i>
                  </button>
                  ${canEdit ? `
                    <button onclick="openEditorSafely('${r.id}')" class="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs transition" title="Editar lectura">
                      <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="deleteReadingFromCatalog('${r.id}', '${escapeHtmlAttr(r.title)}')" class="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs transition" title="Eliminar lectura">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          </div>`;
        }).join('');

    app.innerHTML = `
      <div class="space-y-6">
        <div class="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-extrabold text-slate-800">Biblioteca de Lectures</h1>
              <p class="text-xs text-slate-500">Mostrant <strong>${filtered.length}</strong> de ${allReadings.length} aventures disponibles</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              ${isTeacher ? `
                <button onclick="toggleMyLecturesFilter()" class="px-3.5 py-2 rounded-xl text-xs font-bold border transition ${filterMyLectures ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'}">
                  <i class="fa-solid fa-user-pen mr-1"></i> Les meves lectures
                </button>
              ` : ''}
              <button onclick="resetFiltersAndRenderCatalog()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
                <i class="fa-solid fa-filter-circle-xmark mr-1"></i> Netejar filtres
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <div class="lg:col-span-2 relative">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
              <input type="text" value="${escapeHtmlAttr(filterSearch)}" oninput="onCatalogFilterChange('search', this.value)" placeholder="Cerca per títol, autor o codi #CL-00001..." class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs">
            </div>

            <select onchange="onCatalogFilterChange('level', this.value)" class="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium">
              <option value="all" ${filterLevel === 'all' ? 'selected' : ''}>Tots els nivells</option>
              <option value="Cicle Inicial" ${filterLevel === 'Cicle Inicial' ? 'selected' : ''}>Cicle Inicial (1r-2n)</option>
              <option value="Cicle Mitjà" ${filterLevel === 'Cicle Mitjà' ? 'selected' : ''}>Cicle Mitjà (3r-4t)</option>
              <option value="Cicle Superior" ${filterLevel === 'Cicle Superior' ? 'selected' : ''}>Cicle Superior (5è-6è)</option>
              <option value="ESO" ${filterLevel === 'ESO' ? 'selected' : ''}>ESO</option>
            </select>

            <select onchange="onCatalogFilterChange('type', this.value)" class="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium">
              <option value="all" ${filterType === 'all' ? 'selected' : ''}>Tots els tipus de text</option>
              <option value="Narratiu" ${filterType === 'Narratiu' ? 'selected' : ''}>Narratiu</option>
              <option value="Informatiu" ${filterType === 'Informatiu' ? 'selected' : ''}>Informatiu / Expositiu</option>
              <option value="Poètic" ${filterType === 'Poètic' ? 'selected' : ''}>Poètic</option>
              <option value="Teatral" ${filterType === 'Teatral' ? 'selected' : ''}>Teatral</option>
              <option value="Instructiu" ${filterType === 'Instructiu' ? 'selected' : ''}>Instructiu</option>
              <option value="Argumentatiu" ${filterType === 'Argumentatiu' ? 'selected' : ''}>Argumentatiu</option>
            </select>

            <select onchange="onCatalogFilterChange('status', this.value)" class="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-medium">
              <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>Qualsevol estat</option>
              <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>Pendents de llegir</option>
              <option value="completed" ${filterStatus === 'completed' ? 'selected' : ''}>Ja completades</option>
              <option value="improvable" ${filterStatus === 'improvable' ? 'selected' : ''}>Per millorar nota (&lt; 8)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${cardsHtml}
        </div>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<div class="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-center space-y-3">
      <p class="font-bold">Error carregant el catàleg: ${escapeHtmlSafe(err.message)}</p>
      <button onclick="renderCatalog()" class="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs">Tornar a intentar</button>
    </div>`;
  }
}

function onCatalogFilterChange(field, val) {
  if (field === 'search') filterSearch = val;
  else if (field === 'level') filterLevel = val;
  else if (field === 'type') filterType = val;
  else if (field === 'status') filterStatus = val;
  else if (field === 'duration') filterDuration = val;
  renderCatalog();
}

function toggleMyLecturesFilter() {
  filterMyLectures = !filterMyLectures;
  renderCatalog();
}

async function deleteReadingFromCatalog(docId, title) {
  if (!confirm('Segur que vols eliminar la lectura "' + title + '"? Aquesta acció no es pot desfer.')) return;
  try {
    await db.collection(DB_COLLECTION).doc(docId).delete();
    renderCatalog();
  } catch (err) {
    alert("Error eliminant la lectura: " + err.message);
  }
}

// -------------------------------------------------------------------------
// 6. PONT SEGUR AMB ELS CAPÍTOLS 4 I 5 + HISTORIAL DE VERSIONS
// -------------------------------------------------------------------------

function openReaderSafely(docId) {
  if (typeof openReader === 'function') openReader(docId);
  else alert("El capítol 4 (4-editor-lector.js) encara no s'ha carregat al repositori.");
}

function openEditorSafely(docId) {
  if (typeof openEditor === 'function') openEditor(docId);
  else alert("El capítol 4 (4-editor-lector.js) encara no s'ha carregat al repositori.");
}

function openCloneSafely(docId) {
  if (typeof openCloneModal === 'function') openCloneModal(docId);
  else alert("El capítol 4 (4-editor-lector.js) encara no s'ha carregat al repositori.");
}

function openFoldersSafely() {
  if (typeof renderFoldersView === 'function') renderFoldersView();
  else alert("El capítol 5 (5-docents-comunitat.js) encara no s'ha carregat al repositori.");
}

function openLeaderboardSafely() {
  if (typeof renderLeaderboardView === 'function') renderLeaderboardView();
  else alert("El capítol 5 (5-docents-comunitat.js) encara no s'ha carregat al repositori.");
}

function openTeacherStudentsSafely() {
  if (typeof renderTeacherStudentsView === 'function') renderTeacherStudentsView();
  else alert("El capítol 5 (5-docents-comunitat.js) encara no s'ha carregat al repositori.");
}

function openFeedbackSafely() {
  if (typeof openFeedbackModal === 'function') openFeedbackModal();
  else alert("El capítol 5 (5-docents-comunitat.js) encara no s'ha carregat al repositori.");
}

function renderChangelogPage() {
  stopSpeechPlayback();
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
      <div class="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <span class="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">Registre de canvis</span>
          <h1 class="text-2xl font-extrabold text-slate-800 mt-2">Historial de Versions</h1>
        </div>
        <button onclick="resetFiltersAndRenderCatalog()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
          <i class="fa-solid fa-arrow-left mr-1"></i> Tornar al catàleg
        </button>
      </div>

      <div class="space-y-5 text-sm text-slate-700">
        <div class="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
          <div class="flex items-center justify-between mb-1">
            <span class="font-mono font-extrabold text-indigo-900">v0.42.0 — Arquitectura Modular</span>
            <span class="text-xs text-indigo-700 font-bold">Actual</span>
          </div>
          <ul class="list-disc pl-5 space-y-1 text-xs text-slate-700">
            <li>Separació neta de l'aplicació en 1 HTML i 5 mòduls JavaScript independents per facilitar el manteniment a GitHub.</li>
            <li>Motor d'avaluació amb Gemini 2.5 Flash i fallback local automàtic per a preguntes obertes.</li>
            <li>Millores d'accessibilitat DUA: font OpenDyslexic, temes sèpia/fosc, lectura en veu alta en català i Mode Aula PDI.</li>
          </ul>
        </div>

        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <span class="font-mono font-bold text-slate-800">v0.40.0 — Carpetes SA i Passaport Lector</span>
          <ul class="list-disc pl-5 space-y-1 text-xs text-slate-600 mt-1">
            <li>Agrupació de lectures per Situacions d'Aprenentatge (SA) i itineraris d'aula.</li>
            <li>Passaport Lector amb medalles per taxonomia de comprensió lectora (Literal, Inferencial, Sentit Figurat, Opinió i Creativa).</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}