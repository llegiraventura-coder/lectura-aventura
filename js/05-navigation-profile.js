function routeInitialView() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  if (urlLang === 'en' || urlLang === 'ca') {
    currentLang = urlLang;
    try { localStorage.setItem('lectura_aventura_lang', currentLang); } catch (e) {}
    document.documentElement.lang = currentLang;
    renderNav();
  }
  const directFolderId = urlParams.get('carpeta');
  const directReadingId = urlParams.get('lectura');
  const viewChangelog = urlParams.get('changelog');

  if (viewChangelog) {
    renderChangelogPage();
  } else if (directFolderId) {
    renderFolderView(directFolderId);
  } else if (directReadingId) {
    renderReader(directReadingId);
  } else if (currentUser && (!userDisplayName || (userRole !== 'adult' && !userSchool))) {
    renderEditProfileDataModal();
    renderCatalog();
  } else {
    renderCatalog();
  }
}

if (auth) {
  auth.onAuthStateChanged(async function(user) {
    currentUser = user;
    if (user) {
      await loadUserData();
    } else {
      userPoints = 0;
      userRole = 'alumne';
      userCompletedReadings = [];
      userScores = {};
      userReadingHistory = {};
      userTaxonomyStats = { literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 };
      userHasImprovedScore = false;
      userDisplayName = "";
      userSchool = "";
      userTeacherUid = "";
      userClassGroup = "";
      userTeacherGroups = [];
      selectedClassroomFilter = "all";
      filterMyLectures = false;
    }
    renderNav();
    if (!isInitialRouteDone || user) {
      isInitialRouteDone = true;
      routeInitialView();
    }
  }, function(authErr) {
    console.warn("Auth state warning:", authErr);
    renderNav();
    if (!isInitialRouteDone) {
      isInitialRouteDone = true;
      routeInitialView();
    }
  });
}

setTimeout(function() {
  if (!isInitialRouteDone) {
    isInitialRouteDone = true;
    renderNav();
    routeInitialView();
  }
}, 1200);

async function loadUserData() {
  if (!currentUser || !db) return;
  try {
    const doc = await withTimeout(db.collection("users").doc(currentUser.uid).get(), 5000, "perfil d'usuari");
    if (doc.exists) {
      const data = doc.data();
      userPoints = data.points !== undefined ? data.points : 0;
      let role = data.role || 'alumne';
      if (role === 'mestre') role = 'docent';
      if (currentUser.email === ADMIN_SUPREMO_EMAIL && role === 'alumne') role = 'docent';
      userRole = role;
      userCompletedReadings = data.completedReadings || [];
      userScores = data.scores || {};
      userReadingHistory = data.readingHistory || {};
      userTaxonomyStats = Object.assign({ literal: 0, inferential: 0, figurative: 0, opinion: 0, creative: 0 }, data.taxonomyStats || {});
      userHasImprovedScore = !!data.hasImprovedScore;
      userDisplayName = data.displayName || "";
      userSchool = data.school || "";
      userTeacherUid = data.teacherUid || "";
      userClassGroup = data.classGroup || "";
      userTeacherGroups = Array.isArray(data.teacherGroups) ? data.teacherGroups : [];
      teacherAssignedReadingsMap = Object.assign({}, data.teacherAssignedReadings || data.assignedReadingsByGroup || {});
      userAssignedReadings = Array.isArray(data.assignedReadings) ? data.assignedReadings : [];
      if (userTeacherUid && userClassGroup) {
        try {
          db.collection("users").doc(userTeacherUid).get().then(function(tDoc) {
            if (tDoc.exists) {
              const tData = tDoc.data() || {};
              const tMap = tData.teacherAssignedReadings || tData.assignedReadingsByGroup || {};
              if (Array.isArray(tMap[userClassGroup])) {
                userAssignedReadings = tMap[userClassGroup];
              }
            }
          }).catch(function(){});
        } catch(e){}
      }
    } else if (currentUser.email === ADMIN_SUPREMO_EMAIL) {
      userRole = 'docent';
    }
  } catch (err) {
    if (currentUser && currentUser.email === ADMIN_SUPREMO_EMAIL) userRole = 'docent';
    console.warn("Error carregant dades de l'usuari:", err);
  }
}

function getTranslatedLevel(level) {
  if (!level) return '';
  if (!isEn()) return level;
  const map = {
    '1r cicle de primària': '1st primary cycle',
    'Cicle Inicial': '1st primary cycle',
    '2n cicle de primària': '2nd primary cycle',
    'Cicle Mitjà': '2nd primary cycle',
    '3r cicle de primària': '3rd primary cycle',
    'Cicle Superior': '3rd primary cycle',
    'Secundària': 'Secondary (ESO)',
    "Formació d'Adults": 'Adult Education / CFA'
  };
  return map[level] || level;
}

function getTranslatedCategory(cat) {
  if (!cat) return '';
  if (!isEn()) return cat;
  const map = {
    'Aventura': 'Adventure',
    'Misteri': 'Mystery',
    'Ciència-ficció': 'Science fiction',
    'Teatre': 'Theatre',
    'Poesia': 'Poetry',
    'Tradició / Llegenda': 'Tradition / Legend',
    'General': 'General'
  };
  return map[cat] || cat;
}

function getRankDetails(points) {
  if (points >= 1300) return { name: isEn() ? "Master of Reading" : "Mestre/a de la Lectura", icon: "fa-crown", color: "from-amber-400 to-amber-600", text: "text-amber-300" };
  if (points >= 700) return { name: isEn() ? "Gold Reader" : "Lector/a d'Or", icon: "fa-trophy", color: "from-amber-300 to-amber-500", text: "text-amber-200" };
  if (points >= 300) return { name: isEn() ? "Silver Reader" : "Lector/a d'Argent", icon: "fa-medal", color: "from-slate-400 to-slate-600", text: "text-slate-200" };
  if (points >= 100) return { name: isEn() ? "Bronze Reader" : "Lector/a de Bronze", icon: "fa-award", color: "from-amber-700 to-amber-900", text: "text-amber-400" };
  return { name: isEn() ? "Story Explorer" : "Explorador/a d'Històries", icon: "fa-compass", color: "from-indigo-500 to-indigo-700", text: "text-indigo-200" };
}

function getTeacherRankDetails(points, email) {
  email = email || "";
  if (email === ADMIN_SUPREMO_EMAIL) return { name: isEn() ? "⚡ Supreme Admin" : "⚡ Admin Supremo", subtext: isEn() ? "Code Controller" : "Controlador/a del Codi", icon: "fa-shield-halved", badgeBg: "bg-purple-100 text-purple-900 border-purple-300", color: "from-purple-600 to-pink-600" };
  if (points >= 20) return { name: isEn() ? "👑 Celestial Teacher" : "👑 Docent Celestial", subtext: isEn() ? "Creator of Reading Universes" : "Creador/a d'Universos Lectors", icon: "fa-wand-magic-sparkles", badgeBg: "bg-amber-100 text-amber-900 border-amber-300", color: "from-amber-400 to-amber-600" };
  if (points >= 15) return { name: isEn() ? "📚 Teacher of Teachers" : "📚 Docent de Docents", subtext: isEn() ? "Faculty survivor" : "Supervivent de claustres", icon: "fa-graduation-cap", badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-300", color: "from-blue-600 to-indigo-800" };
  if (points >= 10) return { name: isEn() ? "🌟 Staffroom Sage" : "🌟 Savi/a de la Sala", subtext: isEn() ? "Legend among coffees" : "Llegenda entre cafès", icon: "fa-mug-hot", badgeBg: "bg-amber-50 text-amber-800 border-amber-200", color: "from-amber-600 to-amber-800" };
  if (points >= 6) return { name: isEn() ? "⚡ Pedagogical Architect" : "⚡ Arquitecte/a Pedagògic/a", subtext: isEn() ? "Curriculum master" : "Dominador/a del currículum", icon: "fa-cubes", badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200", color: "from-indigo-500 to-indigo-700" };
  if (points >= 3) return { name: isEn() ? "📝 Contributing Teacher" : "📝 Docent Col·laborador/a", subtext: isEn() ? "Photocopy exporter" : "Exportador/a de fotocòpies", icon: "fa-copy", badgeBg: "bg-teal-50 text-teal-800 border-teal-200", color: "from-teal-500 to-emerald-700" };
  if (points >= 1) return { name: isEn() ? "👨‍🏫 Novice Teacher" : "👨‍🏫 Docent Novell", subtext: isEn() ? "Adjusting the projector" : "Ajustant el projector", icon: "fa-chalkboard-user", badgeBg: "bg-slate-100 text-slate-800 border-slate-300", color: "from-slate-500 to-slate-700" };
  return { name: isEn() ? "🎒 Newcomer Teacher" : "🎒 Docent Nouvingut/da", subtext: isEn() ? "Searching for school wifi" : "Cercant el wifi de l'escola", icon: "fa-compass-drafting", badgeBg: "bg-slate-50 text-slate-600 border-slate-200", color: "from-slate-400 to-indigo-500" };
}

function renderBanner() {
  const bannerContainer = document.getElementById('motivation-banner');
  if (!bannerContainer) return;

  if (currentUser && (userRole === 'alumne' || userRole === 'adult') && currentUser.email !== ADMIN_SUPREMO_EMAIL) {
    const rank = getRankDetails(userPoints);
    const displayName = userDisplayName || currentUser.email.split('@')[0];

    let nextRankPoints = 100;
    let nextRankName = "Lector/a de Bronze";
    if (userPoints >= 100 && userPoints < 300) { nextRankPoints = 300; nextRankName = "Lector/a d'Argent"; }
    else if (userPoints >= 300 && userPoints < 700) { nextRankPoints = 700; nextRankName = "Lector/a d'Or"; }
    else if (userPoints >= 700 && userPoints < 1300) { nextRankPoints = 1300; nextRankName = "Mestre/a de la Lectura"; }
    else if (userPoints >= 1300) { nextRankPoints = userPoints; }

    const pointsNeeded = nextRankPoints - userPoints;

    bannerContainer.innerHTML = `
      <div onclick="renderReaderPassport()" title="Clica per obrir el teu Passaport Lector i veure tots els premis" class="cursor-pointer bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 hover:from-indigo-800 hover:to-indigo-950 text-white border-b border-indigo-700/50 shadow-inner py-3 px-4 transition">
        <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr ${rank.color} text-white flex items-center justify-center text-lg shadow-md border border-white/20">
              <i class="fa-solid ${rank.icon}"></i>
            </div>
            <div>
              <h2 class="text-sm md:text-base font-extrabold text-white tracking-wide flex items-center gap-2 justify-center md:justify-start">
               <span>${isEn() ? 'Hello,' : 'Hola,'} <span class="text-amber-300">${displayName}</span>!</span>
                <span class="text-[10px] bg-white/15 text-amber-200 px-2 py-0.5 rounded-full font-bold border border-white/20 hidden sm:inline-flex items-center gap-1">
                  <i class="fa-solid fa-passport"></i> ${isEn() ? 'View Passport & Rewards' : 'Veure Passaport i Premis'}
                </span>
              </h2>
              <p class="text-xs text-indigo-200">
                ${isEn() ? 'Current rank:' : 'Rang actual:'} <span class="font-bold text-amber-300">${rank.name}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-4 bg-indigo-950/60 px-4 py-1.5 rounded-xl border border-indigo-500/30">
            <div class="text-right">
              <span class="block text-xs font-semibold text-indigo-200">${isEn() ? 'Total earned' : 'Total acumulat'}</span>
              <span class="text-base font-black text-amber-400">${userPoints} PTS</span>
            </div>
            <div class="h-7 w-px bg-indigo-700/60"></div>
            <div class="text-left">
              <span class="block text-xs font-semibold text-indigo-200">${isEn() ? 'Next goal' : 'Següent objectiu'}</span>
              <span class="text-xs font-bold text-slate-200">
                ${userPoints >= 1300 ? (isEn() ? '🌟 Max Level Reached!' : '🌟 Nivell Màxim Assolit!') : '+' + pointsNeeded + ' pts ' + (isEn() ? 'for ' : 'per ') + nextRankName}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    bannerContainer.innerHTML = '';
  }
}

function isEn() { return currentLang === 'en'; }

function updateFooterLang() {
  const tagline = document.getElementById('footer-tagline');
  const changelog = document.getElementById('footer-changelog-label');
  if (tagline) tagline.textContent = '\u00a9 Lectura Aventura \u2014 ' + (isEn() ? 'Reading Comprehension Educational Platform' : 'Plataforma Educativa de Compresi\u00f3 Lectora');
  if (changelog) changelog.textContent = 'v0.46 \u2014 ' + (isEn() ? 'Version history' : 'Historial de versions');
}

function setAppLanguage(lang) {
  currentLang = lang;
  try { localStorage.setItem('lectura_aventura_lang', lang); } catch (e) {}
  document.documentElement.lang = lang;
  renderNav();
  renderCatalog();
}

function renderNav() {
  const nav = document.getElementById('nav-actions');
  if (!nav) return;
  if (currentUser) {
    const isCreator = isUserAdminOrCreator();
    const isDocent = userRole === 'docent' || currentUser.email === ADMIN_SUPREMO_EMAIL;
    const isLector = !isCreator;
    const rank = isCreator ? getTeacherRankDetails(userPoints, currentUser.email) : getRankDetails(userPoints);
    const nameToShow = userDisplayName || currentUser.email.split('@')[0];

    nav.innerHTML = `
      <button onclick="toggleMyLectures()" class="${filterMyLectures ? 'bg-amber-300 text-slate-900 font-bold' : 'bg-indigo-700 hover:bg-indigo-800 text-white font-semibold'} px-3 py-1.5 rounded-xl text-xs md:text-sm transition flex items-center gap-1.5 shadow-sm">
        <i class="fa-solid ${filterMyLectures ? 'fa-filter-circle-xmark' : 'fa-bookmark'}"></i>
        <span class="hidden sm:inline">${filterMyLectures ? (isEn() ? 'All readings' : 'Totes les lectures') : (isEn() ? 'My readings' : 'Les meves lectures')}</span>
      </button>

      ${isLector ? `
        <button onclick="renderStudentLeaderboard()" class="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs md:text-sm transition flex items-center gap-1.5 shadow-md transform hover:scale-105">
          <i class="fa-solid fa-trophy text-amber-900"></i>
          <span class="hidden md:inline">${isEn() ? 'Leaderboard' : 'Classificació'}</span>
        </button>
      ` : ''}

      ${isDocent ? `
        <button onclick="renderTeacherFoldersList()" title="${isEn() ? 'Folders / Units' : 'Carpetes / SA'}" class="bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs md:text-sm transition flex items-center gap-1.5 shadow-sm">
          <i class="fa-solid fa-folder-closed text-amber-300"></i>
          <span class="hidden md:inline">${isEn() ? 'Folders / Units' : 'Carpetes / SA'}</span>
        </button>

        <button id="nav-feedback-btn" onclick="renderTeacherFeedbackInbox()" title="${isEn() ? 'Feedback' : 'Suggeriments'}" class="relative bg-indigo-700 hover:bg-indigo-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs md:text-sm transition flex items-center gap-1.5 shadow-sm">
          <i class="fa-solid fa-comments text-amber-300"></i>
          <span class="hidden md:inline">${isEn() ? 'Feedback' : 'Suggeriments'}</span>
          <span id="nav-feedback-unread-badge" class="hidden bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white/40 shadow-xs">0</span>
        </button>

        <button onclick="renderStudentTrackingPanel()" title="${isEn() ? 'My Students' : 'Els meus Alumnes'}" class="bg-indigo-700 hover:bg-indigo-800 text-amber-300 font-bold px-3 py-1.5 rounded-xl text-xs md:text-sm transition flex items-center gap-1.5 shadow-sm">
          <i class="fa-solid fa-users text-sm"></i>
          <span class="hidden md:inline">${isEn() ? 'My Students' : 'Els meus Alumnes'}</span>
        </button>
      ` : ''}

      ${isCreator ? `
        <button onclick="renderEditor()" class="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-3.5 py-1.5 rounded-xl text-xs md:text-sm transition flex items-center gap-1.5 shadow-md transform hover:scale-105">
          <i class="fa-solid fa-plus text-base"></i>
          <span>${isEn() ? 'New Reading' : 'Nova Lectura'}</span>
        </button>
      ` : ''}

      <div onclick="renderReaderPassport()" title="${isEn() ? 'Open my Reader Passport & Rewards' : 'Obrir el meu Passaport Lector i Premis'}" class="cursor-pointer flex items-center bg-indigo-800/80 hover:bg-indigo-900 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-indigo-400/40 hover:border-amber-300/60 space-x-3 shadow-inner transition group">
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr ${rank.color} text-white flex items-center justify-center text-sm shadow group-hover:scale-105 transition">
          <i class="fa-solid ${rank.icon}"></i>
        </div>

        <div class="flex flex-col text-left">
          <div class="flex items-center space-x-1.5">
            <span class="text-xs font-bold text-white tracking-wide">${nameToShow}</span>
            <span class="bg-amber-400/20 text-amber-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-amber-400/30">${userPoints} pts</span>
          </div>
          <span class="text-[11px] text-amber-300 font-bold leading-none mt-0.5">${rank.name}</span>
        </div>

        <button onclick="event.stopPropagation(); logout()" title="${isEn() ? 'Log Out' : 'Tancar Sessió'}" class="text-indigo-300 hover:text-white hover:bg-indigo-700/50 p-1.5 rounded-lg transition ml-1">
          <i class="fa-solid fa-right-from-bracket text-sm"></i>
        </button>
      </div>
    `;
    updateUnreadFeedbackBadge();
  } else {
    nav.innerHTML = `<button onclick="renderLogin()" class="bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2 rounded-xl text-sm transition shadow">${isEn() ? 'Log In' : 'Inicia Sessió'}</button>`;
  }

  // Botons de canvi d'idioma (CAT / EN) — sempre visibles
  const langBtns = document.createElement('div');
  langBtns.className = 'flex flex-col gap-0.5 ml-1';
  langBtns.innerHTML = `
    <button
      onclick="setAppLanguage('ca')"
      title="Català"
      class="flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg text-[10px] leading-tight font-bold border transition
        ${currentLang === 'ca'
          ? 'bg-amber-300 text-slate-900 border-amber-400 shadow-sm'
          : 'bg-indigo-700 hover:bg-indigo-600 text-white border-indigo-500/50'}"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" class="w-5 h-3.5 rounded-sm overflow-hidden shrink-0">
        <!-- Bandera senyera catalana: 4 franges grogues i 5 vermelles -->
        <rect width="60" height="36" fill="#FCDD09"/>
        <rect y="0"  width="60" height="4" fill="#DA121A"/>
        <rect y="8"  width="60" height="4" fill="#DA121A"/>
        <rect y="16" width="60" height="4" fill="#DA121A"/>
        <rect y="24" width="60" height="4" fill="#DA121A"/>
        <rect y="32" width="60" height="4" fill="#DA121A"/>
      </svg>
      CAT
    </button>
    <button
      onclick="setAppLanguage('en')"
      title="English"
      class="flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg text-[10px] leading-tight font-bold border transition
        ${currentLang === 'en'
          ? 'bg-amber-300 text-slate-900 border-amber-400 shadow-sm'
          : 'bg-indigo-700 hover:bg-indigo-600 text-white border-indigo-500/50'}"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36" class="w-5 h-3.5 rounded-sm overflow-hidden shrink-0">
        <!-- Bandera UK simplificada: Union Jack -->
        <rect width="60" height="36" fill="#012169"/>
        <!-- Creu de Sant Andreu (blanc) -->
        <line x1="0" y1="0" x2="60" y2="36" stroke="white" stroke-width="7"/>
        <line x1="60" y1="0" x2="0" y2="36" stroke="white" stroke-width="7"/>
        <!-- Creu de Sant Patrici (vermell) -->
        <line x1="0" y1="0" x2="60" y2="36" stroke="#C8102E" stroke-width="3.5"/>
        <line x1="60" y1="0" x2="0" y2="36" stroke="#C8102E" stroke-width="3.5"/>
        <!-- Creu de Sant Jordi (blanc + vermell) -->
        <rect x="23" y="0" width="14" height="36" fill="white"/>
        <rect x="0"  y="13" width="60" height="10" fill="white"/>
        <rect x="26" y="0" width="8" height="36" fill="#C8102E"/>
        <rect x="0"  y="15" width="60" height="6" fill="#C8102E"/>
      </svg>
      EN
    </button>
  `;
  nav.appendChild(langBtns);

  renderBanner();
  updateFooterLang();
}

function togglePassportReadingsAccordion() {
  const body = document.getElementById('passport-readings-accordion-body');
  const chevron = document.getElementById('passport-readings-chevron');
  const btnText = document.getElementById('passport-readings-btn-text');
  if (!body) return;
  const isHidden = body.classList.contains('hidden');
  if (isHidden) {
    body.classList.remove('hidden');
    if (chevron) chevron.classList.add('rotate-180');
    if (btnText) btnText.innerText = isEn() ? 'Hide details' : 'Ocultar detall';
  } else {
    body.classList.add('hidden');
    if (chevron) chevron.classList.remove('rotate-180');
    if (btnText) btnText.innerText = isEn() ? 'View details and scores' : 'Veure detall i notes';
  }
}

function getLocalizedRankName(name) {
  if (!isEn() || !name) return name || '';
  const enNames = {
    "Explorador/a d'Històries": "Story Explorer",
    "Lector/a de Bronze": "Bronze Reader",
    "Lector/a d'Argent": "Silver Reader",
    "Lector/a d'Or": "Gold Reader",
    "Mestre/a de la Lectura": "Reading Master",
    "👑 Llegenda de la Lectura": "👑 Reading Legend",
    "🎒 Docent Nouvingut/da": "🎒 Newcomer Teacher",
    "👨‍🏫 Docent Novell": "👨‍🏫 Novice Teacher",
    "📝 Docent Col·laborador/a": "📝 Collaborating Teacher",
    "⚡ Arquitecte/a Pedagògic/a": "⚡ Pedagogical Architect",
    "🌟 Savi/a de la Sala": "🌟 Staffroom Sage",
    "📚 Docent de Docents": "📚 Teacher of Teachers",
    "👑 Docent Celestial": "👑 Celestial Teacher",
    "⚡ Admin Supremo": "⚡ Supreme Admin"
  };
  return enNames[name] || name;
}

function getLocalizedRankDesc(r) {
  if (!isEn() || !r) return (r && (r.desc || r.subtext)) || '';
  const enDesc = {
    "El punt de partida de tota gran aventura.": "The starting point of every great adventure.",
    "Ja domines les primeres lectures i reptes!": "You have mastered the first readings and challenges!",
    "La teva comprensió lectora brilla amb força.": "Your reading comprehension shines brightly.",
    "Un referent de lectura i constància al centre.": "A reading and perseverance benchmark at school.",
    "El màxim reconeixement de Lectura Aventura!": "The highest recognition in Reading Adventure!",
    "Cercant el wifi de l'escola": "Searching for school Wi-Fi",
    "Ajustant el projector": "Adjusting the projector",
    "Exportador/a de fotocòpies": "Photocopy exporter",
    "Dominador/a del currículum": "Curriculum master",
    "Llegenda entre cafès": "Staffroom coffee legend",
    "Supervivent de claustres": "Staff meeting survivor",
    "Creador/a d'Universos Lectors": "Creator of Reading Universes",
    "Controlador/a del Codi": "Code Controller"
  };
  const orig = r.desc || r.subtext || '';
  return enDesc[orig] || orig;
}

function getLocalizedTaxonomyLabel(tKey) {
  if (isEn()) {
    const enTax = {
      literal: "Literal",
      inferential: "Inferential",
      figurative: "Figurative",
      opinion: "Opinion",
      creative: "Creative"
    };
    if (enTax[tKey]) return enTax[tKey];
  }
  const tCfg = TAXONOMY_CONFIG[tKey] || TAXONOMY_CONFIG.literal;
  return tCfg.label;
}

async function renderReaderPassport() {
  if (!currentUser) { renderLogin(); return; }
  stopSpeechSynthesis();

  const app = document.getElementById('app');
  if (!app) return;

  const isCreator = isUserAdminOrCreator();
  const displayName = userDisplayName || currentUser.email.split('@')[0];
  const rank = isCreator ? getTeacherRankDetails(userPoints, currentUser.email) : getRankDetails(userPoints);

  app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? 'Loading your Reading Passport...' : 'Carregant el teu Passaport Lector...') + '</p></div>';

  let completedDocs = [];
  let totalReadingsInCatalog = 0;
  let hasTextFormat = false;
  let hasVisualFormat = false;
  let hasBookFormat = false;
  let hasAdaptedFormat = false;
  let distinctCategories = new Set();
  let hasPerfectScore = false;
  const lecturesCatalogMap = {};

  const teacherMedalsCtx = {
    createdCount: 0,
    maxTaxonomies: 0,
    distinctLevelsCount: 0,
    maxCompletions: 0,
    totalCompletions: 0,
    maxStudentsInAnyGroup: 0,
    maxAssignedInAnyGroup: 0
  };

  try {
    const allLecturesSnap = await withTimeout(db.collection(getReadingsCollection()).get(), 6000, "catàleg per al passaport");
    totalReadingsInCatalog = allLecturesSnap.size;
    let idxCat = 0;
    allLecturesSnap.forEach(function(d) {
      const lData = d.data() || {};
      const rNum = lData.readingNumber || (totalReadingsInCatalog - idxCat);
      lecturesCatalogMap[d.id] = Object.assign({
        id: d.id,
        code: formatReadingCode(rNum)
      }, lData);
      idxCat++;
    });

    if (isCreator && currentUser) {
      const myReadings = [];
      Object.values(lecturesCatalogMap).forEach(function(r) {
        const isMine = (r.authorUid && r.authorUid === currentUser.uid) ||
                       (r.authorEmail && r.authorEmail.toLowerCase() === currentUser.email.toLowerCase());
        if (isMine) myReadings.push(r);
      });

      teacherMedalsCtx.createdCount = Math.max(myReadings.length, userPoints || 0);
      teacherMedalsCtx.distinctLevelsCount = new Set(myReadings.map(function(r) { return r.level; }).filter(Boolean)).size;
      teacherMedalsCtx.maxCompletions = myReadings.reduce(function(m, r) {
        return Math.max(m, r.completions || r.timesCompleted || r.plays || 0);
      }, 0);
      teacherMedalsCtx.totalCompletions = myReadings.reduce(function(s, r) {
        return s + (r.completions || r.timesCompleted || r.plays || 0);
      }, 0);

      let maxTax = 0;
      const taxFetchIds = [];
      myReadings.forEach(function(r) {
        if (r.taxonomyTypes && Array.isArray(r.taxonomyTypes)) {
          maxTax = Math.max(maxTax, r.taxonomyTypes.length);
        } else if (r.taxonomiesCount !== undefined) {
          maxTax = Math.max(maxTax, r.taxonomiesCount);
        } else {
          taxFetchIds.push(r.id);
        }
      });

      if (taxFetchIds.length > 0) {
        try {
          const fetchTaxPromises = taxFetchIds.slice(0, 10).map(async function(rId) {
            try {
              const qSnap = await withTimeout(db.collection(getReadingsCollection()).doc(rId).collection(SUB_COLLECTION).get(), 3000, "taxonomia fites");
              const tTypes = new Set();
              qSnap.forEach(function(qd) {
                const qData = qd.data() || {};
                if (qData.taxonomyType) tTypes.add(qData.taxonomyType);
              });
              return tTypes.size;
            } catch(e) { return 0; }
          });
          const tCounts = await Promise.all(fetchTaxPromises);
          tCounts.forEach(function(tc) { maxTax = Math.max(maxTax, tc); });
        } catch(taxErr) {}
      }
      teacherMedalsCtx.maxTaxonomies = maxTax;

      const assignedCounts = Object.values(teacherAssignedReadingsMap || {}).map(function(arr) {
        return Array.isArray(arr) ? arr.length : 0;
      });
      teacherMedalsCtx.maxAssignedInAnyGroup = assignedCounts.length > 0 ? Math.max.apply(null, assignedCounts) : 0;

      try {
        const studentsSnap = await withTimeout(
          db.collection("users").where('teacherUid', '==', currentUser.uid).get(),
          3500,
          "alumnes fites docent"
        );
        const groupStudentCounts = {};
        studentsSnap.forEach(function(sDoc) {
          const sData = sDoc.data() || {};
          const grp = (sData.classGroup || 'default').trim();
          groupStudentCounts[grp] = (groupStudentCounts[grp] || 0) + 1;
        });
        const countsArr = Object.values(groupStudentCounts);
        teacherMedalsCtx.maxStudentsInAnyGroup = countsArr.length > 0 ? Math.max.apply(null, countsArr) : studentsSnap.size;
      } catch(stErr) {
        console.warn("No s'han pogut carregar els alumnes per a les medalles docents:", stErr);
      }
    }

    userCompletedReadings.forEach(function(rId) {
      const rData = lecturesCatalogMap[rId];
      if (rData) {
        completedDocs.push(rData);
        if (rData.type === 'book') hasBookFormat = true;
        else if (rData.contentFormat === 'image') hasVisualFormat = true;
        else hasTextFormat = true;

        if (rData.isAdaptedVersion) hasAdaptedFormat = true;
        if (rData.category) distinctCategories.add(rData.category);

        const qCount = rData.questionCount || 0;
        const ptsPerQ = rData.pointsPerQuestion || 1;
        const maxPts = qCount * ptsPerQ;
        const earnedPts = userScores[rId] || 0;
        if (maxPts > 0 && earnedPts >= maxPts) {
          hasPerfectScore = true;
        }
      }
    });
  } catch (err) {
    console.warn("No s'han pogut carregar les estadístiques detallades del passaport:", err);
  }

  const completedCount = userCompletedReadings.length;

  // Construcció del desplegable de lectures fetes per al mode lector
  let readerHistoryAccordionHTML = '';
  if (!isCreator) {
    let historyCardsHTML = '';
    if (completedCount === 0) {
      historyCardsHTML = '<p class="text-xs text-slate-500 italic py-3 text-center">' + (isEn() ? "You haven't completed any readings yet. Pick one from the catalog to start earning points!" : "Encara no has completat cap lectura. Tria'n una del catàleg per començar a sumar punts!") + '</p>';
    } else {
      // Mostrem les més recents primer si tenen data, o en ordre invers de compleció
      const orderedCompletedIds = userCompletedReadings.slice().reverse();
      historyCardsHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';

      orderedCompletedIds.forEach(function(rId) {
        const catInfo = lecturesCatalogMap[rId] || null;
        const histInfo = userReadingHistory[rId] || null;
        const rTitle = (histInfo && histInfo.title) || (catInfo && catInfo.title) || ((isEn() ? 'Reading (' : 'Lectura (') + rId.slice(0, 6) + '...)');
        const rCode = catInfo ? catInfo.code : '';
        const rLevel = catInfo ? (catInfo.level || '') : '';

        const qCount = (histInfo && histInfo.total > 0) ? histInfo.total : (catInfo ? (catInfo.questionCount || 0) : 0);
        const ptsPerQ = catInfo ? (catInfo.pointsPerQuestion || 1) : 1;
        const maxPts = (histInfo && histInfo.maxPoints > 0) ? histInfo.maxPoints : (qCount * ptsPerQ);
        const earnedPts = userScores[rId] !== undefined ? userScores[rId] : ((histInfo && histInfo.points) || 0);

        const isMaxReached = maxPts > 0 && earnedPts >= maxPts;
        const remainingPts = maxPts > earnedPts ? Math.round((maxPts - earnedPts) * 10) / 10 : 0;

        let scoreBadgeHTML = '';
        let opportunityBadgeHTML = '';
        let taxonomyPillsHTML = '';

        if (histInfo && histInfo.total > 0) {
          const pct = histInfo.percentage !== undefined ? histInfo.percentage : Math.round((histInfo.score / histInfo.total) * 100);
          const badgeTone = pct >= 75
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
            : (pct >= 50 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300');

          scoreBadgeHTML = '<span class="text-[11px] font-black px-2 py-0.5 rounded-md border ' + badgeTone + '">' +
            histInfo.score + '/' + histInfo.total + ' ' + (isEn() ? 'correct' : 'encerts') + ' (' + pct + '%) · ' + earnedPts + (maxPts > 0 ? '/' + maxPts : '') + ' PTS</span>';

          if (histInfo.stats) {
            const taxKeysOrder = ['literal', 'inferential', 'figurative', 'opinion', 'creative'];
            let pills = '';
            taxKeysOrder.forEach(function(tKey) {
              const st = histInfo.stats[tKey];
              if (st && st.total > 0) {
                const tCfg = TAXONOMY_CONFIG[tKey] || TAXONOMY_CONFIG.literal;
                const correctDisplay = Math.round(st.correct * 10) / 10;
                pills += '<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md border ' + tCfg.color + ' inline-flex items-center gap-1">' +
                  '<i class="fa-solid ' + tCfg.icon + '"></i> ' + getLocalizedTaxonomyLabel(tKey) + ': <strong>' + correctDisplay + '/' + st.total + '</strong></span>';
              }
            });
            taxonomyPillsHTML = pills ? ('<div class="flex flex-wrap gap-1.5 pt-1">' + pills + '</div>') : '';
          }
        } else {
          const ptsText = maxPts > 0 ? (earnedPts + '/' + maxPts + ' PTS') : (earnedPts + ' PTS');
          scoreBadgeHTML = '<span class="text-[11px] font-black px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-800 border-indigo-200">' + ptsText + '</span>';
          taxonomyPillsHTML = '<p class="text-[10px] text-slate-400 italic pt-0.5">' + (isEn() ? 'The skill breakdown will be saved if you take it again.' : 'El desglossament per tipologia es desarà si la tornes a fer.') + '</p>';
        }

        if (isMaxReached) {
          opportunityBadgeHTML = '<span class="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1"><i class="fa-solid fa-star text-amber-500"></i> ' + (isEn() ? 'Max score reached' : 'Nota màxima assolida') + '</span>';
        } else if (remainingPts > 0) {
          opportunityBadgeHTML = '<span class="text-[11px] font-extrabold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1"><i class="fa-solid fa-arrow-trend-up text-amber-600"></i> ' + (isEn() ? ('You can earn up to +' + remainingPts + ' PTS') : ('Pots guanyar fins a +' + remainingPts + ' PTS')) + '</span>';
        }

        historyCardsHTML += `
          <div class="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-2.5">
            <div class="space-y-1.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
                    ${rCode ? '<span class="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">' + rCode + '</span>' : ''}
                    ${rLevel ? '<span class="text-[10px] font-semibold text-slate-500">' + escapeHtmlAttr(rLevel) + '</span>' : ''}
                  </div>
                  <h4 class="text-xs sm:text-sm font-black text-slate-800 leading-snug">${escapeHtmlAttr(rTitle)}</h4>
                </div>
                <div class="shrink-0">${scoreBadgeHTML}</div>
              </div>
              ${taxonomyPillsHTML}
            </div>

            <div class="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
              <div>${opportunityBadgeHTML}</div>
              <button type="button" onclick="renderReader('${rId}')" class="text-xs font-extrabold px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1.5 ${isMaxReached ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'}">
                <i class="fa-solid ${isMaxReached ? 'fa-eye' : 'fa-rotate-right'}"></i>
                <span>${isMaxReached ? (isEn() ? 'Reread' : 'Rellegir') : (isEn() ? 'Repeat to improve' : 'Repetir per millorar')}</span>
              </button>
            </div>
          </div>
        `;
      });

      historyCardsHTML += '</div>';
    }

    readerHistoryAccordionHTML = `
      <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <button type="button" onclick="togglePassportReadingsAccordion()" class="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg shrink-0 border border-indigo-200">
              <i class="fa-solid fa-book-open-reader"></i>
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2 flex-wrap">
                <span>${isEn() ? 'My Completed Readings & Scores' : 'Les meves Lectures Fetes i Notes'}</span>
                <span class="text-xs font-extrabold bg-indigo-600 text-white px-2.5 py-0.5 rounded-full">${completedCount}</span>
              </h2>
              <p class="text-xs text-slate-500">${isEn() ? 'Expand the list to review your scores and decide whether to repeat one or start a new one.' : 'Desplega el llistat per revisar les teves puntuacions i decidir si et convé repetir-ne alguna o fer-ne una de nova.'}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0 bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-extrabold">
            <span id="passport-readings-btn-text" class="hidden sm:inline">${isEn() ? 'View details and scores' : 'Veure detall i notes'}</span>
            <i id="passport-readings-chevron" class="fa-solid fa-chevron-down transition-transform duration-200"></i>
          </div>
        </button>

        <div id="passport-readings-accordion-body" class="hidden px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 space-y-3">
          ${historyCardsHTML}
        </div>
      </div>
    `;
  }

  let progressPercent = 100;
  let progressLabel = isEn() ? "Maximum level reached!" : "Nivell màxim assolit!";
  let nextTargetLabel = isEn() ? "👑 Reading Legend" : "👑 Llegenda de la Lectura";

  if (!isCreator) {
    let currentFloor = 0;
    let nextCeiling = 100;
    let nextName = isEn() ? "Bronze Reader" : "Lector/a de Bronze";

    if (userPoints >= 1300) {
      progressPercent = 100;
      progressLabel = isEn() ? ("You have reached the maximum rank (" + userPoints + " PTS)!") : ("Has assolit el rang màxim (" + userPoints + " PTS)!");
      nextTargetLabel = isEn() ? "Reading Master" : "Mestre/a de la Lectura";
    } else {
      if (userPoints >= 700) { currentFloor = 700; nextCeiling = 1300; nextName = isEn() ? "Reading Master" : "Mestre/a de la Lectura"; }
      else if (userPoints >= 300) { currentFloor = 300; nextCeiling = 700; nextName = isEn() ? "Gold Reader" : "Lector/a d'Or"; }
      else if (userPoints >= 100) { currentFloor = 100; nextCeiling = 300; nextName = isEn() ? "Silver Reader" : "Lector/a d'Argent"; }

      const span = nextCeiling - currentFloor;
      const gainedInTier = userPoints - currentFloor;
      progressPercent = Math.min(100, Math.max(4, Math.round((gainedInTier / span) * 100)));
      const missing = nextCeiling - userPoints;
      progressLabel = userPoints + " / " + nextCeiling + " PTS (" + progressPercent + "%) \u2014 " + (isEn() ? ("You need " + missing + " pts") : ("Et falten " + missing + " pts"));
      nextTargetLabel = nextName;
    }
  } else {
    let currentFloor = 0;
    let nextCeiling = 1;
    let nextName = isEn() ? "Novice Teacher" : "Docent Novell";
    if (userPoints >= 20) {
      progressPercent = 100;
      progressLabel = isEn() ? ("You have reached the maximum teacher rank (" + userPoints + " contributions)!") : ("Has assolit el rang màxim docent (" + userPoints + " aportacions)!");
      nextTargetLabel = isEn() ? "Celestial Teacher" : "Docent Celestial";
    } else {
      if (userPoints >= 15) { currentFloor = 15; nextCeiling = 20; nextName = isEn() ? "Celestial Teacher" : "Docent Celestial"; }
      else if (userPoints >= 10) { currentFloor = 10; nextCeiling = 15; nextName = isEn() ? "Teacher of Teachers" : "Docent de Docents"; }
      else if (userPoints >= 6) { currentFloor = 6; nextCeiling = 10; nextName = isEn() ? "Staffroom Sage" : "Savi/a de la Sala"; }
      else if (userPoints >= 3) { currentFloor = 3; nextCeiling = 6; nextName = isEn() ? "Pedagogical Architect" : "Arquitecte/a Pedagògic/a"; }
      else if (userPoints >= 1) { currentFloor = 1; nextCeiling = 3; nextName = isEn() ? "Collaborating Teacher" : "Docent Col·laborador/a"; }

      const span = nextCeiling - currentFloor;
      const gained = userPoints - currentFloor;
      progressPercent = Math.min(100, Math.max(8, Math.round((gained / span) * 100)));
      progressLabel = userPoints + " / " + nextCeiling + (isEn() ? " published readings \u2014 Remaining: " : " lectures publicades \u2014 Falten ") + (nextCeiling - userPoints);
      nextTargetLabel = nextName;
    }
  }

  const ranksList = isCreator ? TEACHER_RANKS_CATALOG : STUDENT_RANKS_CATALOG;
  let ranksGridHTML = '';

  ranksList.forEach(function(r, idx) {
    const isUnlocked = userPoints >= r.min;
    const isCurrent = userPoints >= r.min && userPoints <= r.max;
    const ptsText = isCreator
      ? (r.min === 0 ? (isEn() ? "0 readings" : "0 lectures") : (r.max === Infinity ? ("+" + r.min + (isEn() ? " readings" : " lectures")) : (r.min + " - " + r.max + (isEn() ? " readings" : " lectures"))))
      : (r.max === Infinity ? "+" + r.min + " PTS" : r.min + " - " + r.max + " PTS");

    const missingPts = r.min - userPoints;

    ranksGridHTML += `
      <div class="relative p-4 rounded-2xl border-2 transition flex flex-col justify-between space-y-3 ${isCurrent ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-200/60' : (isUnlocked ? 'bg-white border-emerald-200 shadow-xs' : 'bg-slate-50/80 border-slate-200 opacity-75')}">
        ${isCurrent ? '<span class="absolute -top-2.5 right-3 bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs uppercase tracking-wider">' + (isEn() ? 'Current Rank' : 'Rang Actual') + '</span>' : ''}

        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr ${isUnlocked ? r.color : 'from-slate-300 to-slate-400'} text-white flex items-center justify-center text-xl shadow shrink-0">
            <i class="fa-solid ${isUnlocked ? r.icon : 'fa-lock'}"></i>
          </div>
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-wider ${isUnlocked ? 'text-indigo-600' : 'text-slate-400'}">${isEn() ? 'Level' : 'Nivell'} ${idx + 1} · ${ptsText}</span>
            <h4 class="font-black text-sm ${isUnlocked ? 'text-slate-900' : 'text-slate-500'} leading-snug">${getLocalizedRankName(r.name)}</h4>
            <p class="text-xs text-slate-500 mt-0.5 leading-snug">${getLocalizedRankDesc(r)}</p>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          ${isUnlocked
            ? '<span class="text-emerald-700 font-extrabold flex items-center gap-1"><i class="fa-solid fa-circle-check text-emerald-500"></i> ' + (isEn() ? 'Unlocked!' : 'Desbloquejat!') + '</span>'
            : '<span class="text-slate-500 font-bold flex items-center gap-1"><i class="fa-solid fa-lock text-slate-400"></i> ' + (isEn() ? 'You need ' : 'Et falten ') + '<strong class="text-indigo-700">' + missingPts + '</strong> ' + (isCreator ? (isEn() ? 'readings' : 'lectures') : 'PTS') + '</span>'
          }
        </div>
      </div>
    `;
  });

  const infCorrect = userTaxonomyStats.inferential || 0;
  const figCorrect = userTaxonomyStats.figurative || 0;
  const opCreatCorrect = (userTaxonomyStats.opinion || 0) + (userTaxonomyStats.creative || 0);

  const achievements = isCreator ? TEACHER_MEDALS.map(function(m) {
    const checkRes = m.check(teacherMedalsCtx);
    return {
      id: m.id,
      title: typeof m.title === 'function' ? m.title() : m.title,
      desc: typeof m.desc === 'function' ? m.desc() : m.desc,
      requirement: typeof m.requirement === 'function' ? m.requirement() : m.requirement,
      unlocked: !!checkRes.unlocked,
      progress: checkRes.progress,
      icon: m.icon,
      color: m.color
    };
  }) : [
    {
      id: 'first_read',
      title: isEn() ? "First Adventure" : "Primera Aventura",
      desc: isEn() ? "Complete your first reading and submit the quiz." : "Completa la teva primera lectura i envia el qüestionari.",
      requirement: isEn() ? "1 reading completed" : "1 lectura completada",
      unlocked: completedCount >= 1,
      progress: Math.min(completedCount, 1) + "/1",
      icon: "fa-shoe-prints",
      color: "bg-emerald-500"
    },
    {
      id: 'five_reads',
      title: isEn() ? "Consistent Reader" : "Lector/a Constant",
      desc: isEn() ? "Show your reading habit by completing 5 different readings." : "Demostra el teu hàbit lector completant 5 lectures diferents.",
      requirement: isEn() ? "5 readings completed" : "5 lectures completades",
      unlocked: completedCount >= 5,
      progress: Math.min(completedCount, 5) + "/5",
      icon: "fa-fire",
      color: "bg-orange-500"
    },
    {
      id: 'fifteen_reads',
      title: isEn() ? "Book Devourer" : "Devorador/a de Llibres",
      desc: isEn() ? "A milestone reserved for the most passionate readers in the school." : "Una fita reservada als lectors més apassionats de l'escola.",
      requirement: isEn() ? "15 readings completed" : "15 lectures completades",
      unlocked: completedCount >= 15,
      progress: Math.min(completedCount, 15) + "/15",
      icon: "fa-book-journal-whills",
      color: "bg-purple-600"
    },
    {
      id: 'perfectionist',
      title: isEn() ? "Brilliant Mind (100%)" : "Ment Brillant (100%)",
      desc: isEn() ? "Achieve the maximum score without any mistakes in a reading." : "Aconsegueix la puntuació màxima sense cap errada en una lectura.",
      requirement: isEn() ? "100% correct in a reading" : "100% d'encerts en una lectura",
      unlocked: hasPerfectScore,
      progress: hasPerfectScore ? (isEn() ? "Achieved!" : "Aconseguit!") : (isEn() ? "Pending" : "Pendent"),
      icon: "fa-bullseye",
      color: "bg-rose-500"
    },
    {
      id: 'phoenix_reader',
      title: isEn() ? "The Phoenix Reader" : "El Fènix Lector",
      desc: isEn() ? "Repeat a reading you had already done and beat your previous score." : "Repeteix una lectura que ja havies fet i supera la teva puntuació anterior.",
      requirement: isEn() ? "Improve score by repeating a reading" : "Millorar la nota en repetir una lectura",
      unlocked: userHasImprovedScore,
      progress: userHasImprovedScore ? (isEn() ? "Beaten!" : "Superat!") : (isEn() ? "Pending" : "Pendent"),
      icon: "fa-fire-flame-curved",
      color: "bg-amber-600"
    },
    {
      id: 'chapter_devourer',
      title: isEn() ? "Chapter Devourer" : "Devorador/a de Capítols",
      desc: isEn() ? "Read a whole book and pass its comprehension quiz." : "Llegeix un llibre sencer i supera el seu qüestionari de comprensió.",
      requirement: isEn() ? "Complete 1 Book reading record" : "Completar 1 fitxa de Llibre de lectura",
      unlocked: hasBookFormat,
      progress: hasBookFormat ? (isEn() ? "1/1 book" : "1/1 llibre") : (isEn() ? "0/1 book" : "0/1 llibre"),
      icon: "fa-book-open-reader",
      color: "bg-violet-600"
    },
    {
      id: 'clue_detective',
      title: isEn() ? "Clue Detective" : "Detectiu de Pistes",
      desc: isEn() ? "You know how to read between the lines and deduce hidden information from the text." : "Saps llegir entre línies i deduir informació amagada al text.",
      requirement: isEn() ? "Answer 10 inferential questions correctly" : "Encertar 10 preguntes inferencials",
      unlocked: infCorrect >= 10,
      progress: Math.min(infCorrect, 10) + "/10",
      icon: "fa-magnifying-glass-chart",
      color: "bg-blue-600"
    },
    {
      id: 'double_meaning_master',
      title: isEn() ? "Double Meaning Master" : "Mestre/a del Doble Sentit",
      desc: isEn() ? "You master idioms, popular sayings, metaphors and irony." : "Domines les frases fetes, dites populars, metàfores i ironies.",
      requirement: isEn() ? "Answer 5 figurative meaning questions correctly" : "Encertar 5 preguntes de sentit figurat",
      unlocked: figCorrect >= 5,
      progress: Math.min(figCorrect, 5) + "/5",
      icon: "fa-comments",
      color: "bg-fuchsia-600"
    },
    {
      id: 'creative_critical_mind',
      title: isEn() ? "Creative & Critical Mind" : "Ment Creativa i Crítica",
      desc: isEn() ? "You share your own viewpoint and imagine original alternatives." : "Aportes el teu propi criteri i imagines alternatives originals.",
      requirement: isEn() ? "Complete 5 opinion or creative questions" : "Completar 5 preguntes d'opinió o creatives",
      unlocked: opCreatCorrect >= 5,
      progress: Math.min(opCreatCorrect, 5) + "/5",
      icon: "fa-wand-magic-sparkles",
      color: "bg-pink-600"
    },
    {
      id: 'multiformat',
      title: isEn() ? "Multi-format Explorer" : "Explorador/a Multiformat",
      desc: isEn() ? "Try different formats: written text, visual reading, or book." : "Tasta diferents formats: lectura escrita, visual o llibre.",
      requirement: isEn() ? "Complete at least 2 different formats" : "Completar almenys 2 formats diferents",
      unlocked: ([hasTextFormat, hasVisualFormat, hasBookFormat].filter(Boolean).length) >= 2,
      progress: ([hasTextFormat, hasVisualFormat, hasBookFormat].filter(Boolean).length) + (isEn() ? "/2 formats" : "/2 formats"),
      icon: "fa-shapes",
      color: "bg-teal-600"
    },
    {
      id: 'genre_traveler',
      title: isEn() ? "Genre Traveler" : "Viatger/a de Gèneres",
      desc: isEn() ? "Read stories from 3 different categories (Adventure, Mystery, Poetry...)." : "Llegeix històries de 3 categories diferents (Aventura, Misteri, Poesia...).",
      requirement: isEn() ? "3 different categories read" : "3 categories diferents llegides",
      unlocked: distinctCategories.size >= 3,
      progress: Math.min(distinctCategories.size, 3) + (isEn() ? "/3 genres" : "/3 gèneres"),
      icon: "fa-map-location-dot",
      color: "bg-indigo-600"
    }
  ];

  let badgesGridHTML = '';
  achievements.forEach(function(ach) {
    const isUnlocked = !!ach.unlocked;
    badgesGridHTML += `
      <div class="relative p-4 rounded-2xl border-2 transition flex flex-col justify-between space-y-3 ${isUnlocked ? 'bg-amber-50/60 border-amber-300 shadow-xs ring-1 ring-amber-200/50' : 'bg-slate-50 border-slate-200 opacity-60 grayscale hover:grayscale-0 hover:opacity-90'}">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-2xl ${isUnlocked ? ach.color : 'bg-slate-300'} text-white flex items-center justify-center text-xl shadow shrink-0">
            <i class="fa-solid ${ach.icon}"></i>
          </div>
          <div class="min-w-0 flex-grow space-y-0.5">
            <div class="flex items-center justify-between gap-1 flex-wrap">
              <h4 class="font-black text-sm ${isUnlocked ? 'text-slate-900' : 'text-slate-600'} leading-snug">${ach.title}</h4>
              <span class="text-[10px] font-black px-2 py-0.5 rounded-full ${isUnlocked ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'}">
                ${isUnlocked ? '✅ ' + ach.progress : '⏳ ' + ach.progress}
              </span>
            </div>
            <p class="text-xs ${isUnlocked ? 'text-slate-600' : 'text-slate-400'} leading-snug">${ach.desc}</p>
          </div>
        </div>

        <div class="pt-2 border-t ${isUnlocked ? 'border-amber-200/80' : 'border-slate-200'} flex items-center justify-between text-xs gap-2">
          <span class="text-[11px] font-bold ${isUnlocked ? 'text-slate-700' : 'text-slate-500'} flex items-center gap-1 min-w-0 truncate">
            <i class="fa-solid fa-flag-checkered ${isUnlocked ? 'text-amber-600' : 'text-slate-400'} shrink-0"></i>
            <span class="truncate" title="${escapeHtmlAttr(ach.requirement)}">${ach.requirement}</span>
          </span>
          <span class="shrink-0 font-extrabold text-[11px] ${isUnlocked ? 'text-emerald-700 flex items-center gap-1' : 'text-slate-400'}">
            ${isUnlocked ? '<i class="fa-solid fa-circle-check text-emerald-500"></i> ' + (isEn() ? 'Unlocked' : 'Aconseguida') : (isEn() ? 'Pending' : 'Pendent')}
          </span>
        </div>
      </div>
    `;
  });

  const unlockedBadgesCount = achievements.filter(function(a) { return a.unlocked; }).length;

  app.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <button onclick="resetFiltersAndRenderCatalog()" class="text-slate-500 hover:text-slate-800 text-sm font-medium inline-flex items-center">
          <i class="fa-solid fa-arrow-left mr-1"></i> ${isEn() ? 'Back to catalog' : 'Tornar al catàleg'}
        </button>

        <button onclick="renderEditProfileDataModal()" class="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs border border-slate-300 shadow-2xs flex items-center gap-1.5 transition">
          <i class="fa-solid fa-user-pen text-indigo-600"></i>
          <span>${isEn() ? ('Edit my profile (' + displayName + ')') : ('Editar les meves dades (' + displayName + ')')}</span>
        </button>
      </div>

      <!-- CAPÇALERA DEL PASSAPORT LECTOR -->
      <div class="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-lg border border-indigo-700/60 space-y-6">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
            <div class="w-20 h-20 rounded-3xl bg-gradient-to-tr ${rank.color} text-white flex items-center justify-center text-3xl shadow-xl border-2 border-white/30 shrink-0">
              <i class="fa-solid ${rank.icon}"></i>
            </div>
            <div class="space-y-1">
              <div class="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-amber-300 border border-white/15">
                <i class="fa-solid fa-passport"></i> ${isEn() ? 'Official Reading Adventure Passport' : 'Passaport Oficial de Lectura Aventura'}
              </div>
              <h1 class="text-2xl md:text-3xl font-black tracking-tight">${displayName}</h1>
              <p class="text-xs md:text-sm text-indigo-200 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span><i class="fa-solid fa-award text-amber-400 mr-1"></i> ${isEn() ? 'Rank' : 'Rang'}: <strong class="text-white">${getLocalizedRankName(rank.name)}</strong></span>
                ${userSchool ? '<span>· <i class="fa-solid fa-school text-indigo-300 mr-1"></i> ' + userSchool + '</span>' : ''}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2.5 w-full md:w-auto shrink-0">
            <div class="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15 text-center">
              <span class="block text-xl md:text-2xl font-black text-amber-400">${userPoints}</span>
              <span class="text-[10px] uppercase tracking-wider font-bold text-indigo-200">${isCreator ? (isEn() ? 'Creations' : 'Creacions') : (isEn() ? 'Total Points' : 'Punts Totals')}</span>
            </div>
            <div ${!isCreator ? 'onclick="togglePassportReadingsAccordion()" title="' + (isEn() ? 'Click to expand your completed readings' : 'Clica per desplegar les teves lectures fetes') + '"' : ''} class="${!isCreator ? 'cursor-pointer hover:bg-white/20 transition' : ''} bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15 text-center">
              <span class="block text-xl md:text-2xl font-black text-emerald-300">${completedCount}</span>
              <span class="text-[10px] uppercase tracking-wider font-bold text-indigo-200">${isEn() ? 'Readings Done' : 'Lectures Fetes'}</span>
            </div>
            <div class="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15 text-center">
              <span class="block text-xl md:text-2xl font-black text-sky-300">${unlockedBadgesCount}/${achievements.length}</span>
              <span class="text-[10px] uppercase tracking-wider font-bold text-indigo-200">${isEn() ? 'Badges' : 'Medalles'}</span>
            </div>
          </div>
        </div>

        <!-- BARRA DE PROGRÉS FINS AL SEGÜENT NIVELL -->
        <div class="bg-indigo-950/70 p-4 rounded-2xl border border-indigo-500/30 space-y-2">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
            <span class="font-bold text-indigo-200">${isEn() ? 'Progress to:' : 'Progrés cap a:'} <strong class="text-amber-300">${nextTargetLabel}</strong></span>
            <span class="font-mono font-bold text-white">${progressLabel}</span>
          </div>
          <div class="w-full h-3.5 bg-indigo-950 rounded-full overflow-hidden border border-indigo-600/50 p-0.5">
            <div class="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      </div>

      <!-- DESPLEGABLE DE LECTURES FETES I PUNTUACIONS (NOMÉS LECTORS) -->
      ${readerHistoryAccordionHTML}

      <!-- BLOC 1: TOTS ELS RANGS I PREMIS PER PUNTS -->
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-lg font-black text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-stairs text-amber-500"></i> ${isCreator ? (isEn() ? 'Teacher Ranks Scale' : 'Escala de Rangs Docents') : (isEn() ? 'The Rank Journey (All Levels)' : 'El Camí dels Rangs (Tots els Nivells)')}
            </h2>
            <p class="text-xs text-slate-500">
              ${isCreator ? (isEn() ? 'Each new reading you publish adds +1 point to your creator profile.' : 'Cada lectura nova que publiques suma +1 punt al teu perfil de creador/a.') : (isEn() ? 'Accumulate points by completing readings and quizzes to unlock all badges.' : 'Acumula punts completant lectures i qüestionaris per desbloquejar tots els emblemes.')}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${ranksGridHTML}
        </div>
      </div>

      <!-- BLOC 2: MEDALLES I FITES ESPECIALS (SEPARADES PER ROL) -->
      <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-lg font-black text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-medal text-indigo-600"></i> ${isCreator ? (isEn() ? 'Teacher & Creator Medals (' + unlockedBadgesCount + ' / 8)' : 'Medalles de Docent i Creador (' + unlockedBadgesCount + ' / 8)') : (isEn() ? 'Medals (' + unlockedBadgesCount + ' / ' + achievements.length + ')' : 'Medalles (' + unlockedBadgesCount + ' / ' + achievements.length + ')')}
            </h2>
            <p class="text-xs text-slate-500">
              ${isCreator ? (isEn() ? 'Complete pedagogical, creation, and classroom milestones to unlock all 8 teacher medals.' : 'Completa fites pedagògiques, de creació i de dinamització d\'aules per aconseguir les 8 medalles docents.') : (isEn() ? 'Complete challenges of perseverance, accuracy, and reading variety to earn all 11 medals.' : 'Completa reptes de constància, precisió i varietat de lectures per aconseguir les 11 medalles.')}
            </p>
          </div>
          <span class="text-xs font-extrabold bg-indigo-50 text-indigo-800 px-3 py-1 rounded-xl border border-indigo-200 self-start sm:self-auto">
            ${unlockedBadgesCount} / ${achievements.length} ${isEn() ? 'unlocked' : 'aconseguides'}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${badgesGridHTML}
        </div>
      </div>

      <!-- BLOC 3: COM ES GUANYEN PUNTS? (REGLES DEL JOC) -->
      <div class="bg-amber-50/80 p-5 rounded-2xl border border-amber-200/90 space-y-3">
        <h3 class="text-sm font-black text-amber-950 flex items-center gap-2">
          <i class="fa-solid fa-circle-question text-amber-600"></i> ${isEn() ? 'How can I earn more points and level up?' : 'Com puc aconseguir més punts i pujar de nivell?'}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-amber-950">
          <div class="bg-white/90 p-3.5 rounded-xl border border-amber-200/70 space-y-1">
            <span class="font-black text-indigo-700 block">${isEn() ? '1. Solve quizzes (+1 or +2 PTS)' : '1. Resol qüestionaris (+1 o +2 PTS)'}</span>
            <p class="text-slate-600 leading-relaxed">${isEn() ? 'Each correct question adds <strong>1 point</strong> (or <strong>2 points</strong> in higher difficulty readings).' : 'Cada pregunta encertada suma <strong>1 punt</strong> (o <strong>2 punts</strong> en lectures de més dificultat).'}</p>
          </div>
          <div class="bg-white/90 p-3.5 rounded-xl border border-amber-200/70 space-y-1">
            <span class="font-black text-emerald-700 block">${isEn() ? '2. Beat your record!' : '2. Supera la teva marca!'}</span>
            <p class="text-slate-600 leading-relaxed">${isEn() ? 'If you repeat a reading and score higher than last time, the <strong>point difference</strong> is added to your total.' : 'Si repeteixes una lectura i treus més punts que l\'última vegada, se\'t suma la <strong>diferència de punts</strong> al marcador.'}</p>
          </div>
          <div class="bg-white/90 p-3.5 rounded-xl border border-amber-200/70 space-y-1">
            <span class="font-black text-purple-700 block">${isEn() ? '3. Explore the full catalog' : '3. Explora tot el catàleg'}</span>
            <p class="text-slate-600 leading-relaxed">${isEn() ? 'Combine short texts, visual readings, and books from different genres to complete all badges.' : 'Combina textos curts, lectures visuals i llibres de diferents gèneres per completar les medalles.'}</p>
          </div>
        </div>
      </div>
    </div>
  `;
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

