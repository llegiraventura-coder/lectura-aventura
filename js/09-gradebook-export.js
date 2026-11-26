    // =========================================================
    // QUADERN D'AULA (v0.45) — Graella de Notes per Aula
    // =========================================================
    async function renderClassroomGradeBook(classroomName) {
      if (!currentUser) return;
      const app = document.getElementById('app');
      if (!app) return;

      app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? 'Loading grade book...' : 'Carregant el quadern de notes...') + '</p></div>';

      try {
        const [studentsSnap, lecturesSnap, teacherSnap] = await Promise.all([
          db.collection('users').where('teacherUid', '==', currentUser.uid).where('classGroup', '==', classroomName).get(),
          db.collection(getReadingsCollection()).get(),
          db.collection('users').doc(currentUser.uid).get()
        ]);

        if (teacherSnap && teacherSnap.exists) {
          const tData = teacherSnap.data() || {};
          teacherAssignedReadingsMap = Object.assign({}, tData.teacherAssignedReadings || tData.assignedReadingsByGroup || {});
        }

        // Build readings catalog map
        const readingsCatalogMap = {};
        const totalCatalogDocs = lecturesSnap.size;
        let idxCat = 0;
        lecturesSnap.forEach(function(lDoc) {
          const lData = lDoc.data() || {};
          const rNum = lData.readingNumber || (totalCatalogDocs - idxCat);
          readingsCatalogMap[lDoc.id] = {
            id: lDoc.id,
            title: lData.title || (isEn() ? 'Untitled reading' : 'Lectura sense títol'),
            code: formatReadingCode(rNum),
            readingNumber: rNum
          };
          idxCat++;
        });

        if (!window.classroomTrackingStudentsMap) window.classroomTrackingStudentsMap = {};
        if (!window.classroomTrackingCatalogMap)  window.classroomTrackingCatalogMap  = {};
        window.classroomTrackingCatalogMap = readingsCatalogMap;

        let students = [];
        studentsSnap.forEach(function(doc) {
          const sData = Object.assign({ id: doc.id }, doc.data());
          students.push(sData);
          window.classroomTrackingStudentsMap[doc.id] = sData;
        });
        students.sort(function(a, b) {
          return (a.displayName || '').localeCompare(b.displayName || '', 'ca');
        });

        // Gather all reading IDs that any student in this classroom has completed
        const readingIdsSet = new Set();
        students.forEach(function(s) {
          (s.completedReadings || []).forEach(function(rId) {
            readingIdsSet.add(rId);
          });
        });

        // Sort all completed readings by readingNumber (chronological / code order)
        const sortedReadingIds = Array.from(readingIdsSet).sort(function(a, b) {
          const rA = readingsCatalogMap[a] ? readingsCatalogMap[a].readingNumber : 0;
          const rB = readingsCatalogMap[b] ? readingsCatalogMap[b].readingNumber : 0;
          return rA - rB;
        });

        // Assigned readings for this group
        const assignedReadingIds = getGroupAssignedReadings(classroomName);

        // Auto-select tab mode if entering this classroom
        if (window.activeGradeBookClassroom !== classroomName) {
          window.activeGradeBookClassroom = classroomName;
          classroomTableViewMode = assignedReadingIds.length > 0 ? 'assigned' : 'all';
        }

        const isAssignedView = classroomTableViewMode === 'assigned';
        const activeReadingIds = isAssignedView
          ? assignedReadingIds.filter(function(rId) { return !!readingsCatalogMap[rId]; })
          : sortedReadingIds;

        // Store for Excel export
        window.currentGradeBookExportData = {
          classroomName: classroomName,
          students: students,
          sortedReadingIds: activeReadingIds,
          allSortedReadingIds: sortedReadingIds,
          readingsCatalogMap: readingsCatalogMap,
          tableViewMode: classroomTableViewMode,
          assignedReadingIds: assignedReadingIds
        };

        // Helper: get best result for a student+reading
        function getBestResult(student, rId) {
          const history = student.readingHistory || {};
          const hEntry = history[rId];
          if (hEntry && hEntry.total > 0) {
            const pct = hEntry.percentage !== undefined ? hEntry.percentage : Math.round((hEntry.score / hEntry.total) * 100);
            return { pct: pct, wpm: hEntry.wpm || null, score: hEntry.score, total: hEntry.total, points: hEntry.points || 0 };
          }
          return null;
        }

        // Helper: semaphore color class
        function semaphoreClass(pct) {
          if (pct >= 75) return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' };
          if (pct >= 50) return { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' };
          return { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300' };
        }

        // Column headers HTML
        let theadCols = '<th class="p-2.5 text-left text-xs font-black text-slate-700 bg-slate-100 sticky left-0 z-10 min-w-[150px] border-r border-slate-200">' + (isEn() ? 'Student' : 'Alumne/a') + '</th>';
        
        if (isAssignedView) {
          theadCols += '<th class="p-2 text-center text-[11px] font-black text-indigo-700 bg-indigo-50/70 min-w-[70px] border-r border-indigo-200 align-top" title="' + (isEn() ? 'Completed readings outside the assignment' : 'Lectures completades fora de l\'assignació') + '">' + (isEn() ? 'Extra' : 'Extra') + '</th>';
        }

        activeReadingIds.forEach(function(rId) {
          const catInfo = readingsCatalogMap[rId] || {};
          const code = catInfo.code || '';
          const title = catInfo.title || rId.slice(0, 8) + '...';
          theadCols += '<th class="p-2 text-center text-[11px] font-bold text-slate-600 bg-slate-100 min-w-[110px] max-w-[150px] border-r border-slate-200 align-top">' +
            (code ? '<div class="text-indigo-600 font-mono font-black text-[10px]">' + escapeHtmlAttr(code) + '</div>' : '') +
            '<div class="leading-tight mt-0.5 line-clamp-2" title="' + escapeHtmlAttr(title) + '">' + escapeHtmlAttr(title) + '</div>' +
          '</th>';
        });

        if (isAssignedView) {
          theadCols += '<th class="p-2.5 text-center text-[11px] font-black text-emerald-800 bg-emerald-50 min-w-[100px] border-l border-emerald-200">' + (isEn() ? 'Assessment Avg' : 'Mitjana Avaluació') + '</th>';
        } else {
          theadCols += '<th class="p-2.5 text-center text-[11px] font-black text-indigo-800 bg-indigo-50 min-w-[100px] border-l border-indigo-200">' + (isEn() ? 'Average' : 'Mitjana') + '</th>';
        }

        // Build data rows + collect per-column data for class averages
        const colPcts = {}; // rId -> array of pcts
        const colWpms = {}; // rId -> array of wpms
        activeReadingIds.forEach(function(rId) { colPcts[rId] = []; colWpms[rId] = []; });

        let tbodyRows = '';
        students.forEach(function(student) {
          let rowCells = '<td class="p-2.5 sticky left-0 z-10 bg-white border-r border-slate-200 min-w-[150px]">' +
            '<div class="text-xs font-bold text-slate-800 leading-tight">' + escapeHtmlAttr(student.displayName || (isEn() ? 'Student' : 'Alumne/a')) + '</div>' +
          '</td>';

          if (isAssignedView) {
            const extraCount = (student.completedReadings || []).filter(function(rId) { return !assignedReadingIds.includes(rId); }).length;
            rowCells += '<td class="p-1.5 text-center border-r border-slate-100 bg-indigo-50/20">' +
              (extraCount > 0 ? '<span class="inline-block bg-indigo-100/90 border border-indigo-200 text-indigo-800 font-black px-2 py-0.5 rounded-full text-xs shadow-2xs" title="' + extraCount + ' ' + (isEn() ? 'free readings completed' : 'lectures lliures completades') + '">+' + extraCount + '</span>' : '<span class="text-slate-300 text-xs font-bold">—</span>') +
            '</td>';
          }

          const studentPcts = [];
          const studentWpms = [];

          activeReadingIds.forEach(function(rId) {
            const result = getBestResult(student, rId);
            if (result) {
              const sc = semaphoreClass(result.pct);
              colPcts[rId].push(result.pct);
              if (result.wpm) colWpms[rId].push(result.wpm);
              studentPcts.push(result.pct);
              if (result.wpm) studentWpms.push(result.wpm);
              rowCells += '<td class="p-1.5 text-center border-r border-slate-100">' +
                '<button type="button" onclick="openStudentReadingBreakdownModal(\'' + student.id + '\',\'' + rId + '\')" class="inline-flex flex-col items-center justify-center rounded-lg px-2 py-1 border ' + sc.bg + ' ' + sc.border + ' min-w-[70px] cursor-pointer hover:opacity-80 hover:shadow-sm transition" title="' + escapeHtmlAttr((student.displayName || '') + ' · ' + (readingsCatalogMap[rId] ? readingsCatalogMap[rId].title : rId)) + '">' +
                '<span class="text-sm font-black ' + sc.text + '">' + result.pct + '%</span>' +
                (result.wpm ? '<span class="text-[10px] font-bold text-slate-500 mt-0.5"><i class=\'fa-solid fa-gauge-high text-[9px]\'></i> ' + result.wpm + ' ' + (isEn() ? 'WPM' : 'PPM') + '</span>' : '') +
                '</button>' +
              '</td>';
            } else {
              rowCells += '<td class="p-1.5 text-center border-r border-slate-100 text-slate-300 text-sm font-bold">—</td>';
            }
          });

          // Student average column
          if (studentPcts.length > 0) {
            const avgPct = Math.round(studentPcts.reduce(function(a, b) { return a + b; }, 0) / studentPcts.length);
            const avgWpm = studentWpms.length > 0 ? Math.round(studentWpms.reduce(function(a, b) { return a + b; }, 0) / studentWpms.length) : null;
            const sc = semaphoreClass(avgPct);
            const progressRatioHTML = isAssignedView
              ? '<span class="text-[10px] font-bold text-slate-500 mt-0.5">' + studentPcts.length + '/' + activeReadingIds.length + ' ' + (isEn() ? 'done' : 'fetes') + '</span>'
              : '';

            rowCells += '<td class="p-1.5 text-center ' + (isAssignedView ? 'bg-emerald-50/60 border-l border-emerald-100' : 'bg-indigo-50/60 border-l border-indigo-100') + '">' +
              '<div class="inline-flex flex-col items-center justify-center rounded-lg px-2 py-1 border ' + sc.bg + ' ' + sc.border + ' min-w-[70px]">' +
              '<span class="text-sm font-black ' + sc.text + '">' + avgPct + '%</span>' +
              progressRatioHTML +
              (avgWpm ? '<span class="text-[10px] font-bold text-slate-500 mt-0.5"><i class=\'fa-solid fa-gauge-high text-[9px]\'></i> ' + avgWpm + ' ' + (isEn() ? 'WPM' : 'PPM') + '</span>' : '') +
              '</div>' +
            '</td>';
          } else {
            rowCells += '<td class="p-1.5 text-center ' + (isAssignedView ? 'bg-emerald-50/60 border-l border-emerald-100' : 'bg-indigo-50/60 border-l border-indigo-100') + ' text-slate-300 text-sm font-bold">—</td>';
          }

          tbodyRows += '<tr class="border-b border-slate-100 hover:bg-slate-50/70 transition">' + rowCells + '</tr>';
        });

        // Class average footer row
        let tfootCells = '<td class="p-2.5 sticky left-0 z-10 bg-indigo-900 text-white border-r border-indigo-800 min-w-[150px]">' +
          '<span class="text-xs font-black">' + (isEn() ? 'Class Average' : "Mitjana de l'Aula") + '</span>' +
        '</td>';

        if (isAssignedView) {
          tfootCells += '<td class="p-1.5 text-center border-r border-indigo-800 bg-indigo-900 text-indigo-300 text-xs font-bold">—</td>';
        }

        const grandPcts = [];
        const grandWpms = [];
        activeReadingIds.forEach(function(rId) {
          const pcts = colPcts[rId];
          if (pcts.length > 0) {
            const avg = Math.round(pcts.reduce(function(a, b) { return a + b; }, 0) / pcts.length);
            const wpms = colWpms[rId];
            const avgW = wpms.length > 0 ? Math.round(wpms.reduce(function(a, b) { return a + b; }, 0) / wpms.length) : null;
            grandPcts.push(avg);
            if (avgW) grandWpms.push(avgW);
            const sc = semaphoreClass(avg);
            tfootCells += '<td class="p-1.5 text-center border-r border-indigo-800 bg-indigo-900">' +
              '<div class="inline-flex flex-col items-center justify-center rounded-lg px-2 py-1 border ' + sc.bg + ' ' + sc.border + ' min-w-[70px]">' +
              '<span class="text-sm font-black ' + sc.text + '">' + avg + '%</span>' +
              (avgW ? '<span class="text-[10px] font-bold text-slate-500 mt-0.5"><i class=\'fa-solid fa-gauge-high text-[9px]\'></i> ' + avgW + ' ' + (isEn() ? 'WPM' : 'PPM') + '</span>' : '') +
              '</div>' +
            '</td>';
          } else {
            tfootCells += '<td class="p-1.5 text-center border-r border-indigo-800 bg-indigo-900 text-indigo-400 text-sm font-bold">—</td>';
          }
        });

        // Grand average cell
        if (grandPcts.length > 0) {
          const grandAvgPct = Math.round(grandPcts.reduce(function(a, b) { return a + b; }, 0) / grandPcts.length);
          const grandAvgWpm = grandWpms.length > 0 ? Math.round(grandWpms.reduce(function(a, b) { return a + b; }, 0) / grandWpms.length) : null;
          const sc = semaphoreClass(grandAvgPct);
          tfootCells += '<td class="p-1.5 text-center bg-indigo-900 border-l border-indigo-800">' +
            '<div class="inline-flex flex-col items-center justify-center rounded-lg px-2 py-1 border ' + sc.bg + ' ' + sc.border + ' min-w-[70px]">' +
            '<span class="text-sm font-black ' + sc.text + '">' + grandAvgPct + '%</span>' +
            (grandAvgWpm ? '<span class="text-[10px] font-bold text-slate-500 mt-0.5"><i class=\'fa-solid fa-gauge-high text-[9px]\'></i> ' + grandAvgWpm + ' ' + (isEn() ? 'WPM' : 'PPM') + '</span>' : '') +
            '</div>' +
          '</td>';
        } else {
          tfootCells += '<td class="p-1.5 text-center bg-indigo-900 border-l border-indigo-800 text-indigo-400 text-sm font-bold">—</td>';
        }

        // Warning card if assigned view is active but no readings assigned yet
        let emptyAssignedCardHTML = '';
        if (isAssignedView && activeReadingIds.length === 0) {
          emptyAssignedCardHTML = `
            <div class="bg-amber-50 border border-amber-200 p-8 rounded-2xl text-center space-y-4 max-w-xl mx-auto shadow-sm my-6">
              <div class="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-xl">
                <i class="fa-solid fa-book-bookmark"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-slate-800">${isEn() ? 'No assessable readings assigned yet' : 'Aquesta aula encara no té lectures assignades'}</h3>
                <p class="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  ${isEn() ? 'Assign specific assessable readings to filter the grade book and avoid infinite tables.' : 'Assigna lectures concretes per avaluar aquest grup-classe sense taules infinites.'}
                </p>
              </div>
              <div class="flex items-center justify-center gap-3 pt-2 flex-wrap">
                <button onclick="openAssignReadingsModal(decodeURIComponent('${encodeURIComponent(classroomName)}'))" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5">
                  <i class="fa-solid fa-book-bookmark"></i> ${isEn() ? 'Assign Readings' : 'Assigna lectures'}
                </button>
                <button onclick="setGradeBookTableViewMode('${encodeURIComponent(classroomName)}', 'all')" class="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition">
                  ${isEn() ? 'View all completed readings' : 'Veure totes les lectures completades'}
                </button>
              </div>
            </div>
          `;
        }

        const totalColsCount = activeReadingIds.length + (isAssignedView ? 3 : 2);
        const noDataMsg = students.length === 0
          ? '<tr><td colspan="' + totalColsCount + '" class="p-10 text-center text-sm text-slate-400">' + (isEn() ? 'No students found in this classroom.' : 'No hi ha alumnes en aquesta aula.') + '</td></tr>'
          : (activeReadingIds.length === 0 ? '<tr><td colspan="' + totalColsCount + '" class="p-10 text-center text-sm text-slate-400">' + (isEn() ? 'No readings to display in this view.' : 'No hi ha lectures per mostrar en aquesta vista.') + '</td></tr>' : '');

        const tableContent = noDataMsg || (tbodyRows + '');

        app.innerHTML = `
          <div class="max-w-full mx-auto space-y-5 px-0">
            <!-- CAPÇALERA -->
            <div class="flex items-center justify-between flex-wrap gap-3">
              <button onclick="renderStudentTrackingPanel()" class="text-slate-500 hover:text-slate-800 text-sm font-bold inline-flex items-center gap-1.5 transition">
                <i class="fa-solid fa-arrow-left"></i>
                ${isEn() ? '← Back to my students' : '← Tornar als meus alumnes'}
              </button>
              <div class="flex items-center gap-2 flex-wrap">
                <button onclick="openAssignReadingsModal(decodeURIComponent('${encodeURIComponent(classroomName)}'))" title="${isEn() ? 'Assign Readings' : 'Assigna lectures'}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm border border-emerald-700/20 rounded-xl px-3.5 py-2 inline-flex items-center gap-2 transition-all whitespace-nowrap text-xs">
                  <i class="fa-solid fa-book-bookmark w-4 h-4 flex items-center justify-center text-sm" data-lucide="bookmark-plus"></i>
                  <span>${isEn() ? 'Assign Readings' : 'Assigna lectures'}${assignedReadingIds.length > 0 ? ' (' + assignedReadingIds.length + ')' : ''}</span>
                </button>
                <button onclick="exportClassroomGradesSpreadsheet()" title="${isEn() ? 'Download Excel (.xlsx)' : 'Descarrega Excel (.xlsx)'}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm border border-emerald-700/20 rounded-xl px-3.5 py-2 inline-flex items-center gap-2 transition-all whitespace-nowrap text-xs">
                  <i class="fa-solid fa-file-excel w-4 h-4 flex items-center justify-center text-sm" data-lucide="file-spreadsheet"></i>
                  <span>${isEn() ? 'Download Excel (.xlsx)' : 'Descarrega Excel (.xlsx)'}</span>
                </button>
              </div>
            </div>

            <!-- TÍTOL DEL QUADERN -->
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div class="flex items-center gap-3">
                <div class="bg-emerald-600 text-white rounded-xl p-2.5">
                  <i class="fa-solid fa-table-cells-large text-lg"></i>
                </div>
                <div>
                  <h1 class="text-xl font-black text-slate-800">${isEn() ? 'Grade Book' : 'Quadern d\'Aula'} — <span class="text-emerald-700">${escapeHtmlAttr(classroomName)}</span></h1>
                  <p class="text-xs text-slate-500 mt-0.5">${students.length} ${isEn() ? 'students' : 'alumnes'} · ${activeReadingIds.length} ${isEn() ? 'readings in view' : 'lectures en aquesta vista'} · ${isEn() ? 'Green ≥75% · Amber 50-74% · Red <50%' : 'Verd ≥75% · Ambre 50-74% · Vermell <50%'}</p>
                </div>
              </div>

              <!-- SELECTOR DE DUES PESTANYES (AVALUACIÓ vs TOTES) -->
              <div class="flex items-center gap-2 border-t border-slate-100 pt-3 flex-wrap">
                <button onclick="setGradeBookTableViewMode('${encodeURIComponent(classroomName)}', 'assigned')" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 border ${isAssignedView ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                  <i class="fa-solid fa-clipboard-check"></i>
                  <span>${isEn() ? 'Assigned Readings (Assessment)' : 'Lectures assignades (Avaluació)'}${assignedReadingIds.length > 0 ? ' (' + assignedReadingIds.length + ')' : ''}</span>
                </button>
                <button onclick="setGradeBookTableViewMode('${encodeURIComponent(classroomName)}', 'all')" class="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 border ${!isAssignedView ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                  <i class="fa-solid fa-book-open-reader"></i>
                  <span>${isEn() ? 'All Readings (Includes free reading)' : 'Totes les lectures (Inclou lectura lliure)'}${sortedReadingIds.length > 0 ? ' (' + sortedReadingIds.length + ')' : ''}</span>
                </button>
              </div>
            </div>

            ${emptyAssignedCardHTML}

            ${(!isAssignedView || activeReadingIds.length > 0) ? `
              <!-- GRAELLA -->
              <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table class="border-collapse text-left" style="min-width: max-content;">
                    <thead class="sticky top-0 z-20">
                      <tr class="border-b-2 border-slate-200">
                        ${theadCols}
                      </tr>
                    </thead>
                    <tbody>
                      ${tableContent}
                    </tbody>
                    ${!noDataMsg ? '<tfoot><tr class="border-t-2 border-indigo-900">' + tfootCells + '</tr></tfoot>' : ''}
                  </table>
                </div>
              </div>

              <!-- LLEGENDA -->
              <div class="flex items-center gap-4 flex-wrap text-xs font-bold">
                <span class="flex items-center gap-1.5"><span class="inline-block w-4 h-4 rounded bg-emerald-100 border border-emerald-300"></span>${isEn() ? 'Excellent (≥75%)' : 'Excel·lent (≥75%)'}</span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-4 h-4 rounded bg-amber-100 border border-amber-300"></span>${isEn() ? 'Acceptable (50-74%)' : 'Acceptable (50-74%)'}</span>
                <span class="flex items-center gap-1.5"><span class="inline-block w-4 h-4 rounded bg-rose-100 border border-rose-300"></span>${isEn() ? 'Needs improvement (<50%)' : 'Cal millorar (<50%)'}</span>
                <span class="flex items-center gap-1.5 text-slate-400">— ${isEn() ? 'Not completed' : 'No realitzada'}</span>
                ${isAssignedView ? `<span class="flex items-center gap-1.5 text-indigo-700"><span class="inline-block px-1.5 py-0.2 rounded-full bg-indigo-100 border border-indigo-200 font-black">+N</span> ${isEn() ? 'Extra readings outside assignment' : 'Lectures lliures fora de l\'assignació'}</span>` : ''}
              </div>
            ` : ''}
          </div>
        `;
        if (window.lucide && typeof lucide.createIcons === 'function') {
          lucide.createIcons();
        }
      } catch (err) {
        console.error(err);
        app.innerHTML = '<div class="p-4 bg-red-100 text-red-700 rounded-xl max-w-2xl mx-auto">' + (isEn() ? 'Error loading grade book: ' : 'Error en carregar el quadern de notes: ') + escapeHtmlAttr(err.message) + '</div>';
      }
    }

    function setGradeBookTableViewMode(encodedName, mode) {
      classroomTableViewMode = mode;
      renderClassroomGradeBook(decodeURIComponent(encodedName));
    }

    // =========================================================
    // MODAL D'ASSIGNACIÓ DE LECTURES A L'AULA (v0.45)
    // =========================================================
    let currentAssignModalGroupId = '';
    let currentAssignModalSelected = new Set();
    let currentAssignCatalogDocs = [];

    async function openAssignReadingsModal(groupId) {
      if (!currentUser || !groupId) return;
      currentAssignModalGroupId = groupId;
      currentAssignModalSelected = new Set(getGroupAssignedReadings(groupId));

      let container = document.getElementById('assign-readings-modal-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'assign-readings-modal-container';
        document.body.appendChild(container);
      }

      container.innerHTML = `
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <!-- Header -->
            <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-indigo-50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm">
                  <i class="fa-solid fa-book-bookmark"></i>
                </div>
                <div>
                  <h3 class="text-base sm:text-lg font-black text-slate-800">
                    ${isEn() ? 'Assign Readings to Classroom' : "Assigna lectures a l'aula"}: <span class="text-emerald-700">${escapeHtmlAttr(groupId)}</span>
                  </h3>
                  <p class="text-xs text-slate-500">
                    ${isEn() ? 'Select assessable readings for this class group.' : 'Tria les lectures avaluables i obligatòries per a aquest grup.'}
                  </p>
                </div>
              </div>
              <button onclick="closeAssignReadingsModal()" class="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-white/80 transition">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <!-- Search & Filter Controls -->
            <div class="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200/80 space-y-2.5">
              <div class="relative">
                <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-slate-400 text-xs"></i>
                <input type="text" id="assign-readings-search" oninput="renderAssignReadingsList()" placeholder="${isEn() ? 'Search by title, level or code #CL-...' : 'Cercar per títol, nivell o codi #CL-...'}" class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-2xs">
              </div>
              <div class="flex items-center justify-between flex-wrap gap-2 text-xs">
                <label class="inline-flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                  <input type="checkbox" id="assign-filter-only-selected" onchange="renderAssignReadingsList()" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer">
                  <span>${isEn() ? 'Show only selected' : 'Només seleccionades'}</span>
                </label>
                <div class="flex items-center gap-2">
                  <button type="button" onclick="selectAllVisibleAssignReadings()" class="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold transition text-xs shadow-2xs">
                    ${isEn() ? 'Select visible' : 'Selecciona visibles'}
                  </button>
                  <button type="button" onclick="clearAllAssignReadings()" class="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold transition text-xs shadow-2xs">
                    ${isEn() ? 'Clear selection' : 'Neteja selecció'}
                  </button>
                  <span id="assign-modal-counter" class="ml-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs">
                    ${currentAssignModalSelected.size} ${isEn() ? 'selected' : 'seleccionades'}
                  </span>
                </div>
              </div>
            </div>

            <!-- Readings List (Scrollable) -->
            <div id="assign-readings-list" class="flex-grow overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 space-y-1">
              <div class="text-center py-8 text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl"></i></div>
            </div>

            <!-- Footer -->
            <div class="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button type="button" onclick="closeAssignReadingsModal()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/80 rounded-xl transition">
                ${isEn() ? 'Cancel' : 'Cancel·lar'}
              </button>
              <button type="button" id="assign-modal-save-btn" onclick="saveClassroomAssignedReadings()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-2 transition">
                <i class="fa-solid fa-check"></i>
                <span>${isEn() ? 'Save Assignment' : 'Desa assignació'}</span>
              </button>
            </div>
          </div>
        </div>
      `;

      if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
      }

      // Fetch catalog readings
      try {
        if (!currentAssignCatalogDocs || currentAssignCatalogDocs.length === 0) {
          const snap = await db.collection(getReadingsCollection()).get();
          const totalDocs = snap.size;
          let idx = 0;
          const list = [];
          snap.forEach(function(d) {
            const data = d.data() || {};
            const rNum = data.readingNumber || (totalDocs - idx);
            list.push({
              id: d.id,
              title: data.title || (isEn() ? 'Untitled' : 'Sense títol'),
              readingNumber: rNum,
              code: formatReadingCode(rNum),
              level: data.level || '',
              category: data.category || '',
              questionCount: data.questionCount || 10,
              type: data.type || 'text'
            });
            idx++;
          });
          list.sort(function(a, b) { return a.readingNumber - b.readingNumber; });
          currentAssignCatalogDocs = list;
        }
        renderAssignReadingsList();
      } catch (err) {
        console.error("Error loading readings for assignment modal:", err);
        const listDiv = document.getElementById('assign-readings-list');
        if (listDiv) {
          listDiv.innerHTML = '<div class="p-4 text-center text-red-600 text-xs font-bold">' + (isEn() ? 'Error loading catalog: ' : 'Error en carregar el catàleg: ') + escapeHtmlAttr(err.message) + '</div>';
        }
      }
    }

    function closeAssignReadingsModal() {
      const container = document.getElementById('assign-readings-modal-container');
      if (container) container.innerHTML = '';
    }

    function renderAssignReadingsList() {
      const listDiv = document.getElementById('assign-readings-list');
      const counterSpan = document.getElementById('assign-modal-counter');
      const searchInput = document.getElementById('assign-readings-search');
      const onlySelectedBox = document.getElementById('assign-filter-only-selected');
      if (!listDiv) return;

      const filterSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
      const onlySelected = onlySelectedBox ? onlySelectedBox.checked : false;

      if (counterSpan) {
        counterSpan.textContent = currentAssignModalSelected.size + ' ' + (isEn() ? 'selected' : 'seleccionades');
      }

      let visibleCount = 0;
      let html = '';

      currentAssignCatalogDocs.forEach(function(r) {
        const isSelected = currentAssignModalSelected.has(r.id);
        if (onlySelected && !isSelected) return;

        if (filterSearch) {
          const matchTitle = (r.title || '').toLowerCase().includes(filterSearch);
          const matchCode = (r.code || '').toLowerCase().includes(filterSearch);
          const matchLevel = (r.level || '').toLowerCase().includes(filterSearch);
          if (!matchTitle && !matchCode && !matchLevel) return;
        }

        visibleCount++;
        html += `
          <div onclick="toggleAssignReadingSelection('${r.id}')" class="p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${isSelected ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs' : 'bg-white hover:bg-slate-50 border-slate-200/80'}">
            <div class="flex items-center gap-3 min-w-0">
              <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleAssignReadingSelection('${r.id}')" class="w-4 h-4 text-emerald-600 rounded border-slate-300 cursor-pointer">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">${escapeHtmlAttr(r.code)}</span>
                  <span class="text-xs font-bold text-slate-800 line-clamp-1">${escapeHtmlAttr(r.title)}</span>
                </div>
                <div class="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-0.5">
                  <span>${getTranslatedLevel(r.level)}</span>
                  ${r.category ? `<span>· ${escapeHtmlAttr(r.category)}</span>` : ''}
                  <span>· ${r.questionCount} ${isEn() ? 'questions' : 'preguntes'}</span>
                </div>
              </div>
            </div>
            ${isSelected ? '<span class="shrink-0 text-emerald-600 font-bold text-xs"><i class="fa-solid fa-circle-check"></i></span>' : ''}
          </div>
        `;
      });

      if (visibleCount === 0) {
        html = '<div class="p-8 text-center text-slate-400 text-xs font-semibold">' + (isEn() ? 'No readings match the current filter.' : 'No hi ha cap lectura amb el filtre actual.') + '</div>';
      }

      listDiv.innerHTML = html;
    }

    function toggleAssignReadingSelection(readingId) {
      if (currentAssignModalSelected.has(readingId)) {
        currentAssignModalSelected.delete(readingId);
      } else {
        currentAssignModalSelected.add(readingId);
      }
      renderAssignReadingsList();
    }

    function selectAllVisibleAssignReadings() {
      const searchInput = document.getElementById('assign-readings-search');
      const onlySelectedBox = document.getElementById('assign-filter-only-selected');
      const filterSearch = searchInput ? searchInput.value.toLowerCase().trim() : '';
      const onlySelected = onlySelectedBox ? onlySelectedBox.checked : false;

      currentAssignCatalogDocs.forEach(function(r) {
        if (onlySelected && !currentAssignModalSelected.has(r.id)) return;
        if (filterSearch) {
          const matchTitle = (r.title || '').toLowerCase().includes(filterSearch);
          const matchCode = (r.code || '').toLowerCase().includes(filterSearch);
          const matchLevel = (r.level || '').toLowerCase().includes(filterSearch);
          if (!matchTitle && !matchCode && !matchLevel) return;
        }
        currentAssignModalSelected.add(r.id);
      });
      renderAssignReadingsList();
    }

    function clearAllAssignReadings() {
      currentAssignModalSelected.clear();
      renderAssignReadingsList();
    }

    async function saveClassroomAssignedReadings() {
      if (!currentUser || !currentAssignModalGroupId) return;
      const saveBtn = document.getElementById('assign-modal-save-btn');
      const origHtml = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (isEn() ? 'Saving...' : 'Desant...');
      }

      try {
        const selectedIds = Array.from(currentAssignModalSelected);
        teacherAssignedReadingsMap[currentAssignModalGroupId] = selectedIds;

        // 1. Save on teacher user doc
        await db.collection("users").doc(currentUser.uid).set({
          teacherAssignedReadings: teacherAssignedReadingsMap
        }, { merge: true });

        // 2. Save on class_groups collection
        const cgDocId = currentUser.uid + '_' + encodeURIComponent(currentAssignModalGroupId);
        db.collection("class_groups").doc(cgDocId).set({
          name: currentAssignModalGroupId,
          teacherId: currentUser.uid,
          teacherUid: currentUser.uid,
          assignedReadings: selectedIds,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function(){});

        // 3. Update all students in this group
        const studentsSnap = await db.collection("users").where('teacherUid', '==', currentUser.uid).where('classGroup', '==', currentAssignModalGroupId).get();
        const updates = [];
        studentsSnap.forEach(function(doc) {
          updates.push(db.collection("users").doc(doc.id).update({ assignedReadings: selectedIds }).catch(function(){}));
        });
        if (updates.length > 0) {
          await Promise.all(updates);
        }

        closeAssignReadingsModal();
        showToast(isEn() ? 'Readings assignment saved successfully!' : 'Assignació de lectures desada correctament!');

        // Refresh current active view
        if (window.currentGradeBookExportData && window.currentGradeBookExportData.classroomName === currentAssignModalGroupId) {
          renderClassroomGradeBook(currentAssignModalGroupId);
        } else {
          renderStudentTrackingPanel();
        }
      } catch (err) {
        console.error("Error saving classroom assigned readings:", err);
        alert((isEn() ? "Error saving assigned readings: " : "Error en desar l'assignació: ") + err.message);
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origHtml;
        }
      }
    }
function openStudentReadingBreakdownModal(studentUid, readingId) {
      const student = window.classroomTrackingStudentsMap && window.classroomTrackingStudentsMap[studentUid];
      if (!student) return;
      const hist    = (student.readingHistory || {})[readingId];
      const catInfo = (window.classroomTrackingCatalogMap || {})[readingId] || {};

      const studentName  = student.displayName || (isEn() ? 'Student' : 'Alumne/a');
      const studentGroup = (student.classGroup || '').trim() || (isEn() ? '—' : '—');
      const readingTitle = (hist && hist.title) || catInfo.title || (isEn() ? 'Untitled reading' : 'Lectura sense títol');
      const readingCode  = catInfo.code || '';

      // ── Semàfor ──────────────────────────────────────────
      function sc(pct) {
        if (pct >= 75) return { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', bar: 'bg-emerald-500' };
        if (pct >= 50) return { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-900',  bar: 'bg-amber-400'  };
        return           { bg: 'bg-rose-50',    border: 'border-rose-300',    text: 'text-rose-800',   bar: 'bg-rose-500'   };
      }

      // ── Contingut del modal ───────────────────────────────
      let bodyHTML = '';

      if (hist && hist.total > 0) {
        const pct    = hist.percentage !== undefined ? hist.percentage : Math.round((hist.score / hist.total) * 100);
        const colors = sc(pct);

        // Resum global
        let globalSummary = '<div class="grid grid-cols-2 gap-3 mb-4">';
        // Nota
        globalSummary += '<div class="' + colors.bg + ' ' + colors.border + ' border rounded-xl p-3 flex flex-col items-center justify-center gap-0.5">' +
          '<span class="text-2xl font-black ' + colors.text + '">' + pct + '%</span>' +
          '<span class="text-[11px] font-bold text-slate-500">' + hist.score + '/' + hist.total + ' ' + (isEn() ? 'correct' : 'encerts') + '</span>' +
        '</div>';
        // Punts
        const maxPts = hist.maxPoints || '';
        globalSummary += '<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col items-center justify-center gap-0.5">' +
          '<span class="text-2xl font-black text-amber-700">' + (hist.points || 0) + (maxPts ? '/' + maxPts : '') + '</span>' +
          '<span class="text-[11px] font-bold text-slate-500">PTS</span>' +
        '</div>';
        globalSummary += '</div>';

        // PPM / velocitat lectora
        if (hist.wpm) {
          const secs   = hist.readingSeconds || 0;
          const mins   = Math.floor(secs / 60);
          const secsR  = secs % 60;
          const timeStr = secs > 0 ? (mins > 0 ? mins + 'min ' + secsR + 's' : secsR + 's') : '';
          const words   = hist.wordCount || 0;
          globalSummary += '<div class="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 flex items-center gap-3">' +
            '<i class="fa-solid fa-gauge-high text-2xl text-indigo-600"></i>' +
            '<div>' +
              '<div class="text-base font-black text-indigo-800">' + hist.wpm + ' ' + (isEn() ? 'WPM' : 'PPM') + '</div>' +
              '<div class="text-[11px] text-slate-500 font-bold">' + (isEn() ? 'Silent reading speed' : 'Velocitat lectora silenciosa') +
              (timeStr ? ' · ' + timeStr : '') + (words ? ' · ' + words + ' ' + (isEn() ? 'words' : 'paraules') : '') + '</div>' +
            '</div>' +
          '</div>';
        }

        // Data de realització
        if (hist.completedAt) {
          try {
            const d = hist.completedAt.toDate ? hist.completedAt.toDate() : new Date(hist.completedAt);
            globalSummary += '<div class="text-[11px] text-slate-400 font-bold mb-4">' +
              '<i class="fa-solid fa-calendar-check mr-1"></i>' +
              (isEn() ? 'Completed: ' : 'Realitzada: ') + d.toLocaleDateString('ca-ES', { day: '2-digit', month: 'long', year: 'numeric' }) +
            '</div>';
          } catch(e) {}
        }

        bodyHTML += globalSummary;

        // Desglossament per taxonomia
        const taxKeysOrder = ['literal', 'inferential', 'figurative', 'opinion', 'creative'];
        const stats = hist.stats || null;

        if (stats) {
          let hasAnyTax = taxKeysOrder.some(function(k) { return stats[k] && stats[k].total > 0; });
          if (hasAnyTax) {
            bodyHTML += '<div class="mb-1"><span class="text-xs font-black text-slate-700 uppercase tracking-wide">' +
              (isEn() ? 'Breakdown by question type' : 'Desglossament per tipologia de pregunta') + '</span></div>';
            bodyHTML += '<div class="space-y-2">';
            taxKeysOrder.forEach(function(tKey) {
              const st = stats[tKey];
              if (!st || st.total <= 0) return;
              const tCfg    = TAXONOMY_CONFIG[tKey] || TAXONOMY_CONFIG.literal;
              const correct = Math.round(st.correct * 10) / 10;
              const taxPct  = Math.round((st.correct / st.total) * 100);
              const taxSc   = sc(taxPct);
              bodyHTML += '<div class="' + tCfg.color + ' border rounded-xl p-2.5 flex items-center gap-3">' +
                '<div class="shrink-0 w-7 h-7 rounded-lg bg-white/60 flex items-center justify-center">' +
                  '<i class="fa-solid ' + tCfg.icon + ' text-sm"></i>' +
                '</div>' +
                '<div class="flex-1 min-w-0">' +
                  '<div class="flex items-center justify-between mb-1">' +
                    '<span class="text-xs font-black">' + getLocalizedTaxonomyLabel(tKey) + '</span>' +
                    '<span class="text-xs font-black ' + taxSc.text + '">' + correct + '/' + st.total + ' (' + taxPct + '%)</span>' +
                  '</div>' +
                  '<div class="w-full bg-white/50 rounded-full h-2 overflow-hidden">' +
                    '<div class="h-2 rounded-full ' + taxSc.bar + ' transition-all" style="width:' + taxPct + '%"></div>' +
                  '</div>' +
                '</div>' +
              '</div>';
            });
            bodyHTML += '</div>';
          }
        } else {
          // Lectura antiga sense stats
          bodyHTML += '<div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mt-2 flex items-start gap-2.5">' +
            '<i class="fa-solid fa-circle-info text-slate-400 mt-0.5 shrink-0"></i>' +
            '<p class="text-xs text-slate-500">' +
              (isEn()
                ? 'This reading was completed before the taxonomy breakdown was introduced (v0.40.0). The detailed breakdown will be recorded the next time this student retakes it.'
                : 'Aquesta lectura es va completar abans de la versió que registra el desglossament per tipologia cognitiva (v0.40.0). El detall es registrarà la propera vegada que l\'alumne/a la torni a fer.') +
            '</p>' +
          '</div>';
        }

      } else {
        // Sense historial detallat — pot estar en completedReadings però sense readingHistory entry
        const savedPts = (student.scores || {})[readingId];
        bodyHTML = '<div class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">' +
          '<i class="fa-solid fa-circle-info text-slate-400 mt-0.5 shrink-0"></i>' +
          '<div>' +
            '<p class="text-sm font-bold text-slate-700 mb-1">' +
              (isEn() ? 'No detailed history available' : 'No hi ha historial detallat disponible') +
            '</p>' +
            (savedPts !== undefined
              ? '<p class="text-xs text-slate-500">' + (isEn() ? 'Points recorded: ' : 'Punts registrats: ') + '<strong>' + savedPts + ' PTS</strong></p>'
              : '') +
            '<p class="text-xs text-slate-400 mt-1">' +
              (isEn()
                ? 'Detailed data will be recorded the next time this student completes the reading.'
                : 'Les dades detallades es registraran la propera vegada que l\'alumne/a completi la lectura.') +
            '</p>' +
          '</div>' +
        '</div>';
      }

      // ── Render del modal ──────────────────────────────────
      let container = document.getElementById('student-breakdown-modal-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'student-breakdown-modal-container';
        document.body.appendChild(container);
      }

      container.innerHTML = `
        <div id="student-breakdown-modal-backdrop"
             onclick="closeStudentBreakdownModal()"
             class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             role="dialog" aria-modal="true">
          <div onclick="event.stopPropagation()"
               class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col">

            <!-- Capçalera del modal -->
            <div class="bg-gradient-to-r from-indigo-700 to-indigo-500 text-white p-5 rounded-t-2xl flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="text-xs font-black bg-white/20 px-2 py-0.5 rounded-lg">${escapeHtmlAttr(studentName)}</span>
                  ${studentGroup !== '—' ? '<span class="text-xs font-bold bg-emerald-500/80 px-2 py-0.5 rounded-lg">' + escapeHtmlAttr(studentGroup) + '</span>' : ''}
                </div>
                ${readingCode ? '<div class="text-[11px] font-mono font-black text-indigo-200 mb-0.5">' + escapeHtmlAttr(readingCode) + '</div>' : ''}
                <h2 class="text-sm font-black leading-snug">${escapeHtmlAttr(readingTitle)}</h2>
              </div>
              <button onclick="closeStudentBreakdownModal()" class="shrink-0 text-white/70 hover:text-white transition mt-0.5" title="${isEn() ? 'Close' : 'Tancar'}">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <!-- Cos del modal -->
            <div class="p-5 flex-1">
              ${bodyHTML}
            </div>

            <!-- Peu del modal -->
            <div class="px-5 pb-5">
              <button onclick="closeStudentBreakdownModal()"
                      class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm transition">
                ${isEn() ? 'Close' : 'Tancar'}
              </button>
            </div>
          </div>
        </div>
      `;

      // Tancar amb Escape
      function escKeyHandler(e) {
        if (e.key === 'Escape') { closeStudentBreakdownModal(); document.removeEventListener('keydown', escKeyHandler); }
      }
      document.addEventListener('keydown', escKeyHandler);
    }

    function closeStudentBreakdownModal() {
      const container = document.getElementById('student-breakdown-modal-container');
      if (container) container.innerHTML = '';
    }

    // =========================================================
    // EXPORTACIÓ FULL DE CÀLCUL EXCEL NOU (.XLSX) AMB SHEETJS
    // =========================================================
    function showToast(msg) {
      let toast = document.getElementById('global-app-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-app-toast';
        toast.className = 'fixed bottom-5 right-5 z-50 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-none';
        document.body.appendChild(toast);
      }
      toast.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>' + escapeHtmlAttr(msg) + '</span>';
      toast.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
      setTimeout(function() {
        toast.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
      }, 3500);
    }

    function exportClassroomGradesSpreadsheet() {
      try {
        // 1. Comprovació de seguretat: disponibilitat de SheetJS (XLSX)
        if (typeof XLSX === 'undefined') {
          alert(isEn() 
            ? 'The Excel export library (SheetJS) could not be loaded. Please check your internet connection and try again.' 
            : 'No s\'ha pogut carregar la llibreria d\'exportació a Excel (SheetJS). Comprova la connexió a internet i torna-ho a provar.');
          return;
        }

        // 2. Recuperació de dades des de l'estat global
        let groupName = '';
        let students = [];
        let sortedReadingIds = [];
        let readingsCatalogMap = {};
        let isAssignedMode = false;
        let assignedReadingIds = [];

        if (window.currentGradeBookExportData && window.currentGradeBookExportData.students && window.currentGradeBookExportData.students.length > 0) {
          groupName = window.currentGradeBookExportData.classroomName || '';
          students = window.currentGradeBookExportData.students || [];
          sortedReadingIds = window.currentGradeBookExportData.sortedReadingIds || [];
          readingsCatalogMap = window.currentGradeBookExportData.readingsCatalogMap || window.classroomTrackingCatalogMap || {};
          isAssignedMode = window.currentGradeBookExportData.tableViewMode === 'assigned';
          assignedReadingIds = window.currentGradeBookExportData.assignedReadingIds || [];
        } else if (window.currentTrackingExportData && window.currentTrackingExportData.visibleStudents && window.currentTrackingExportData.visibleStudents.length > 0) {
          const rawGrp = window.currentTrackingExportData.selectedGroup;
          groupName = rawGrp === 'all' 
            ? (isEn() ? 'All_Classrooms' : 'Totes_les_Aules') 
            : (rawGrp === 'unassigned' ? (isEn() ? 'Pending_Assignment' : 'Pendents_Assignar') : (rawGrp || 'Aula'));
          students = window.currentTrackingExportData.visibleStudents || [];
          readingsCatalogMap = window.currentTrackingExportData.readingsCatalogMap || window.classroomTrackingCatalogMap || {};

          const rIdsSet = new Set();
          students.forEach(function(s) {
            (s.completedReadings || []).forEach(function(rId) { rIdsSet.add(rId); });
          });
          sortedReadingIds = Array.from(rIdsSet).sort(function(a, b) {
            const rA = readingsCatalogMap[a] ? (readingsCatalogMap[a].readingNumber || 0) : 0;
            const rB = readingsCatalogMap[b] ? (readingsCatalogMap[b].readingNumber || 0) : 0;
            return rA - rB;
          });
        }

        if (!students || students.length === 0) {
          alert(isEn() ? 'There are no students to export in this view.' : 'No hi ha alumnes per exportar en aquesta vista.');
          return;
        }

        if (!sortedReadingIds || sortedReadingIds.length === 0) {
          alert(isEn() ? 'There are no readings to export in this view.' : 'No hi ha cap lectura per exportar en aquesta vista.');
          return;
        }

        // Ordenem els alumnes alfabèticament
        students = students.slice().sort(function(a, b) {
          return (a.displayName || '').localeCompare(b.displayName || '', 'ca');
        });

        const todayDisplay = new Date().toLocaleDateString(isEn() ? 'en-US' : 'ca-ES');

        // =========================================================
        // PESTANYA 1 — Notes (Avaluació o Globals)
        // =========================================================
        const sheet1Rows = [];

        // Fila 1: Títol del document
        const docTitle = isAssignedMode
          ? ((isEn() ? 'Classroom Assessment Grades' : "Notes d'Aula (Avaluació)") + ' — ' + (groupName || (isEn() ? 'Classroom' : 'Aula')) + ' (' + todayDisplay + ')')
          : ((isEn() ? 'Classroom Grades (All Readings)' : "Notes d'Aula (Totes les lectures)") + ' — ' + (groupName || (isEn() ? 'Classroom' : 'Aula')) + ' (' + todayDisplay + ')');
        sheet1Rows.push([docTitle]);

        // Fila 2: En blanc
        sheet1Rows.push([]);

        // Fila 3: Capçaleres
        const headersSheet1 = [
          isEn() ? 'Student' : 'Alumne',
          isEn() ? 'Classroom' : 'Grup-Classe',
          isAssignedMode ? (isEn() ? 'Assigned Completed' : 'Lectures Avaluades') : (isEn() ? 'Completed Readings' : 'Lectures Completades')
        ];

        if (isAssignedMode) {
          headersSheet1.push(isEn() ? 'Extra Readings (Free)' : 'Lectures Extra (Lliures)');
        }

        headersSheet1.push(isAssignedMode ? (isEn() ? 'Assessment Average (%)' : 'Mitjana Avaluació (%)') : (isEn() ? 'Overall Average (%)' : 'Mitjana Global (%)'));
        headersSheet1.push(isEn() ? 'Average Speed (WPM)' : 'Velocitat Mitjana (PPM)');

        sortedReadingIds.forEach(function(rId) {
          const catInfo = readingsCatalogMap[rId] || {};
          const code = catInfo.code ? catInfo.code + ' - ' : '';
          const title = catInfo.title || rId.slice(0, 15);
          headersSheet1.push(code + title + ' (%)');
        });
        sheet1Rows.push(headersSheet1);

        // Files de dades (una per alumne)
        const colPctsForAvg = {};
        sortedReadingIds.forEach(function(rId) { colPctsForAvg[rId] = []; });
        const allStudentAvgPcts = [];
        const allStudentAvgWpms = [];

        students.forEach(function(student) {
          const studentHistory = student.readingHistory || {};
          const studentScores = student.scores || {};
          const studentCompleted = Array.isArray(student.completedReadings) ? student.completedReadings : [];
          const studentPcts = [];
          const studentWpms = [];

          const completedCount = studentCompleted.length;
          const extraCount = studentCompleted.filter(function(rId) { return !assignedReadingIds.includes(rId); }).length;
          const assignedDoneCount = sortedReadingIds.filter(function(rId) { return studentCompleted.includes(rId); }).length;

          const readingCols = [];

          sortedReadingIds.forEach(function(rId) {
            const hEntry = studentHistory[rId];
            if (hEntry && hEntry.total > 0) {
              const pct = hEntry.percentage !== undefined ? hEntry.percentage : Math.round((hEntry.score / hEntry.total) * 100);
              const wpm = (typeof hEntry.wpm === 'number' && hEntry.wpm > 0) ? hEntry.wpm : null;

              studentPcts.push(pct);
              colPctsForAvg[rId].push(pct);
              if (wpm !== null) studentWpms.push(wpm);

              readingCols.push(pct);
            } else if (studentScores[rId] !== undefined) {
              const pts = Number(studentScores[rId]) || 0;
              readingCols.push(pts);
            } else {
              readingCols.push('-');
            }
          });

          const avgPctVal = studentPcts.length > 0 
            ? Math.round(studentPcts.reduce(function(a, b) { return a + b; }, 0) / studentPcts.length) 
            : '-';
          if (typeof avgPctVal === 'number') allStudentAvgPcts.push(avgPctVal);

          const avgWpmVal = studentWpms.length > 0 
            ? Math.round(studentWpms.reduce(function(a, b) { return a + b; }, 0) / studentWpms.length) 
            : '-';
          if (typeof avgWpmVal === 'number') allStudentAvgWpms.push(avgWpmVal);

          const rowData = [
            student.displayName || (isEn() ? 'Student' : 'Alumne/a'),
            student.classGroup || (isEn() ? 'Unassigned' : "Pendent d'assignar"),
            isAssignedMode ? (assignedDoneCount + '/' + sortedReadingIds.length) : completedCount
          ];

          if (isAssignedMode) {
            rowData.push(extraCount > 0 ? ('+' + extraCount) : 0);
          }

          rowData.push(avgPctVal);
          rowData.push(avgWpmVal);

          sheet1Rows.push(rowData.concat(readingCols));
        });

        // Fila final: Mitjana de la classe
        const grandAvgPct = allStudentAvgPcts.length > 0
          ? Math.round(allStudentAvgPcts.reduce(function(a, b) { return a + b; }, 0) / allStudentAvgPcts.length)
          : '-';
        const grandAvgWpm = allStudentAvgWpms.length > 0
          ? Math.round(allStudentAvgWpms.reduce(function(a, b) { return a + b; }, 0) / allStudentAvgWpms.length)
          : '-';

        const summaryRow = [
          isEn() ? 'Class Average' : "Mitjana de l'Aula",
          '',
          ''
        ];

        if (isAssignedMode) {
          summaryRow.push('');
        }

        summaryRow.push(grandAvgPct);
        summaryRow.push(grandAvgWpm);

        sortedReadingIds.forEach(function(rId) {
          const colPcts = colPctsForAvg[rId] || [];
          if (colPcts.length > 0) {
            const colAvg = Math.round(colPcts.reduce(function(a, b) { return a + b; }, 0) / colPcts.length);
            summaryRow.push(colAvg);
          } else {
            summaryRow.push('-');
          }
        });

        sheet1Rows.push(summaryRow);

        // =========================================================
        // PESTANYA 2 — Desglossament per Habilitats Cognitives
        // =========================================================
        const sheet2Rows = [];
        sheet2Rows.push([
          (isEn() ? 'Cognitive Skills Breakdown' : 'Desglossament per Habilitats Cognitives') + ' — ' + (groupName || 'Aula') + ' (' + todayDisplay + ')'
        ]);
        sheet2Rows.push([]);

        const headersSheet2 = [
          isEn() ? 'Student' : 'Alumne',
          isEn() ? 'Classroom' : 'Grup-Classe',
          isEn() ? 'Literal (%)' : 'Literal (%)',
          isEn() ? 'Inferential (%)' : 'Inferencial (%)',
          isEn() ? 'Figurative (%)' : 'Sentit Figurat (%)',
          isEn() ? 'Opinion (%)' : 'Opinió (%)',
          isEn() ? 'Creative (%)' : 'Creativa (%)',
          isEn() ? 'Average Speed (WPM)' : 'Velocitat Mitjana (PPM)'
        ];
        sheet2Rows.push(headersSheet2);

        const taxKeys = ['literal', 'inferential', 'figurative', 'opinion', 'creative'];
        const classTaxTotals = { literal: [], inferential: [], figurative: [], opinion: [], creative: [] };

        students.forEach(function(student) {
          const studentHistory = student.readingHistory || {};
          const studentWpms = [];
          const studentTaxAccum = {
            literal:     { correct: 0, total: 0 },
            inferential: { correct: 0, total: 0 },
            figurative:  { correct: 0, total: 0 },
            opinion:     { correct: 0, total: 0 },
            creative:    { correct: 0, total: 0 }
          };

          sortedReadingIds.forEach(function(rId) {
            const hEntry = studentHistory[rId];
            if (hEntry && hEntry.stats) {
              taxKeys.forEach(function(tKey) {
                const st = hEntry.stats[tKey];
                if (st && st.total > 0) {
                  studentTaxAccum[tKey].correct += (st.correct || 0);
                  studentTaxAccum[tKey].total += (st.total || 0);
                }
              });
            }
            if (hEntry && typeof hEntry.wpm === 'number' && hEntry.wpm > 0) {
              studentWpms.push(hEntry.wpm);
            }
          });

          const rowTax = [
            student.displayName || (isEn() ? 'Student' : 'Alumne/a'),
            student.classGroup || (isEn() ? 'Unassigned' : "Pendent d'assignar")
          ];

          taxKeys.forEach(function(tKey) {
            const accum = studentTaxAccum[tKey];
            if (accum.total > 0) {
              const pct = Math.round((accum.correct / accum.total) * 100);
              rowTax.push(pct);
              classTaxTotals[tKey].push(pct);
            } else {
              rowTax.push('-');
            }
          });

          const avgWpmVal = studentWpms.length > 0 
            ? Math.round(studentWpms.reduce(function(a, b) { return a + b; }, 0) / studentWpms.length) 
            : '-';
          rowTax.push(avgWpmVal);

          sheet2Rows.push(rowTax);
        });

        // Fila final de mitjanes per habilitat
        const summaryTaxRow = [
          isEn() ? 'Class Average' : "Mitjana de l'Aula",
          ''
        ];
        taxKeys.forEach(function(tKey) {
          const list = classTaxTotals[tKey];
          if (list.length > 0) {
            summaryTaxRow.push(Math.round(list.reduce(function(a, b) { return a + b; }, 0) / list.length));
          } else {
            summaryTaxRow.push('-');
          }
        });
        summaryTaxRow.push(grandAvgWpm);
        sheet2Rows.push(summaryTaxRow);

        // =========================================================
        // CREACIÓ I DESCARREGA DEL FITXER XLSX AMB SHEETJS
        // =========================================================
        const wb = XLSX.utils.book_new();

        const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
        const colWidths1 = headersSheet1.map(function(h, idx) {
          if (idx === 0) return { wch: 22 };
          if (idx === 1) return { wch: 16 };
          if (idx >= 2 && idx <= (isAssignedMode ? 5 : 4)) return { wch: 18 };
          return { wch: Math.max(14, Math.min(32, String(h).length + 2)) };
        });
        ws1['!cols'] = colWidths1;
        XLSX.utils.book_append_sheet(wb, ws1, isAssignedMode ? (isEn() ? 'Assessment Grades' : 'Notes Avaluacio') : (isEn() ? 'Global Grades' : 'Notes Globals'));

        const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
        const colWidths2 = [
          { wch: 22 },
          { wch: 16 },
          { wch: 14 },
          { wch: 16 },
          { wch: 18 },
          { wch: 14 },
          { wch: 14 },
          { wch: 18 }
        ];
        ws2['!cols'] = colWidths2;
        XLSX.utils.book_append_sheet(wb, ws2, isEn() ? 'Skills Breakdown' : 'Desglossament Habilitats');

        const cleanGroup = (groupName || 'Aula').replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');
        const fileName = (isAssignedMode ? 'Notes_Avaluacio_' : 'Notes_Aula_') + cleanGroup + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';

        XLSX.writeFile(wb, fileName);

        showToast(isEn() ? 'Excel file (.xlsx) downloaded successfully!' : 'Fitxer Excel (.xlsx) descarregat correctament!');

      } catch (err) {
        console.error('Error exportClassroomGradesSpreadsheet:', err);
        alert((isEn() ? 'Error exporting Excel spreadsheet: ' : 'Error exportant el full de càlcul Excel: ') + err.message);
      }
    }
function exportClassroomGradeBookCSV() {
      exportClassroomGradesSpreadsheet();
    }

