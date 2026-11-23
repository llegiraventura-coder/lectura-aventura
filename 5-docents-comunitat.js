// =========================================================================
// CAPÍTOL 5: CARPETES / SITUACIONS D'APRENENTATGE, RÀNQUING, ALUMNES I BÚSTIA
// =========================================================================

// -------------------------------------------------------------------------
// 1. CARPETES I SITUACIONS D'APRENENTATGE (SA)
// -------------------------------------------------------------------------

async function renderFoldersView() {
  stopSpeechPlayback();
  const app = document.getElementById('app');
  if (!app || !db) return;

  app.innerHTML = `
    <div class="text-center py-12">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-600"></i>
      <p class="mt-2 text-xs text-slate-500 font-medium">Carregant carpetes i situacions d'aprenentatge...</p>
    </div>
  `;

  try {
    if (cachedLecturesList.length === 0) {
      await fetchAllReadingsFromFirestore();
    }
    const snap = await withTimeout(db.collection(FOLDERS_COLLECTION).get(), 8000, 'càrrega de carpetes');
    const folders = [];
    snap.forEach(function(doc) {
      folders.push(Object.assign({ id: doc.id }, doc.data()));
    });

    const visibleFolders = folders.filter(function(f) {
      if (f.isPublic !== false) return true;
      return currentUser && (f.authorUid === currentUser.uid || currentUser.email === ADMIN_SUPREMO_EMAIL);
    });

    const isTeacher = isUserAdminOrCreator();

    const cardsHtml = visibleFolders.length === 0
      ? `<div class="col-span-full bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2">
          <i class="fa-solid fa-folder-open text-4xl text-slate-300"></i>
          <h3 class="font-bold text-slate-700">Encara no hi ha carpetes o Situacions d'Aprenentatge creades</h3>
          <p class="text-xs text-slate-500">Els docents poden agrupar lectures per projectes, trimestres o centres d'interès.</p>
        </div>`
      : visibleFolders.map(function(folder) {
          const rIds = Array.isArray(folder.readingIds) ? folder.readingIds : [];
          const canManage = currentUser && (folder.authorUid === currentUser.uid || currentUser.email === ADMIN_SUPREMO_EMAIL);
          return `<div class="bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  <i class="fa-solid fa-folder mr-1"></i>${rIds.length} lectures
                </span>
                ${folder.level ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">${escapeHtmlSafe(folder.level)}</span>` : ''}
              </div>
              <h3 class="font-extrabold text-lg text-slate-800 leading-snug">${escapeHtmlSafe(folder.title || 'Carpeta sense títol')}</h3>
              <p class="text-xs text-slate-600 mt-1 line-clamp-2">${escapeHtmlSafe(folder.description || 'Recull temàtic de lectures.')}</p>
              <p class="text-[11px] text-slate-400 mt-2">Docent: ${escapeHtmlSafe(folder.authorName || 'Equip docent')}</p>
            </div>

            <div class="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button onclick="openFolderDetail('${folder.id}')" class="flex-grow py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition">
                Obrir carpeta
              </button>
              ${canManage ? `
                <button onclick="deleteFolder('${folder.id}', '${escapeHtmlAttr(folder.title)}')" class="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs" title="Eliminar carpeta">
                  <i class="fa-solid fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>`;
        }).join('');

    app.innerHTML = `
      <div class="space-y-6">
        <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-folder-tree text-amber-500"></i>
              <span>Carpetes i Situacions d'Aprenentatge</span>
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">Itineraris de lectura organitzats per projectes, àrees i nivells educatius.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="resetFiltersAndRenderCatalog()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
              <i class="fa-solid fa-arrow-left mr-1"></i> Catàleg
            </button>
            ${isTeacher ? `
              <button onclick="openCreateFolderModal()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow">
                <i class="fa-solid fa-folder-plus mr-1"></i> Nova Carpeta / SA
              </button>
            ` : ''}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          ${cardsHtml}
        </div>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<div class="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-center">Error carregant carpetes: ${escapeHtmlSafe(err.message)}</div>`;
  }
}

function openCreateFolderModal() {
  const container = document.getElementById('folder-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div onclick="closeFolderModal()" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div onclick="event.stopPropagation()" class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="font-extrabold text-lg text-slate-800">Nova Carpeta / Situació d'Aprenentatge</h3>
          <button onclick="closeFolderModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <form onsubmit="saveNewFolder(event)" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Títol de la carpeta o SA *</label>
            <input type="text" id="fld-title" required placeholder="Ex: SA1 - Descobrim l'Univers" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Nivell educatiu</label>
            <select id="fld-level" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white">
              <option value="Cicle Inicial">Cicle Inicial</option>
              <option value="Cicle Mitjà" selected>Cicle Mitjà</option>
              <option value="Cicle Superior">Cicle Superior</option>
              <option value="ESO">ESO</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Descripció i objectius</label>
            <textarea id="fld-desc" rows="3" placeholder="Explica breument què treballarem en aquest recull..." class="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"></textarea>
          </div>
          <label class="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" id="fld-public" checked class="w-4 h-4 text-indigo-600">
            <span>Carpeta visible per a tota la comunitat i alumnat</span>
          </label>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="closeFolderModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancel·lar</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow">Crear carpeta</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function closeFolderModal() {
  const container = document.getElementById('folder-modal-container');
  if (container) container.innerHTML = '';
}

async function saveNewFolder(e) {
  e.preventDefault();
  if (!currentUser || !db) return;
  try {
    await db.collection(FOLDERS_COLLECTION).add({
      title: (document.getElementById('fld-title').value || '').trim(),
      level: document.getElementById('fld-level').value || 'Cicle Mitjà',
      description: (document.getElementById('fld-desc').value || '').trim(),
      isPublic: Boolean(document.getElementById('fld-public').checked),
      readingIds: [],
      authorUid: currentUser.uid,
      authorName: userDisplayName || currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeFolderModal();
    renderFoldersView();
  } catch (err) {
    alert("Error creant la carpeta: " + err.message);
  }
}

async function openFolderDetail(folderId) {
  const app = document.getElementById('app');
  if (!app || !db) return;

  try {
    if (cachedLecturesList.length === 0) await fetchAllReadingsFromFirestore();
    const snap = await db.collection(FOLDERS_COLLECTION).doc(folderId).get();
    if (!snap.exists) return;
    const folder = Object.assign({ id: snap.id }, snap.data());
    const rIds = Array.isArray(folder.readingIds) ? folder.readingIds : [];
    const canManage = currentUser && (folder.authorUid === currentUser.uid || currentUser.email === ADMIN_SUPREMO_EMAIL);

    const assignedReadings = rIds.map(function(id) {
      return cachedLecturesList.find(function(r) { return r.id === id; });
    }).filter(Boolean);

    const availableToAdd = cachedLecturesList.filter(function(r) {
      return !rIds.includes(r.id);
    });

    app.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <button onclick="renderFoldersView()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
              <i class="fa-solid fa-arrow-left mr-1"></i> Totes les carpetes
            </button>
            <span class="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">${escapeHtmlSafe(folder.level || '')}</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-800">${escapeHtmlSafe(folder.title)}</h1>
          <p class="text-sm text-slate-600">${escapeHtmlSafe(folder.description || '')}</p>
        </div>

        ${canManage ? `
          <div class="bg-indigo-50/70 rounded-2xl border border-indigo-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select id="add-reading-to-folder-select" class="flex-grow px-3.5 py-2 rounded-xl border border-indigo-300 bg-white text-xs font-medium">
              <option value="">-- Selecciona una lectura per afegir a aquesta carpeta --</option>
              ${availableToAdd.map(function(r) {
                return `<option value="${r.id}">${formatReadingCode(r.codeNumber)} — ${escapeHtmlSafe(r.title)} (${escapeHtmlSafe(r.level || '')})</option>`;
              }).join('')}
            </select>
            <button type="button" onclick="addReadingToFolder('${folder.id}')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0">
              <i class="fa-solid fa-plus mr-1"></i> Afegir lectura
            </button>
          </div>
        ` : ''}

        <div class="space-y-3">
          ${assignedReadings.length === 0
            ? `<div class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">Aquesta carpeta encara no té lectures assignades.</div>`
            : assignedReadings.map(function(r, idx) {
                const isDone = userCompletedReadings.includes(r.id);
                return `<div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 font-extrabold text-xs flex items-center justify-center">${idx + 1}</span>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-[11px] font-bold text-slate-500">${formatReadingCode(r.codeNumber)}</span>
                        ${isDone ? `<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Completada (${userScores[r.id]}/10)</span>` : ''}
                      </div>
                      <h3 class="font-extrabold text-slate-800 text-sm">${escapeHtmlSafe(r.title)}</h3>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button onclick="openReader('${r.id}')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                      Llegir ara
                    </button>
                    ${canManage ? `
                      <button onclick="removeReadingFromFolder('${folder.id}', '${r.id}')" class="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs" title="Treure de la carpeta">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    ` : ''}
                  </div>
                </div>`;
              }).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    alert("Error obrint carpeta: " + err.message);
  }
}

async function addReadingToFolder(folderId) {
  const sel = document.getElementById('add-reading-to-folder-select');
  const readingId = sel ? sel.value : '';
  if (!readingId) return;
  await db.collection(FOLDERS_COLLECTION).doc(folderId).update({
    readingIds: firebase.firestore.FieldValue.arrayUnion(readingId)
  });
  openFolderDetail(folderId);
}

async function removeReadingFromFolder(folderId, readingId) {
  await db.collection(FOLDERS_COLLECTION).doc(folderId).update({
    readingIds: firebase.firestore.FieldValue.arrayRemove(readingId)
  });
  openFolderDetail(folderId);
}

async function deleteFolder(folderId, title) {
  if (!confirm('Segur que vols eliminar la carpeta "' + title + '"? (Les lectures no s\'eliminaran del catàleg).')) return;
  await db.collection(FOLDERS_COLLECTION).doc(folderId).delete();
  renderFoldersView();
}

// -------------------------------------------------------------------------
// 2. CLASSIFICACIÓ I RÀNQUING DE LECTORS
// -------------------------------------------------------------------------

async function renderLeaderboardView() {
  stopSpeechPlayback();
  const app = document.getElementById('app');
  if (!app || !db) return;

  app.innerHTML = `
    <div class="text-center py-12">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-amber-500"></i>
      <p class="mt-2 text-xs text-slate-500 font-medium">Calculant classificació de lectors...</p>
    </div>
  `;

  try {
    let usersList = [];
    const targetTeacherUid = isUserAdminOrCreator() ? (currentUser ? currentUser.uid : '') : userTeacherUid;

    if (currentLeaderboardTab === 'group' && targetTeacherUid) {
      const snap = await db.collection('users').where('teacherUid', '==', targetTeacherUid).get();
      snap.forEach(function(d) {
        const u = d.data();
        if (u.role !== 'docent') usersList.push(u);
      });
    } else {
      currentLeaderboardTab = 'global';
      const snap = await db.collection('users').orderBy('points', 'desc').limit(30).get();
      snap.forEach(function(d) {
        const u = d.data();
        if (u.role !== 'docent') usersList.push(u);
      });
    }

    usersList.sort(function(a, b) { return (Number(b.points) || 0) - (Number(a.points) || 0); });

    const rowsHtml = usersList.length === 0
      ? `<div class="p-8 text-center text-xs text-slate-500">Encara no hi ha alumnes registrats en aquest rànquing.</div>`
      : usersList.map(function(u, index) {
          const pts = Number(u.points) || 0;
          const rank = getStudentRankInfo(pts);
          const completedCount = Array.isArray(u.completedReadings) ? u.completedReadings.length : 0;
          const isMe = currentUser && u.uid === currentUser.uid;
          let medalIcon = `<span class="font-mono font-bold text-slate-500">#${index + 1}</span>`;
          if (index === 0) medalIcon = `<i class="fa-solid fa-trophy text-amber-500 text-lg"></i>`;
          else if (index === 1) medalIcon = `<i class="fa-solid fa-medal text-slate-400 text-lg"></i>`;
          else if (index === 2) medalIcon = `<i class="fa-solid fa-award text-amber-700 text-lg"></i>`;

          return `<tr class="border-b border-slate-100 ${isMe ? 'bg-indigo-50/80 font-bold' : 'hover:bg-slate-50'}">
            <td class="py-3 px-4 text-center w-14">${medalIcon}</td>
            <td class="py-3 px-4">
              <div class="font-bold text-slate-800 text-sm">${escapeHtmlSafe(u.displayName || 'Lector/a')} ${isMe ? '<span class="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded ml-1">TU</span>' : ''}</div>
              ${u.classGroup ? `<span class="text-[11px] text-slate-400">Grup: ${escapeHtmlSafe(u.classGroup)}</span>` : ''}
            </td>
            <td class="py-3 px-4 hidden sm:table-cell">
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${rank.current.badgeBg}">${rank.current.name}</span>
            </td>
            <td class="py-3 px-4 text-center text-xs font-bold text-slate-600">${completedCount}</td>
            <td class="py-3 px-4 text-right font-mono font-extrabold text-indigo-700 text-sm">${pts} pts</td>
          </tr>`;
        }).join('');

    const hasGroupOption = Boolean((isUserAdminOrCreator() && currentUser) || userTeacherUid);

    app.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6">
        <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-trophy text-amber-500"></i>
              <span>Classificació de Lectors</span>
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">Supera lectures i reptes per pujar de rang al Passaport Lector.</p>
          </div>
          <div class="flex items-center gap-2">
            ${hasGroupOption ? `
              <button onclick="switchLeaderboardTab('group')" class="px-3.5 py-2 rounded-xl text-xs font-bold border transition ${currentLeaderboardTab === 'group' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'}">La meva classe</button>
            ` : ''}
            <button onclick="switchLeaderboardTab('global')" class="px-3.5 py-2 rounded-xl text-xs font-bold border transition ${currentLeaderboardTab === 'global' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'}">Rànquing Global</button>
            <button onclick="resetFiltersAndRenderCatalog()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">Catàleg</button>
          </div>
        </div>

        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-extrabold">
              <tr>
                <th class="py-3 px-4 text-center">Pos.</th>
                <th class="py-3 px-4">Lector/a</th>
                <th class="py-3 px-4 hidden sm:table-cell">Rang</th>
                <th class="py-3 px-4 text-center">Lectures</th>
                <th class="py-3 px-4 text-right">Punts</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<div class="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-center">Error carregant rànquing: ${escapeHtmlSafe(err.message)}</div>`;
  }
}

function switchLeaderboardTab(tab) {
  currentLeaderboardTab = tab;
  renderLeaderboardView();
}

// -------------------------------------------------------------------------
// 3. ELS MEUS ALUMNES I HISTORIAL D'AVALUACIÓ (PANELL DOCENT)
// -------------------------------------------------------------------------

let cachedTeacherStudents = [];

async function renderTeacherStudentsView() {
  stopSpeechPlayback();
  if (!isUserAdminOrCreator() || !currentUser) return;
  const app = document.getElementById('app');
  if (!app || !db) return;

  app.innerHTML = `
    <div class="text-center py-12">
      <i class="fa-solid fa-spinner fa-spin text-3xl text-emerald-600"></i>
      <p class="mt-2 text-xs text-slate-500 font-medium">Carregant seguiment del teu alumnat...</p>
    </div>
  `;

  try {
    const snap = await withTimeout(
      db.collection('users').where('teacherUid', '==', currentUser.uid).get(),
      8000,
      'càrrega d\'alumnes'
    );
    const students = [];
    snap.forEach(function(d) {
      const data = d.data();
      if (data.role !== 'docent') students.push(Object.assign({ id: d.id }, data));
    });
    students.sort(function(a, b) { return (a.displayName || '').localeCompare(b.displayName || ''); });
    cachedTeacherStudents = students;

    const groupsSet = new Set(userTeacherGroups || []);
    students.forEach(function(s) {
      if (s.classGroup) groupsSet.add(s.classGroup);
    });
    const allGroups = Array.from(groupsSet);

    const filteredStudents = selectedClassroomFilter === 'all'
      ? students
      : students.filter(function(s) { return (s.classGroup || '') === selectedClassroomFilter; });

    const totalReadingsDone = filteredStudents.reduce(function(acc, s) {
      return acc + (Array.isArray(s.completedReadings) ? s.completedReadings.length : 0);
    }, 0);

    const rowsHtml = filteredStudents.length === 0
      ? `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-500">Cap alumne vinculat encara. Comparteix el teu codi docent perquè s'hi enllacin des del seu Passaport Lector!</td></tr>`
      : filteredStudents.map(function(st) {
          const completed = Array.isArray(st.completedReadings) ? st.completedReadings.length : 0;
          const scoreVals = Object.values(st.scores || {}).map(Number);
          const avgScore = scoreVals.length > 0
            ? (scoreVals.reduce(function(a, b) { return a + b; }, 0) / scoreVals.length).toFixed(1)
            : '—';
          const rank = getStudentRankInfo(st.points || 0);

          return `<tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="py-3 px-4 font-bold text-slate-800 text-sm">${escapeHtmlSafe(st.displayName || 'Alumne')}</td>
            <td class="py-3 px-4 text-xs text-slate-600">${escapeHtmlSafe(st.classGroup || 'Sense grup')}</td>
            <td class="py-3 px-4 text-center font-bold text-xs text-indigo-700">${completed}</td>
            <td class="py-3 px-4 text-center font-mono font-bold text-xs ${Number(avgScore) >= 5 ? 'text-emerald-700' : 'text-slate-600'}">${avgScore}${avgScore !== '—' ? '/10' : ''}</td>
            <td class="py-3 px-4 text-right font-mono font-bold text-xs text-slate-700">${Number(st.points) || 0} pts</td>
            <td class="py-3 px-4 text-right">
              <button onclick="renderStudentDetailHistory('${st.uid || st.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs border border-indigo-200">
                <i class="fa-solid fa-clock-rotate-left mr-1"></i>Historial
              </button>
            </td>
          </tr>`;
        }).join('');

    app.innerHTML = `
      <div class="space-y-6">
        <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-users-line text-emerald-600"></i>
              <span>Els meus Alumnes</span>
            </h1>
            <p class="text-xs text-slate-500 mt-1">
              Codi de vinculació docent: <code class="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded font-mono font-bold select-all">${currentUser.uid}</code>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select onchange="filterTeacherStudentsByGroup(this.value)" class="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white">
              <option value="all" ${selectedClassroomFilter === 'all' ? 'selected' : ''}>Tots els grups (${students.length})</option>
              ${allGroups.map(function(g) {
                return `<option value="${escapeHtmlAttr(g)}" ${selectedClassroomFilter === g ? 'selected' : ''}>Grup: ${escapeHtmlSafe(g)}</option>`;
              }).join('')}
            </select>
            <button onclick="resetFiltersAndRenderCatalog()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">Catàleg</button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold text-slate-500">Alumnes vinculats</span>
            <div class="text-2xl font-black text-slate-800 mt-1">${filteredStudents.length}</div>
          </div>
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold text-slate-500">Lectures completades totals</span>
            <div class="text-2xl font-black text-indigo-700 mt-1">${totalReadingsDone}</div>
          </div>
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span class="text-xs font-bold text-slate-500">Grups actius</span>
            <div class="text-2xl font-black text-emerald-700 mt-1">${allGroups.length}</div>
          </div>
        </div>

        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500 font-extrabold">
              <tr>
                <th class="py-3 px-4">Alumne/a</th>
                <th class="py-3 px-4">Grup</th>
                <th class="py-3 px-4 text-center">Completades</th>
                <th class="py-3 px-4 text-center">Nota Mitjana</th>
                <th class="py-3 px-4 text-right">Punts</th>
                <th class="py-3 px-4 text-right">Detall</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    app.innerHTML = `<div class="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-center">Error carregant alumnes: ${escapeHtmlSafe(err.message)}</div>`;
  }
}

function filterTeacherStudentsByGroup(groupVal) {
  selectedClassroomFilter = groupVal;
  renderTeacherStudentsView();
}

function renderStudentDetailHistory(studentUid) {
  const st = cachedTeacherStudents.find(function(s) { return (s.uid || s.id) === studentUid; });
  const app = document.getElementById('app');
  if (!st || !app) return;

  const historyMap = st.readingHistory || {};
  const entries = Object.keys(historyMap).map(function(rId) {
    return Object.assign({ readingId: rId }, historyMap[rId]);
  });

  const rowsHtml = entries.length === 0
    ? `<div class="p-8 text-center text-xs text-slate-500">Aquest alumne encara no té activitat enregistrada a l'historial detallat.</div>`
    : entries.map(function(item) {
        const dateStr = item.lastCompletedAt ? new Date(item.lastCompletedAt).toLocaleDateString('ca-ES') : '—';
        return `<div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="font-bold text-slate-800 text-sm">${escapeHtmlSafe(item.title || 'Lectura')}</h4>
            <p class="text-xs text-slate-500">Intents: ${item.attempts || 1} • Última data: ${dateStr}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-extrabold text-xs">Millor nota: ${item.bestScore}/10</span>
          </div>
        </div>`;
      }).join('');

  app.innerHTML = `
    <div class="max-w-3xl mx-auto space-y-5">
      <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center justify-between gap-3">
        <div>
          <span class="text-xs font-bold text-indigo-600">Historial Lector Individual</span>
          <h2 class="text-xl font-extrabold text-slate-800">${escapeHtmlSafe(st.displayName || 'Alumne')}</h2>
          <p class="text-xs text-slate-500">Grup: ${escapeHtmlSafe(st.classGroup || 'Sense grup')} • ${Number(st.points) || 0} punts totals</p>
        </div>
        <button onclick="renderTeacherStudentsView()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
          <i class="fa-solid fa-arrow-left mr-1"></i> Tornar a la llista
        </button>
      </div>

      <div class="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
        ${rowsHtml}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------------------
// 4. BÚSTIA DE SUGGERIMENTS I SUPORT DOCENT
// -------------------------------------------------------------------------

async function openFeedbackModal() {
  const container = document.getElementById('feedback-modal-container');
  if (!container || !db) return;

  container.innerHTML = `
    <div onclick="closeFeedbackModal()" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div onclick="event.stopPropagation()" class="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-7 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="font-extrabold text-lg text-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-envelope-open-text text-sky-600"></i>
            <span>Bústia de Suggeriments i Comunitat Docent</span>
          </h3>
          <button onclick="closeFeedbackModal()" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <form onsubmit="submitTeacherFeedback(event)" class="space-y-3 bg-sky-50/60 p-4 rounded-2xl border border-sky-200">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <select id="fb-category" class="px-3 py-2 rounded-xl border border-sky-300 bg-white text-xs font-bold">
              <option value="Millora">💡 Proposta de millora</option>
              <option value="Petició de lectura">📚 Petició de lectura / tema</option>
              <option value="Incidència">🛠️ Comunicar incidència</option>
            </select>
            <input type="text" id="fb-subject" required placeholder="Assumpte breu..." class="px-3 py-2 rounded-xl border border-sky-300 bg-white text-xs">
          </div>
          <textarea id="fb-message" rows="2" required placeholder="Explica la teva idea o petició per millorar Lectura Aventura..." class="w-full px-3 py-2 rounded-xl border border-sky-300 bg-white text-xs"></textarea>
          <div class="flex justify-end">
            <button type="submit" class="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow">Enviar suggeriment</button>
          </div>
        </form>

        <div id="fb-list-container" class="space-y-2.5">
          <p class="text-xs text-slate-400 text-center py-4">Carregant missatges...</p>
        </div>
      </div>
    </div>
  `;

  try {
    const snap = await db.collection(FEEDBACK_COLLECTION).limit(25).get();
    const items = [];
    snap.forEach(function(d) { items.push(Object.assign({ id: d.id }, d.data())); });
    items.sort(function(a, b) {
      const tA = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
      const tB = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
      return tB - tA;
    });

    const listEl = document.getElementById('fb-list-container');
    if (!listEl) return;

    if (items.length === 0) {
      listEl.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">Encara no hi ha missatges a la bústia. Sigues el primer!</p>`;
      return;
    }

    listEl.innerHTML = items.map(function(it) {
      const canDel = currentUser && (currentUser.email === ADMIN_SUPREMO_EMAIL || it.authorUid === currentUser.uid);
      return `<div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-900">${escapeHtmlSafe(it.category || 'Millora')}</span>
            <strong class="text-xs text-slate-800">${escapeHtmlSafe(it.subject || '')}</strong>
          </div>
          ${canDel ? `<button onclick="deleteFeedbackItem('${it.id}')" class="text-rose-500 hover:text-rose-700 text-xs"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
        <p class="text-xs text-slate-600">${escapeHtmlSafe(it.message || '')}</p>
        <p class="text-[10px] text-slate-400">Enviat per ${escapeHtmlSafe(it.authorName || 'Docent')}</p>
      </div>`;
    }).join('');
  } catch (err) {
    console.warn(err);
  }
}

function closeFeedbackModal() {
  const container = document.getElementById('feedback-modal-container');
  if (container) container.innerHTML = '';
}

async function submitTeacherFeedback(e) {
  e.preventDefault();
  if (!currentUser || !db) return;
  try {
    await db.collection(FEEDBACK_COLLECTION).add({
      category: document.getElementById('fb-category').value || 'Millora',
      subject: (document.getElementById('fb-subject').value || '').trim(),
      message: (document.getElementById('fb-message').value || '').trim(),
      authorUid: currentUser.uid,
      authorName: userDisplayName || currentUser.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    openFeedbackModal();
  } catch (err) {
    alert("Error enviant suggeriment: " + err.message);
  }
}

async function deleteFeedbackItem(docId) {
  if (!confirm("Eliminar aquest missatge de la bústia?")) return;
  await db.collection(FEEDBACK_COLLECTION).doc(docId).delete();
  openFeedbackModal();
}