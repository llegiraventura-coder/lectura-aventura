// =========================================================================
// MISSATGERIA I SUGGERIMENTS DE MILLORA ENTRE DOCENTS (v0.40.3)
// =========================================================================
let currentFeedbackTab = 'received';

async function updateUnreadFeedbackBadge() {
  if (!currentUser || !db || !isUserAdminOrCreator()) return;
  const badge = document.getElementById('nav-feedback-unread-badge');
  if (!badge) return;
  try {
    const snap = await db.collection(FEEDBACK_COLLECTION)
      .where('recipientUid', '==', currentUser.uid)
      .get();
    let unreadCount = 0;
    snap.forEach(function(d) {
      const data = d.data() || {};
      if (!data.isRead && (data.status || 'pending') === 'pending') {
        unreadCount++;
      }
    });
    if (unreadCount > 0) {
      badge.innerText = unreadCount > 99 ? '99+' : String(unreadCount);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (e) {
    console.warn("No s'ha pogut comprovar el comptador de suggeriments:", e);
  }
}

async function openTeacherFeedbackModal(readingId, readingTitle, prefillRecipientUid, prefillRecipientName, prefillCategory, prefillSubject) {
  if (!currentUser) {
    renderLogin();
    return;
  }
  if (!isUserAdminOrCreator()) {
    alert("Aquesta funció és exclusiva per a perfils docents i col·laboradors.");
    return;
  }

  const container = document.getElementById('feedback-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white p-6 rounded-2xl max-w-lg w-full text-center space-y-3 shadow-xl">
        <i class="fa-solid fa-spinner fa-spin text-3xl text-indigo-600"></i>
        <p class="text-xs font-bold text-slate-600">Preparant el formulari de suggeriments...</p>
      </div>
    </div>
  `;

  let recipientUid = prefillRecipientUid || '';
  let recipientName = prefillRecipientName || '';
  let recipientEmail = '';
  let readingCode = '';
  let resolvedTitle = readingTitle || 'Lectura';

  try {
    if (readingId) {
      const rDoc = await withTimeout(db.collection(getReadingsCollection()).doc(readingId).get(), 6000, "dades de la lectura");
      if (rDoc.exists) {
        const rData = rDoc.data() || {};
        resolvedTitle = rData.title || resolvedTitle;
        if (rData.readingNumber) readingCode = formatReadingCode(rData.readingNumber);
        if (!recipientUid) recipientUid = rData.authorUid || '';
        if (!recipientName) recipientName = rData.authorDisplayName || 'Autor/a de la lectura';
        recipientEmail = rData.authorEmail || '';
      }
    }
  } catch (err) {
    console.warn("No s'han pogut obtenir dades de l'autor de la lectura:", err);
  }

  // Si no té authorUid (p. ex. lectura antiga sense autor assignat), enviem a l'administració
  if (!recipientUid) {
    try {
      const adminSnap = await db.collection("users").where("email", "==", ADMIN_SUPREMO_EMAIL).limit(1).get();
      if (!adminSnap.empty) {
        recipientUid = adminSnap.docs[0].id;
        recipientName = adminSnap.docs[0].data().displayName || "Coordinació Lectura Aventura";
      }
    } catch (e) {}
  }

  const isSelfMessage = recipientUid && recipientUid === currentUser.uid;
  const selectedCat = prefillCategory || 'millora_pedagogica';

  container.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 my-4">
        <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 inline-flex items-center gap-1">
              <i class="fa-solid fa-paper-plane"></i> Missatgeria entre Docents
            </span>
            <h3 class="text-lg font-black text-slate-800 mt-1">Enviar Proposta de Millora</h3>
          </div>
          <button type="button" onclick="closeTeacherFeedbackModal()" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
          <div class="flex items-center justify-between gap-2">
            <span class="text-slate-500 font-semibold">Lectura de referència:</span>
            ${readingCode ? '<span class="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">' + readingCode + '</span>' : ''}
          </div>
          <p class="font-black text-slate-800 text-sm">${escapeHtmlAttr(resolvedTitle)}</p>
          <p class="text-slate-600 pt-1 border-t border-slate-200/70 flex items-center gap-1.5">
            <i class="fa-solid fa-user-tie text-indigo-500"></i>
            <span>Destinatari/ària: <strong class="text-slate-900">${escapeHtmlAttr(recipientName || 'Autor/a de la lectura')}</strong></span>
          </p>
        </div>

        ${isSelfMessage ? `
          <div class="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs font-semibold flex items-start gap-2">
            <i class="fa-solid fa-circle-info text-amber-600 mt-0.5"></i>
            <span>Aquesta lectura és teva. Si envies el missatge, quedarà desat a la teva bústia com a nota de revisió personal.</span>
          </div>
        ` : ''}

        <form onsubmit="submitTeacherFeedback(event)" class="space-y-3.5">
          <input type="hidden" id="tf-reading-id" value="${escapeHtmlAttr(readingId || '')}">
          <input type="hidden" id="tf-reading-title" value="${escapeHtmlAttr(resolvedTitle)}">
          <input type="hidden" id="tf-reading-code" value="${escapeHtmlAttr(readingCode)}">
          <input type="hidden" id="tf-recipient-uid" value="${escapeHtmlAttr(recipientUid)}">
          <input type="hidden" id="tf-recipient-name" value="${escapeHtmlAttr(recipientName)}">
          <input type="hidden" id="tf-recipient-email" value="${escapeHtmlAttr(recipientEmail)}">

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tipus de proposta / suggeriment *</label>
            <select id="tf-category" class="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="millora_pedagogica" ${selectedCat === 'millora_pedagogica' ? 'selected' : ''}>💡 Proposta de millora pedagògica / preguntes</option>
              <option value="adaptacio_dua" ${selectedCat === 'adaptacio_dua' ? 'selected' : ''}>🌱 Petició o idea d'adaptació DUA</option>
              <option value="correccio_ortografica" ${selectedCat === 'correccio_ortografica' ? 'selected' : ''}>✏️ Revisió ortogràfica o d'errada puntual</option>
              <option value="vocabulari_glossari" ${selectedCat === 'vocabulari_glossari' ? 'selected' : ''}>📖 Suggeriment de vocabulari / glossari</option>
              <option value="felicitacio_resposta" ${selectedCat === 'felicitacio_resposta' ? 'selected' : ''}>💬 Comentari / Resposta entre docents</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Assumpte breu *</label>
            <input type="text" id="tf-subject" value="${escapeHtmlAttr(prefillSubject || '')}" required maxlength="120" placeholder="Ex: Proposta d'una pregunta inferencial o revisió d'opció B" class="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Missatge detallat per al/la docent *</label>
            <textarea id="tf-message" rows="4" required maxlength="1500" placeholder="Explica amb detall la teva proposta de millora, suggeriment o comentari..." class="w-full p-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onclick="closeTeacherFeedbackModal()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
              Cancel·lar
            </button>
            <button type="submit" id="tf-submit-btn" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow flex items-center gap-1.5 transition">
              <i class="fa-solid fa-paper-plane"></i>
              <span>Enviar Proposta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function closeTeacherFeedbackModal() {
  const container = document.getElementById('feedback-modal-container');
  if (container) container.innerHTML = '';
}

async function submitTeacherFeedback(e) {
  e.preventDefault();
  if (!currentUser || !db) return;

  const submitBtn = document.getElementById('tf-submit-btn');
  const originalHTML = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviant...';
  }

  const readingId = document.getElementById('tf-reading-id').value.trim();
  const readingTitle = document.getElementById('tf-reading-title').value.trim();
  const readingCode = document.getElementById('tf-reading-code').value.trim();
  const recipientUid = document.getElementById('tf-recipient-uid').value.trim();
  const recipientName = document.getElementById('tf-recipient-name').value.trim();
  const recipientEmail = document.getElementById('tf-recipient-email').value.trim();
  const category = document.getElementById('tf-category').value;
  const subject = document.getElementById('tf-subject').value.trim();
  const message = document.getElementById('tf-message').value.trim();

  if (!subject || !message) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
    }
    return;
  }

  const senderName = userDisplayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Docent');

  try {
    await withTimeout(
      db.collection(FEEDBACK_COLLECTION).add({
        readingId: readingId,
        readingTitle: readingTitle,
        readingCode: readingCode,
        senderUid: currentUser.uid,
        senderName: senderName,
        senderEmail: currentUser.email || '',
        senderSchool: userSchool || '',
        recipientUid: recipientUid,
        recipientName: recipientName,
        recipientEmail: recipientEmail,
        category: category,
        subject: subject,
        message: message,
        status: 'pending',
        isRead: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAtIso: new Date().toISOString()
      }),
      8000,
      "enviament del suggeriment"
    );

    closeTeacherFeedbackModal();
    updateUnreadFeedbackBadge();
    alert("✅ Proposta enviada correctament! L'autor/a de la lectura la rebrà a la seva bústia de «Suggeriments».");
  } catch (err) {
    console.error("Error enviant el suggeriment docent:", err);
    alert("No s'ha pogut enviar el missatge: " + err.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
    }
  }
}

function getFeedbackCategoryBadge(cat) {
  const map = {
    millora_pedagogica: { label: isEn() ? "💡 Pedagogical Improvement" : "💡 Millora Pedagògica", cls: "bg-indigo-100 text-indigo-800 border-indigo-200" },
    adaptacio_dua: { label: isEn() ? "🌱 UDL / DUA Adaptation" : "🌱 Adaptació DUA", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    correccio_ortografica: { label: isEn() ? "✏️ Review / Typo" : "✏️ Revisió / Errada", cls: "bg-amber-100 text-amber-900 border-amber-300" },
    vocabulari_glossari: { label: isEn() ? "📖 Vocabulary / Glossary" : "📖 Vocabulari / Glossari", cls: "bg-teal-100 text-teal-800 border-teal-200" },
    felicitacio_resposta: { label: isEn() ? "💬 Comment / Reply" : "💬 Comentari / Resposta", cls: "bg-purple-100 text-purple-800 border-purple-200" }
  };
  return map[cat] || map.millora_pedagogica;
}

function getFeedbackStatusBadge(status) {
  if (status === 'applied') {
    return '<span class="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1"><i class="fa-solid fa-circle-check"></i> ' + (isEn() ? 'Improvement Applied' : 'Millora Aplicada') + '</span>';
  }
  if (status === 'reviewed') {
    return '<span class="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 inline-flex items-center gap-1"><i class="fa-solid fa-eye"></i> ' + (isEn() ? 'Reviewed' : 'Revisat') + '</span>';
  }
  return '<span class="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1"><i class="fa-solid fa-clock"></i> ' + (isEn() ? 'Pending' : 'Pendent') + '</span>';
}

async function updateTeacherFeedbackStatus(feedbackId, newStatus) {
  if (!currentUser || !db || !feedbackId) return;
  try {
    await db.collection(FEEDBACK_COLLECTION).doc(feedbackId).update({
      status: newStatus,
      isRead: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    updateUnreadFeedbackBadge();
    renderTeacherFeedbackInbox();
  } catch (err) {
    alert("Error en actualitzar l'estat del suggeriment: " + err.message);
  }
}

async function deleteTeacherFeedback(feedbackId) {
  if (!currentUser || !db || !feedbackId) return;
  if (!confirm(isEn() ? "Do you want to delete this inbox message?" : "Vols eliminar aquest missatge de la bústia?")) return;
  try {
    await db.collection(FEEDBACK_COLLECTION).doc(feedbackId).delete();
    updateUnreadFeedbackBadge();
    renderTeacherFeedbackInbox();
  } catch (err) {
    alert((isEn() ? "Error deleting message: " : "Error en eliminar el missatge: ") + err.message);
  }
}

function replyToTeacherFeedback(readingId, readingTitle, senderUid, senderName, originalSubject) {
  const replySubject = originalSubject && !originalSubject.startsWith('Re:')
    ? ('Re: ' + originalSubject)
    : (originalSubject || (isEn() ? 'Reply to your suggestion' : 'Resposta al teu suggeriment'));
  openTeacherFeedbackModal(
    readingId,
    readingTitle,
    senderUid,
    senderName,
    'felicitacio_resposta',
    replySubject
  );
}

async function renderTeacherFeedbackInbox() {
  if (!currentUser) {
    renderLogin();
    return;
  }
  if (!isUserAdminOrCreator()) {
    alert(isEn() ? "Access restricted to Teachers and Collaborators." : "Accés restringit a Docents i Col·laboradors.");
    renderCatalog();
    return;
  }

  stopSpeechSynthesis();
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? 'Loading teacher suggestions inbox...' : 'Carregant la bústia de suggeriments docents...') + '</p></div>';

  try {
    const [receivedSnap, sentSnap] = await Promise.all([
      withTimeout(db.collection(FEEDBACK_COLLECTION).where('recipientUid', '==', currentUser.uid).get(), 7000, "missatges rebuts"),
      withTimeout(db.collection(FEEDBACK_COLLECTION).where('senderUid', '==', currentUser.uid).get(), 7000, "missatges enviats")
    ]);

    const receivedList = [];
    const unreadUpdates = [];

    receivedSnap.forEach(function(doc) {
      const d = doc.data() || {};
      receivedList.push(Object.assign({ id: doc.id }, d));
      if (!d.isRead) {
        unreadUpdates.push(db.collection(FEEDBACK_COLLECTION).doc(doc.id).update({ isRead: true }).catch(function() {}));
      }
    });

    if (unreadUpdates.length > 0) {
      Promise.all(unreadUpdates).then(function() { updateUnreadFeedbackBadge(); });
    }

    const sentList = [];
    sentSnap.forEach(function(doc) {
      sentList.push(Object.assign({ id: doc.id }, doc.data() || {}));
    });

    const sortByDateDesc = function(a, b) {
      const tA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : (a.createdAtIso ? Date.parse(a.createdAtIso) : 0);
      const tB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : (b.createdAtIso ? Date.parse(b.createdAtIso) : 0);
      return tB - tA;
    };

    receivedList.sort(sortByDateDesc);
    sentList.sort(sortByDateDesc);

    const activeList = currentFeedbackTab === 'sent' ? sentList : receivedList;

    let cardsHTML = '';
    if (activeList.length === 0) {
      cardsHTML = `
        <div class="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <i class="fa-solid fa-inbox text-4xl text-slate-300"></i>
          <p class="text-sm font-bold text-slate-700">
            ${currentFeedbackTab === 'sent'
              ? (isEn() ? 'You have not sent any improvement proposals to other teachers yet.' : 'Encara no has enviat cap proposta de millora a altres docents.')
              : (isEn() ? 'You have not received any improvement proposals for your readings yet.' : 'Encara no has rebut cap proposta de millora a les teves lectures.')}
          </p>
          <p class="text-xs text-slate-500 max-w-md mx-auto">
            ${isEn() ? 'When you open any reading from the catalog, you will find the <strong>«Send Suggestion»</strong> button at the bottom of the page to collaborate with other teachers.' : 'Quan obris qualsevol lectura del catàleg, trobaràs el botó <strong>«Enviar Suggeriment»</strong> al peu de la pàgina per col·laborar amb altres docents.'}
          </p>
        </div>
      `;
    } else {
      activeList.forEach(function(item) {
        const catBadge = getFeedbackCategoryBadge(item.category);
        const statusBadge = getFeedbackStatusBadge(item.status || 'pending');
        const isReceived = currentFeedbackTab === 'received';
        const dateStr = item.createdAt && item.createdAt.toDate
          ? item.createdAt.toDate().toLocaleDateString(isEn() ? 'en-GB' : 'ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : (item.createdAtIso ? new Date(item.createdAtIso).toLocaleDateString(isEn() ? 'en-GB' : 'ca-ES') : '');

        const counterpartName = isReceived
          ? (item.senderName || (isEn() ? 'Teacher' : 'Docent')) + (item.senderSchool ? ' (' + item.senderSchool + ')' : '')
          : (item.recipientName || (isEn() ? 'Reading author' : 'Autor/a de la lectura'));

        const encodedTitle = encodeURIComponent(item.readingTitle || (isEn() ? 'Reading' : 'Lectura'));
        const encodedSender = encodeURIComponent(item.senderName || (isEn() ? 'Teacher' : 'Docent'));
        const encodedSubject = encodeURIComponent(item.subject || '');

        cardsHTML += `
          <div class="bg-white p-5 rounded-2xl border ${(isReceived && (item.status || 'pending') === 'pending') ? 'border-indigo-300 shadow-sm' : 'border-slate-200 shadow-2xs'} space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border ${catBadge.cls}">${catBadge.label}</span>
                ${statusBadge}
                ${item.readingCode ? '<span class="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">' + escapeHtmlAttr(item.readingCode) + '</span>' : ''}
              </div>
              <span class="text-[11px] font-mono text-slate-400">${dateStr}</span>
            </div>

            <div class="space-y-1">
              <h3 class="text-base font-black text-slate-900">${escapeHtmlAttr(item.subject || (isEn() ? 'Improvement proposal' : 'Proposta de millora'))}</h3>
              <p class="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  <i class="fa-solid fa-book-open text-indigo-500 mr-1"></i>
                  ${isEn() ? 'Reading:' : 'Lectura:'} <strong class="text-slate-800">${escapeHtmlAttr(item.readingTitle || (isEn() ? 'Reading' : 'Lectura'))}</strong>
                </span>
                <span>
                  <i class="fa-solid ${isReceived ? 'fa-user-pen text-emerald-600' : 'fa-user-check text-indigo-500'} mr-1"></i>
                  ${isReceived ? (isEn() ? 'Sent by:' : 'Enviat per:') : (isEn() ? 'To:' : 'Per a:')} <strong class="text-slate-800">${escapeHtmlAttr(counterpartName)}</strong>
                </span>
              </p>
            </div>

            <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              ${escapeHtmlAttr(item.message || '')}
            </div>

            <div class="pt-2 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2 flex-wrap">
                ${item.readingId ? `
                  <button type="button" onclick="renderReader('${item.readingId}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold px-3 py-1.5 rounded-xl text-xs transition inline-flex items-center gap-1.5">
                    <i class="fa-solid fa-book-open"></i> ${isEn() ? 'Open reading' : 'Obrir lectura'}
                  </button>
                ` : ''}

                ${(isReceived && item.readingId) ? `
                  <button type="button" onclick="renderEditor('${item.readingId}')" class="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold px-3 py-1.5 rounded-xl text-xs transition inline-flex items-center gap-1.5">
                    <i class="fa-solid fa-pen-to-square text-amber-600"></i> ${isEn() ? 'Edit reading' : 'Editar lectura'}
                  </button>
                ` : ''}

                ${(isReceived && item.senderUid && item.senderUid !== currentUser.uid) ? `
                  <button type="button" onclick="replyToTeacherFeedback('${item.readingId || ''}', decodeURIComponent('${encodedTitle}'), '${item.senderUid}', decodeURIComponent('${encodedSender}'), decodeURIComponent('${encodedSubject}'))" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-2xs">
                    <i class="fa-solid fa-reply"></i> ${isEn() ? 'Reply to teacher' : 'Respondre al docent'}
                  </button>
                ` : ''}
              </div>

              <div class="flex items-center gap-1.5 flex-wrap">
                ${isReceived ? `
                  <button type="button" onclick="updateTeacherFeedbackStatus('${item.id}', 'reviewed')" class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition">
                    <i class="fa-solid fa-eye mr-1"></i> ${isEn() ? 'Reviewed' : 'Revisat'}
                  </button>
                  <button type="button" onclick="updateTeacherFeedbackStatus('${item.id}', 'applied')" class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition">
                    <i class="fa-solid fa-check mr-1"></i> ${isEn() ? 'Applied' : 'Aplicat'}
                  </button>
                ` : ''}
                <button type="button" onclick="deleteTeacherFeedback('${item.id}')" title="${isEn() ? 'Delete message' : 'Eliminar missatge'}" class="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      });
    }

    const pendingCount = receivedList.filter(function(m) { return (m.status || 'pending') === 'pending'; }).length;

    app.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <button onclick="resetFiltersAndRenderCatalog()" class="text-slate-500 hover:text-slate-800 text-sm font-medium inline-flex items-center">
            <i class="fa-solid fa-arrow-left mr-1"></i> ${isEn() ? 'Back to catalog' : 'Tornar al catàleg'}
          </button>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h1 class="text-2xl font-black text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-comments text-indigo-600"></i> ${isEn() ? 'Teacher Suggestions Inbox' : 'Bústia de Suggeriments entre Docents'}
              </h1>
              <p class="text-xs text-slate-500 mt-0.5">
                ${isEn() ? 'Pedagogical collaboration: receive improvement proposals for your readings or view suggestions you have sent.' : 'Col·laboració pedagògica: rep propostes de millora per a les teves lectures o consulta els suggeriments que has enviat.'}
              </p>
            </div>

            <div class="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold self-start sm:self-auto">
              <button onclick="currentFeedbackTab='received'; renderTeacherFeedbackInbox()" class="${currentFeedbackTab === 'received' ? 'bg-white text-indigo-700 shadow' : 'text-slate-600 hover:text-slate-900'} px-3.5 py-2 rounded-lg transition flex items-center gap-1.5">
                <i class="fa-solid fa-inbox"></i>
                <span>${isEn() ? 'Received' : 'Rebuts'} (${receivedList.length})</span>
                ${pendingCount > 0 ? '<span class="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">' + pendingCount + '</span>' : ''}
              </button>
              <button onclick="currentFeedbackTab='sent'; renderTeacherFeedbackInbox()" class="${currentFeedbackTab === 'sent' ? 'bg-white text-indigo-700 shadow' : 'text-slate-600 hover:text-slate-900'} px-3.5 py-2 rounded-lg transition flex items-center gap-1.5">
                <i class="fa-solid fa-paper-plane"></i>
                <span>${isEn() ? 'Sent' : 'Enviats'} (${sentList.length})</span>
              </button>
            </div>
          </div>

          <div class="space-y-4">
            ${cardsHTML}
          </div>
        </div>
      </div>
    `;
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (err) {
    console.error("Error carregant la bústia docent:", err);
    app.innerHTML = '<div class="p-4 bg-red-100 text-red-700 rounded-xl max-w-2xl mx-auto">' + (isEn() ? 'Error loading teacher suggestions: ' : 'Error en carregar els suggeriments docents: ') + err.message + '</div>';
  }
}

async function renderStudentLeaderboard() {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? 'Loading leaderboard...' : 'Carregant la classificació...') + '</p></div>';

  try {
    const usersSnap = await db.collection("users").get();
    let allUsers = [];
    usersSnap.forEach(function(d) {
      const u = d.data();
      if (u.role === 'alumne' || u.role === 'adult' || !u.role) {
        allUsers.push(Object.assign({ id: d.id }, u));
      }
    });

    let filteredUsers = allUsers.slice();
    if (currentLeaderboardTab === 'group' && currentUser) {
      filteredUsers = allUsers.filter(function(u) {
        if (u.id === currentUser.uid) return true;
        if (!userTeacherUid || u.teacherUid !== userTeacherUid) return false;
        if (userClassGroup) return (u.classGroup || '') === userClassGroup;
        return true;
      });
    } else if (currentLeaderboardTab === 'school' && userSchool) {
      filteredUsers = allUsers.filter(function(u) { return u.school && u.school.toLowerCase() === userSchool.toLowerCase(); });
    }

    filteredUsers.sort(function(a, b) { return (b.points || 0) - (a.points || 0); });

    let rowsHTML = '';
    filteredUsers.forEach(function(u, idx) {
      const pts = u.points || 0;
      const rank = getRankDetails(pts);
      const isMe = currentUser && u.id === currentUser.uid;
      let medal = '<span class="font-bold text-slate-500">' + (idx + 1) + '</span>';
      if (idx === 0) medal = '🥇';
      if (idx === 1) medal = '🥈';
      if (idx === 2) medal = '🥉';

      rowsHTML += '<tr class="' + (isMe ? 'bg-amber-50 font-bold' : 'hover:bg-slate-50') + ' border-b border-slate-100"><td class="p-3 text-center text-sm">' + medal + '</td><td class="p-3 text-sm">' + escapeHtmlAttr(u.displayName || (isEn() ? 'Reader' : 'Lector/a')) + '</td><td class="p-3 text-sm text-slate-500 hidden sm:table-cell">' + escapeHtmlAttr(u.school || '') + '</td><td class="p-3 text-xs text-amber-800 font-bold">' + getLocalizedRankName(rank.name) + '</td><td class="p-3 text-sm text-right font-black text-amber-600">' + pts + ' PTS</td></tr>';
    });

    app.innerHTML = `
      <div class="max-w-4xl mx-auto space-y-6">
        <button onclick="resetFiltersAndRenderCatalog()" class="text-slate-500 hover:text-slate-800 text-sm font-medium inline-flex items-center"><i class="fa-solid fa-arrow-left mr-1"></i> ${isEn() ? 'Back to catalog' : 'Tornar al catàleg'}</button>
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h1 class="text-2xl font-black text-slate-800 flex items-center gap-2"><i class="fa-solid fa-trophy text-amber-500"></i> ${isEn() ? 'Reader Leaderboard' : 'Classificació de Lectors'}</h1>
            <div class="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
              <button onclick="currentLeaderboardTab='group'; renderStudentLeaderboard()" class="${currentLeaderboardTab === 'group' ? 'bg-white text-indigo-700 shadow' : 'text-slate-600'} px-3 py-1.5 rounded-lg">${isEn() ? 'My Group' : 'El meu Grup'}</button>
              <button onclick="currentLeaderboardTab='school'; renderStudentLeaderboard()" class="${currentLeaderboardTab === 'school' ? 'bg-white text-indigo-700 shadow' : 'text-slate-600'} px-3 py-1.5 rounded-lg">${isEn() ? 'My School' : 'El meu Centre'}</button>
              <button onclick="currentLeaderboardTab='global'; renderStudentLeaderboard()" class="${currentLeaderboardTab === 'global' ? 'bg-white text-indigo-700 shadow' : 'text-slate-600'} px-3 py-1.5 rounded-lg">${isEn() ? 'Global' : 'Global'}</button>
            </div>
          </div>
          <div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200"><th class="p-3 text-center">${isEn() ? 'Position' : 'Posició'}</th><th class="p-3">${isEn() ? 'Name' : 'Nom'}</th><th class="p-3 hidden sm:table-cell">${isEn() ? 'School' : 'Centre'}</th><th class="p-3">${isEn() ? 'Rank' : 'Rang'}</th><th class="p-3 text-right">${isEn() ? 'Points' : 'Punts'}</th></tr></thead><tbody>${rowsHTML}</tbody></table></div>
        </div>
      </div>
    `;
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (err) {
    console.error(err);
  }
}

async function renderTeacherFoldersList() {
  if (!currentUser) return;
  const app = document.getElementById('app');
  app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? 'Loading Folders and Learning Situations...' : 'Carregant Carpetes i SA...') + '</p></div>';

  try {
    const snap = await db.collection(getFoldersCollection()).where('authorUid', '==', currentUser.uid).get();
    let foldersHTML = '';
    snap.forEach(function(doc) {
      const f = doc.data();
      const fId = doc.id;
      const count = (f.readings || []).length;
      foldersHTML += '<div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"><div><div class="flex items-center justify-between mb-2"><span class="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md">' + escapeHtmlAttr(f.level || (isEn() ? 'Primary' : 'Primària')) + '</span><span class="text-xs font-semibold text-slate-400">' + count + ' ' + (isEn() ? 'readings' : 'lectures') + '</span></div><h3 class="font-bold text-slate-800 text-lg mb-1">' + escapeHtmlAttr(f.title) + '</h3><p class="text-xs text-slate-500 line-clamp-2">' + escapeHtmlAttr(f.description || '') + '</p></div><div class="pt-3 border-t border-slate-100 flex items-center justify-between"><button onclick="renderFolderView(\'' + fId + '\')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl">' + (isEn() ? 'View Folder' : 'Veure Carpeta') + '</button><button onclick="shareFolderLink(\'' + fId + '\')" class="text-slate-400 hover:text-indigo-600 text-xs"><i class="fa-solid fa-share-nodes"></i> ' + (isEn() ? 'Share' : 'Compartir') + '</button></div></div>';
    });

    app.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <button onclick="resetFiltersAndRenderCatalog()" class="text-slate-500 hover:text-slate-800 text-sm font-medium inline-flex items-center"><i class="fa-solid fa-arrow-left mr-1"></i> ${isEn() ? 'Back to catalog' : 'Tornar al catàleg'}</button>
          <button onclick="createNewFolderPrompt()" class="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-xs md:text-sm shadow"><i class="fa-solid fa-folder-plus mr-1"></i> ${isEn() ? 'New Folder / Learning Situation' : 'Nova Carpeta / SA'}</button>
        </div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2"><i class="fa-solid fa-folder-closed text-amber-500"></i> ${isEn() ? 'My Folders / Learning Situations' : "Les meves Carpetes / Situacions d'Aprenentatge"}</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${foldersHTML || '<p class="col-span-full text-slate-500 text-sm italic">' + (isEn() ? 'You have not created any folders yet.' : 'Encara no has creat cap carpeta.') + '</p>'}</div>
      </div>
    `;
  } catch (err) {
    console.error(err);
  }
}

async function createNewFolderPrompt() {
  const title = prompt(isEn() ? "Title of the new Folder / Learning Situation:" : "Títol de la nova Carpeta / SA:");
  if (!title) return;
  const description = prompt(isEn() ? "Short description (optional):" : "Descripció curta (opcional):") || "";
  try {
    await db.collection(getFoldersCollection()).add({
      title: title,
      description: description,
      authorUid: currentUser.uid,
      authorDisplayName: userDisplayName || currentUser.email.split('@')[0],
      readings: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    renderTeacherFoldersList();
  } catch (err) {
    alert((isEn() ? "Error creating folder: " : "Error en crear la carpeta: ") + err.message);
  }
}

async function renderFolderView(folderId) {
  const app = document.getElementById('app');
  app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? 'Loading folder...' : 'Carregant la carpeta...') + '</p></div>';

  try {
    const fDoc = await db.collection(getFoldersCollection()).doc(folderId).get();
    if (!fDoc.exists) { renderCatalog(); return; }
    const fData = fDoc.data();
    const rIds = fData.readings || [];
    let cardsHTML = '';

    for (const rId of rIds) {
      const rDoc = await db.collection(getReadingsCollection()).doc(rId).get();
      if (rDoc.exists) {
        const r = rDoc.data();
        const isDone = userCompletedReadings.includes(rId);
        cardsHTML += '<div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"><div><h3 class="font-bold text-slate-800 text-lg mb-1">' + escapeHtmlAttr(r.title) + '</h3><p class="text-xs text-indigo-600 font-semibold mb-3">' + escapeHtmlAttr(r.level || '') + '</p></div><div class="pt-3 border-t border-slate-100 flex items-center justify-between"><span class="text-xs font-bold ' + (isDone ? 'text-emerald-600' : 'text-amber-600') + '">' + (isDone ? (isEn() ? '✅ Completed' : '✅ Completada') : (isEn() ? '⏳ Pending' : '⏳ Pendent')) + '</span><button onclick="renderReader(\'' + rId + '\')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl">' + (isEn() ? 'Read' : 'Llegir') + '</button></div></div>';
      }
    }

    app.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="flex items-center justify-between">
          <button onclick="resetFiltersAndRenderCatalog()" class="text-slate-500 hover:text-slate-800 text-sm font-medium inline-flex items-center"><i class="fa-solid fa-arrow-left mr-1"></i> ${isEn() ? 'General Catalog' : 'Catàleg General'}</button>
          <button onclick="shareFolderLink('${folderId}')" class="bg-indigo-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow"><i class="fa-solid fa-share-nodes mr-1"></i> ${isEn() ? 'Share Folder' : 'Compartir Carpeta'}</button>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span class="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">📁 ${isEn() ? 'Folder / Learning Situation' : "Carpeta / Situació d'Aprenentatge"}</span>
          <h1 class="text-2xl font-bold text-slate-800">${escapeHtmlAttr(fData.title)}</h1>
          <p class="text-sm text-slate-600">${escapeHtmlAttr(fData.description || '')}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">${cardsHTML || '<p class="col-span-full text-slate-500 italic text-sm">' + (isEn() ? 'This folder does not have any readings assigned yet.' : 'Aquesta carpeta encara no té lectures assignades.') + '</p>'}</div>
      </div>
    `;
  } catch (err) {
    console.error(err);
  }
}

async function openAddToFolderModal(readingId) {
  if (!currentUser) return;
  const modal = document.getElementById('folder-modal-container');
  const snap = await db.collection(getFoldersCollection()).where('authorUid', '==', currentUser.uid).get();
  let listHTML = '';
  snap.forEach(function(doc) {
    const f = doc.data();
    const isAlready = (f.readings || []).includes(readingId);
    listHTML += '<button onclick="toggleReadingInFolder(\'' + doc.id + '\', \'' + readingId + '\')" class="w-full p-3 text-left rounded-xl border border-slate-200 hover:bg-indigo-50 flex items-center justify-between text-xs font-bold"><span>📁 ' + escapeHtmlAttr(f.title) + '</span><span class="' + (isAlready ? 'text-emerald-600' : 'text-slate-400') + '">' + (isAlready ? (isEn() ? '✅ Added' : '✅ Afegida') : (isEn() ? '+ Add' : '+ Afegir')) + '</span></button>';
  });

  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl">
        <div class="flex justify-between items-center"><h3 class="text-lg font-bold text-slate-800">${isEn() ? 'Save to Folder / Learning Situation' : 'Desar a Carpeta / SA'}</h3><button onclick="document.getElementById('folder-modal-container').innerHTML=''" class="text-slate-400"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="space-y-2">${listHTML || '<p class="text-xs text-slate-500">' + (isEn() ? 'You have no folders created yet.' : 'No tens cap carpeta creada encara.') + '</p>'}</div>
      </div>
    </div>
  `;
}

async function toggleReadingInFolder(folderId, readingId) {
  const fRef = db.collection(getFoldersCollection()).doc(folderId);
  const doc = await fRef.get();
  if (!doc.exists) return;
  let readings = doc.data().readings || [];
  if (readings.includes(readingId)) readings = readings.filter(function(id) { return id !== readingId; });
  else readings.push(readingId);
  await fRef.update({ readings: readings });
  openAddToFolderModal(readingId);
}

function shareFolderLink(folderId) {
  const baseUrl = window.location.href.split('?')[0];
  const url = baseUrl + '?carpeta=' + folderId + (isEn() ? '&lang=en' : '');
  navigator.clipboard.writeText(url).then(function() { alert(isEn() ? "📋 Folder link copied!" : "📋 Enllaç de la Carpeta copiat!"); });
}

function renderEditProfileDataModal() {
  const modal = document.getElementById('profile-modal-container');
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl">
        <h3 class="text-lg font-bold text-slate-800">${isEn() ? 'Complete or edit your profile details' : 'Completa o edita les teves dades'}</h3>
        <form onsubmit="saveProfileData(event)" class="space-y-3">
          <div><label class="block text-xs font-bold text-slate-700">${isEn() ? 'Name / Nickname' : 'Nom / Àlies'}</label><input type="text" id="prof-name" value="${escapeHtmlAttr(userDisplayName)}" required class="w-full p-2 border border-slate-300 rounded-xl text-sm"></div>
          <div><label class="block text-xs font-bold text-slate-700">${isEn() ? 'School (optional if adult)' : 'Centre Educatiu (opcional si ets adult)'}</label><input type="text" id="prof-school" value="${escapeHtmlAttr(userSchool)}" class="w-full p-2 border border-slate-300 rounded-xl text-sm"></div>
          <div class="flex justify-end space-x-2 pt-2">
            <button type="button" onclick="document.getElementById('profile-modal-container').innerHTML=''" class="px-4 py-2 text-xs text-slate-600">${isEn() ? 'Close' : 'Tancar'}</button>
            <button type="submit" class="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl">${isEn() ? 'Save' : 'Desar'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function saveProfileData(e) {
  e.preventDefault();
  userDisplayName = document.getElementById('prof-name').value.trim();
  userSchool = document.getElementById('prof-school').value.trim();
  await db.collection("users").doc(currentUser.uid).set({ displayName: userDisplayName, school: userSchool }, { merge: true });
  document.getElementById('profile-modal-container').innerHTML = '';
  renderNav();
  renderCatalog();
}

function applyCatalogFilters() {
  const s = document.getElementById('search-input');
  const a = document.getElementById('author-search-input');
  const t = document.getElementById('type-select');
  const l = document.getElementById('level-select');
  const c = document.getElementById('category-select');
  const d = document.getElementById('duration-select');
  const st = document.getElementById('status-select');

  if (s) filterSearch = s.value.toLowerCase();
  if (a) filterBookAuthor = a.value.toLowerCase();
  if (t) filterType = t.value;
  if (l) filterLevel = l.value;
  if (c) filterCategory = c.value;
  if (d) filterDuration = d.value;
  if (st) filterStatus = st.value;

  renderCatalog();
}

function resetFiltersAndRenderCatalog() {
  filterSearch = ""; filterBookAuthor = ""; filterType = "all"; filterLevel = "all";
  filterCategory = "all"; filterStatus = "all"; filterDuration = "all"; filterMyLectures = false;
  renderNav(); renderCatalog();
}

function toggleMyLectures() { filterMyLectures = !filterMyLectures; renderNav(); renderCatalog(); }

function shareReadingLink(docId, readingCode) {
  const baseUrl = window.location.href.split('?')[0];
  const url = baseUrl + '?lectura=' + docId + (isEn() ? '&lang=en' : '');
  navigator.clipboard.writeText(url).then(function() { alert(isEn() ? ("📋 Link copied (" + readingCode + ")!") : ("📋 Enllaç copiat (" + readingCode + ")!")); });
}

function shareToGoogleClassroom(docId, title) {
  const baseUrl = window.location.href.split('?')[0];
  const readingUrl = baseUrl + '?lectura=' + docId + (isEn() ? '&lang=en' : '');
  const classroomShareUrl = 'https://classroom.google.com/share?url=' + encodeURIComponent(readingUrl) + '&title=' + encodeURIComponent('Lectura Aventura: ' + title);
  window.open(classroomShareUrl, '_blank', 'width=650,height=550,noopener,noreferrer');
}

function copyTeacherUidCode() {
  if (!currentUser) return;
  const uid = currentUser.uid;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(uid).then(function() {
      alert(isEn() ? ("📋 Teacher Code copied to clipboard:\n" + uid + "\n\nShare this code with your students so they can enter it in their profile!") : ("📋 Codi Docent copiat al porta-retalls:\n" + uid + "\n\nComparteix aquest codi amb els teus alumnes perquè el posin al seu perfil!"));
    }).catch(function() {
      prompt(isEn() ? "Copy your Teacher Code:" : "Copia el teu Codi Docent:", uid);
    });
  } else {
    prompt(isEn() ? "Copy your Teacher Code:" : "Copia el teu Codi Docent:", uid);
  }
}

async function createTeacherClassGroup() {
  if (!currentUser) return;
  const rawName = prompt(isEn() ? "Name of the new Classroom, Level or Group (e.g., 4th Grade A, 5th Grade B, Support Group):" : "Nom de la nova Aula, Nivell o Classe (ex: 4t A, 5è B, Grup Reforç):");
  if (!rawName) return;
  const groupName = rawName.trim();
  if (!groupName) return;

  if (!userTeacherGroups.includes(groupName)) {
    userTeacherGroups.push(groupName);
    try {
      await db.collection("users").doc(currentUser.uid).set({
        teacherGroups: userTeacherGroups
      }, { merge: true });
    } catch (err) {
      alert((isEn() ? "Error creating classroom: " : "Error en crear l'aula: ") + err.message);
      return;
    }
  }
  selectedClassroomFilter = groupName;
  renderStudentTrackingPanel();
}

async function renameTeacherClassGroup(oldName) {
  if (!currentUser || !oldName) return;
  const rawNew = prompt(isEn() ? ("New name for classroom «" + oldName + "»:") : ("Nou nom per a l'aula «" + oldName + "»:"), oldName);
  if (!rawNew) return;
  const newName = rawNew.trim();
  if (!newName || newName === oldName) return;

  try {
    // Actualitzem la llista d'aules del docent
    userTeacherGroups = userTeacherGroups.map(function(g) { return g === oldName ? newName : g; });
    if (!userTeacherGroups.includes(newName)) userTeacherGroups.push(newName);

    await db.collection("users").doc(currentUser.uid).set({
      teacherGroups: userTeacherGroups
    }, { merge: true });

    // Actualitzem tots els alumnes vinculats que pertanyien a l'aula antiga
    const snap = await db.collection("users").where('teacherUid', '==', currentUser.uid).get();
    const updates = [];
    snap.forEach(function(doc) {
      const u = doc.data();
      if ((u.classGroup || '') === oldName) {
        updates.push(db.collection("users").doc(doc.id).update({ classGroup: newName }));
      }
    });
    await Promise.all(updates);

    if (selectedClassroomFilter === oldName) selectedClassroomFilter = newName;
    renderStudentTrackingPanel();
  } catch (err) {
    alert((isEn() ? "Error renaming classroom: " : "Error en canviar el nom de l'aula: ") + err.message);
  }
}

async function deleteTeacherClassGroup(groupName) {
  if (!currentUser || !groupName) return;
  if (!confirm(isEn() ? ("Do you want to delete classroom «" + groupName + "»?\nStudents in this classroom will NOT be deleted: they will be moved to «Pending assignment».") : ("Vols eliminar l'aula «" + groupName + "»?\nEls alumnes d'aquesta aula NO s'esborraran: passaran a «Pendents d'assignar»."))) return;

  try {
    userTeacherGroups = userTeacherGroups.filter(function(g) { return g !== groupName; });
    await db.collection("users").doc(currentUser.uid).set({
      teacherGroups: userTeacherGroups
    }, { merge: true });

    const snap = await db.collection("users").where('teacherUid', '==', currentUser.uid).get();
    const updates = [];
    snap.forEach(function(doc) {
      const u = doc.data();
      if ((u.classGroup || '') === groupName) {
        updates.push(db.collection("users").doc(doc.id).update({ classGroup: '' }));
      }
    });
    await Promise.all(updates);

    if (selectedClassroomFilter === groupName) selectedClassroomFilter = 'all';
    renderStudentTrackingPanel();
  } catch (err) {
    alert((isEn() ? "Error deleting classroom: " : "Error en eliminar l'aula: ") + err.message);
  }
}

async function assignStudentToClassGroup(studentUid, newGroupName) {
  if (!currentUser || !studentUid) return;
  try {
    await db.collection("users").doc(studentUid).update({
      classGroup: newGroupName || ''
    });
    if (newGroupName && !userTeacherGroups.includes(newGroupName)) {
      userTeacherGroups.push(newGroupName);
      await db.collection("users").doc(currentUser.uid).set({
        teacherGroups: userTeacherGroups
      }, { merge: true });
    }
    renderStudentTrackingPanel();
  } catch (err) {
    alert((isEn() ? "Error assigning student to group: " : "Error en assignar l'alumne al grup: ") + err.message);
  }
}

function toggleSelectAllStudents(masterCheckbox) {
  const checkboxes = document.querySelectorAll('.student-bulk-checkbox');
  checkboxes.forEach(function(cb) {
    cb.checked = masterCheckbox.checked;
  });
  updateBulkAssignBar();
}

function updateBulkAssignBar() {
  const checked = document.querySelectorAll('.student-bulk-checkbox:checked');
  const bar = document.getElementById('bulk-assign-bar');
  const countSpan = document.getElementById('bulk-selected-count');
  if (!bar || !countSpan) return;

  if (checked.length > 0) {
    countSpan.innerText = checked.length;
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

async function applyBulkAssignToGroup() {
  const checked = document.querySelectorAll('.student-bulk-checkbox:checked');
  const targetSelect = document.getElementById('bulk-target-group-select');
  if (!targetSelect || checked.length === 0) return;

  const targetGroup = targetSelect.value;
  try {
    const promises = [];
    checked.forEach(function(cb) {
      promises.push(db.collection("users").doc(cb.value).update({ classGroup: targetGroup }));
    });
    await Promise.all(promises);
    renderStudentTrackingPanel();
  } catch (err) {
    alert((isEn() ? "Error in bulk assignment: " : "Error en l'assignació múltiple: ") + err.message);
  }
}

function toggleStudentReadingsAccordion(studentUid) {
  const detailRow = document.getElementById('student-readings-row-' + studentUid);
  const chevron = document.getElementById('student-readings-chevron-' + studentUid);
  if (!detailRow) return;
  const isHidden = detailRow.classList.contains('hidden');
  if (isHidden) {
    detailRow.classList.remove('hidden');
    if (chevron) chevron.classList.add('rotate-180');
  } else {
    detailRow.classList.add('hidden');
    if (chevron) chevron.classList.remove('rotate-180');
  }
}

async function renderStudentTrackingPanel() {
  if (!currentUser) return;
  const app = document.getElementById('app');
  app.innerHTML = '<div class="text-center py-12"><i class="fa-solid fa-spinner fa-spin text-4xl text-indigo-600"></i><p class="mt-2 text-slate-500 font-medium">' + (isEn() ? 'Loading your students and classrooms...' : 'Carregant els teus alumnes i aules...') + '</p></div>';

  try {
    const [snap, lecturesSnap] = await Promise.all([
      db.collection("users").where('teacherUid', '==', currentUser.uid).get(),
      db.collection(getReadingsCollection()).get()
    ]);

    const readingsCatalogMap = {};
    const totalCatalogDocs = lecturesSnap.size;
    let idxCat = 0;
    lecturesSnap.forEach(function(lDoc) {
      const lData = lDoc.data() || {};
      const rNum = lData.readingNumber || (totalCatalogDocs - idxCat);
      readingsCatalogMap[lDoc.id] = {
        title: lData.title || (isEn() ? 'Untitled reading' : 'Lectura sense títol'),
        code: formatReadingCode(rNum),
        questionCount: lData.questionCount || 0,
        pointsPerQuestion: lData.pointsPerQuestion || 1
      };
      idxCat++;
    });

    let students = [];
    const discoveredGroups = new Set(userTeacherGroups);

    snap.forEach(function(doc) {
      const u = doc.data();
      const grp = (u.classGroup || '').trim();
      if (grp) discoveredGroups.add(grp);
      students.push(Object.assign({ id: doc.id }, u));
    });

    // Sincronitzem si hi havia algun grup als alumnes que no fos a la llista del docent
    const allGroupsList = Array.from(discoveredGroups).sort(function(a, b) { return a.localeCompare(b, 'ca'); });
    if (allGroupsList.length !== userTeacherGroups.length) {
      userTeacherGroups = allGroupsList;
      db.collection("users").doc(currentUser.uid).set({ teacherGroups: userTeacherGroups }, { merge: true }).catch(function() {});
    }

    students.sort(function(a, b) {
      return (a.displayName || '').localeCompare(b.displayName || '', 'ca');
    });

    const totalStudents = students.length;
    const unassignedStudents = students.filter(function(s) { return !(s.classGroup || '').trim(); });

    if (selectedClassroomFilter !== 'all' && selectedClassroomFilter !== 'unassigned' && !allGroupsList.includes(selectedClassroomFilter)) {
      selectedClassroomFilter = 'all';
    }

    let visibleStudents = students;
    if (selectedClassroomFilter === 'unassigned') {
      visibleStudents = unassignedStudents;
    } else if (selectedClassroomFilter !== 'all') {
      visibleStudents = students.filter(function(s) { return (s.classGroup || '').trim() === selectedClassroomFilter; });
    }

    // Emmagatzemem les dades per a l'exportació neta del full de càlcul (Excel)
    window.currentTrackingExportData = {
      selectedGroup: selectedClassroomFilter,
      visibleStudents: visibleStudents,
      allStudents: students,
      allGroupsList: allGroupsList,
      readingsCatalogMap: readingsCatalogMap
    };
    window.classroomTrackingCatalogMap = readingsCatalogMap;
    if (!window.classroomTrackingStudentsMap) window.classroomTrackingStudentsMap = {};
    students.forEach(function(s) { window.classroomTrackingStudentsMap[s.id] = s; });

    // Estadístiques ràpides del grup seleccionat
    const visibleCount = visibleStudents.length;
    const avgPoints = visibleCount > 0 ? Math.round(visibleStudents.reduce(function(acc, s) { return acc + (s.points || 0); }, 0) / visibleCount) : 0;
    const totalReadingsDone = visibleStudents.reduce(function(acc, s) { return acc + ((s.completedReadings || []).length); }, 0);

    // Pestanyes d'Aules / Grups
    let groupTabsHTML = `
      <button onclick="selectedClassroomFilter='all'; renderStudentTrackingPanel()" class="px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 border ${selectedClassroomFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
        <i class="fa-solid fa-users"></i>
        <span>${isEn() ? 'All' : 'Tots'} (${totalStudents})</span>
      </button>

      <button onclick="selectedClassroomFilter='unassigned'; renderStudentTrackingPanel()" class="px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 border ${selectedClassroomFilter === 'unassigned' ? 'bg-amber-500 text-white border-amber-600 shadow-xs' : (unassignedStudents.length > 0 ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300' : 'bg-slate-50 text-slate-500 border-slate-200')}">
        <i class="fa-solid fa-clock"></i>
        <span>${isEn() ? 'Pending assignment' : "Pendents d'assignar"} (${unassignedStudents.length})</span>
      </button>
    `;

    allGroupsList.forEach(function(gName) {
      const countInGroup = students.filter(function(s) { return (s.classGroup || '').trim() === gName; }).length;
      const isSelected = selectedClassroomFilter === gName;
      const encodedG = encodeURIComponent(gName);
      const assignedList = getGroupAssignedReadings(gName);
      const assignedCount = assignedList.length;

      groupTabsHTML += `
        <div class="inline-flex items-center gap-1.5 p-1 rounded-2xl border transition ${isSelected ? 'bg-emerald-100/70 border-emerald-300 shadow-sm' : 'bg-emerald-50/50 border-emerald-200/80'}">
          <button onclick="selectedClassroomFilter=decodeURIComponent('${encodedG}'); renderStudentTrackingPanel()" class="${isSelected ? 'bg-emerald-600 text-white font-semibold shadow-sm border border-emerald-700/20' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium'} rounded-xl px-3.5 py-2 inline-flex items-center gap-2 transition-all text-xs">
            <i class="fa-solid fa-chalkboard w-4 h-4 flex items-center justify-center"></i>
            <span>${escapeHtmlAttr(gName)} (${countInGroup})</span>
          </button>
          <button onclick="renderClassroomGradeBook(decodeURIComponent('${encodedG}'))" title="${isEn() ? 'Class Grades Table' : 'Taula de notes d\'aula'}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm border border-emerald-700/20 rounded-xl px-3.5 py-2 inline-flex items-center gap-2 transition-all whitespace-nowrap text-xs">
            <i class="fa-solid fa-table-cells-large w-4 h-4 flex items-center justify-center text-xs" data-lucide="layout-grid"></i>
            <span class="whitespace-nowrap">${isEn() ? 'Class Grades Table' : "Taula de notes d'aula"}</span>
          </button>
          <button onclick="openAssignReadingsModal(decodeURIComponent('${encodedG}'))" title="${isEn() ? 'Assign Readings' : 'Assigna lectures'}" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm border border-emerald-700/20 rounded-xl px-3 py-2 inline-flex items-center gap-1.5 transition-all whitespace-nowrap text-xs">
            <i class="fa-solid fa-book-bookmark w-4 h-4 flex items-center justify-center text-xs" data-lucide="bookmark-plus"></i>
            <span class="whitespace-nowrap">${isEn() ? 'Assign Readings' : 'Assigna lectures'}${assignedCount > 0 ? ' (' + assignedCount + ')' : ''}</span>
          </button>
        </div>
      `;
    });

    // Opcions per als desplegables d'assignació
    let groupSelectOptionsHTML = '<option value="">' + (isEn() ? "⏳ Pending assignment" : "⏳ Pendent d'assignar") + '</option>';
    allGroupsList.forEach(function(gName) {
      groupSelectOptionsHTML += '<option value="' + escapeHtmlAttr(gName) + '">🏫 ' + escapeHtmlAttr(gName) + '</option>';
    });

    // Files de la taula d'alumnes
    let rows = '';
    visibleStudents.forEach(function(u) {
      const pts = u.points || 0;
      const rank = getRankDetails(pts);
      const completedList = Array.isArray(u.completedReadings) ? u.completedReadings : [];
      const completedCount = completedList.length;
      const currentGrp = (u.classGroup || '').trim();
      const uScores = u.scores || {};
      const uHistory = u.readingHistory || {};

      let rowSelectOptions = '<option value="" ' + (!currentGrp ? 'selected' : '') + '>' + (isEn() ? "⏳ Pending assignment" : "⏳ Pendent d'assignar") + '</option>';
      allGroupsList.forEach(function(gName) {
        rowSelectOptions += '<option value="' + escapeHtmlAttr(gName) + '" ' + (currentGrp === gName ? 'selected' : '') + '>🏫 ' + escapeHtmlAttr(gName) + '</option>';
      });

      // Construcció del desplegable de lectures d'aquest alumne
      let readingsDetailHTML = '';
      if (completedCount === 0) {
        readingsDetailHTML = '<p class="text-xs text-slate-500 italic py-2">' + (isEn() ? 'This student has not completed any readings yet.' : 'Aquest alumne encara no ha completat cap lectura.') + '</p>';
      } else {
        readingsDetailHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">';
        completedList.forEach(function(rId) {
          const catInfo = readingsCatalogMap[rId] || null;
          const histInfo = uHistory[rId] || null;
          const rTitle = (histInfo && histInfo.title) || (catInfo && catInfo.title) || ((isEn() ? 'Reading (' : 'Lectura (') + rId.slice(0, 6) + '...)');
          const rCode = catInfo ? catInfo.code : '';

          let scoreBadgeHTML = '';
          let taxonomyPillsHTML = '';

          if (histInfo && histInfo.total > 0) {
            const pct = histInfo.percentage !== undefined ? histInfo.percentage : Math.round((histInfo.score / histInfo.total) * 100);
            const badgeTone = pct >= 75
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : (pct >= 50 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300');

            const wpmBadgeText = (histInfo.wpm !== undefined && histInfo.wpm !== null)
              ? (' · <span title="' + (histInfo.readingSeconds ? (histInfo.readingSeconds + 's · ' + (histInfo.wordCount || 0) + ' ' + (isEn() ? 'words' : 'paraules')) : '') + '">⚡ ' + histInfo.wpm + ' ' + (isEn() ? 'WPM' : 'PPM') + '</span>')
              : '';

            scoreBadgeHTML = '<span class="text-[11px] font-black px-2 py-0.5 rounded-md border ' + badgeTone + '">' +
              histInfo.score + '/' + histInfo.total + ' ' + (isEn() ? 'correct' : 'encerts') + ' (' + pct + '%)' + wpmBadgeText + ' · ' + histInfo.points + ' PTS</span>';

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
            const savedPts = uScores[rId] !== undefined ? uScores[rId] : 0;
            const estMax = catInfo && catInfo.questionCount > 0 ? (catInfo.questionCount * (catInfo.pointsPerQuestion || 1)) : 0;
            const ptsText = estMax > 0 ? (savedPts + '/' + estMax + ' PTS') : (savedPts + ' PTS');
            scoreBadgeHTML = '<span class="text-[11px] font-black px-2 py-0.5 rounded-md border bg-indigo-50 text-indigo-800 border-indigo-200">' + ptsText + '</span>';
            taxonomyPillsHTML = '<p class="text-[10px] text-slate-400 italic pt-0.5">' + (isEn() ? 'Reading completed before v0.40.0 (skill breakdown will be recorded when retaken).' : 'Lectura completada abans de la v0.40.0 (el desglossament per tipologia es registrarà quan la torni a fer).') + '</p>';
          }

          readingsDetailHTML += `
            <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-1.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  ${rCode ? '<span class="text-[10px] font-mono font-bold text-indigo-600 mr-1.5">' + rCode + '</span>' : ''}
                  <button type="button" onclick="renderReader('${rId}')" title="${isEn() ? 'Open this reading' : 'Obrir aquesta lectura'}" class="text-xs font-extrabold text-slate-800 hover:text-indigo-600 text-left transition">
                    ${escapeHtmlAttr(rTitle)}
                  </button>
                </div>
                <div class="shrink-0">${scoreBadgeHTML}</div>
              </div>
              ${taxonomyPillsHTML}
            </div>
          `;
        });
        readingsDetailHTML += '</div>';
      }

      const lecturesBtnHTML = completedCount > 0
        ? `<button type="button" onclick="toggleStudentReadingsAccordion('${u.id}')" title="${isEn() ? 'Click to expand readings and scores' : 'Clica per desplegar les lectures i puntuacions'}" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold transition shadow-2xs">
            <i class="fa-solid fa-book-open text-[11px]"></i>
            <span>${completedCount}</span>
            <i id="student-readings-chevron-${u.id}" class="fa-solid fa-chevron-down text-[10px] transition-transform duration-200"></i>
          </button>`
        : `<span class="text-xs font-bold text-slate-400">0</span>`;

      let studentTableSummaryHTML = '';
      const studentDoneEntries = completedList.map(function(rId) { return uHistory[rId]; }).filter(function(h) { return h && h.total > 0; });
      if (studentDoneEntries.length > 0) {
        const pcts = studentDoneEntries.map(function(h) { return h.percentage !== undefined ? h.percentage : Math.round((h.score / h.total) * 100); });
        const avgPct = Math.round(pcts.reduce(function(a, b) { return a + b; }, 0) / pcts.length);
        const validWpms = studentDoneEntries.filter(function(h) { return typeof h.wpm === 'number' && h.wpm > 0; }).map(function(h) { return h.wpm; });
        const avgWpm = validWpms.length > 0 ? Math.round(validWpms.reduce(function(a, b) { return a + b; }, 0) / validWpms.length) : null;

        studentTableSummaryHTML = '<div class="text-[10px] text-slate-500 font-bold mt-1 flex items-center justify-center gap-1 flex-wrap">' +
          '<span title="' + (isEn() ? 'Average accuracy' : 'Mitjana encert') + '">' + avgPct + '% ' + (isEn() ? 'acc.' : 'encert') + '</span>' +
          (avgWpm ? ('<span class="text-slate-300">·</span><span class="text-indigo-600 font-extrabold" title="' + (isEn() ? 'Average reading speed' : 'Velocitat lectora mitjana') + '"><i class="fa-solid fa-gauge-high text-[9px]"></i> ' + avgWpm + ' ' + (isEn() ? 'WPM' : 'PPM') + '</span>') : '') +
          '</div>';
      }

      rows += `
        <tr class="border-b border-slate-100 hover:bg-slate-50/90 transition">
          <td class="p-3 text-center">
            <input type="checkbox" value="${u.id}" onchange="updateBulkAssignBar()" class="student-bulk-checkbox w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer">
          </td>
          <td class="p-3">
            <div class="text-sm font-bold text-slate-800">${escapeHtmlAttr(u.displayName || (isEn() ? 'Student' : 'Alumne/a'))}</div>
            <div class="text-[11px] text-slate-400">${escapeHtmlAttr(u.school || userSchool || (isEn() ? 'School not specified' : 'Centre no especificat'))}</div>
          </td>
          <td class="p-3">
            <select onchange="assignStudentToClassGroup('${u.id}', this.value)" class="p-1.5 text-xs font-bold rounded-lg border outline-none cursor-pointer transition ${currentGrp ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-amber-50 text-amber-900 border-amber-300'}">
              ${rowSelectOptions}
            </select>
          </td>
          <td class="p-3 text-xs text-amber-800 font-bold hidden md:table-cell">
            <span class="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
              <i class="fa-solid ${rank.icon} text-amber-600"></i> ${getLocalizedRankName(rank.name)}
            </span>
          </td>
          <td class="p-3 text-center">${lecturesBtnHTML}${studentTableSummaryHTML}</td>
          <td class="p-3 text-sm text-right font-black text-amber-600">${pts} PTS</td>
        </tr>
        <tr id="student-readings-row-${u.id}" class="hidden bg-indigo-50/40 border-b border-indigo-100">
          <td colspan="6" class="p-3.5 sm:p-4">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <i class="fa-solid fa-chart-column text-indigo-600"></i>
                  ${(isEn() ? 'Reading breakdown for ' : 'Desglossament de lectures de ') + escapeHtmlAttr(u.displayName || (isEn() ? 'Student' : 'Alumne/a'))} (${completedCount})
                </span>
                <button type="button" onclick="toggleStudentReadingsAccordion('${u.id}')" class="text-[11px] font-bold text-slate-500 hover:text-slate-800">
                  <i class="fa-solid fa-xmark mr-0.5"></i> ${isEn() ? 'Close details' : 'Tancar detall'}
                </button>
              </div>
              ${readingsDetailHTML}
            </div>
          </td>
        </tr>
      `;
    });

    const activeGroupEncoded = encodeURIComponent(selectedClassroomFilter);
    const isSpecificGroupActive = selectedClassroomFilter !== 'all' && selectedClassroomFilter !== 'unassigned';

    app.innerHTML = `
      <div class="max-w-6xl mx-auto space-y-6">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <button onclick="resetFiltersAndRenderCatalog()" class="text-slate-500 hover:text-slate-800 text-sm font-medium inline-flex items-center">
            <i class="fa-solid fa-arrow-left mr-1"></i> ${isEn() ? 'Back to catalog' : 'Tornar al catàleg'}
          </button>

          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="configureAiRubricEndpoint()" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold px-3.5 py-2 rounded-xl text-xs md:text-sm shadow-2xs flex items-center gap-1.5 transition">
              <i class="fa-solid fa-wand-magic-sparkles text-indigo-600"></i>
              <span>${isEn() ? 'Configure AI (Gemini)' : 'Configurar IA (Gemini)'}</span>
            </button>
            <button onclick="createTeacherClassGroup()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs md:text-sm shadow flex items-center gap-1.5 transition">
              <i class="fa-solid fa-folder-plus"></i>
              <span>${isEn() ? '+ New Classroom / Group' : '+ Nova Aula / Classe'}</span>
            </button>
          </div>
        </div>

        <!-- CAPÇALERA DE GESTIÓ DOCENT I CENTRE -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h1 class="text-2xl font-black text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-users-rectangle text-indigo-600"></i> ${isEn() ? 'Classroom and Student Management' : "Gestió d'Aules i Alumnes"}
              </h1>
              <p class="text-xs text-slate-500 mt-0.5">
                ${isEn() ? 'School:' : 'Centre:'} <strong class="text-slate-700">${escapeHtmlAttr(userSchool || (isEn() ? 'Not defined in profile' : 'No definit al perfil'))}</strong> · ${isEn() ? 'Organize linked students into classes, levels or reading groups.' : 'Organitza els alumnes vinculats en classes, nivells o grups de lectura.'}
              </p>
            </div>

            <div class="flex items-center gap-2 bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-200">
              <div>
                <span class="block text-[10px] font-bold uppercase tracking-wider text-indigo-500">${isEn() ? 'Your Teacher Code (UID)' : 'El teu Codi Docent (UID)'}</span>
                <span class="text-xs font-mono font-black text-indigo-900 select-all">${currentUser.uid}</span>
              </div>
              <button onclick="copyTeacherUidCode()" title="${isEn() ? 'Copy code for students' : 'Copiar codi per als alumnes'}" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1">
                <i class="fa-solid fa-copy"></i> ${isEn() ? 'Copy' : 'Copiar'}
              </button>
            </div>
          </div>

          <!-- PESTANYES D'AULES / GRUPS -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-black text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <i class="fa-solid fa-layer-group text-indigo-500"></i> ${isEn() ? 'My Classrooms / Class Groups:' : 'Les meves Aules / Grups Classe:'}
              </span>
              ${isSpecificGroupActive ? `
                <div class="flex items-center gap-2 flex-wrap">
                  <button onclick="openAssignReadingsModal(decodeURIComponent('${activeGroupEncoded}'))" title="${isEn() ? 'Assign Readings' : 'Assigna lectures'}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 shadow-xs transition whitespace-nowrap">
                    <i class="fa-solid fa-book-bookmark w-3.5 h-3.5 flex items-center justify-center" data-lucide="bookmark-plus"></i>
                    <span>${isEn() ? 'Assign Readings' : 'Assigna lectures'}${getGroupAssignedReadings(selectedClassroomFilter).length > 0 ? ' (' + getGroupAssignedReadings(selectedClassroomFilter).length + ')' : ''}</span>
                  </button>
                  <span class="text-slate-300">|</span>
                  <button onclick="renameTeacherClassGroup(decodeURIComponent('${activeGroupEncoded}'))" class="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1">
                    <i class="fa-solid fa-pen"></i> ${isEn() ? 'Rename' : 'Canviar nom'}
                  </button>
                  <span class="text-slate-300">|</span>
                  <button onclick="deleteTeacherClassGroup(decodeURIComponent('${activeGroupEncoded}'))" class="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
                    <i class="fa-solid fa-trash"></i> ${isEn() ? 'Delete classroom' : 'Eliminar aula'}
                  </button>
                </div>
              ` : ''}
            </div>

            <div class="flex flex-wrap items-center gap-2">
              ${groupTabsHTML}
            </div>
          </div>

          <!-- RESUM ESTADÍSTIC DE LA VISTA ACTUAL -->
          <div class="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-center">
            <div>
              <span class="block text-lg font-black text-slate-800">${visibleCount}</span>
              <span class="text-[11px] font-bold text-slate-500">${isEn() ? 'Students shown' : 'Alumnes mostrats'}</span>
            </div>
            <div class="border-x border-slate-200">
              <span class="block text-lg font-black text-indigo-600">${totalReadingsDone}</span>
              <span class="text-[11px] font-bold text-slate-500">${isEn() ? 'Completed readings' : 'Lectures completades'}</span>
            </div>
            <div>
              <span class="block text-lg font-black text-amber-600">${avgPoints} PTS</span>
              <span class="text-[11px] font-bold text-slate-500">${isEn() ? 'Average points' : 'Mitjana de punts'}</span>
            </div>
          </div>

          <!-- BARRA D'ASSIGNACIÓ MASSIVA -->
          <div id="bulk-assign-bar" class="hidden bg-indigo-900 text-white p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <span class="text-xs font-bold flex items-center gap-2">
              <i class="fa-solid fa-check-double text-amber-300"></i>
              <span><strong id="bulk-selected-count" class="text-amber-300 text-sm">0</strong> ${isEn() ? 'students selected' : 'alumnes seleccionats'}</span>
            </span>
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <select id="bulk-target-group-select" class="p-1.5 rounded-lg text-xs font-bold text-slate-900 bg-white outline-none flex-grow sm:flex-grow-0">
                ${groupSelectOptionsHTML}
              </select>
              <button onclick="applyBulkAssignToGroup()" class="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs transition shrink-0">
                ${isEn() ? 'Assign to group' : 'Assignar al grup'}
              </button>
            </div>
          </div>

          <!-- TAULA D'ALUMNES -->
          <div class="overflow-x-auto border border-slate-200 rounded-xl">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <th class="p-3 text-center w-10">
                    <input type="checkbox" onclick="toggleSelectAllStudents(this)" title="${isEn() ? 'Select all' : 'Seleccionar tots'}" class="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer">
                  </th>
                  <th class="p-3">${isEn() ? 'Student' : 'Alumne/a'}</th>
                  <th class="p-3">${isEn() ? 'Assigned Classroom / Group' : 'Aula / Classe Assignada'}</th>
                  <th class="p-3 hidden md:table-cell">${isEn() ? 'Reader Rank' : 'Rang Lector'}</th>
                  <th class="p-3 text-center">${isEn() ? 'Readings' : 'Lectures'}</th>
                  <th class="p-3 text-right">${isEn() ? 'Points' : 'Punts'}</th>
                </tr>
              </thead>
              <tbody>
                ${rows || ('<tr><td colspan="6" class="p-8 text-center text-xs text-slate-400">' + (isEn() ? 'No students found in this view.' : 'No hi ha cap alumne en aquesta vista.') + '</td></tr>')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (err) {
    console.error(err);
    app.innerHTML = '<div class="p-4 bg-red-100 text-red-700 rounded-xl max-w-2xl mx-auto">' + (isEn() ? 'Error loading students: ' : 'Error en carregar els alumnes: ') + err.message + '</div>';
  }
}

