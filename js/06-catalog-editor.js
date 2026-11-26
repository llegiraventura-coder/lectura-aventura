async function renderCatalog() {
  stopSpeechSynthesis();
  const app = document.getElementById('app');
  if (!app) return;
  if (!db) {
    app.innerHTML = '<div class="p-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl max-w-xl mx-auto text-center">' + (isEn() ? 'No connection to Firestore database.' : 'No hi ha connexió amb la base de dades Firestore.') + '</div>';
    return;
  }
  app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? 'Loading catalog...' : 'Carregant el catàleg...') + '</p></div>';

  try {
    let snapshot;
    try {
      snapshot = await withTimeout(
        db.collection(getReadingsCollection()).orderBy('createdAt', 'desc').get(),
        8000,
        "càrrega del catàleg"
      );
    } catch (orderErr) {
      snapshot = await withTimeout(
        db.collection(getReadingsCollection()).get(),
        8000,
        "càrrega alternativa del catàleg"
      );
    }

    const adaptedParentsSet = new Set();
    const docsArray = snapshot.docs || [];
    if (userAssignedReadings && userAssignedReadings.length > 0) {
      docsArray.sort(function(a, b) {
        const aAssigned = userAssignedReadings.includes(a.id);
        const bAssigned = userAssignedReadings.includes(b.id);
        const aDone = userCompletedReadings.includes(a.id);
        const bDone = userCompletedReadings.includes(b.id);
        const aPriority = aAssigned && !aDone ? 2 : (aAssigned ? 1 : 0);
        const bPriority = bAssigned && !bDone ? 2 : (bAssigned ? 1 : 0);
        return bPriority - aPriority;
      });
    }
    docsArray.forEach(function(d) {
      const item = d.data() || {};
      if (item.parentReadingId && item.isAdaptedVersion) {
        adaptedParentsSet.add(item.parentReadingId);
      }
    });

    let html = `
      <div class="max-w-6xl mx-auto space-y-6">

        ${filterMyLectures ? `
          <div class="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center justify-between shadow-sm">
            <span class="flex items-center gap-2">
              <i class="fa-solid fa-filter text-amber-600"></i>
              ${isUserAdminOrCreator() ? (isEn() ? 'Showing only readings created by you.' : 'Mostrant només les lectures que has creat tu.') : (isEn() ? 'Showing only readings you have already completed.' : 'Mostrant només les lectures que ja has completat.')}
            </span>
            <button onclick="toggleMyLectures()" class="text-amber-700 hover:text-amber-900 underline text-xs">${isEn() ? 'Show all' : 'Mostrar-ho tot'}</button>
          </div>
        ` : ''}

        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="relative">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-sm"></i>
              <input type="text" id="search-input" value="${escapeHtmlAttr(filterSearch)}" placeholder="${isEn() ? 'Search by title or code #EN...' : 'Cercar per títol o codi #CL...'}" oninput="applyCatalogFilters()" class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>

            <div class="relative">
              <i class="fa-solid fa-user-pen absolute left-3.5 top-3 text-slate-400 text-sm"></i>
              <input type="text" id="author-search-input" value="${escapeHtmlAttr(filterBookAuthor)}" placeholder="${isEn() ? 'Search by work author...' : "Cercar per autor/a de l'obra..."}" oninput="applyCatalogFilters()" class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
            </div>

            <div>
              <select id="type-select" onchange="applyCatalogFilters()" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="all" ${filterType === 'all' ? 'selected' : ''}>${isEn() ? '📑 All types' : '📑 Tots els tipus'}</option>
                <option value="text" ${filterType === 'text' ? 'selected' : ''}>${isEn() ? '📄 Written text (Short reading)' : '📄 Text escrit (Lectura curta)'}</option>
                <option value="visual_text" ${filterType === 'visual_text' ? 'selected' : ''}>${isEn() ? '🖼️ Visual Reading (Reference image)' : '🖼️ Lectura Visual (Imatge de referència)'}</option>
                <option value="book" ${filterType === 'book' ? 'selected' : ''}>${isEn() ? '📖 Reading book' : '📖 Llibre de lectura'}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <select id="level-select" onchange="applyCatalogFilters()" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="all" ${filterLevel === 'all' ? 'selected' : ''}>${isEn() ? '🎓 All levels' : '🎓 Tots els nivells'}</option>
                <option value="1r cicle de primària" ${filterLevel === '1r cicle de primària' || filterLevel === 'Cicle Inicial' ? 'selected' : ''}>${isEn() ? '1st primary cycle' : '1r cicle de primària'}</option>
                <option value="2n cicle de primària" ${filterLevel === '2n cicle de primària' || filterLevel === 'Cicle Mitjà' ? 'selected' : ''}>${isEn() ? '2nd primary cycle' : '2n cicle de primària'}</option>
                <option value="3r cicle de primària" ${filterLevel === '3r cicle de primària' || filterLevel === 'Cicle Superior' ? 'selected' : ''}>${isEn() ? '3rd primary cycle' : '3r cicle de primària'}</option>
                <option value="Secundària" ${filterLevel === 'Secundària' ? 'selected' : ''}>${isEn() ? 'Secondary (ESO)' : 'Secundària (ESO)'}</option>
                <option value="Formació d'Adults" ${filterLevel === "Formació d'Adults" ? 'selected' : ''}>${isEn() ? '🧑‍💼 Adult Education / CFA' : "🧑‍💼 Formació d'Adults / CFA"}</option>
              </select>
            </div>

            <div>
              <select id="category-select" onchange="applyCatalogFilters()" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="all" ${filterCategory === 'all' ? 'selected' : ''}>${isEn() ? '📚 All categories' : '📚 Totes les categories'}</option>
                <option value="Aventura" ${filterCategory === 'Aventura' ? 'selected' : ''}>${isEn() ? '🧭 Adventure' : '🧭 Aventura'}</option>
                <option value="Misteri" ${filterCategory === 'Misteri' ? 'selected' : ''}>${isEn() ? '🔍 Mystery' : '🔍 Misteri'}</option>
                <option value="Ciència-ficció" ${filterCategory === 'Ciència-ficció' ? 'selected' : ''}>${isEn() ? '🚀 Science fiction' : '🚀 Ciència-ficció'}</option>
                <option value="Teatre" ${filterCategory === 'Teatre' ? 'selected' : ''}>${isEn() ? '🎭 Theatre' : '🎭 Teatre'}</option>
                <option value="Poesia" ${filterCategory === 'Poesia' ? 'selected' : ''}>${isEn() ? '📜 Poetry' : '📜 Poesia'}</option>
                <option value="Tradició / Llegenda" ${filterCategory === 'Tradició / Llegenda' ? 'selected' : ''}>${isEn() ? '🏛️ Tradition / Legend' : '🏛️ Tradició / Llegenda'}</option>
                <option value="General" ${filterCategory === 'General' ? 'selected' : ''}>${isEn() ? '📖 General' : '📖 General'}</option>
              </select>
            </div>

            <div>
              <select id="duration-select" onchange="applyCatalogFilters()" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="all" ${filterDuration === 'all' ? 'selected' : ''}>${isEn() ? '⏱️ What duration / size?' : '⏱️ Quina durada / mida?'}</option>
                <option value="5 min" ${filterDuration === '5 min' ? 'selected' : ''}>${isEn() ? '⏱️ 5 minutes (Very short)' : '⏱️ 5 minuts (Molt curta)'}</option>
                <option value="10 min" ${filterDuration === '10 min' ? 'selected' : ''}>${isEn() ? '⏱️ 10 minutes (Short)' : '⏱️ 10 minuts (Curta)'}</option>
                <option value="15 min" ${filterDuration === '15 min' ? 'selected' : ''}>${isEn() ? '⏱️ 15 minutes (Medium)' : '⏱️ 15 minuts (Mitjana)'}</option>
                <option value="+20 min" ${filterDuration === '+20 min' ? 'selected' : ''}>${isEn() ? '⏱️ +20 minutes (Long)' : '⏱️ +20 minuts (Llarga)'}</option>
              </select>
            </div>

            <div>
              <select id="status-select" onchange="applyCatalogFilters()" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>${isEn() ? '📌 All readings' : '📌 Totes les lectures'}</option>
                ${userAssignedReadings && userAssignedReadings.length > 0 ? `
                  <option value="assigned" ${filterStatus === 'assigned' ? 'selected' : ''}>⭐ ${isEn() ? 'Assigned by class' : "Assignades per l'aula"} (${userAssignedReadings.length})</option>
                ` : ''}
                <option value="has_adapted" ${filterStatus === 'has_adapted' ? 'selected' : ''}>${isEn() ? '🌱 With adapted version (DUA)' : '🌱 Amb versió adaptada (DUA)'}</option>
                <option value="pending" ${filterStatus === 'pending' ? 'selected' : ''}>${isEn() ? '⏳ Pending' : '⏳ Pendents de fer'}</option>
                <option value="completed" ${filterStatus === 'completed' ? 'selected' : ''}>${isEn() ? '✅ Already done' : '✅ Ja fetes'}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;

    let cardCount = 0;
    const totalDocsInDb = docsArray.length;

    if (totalDocsInDb > 0) {
      for (let i = 0; i < docsArray.length; i++) {
        const doc = docsArray[i];
        const data = doc.data() || {};
        const docId = doc.id;
        const isBook = data.type === 'book';
        const isVisualText = !isBook && data.contentFormat === 'image';
        const isCompleted = userCompletedReadings.includes(docId);
        const isAdaptedText = !!data.isAdaptedVersion;
        const hasAnnexAdaptation = adaptedParentsSet.has(docId) || isAdaptedText;

        const readingNum = data.readingNumber || (totalDocsInDb - i);
        const readingCode = formatReadingCode(readingNum);
        const bookAuthorName = data.bookAuthor || '';

        let currentLevel = data.level || '';
        if (currentLevel === 'Cicle Inicial') currentLevel = '1r cicle de primària';
        if (currentLevel === 'Cicle Mitjà') currentLevel = '2n cicle de primària';
        if (currentLevel === 'Cicle Superior') currentLevel = '3r cicle de primària';

        if (filterMyLectures && currentUser) {
          if (isUserAdminOrCreator()) {
            if (data.authorUid !== currentUser.uid) continue;
          } else {
            if (!isCompleted) continue;
          }
        }

        const matchesSearch = (data.title || '').toLowerCase().includes(filterSearch) || readingCode.toLowerCase().includes(filterSearch);
        const matchesBookAuthor = !filterBookAuthor || (bookAuthorName.toLowerCase().includes(filterBookAuthor));

        let itemFilterType = 'text';
        if (isBook) itemFilterType = 'book';
        else if (isVisualText) itemFilterType = 'visual_text';

        const matchesType = filterType === 'all' || itemFilterType === filterType;

        let matchesLevel = filterLevel === 'all';
        if (!matchesLevel) {
          matchesLevel = currentLevel === filterLevel;
        }

        const matchesCategory = filterCategory === 'all' || (data.category || 'General') === filterCategory;
        const matchesDuration = filterDuration === 'all' || (data.estimatedTime === filterDuration);

        let matchesStatus = true;
        if (filterStatus === 'completed') matchesStatus = isCompleted;
        if (filterStatus === 'pending') matchesStatus = !isCompleted;
        if (filterStatus === 'has_adapted') matchesStatus = hasAnnexAdaptation;
        if (filterStatus === 'assigned') matchesStatus = userAssignedReadings.includes(docId);

        if (!matchesSearch || !matchesBookAuthor || !matchesType || !matchesLevel || !matchesCategory || !matchesDuration || !matchesStatus) continue;

        cardCount++;
        const qCount = data.questionCount || 10;
        const isVariant = !!data.parentReadingId;
        const hasGlossary = Array.isArray(data.glossary) && data.glossary.length > 0;

        const isAdmin = currentUser && currentUser.email === ADMIN_SUPREMO_EMAIL;
        const isAuthor = currentUser && data.authorUid === currentUser.uid;
        const canEdit = isAdmin || isAuthor;
        const isDocentOrCollab = isUserAdminOrCreator();

        const schoolSuffix = data.authorSchool ? (' (' + data.authorSchool + ')') : '';
        const teacherText = data.authorDisplayName ? (data.authorDisplayName + schoolSuffix) : (isEn() ? 'Teacher / Collaborator' : 'Docent / Col·laborador/a');
        const authorPoints = data.authorPoints !== undefined ? data.authorPoints : 0;
        const authorEmail = data.authorEmail || "";
        const teacherRank = getTeacherRankDetails(authorPoints, authorEmail);

        const ptsPerQuestion = data.pointsPerQuestion !== undefined ? data.pointsPerQuestion : 1;
        const durationLabel = isBook ? (data.bookPages ? ('📄 ' + data.bookPages + (isEn() ? ' pages' : ' pàg.')) : '') : (data.estimatedTime ? ('⏱️ ' + data.estimatedTime) : '');
        const totalPointsInGame = qCount * ptsPerQuestion;
        const encodedTitle = encodeURIComponent(data.title || (isEn() ? 'Reading' : 'Lectura'));

        let topBannerHTML = '';
        if (isAdaptedText) {
          topBannerHTML = '<div class="bg-emerald-500 text-white text-[10px] font-black px-3 py-0.5 tracking-wide flex items-center gap-1 border-b border-emerald-600"><i class="fa-solid fa-seedling"></i> ' + (isEn() ? 'Adapted Version' : 'Versió Adaptada / Simplificada (DUA)') + '</div>';
        } else if (isVariant) {
          topBannerHTML = '<div class="bg-amber-400 text-slate-900 text-[10px] font-black px-3 py-0.5 tracking-wide flex items-center gap-1 border-b border-amber-500"><i class="fa-solid fa-code-fork"></i> ' + (isEn() ? 'Question Variant' : 'Bateria de Preguntes Adaptada') + '</div>';
        } else if (adaptedParentsSet.has(docId)) {
          topBannerHTML = '<div class="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-3 py-0.5 tracking-wide flex items-center gap-1 border-b border-emerald-200"><i class="fa-solid fa-seedling text-emerald-600"></i> ' + (isEn() ? 'Original Reading' : 'Amb Versió Adaptada (DUA) annexa') + '</div>';
        }

        const isAssignedToUser = userAssignedReadings && userAssignedReadings.includes(docId);
        const cardBorderClass = isAssignedToUser ? 'border-emerald-500 ring-2 ring-emerald-400/30 shadow-emerald-50' : (isAdaptedText ? 'border-emerald-400 shadow-emerald-50' : (isVariant ? 'border-amber-300 shadow-amber-50' : (isVisualText ? 'border-teal-300 shadow-teal-50/50' : 'border-slate-200')));
        const typeBadgeClass = isBook ? 'bg-purple-100 text-purple-800' : (isVisualText ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-indigo-100 text-indigo-800');
        const typeBadgeLabel = isBook ? (isEn() ? '📖 Book' : '📖 Llibre') : (isVisualText ? (isEn() ? '🖼️ Visual Reading' : '🖼️ Lectura Visual') : (isEn() ? '📄 Text' : '📄 Text'));
        const btnReadClass = isCompleted ? 'bg-slate-700 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700';
        const btnReadLabel = isCompleted ? (isEn() ? 'Repeat' : 'Repetir') : (isBook ? (isEn() ? 'Quiz' : 'Qüestionari') : (isEn() ? 'Read & Quiz' : 'Lectura i qüestionari'));
        const btnReadSpan = isDocentOrCollab ? 'col-span-4' : 'col-span-5';

        const previewImgSrc = isBook ? data.imageUrl : (isVisualText ? (data.referenceImageUrl || data.imageUrl) : '');

        html += `
          <div class="bg-white rounded-2xl border ${cardBorderClass} shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between relative">
            ${topBannerHTML}

            <div class="p-5">
              <div class="flex items-center justify-between mb-3 gap-2">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50/80 text-indigo-700 border border-indigo-200/80">
                    ${readingCode}
                  </span>
                  <span class="text-xs font-bold px-2 py-0.5 rounded-full ${typeBadgeClass}">
                    ${typeBadgeLabel}
                  </span>
                </div>

                <div class="flex items-center gap-1.5 flex-wrap justify-end">
                  ${hasGlossary ? '<span class="text-[10px] bg-teal-100 text-teal-800 font-extrabold px-2 py-0.5 rounded-md border border-teal-200">' + (isEn() ? '📖 Vocabulary' : '📖 Vocabulari') + '</span>' : ''}
                  ${durationLabel ? '<span class="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-md border border-slate-200">' + durationLabel + '</span>' : ''}
                  ${isAssignedToUser ? `<span class="text-[10px] bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs border border-emerald-700"><i class="fa-solid fa-bookmark"></i> ${isEn() ? "Assigned by class" : "Assignada per l'aula"}</span>` : ""}
                  <span class="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-2.5 py-0.5 rounded-md shadow-xs">
                    🏆 ${totalPointsInGame} PTS
                  </span>
                  ${isCompleted ? '<span class="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">' + (isEn() ? '✅ Done' : '✅ Feta') + '</span>' : ''}
                </div>
              </div>

              ${previewImgSrc ? '<div class="w-full h-36 mb-3 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/60"><img src="' + previewImgSrc + '" alt="' + escapeHtmlAttr(data.title) + '" class="w-full h-full object-cover"></div>' : ''}

              <h3 class="font-bold text-slate-800 text-lg mb-1 line-clamp-2">${data.title || (isEn() ? 'Untitled' : 'Sense títol')}</h3>
              <p class="text-xs font-semibold text-indigo-600 mb-2">${getTranslatedLevel(currentLevel)}${data.category ? (' · ' + (isEn() ? getTranslatedCategory(data.category) : data.category)) : ''}</p>

              ${bookAuthorName ? '<p class="text-xs text-slate-600 font-semibold mb-2 flex items-center gap-1.5"><i class="fa-solid fa-feather-pointed text-amber-600"></i><span>' + (isEn() ? 'Book author:' : "Autor/a de l'obra:") + ' <strong class="text-slate-900 font-bold">' + bookAuthorName + '</strong></span></p>' : ''}

              <div class="mt-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                <span class="block text-xs text-slate-500 flex items-center gap-1">
                  <i class="fa-solid fa-chalkboard-user text-indigo-500 text-[11px]"></i>
                  ${isBook ? (isEn() ? 'Reading comprehension questions:' : 'Preguntes de comprensió lectora:') : (isVisualText ? (isEn() ? 'Visual reading created by:' : 'Lectura visual creada per:') : (isEn() ? (isAdaptedText ? 'Adapted by:' : 'Created by:') : 'Lectura adaptada:'))}
                </span>
                <div class="text-xs text-slate-800 font-bold">
                  ${teacherText}
                </div>
                <div class="pt-0.5">
                  <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 ${teacherRank.badgeBg}">
                    <i class="fa-solid ${teacherRank.icon} text-[10px]"></i>
                    ${teacherRank.name}
                  </span>
                </div>
              </div>
            </div>

            <div class="p-5 pt-0 mt-auto space-y-2">
              <div class="grid grid-cols-7 gap-1.5">
                <button onclick="renderReader('${docId}')" class="${btnReadSpan} ${btnReadClass} text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5">
                  <i class="fa-solid ${isVisualText ? 'fa-eye' : 'fa-book-open'}"></i>
                  <span>${btnReadLabel}</span>
                </button>

                ${isDocentOrCollab ? '<button onclick="openAddToFolderModal(\'' + docId + '\')" title="' + (isEn() ? 'Add to Folder / Unit' : 'Afegir a una Carpeta / SA') + '" class="bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl text-xs transition flex items-center justify-center border border-amber-200"><i class="fa-solid fa-folder-plus text-sm text-amber-700"></i></button>' : ''}

                <button onclick="shareToGoogleClassroom('${docId}', decodeURIComponent('${encodedTitle}'))" title="${isEn() ? 'Share to Google Classroom' : 'Enviar a Google Classroom'}" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition flex items-center justify-center border border-emerald-200">
                  <i class="fa-solid fa-chalkboard text-sm"></i>
                </button>

                <button onclick="shareReadingLink('${docId}', '${readingCode}')" title="${isEn() ? 'Copy direct link' : 'Copiar enllaç directe'}" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition flex items-center justify-center border border-indigo-200">
                  <i class="fa-solid fa-share-nodes text-sm"></i>
                </button>
              </div>

              ${canEdit ? '<button onclick="renderEditor(\'' + docId + '\')" class="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold py-1.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5"><i class="fa-solid fa-pen-to-square text-amber-600"></i><span>' + (isEn() ? 'Edit Reading' : 'Editar Lectura') + ' ' + ((isAdmin && !isAuthor) ? '(Admin)' : '') + '</span></button>' : ''}
            </div>
          </div>
        `;
      }
    }

    if (totalDocsInDb === 0 || cardCount === 0) {
      html += `
        <div class="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center">
          <i class="fa-solid fa-filter-circle-xmark text-4xl text-slate-300 mb-3"></i>
          <p class="text-slate-600 font-bold">${isEn() ? 'No readings found matching the selected filters.' : "No s'ha trobat cap lectura que coincideixi amb els filtres seleccionats."}</p>
          <button onclick="resetFiltersAndRenderCatalog()" class="mt-3 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg transition">
            ${isEn() ? 'Reset all filters' : 'Restablir tots els filtres'}
          </button>
        </div>
      `;
    }

    html += '</div></div>';
    app.innerHTML = html;
    renderBanner();
  } catch (err) {
    console.error("Error carregant el catàleg:", err);
    app.innerHTML = `
      <div class="p-6 bg-red-50 border border-red-200 text-red-800 rounded-2xl max-w-xl mx-auto text-center space-y-3">
        <i class="fa-solid fa-triangle-exclamation text-3xl text-red-500"></i>
        <h3 class="font-bold text-base">${isEn() ? 'Error loading catalog' : 'Error en carregar el catàleg'}</h3>
        <p class="text-xs">${err.message}</p>
        <button onclick="renderCatalog()" class="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow">
          <i class="fa-solid fa-rotate-right mr-1"></i> ${isEn() ? 'Retry now' : 'Reintentar ara'}
        </button>
      </div>
    `;
  }
}

async function renderEditor(docIdToEdit, cloneFromDocId, mode) {
  docIdToEdit = docIdToEdit || null;
  cloneFromDocId = cloneFromDocId || null;
  mode = mode || 'questions';

  stopSpeechSynthesis();
  if (!currentUser) {
    renderLogin();
    return;
  }

  if (!isUserAdminOrCreator()) {
    alert(isEn() ? "Restricted access to Teachers and Collaborators." : "Accés restringit a Docents i Col·laboradors.");
    renderCatalog();
    return;
  }

  editingDocId = docIdToEdit;
  cloningParentId = cloneFromDocId;
  cloningMode = mode;

  const app = document.getElementById('app');
  app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? "Loading editor..." : "Carregant l'editor...") + '</p></div>';

  let initialData = {
    type: 'text',
    contentFormat: 'written',
    referenceImageUrl: '',
    title: '',
    bookAuthor: '',
    editorialOrSource: '',
    level: '1r cicle de primària',
    category: 'Aventura',
    estimatedTime: '10 min',
    bookPages: '',
    pointsPerQuestion: 1,
    content: '',
    imageUrl: '',
    readingNumber: null,
    glossary: [],
    parentReadingId: null,
    isAdaptedVersion: false
  };

  let initialQuestions = [];
  const targetDocId = editingDocId || cloningParentId;

  if (targetDocId) {
    try {
      const docSnap = await withTimeout(db.collection(getReadingsCollection()).doc(targetDocId).get(), 7000, "lectura a editar");
      if (docSnap.exists) {
        initialData = Object.assign({}, initialData, docSnap.data());
        let qSnap;
        try {
          qSnap = await withTimeout(db.collection(getReadingsCollection()).doc(targetDocId).collection(SUB_COLLECTION).orderBy('orderIndex', 'asc').get(), 6000, "preguntes");
        } catch (orderErr) {
          qSnap = await withTimeout(db.collection(getReadingsCollection()).doc(targetDocId).collection(SUB_COLLECTION).get(), 6000, "preguntes");
        }
        qSnap.forEach(function(qDoc) {
          initialQuestions.push(Object.assign({ id: qDoc.id }, qDoc.data()));
        });
        initialQuestions.sort(function(a, b) {
          return (a.orderIndex !== undefined ? a.orderIndex : 0) - (b.orderIndex !== undefined ? b.orderIndex : 0);
        });
      }
    } catch (err) {
      console.error("Error carregant la lectura per a l'editor:", err);
    }
  }

  if (cloningParentId) {
    const rootId = initialData.parentReadingId || cloningParentId;
    cloningParentId = rootId;
    initialData.parentReadingId = rootId;

    if (cloningMode === 'adapted') {
      initialData.title = (initialData.title || '').replace(/\s*\(Versió Adaptada.*\)/i, '') + (isEn() ? ' (Adapted Version)' : ' (Versió Adaptada)');
      initialData.isAdaptedVersion = true;
    } else {
      initialData.title = (initialData.title || '') + (isEn() ? ' (Question Battery)' : ' (Bateria de preguntes)');
      initialData.isAdaptedVersion = false;
    }
  }

  const isAdaptedMode = (cloningParentId && cloningMode === 'adapted') || (editingDocId && initialData.isAdaptedVersion);
  const isReadOnlyText = cloningParentId && cloningMode === 'questions';
  const assignedCode = (editingDocId && initialData.readingNumber) ? formatReadingCode(initialData.readingNumber) : (isEn() ? "Automatic assignment on publication" : "Assignació automàtica en publicar");
  const currentContentFormat = initialData.contentFormat || 'written';
  const currentRefImg = initialData.referenceImageUrl || '';
  const rootIdForAdaptation = initialData.parentReadingId || editingDocId;

  const taxonomyGuideHTML = `
    <div class="bg-indigo-50/70 border border-indigo-200 p-4 rounded-2xl mb-6 shadow-xs space-y-2.5">
      <div class="flex items-center justify-between flex-wrap gap-1">
        <h3 class="text-xs font-black text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
          <i class="fa-solid fa-brain text-indigo-600"></i> ${isEn() ? 'Taxonomy & Question Variety Guide' : 'Guia de Taxonomies i Varietat de Preguntes'}
        </h3>
        <span class="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md border border-indigo-200">
          💡 ${isEn() ? 'Recommended to combine different levels and formats' : 'Recomanat combinar diferents nivells i formats'}
        </span>
      </div>
      <p class="text-xs text-indigo-900 leading-relaxed">
        ${isEn() ? 'To stimulate deep and varied reading comprehension, we recommend combining <strong>different cognitive taxonomies</strong> (and formats like single choice, multiple, ordering, visual, or open-ended) throughout the quiz:' : 'Per estimular una comprensió lectora profunda i variada, et recomanem combinar <strong>diferents tipologies cognitives</strong> (i formats com opció única, múltiple, ordenació, visual o resposta oberta) al llarg del qüestionari:'}
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1">
        <div class="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
          <span class="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <i class="fa-solid fa-magnifying-glass"></i> ${isEn() ? 'Literal' : 'Literal'}
          </span>
          <p class="text-[11px] text-slate-600 leading-snug">${isEn() ? 'Find explicit data and information that is written or depicted.' : 'Buscar dades i informació explícita que surt escrita o dibuixada.'}</p>
        </div>
        <div class="bg-white p-2.5 rounded-xl border border-blue-200 shadow-2xs space-y-1">
          <span class="text-[10px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <i class="fa-solid fa-lightbulb"></i> ${isEn() ? 'Inferential' : 'Inferencial'}
          </span>
          <p class="text-[11px] text-slate-600 leading-snug">${isEn() ? 'Deduce implicit information, causes, or intentions from clues.' : 'Deduir informació implícita, causes o intencions a partir de pistes.'}</p>
        </div>
        <div class="bg-white p-2.5 rounded-xl border border-purple-200 shadow-2xs space-y-1">
          <span class="text-[10px] font-black text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <i class="fa-solid fa-comments"></i> ${isEn() ? 'Figurative Meaning' : 'Sentit Figurat'}
          </span>
          <p class="text-[11px] text-slate-600 leading-snug">${isEn() ? 'Interpret idioms, metaphors, ironies, and double meanings.' : 'Interpretar frases fetes, metàfores, ironies i dobles sentits.'}</p>
        </div>
        <div class="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
          <span class="text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <i class="fa-solid fa-scale-balanced"></i> ${isEn() ? 'Opinion' : "D'Opinió"}
          </span>
          <p class="text-[11px] text-slate-600 leading-snug">${isEn() ? 'Critically evaluate events, characters, or take a stance.' : 'Valorar críticament els fets, els personatges o prendre postura.'}</p>
        </div>
        <div class="bg-white p-2.5 rounded-xl border border-rose-200 shadow-2xs space-y-1">
          <span class="text-[10px] font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            <i class="fa-solid fa-wand-magic-sparkles"></i> ${isEn() ? 'Creative' : 'Creativa'}
          </span>
          <p class="text-[11px] text-slate-600 leading-snug">${isEn() ? 'Imagine alternative endings, new solutions, or personal connections.' : 'Imaginar finals alternatius, solucions noves o connexions personals.'}</p>
        </div>
      </div>
    </div>
  `;

  app.innerHTML = `
    <div class="max-w-3xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
      ${isAdaptedMode ? `
        <div class="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl mb-3 text-emerald-950 text-xs font-semibold shadow-xs space-y-1">
          <h3 class="font-black text-sm flex items-center gap-1.5 text-emerald-900">
            <i class="fa-solid fa-seedling text-emerald-600"></i> ${isEn() ? 'Adapted / Simplified Version Mode (UDL)' : 'Mode Versió Adaptada / Simplificada (DUA)'}
          </h3>
          <p>${isEn() ? 'This version will be attached to the original reading via a tab in the reader. You can <strong>shorten and simplify the text</strong> (or use <strong>image/pictogram</strong> format) and design <strong>shorter questions</strong>.' : 'Aquesta versió quedarà annexada a la lectura original mitjançant una pestanya al lector. Pots <strong>escurçar i simplificar el text</strong> (o fer-la en format <strong>imatge/pictograma</strong>) i dissenyar <strong>preguntes més breus</strong>.'}</p>
        </div>
      ` : (cloningParentId ? `
        <div class="bg-amber-50 border border-amber-300 p-4 rounded-2xl mb-3 text-amber-900 text-xs font-semibold shadow-xs">
          <h3 class="font-black text-sm mb-1 flex items-center gap-1.5 text-amber-900">
            <i class="fa-solid fa-code-fork text-amber-600"></i> ${isEn() ? 'Question Battery Mode (Cloning)' : 'Mode Bateria de Preguntes (Clonació)'}
          </h3>
          <p>${isEn() ? 'You are creating an adapted question battery based on this parent reading. The original material remains integrated and linked.' : "Estàs creant una bateria de preguntes adaptada a partir d'aquesta lectura mare. El material original es manté integrat i enllaçat."}</p>
        </div>
      ` : `
        <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-3 shadow-xs">
          <h3 class="text-xs font-black text-amber-900 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
            <i class="fa-solid fa-spell-check text-amber-600"></i> ${isEn() ? 'Editorial Quality Recommendations' : 'Recomanacions de Qualitat Editorial'}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-900">
            <div class="flex items-center gap-1.5"><i class="fa-solid fa-check text-emerald-600"></i><span>${isEn() ? 'Check spelling and grammar before publishing.' : 'Cura ortogràfica i sintàctica abans de publicar.'}</span></div>
            <div class="flex items-center gap-1.5"><i class="fa-solid fa-bullseye text-indigo-600"></i><span>${isEn() ? 'We recommend adding around <strong>10 questions</strong> per reading.' : 'Recomanem afegir unes <strong>10 preguntes</strong> per lectura.'}</span></div>
          </div>
        </div>
      `)}

      ${taxonomyGuideHTML}

      <div class="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 class="text-2xl font-bold text-slate-800 flex items-center">
          <i class="fa-solid ${isAdaptedMode ? 'fa-seedling text-emerald-600' : (cloningParentId ? 'fa-code-fork text-amber-600' : (editingDocId ? 'fa-pen-to-square text-amber-500' : 'fa-plus text-indigo-600'))} mr-2"></i>
          ${(isAdaptedMode && !editingDocId) ? (isEn() ? 'Create Adapted Version (Easy / Visual Reading)' : 'Crear Versió Adaptada (Lectura Fàcil / Visual)') : (cloningParentId ? (isEn() ? 'Clone Question Battery' : 'Clonar Bateria de Preguntes') : (editingDocId ? (isEn() ? 'Edit Reading' : 'Editar Lectura') : (isEn() ? 'Create New Reading' : 'Crear Nova Lectura')))}
        </h1>

        <div class="flex items-center gap-2 flex-wrap">
          ${(editingDocId && !isAdaptedMode) ? `
            <button type="button" onclick="renderEditor(null, '${rootIdForAdaptation}', 'adapted')" class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5">
              <i class="fa-solid fa-seedling"></i>
              <span>${isEn() ? '🌱 Create Adapted Version (UDL)' : '🌱 Crear Versió Adaptada (DUA)'}</span>
            </button>
          ` : ''}

          <span class="text-xs font-mono font-bold bg-indigo-50/80 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200/80 shadow-xs">
            <i class="fa-solid fa-barcode text-indigo-400 mr-1"></i> ${assignedCode}
          </span>
        </div>
      </div>

      <form onsubmit="saveReading(event)" class="space-y-5">
        <input type="hidden" id="editor-is-adapted" value="${isAdaptedMode ? 'true' : 'false'}">

        <div>
          <label class="block text-sm font-bold text-slate-700 mb-1">${isEn() ? 'Reading Type *' : 'Tipus de Lectura *'}</label>
          <select id="editor-type" onchange="toggleReadingTypeInputs()" class="w-full p-2.5 border border-indigo-300 bg-indigo-50/50 rounded-xl text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="text" ${initialData.type === 'text' ? 'selected' : ''}>${isEn() ? '📄 Integrated Short Reading (Written text or Reference image)' : '📄 Lectura Curta Integrada (Text escrit o Imatge de referència)'}</option>
            <option value="book" ${initialData.type === 'book' ? 'selected' : ''}>${isEn() ? '📖 Reading Book (Image / Cover)' : '📖 Llibre de Lectura (Imatge / Coberta)'}</option>
          </select>
        </div>

        <div id="wrapper-content-format" class="bg-teal-50/60 p-4 rounded-2xl border border-teal-200/90 space-y-2">
          <label class="block text-xs font-black text-teal-950 uppercase tracking-wide flex items-center gap-1.5">
            <i class="fa-solid fa-layer-group text-teal-600"></i> ${isEn() ? 'Short Reading Format *' : 'Format de la Lectura Curta *'}
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label class="cursor-pointer">
              <input type="radio" name="contentFormatRadio" value="written" ${currentContentFormat !== 'image' ? 'checked' : ''} onchange="setContentFormat('written')" class="peer sr-only">
              <div class="p-3 rounded-xl border-2 border-slate-200 bg-white peer-checked:border-indigo-600 peer-checked:bg-indigo-50/60 transition flex items-start gap-2.5">
                <span class="text-lg">📝</span>
                <div>
                  <span class="block text-xs font-black text-slate-800">${isEn() ? 'Written text' : 'Text escrit'}</span>
                  <span class="block text-[11px] text-slate-500 leading-tight mt-0.5">${isEn() ? 'Story, article or excerpt in traditional paragraph format.' : 'Conte, article o fragment en format paràgraf tradicional.'}</span>
                </div>
              </div>
            </label>

            <label class="cursor-pointer">
              <input type="radio" name="contentFormatRadio" value="image" ${currentContentFormat === 'image' ? 'checked' : ''} onchange="setContentFormat('image')" class="peer sr-only">
              <div class="p-3 rounded-xl border-2 border-slate-200 bg-white peer-checked:border-teal-600 peer-checked:bg-teal-50/80 transition flex items-start gap-2.5">
                <span class="text-lg">🖼️</span>
                <div>
                  <span class="block text-xs font-black text-teal-950">${isEn() ? 'Reference image (Visual)' : 'Imatge de referència (Visual)'}</span>
                  <span class="block text-[11px] text-teal-800 leading-tight mt-0.5">${isEn() ? 'Poster, pictograms, large print, comic, ticket or infographic.' : 'Cartell, pictogrames, lletra gran, còmic, entrada o infografia.'}</span>
                </div>
              </div>
            </label>
          </div>
          <input type="hidden" id="editor-content-format" value="${currentContentFormat}">
        </div>

        <div>
          <label class="block text-sm font-bold text-slate-700 mb-1">${isEn() ? 'Reading / Adaptation Title *' : 'Títol de la Lectura / Adaptació *'}</label>
          <input type="text" id="editor-title" value="${escapeHtmlAttr(initialData.title)}" required class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
        </div>

        <div class="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-3">
          <h3 class="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
            <i class="fa-solid fa-feather-pointed"></i> ${isEn() ? 'Attribution & Copyright Information' : "Dades d'Atribució i Drets d'Autor"}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">${isEn() ? 'Original Author of the Work' : "Autor/a Original de l'Obra"}</label>
              <input type="text" id="editor-book-author" value="${escapeHtmlAttr(initialData.bookAuthor)}" placeholder="${isEn() ? 'E.g.: Mercè Rodoreda, J.K. Rowling' : 'Ex: Mercè Rodoreda, J.K. Rowling'}" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
            </div>
            <div>
              <label id="label-editorial-source" class="block text-xs font-bold text-slate-700 mb-1">${isEn() ? 'Publisher / Source or Legal Reference' : 'Editorial / Font o Referència Legal'}</label>
              <input type="text" id="editor-source" value="${escapeHtmlAttr(initialData.editorialOrSource)}" placeholder="${isEn() ? 'E.g.: Publisher name, or source URL' : "Ex: Edicions 62, o URL d'origen"}" class="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">${isEn() ? 'Educational Level / Target *' : 'Nivell Educatiu / Públic *'}</label>
            <select id="editor-level" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="1r cicle de primària" ${initialData.level === '1r cicle de primària' || initialData.level === 'Cicle Inicial' ? 'selected' : ''}>${isEn() ? '1st cycle of primary (Grades 1-2)' : '1r cicle de primària'}</option>
              <option value="2n cicle de primària" ${initialData.level === '2n cicle de primària' || initialData.level === 'Cicle Mitjà' ? 'selected' : ''}>${isEn() ? '2nd cycle of primary (Grades 3-4)' : '2n cicle de primària'}</option>
              <option value="3r cicle de primària" ${initialData.level === '3r cicle de primària' || initialData.level === 'Cicle Superior' ? 'selected' : ''}>${isEn() ? '3rd cycle of primary (Grades 5-6)' : '3r cicle de primària'}</option>
              <option value="Secundària" ${initialData.level === 'Secundària' ? 'selected' : ''}>${isEn() ? 'Secondary (ESO)' : 'Secundària (ESO)'}</option>
              <option value="Formació d'Adults" ${initialData.level === "Formació d'Adults" ? 'selected' : ''}>${isEn() ? '🧑‍💼 Adult Education' : "🧑‍💼 Formació d'Adults / CFA"}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">${isEn() ? 'Category / Genre *' : 'Categoria / Gènere *'}</label>
            <select id="editor-category" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="Aventura" ${initialData.category === 'Aventura' ? 'selected' : ''}>🧭 ${isEn() ? 'Adventure' : 'Aventura'}</option>
              <option value="Misteri" ${initialData.category === 'Misteri' ? 'selected' : ''}>🔍 ${isEn() ? 'Mystery' : 'Misteri'}</option>
              <option value="Ciència-ficció" ${initialData.category === 'Ciència-ficció' ? 'selected' : ''}>🚀 ${isEn() ? 'Science Fiction' : 'Ciència-ficció'}</option>
              <option value="Teatre" ${initialData.category === 'Teatre' ? 'selected' : ''}>🎭 ${isEn() ? 'Theater' : 'Teatre'}</option>
              <option value="Poesia" ${initialData.category === 'Poesia' ? 'selected' : ''}>📜 ${isEn() ? 'Poetry' : 'Poesia'}</option>
              <option value="Tradició / Llegenda" ${initialData.category === 'Tradició / Llegenda' ? 'selected' : ''}>🏛️ ${isEn() ? 'Tradition / Legend' : 'Tradició / Llegenda'}</option>
              <option value="General" ${initialData.category === 'General' ? 'selected' : ''}>📖 ${isEn() ? 'General' : 'General'}</option>
            </select>
          </div>

          <div id="wrapper-duration-text">
            <label class="block text-sm font-bold text-slate-700 mb-1">${isEn() ? 'Estimated Duration *' : 'Durada Estimada *'}</label>
            <select id="editor-duration" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="5 min" ${initialData.estimatedTime === '5 min' ? 'selected' : ''}>⏱️ ${isEn() ? '5 minutes' : '5 minuts'}</option>
              <option value="10 min" ${initialData.estimatedTime === '10 min' ? 'selected' : ''}>⏱️ ${isEn() ? '10 minutes' : '10 minuts'}</option>
              <option value="15 min" ${initialData.estimatedTime === '15 min' ? 'selected' : ''}>⏱️ ${isEn() ? '15 minutes' : '15 minuts'}</option>
              <option value="+20 min" ${initialData.estimatedTime === '+20 min' ? 'selected' : ''}>⏱️ ${isEn() ? '+20 minutes' : '+20 minuts'}</option>
            </select>
          </div>

          <div id="wrapper-duration-book" class="hidden">
            <label class="block text-sm font-bold text-slate-700 mb-1">${isEn() ? 'No. of Pages *' : 'Nº de Pàgines *'}</label>
            <input type="number" id="editor-book-pages" value="${escapeHtmlAttr(initialData.bookPages)}" placeholder="${isEn() ? 'E.g.: 120' : 'Ex: 120'}" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          </div>

          <div>
            <label class="block text-sm font-bold text-slate-700 mb-1">${isEn() ? 'Points per correct answer *' : 'Valor per encert *'}</label>
            <select id="editor-points-per-q" class="w-full p-2.5 border border-amber-300 bg-amber-50/50 rounded-xl text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="1" ${(initialData.pointsPerQuestion || 1) === 1 ? 'selected' : ''}>${isEn() ? '1 Pt per correct answer' : '1 Pt per encert'}</option>
              <option value="2" ${(initialData.pointsPerQuestion || 1) === 2 ? 'selected' : ''}>${isEn() ? '2 Pts per correct answer' : '2 Pts per encert'}</option>
            </select>
          </div>
        </div>

        <div id="wrapper-reference-image" class="hidden space-y-3 bg-teal-50/70 p-4 rounded-2xl border-2 border-teal-300/80 shadow-2xs">
          <div class="flex items-center justify-between flex-wrap gap-1">
            <label class="block text-sm font-black text-teal-950 flex items-center gap-1.5">
              <i class="fa-solid fa-image text-teal-600"></i> ${isEn() ? 'Reading Reference Image *' : 'Imatge de Referència de la Lectura *'}
            </label>
            <span class="text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
              ${isEn() ? 'Ideal for early readers, posters, tickets, comics or infographics' : 'Ideal per a inicials, cartells, entrades, còmics o infografies'}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row gap-2 items-center">
            <input type="text" id="editor-ref-image" value="${escapeHtmlAttr(currentRefImg)}" oninput="updateRefImagePreview(this.value)" placeholder="${isEn() ? 'Paste link (URL) or upload image from device...' : "Enganxa l'enllaç (URL) o puja la imatge des del dispositiu..."}" class="w-full p-2.5 border border-teal-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white" ${isReadOnlyText ? 'readonly' : ''}>
            ${!isReadOnlyText ? `
              <label class="cursor-pointer shrink-0 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5">
                <i class="fa-solid fa-cloud-arrow-up"></i> ${isEn() ? 'Upload Image' : 'Pujar Imatge'}
                <input type="file" accept="image/*" class="hidden" onchange="uploadImageToFirebase(this, 'editor-ref-image', 'upload-ref-status', 1100)">
              </label>
            ` : ''}
          </div>
          <span id="upload-ref-status"></span>

          <div id="ref-image-preview-box" class="${currentRefImg ? '' : 'hidden'} bg-white p-3 rounded-xl border border-teal-200 flex flex-col items-center space-y-2">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider self-start">${isEn() ? 'Reference image preview:' : 'Vista prèvia de la imatge de referència:'}</span>
            <img id="ref-image-preview-img" src="${escapeHtmlAttr(currentRefImg)}" alt="Preview" class="max-h-72 w-auto rounded-lg shadow-xs border border-slate-200 object-contain">
          </div>
        </div>

        <div id="wrapper-content">
          <div class="flex flex-wrap justify-between items-center gap-2 mb-1.5">
            <label id="label-editor-content" class="block text-sm font-bold text-slate-700">
              ${isAdaptedMode ? (isEn() ? 'Simplified / Adapted Text (Shorten and adapt original text) *' : 'Text Simplificat / Adaptat (Escurça i adapta el text original) *') : (isEn() ? 'Reading Text *' : 'Text de la Lectura *')}
            </label>
            <div class="flex items-center gap-1.5 flex-wrap">
              ${!isReadOnlyText ? `
                <button type="button" id="btn-insert-chapter" onclick="insertChapterDividerInEditor()" class="text-xs text-indigo-800 bg-indigo-100 hover:bg-indigo-200 font-bold px-2.5 py-1 rounded-lg border border-indigo-300 flex items-center gap-1 shadow-2xs">
                  <i class="fa-solid fa-file-circle-plus"></i> ${isEn() ? 'Split by Chapter / Page' : 'Dividir per Capítol / Pàgina'}
                </button>
              ` : ''}
              <button type="button" id="btn-insert-glossary" onclick="insertGlossaryLink()" class="text-xs text-teal-800 bg-teal-100 hover:bg-teal-200 font-bold px-2.5 py-1 rounded-lg border border-teal-300 flex items-center gap-1 shadow-2xs">
                <i class="fa-solid fa-link"></i> ${isEn() ? 'Mark Vocabulary' : 'Marcar Vocabulari'}
              </button>
            </div>
          </div>
          <textarea id="editor-content" oninput="updateChapterButtonsInQuestions()" rows="6" placeholder="${isEn() ? 'Write the reading text here...' : 'Escriu aquí el text de la lectura...'}" class="w-full p-2.5 border ${isAdaptedMode ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-300'} rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-sans" ${isReadOnlyText ? 'readonly' : ''}>${initialData.content || ''}</textarea>
          <p id="hint-chapter-pagination" class="text-[11px] text-indigo-800 mt-1 flex items-center gap-1.5 bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100">
            <i class="fa-solid fa-book-open text-indigo-600 shrink-0"></i>
            <span id="hint-chapter-pagination-text">${isEn() ? 'You can split long readings into pages or parts using the <strong>«Split by Chapter / Page»</strong> button (it will insert <code>=== Part 2 ===</code>) so students read step by step.' : 'Pots dividir lectures llargues en pàgines o parts fent servir el botó <strong>«Dividir per Capítol / Pàgina»</strong> (inserirà <code>=== Part 2 ===</code>) perquè l\'alumne ho llegeixi pas a pas.'}</span>
          </p>
          <p id="hint-transcript-audio" class="hidden text-[11px] text-teal-800 mt-1 flex items-center gap-1">
            <i class="fa-solid fa-headphones text-teal-600"></i>
            <span>${isEn() ? 'Optional: If you write the text from the image here, the <strong>Listen (Read aloud)</strong> button will be activated in the reader to help beginner readers.' : "Opcional: Si escrius aquí el text que apareix a la imatge, s'activarà el botó <strong>Escolta (Veu alta)</strong> al lector per ajudar l'alumnat que s'inicia en la lectura."}</span>
          </p>
        </div>

        <div id="wrapper-image" class="hidden space-y-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/80">
          <label class="block text-sm font-bold text-indigo-900">${isEn() ? 'Book Cover (Image)' : 'Coberta del Llibre (Imatge)'}</label>
          <div class="flex flex-col sm:flex-row gap-2 items-center">
            <input type="text" id="editor-image" value="${escapeHtmlAttr(initialData.imageUrl)}" placeholder="${isEn() ? 'Paste URL or upload an image...' : 'Enganxa URL o puja una imatge...'}" class="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
            <label class="cursor-pointer shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition flex items-center gap-1.5">
              <i class="fa-solid fa-cloud-arrow-up"></i> ${isEn() ? 'Upload from device' : 'Pujar des del dispositiu'}
              <input type="file" accept="image/*" class="hidden" onchange="uploadImageToFirebase(this, 'editor-image', 'upload-cover-status', 800)">
            </label>
          </div>
          <span id="upload-cover-status"></span>
        </div>

        <div class="bg-teal-50/70 p-4 rounded-xl border border-teal-200/80 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                <i class="fa-solid fa-book-bookmark text-teal-600"></i> ${isEn() ? '📖 Glossary / Key Vocabulary (Optional)' : '📖 Glossari / Vocabulari Clau (Opcional)'}
              </h3>
              <p class="text-[11px] text-teal-700">${isEn() ? 'These words will be explained at the absolute bottom of the reading.' : 'Aquestes paraules apareixeran explicades al peu absolut de la lectura.'}</p>
            </div>
            <button type="button" onclick="addGlossaryField()" class="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold px-2.5 py-1 rounded-lg transition shrink-0">
              <i class="fa-solid fa-plus mr-1"></i> ${isEn() ? 'Add word' : 'Afegir mot'}
            </button>
          </div>
          <div id="glossary-container" class="space-y-2"></div>
        </div>

        <div class="pt-4 border-t border-slate-200">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">
              <span>${isEn() ? 'Comprehension Questions' : 'Preguntes de Comprensió'}</span>
              <span id="question-count-badge" class="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">0</span>
            </h3>
            <button type="button" onclick="addQuestionField()" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg transition border border-indigo-200">
              <i class="fa-solid fa-plus mr-1"></i> ${isEn() ? 'Add question' : 'Afegir pregunta'}
            </button>
          </div>

          <div id="questions-container" class="space-y-4"></div>

          <div class="mt-4 pt-2">
            <button type="button" onclick="addQuestionField()" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 px-4 rounded-xl transition border border-indigo-200 flex items-center justify-center gap-2 text-xs md:text-sm shadow-xs">
              <i class="fa-solid fa-plus text-sm"></i>
              <span>${isEn() ? 'Add another question at the end' : 'Afegir una altra pregunta al final'}</span>
            </button>
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-4">
          <button type="button" onclick="renderCatalog()" class="px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-600 hover:bg-slate-50">${isEn() ? 'Cancel' : 'Cancel·lar'}</button>
          <button type="submit" class="px-5 py-2 ${isAdaptedMode ? 'bg-emerald-600 hover:bg-emerald-700' : (cloningParentId ? 'bg-amber-600 hover:bg-amber-700' : (editingDocId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'))} text-white font-bold rounded-xl text-sm shadow transition">
            ${(isAdaptedMode && !editingDocId) ? (isEn() ? 'Publish Adapted Version (+1 PTS)' : 'Publicar Versió Adaptada (+1 PTS)') : (cloningParentId ? (isEn() ? 'Publish Teacher Adaptation (+1 PTS)' : 'Publicar Adaptació Docent (+1 PTS)') : (editingDocId ? (isEn() ? 'Save Changes' : 'Desar Canvis') : (isEn() ? 'Publish Reading (+1 PTS)' : 'Publicar Lectura (+1 PTS)')))}
          </button>
        </div>
      </form>
    </div>
  `;

  toggleReadingTypeInputs();

  const glossContainer = document.getElementById('glossary-container');
  if (glossContainer && Array.isArray(initialData.glossary) && initialData.glossary.length > 0) {
    initialData.glossary.forEach(function(g) { addGlossaryField(g); });
  }

  if (initialQuestions.length > 0) {
    initialQuestions.forEach(function(q) { addQuestionField(q); });
  } else {
    addQuestionField();
  }
}

function setContentFormat(fmt) {
  const hidden = document.getElementById('editor-content-format');
  if (hidden) hidden.value = fmt;
  toggleReadingTypeInputs();
}

function insertGlossaryLink() {
  const textarea = document.getElementById('editor-content');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end) || (isEn() ? "word" : "paraula");
  const replacement = "[" + selectedText + "](#glossari-section)";
  textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
  textarea.focus();
}

function addGlossaryField(item) {
  const container = document.getElementById('glossary-container');
  if (!container) return;

  const gWord = item ? (item.word || '') : '';
  const gDef = item ? (item.definition || '') : '';

  const div = document.createElement('div');
  div.className = "glossary-item flex items-center gap-2 bg-white p-2 rounded-xl border border-teal-200 shadow-2xs";
  div.innerHTML = '<input type="text" value="' + escapeHtmlAttr(gWord) + '" placeholder="' + (isEn() ? 'Word or Concept' : 'Mot o Concepte') + '" class="g-word w-1/3 p-1.5 border border-slate-300 rounded-lg text-xs font-bold text-teal-900 outline-none">' +
    '<input type="text" value="' + escapeHtmlAttr(gDef) + '" placeholder="' + (isEn() ? 'Short and simple definition...' : 'Definició breu i senzilla...') + '" class="g-def w-2/3 p-1.5 border border-slate-300 rounded-lg text-xs outline-none">' +
    '<button type="button" onclick="this.parentNode.remove()" title="' + (isEn() ? 'Delete' : 'Eliminar') + '" class="p-1.5 text-xs text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>';
  container.appendChild(div);
}

function toggleReadingTypeInputs() {
  const type = document.getElementById('editor-type').value;
  const fmtHidden = document.getElementById('editor-content-format');
  const contentFormat = fmtHidden ? fmtHidden.value : 'written';

  const wrapFormat = document.getElementById('wrapper-content-format');
  const wrapRefImg = document.getElementById('wrapper-reference-image');
  const wrapContent = document.getElementById('wrapper-content');
  const wrapImage = document.getElementById('wrapper-image');
  const wrapDurText = document.getElementById('wrapper-duration-text');
  const wrapDurBook = document.getElementById('wrapper-duration-book');
  const contentInput = document.getElementById('editor-content');
  const refImgInput = document.getElementById('editor-ref-image');
  const labelContent = document.getElementById('label-editor-content');
  const hintTranscript = document.getElementById('hint-transcript-audio');
  const btnGlossary = document.getElementById('btn-insert-glossary');
  const labelSource = document.getElementById('label-editorial-source');
  const hintChapterBox = document.getElementById('hint-chapter-pagination');
  const hintChapterText = document.getElementById('hint-chapter-pagination-text');
  const isAdapted = document.getElementById('editor-is-adapted') && document.getElementById('editor-is-adapted').value === 'true';

  if (type === 'book') {
    if (wrapFormat) wrapFormat.classList.add('hidden');
    if (wrapRefImg) wrapRefImg.classList.add('hidden');
    if (refImgInput) refImgInput.removeAttribute('required');
    wrapContent.classList.remove('hidden');
    if (contentInput) {
      contentInput.removeAttribute('required');
      contentInput.rows = 5;
      contentInput.placeholder = isEn() ? "Optional: split the book into chapters to ask questions chapter by chapter:\n=== Chapter 1: The Beginning ===\nSummary or excerpt of chapter 1...\n\n=== Chapter 2: The Journey ===\nSummary or excerpt of chapter 2..." : "Opcional: divideix el llibre per capítols per anar fent les preguntes capítol a capítol:\n=== Capítol 1: El començament ===\nResum o fragment del capítol 1...\n\n=== Capítol 2: El viatge ===\nResum o fragment del capítol 2...";
    }
    if (labelContent) labelContent.innerText = isEn() ? "Structure by Chapters / Excerpts of the Book (Optional)" : "Estructura per Capítols / Fragments del Llibre (Opcional)";
    if (hintTranscript) hintTranscript.classList.add('hidden');
    if (btnGlossary) btnGlossary.classList.remove('hidden');
    if (hintChapterBox) hintChapterBox.classList.remove('hidden');
    if (hintChapterText) {
      hintChapterText.innerHTML = isEn() ? 'Divide the book into chapters with <strong>«Split by Chapter / Page»</strong> (<code>=== Chapter 1 ===</code>) and then assign each question to the corresponding chapter!' : 'Divideix el llibre en capítols amb <strong>«Dividir per Capítol / Pàgina»</strong> (<code>=== Capítol 1 ===</code>) i després assigna cada pregunta al capítol corresponent!';
    }
    wrapImage.classList.remove('hidden');
    wrapDurText.classList.add('hidden');
    wrapDurBook.classList.remove('hidden');
    if (labelSource) labelSource.innerText = isEn() ? "Publisher / Year of Publication" : "Editorial / Any d'Edició";
  } else {
    if (wrapFormat) wrapFormat.classList.remove('hidden');
    wrapImage.classList.add('hidden');
    wrapDurText.classList.remove('hidden');
    wrapDurBook.classList.add('hidden');
    if (labelSource) labelSource.innerText = isEn() ? "Source / Legal Reference or Link" : "Font / Referència Legal o Enllaç";

    if (contentFormat === 'image') {
      if (wrapRefImg) wrapRefImg.classList.remove('hidden');
      if (refImgInput) refImgInput.setAttribute('required', 'true');
      wrapContent.classList.remove('hidden');
      if (contentInput) {
        contentInput.removeAttribute('required');
        contentInput.rows = 3;
        contentInput.placeholder = isEn() ? "Optional: write the text from the image here to activate read-aloud..." : "Opcional: escriu aquí el text de la imatge per activar la lectura en veu alta...";
      }
      if (labelContent) labelContent.innerText = isEn() ? "Transcript for Speech Synthesis / Alternative Text (Optional)" : "Transcripció per a Síntesi de Veu / Text Alternatiu (Opcional)";
      if (hintTranscript) hintTranscript.classList.remove('hidden');
      if (hintChapterBox) hintChapterBox.classList.add('hidden');
      if (btnGlossary) btnGlossary.classList.add('hidden');
    } else {
      if (wrapRefImg) wrapRefImg.classList.add('hidden');
      if (refImgInput) refImgInput.removeAttribute('required');
      wrapContent.classList.remove('hidden');
      if (contentInput) {
        contentInput.setAttribute('required', 'true');
        contentInput.rows = 6;
        contentInput.placeholder = isEn() ? "Write the reading text here..." : "Escriu aquí el text de la lectura...";
      }
      if (labelContent) {
        labelContent.innerText = isAdapted ? (isEn() ? "Simplified / Adapted Text (Shorten and adapt original text) *" : "Text Simplificat / Adaptat (Escurça i adapta el text original) *") : (isEn() ? "Reading Text *" : "Text de la Lectura *");
      }
      if (hintTranscript) hintTranscript.classList.add('hidden');
      if (hintChapterBox) hintChapterBox.classList.remove('hidden');
      if (hintChapterText) {
        hintChapterText.innerHTML = isEn() ? 'You can split long readings into pages or parts using the <strong>«Split by Chapter / Page»</strong> button (it will insert <code>=== Part 2 ===</code>) so students read step by step.' : 'Pots dividir lectures llargues en pàgines o parts fent servir el botó <strong>«Dividir per Capítol / Pàgina»</strong> (inserirà <code>=== Part 2 ===</code>) perquè l\'alumne ho llegeixi pas a pas.';
      }
      if (btnGlossary) btnGlossary.classList.remove('hidden');
    }
  }
  updateChapterButtonsInQuestions();
}

function addQuestionField(data) {
  const container = document.getElementById('questions-container');
  if (!container) return;

  const qText = data ? (data.questionText || data.pregunta || '') : '';
  const opts = data ? (data.options || data.opcions || ['', '', '', '']) : ['', '', '', ''];
  const qType = data ? (data.questionType || 'single') : 'single';
  const imgMode = data ? (data.imageSelectionMode || 'single') : 'single';
  const qTaxonomy = data ? (data.taxonomyType || 'literal') : 'literal';

  let qKeywords = '';
  if (data) {
    if (Array.isArray(data.keywords)) qKeywords = data.keywords.join(', ');
    else if (typeof data.keywords === 'string') qKeywords = data.keywords;
    else if (data.correctAnswerText) qKeywords = data.correctAnswerText;
  }
  const qEvalMode = data && data.evaluationMode ? data.evaluationMode : ((qTaxonomy === 'opinion' || qTaxonomy === 'creative' || qTaxonomy === 'inferential') ? 'ai_rubric' : 'keywords');
  const qRubricPrompt = data && data.rubricPrompt ? data.rubricPrompt : '';
  const qClozeMode = (data && data.clozeMode) ? data.clozeMode : 'dropdown';
  const qClozeTemplate = (data && data.clozeTemplate) ? data.clozeTemplate : '';
  const qChapterIndex = (data && data.chapterIndex !== undefined && data.chapterIndex !== null) ? String(data.chapterIndex) : 'all';

  let correctSingleIdx = 0;
  let correctMultipleArr = [0];

  if (data) {
    if (Array.isArray(data.correctAnswers)) {
      correctMultipleArr = data.correctAnswers.map(function(v) { return parseInt(v); });
      correctSingleIdx = correctMultipleArr[0] || 0;
    } else if (data.correctAnswer !== undefined) {
      correctSingleIdx = parseInt(data.correctAnswer);
      correctMultipleArr = [correctSingleIdx];
    }
  }

  const hasExtendedOptions = opts.length > 4 || (opts[4] && opts[4].trim()) || (opts[5] && opts[5].trim());

  const qDiv = document.createElement('div');
  qDiv.className = 'q-block p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 relative';

  qDiv.innerHTML = `
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200/60 pb-2">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="q-number-badge w-7 h-7 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">1</span>
        <span class="q-number-label text-xs font-bold text-slate-700">${isEn() ? 'Question 1' : 'Pregunta 1'}</span>

        <select class="q-type-select p-1 text-xs border border-slate-300 rounded-md font-bold text-slate-700 bg-white outline-none" onchange="toggleQuestionAnswerType(this)">
          <option value="single" ${qType === 'single' ? 'selected' : ''}>🔘 ${isEn() ? 'Single Choice (1 answer)' : 'Opció Única (1 resposta)'}</option>
          <option value="multiple" ${qType === 'multiple' ? 'selected' : ''}>☑️ ${isEn() ? 'Multiple Choice (Multiple answers)' : 'Opció Múltiple (Vàries respostes)'}</option>
          <option value="opinion" ${qType === 'opinion' ? 'selected' : ''}>💬 ${isEn() ? 'Reflection / Opinion (All valid)' : 'Reflexió / Opinió (Totes vàlides)'}</option>
          <option value="ordering" ${qType === 'ordering' ? 'selected' : ''}>↕️ ${isEn() ? 'Chronological Order (Sequence)' : 'Ordena Cronològicament (Seqüència)'}</option>
          <option value="image_single" ${qType === 'image_single' ? 'selected' : ''}>🖼️ ${isEn() ? 'Image Selection (Visual answers)' : "Selecció d'Imatge (Respostes visuals)"}</option>
          <option value="text_input" ${qType === 'text_input' ? 'selected' : ''}>✍️ ${isEn() ? 'Open Answer (AI Rubric / Keywords)' : 'Resposta Oberta (Rúbrica IA / Paraules clau)'}</option>
          <option value="cloze" ${qType === 'cloze' ? 'selected' : ''}>🧩 ${isEn() ? 'Fill in Blanks (Cloze: dropdowns or text)' : 'Omplir Buits (Cloze: desplegables o mots)'}</option>
        </select>

        <select class="q-img-mode-select hidden p-1 text-xs border border-teal-300 rounded-md font-bold text-teal-900 bg-teal-50 outline-none" onchange="toggleQuestionAnswerType(this)">
          <option value="single" ${imgMode === 'single' ? 'selected' : ''}>🔘 ${isEn() ? '1 correct image' : '1 imatge correcta'}</option>
          <option value="multiple" ${imgMode === 'multiple' ? 'selected' : ''}>☑️ ${isEn() ? 'Multiple correct images' : 'Vàries imatges correctes'}</option>
          <option value="opinion" ${imgMode === 'opinion' ? 'selected' : ''}>💬 ${isEn() ? 'Opinion (All valid)' : 'Opinió (Totes vàlides)'}</option>
        </select>

        <select onchange="onQuestionTaxonomyChange(this)" class="q-taxonomy-select p-1 text-xs border border-indigo-200 rounded-md font-bold text-indigo-800 bg-indigo-50/60 outline-none">
          <option value="literal" ${qTaxonomy === 'literal' ? 'selected' : ''}>🟢 ${isEn() ? 'Literal (Explicit)' : 'Literal (Explícita)'}</option>
          <option value="inferential" ${qTaxonomy === 'inferential' ? 'selected' : ''}>🔵 ${isEn() ? 'Inferential (Implicit)' : 'Inferencial (Implícita)'}</option>
          <option value="figurative" ${qTaxonomy === 'figurative' ? 'selected' : ''}>🟣 ${isEn() ? 'Figurative (Idioms/Double)' : 'Sentit Figurat (Dites/Dobles)'}</option>
          <option value="opinion" ${qTaxonomy === 'opinion' ? 'selected' : ''}>💬 ${isEn() ? 'Opinion (Critical)' : "D'Opinió (Crítica)"}</option>
          <option value="creative" ${qTaxonomy === 'creative' ? 'selected' : ''}>🎨 ${isEn() ? 'Creative (Alternatives)' : 'Creativa (Alternatives)'}</option>
        </select>

        <select data-initial-chapter="${escapeHtmlAttr(qChapterIndex)}" title="${isEn() ? 'Assign this question to a specific chapter or part' : 'Assigna aquesta pregunta a un capítol o part concreta'}" class="q-chapter-select hidden p-1 text-xs border border-amber-300 rounded-md font-bold text-amber-950 bg-amber-50 outline-none">
          <option value="all">📌 ${isEn() ? 'Entire reading / General' : 'Tota la lectura / General'}</option>
        </select>
      </div>

      <div class="flex items-center space-x-1 self-end sm:self-auto">
        <button type="button" onclick="moveQuestionUp(this)" title="${isEn() ? 'Move question up' : 'Pujar pregunta'}" class="p-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg">
          <i class="fa-solid fa-arrow-up"></i>
        </button>
        <button type="button" onclick="moveQuestionDown(this)" title="${isEn() ? 'Move question down' : 'Baixar pregunta'}" class="p-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg">
          <i class="fa-solid fa-arrow-down"></i>
        </button>
        <button type="button" onclick="removeQuestionField(this)" title="${isEn() ? 'Delete' : 'Eliminar'}" class="p-1.5 text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg ml-2">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>

    <input type="text" value="${escapeHtmlAttr(qText)}" placeholder="${isEn() ? 'Write question prompt' : 'Escriu l\'enunciat de la pregunta'}" required class="q-text w-full p-2 border border-slate-300 rounded-lg text-sm">

    <div class="q-options-wrapper space-y-2">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        ${['A', 'B', 'C', 'D'].map(function(letter, idx) {
          return `
            <div class="flex flex-col gap-1 border border-slate-300 rounded-lg bg-white p-1.5">
              <div class="flex items-center overflow-hidden">
                <span class="opt-label-badge bg-slate-100 text-slate-700 font-extrabold text-xs px-2.5 py-1.5 border-r border-slate-200 shrink-0">${letter}</span>
                <input type="text" value="${escapeHtmlAttr(opts[idx])}" placeholder="${isEn() ? 'Option ' + letter : 'Opció ' + letter}" class="q-opt-${idx} w-full p-1.5 text-xs outline-none" oninput="updateImagePreview(this)">
              </div>
              <div class="q-upload-btn-container hidden flex items-center justify-between pt-1 border-t border-slate-100 px-1">
                <label class="cursor-pointer text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <i class="fa-solid fa-cloud-arrow-up"></i> ${isEn() ? 'Upload Image ' + letter : 'Pujar Imatge ' + letter}
                  <input type="file" accept="image/*" class="hidden" onchange="uploadImageToFirebase(this, 'q-opt-${idx}', null, 800)">
                </label>
                <span class="q-upload-status text-[10px]"></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="q-extra-opts-box ${hasExtendedOptions ? '' : 'hidden'} grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        ${['E', 'F'].map(function(letter, eIdx) {
          const idx = eIdx + 4;
          return `
            <div class="flex flex-col gap-1 border border-slate-300 rounded-lg bg-white p-1.5">
              <div class="flex items-center overflow-hidden">
                <span class="opt-label-badge bg-slate-100 text-slate-700 font-extrabold text-xs px-2.5 py-1.5 border-r border-slate-200 shrink-0">${letter}</span>
                <input type="text" value="${escapeHtmlAttr(opts[idx])}" placeholder="${isEn() ? 'Option ' + letter : 'Opció ' + letter}" class="q-opt-${idx} w-full p-1.5 text-xs outline-none" oninput="updateImagePreview(this)">
              </div>
              <div class="q-upload-btn-container hidden flex items-center justify-between pt-1 border-t border-slate-100 px-1">
                <label class="cursor-pointer text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                  <i class="fa-solid fa-cloud-arrow-up"></i> ${isEn() ? 'Upload Image ' + letter : 'Pujar Imatge ' + letter}
                  <input type="file" accept="image/*" class="hidden" onchange="uploadImageToFirebase(this, 'q-opt-${idx}', null, 800)">
                </label>
                <span class="q-upload-status text-[10px]"></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="flex justify-end pt-1">
        <button type="button" onclick="toggleExtraOptions(this)" class="btn-toggle-extra text-xs text-indigo-700 font-bold hover:underline flex items-center gap-1">
          <i class="fa-solid ${hasExtendedOptions ? 'fa-minus' : 'fa-plus'}"></i>
          <span>${hasExtendedOptions ? (isEn() ? 'Hide options E and F' : 'Ocultar opcions E i F') : (isEn() ? 'Add options E and F (up to 6)' : 'Afegir opcions E i F (fins a 6)')}</span>
        </button>
      </div>
    </div>

    <div class="q-image-previews-box hidden grid grid-cols-6 gap-2 pt-1">
      ${['A', 'B', 'C', 'D', 'E', 'F'].map(function(letter, idx) {
        return '<div class="h-16 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center"><img class="img-preview-' + idx + ' w-full h-full object-cover" src="' + (opts[idx] || '') + '" onerror="this.src=\'https://via.placeholder.com/100?text=' + letter + '\'"></div>';
      }).join('')}
    </div>

    <div class="q-single-box flex items-center space-x-2 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
      <i class="fa-solid fa-circle-check text-indigo-600"></i>
      <label class="q-single-label text-xs font-bold text-indigo-900">${isEn() ? 'Which is the correct answer?' : 'Quina és la resposta correcta?'}</label>
      <select class="q-correct-single p-1 text-xs border border-indigo-300 rounded-md font-bold text-indigo-700 bg-white outline-none">
        <option value="0" ${correctSingleIdx === 0 ? 'selected' : ''}>${isEn() ? 'Option A' : 'Opció A'}</option>
        <option value="1" ${correctSingleIdx === 1 ? 'selected' : ''}>${isEn() ? 'Option B' : 'Opció B'}</option>
        <option value="2" ${correctSingleIdx === 2 ? 'selected' : ''}>${isEn() ? 'Option C' : 'Opció C'}</option>
        <option value="3" ${correctSingleIdx === 3 ? 'selected' : ''}>${isEn() ? 'Option D' : 'Opció D'}</option>
        <option value="4" ${correctSingleIdx === 4 ? 'selected' : ''} class="opt-ef-choice ${hasExtendedOptions ? '' : 'hidden'}">${isEn() ? 'Option E' : 'Opció E'}</option>
        <option value="5" ${correctSingleIdx === 5 ? 'selected' : ''} class="opt-ef-choice ${hasExtendedOptions ? '' : 'hidden'}">${isEn() ? 'Option F' : 'Opció F'}</option>
      </select>
    </div>

    <div class="q-multiple-box hidden p-2.5 bg-purple-50 rounded-lg border border-purple-100 space-y-1.5">
      <div class="flex items-center gap-1.5 text-xs font-bold text-purple-900">
        <i class="fa-solid fa-square-check text-purple-600"></i>
        <span>${isEn() ? 'Check all answers that are correct:' : 'Marca totes les respostes que són correctes:'}</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        ${['A', 'B', 'C', 'D', 'E', 'F'].map(function(letter, idx) {
          const efClass = idx >= 4 ? ('opt-ef-multi ' + (hasExtendedOptions ? '' : 'hidden')) : '';
          return '<label class="' + efClass + ' flex items-center space-x-2 bg-white p-1.5 rounded border border-purple-200 cursor-pointer"><input type="checkbox" value="' + idx + '" class="q-correct-multi w-4 h-4 text-purple-600 rounded" ' + (correctMultipleArr.includes(idx) ? 'checked' : '') + '><span class="font-bold">' + (isEn() ? 'Option ' : 'Opció ') + letter + '</span></label>';
        }).join('')}
      </div>
    </div>

    <div class="q-text-input-box hidden p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-2">
        <span class="text-xs font-black text-emerald-950 flex items-center gap-1.5">
          <i class="fa-solid fa-sliders text-emerald-600"></i> ${isEn() ? 'Open Question Evaluation Method:' : 'Mètode de Correcció de la Pregunta Oberta:'}
        </span>
        <div class="flex items-center gap-2">
          <select onchange="toggleOpenEvalMode(this)" class="q-open-eval-mode p-1.5 text-xs font-extrabold rounded-lg border border-indigo-300 bg-white text-indigo-900 outline-none cursor-pointer">
            <option value="ai_rubric" ${qEvalMode === 'ai_rubric' ? 'selected' : ''}>✨ ${isEn() ? 'AI Rubric (Reflection / Opinion / Creative)' : 'Rúbrica IA (Reflexió / Opinió / Creativa)'}</option>
            <option value="keywords" ${qEvalMode === 'keywords' ? 'selected' : ''}>🔑 ${isEn() ? 'Keywords (Literal / Quick)' : 'Paraules Clau (Literal / Ràpida)'}</option>
          </select>
          <button type="button" onclick="configureAiRubricEndpoint()" title="${isEn() ? 'Configure Gemini API Key (Google AI Studio)' : 'Configurar API Key de Gemini (Google AI Studio)'}" class="text-[11px] bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-1 rounded-lg font-bold">
            <i class="fa-solid fa-gear"></i>
          </button>
        </div>
      </div>

      <div class="q-rubric-ai-panel ${qEvalMode === 'ai_rubric' ? '' : 'hidden'} space-y-2 bg-indigo-50/90 p-3 rounded-xl border border-indigo-200">
        <div class="flex items-center justify-between gap-1 flex-wrap">
          <label class="text-xs font-black text-indigo-950 flex items-center gap-1.5">
            <i class="fa-solid fa-wand-magic-sparkles text-indigo-600"></i> ${isEn() ? 'Guide / Rubric for the AI (Validity criteria):' : 'Guia / Rúbrica per a la IA (Criteris de validesa):'}
          </label>
          <span class="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">${isEn() ? 'Invisible to students' : "Invisible per a l'alumne"}</span>
        </div>
        <textarea rows="3" placeholder="${isEn() ? 'E.g.: Validate the answer if the student explains in their own words that the protagonist acts out of fear or to protect their sibling, and justifies it with an event from the text. Tolerate spelling mistakes.' : 'Ex: Valida la resposta si l\'alumne explica amb les seves paraules que el protagonista actua per por o per protegir el seu germà, i ho justifica amb algun fet del text. Tolera faltes d\'ortografia.'}" class="q-rubric-prompt-input w-full p-2.5 bg-white border border-indigo-300 rounded-lg text-xs text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500">${escapeHtmlAttr(qRubricPrompt)}</textarea>
        <p class="text-[11px] text-indigo-800 leading-snug">
          <i class="fa-solid fa-circle-info text-indigo-500 mr-1"></i> ${isEn() ? 'The AI will evaluate meaning and coherence awarding <strong>100% (correct)</strong>, <strong>50% (partial)</strong>, or <strong>0%</strong> with personalized formative feedback.' : "La IA avaluarà el sentit i la coherència de la resposta donant <strong>100% (correcta)</strong>, <strong>50% (parcial)</strong> o <strong>0%</strong> amb un feedback formatiu personalitzat en català."}
        </p>
      </div>

      <div class="space-y-1.5">
        <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
          <i class="fa-solid fa-key text-emerald-600"></i>
          <span class="q-keywords-label">${qEvalMode === 'ai_rubric' ? (isEn() ? 'Support Keywords / Offline Fallback (optional, comma-separated):' : 'Paraules Clau de suport / Fallback offline (opcional, separades per comes):') : (isEn() ? 'Keywords for Auto-correction (comma-separated):' : "Paraules Clau per a l'Autocorrecció (separades per comes):")}</span>
        </div>
        <input type="text" value="${escapeHtmlAttr(qKeywords)}" placeholder="${isEn() ? 'E.g.: friendship, loyalty, forest (accepts minor spelling errors)' : 'Ex: amistat, lleialtat, bosc (accepta petites faltes d\'ortografia)'}" class="q-keywords-input w-full p-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 outline-none">
      </div>
    </div>

    <div class="q-opinion-box hidden p-2.5 bg-blue-50 rounded-lg border border-blue-200 flex items-center space-x-2 text-xs font-bold text-blue-900">
      <i class="fa-solid fa-comment-dots text-blue-600 text-sm"></i>
      <span>${isEn() ? '💡 Reflection Question: Any option chosen by the student will count as correct.' : "💡 Pregunta de Reflexió: Qualsevol opció seleccionada per l'alumne comptarà com a encert."}</span>
    </div>

    <div class="q-ordering-box hidden p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex items-center space-x-2 text-xs font-bold text-amber-900">
      <i class="fa-solid fa-arrow-down-short-wide text-amber-600 text-sm"></i>
      <span>${isEn() ? '↕️ Write the sentences in the REAL chronological order (1st to 6th). They will automatically be shuffled for the student.' : '↕️ Escriu les frases en l’ordre cronològic REAL (1r a 6è). Es mostraran barrejades a l’alumne automàticament.'}</span>
    </div>

    <div class="q-cloze-box hidden p-3.5 bg-cyan-50/80 rounded-xl border border-cyan-200 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-200/80 pb-2">
        <span class="text-xs font-black text-cyan-950 flex items-center gap-1.5">
          <i class="fa-solid fa-puzzle-piece text-cyan-600"></i> ${isEn() ? 'Fill in Blanks (Cloze) Settings:' : "Configuració d'Omplir Buits (Cloze):"}
        </span>
        <div class="flex items-center gap-2 flex-wrap">
          <select onchange="updateClozeEditorPreview(this)" class="q-cloze-mode p-1.5 text-xs font-extrabold rounded-lg border border-cyan-300 bg-white text-cyan-950 outline-none cursor-pointer">
            <option value="dropdown" ${qClozeMode === 'dropdown' ? 'selected' : ''}>🔽 ${isEn() ? 'With dropdowns (choose from options)' : 'Amb desplegables (tria entre opcions)'}</option>
            <option value="input" ${qClozeMode === 'input' ? 'selected' : ''}>⌨️ ${isEn() ? 'Type the word (without dropdown)' : 'Escriure la paraula (sense desplegable)'}</option>
          </select>
          <button type="button" onclick="insertClozeBlankInEditor(this)" class="text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-2.5 py-1.5 rounded-lg shadow-2xs flex items-center gap-1 transition">
            <i class="fa-solid fa-plus"></i> ${isEn() ? 'Insert Blank [[...]]' : 'Inserir Buit [[...]]'}
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="block text-xs font-bold text-cyan-950">
          ${isEn() ? 'Text with blanks (put the correct answer first inside <code class="bg-white px-1.5 py-0.5 rounded border border-cyan-200 font-mono text-cyan-800">[[correct|distractor1|distractor2]]</code>):' : 'Text amb buits (posa la resposta correcta en primer lloc dins de <code class="bg-white px-1.5 py-0.5 rounded border border-cyan-200 font-mono text-cyan-800">[[correcta|distractor1|distractor2]]</code>):'}
        </label>
        <textarea rows="3" oninput="updateClozeEditorPreview(this)" placeholder="${isEn() ? 'E.g.: The character [[hid|showed|lost]] behind the tree [[because|although|since]] he was very afraid.' : 'Ex: El protagonista es va [[amagar|mostrar|perdre]] darrere l\'arbre [[perquè|encara que|doncs]] tenia molta por.'}" class="q-cloze-template w-full p-2.5 bg-white border border-cyan-300 rounded-lg text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500">${escapeHtmlAttr(qClozeTemplate)}</textarea>
        <p class="text-[11px] text-cyan-900 leading-snug">
          <i class="fa-solid fa-circle-info text-cyan-600 mr-1"></i>
          ${isEn() ? '<strong>In dropdown mode:</strong> separate the correct word and distractors with <code class="font-mono font-bold">|</code> (e.g.: <code class="font-mono">[[ran|runs|will run]]</code>; they will be shuffled). <strong>In typing mode:</strong> enter only <code class="font-mono">[[word]]</code> (tolerates capitalization, accents, and 1 minor typo in long words).' : '<strong>En mode desplegable:</strong> separa la paraula correcta i les incorrectes amb <code class="font-mono font-bold">|</code> (ex: <code class="font-mono">[[va córrer|corria|correrà]]</code>; es barrejaran soles). <strong>En mode escriure:</strong> posa només <code class="font-mono">[[paraula]]</code> (tolera majúscules, accents i 1 errada lleu en mots llargs).'}
        </p>
      </div>

      <div class="bg-white/90 p-3 rounded-xl border border-cyan-200/80 space-y-1">
        <span class="block text-[10px] font-black uppercase tracking-wider text-cyan-700">${isEn() ? 'Student preview:' : 'Vista prèvia per a l\'alumnat:'}</span>
        <div class="q-cloze-preview"></div>
      </div>
    </div>
  `;

  container.appendChild(qDiv);

  const selectElem = qDiv.querySelector('.q-type-select');
  if (selectElem) toggleQuestionAnswerType(selectElem);

  updateChapterButtonsInQuestions();
  const chSelect = qDiv.querySelector('.q-chapter-select');
  if (chSelect && qChapterIndex !== 'all') {
    chSelect.value = qChapterIndex;
  }

  updateQuestionIndexes();
}

function toggleExtraOptions(btn) {
  const block = btn.closest('.q-block');
  const extraBox = block.querySelector('.q-extra-opts-box');
  const choiceEF = block.querySelectorAll('.opt-ef-choice');
  const multiEF = block.querySelectorAll('.opt-ef-multi');
  const isHidden = extraBox.classList.contains('hidden');

  if (isHidden) {
    extraBox.classList.remove('hidden');
    choiceEF.forEach(function(el) { el.classList.remove('hidden'); });
    multiEF.forEach(function(el) { el.classList.remove('hidden'); });
    btn.innerHTML = '<i class="fa-solid fa-minus"></i> <span>' + (isEn() ? 'Hide options E and F' : 'Ocultar opcions E i F') + '</span>';
  } else {
    extraBox.classList.add('hidden');
    choiceEF.forEach(function(el) { el.classList.add('hidden'); });
    multiEF.forEach(function(el) { el.classList.add('hidden'); });
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>' + (isEn() ? 'Add options E and F (up to 6)' : 'Afegir opcions E i F (fins a 6)') + '</span>';
    block.querySelector('.q-opt-4').value = '';
    block.querySelector('.q-opt-5').value = '';
  }
}

function updateImagePreview(inputElem) {
  const block = inputElem.closest('.q-block');
  if (!block) return;
  const optMatch = inputElem.className.match(/q-opt-(\d)/);
  if (optMatch && optMatch[1] !== undefined) {
    const optIdx = optMatch[1];
    const img = block.querySelector('.img-preview-' + optIdx);
    if (img) img.src = inputElem.value.trim() || ('https://via.placeholder.com/100?text=' + ['A','B','C','D','E','F'][optIdx]);
  }
}

function removeQuestionField(btn) {
  btn.closest('.q-block').remove();
  updateQuestionIndexes();
}

function moveQuestionUp(btn) {
  const currentBlock = btn.closest('.q-block');
  const prevBlock = currentBlock.previousElementSibling;
  if (prevBlock) {
    currentBlock.parentNode.insertBefore(currentBlock, prevBlock);
    updateQuestionIndexes();
  }
}

function moveQuestionDown(btn) {
  const currentBlock = btn.closest('.q-block');
  const nextBlock = currentBlock.nextElementSibling;
  if (nextBlock) {
    currentBlock.parentNode.insertBefore(nextBlock, currentBlock);
    updateQuestionIndexes();
  }
}

function updateQuestionIndexes() {
  const blocks = document.querySelectorAll('#questions-container .q-block');
  blocks.forEach(function(block, idx) {
    const badge = block.querySelector('.q-number-badge');
    const label = block.querySelector('.q-number-label');
    if (badge) badge.innerText = idx + 1;
    if (label) label.innerText = (isEn() ? 'Question ' : 'Pregunta ') + (idx + 1);
  });
  const badge = document.getElementById('question-count-badge');
  if (badge) badge.innerText = blocks.length;
}

function toggleOpenEvalMode(selectElem) {
  const block = selectElem.closest('.q-block');
  if (!block) return;
  const mode = selectElem.value;
  const aiPanel = block.querySelector('.q-rubric-ai-panel');
  const kwLabel = block.querySelector('.q-keywords-label');
  if (mode === 'ai_rubric') {
    if (aiPanel) aiPanel.classList.remove('hidden');
    if (kwLabel) kwLabel.innerText = isEn() ? "Support Keywords / Offline Fallback (optional, comma-separated):" : "Paraules Clau de suport / Fallback offline (opcional, separades per comes):";
  } else {
    if (aiPanel) aiPanel.classList.add('hidden');
    if (kwLabel) kwLabel.innerText = isEn() ? "Keywords for Auto-correction (comma-separated):" : "Paraules Clau per a l'Autocorrecció (separades per comes):";
  }
}

function onQuestionTaxonomyChange(selectElem) {
  const block = selectElem.closest('.q-block');
  if (!block) return;
  const qType = block.querySelector('.q-type-select').value;
  if (qType !== 'text_input') return;
  const evalSelect = block.querySelector('.q-open-eval-mode');
  if (!evalSelect) return;
  const tax = selectElem.value;
  if (tax === 'opinion' || tax === 'creative' || tax === 'inferential') {
    evalSelect.value = 'ai_rubric';
  } else {
    evalSelect.value = 'keywords';
  }
  toggleOpenEvalMode(evalSelect);
}

function toggleQuestionAnswerType(elem) {
  const block = elem.closest('.q-block');
  const mainType = block.querySelector('.q-type-select').value;
  const imgModeSelect = block.querySelector('.q-img-mode-select');
  const imgMode = imgModeSelect ? imgModeSelect.value : 'single';

  const optionsWrapper = block.querySelector('.q-options-wrapper');
  const singleBox = block.querySelector('.q-single-box');
  const singleLabel = block.querySelector('.q-single-label');
  const multiBox = block.querySelector('.q-multiple-box');
  const opinionBox = block.querySelector('.q-opinion-box');
  const orderingBox = block.querySelector('.q-ordering-box');
  const textInputBox = block.querySelector('.q-text-input-box');
  const clozeBox = block.querySelector('.q-cloze-box');
  const imagePreviewsBox = block.querySelector('.q-image-previews-box');
  const uploadContainers = block.querySelectorAll('.q-upload-btn-container');
  const badges = block.querySelectorAll('.opt-label-badge');

  optionsWrapper.classList.remove('hidden');
  singleBox.classList.add('hidden');
  multiBox.classList.add('hidden');
  opinionBox.classList.add('hidden');
  orderingBox.classList.add('hidden');
  if (imgModeSelect) imgModeSelect.classList.add('hidden');
  if (textInputBox) textInputBox.classList.add('hidden');
  if (clozeBox) clozeBox.classList.add('hidden');
  if (imagePreviewsBox) imagePreviewsBox.classList.add('hidden');

  uploadContainers.forEach(function(c) { c.classList.add('hidden'); });

  const isOrdering = mainType === 'ordering';
  const isImage = mainType === 'image_single';
  const isTextInput = mainType === 'text_input';
  const isCloze = mainType === 'cloze';

  if (isCloze) {
    optionsWrapper.classList.add('hidden');
    if (clozeBox) {
      clozeBox.classList.remove('hidden');
      const tplEl = clozeBox.querySelector('.q-cloze-template');
      if (tplEl) updateClozeEditorPreview(tplEl);
    }
    return;
  }

  if (isTextInput) {
    optionsWrapper.classList.add('hidden');
    if (textInputBox) textInputBox.classList.remove('hidden');
    return;
  }

  badges.forEach(function(b, idx) {
    const labelsLetter = ['A', 'B', 'C', 'D', 'E', 'F'];
    const labelsOrder = isEn() ? ['1st', '2nd', '3rd', '4th', '5th', '6th'] : ['1r', '2n', '3r', '4t', '5è', '6è'];
    b.innerText = isOrdering ? labelsOrder[idx] : labelsLetter[idx];
  });

  for (let i = 0; i < 6; i++) {
    const input = block.querySelector('.q-opt-' + i);
    if (input) {
      const letters = ['A','B','C','D','E','F'];
      const orderLabels = isEn() ? ['1st', '2nd', '3rd', '4th', '5th', '6th'] : ['1r', '2n', '3r', '4t', '5è', '6è'];
      if (isImage) input.placeholder = isEn() ? ('URL or image ' + letters[i] + '...') : ('URL o imatge ' + letters[i] + '...');
      else if (isOrdering) input.placeholder = isEn() ? (orderLabels[i] + ' event that happens') : (orderLabels[i] + ' fet que passa');
      else input.placeholder = isEn() ? ('Option ' + letters[i]) : ('Opció ' + letters[i]);
    }
  }

  if (mainType === 'multiple') {
    multiBox.classList.remove('hidden');
  } else if (mainType === 'opinion') {
    opinionBox.classList.remove('hidden');
  } else if (mainType === 'ordering') {
    orderingBox.classList.remove('hidden');
  } else if (isImage) {
    if (imgModeSelect) imgModeSelect.classList.remove('hidden');
    if (imagePreviewsBox) imagePreviewsBox.classList.remove('hidden');
    uploadContainers.forEach(function(c) { c.classList.remove('hidden'); });

    if (imgMode === 'multiple') {
      multiBox.classList.remove('hidden');
    } else if (imgMode === 'opinion') {
      opinionBox.classList.remove('hidden');
    } else {
      singleBox.classList.remove('hidden');
      if (singleLabel) singleLabel.innerText = isEn() ? "Which is the correct image?" : "Quina és la imatge correcta?";
    }
  } else {
    singleBox.classList.remove('hidden');
    if (singleLabel) singleLabel.innerText = isEn() ? "Which is the correct answer?" : "Quina és la resposta correcta?";
  }
}

async function saveReading(e) {
  e.preventDefault();
  const type = document.getElementById('editor-type').value || 'text';
  const contentFormat = type === 'text' ? (document.getElementById('editor-content-format').value || 'written') : 'book';
  const referenceImageUrl = (type === 'text' && contentFormat === 'image') ? (document.getElementById('editor-ref-image').value.trim() || '') : '';
  const title = document.getElementById('editor-title').value;
  const bookAuthor = document.getElementById('editor-book-author').value || '';
  const editorialOrSource = document.getElementById('editor-source').value || '';
  const level = document.getElementById('editor-level').value;
  const category = document.getElementById('editor-category').value || 'General';
  const estimatedTime = document.getElementById('editor-duration').value || '10 min';
  const bookPages = document.getElementById('editor-book-pages').value || '';
  const pointsPerQuestion = parseInt(document.getElementById('editor-points-per-q').value || 1);
  const content = document.getElementById('editor-content').value || '';
  const imageUrl = document.getElementById('editor-image').value || '';
  const isAdaptedVersion = document.getElementById('editor-is-adapted').value === 'true';

  if (type === 'text' && contentFormat === 'image' && !referenceImageUrl) {
    alert(isEn() ? "Please upload a reference image or paste its URL before saving." : "Si us plau, puja una imatge de referència o enganxa'n l'enllaç abans de desar.");
    return;
  }

  const glossary = [];
  document.querySelectorAll('#glossary-container .glossary-item').forEach(function(item) {
    const w = item.querySelector('.g-word').value.trim();
    const d = item.querySelector('.g-def').value.trim();
    if (w && d) glossary.push({ word: w, definition: d });
  });

  const authorDisplayName = userDisplayName || (currentUser ? currentUser.email.split('@')[0] : (isEn() ? "Creator" : "Creador/a"));
  const authorSchool = userSchool || "";
  const authorEmail = currentUser ? currentUser.email : "";

  const qBlocks = document.querySelectorAll('.q-block');
  const totalQCount = qBlocks.length;

  const distinctTaxonomiesSet = new Set();
  qBlocks.forEach(function(b) {
    const sel = b.querySelector('.q-taxonomy-select');
    if (sel && sel.value) distinctTaxonomiesSet.add(sel.value);
  });
  const distinctTaxonomies = Array.from(distinctTaxonomiesSet);

  try {
    let docId = editingDocId;

    if (editingDocId) {
      await db.collection(getReadingsCollection()).doc(editingDocId).update({
        type: type,
        contentFormat: contentFormat,
        referenceImageUrl: referenceImageUrl,
        title: title,
        bookAuthor: bookAuthor,
        editorialOrSource: editorialOrSource,
        level: level,
        category: category,
        estimatedTime: estimatedTime,
        bookPages: bookPages,
        pointsPerQuestion: pointsPerQuestion,
        questionCount: totalQCount,
        taxonomyTypes: distinctTaxonomies,
        taxonomiesCount: distinctTaxonomies.length,
        content: content,
        imageUrl: imageUrl,
        glossary: glossary,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      const oldQ = await db.collection(getReadingsCollection()).doc(editingDocId).collection(SUB_COLLECTION).get();
      for (const qDoc of oldQ.docs) {
        await qDoc.ref.delete();
      }
    } else {
      if (isUserAdminOrCreator()) {
        userPoints += 1;
        await db.collection("users").doc(currentUser.uid).set({ points: userPoints }, { merge: true });
      }

      const countSnap = await db.collection(getReadingsCollection()).get();
      const nextNum = countSnap.size + 1;

      const docRef = await db.collection(getReadingsCollection()).add({
        type: type,
        contentFormat: contentFormat,
        referenceImageUrl: referenceImageUrl,
        title: title,
        bookAuthor: bookAuthor,
        editorialOrSource: editorialOrSource,
        level: level,
        category: category,
        estimatedTime: estimatedTime,
        bookPages: bookPages,
        pointsPerQuestion: pointsPerQuestion,
        questionCount: totalQCount,
        taxonomyTypes: distinctTaxonomies,
        taxonomiesCount: distinctTaxonomies.length,
        content: content,
        imageUrl: imageUrl,
        readingNumber: nextNum,
        glossary: glossary,
        parentReadingId: cloningParentId || null,
        isAdaptedVersion: isAdaptedVersion,
        authorUid: currentUser ? currentUser.uid : null,
        authorDisplayName: authorDisplayName,
        authorSchool: authorSchool,
        authorEmail: authorEmail,
        authorPoints: userPoints,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      docId = docRef.id;
    }

    let orderIndex = 0;

    for (const block of qBlocks) {
      const qText = block.querySelector('.q-text').value;
      const qType = block.querySelector('.q-type-select').value || 'single';
      const imgMode = block.querySelector('.q-img-mode-select').value || 'single';
      const taxonomyType = block.querySelector('.q-taxonomy-select').value || 'literal';
      const chapterSelectEl = block.querySelector('.q-chapter-select');
      const chapterIndexVal = (chapterSelectEl && chapterSelectEl.value !== 'all') ? parseInt(chapterSelectEl.value) : null;

      if (qType === 'cloze') {
        const clozeModeEl = block.querySelector('.q-cloze-mode');
        const clozeMode = clozeModeEl ? clozeModeEl.value : 'dropdown';
        const clozeTplEl = block.querySelector('.q-cloze-template');
        const clozeTemplate = clozeTplEl ? clozeTplEl.value.trim() : '';
        const parsedCloze = parseClozeTemplate(clozeTemplate);

        if (!clozeTemplate || parsedCloze.blanks.length === 0) {
          alert(isEn() ? ("⚠️ Fill in blanks question «" + qText + "» must include at least one blank with format [[answer|option2]].") : ("⚠️ La pregunta d'omplir buits «" + qText + "» ha d'incloure almenys un buit amb el format [[resposta|opció2]]."));
          return;
        }
        if (clozeMode === 'dropdown') {
          const invalidBlank = parsedCloze.blanks.find(function(b) { return b.allOptions.length < 2; });
          if (invalidBlank) {
            alert(isEn() ? ("⚠️ In dropdown mode, each blank in question «" + qText + "» must have at least 2 options separated by | (e.g.: [[correct|incorrect]]).") : ("⚠️ En mode desplegable, cada buit de la pregunta «" + qText + "» ha de tenir com a mínim 2 opcions separades per | (ex: [[correcta|incorrecta]])."));
            return;
          }
        }

        if (qText) {
          await db.collection(getReadingsCollection()).doc(docId).collection(SUB_COLLECTION).add({
            questionText: qText,
            options: [],
            questionType: 'cloze',
            taxonomyType: taxonomyType,
            clozeMode: clozeMode,
            clozeTemplate: clozeTemplate,
            chapterIndex: chapterIndexVal,
            orderIndex: orderIndex
          });
          orderIndex++;
        }
      } else if (qType === 'text_input') {
        const evalModeEl = block.querySelector('.q-open-eval-mode');
        const evaluationMode = evalModeEl ? evalModeEl.value : 'keywords';
        const rubricEl = block.querySelector('.q-rubric-prompt-input');
        const rubricPrompt = rubricEl ? rubricEl.value.trim() : '';
        const rawKw = block.querySelector('.q-keywords-input').value || '';
        const keywordsArr = rawKw.split(',').map(function(k) { return k.trim(); }).filter(function(k) { return k.length > 0; });

        if (evaluationMode === 'ai_rubric' && !rubricPrompt && keywordsArr.length === 0) {
          alert(isEn() ? ("⚠️ Open question «" + qText + "» has AI Rubric enabled, but you have not entered any scoring criteria or support keywords.") : ("⚠️ La pregunta oberta «" + qText + "» té activada la Rúbrica IA però no has escrit cap criteri de correcció ni paraules clau de suport."));
          return;
        }

        if (qText) {
          await db.collection(getReadingsCollection()).doc(docId).collection(SUB_COLLECTION).add({
            questionText: qText,
            options: [],
            questionType: 'text_input',
            taxonomyType: taxonomyType,
            evaluationMode: evaluationMode,
            rubricPrompt: rubricPrompt,
            keywords: keywordsArr,
            chapterIndex: chapterIndexVal,
            orderIndex: orderIndex
          });
          orderIndex++;
        }
      } else {
        const options = [];
        for (let i = 0; i < 6; i++) {
          const optEl = block.querySelector('.q-opt-' + i);
          const optVal = optEl ? optEl.value : '';
          if (optVal.trim()) options.push(optVal.trim());
        }

        if (qText && options.length >= 2) {
          const baseQData = {
            questionText: qText,
            options: options,
            questionType: qType,
            imageSelectionMode: imgMode,
            taxonomyType: taxonomyType,
            chapterIndex: chapterIndexVal,
            orderIndex: orderIndex
          };

          if (qType === 'opinion' || qType === 'ordering' || (qType === 'image_single' && imgMode === 'opinion')) {
            await db.collection(getReadingsCollection()).doc(docId).collection(SUB_COLLECTION).add(baseQData);
          } else if (qType === 'multiple' || (qType === 'image_single' && imgMode === 'multiple')) {
            const multiCheckboxes = block.querySelectorAll('.q-correct-multi:checked');
            const correctAnswers = Array.from(multiCheckboxes).map(function(cb) { return parseInt(cb.value); });

            await db.collection(getReadingsCollection()).doc(docId).collection(SUB_COLLECTION).add(Object.assign({}, baseQData, {
              correctAnswers: correctAnswers.length > 0 ? correctAnswers : [0]
            }));
          } else {
            const correctSelect = block.querySelector('.q-correct-single');
            const correctIdx = correctSelect ? parseInt(correctSelect.value) : 0;

            await db.collection(getReadingsCollection()).doc(docId).collection(SUB_COLLECTION).add(Object.assign({}, baseQData, {
              correctAnswer: correctIdx
            }));
          }
          orderIndex++;
        }
      }
    }

    editingDocId = null;
    cloningParentId = null;
    cloningMode = 'questions';
    await loadUserData();
    renderNav();
    renderCatalog();
  } catch (err) {
    alert((isEn() ? "Error saving reading: " : "Error en desar la lectura: ") + err.message);
  }
}

function openCloneReadingModal(parentDocId, parentTitle, isAuthorOrAdmin) {
  if (!currentUser) { renderLogin(); return; }
  const container = document.getElementById('clone-modal-container');

  container.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-xl">
        <div class="flex justify-between items-center border-b border-slate-100 pb-2">
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-seedling text-emerald-600"></i> ${isEn() ? 'UDL Adaptation & Inclusion' : 'Adaptació i Inclusió DUA'}
          </h3>
          <button onclick="document.getElementById('clone-modal-container').innerHTML=''" class="text-slate-400 hover:text-slate-600"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <p class="text-xs text-slate-600">
          ${isEn() ? 'What type of adaptation do you want to create for ' : "Quin tipus d'adaptació vols crear per a "}<strong class="text-slate-800">${escapeHtmlAttr(parentTitle)}</strong>?
        </p>

        <div class="space-y-3">
          <div onclick="confirmCloneReading('${parentDocId}', 'adapted')" class="cursor-pointer bg-emerald-50 hover:bg-emerald-100/80 p-4 rounded-xl border-2 border-emerald-300 transition space-y-1">
            <div class="flex items-center justify-between">
              <span class="font-black text-sm text-emerald-950 flex items-center gap-1.5">
                <i class="fa-solid fa-seedling text-emerald-600"></i> ${isEn() ? 'Adapted / Simplified Version (Text or Visual + Questions)' : 'Versió Adaptada / Simplificada (Text o Visual + Preguntes)'}
              </span>
              <span class="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md">${isEn() ? 'Recommended UDL' : 'Recomanat DUA'}</span>
            </div>
            <p class="text-xs text-emerald-900 leading-relaxed">
              ${isEn() ? 'Shorten and simplify the <strong>original text</strong> (or turn it into a <strong>reference image / pictograms</strong>) and design <strong>shorter questions</strong>. It will be attached as a tab in the reader.' : 'Escurça i simplifica el <strong>text original</strong> (o converteix-lo en una <strong>imatge de referència / pictogrames</strong>) i dissenya unes <strong>preguntes més curtetes</strong>. Quedarà annexada en una pestanya al lector.'}
            </p>
          </div>

          ${!isAuthorOrAdmin ? `
            <div onclick="confirmCloneReading('${parentDocId}', 'questions')" class="cursor-pointer bg-amber-50 hover:bg-amber-100/80 p-4 rounded-xl border border-amber-300 transition space-y-1">
              <span class="font-black text-sm text-amber-950 flex items-center gap-1.5">
                <i class="fa-solid fa-code-fork text-amber-600"></i> ${isEn() ? 'New Question Battery (Same Material)' : 'Nova Bateria de Preguntes (Mateix Material)'}
              </span>
              <p class="text-xs text-amber-900 leading-relaxed">
                ${isEn() ? 'Keeps the <strong>original content intact</strong> (locked) and creates a new set of questions adapted to your class group.' : 'Manté el <strong>contingut original intacte</strong> (bloquejat) i crea un nou conjunt de preguntes adaptat al teu grup-classe.'}
              </p>
            </div>
          ` : ''}
        </div>

        <div class="flex justify-end pt-2">
          <button onclick="document.getElementById('clone-modal-container').innerHTML=''" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">${isEn() ? 'Cancel' : 'Cancel·lar'}</button>
        </div>
      </div>
    </div>
  `;
}

function confirmCloneReading(parentDocId, mode) {
  document.getElementById('clone-modal-container').innerHTML = '';
  renderEditor(null, parentDocId, mode || 'adapted');
}

