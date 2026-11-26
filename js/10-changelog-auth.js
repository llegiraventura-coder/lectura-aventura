function renderChangelogPage() {
  stopSpeechSynthesis();
  const app = document.getElementById('app');
  if (!app) return;

  // FASE 2: LLISTA INVERSA (LA MÉS RECENT A DALT DE TOT)
  const phase2Versions = [
    {
      version: "v0.46.1",
      date: "Novembre 2026",
      badge: "Versió Actual · Edició i Reordenació de Carpetes / Situacions d'Aprenentatge",
      isCurrent: true,
      summary: "Nou modal d'edició completa de Carpetes i Situacions d'Aprenentatge (SA) per modificar metadades, reordenar la seqüència didàctica i afegir o treure lectures del catàleg.",
      highlights: [
        "<strong>Edició completa de metadades:</strong> Botó «Editar» tant a la llista de carpetes del docent com dins la vista de cada carpeta per actualitzar el títol, la descripció i el nivell educatiu.",
        "<strong>Gestió i reordenació de lectures de l'itinerari:</strong> Permet treure lectures existents i reordenar-ne la seqüència amb controls de pujar/baixar per adaptar l'ordre pedagògic.",
        "<strong>Cercador integrat del catàleg:</strong> Cerca ràpida per títol, codi o nivell dins el mateix modal d'edició per incorporar noves lectures amb un sol clic.",
        "<strong>Eliminació segura de carpetes:</strong> Opció d'eliminar carpetes o SA amb confirmació prèvia per mantenir endreçat l'espai docent."
      ]
    },
    {
      version: "v0.46",
      date: "Novembre 2026",
      badge: "Medalles de Docent / Creador i Bloqueig de Punts en Vista Prèvia",
      isCurrent: false,
      summary: "Catàleg exclusiu de 8 medalles pedagògiques i de creació per a docents i creadors (X/8), bloqueig de punts i medalles d'alumne en mode prova de lectura docent, i manteniment íntegre de les 11 medalles lectores per a alumnes (X/11).",
      highlights: [
        "<strong>Catàleg exclusiu de 8 medalles docents:</strong> Primera Llavor, Artesà de la Comprensió, Mestre Polivalent, Lectura Estimada, Èxit d'Aula, Best-Seller Educatiu, Amfitrió d'Aula i Guia Lector, amb comptador dedicat (X/8) a la capçalera blava.",
        "<strong>Bloqueig de punts d'alumne per a docents en proves:</strong> Els mestres i administradors poden provar i enviar qualsevol qüestionari per comprovar la correcció i feedback sense alterar els seus punts, lectures completades ni desbloquejar medalles d'alumne, amb avís discret de mode vista prèvia docent.",
        "<strong>Targetes de medalla coherents i bilingües:</strong> Mateixa estètica que els rangs docents (actives a tot color amb marc daurat, o en gris claret amb requisit i progrés visible per a les pendents), amb textos complets en català i anglès."
      ]
    },
    {
      version: "v0.45.1",
      date: "Novembre 2026",
      badge: "Graella Completa de les 11 Medalles al Perfil",
      isCurrent: false,
      summary: "Renderitzat complet de la graella de les 11 medalles al perfil (amb estat desbloquejat a color i pendent en gris claret amb requisits visibles).",
      highlights: [
        "<strong>Visibilitat universal de les 11 medalles:</strong> La secció de medalles s'activa ara per a tots els perfils (docents i alumnat), mostrant les 11 fites disponibles amb sincronització exacta amb el comptador de la capçalera (X/11).",
        "<strong>Disseny coherent amb els rangs:</strong> Targetes a tot color i marc daurat per a les medalles aconseguides, i targetes atenuades en gris claret (amb indicació clara de requisits i progrés) per a les medalles pendents.",
        "<strong>Descripcions i requisits bilingües:</strong> Cada medalla inclou icona representativa, títol bilingüe (CA/EN), descripció explicativa i requisit específic per desbloquejar-la."
      ]
    },
    {
      version: "v0.45",
      date: "Novembre 2026",
      badge: "Assignació de Lectures per Aula i Nova Vista d'Avaluació",
      isCurrent: false,
      summary: "Sistema d'assignació de lectures per aula, vista en dues pestanyes a la Taula de notes (Avaluació vs. Totes les lectures), exportació Excel adaptada i distintiu «Assignada per l'aula» al catàleg per als alumnes.",
      highlights: [
        "<strong>Assignació de lectures per grup-classe:</strong> Cada docent pot seleccionar quines lectures són obligatòries/avaluables per a cada aula mitjançant un modal interactiu amb cercador ràpid per títol, nivell o codi, selecció massiva i desat directe a Firestore.",
        "<strong>Taula de notes amb doble pestanya:</strong> Vista d'«Avaluació» que mostra exclusivament les lectures assignades amb comptador compacte de «Lectures extra» (per visibilitzar la lectura autònoma) i vista de «Totes les lectures» amb la graella completa.",
        "<strong>Exportació Excel (.xlsx) intel·ligent:</strong> La descàrrega del full de càlcul s'adapta a la pestanya activa, generant un registre oficial net de les lectures avaluades o el recull complet de lectura lliure.",
        "<strong>Distintiu visual i filtre al catàleg per als alumnes:</strong> Els alumnes veuen un distintiu verd destacat «Assignada per l'aula» a les seves lectures indicades, amb filtre directe al catàleg per trobar ràpidament la feina assignada pel docent."
      ]
    },
    {
      version: "v0.44.2",
      date: "Novembre 2026",
      badge: "Neteja de la barra docent i estil verd unificat",
      isCurrent: false,
      summary: "Eliminació dels botons redundants de taula i descàrrega a la barra superior docent i unificació d'estil en verd destacat per als botons d'aula i taules de notes.",
      highlights: [
        "<strong>Neteja de la barra superior docent:</strong> Eliminació del botó redundant «Taula de notes d'aula» del bloc de capçalera de les pestanyes d'aules (ja present individualment a cada grup-classe).",
        "<strong>Estil verd unificat:</strong> Tots els botons d'acció d'aula (Taula de notes i Descarrega Excel) adopten la paleta <code>bg-emerald-600 hover:bg-emerald-700</code> coherent i destacada, amb icones Lucide alineades.",
        "<strong>Millora visual del docent:</strong> Cada grup-classe disposa exclusivament dels seus propis botons específics, eliminant la redundància i clarificant el flux d'acció docent."
      ]
    },
    {
      version: "v0.44.1",
      date: "Novembre 2026",
      badge: "Detall de Taxonomies i Exportació Excel (.xlsx)",
      isCurrent: false,
      summary: "Activació del modal de desglossament per tipus de pregunta a la Taula de notes d'aula, botó d'accés amb text visible (\"Taula de notes d'aula\") i generació nativa de fitxers Excel (.xlsx) reals amb SheetJS amb dues pestanyes (Notes Globals i Desglossament per Habilitats).",
      highlights: [
        "<strong>Modal de desglossament cognitiu:</strong> En clicar sobre la nota d'un alumne a la Taula de notes d'aula, s'obre un modal complet amb percentatge d'encert, PPM i desglossament per les 5 habilitats cognitives (Literal, Inferencial, Sentit Figurat, Opinió i Creativa).",
        "<strong>Botó d'accés amb text visible:</strong> Substitució del botó d'icona sola per un botó rectangular ben visible i autoexplicatiu «Taula de notes d'aula» tant a les aules com a la barra d'eines docent.",
        "<strong>Descàrrega nativa a Excel (.xlsx) amb SheetJS:</strong> Generació d'un fitxer Excel (.xlsx) real amb dues pestanyes («Notes Globals» amb valors numèrics i mitjana de classe, i «Desglossament Habilitats») amb ajust automàtic d'amplada de columnes."
      ]
    },

    {
      version: "v0.44",
      date: "Novembre 2026",
      badge: "Quadern d'Aula amb Graella de Notes",
      isCurrent: false,
      summary: "Nova vista de Quadern d'Aula clicable des del panell del docent: graella de notes (alumnes × lectures) amb semàfor d'encert, PPM, mitjanes automàtiques per alumne i per aula, i exportació a CSV compatible amb Excel (UTF-8 BOM).",
      highlights: [
        "<strong>Aules clicables amb icona de graella:</strong> Cada aula del panell del docent incorpora ara un botó de taula (<i class=\"fa-solid fa-table-cells-large\"></i>) que obre directament el Quadern d'Aula per a aquell grup específic.",
        "<strong>Graella d'avaluació Alumnes × Lectures:</strong> Taula interactiva amb la columna d'alumne fixa (sticky) i totes les lectures de l'aula en columnes ordenades per codi, mostrant el percentatge d'encert amb semàfor de colors (verd ≥75%, ambre 50-74%, vermell &lt;50%) i les PPM de cada alumne per a cada lectura.",
        "<strong>Resums automàtics:</strong> Columna final de Mitjana per alumne (% encert + PPM) i fila de Mitjana de l'Aula per a cada lectura, amb el mateix codi de colors.",
        "<strong>Exportació a CSV (UTF-8 BOM):</strong> Botó «Exportar taula (CSV)» que genera un fitxer descarregable compatible amb Excel i LibreOffice, respectant els accents i caràcters catalans."
      ]
    },
    {
      version: "v0.43.4",
      date: "Novembre 2026",
      badge: "Velocitat Lectora (PPM) & Retolador",
      isCurrent: false,
      summary: "Nova eina de mesura silenciosa de velocitat lectora (PPM) en segon pla per al seguiment docent i consolidació de l'eina de retolador fluorescent per a l'alumnat.",
      highlights: [
        "<strong>Nou subratllador fluorescent per a l'alumnat:</strong> Eina de marcatge contextual amb colors fluorescents (Groc: <em>Important</em>, Verd: <em>Pista</em>, Rosa: <em>Paraula difícil</em>) compatible amb ratolí i pantalles tàctils, amb opció d'esborrar marques i persistència durant tota la lectura.",
        "<strong>Mesura silenciosa de velocitat lectora (PPM):</strong> Cronòmetre invisible en segon pla que calcula automàticament les paraules per minut (PPM) de la primera lectura (amb pausa automàtica en canviar de pestanya i aturada intel·ligent en iniciar les preguntes) i envia la mètrica al panell de seguiment del docent."
      ]
    },
    {
      version: "v0.43.3",
      date: "Novembre 2026",
      badge: "Retolador Fluorescent (Highlighter)",
      isCurrent: false,
      summary: "Nova eina de retolador fluorescent a la vista de lectura per a ratolí i pantalles tàctils (Chromebooks/iPads) amb 3 colors, llegenda en català, persistència en sessió i respecte total pel glossari, TTS i modes de lectura.",
      highlights: [
        "<strong>Barra flotant compacta (popover):</strong> En seleccionar text (o en fer clic sobre una marca existent), apareix una barra flotant just sobre la selecció amb 3 colors fluorescents: Groc (#fef08a, «Important»), Verd (#bbf7d0, «Pista») i Rosa (#fbcfe8, «Paraula difícil»), a més del botó «Treure marca».",
        "<strong>Etiqueta de retolador realista:</strong> Embolcalla la selecció en <code>&lt;mark class=\"user-highlight\" data-color=\"...\"&gt;</code> amb vores arrodonides, padding equilibrat i contrast cromàtic òptim tant en mode estàndard com sèpia i fosc.",
        "<strong>Suport tàctil i d'escriptori:</strong> Detecció fluida d'esdeveniments per a ratolí (<code>mouseup</code>) i pantalles tàctils de tauletes i Chromebooks (<code>touchend</code>).",
        "<strong>Compatibilitat total:</strong> Respecta íntegrament els enllaços del glossari clicable, la lectura en veu alta (TTS) i el mode dislèxia.",
        "<strong>Persistència en memòria i neteja ràpida:</strong> Guarda els subratllats durant la sessió entre preguntes i text, i afegeix el botó discret «Netejar subratllats» a la barra d'eines del lector."
      ]
    },
    {
      version: "v0.43.2",
      date: "Novembre 2026",
      badge: "Traducció Completa de les Targetes del Catàleg",
      isCurrent: false,
      summary: "Traducció completa dels rètols, etiquetes de tipus, rangs docents i botons de previsualització de les targetes de lectura en el mode anglès (EN).",
      highlights: [
        "<strong>Traducció de les targetes del catàleg en mode anglès:</strong> S'han traduït tots els rètols, etiquetes de tipus de text, rangs docents i botons de previsualització de les targetes de lectura en el mode anglès (EN).",
        "<strong>Consistència d'interfície bilingüe:</strong> Visualització contextual coherent en anglès a tots els components de les fitxes de lectura en el catàleg principal."
      ]
    },
    {
      version: "v0.43.1",
      date: "Novembre 2026",
      badge: "Selector d'Idioma Compacte",
      isCurrent: false,
      summary: "Optimització compacta en vertical del selector d'idioma al menú superior per aprofitar millor l'espai horitzontal.",
      highlights: [
        "<strong>Selector d'idioma compacte en vertical:</strong> Nova disposició dels botons de selecció d'idioma un a sota de l'altre (<code>flex-col</code>) amb mida reduïda, ocupant la meitat d'amplada horitzontal a la capçalera.",
        "<strong>Conservació d'estils i accessibilitat:</strong> Manteniment íntegre de les banderes gràfiques, esdeveniments de canvi d'idioma i contrast visual dels estats actiu i inactiu."
      ]
    },
    {
      version: "v0.43.0",
      date: "Novembre 2026",
      badge: "Sistema Bilingüe Català / Anglès",
      isCurrent: false,
      summary: "Nou sistema bilingüe integral Català / Anglès amb col·leccions independents de Firestore, selector d'idioma i adaptació completa de totes les eines pedagògiques.",
      highlights: [
        "<strong>Sistema bilingüe Català / Anglès complet:</strong> Selector dinàmic d'idioma (CA / EN) a la capçalera que tradueix la navegació, catàleg, filtres, lector de textos, passaport lector, eines docents i missatgeria.",
        "<strong>Col·leccions independents a la base de dades:</strong> Gestió separada a Firestore per a les lectures (<code>lectures_en</code>) i carpetes d'aprenentatge en anglès, garantint itineraris pedagògics diferenciats i preservant intacte el corpus en català.",
        "<strong>Passaport Lector, Bústia i Seguiment adaptats:</strong> Traducció bilingüe completa del Passaport Lector (medalles, rangs i desglossament per habilitats cognitives), de la Bústia de Suggeriments Docents i del Panell de Seguiment d'Alumnes i Aules."
      ]
    },
    {
      version: "v0.42.0",
      date: "Novembre 2026",
      badge: "Divisió per Capítols o Pàgines",
      isCurrent: false,
      summary: "Paginació de lectures llargues i divisió per capítols en llibres amb botó «Següent part» i preguntes associades a cada capítol.",
      highlights: [
        "<strong>Divisió en parts, pàgines o capítols (<code>=== Títol ===</code>):</strong> Disponible tant per a lectures escrites llargues com per a fitxes de llibres des del botó <em>«Dividir per Capítol / Pàgina»</em> de l'editor.",
        "<strong>Navegació progressiva al lector amb botó «Següent part»:</strong> L'alumne llegeix el text fragment a fragment sense veure's aclaparat per blocs extensos, amb índex superior i control de lectura en veu alta adaptat a la part activa.",
        "<strong>Preguntes comprensives per capítol:</strong> En els llibres i lectures dividides, el docent pot vincular cada pregunta a un capítol concret perquè l'alumne les vagi responent a mesura que avança."
      ]
    },
    {
      version: "v0.41.0",
      date: "Novembre 2026",
      badge: "Nou Format Omplir Buits (Cloze)",
      isCurrent: false,
      summary: "Nou format de pregunta interactiva «Omplir buits (Cloze)» amb desplegables o escriptura de mots per treballar el vocabulari en context i la cohesió gramatical.",
      highlights: [
        "<strong>Dos modes d'interacció al lector:</strong> Permet triar entre <em>desplegables integrats a la frase</em> (amb opcions barrejades automàticament) o <em>caselles d'escriptura directa</em> amb tolerància a majúscules, accents i petites errades ortogràfiques.",
        "<strong>Editor visual amb vista prèvia en directe:</strong> Sintaxi senzilla <code>[[resposta|distractor1|distractor2]]</code>, botó ràpid d'inserció i previsualització instantània dels buits detectats.",
        "<strong>Avaluació proporcional i feedback detallat:</strong> Calcula la puntuació proporcional segons els buits encertats, mostra el detall buit per buit en acabar el qüestionari i inclou revelació de solucions al Mode Projecció a l'Aula (PDI)."
      ]
    },
    {
      version: "v0.40.3",
      date: "Novembre 2026",
      badge: "Bústia i Missatgeria entre Docents",
      isCurrent: false,
      summary: "Activació completa de la missatgeria i suggeriments de millora entre docents amb bústia de recepció i enviats.",
      highlights: [
        "<strong>Enviament de propostes de millora des del lector:</strong> El botó «Enviar Suggeriment» obre un modal per redactar propostes pedagògiques, correccions o peticions d'adaptació DUA adreçades directament a l'autor/a de la lectura.",
        "<strong>Bústia de Suggeriments Docents:</strong> Des del botó «Suggeriments» de la barra superior, cada docent pot consultar els missatges rebuts sobre les seves lectures i els suggeriments que ha enviat.",
        "<strong>Gestió d'estat (Pendent / Revisat / Aplicat) i resposta directa:</strong> Permet marcar els suggeriments com a revisats o aplicats, obrir la lectura directament i respondre al docent remitent."
      ]
    },
    {
      version: "v0.40.2",
      date: "Novembre 2026",
      badge: "Passaport Lector Desplegable",
      isCurrent: false,
      summary: "Desplegable interactiu al Passaport Lector de l'alumnat per consultar totes les lectures completades, puntuacions i desglossament per tipologia cognitiva.",
      highlights: [
        "<strong>Targeta de lectures completades interactiva:</strong> En fer clic a les lectures completades del Passaport Lector s'obre el llistat detallat de cada lectura feta.",
        "<strong>Puntuació i taxonomia per lectura:</strong> Mostra la nota d'encerts, els punts aconseguits i el detall per tipologia (<em>Literal</em>, <em>Inferencial</em>, <em>Sentit Figurat</em>, <em>Opinió</em> i <em>Creativa</em>).",
        "<strong>Estabilització completa:</strong> Consolidació de totes les funcions d'avaluació, Mode Projecció a l'Aula (PDI), carpetes SA i seguiment docent."
      ]
    },
    {
      version: "v0.40.0",
      date: "Novembre 2026",
      badge: "Mode Projecció a l'Aula (PDI)",
      isCurrent: false,
      summary: "Nou Mode Projecció per al Panell Digital Interactiu per fer comprensions lectores col·lectives a l'aula sense sumar punts.",
      highlights: [
        "<strong>Botó «🖥️ Projectar a l'Aula» a totes les lectures:</strong> Disponible per a docents dins del lector per treballar la lectura en gran grup.",
        "<strong>Format optimitzat per a pissarra digital:</strong> Lletra ampliada automàticament, vista de totes les preguntes o <em>una a una (diapositives PDI)</em> i botó opcional per <em>revelar la solució</em> en directe.",
        "<strong>Feedback col·lectiu sense puntuació:</strong> Corregeix entre tots (inclosa l'avaluació IA de preguntes obertes) i mostra el resultat de la classe sense alterar els punts ni l'historial del compte docent, amb reinici ràpid per repetir-ho amb un altre grup."
      ]
    },
    {
      version: "v0.39.3",
      date: "Novembre 2026",
      badge: "Desglossament Docent per Alumne",
      isCurrent: false,
      summary: "Desplegable interactiu al panell 'Els meus Alumnes' amb les lectures fetes, puntuació i desglossament per taxonomia.",
      highlights: [
        "<strong>Comptador desplegable per alumne:</strong> En clicar sobre el nombre de lectures d'un alumne a <em>Els meus Alumnes</em>, s'obre un panell amb totes les seves lectures completades.",
        "<strong>Puntuació global i per tipologia cognitiva:</strong> Mostra la nota d'encerts i punts de cada lectura juntament amb el detall per taxonomia (<em>Literal</em>, <em>Inferencial</em>, <em>Sentit Figurat</em>, <em>Opinió</em> i <em>Creativa</em>).",
        "<strong>Registre històric per lectura (<code>readingHistory</code>):</strong> Cada qüestionari enviat desa automàticament el rendiment detallat de l'alumne mantenint compatibilitat total amb les lectures anteriors."
      ]
    },
    {
      version: "v0.39.2",
      date: "Novembre 2026",
      badge: "Revisió Detallada per Pregunta",
      isCurrent: false,
      summary: "Feedback formatiu complet pregunta per pregunta en acabar el qüestionari.",
      highlights: [
        "<strong>Revisió numerada de totes les preguntes (1, 2, 3...):</strong> En acabar la lectura, l'alumne veu cada pregunta amb el seu estat (<em>Correcte</em>, <em>Parcial 50%</em> o <em>Incorrecte</em>).",
        "<strong>Comparativa de respostes en preguntes tancades:</strong> Mostra què havia seleccionat l'alumne i quina era l'opció o seqüència correcta en cas d'errada.",
        "<strong>Feedback coherent amb IA en preguntes obertes:</strong> Quan s'ha corregit amb Gemini, es mostra l'etiqueta <em>Correcció amb IA</em> i una frase explicativa adaptada a l'alumne."
      ]
    },
    {
      version: "v0.39.0 - v0.40.0",
      date: "Novembre 2026",
      badge: "Avaluació IA amb Rúbrica",
      isCurrent: false,
      summary: "Correcció Intel·ligent de Preguntes Obertes amb Gemini 2.5 Flash i Rúbrica Docent.",
      highlights: [
        "<strong>Rúbrica docent personalitzada en preguntes de resposta oberta:</strong> El docent defineix els criteris de validesa invisibles per a l'alumne i rep una avaluació semàntica amb 3 nivells (<em>100% Correcta</em>, <em>50% Parcial</em> o <em>0% A millorar</em>).",
        "<strong>Feedback formatiu personalitzat en català:</strong> Missatge adreçat directament a l'alumne després de completar la lectura explicant què ha argumentat bé o què pot millorar.",
        "<strong>Configuració centralitzada per a tot l'alumnat:</strong> El docent enganxa la seva API Key gratuïta de Google AI Studio i es desa automàticament al núvol per a tota la classe.",
        "<strong>Doble xarxa de seguretat (Fallback intel·ligent):</strong> Si no hi ha connexió o clau configurada, el sistema passa automàticament al motor local de paraules clau amb tolerància ortogràfica."
      ]
    },
    {
      version: "v0.38.0",
      date: "Novembre 2026",
      badge: "Gestió d'Aules i Grups Classe",
      isCurrent: false,
      summary: "Nou gestor d'aules, nivells i classes dins el panell docent 'Els meus Alumnes'.",
      highlights: [
        "<strong>Creació i gestió d'Aules / Grups:</strong> Els docents poden crear aules personalitzades (ex. <em>4t A</em>, <em>5è B</em>, <em>Grup Reforç</em>), canviar-ne el nom o eliminar-les amb seguretat.",
        "<strong>Assignació individual i massiva:</strong> Desplegable ràpid a cada alumne i selecció múltiple amb checkboxes per assignar tot un grup de cop.",
        "<strong>Filtres per aula i mètriques:</strong> Pestanyes per aula amb comptador, vista de <em>Pendents d'assignar</em> i càlcul de mitjana de punts per classe.",
        "<strong>Classificació per classe real:</strong> La pestanya <em>El meu Grup</em> del rànquing d'alumnes filtra automàticament pels companys de la mateixa aula assignada."
      ]
    },
    {
      version: "v0.37.4",
      date: "Novembre 2026",
      badge: "Passaport Blindat · 11 Medalles Funcionals",
      isCurrent: false,
      summary: "Ampliació del Passaport Lector amb 5 noves medalles funcionals de superació, taxonomies cognitives i llibres.",
      highlights: [
        "<strong>El Fènix Lector:</strong> Nova medalla que premia la resiliència quan un lector repeteix una lectura i millora la seva puntuació anterior.",
        "<strong>Devorador/a de Capítols:</strong> Reconeixement per completar qüestionaris de fitxes de <em>Llibre de lectura</em>.",
        "<strong>3 Medalles d'Especialització Cognitiva:</strong> <em>Detectiu de Pistes</em> (10 encerts inferencials), <em>Mestre/a del Doble Sentit</em> (5 encerts de sentit figurat) i <em>Ment Creativa i Crítica</em> (5 respostes d'opinió o creatives).",
        "Registre automàtic al núvol de l'historial d'encerts per taxonomia i millora de marques personals."
      ]
    },
    {
      version: "v0.37.2",
      date: "Novembre 2026",
      badge: "Passaport & Medalles Base",
      isCurrent: false,
      summary: "Passaport Oficial del Lector, Vitrina de Medalles i Restauració de l'Historial.",
      highlights: [
        "Nou <strong>Passaport Oficial de Lectura Aventura</strong> accessible des de la capçalera i el bàner superior.",
        "<strong>Escala completa de Rangs</strong> (lectors i docents) amb barra de progrés visual i càlcul de punts pendents.",
        "<strong>Col·lecció de 6 Medalles i Reptes Especials</strong>: <em>Primera Aventura</em>, <em>Lector/a Constant (5)</em>, <em>Devorador/a de Llibres (15)</em>, <em>Ment Brillant (100%)</em>, <em>Explorador/a Multiformat</em> i <em>Viatger/a de Gèneres</em>.",
        "Recuperació de l'<strong>Historial de Versions</strong> combinant la llista inversa de la Fase 2 i les 4 files de 3 blocs de la Fase 1."
      ]
    },
    {
      version: "v0.37.1",
      date: "Novembre 2026",
      badge: "Estabilització DUA & Visual",
      isCurrent: false,
      summary: "Millores en Lectures Visuals, pestanyes DUA i síntesi de veu per a transcripcions.",
      highlights: [
        "Suport per a <strong>Lectures Visuals</strong> amb imatge de referència (cartells, pictogrames, infografies, còmics) i modal d'ampliació amb Zoom.",
        "<strong>Versions Adaptades / Simplificades (DUA)</strong> annexades mitjançant pestanyes dins el mateix lector.",
        "Transcripció opcional d'àudio en lectures visuals per activar la lectura en veu alta en català.",
        "Unificació dels nivells educatius i comptador automàtic de codis <code>#CL-00001</code>."
      ]
    },
    {
      version: "v0.37.0",
      date: "Novembre 2026",
      badge: "Inici Fase 2 · Motor Ampliat",
      isCurrent: false,
      summary: "Nou tipus de pregunta de resposta oberta, lector visual i pestanyes adaptades.",
      highlights: [
        "Incorporació de la <strong>6a modalitat de pregunta</strong>: <em>Resposta oberta amb detecció de paraules clau</em>.",
        "Introducció del format de lectura visual i pestanyes multi-versió dins del lector."
      ]
    }
  ];

  // FASE 1: LES 4 FILES AMB 3 BLOCS ORIGINALS (12 FITES)
  const phase1Rows = [
    {
      title: "🚀 TANCAMENT DE LA FASE 1 (v0.34 – v0.36)",
      blocks: [
        {
          version: "v0.36.0",
          date: "Novembre 2026",
          badge: "Google Classroom",
          color: "bg-emerald-500 text-white font-bold border-emerald-600",
          summary: "Integració directa amb Google Classroom i gestió de rols.",
          highlights: [
            "Botó de compartició directa de lectures cap a Google Classroom amb un sol clic.",
            "Ampliació de permisos de gestió per a l'administració i millores de seguretat."
          ]
        },
        {
          version: "v0.35.0",
          date: "Novembre 2026",
          badge: "Experiència Lectora",
          color: "bg-indigo-500 text-white font-bold border-indigo-600",
          summary: "Optimització de filtres del catàleg i seguiment docent.",
          highlights: [
            "Millores en el cercador combinat per codi #CL, autor/a de l'obra, nivell i durada.",
            "Refinament del panell 'Els meus Alumnes' amb còpia ràpida del codi UID docent."
          ]
        },
        {
          version: "v0.34.0",
          date: "Novembre 2026",
          badge: "Format Llibre & Pàgines",
          color: "bg-purple-500 text-white font-bold border-purple-600",
          summary: "Millores en fitxes de llibres i puntuació configurable.",
          highlights: [
            "Indicador de nombre de pàgines per a llibres de lectura i puntuació per encert (1 o 2 pts).",
            "Consolidació de l'arquitectura de carpetes i Situacions d'Aprenentatge (SA)."
          ]
        }
      ]
    },
    {
      title: "⚡ DARRERES VERSIONS DE LA FASE 1 (v0.31 – v0.33)",
      blocks: [
        {
          version: "v0.33.0 - v0.33.2",
          date: "Novembre 2026",
          badge: "Clonació & Navegació 360º",
          color: "bg-amber-400 text-slate-900 font-bold border-amber-500",
          summary: "Mòdul de Clonació i Navegació Bidireccional de Bateries.",
          highlights: [
            "Botó '🌱 Adaptar Preguntes' des del Lector per a duplicar i adaptar qüestionaris.",
            "Navegació fluida bidireccional entre la lectura mare original i qualsevol adaptació de la comunitat."
          ]
        },
        {
          version: "v0.32.0",
          date: "Novembre 2026",
          badge: "Àudio-Lectura Nativa",
          color: "bg-indigo-600 text-white font-bold border-indigo-700",
          summary: "Síntesi de veu (Web Speech API) integrada al lector.",
          highlights: [
            "Botó d'àudio-lectura en català natiu sense dependències externes.",
            "Control de Pausa/Reprendre, Aturada i selector de velocitat (0.8x, 1x, 1.2x)."
          ]
        },
        {
          version: "v0.31.0 - v0.31.1",
          date: "Novembre 2026",
          badge: "Lectura Adaptativa",
          color: "bg-indigo-400 text-white font-bold border-indigo-500",
          summary: "Mode Dislèxia, mida de font, contrast i harmonització visual.",
          highlights: [
            "Font OpenDyslexic i major espaiat de lletres commutables des del lector.",
            "Ajust de mida de font (A-/A+), modes Sèpia/Fosc i requadre #CL harmonitzat."
          ]
        }
      ]
    },
    {
      title: "📚 HISTORIAL D'AVANÇOS RECENT (v0.27 – v0.30)",
      blocks: [
        {
          version: "v0.30.0",
          date: "Novembre 2026",
          badge: "Glossari & Vocabulari",
          color: "bg-teal-400 text-slate-900 font-bold border-teal-500",
          summary: "Mòdul de Vocabulari Clau amb desplaçament suau.",
          highlights: [
            "Creació de glossaris terme-definició des de l'editor de la lectura.",
            "Enllaços directes al text i preguntes amb scroll suau al peu de pàgina."
          ]
        },
        {
          version: "v0.29.0",
          date: "Novembre 2026",
          badge: "Codi Únic + Feedback",
          color: "bg-amber-400 text-slate-900 font-bold border-amber-500",
          summary: "Identificador #CL-00001 i Bústia entre Docents.",
          highlights: [
            "Generació automàtica de matrícula numèrica en format #CL-XXXXX.",
            "Bústia de suggeriments i millores en línia entre docents per a fer comunitat."
          ]
        },
        {
          version: "v0.27.0 - v0.28.0",
          date: "Novembre 2026",
          badge: "Noves Preguntes",
          color: "bg-teal-100 text-teal-900 border-teal-300",
          summary: "Respostes visuals amb imatge i ordenació cronològica.",
          highlights: [
            "5è tipus: Selecció d'Imatges (4 URLs) i 4t tipus: Ordenació temporal (▲/▼).",
            "Reordenació dinàmica de preguntes i doble botó UX a l'editor."
          ]
        }
      ]
    },
    {
      title: "🏛️ ORÍGENS I INFRAESTRUCTURA BASE (v0.1 – v0.26)",
      blocks: [
        {
          version: "v0.20.0 - v0.26.3",
          date: "Tardor 2026",
          badge: "Taxonomia & Carpetes",
          color: "bg-purple-100 text-purple-900 border-purple-300",
          summary: "Taxonomies en 5 nivells cognitius i carpetes SA.",
          highlights: [
            "Classificació cognitiva (Literal, Inferencial, Figurat, Opinió, Creativa).",
            "Creació i agrupació real de lectures en Situacions d'Aprenentatge (SA)."
          ]
        },
        {
          version: "v0.16.0 - v0.19.0",
          date: "Inici 2026",
          badge: "Comunitat & Rols",
          color: "bg-slate-100 text-slate-800 border-slate-300",
          summary: "Gestió d'Usuaris, 4 Rols i Rànquing en 3 Nivells.",
          highlights: [
            "Inici de sessió amb selecció entre Alumne, Adult, Docent i Col·laborador.",
            "Panell 'Els meus Alumnes' i Classificació per Grup, Centre i Global."
          ]
        },
        {
          version: "v0.1.0 - v0.15.0",
          date: "2025",
          badge: "Gènesi del Projecte",
          color: "bg-slate-50 text-slate-600 border-slate-200",
          summary: "Primera versió del lector, qüestionaris bàsics i Firebase.",
          highlights: [
            "Motor de lectures curtes integrades i llibres amb coberta.",
            "Connexió inicial en temps real amb Firebase Firestore."
          ]
        }
      ]
    }
  ];

  // RENDERITZAT DE LA FASE 2 (LLISTA INVERSA)
  const phase2HTML = phase2Versions.map(v => `
    <div class="p-5 rounded-2xl ${v.isCurrent ? 'bg-indigo-50/90 border-2 border-indigo-400 shadow-sm' : 'bg-white border border-slate-200 shadow-2xs'} space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 flex-wrap">
          <span class="font-mono text-xs font-black px-2.5 py-1 rounded-lg ${v.isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-amber-300'}">${v.version}</span>
          <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${v.isCurrent ? 'bg-amber-300 text-slate-950' : 'bg-indigo-100 text-indigo-800'}">${v.badge}</span>
        </div>
        <span class="text-xs font-mono text-slate-400 font-semibold">${v.date}</span>
      </div>
      <p class="text-sm font-black text-slate-900">${v.summary}</p>
      <ul class="list-disc list-inside text-xs text-slate-700 space-y-1">
        ${v.highlights.map(h => `<li>${h}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  // RENDERITZAT DE LA FASE 1 (4 FILES AMB 3 BLOCS)
  const phase1HTML = phase1Rows.map(row => `
    <div class="space-y-3">
      <h3 class="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
        <span>${row.title}</span>
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${row.blocks.map(b => `
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3">
            <div class="space-y-2.5">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${b.color}">${b.badge}</span>
                <span class="text-[11px] font-mono text-slate-400">${b.date}</span>
              </div>
              <div class="font-mono text-xs font-black text-indigo-700">${b.version}</div>
              <h4 class="font-bold text-slate-800 text-sm leading-snug">${b.summary}</h4>
              <ul class="list-disc list-inside text-xs text-slate-600 space-y-1">
                ${b.highlights.map(h => `<li>${h}</li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  app.innerHTML = `
    <div class="max-w-6xl mx-auto space-y-8 pb-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <button onclick="resetFiltersAndRenderCatalog()" class="text-slate-500 hover:text-slate-800 text-sm font-medium inline-flex items-center mb-2">
            <i class="fa-solid fa-arrow-left mr-1"></i> Tornar al catàleg
          </button>
          <h1 class="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-2.5">
            <i class="fa-solid fa-code-branch text-indigo-600"></i> Historial de Versions
          </h1>
          <p class="text-xs md:text-sm text-slate-500 mt-1">Evolució completa de Lectura Aventura — Fase 2 i Fase 1</p>
        </div>
        <span class="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-3.5 py-1.5 rounded-xl border border-amber-300 self-start sm:self-center shadow-2xs">
          Versió Actual: v0.46.1
        </span>
      </div>

      <!-- BLOC SUPERIOR: FASE 2 (ORDRE INVERS - LA MÉS RECENT A DALT) -->
      <section class="space-y-4">
        <div class="flex items-center gap-2.5">
          <span class="bg-indigo-600 text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg shadow-2xs">Fase 2</span>
          <h2 class="text-lg font-black text-slate-800">Noves Funcionalitats, DUA, Passaport Lector i IA (Ordre invers)</h2>
        </div>
        <div class="space-y-3">
          ${phase2HTML}
        </div>
      </section>

      <!-- BLOC INFERIOR: FASE 1 (4 FILES AMB BLOCS DE 3) -->
      <section class="space-y-6 pt-6 border-t-2 border-slate-200">
        <div class="flex items-center gap-2.5">
          <span class="bg-slate-800 text-amber-300 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg shadow-2xs">Fase 1</span>
          <h2 class="text-lg font-black text-slate-800">Fonaments i Evolució Històrica</h2>
        </div>
        <div class="space-y-6">
          ${phase1HTML}
        </div>
      </section>
    </div>
  `;
}

function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
      <div class="text-center">
        <h2 class="text-2xl font-bold text-slate-800">${isEn() ? 'Sign in to Lectura Aventura' : 'Accés a Lectura Aventura'}</h2>
        <p class="text-sm text-slate-500">${isEn() ? 'Log in with your account or register' : 'Inicia sessió amb el teu compte o registra\'t'}</p>
      </div>

      <button onclick="loginWithGoogle()" class="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-2 text-sm">
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-5 h-5" alt="Google">
        <span>${isEn() ? 'Continue with Google' : 'Continua amb Google'}</span>
      </button>

      <div class="relative flex items-center py-1"><div class="flex-grow border-t border-slate-200"></div><span class="shrink mx-3 text-xs text-slate-400">${isEn() ? 'Or with email' : 'O amb correu'}</span><div class="flex-grow border-t border-slate-200"></div></div>

      <form onsubmit="handleAuth(event, false)" class="space-y-3">
        <input type="email" id="auth-email" placeholder="${isEn() ? 'Email address' : 'Correu electrònic'}" required class="w-full p-2.5 border border-slate-300 rounded-xl text-sm">
        <input type="password" id="auth-pass" placeholder="${isEn() ? 'Password' : 'Contrasenya'}" required class="w-full p-2.5 border border-slate-300 rounded-xl text-sm">
        <button type="submit" class="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm shadow">${isEn() ? 'Log In' : 'Inicia Sessió'}</button>
      </form>

      <div class="pt-2 border-t border-slate-100 text-center">
        <button onclick="renderRegister()" class="text-xs font-bold text-indigo-600 hover:underline">${isEn() ? 'No account? Register here' : 'No tens compte? Registra\'t aquí'}</button>
      </div>
    </div>
  `;
}

function renderRegister() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-5">
      <h2 class="text-2xl font-bold text-slate-800 text-center">${isEn() ? 'Create an Account' : 'Crea un Compte'}</h2>
      <form onsubmit="handleAuth(event, true)" class="space-y-3">
        <div><label class="block text-xs font-bold text-slate-700">${isEn() ? 'Name / Alias *' : 'Nom / Àlies *'}</label><input type="text" id="reg-name" required class="w-full p-2 border border-slate-300 rounded-xl text-sm"></div>
        <div><label class="block text-xs font-bold text-slate-700">${isEn() ? 'Profile *' : 'Perfil *'}</label>
          <select id="reg-role" onchange="toggleRegSchool(this.value)" class="w-full p-2 border border-slate-300 rounded-xl text-sm font-bold">
            <option value="alumne">${isEn() ? '🎒 Student' : '🎒 Alumne / Estudiant'}</option>
            <option value="adult">${isEn() ? '🧑‍💼 Adult Reader (No school)' : '🧑‍💼 Lector Adult (Sense centre escolar)'}</option>
            <option value="docent">${isEn() ? '👨‍🏫 Teacher / Creator' : '👨‍🏫 Docent / Creador'}</option>
          </select>
        </div>
        <div id="reg-school-box"><label class="block text-xs font-bold text-slate-700">${isEn() ? 'School / Institution' : 'Centre Educatiu'}</label><input type="text" id="reg-school" class="w-full p-2 border border-slate-300 rounded-xl text-sm"></div>
        <div id="reg-teacher-box"><label class="block text-xs font-bold text-slate-700">${isEn() ? 'Teacher Code (Optional)' : 'Codi del teu Docent (Opcional)'}</label><input type="text" id="reg-teacher-uid" class="w-full p-2 border border-slate-300 rounded-xl text-sm font-mono"></div>
        <div><label class="block text-xs font-bold text-slate-700">${isEn() ? 'Email address *' : 'Correu electrònic *'}</label><input type="email" id="auth-email" required class="w-full p-2 border border-slate-300 rounded-xl text-sm"></div>
        <div><label class="block text-xs font-bold text-slate-700">${isEn() ? 'Password *' : 'Contrasenya *'}</label><input type="password" id="auth-pass" required class="w-full p-2 border border-slate-300 rounded-xl text-sm"></div>
        <button type="submit" class="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm shadow">${isEn() ? 'Register' : 'Registrar-me'}</button>
      </form>
      <div class="text-center"><button onclick="renderLogin()" class="text-xs font-bold text-slate-500 hover:underline">${isEn() ? 'Back to Log In' : 'Tornar a Iniciar Sessió'}</button></div>
    </div>
  `;
}

function toggleRegSchool(role) {
  const sBox = document.getElementById('reg-school-box');
  const tBox = document.getElementById('reg-teacher-box');
  if (role === 'adult') { sBox.classList.add('hidden'); tBox.classList.add('hidden'); }
  else if (role === 'docent') { sBox.classList.remove('hidden'); tBox.classList.add('hidden'); }
  else { sBox.classList.remove('hidden'); tBox.classList.remove('hidden'); }
}

async function handleAuth(e, isRegister) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  try {
    if (isRegister) {
      const name = document.getElementById('reg-name').value.trim();
      const role = document.getElementById('reg-role').value;
      const school = document.getElementById('reg-school') ? document.getElementById('reg-school').value.trim() : '';
      const tUid = document.getElementById('reg-teacher-uid') ? document.getElementById('reg-teacher-uid').value.trim() : '';

      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await db.collection("users").doc(cred.user.uid).set({
        email: email, displayName: name, role: role, school: school, teacherUid: tUid, points: 0, completedReadings: []
      });
    } else {
      await auth.signInWithEmailAndPassword(email, pass);
    }
  } catch (err) {
    alert((isEn() ? 'Authentication error: ' : "Error d'autenticació: ") + err.message);
  }
}

async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const uDoc = await db.collection("users").doc(result.user.uid).get();
    if (!uDoc.exists) {
      await db.collection("users").doc(result.user.uid).set({
        email: result.user.email,
        displayName: result.user.displayName || result.user.email.split('@')[0],
        role: result.user.email === ADMIN_SUPREMO_EMAIL ? 'docent' : 'alumne',
        points: 0,
        completedReadings: []
      });
    }
  } catch (err) {
    alert((isEn() ? 'Google sign-in error: ' : 'Error amb Google: ') + err.message);
  }
}

function logout() {
  if (auth) auth.signOut();
}
