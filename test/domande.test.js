/* ═══════════════════════════════════════════════════════════════
   LE DOMANDE, E LA RIGA DEI TASTI SOTTO
   Due cose.

   LA RIGA DEI TASTI. Il tasto del check-in vale mezza riga sempre:
   quando accanto ha un tasto solo e quando ne ha due. Se si
   restringesse ogni volta che compare un'altra strada, la strada nuova
   sembrerebbe piu' importante di quella giusta — e la riga cambierebbe
   forma sotto gli occhi di chi la sta guardando. Nel quiz vale la
   regola opposta, ed e' voluta: li' AVANTI comanda e INDIETRO e' la
   scappatoia, quindi le due misure devono restare diverse.

   LE RISPOSTE. Quelle che si leggono in vetrina passano davanti a
   clienti veri: qui si tengono ferme le parole che sono state scelte a
   voce, e si tengono fuori quelle scartate.
   ═══════════════════════════════════════════════════════════════ */
const { VETRINA, SCHERMI, Taccuino } = require('./aiuto');

module.exports = async function(browser){
  const tac = new Taccuino('le domande e la riga dei tasti');
  const p = await tac.pagina(browser, VETRINA, SCHERMI[0]);

  /* ── la riga dei tasti ── */
  await p.evaluate(()=> document.getElementById('avatar').click());
  await p.waitForTimeout(500);
  const elenco = await p.evaluate(()=>
    [...document.querySelectorAll('#s-ask .ask .navrow .nav')]
      .map(e => ({t:e.textContent.trim(), w:e.offsetWidth})));

  await p.evaluate(()=> apriRisposta(0));
  await p.waitForTimeout(500);
  const risposta = await p.evaluate(()=>
    [...document.querySelectorAll('#risp .navrow .nav')]
      .map(e => ({t:e.textContent.trim(), w:e.offsetWidth})));

  const checkE = (elenco.find(x => /CHECK-IN/.test(x.t)) || {}).w;
  const checkR = (risposta.find(x => /CHECK-IN/.test(x.t)) || {}).w;
  tac.t('il tasto del check-in ha la stessa larghezza con uno o con due tasti accanto',
    checkE === checkR, checkE + ' contro ' + checkR);

  const indietro = (elenco.find(x => /Indietro/.test(x.t)) || {}).w;
  const altre = (risposta.find(x => /Altre domande/.test(x.t)) || {}).w;
  const casa  = (risposta.find(x => /Torna alla home/.test(x.t)) || {}).w;
  const gap = await p.evaluate(()=>
    parseFloat(getComputedStyle(document.querySelector('#risp .navrow')).gap));
  tac.t('«Indietro» da solo e\' largo quanto i due tasti che prende il suo posto',
    Math.abs(indietro - (altre + casa + gap)) <= 1,
    indietro + ' contro ' + (altre + casa + gap));
  tac.t('i due tasti di sinistra sono larghi uguali', altre === casa, altre + '/' + casa);
  tac.t('il check-in vale mezza riga', Math.abs(checkE - (indietro + gap) + gap) <= 2,
    checkE + ' contro ' + indietro);

  /* nel quiz la gerarchia resta quella di prima */
  await p.evaluate(()=>{ go('form'); PASSO = 2; disegnaPasso(); });
  await p.waitForTimeout(400);
  const quiz = await p.evaluate(()=>
    [...document.querySelectorAll('#s-form .navrow .nav')]
      .map(e => ({t:e.textContent.trim(), w:e.offsetWidth})));
  const av = (quiz.find(x => /AVANTI/.test(x.t)) || {}).w;
  const ind = (quiz.find(x => /Indietro/.test(x.t)) || {}).w;
  tac.t('nel quiz AVANTI resta piu\' grande di INDIETRO', av > ind * 1.5, av + ' contro ' + ind);

  /* sul nome AVANTI sta solo sulla tastiera: in basso resta Indietro, a tutta riga */
  const sunome = await p.evaluate(()=>{ go('form'); PASSO = 0; disegnaPasso();
    const n = document.getElementById('fnext'), b = document.querySelector('#s-form .navrow .nav.back');
    const r = {nascosto: n.offsetWidth === 0, largo: Math.abs(b.offsetWidth - b.parentElement.clientWidth) <= 1,
      tastiera: !!document.querySelector('#kb .key.go')};
    PASSO = 2; disegnaPasso(); r.torna = document.getElementById('fnext').offsetWidth > 0;
    return r; });
  tac.t('sul nome c\'e\' un solo AVANTI, quello della tastiera', sunome.nascosto && sunome.tastiera, JSON.stringify(sunome));
  tac.t('sul nome «Indietro» si prende tutta la riga', sunome.largo, JSON.stringify(sunome));
  tac.t('dopo il nome AVANTI torna in basso', sunome.torna, JSON.stringify(sunome));

  /* un tasto da solo si prende tutta la riga */
  await p.evaluate(()=>{ go('idle'); apriMacchine(); });
  await p.waitForTimeout(400);
  tac.t('«HO CAPITO» da solo si prende tutta la riga', await p.evaluate(()=>{
    const r = document.querySelector('#velo .navrow');
    return Math.abs(r.firstElementChild.offsetWidth - r.clientWidth) <= 1;
  }));
  await p.evaluate(()=> chiudiMacchine());

  /* ── le parole delle risposte ── */
  const testi = await p.evaluate(()=> QA.map(x => ({q:x.q, a:x.a, piu:x.piu || ''})));
  const trova = frammento => testi.find(x => x.q.includes(frammento)) || {q:'', a:'', piu:''};

  const amica = trova('un\'amica');
  tac.t('con l\'amica: in capsula si accomoda una persona alla volta',
    /si accomoda/.test(amica.a) && !/si entra uno per volta/.test(amica.a), amica.a);
  tac.t('con l\'amica: le due sedute non «si scambiano»',
    !/si scambiano/.test(amica.piu) && /una dopo l\'altra/.test(amica.piu), amica.piu);

  const quanto = trova('Ogni quanto');
  tac.t('ogni quanto: si puo\' venire tutti i giorni',
    /tutti i giorni/.test(quanto.a), quanto.a);
  tac.t('ogni quanto: il momento migliore e\' dopo un macchinario',
    /dopo un macchinario/.test(quanto.a), quanto.a);
  tac.t('ogni quanto: il perche\' sono i 20,3 milioni di combinazioni',
    /20,3 milioni/.test(quanto.piu), quanto.piu);
  tac.t('ogni quanto: non si dice piu\' «una volta a settimana»',
    !/una volta a settimana/.test(quanto.a + quanto.piu));

  /* l'Health Check non fa piu' parte della seduta: sulla capsula vera
     ferma il programma e sposta la poltrona. Nessuna risposta del totem
     deve prometterlo al cliente, ne' la musica, che cambia programma */
  const tutto = testi.map(x => x.q + ' ' + x.a + ' ' + x.piu).join(' ');
  tac.t('nessuna risposta parla piu\' di Health Check, sensore o START/END',
    !/Health Check|sensore|\bSTART\b|\bEND\b/.test(tutto),
    (tutto.match(/.{0,40}(Health Check|sensore|START|END).{0,40}/) || [''])[0]);
  tac.t('nessuna risposta promette la musica in seduta',
    !/musica/i.test(tutto), (tutto.match(/.{0,40}musica.{0,40}/i) || [''])[0]);
  const fine = trova('quando finisco');
  tac.t('a fine seduta si chiede com\'era l\'intensita\'',
    /intensit/.test(fine.piu), fine.piu);

  /* ── la domanda «massaggio completo o solo aria» ──
     si fa solo quando cambia davvero la seduta, e la risposta arriva al
     gestionale dentro il biglietto del check-in */
  const aria = await p.evaluate(()=>{
    const conDomanda = q => { Object.assign(D, {activity:'', zones:[], goal:'', aria:''}, q);
      return passi().some(x => x.k === 'aria'); };
    const r = {
      ems2: conDomanda({activity:'ems2', goal:'recupero'}),
      vacufit: conDomanda({activity:'vacufit', goal:'relax'}),
      gambe: conDomanda({activity:'ems', zones:['gambe'], goal:'recupero'}),
      drenaggio: conDomanda({activity:'riposo', goal:'drenaggio'}),
      ems: conDomanda({activity:'ems', zones:['lombare'], goal:'recupero'}),
      relax: conDomanda({activity:'riposo', zones:['cervicale'], goal:'relax'}),
      matrix: conDomanda({activity:'matrix', zones:['braccia'], goal:'recupero'})
    };
    Object.assign(D, {activity:'vacufit', zones:[], goal:'drenaggio', mood:'sereno', pressione:'media', aria:'soloaria'});
    r.p23 = costruisciProtocollo(D).prog;
    /* tornando indietro e cambiando attivita' la risposta vecchia non vale piu' */
    Object.assign(D, {activity:'ems', zones:['lombare'], goal:'recupero'});
    r.vecchia = costruisciProtocollo(D).prog;
    Object.assign(D, {activity:'', zones:[], goal:'', mood:'', pressione:'', aria:''});
    return r;
  });
  tac.t('la domanda sull\'aria c\'e\' dopo EMS2, Vacutherm, con le gambe e per il drenaggio',
    aria.ems2 && aria.vacufit && aria.gambe && aria.drenaggio, JSON.stringify(aria));
  tac.t('la domanda sull\'aria non c\'e\' dopo EMS, Matrix o per il relax della cervicale',
    !aria.ems && !aria.relax && !aria.matrix, JSON.stringify(aria));
  tac.t('«solo aria» sul totem porta al P23', aria.p23 === 'P23', aria.p23);
  tac.t('una risposta «solo aria» rimasta indietro non vale quando la domanda non c\'e\' piu\'',
    aria.vecchia !== 'P23', aria.vecchia);

  /* ── quante risposte ci sono: il numero si vede, e non si aggiorna a mano ── */
  const conta = await p.evaluate(()=>{
    document.getElementById('avatar').onclick();
    const sot = document.getElementById('asksot').textContent;
    const nums = [...document.querySelectorAll('#filtri .fnum')].map(e=> +e.textContent);
    go('idle');
    return {n: QA.length, sot, somma: nums.reduce((a,b)=> a+b, 0), bolle: BUBBLES.some(b=> b.includes('{N}')) && !BUBBLES.some(b=> /\b3[0-9]\b/.test(b))};
  });
  tac.t('la pagina delle domande dice quante risposte ci sono',
    conta.sot.includes(conta.n + ' risposte'), conta.sot);
  tac.t('i numeri sui quattro temi fanno il totale', conta.somma === conta.n, conta.somma + ' su ' + conta.n);
  tac.t('la riga delle domande dice il numero delle risposte, mai scritto a mano', conta.bolle);

  /* ── la tastiera del nome: apostrofo e accenti ── */
  const tast = await p.evaluate(()=>{
    startCheck(); D.nome = ''; D.cogn = ''; FIELD = 'cogn';
    ['D',"'",'A','N','G','E','L','O'].forEach(c=> kbType(c));
    const cogn = D.cogn;
    FIELD = 'nome'; ['N','I','C','O','L','O'].forEach(c=> kbType(c)); kbAccento();
    const nome = D.nome;
    const trova = norm("D'Angelo").indexOf(norm('dangelo')) === 0;
    const passo = (PASSO = 2, etichettaPasso(passi(), 2));
    go('idle');
    return {cogn, nome, trova, passo};
  });
  tac.t('si scrive D\'Angelo, con la maiuscola dopo l\'apostrofo', tast.cogn === "D'Angelo", tast.cogn);
  tac.t('si scrive Nicolò con il tasto degli accenti', tast.nome === 'Nicolò', tast.nome);
  tac.t('«dangelo» senza apostrofo trova lo stesso D\'Angelo', tast.trova);
  tac.t('il passo non dice «di N»: il totale cambierebbe a meta\' strada', !/ DI /.test(tast.passo), tast.passo);

  /* ── la tastiera del telefono ── */
  const tel = await p.evaluate(()=>{
    startCheck();
    const kb = [...document.querySelectorAll('#kb .kbrow')].map(r=> r.children.length);
    const alto = document.querySelector('#kb .key').offsetHeight;
    cambiaModo('cell');
    const soloNumeri = !!document.querySelector('#kb.numpad') && !document.querySelector('#kb .kbrow');
    ['3','3','3','1','2','3','4'].forEach(k=> numType(k));
    const campo = document.querySelector('#f-cell').textContent;
    const sotto = document.getElementById('fqs').textContent;
    go('idle');
    return {kb, alto, soloNumeri, campo, sotto};
  });
  tac.t('la tastiera ha le file del telefono: 10, 9, 9, 3', JSON.stringify(tel.kb) === '[10,9,9,3]', JSON.stringify(tel.kb));
  tac.t('i tasti sono alti almeno 120 punti', tel.alto >= 120, tel.alto + '');
  tac.t('toccando CELLULARE resta solo il tastierino dei numeri', tel.soloNumeri);
  tac.t('il numero si legge a gruppi: 333 123 4', /333 123 4/.test(tel.campo), tel.campo);
  tac.t('col cellulare la frase sotto parla del numero', /cellulare/i.test(tel.sotto), tel.sotto);

  /* ── «✓ Sei tu» che dopo un secondo e mezzo diventa AVANTI ── */
  const seitu = await p.evaluate(async ()=>{
    /* un cliente di prova, messo e tolto qui dentro */
    const vecchio = localStorage.getItem('zfl_app_v1');
    const db = JSON.parse(vecchio || '{}');
    db.clients = (db.clients || []).concat([{id:'cprovaseitu', nome:'Eliana', cognome:'Cascone', telefono:'3331234567', anamnesi:{}}]);
    localStorage.setItem('zfl_app_v1', JSON.stringify(db));
    startCheck(); scegliCliente('cprovaseitu');
    const prima = document.querySelector('.trov .go').textContent;
    await new Promise(r=> setTimeout(r, 1900));
    const g = document.querySelector('.trov .go');
    const dopo = g.textContent, tasto = g.classList.contains('avanti');
    g.click();
    const passo = passi()[PASSO].k;
    go('idle');
    if(vecchio === null) localStorage.removeItem('zfl_app_v1'); else localStorage.setItem('zfl_app_v1', vecchio);
    return {prima, dopo, tasto, passo};
  });
  {
    tac.t('riconosciuto il cliente compare «✓ Sei tu»', /Sei tu/.test(seitu.prima), seitu.prima);
    tac.t('dopo un secondo e mezzo al suo posto c\'e\' AVANTI, e porta avanti',
      /AVANTI/.test(seitu.dopo) && seitu.tasto && seitu.passo !== 'nome', JSON.stringify(seitu));
  }

  /* ── i premi visti dal totem: stessi conti del gestionale ── */
  const pt = await p.evaluate(()=>{
    const vecchio = localStorage.getItem('zfl_app_v1');
    const t0 = Date.parse('2026-01-05T10:00:00Z');
    const sed = (id, n, passo) => Array.from({length:n}, (_, i) => ({id: id + i, clientId: id,
      date: new Date(t0 + i * passo * 864e5).toISOString(), fam:'Z8', prog:'P01', quiz:{}, settings:{timer:20}}));
    const FIX = {clients:[
        {id:'cA', nome:'Anna', cognome:'Prova', anamnesi:{}, premiUsati:{'g1-1-b':{data:'2026-04-01T10:00:00Z'}}, premiScelte:{'g1-1-r':{a:'cB', data:'2026-04-01T10:00:00Z'}}},
        {id:'cB', nome:'Bruno', cognome:'Prova', anamnesi:{}}],
      sessions: sed('cA', 26, 7).concat(sed('cB', 3, 7))};
    localStorage.setItem('zfl_app_v1', JSON.stringify(Object.assign(JSON.parse(vecchio || '{}'), FIX)));
    const a = premiStato('cA', '2026-07-10T10:00:00Z'), b = premiStato('cB', '2026-07-10T10:00:00Z');
    const r = {a:{k:a.k, manca:a.manca, daUsare:a.daUsare, scade:new Date(a.scade).toISOString().slice(0,10)},
               b:{k:b.k, manca:b.manca, daUsare:b.daUsare}};
    /* il riquadro della schermata finale */
    D.clienteId = 'cB'; D.op = null; r.boxB = premiBoxHTML();
    D.clienteId = null; r.boxNuovo = premiBoxHTML();
    if(vecchio === null) localStorage.removeItem('zfl_app_v1'); else localStorage.setItem('zfl_app_v1', vecchio);
    return r;
  });
  tac.t('il totem conta i premi come il gestionale',
    pt.a.k === 39 && pt.a.manca === 13 && pt.a.daUsare === 2 && pt.a.scade === '2026-10-07'
    && pt.b.k === 13 && pt.b.manca === 10 && pt.b.daUsare === 1, JSON.stringify(pt));
  tac.t('a fine check-in il cliente vede quante sedute gli mancano e la seduta ricevuta in regalo',
    /ti mancano 9 sedute/.test(pt.boxB) && /1 seduta vinta/.test(pt.boxB), pt.boxB.slice(0, 200));
  tac.t('chi viene per la prima volta legge come si vincono i premi', /Da oggi ogni seduta vale 10 punti/.test(pt.boxNuovo));

  /* ── il regolamento dei premi, dalla risposta sui premi ── */
  const reg = await p.evaluate(()=>{
    const i = QA.findIndex(x => /vincere delle sedute/.test(x.q));
    if(i < 0) return {trovata:false};
    apriRisposta(i);
    const tasto = document.querySelector('#rbody .aprireg');
    if(tasto) tasto.click();
    const r = {trovata:true, tasto: !!tasto, aperto: document.getElementById('regola').classList.contains('on'),
      voci: document.querySelectorAll('#rlist .rg').length, esempi: document.querySelectorAll('#rlist .rge').length,
      inVetrina: DOMANDE_VETRINA.includes(QA[i].q)};
    go('idle'); r.chiuso = !document.getElementById('regola').classList.contains('on');
    return r;
  });
  tac.t('«Posso vincere delle sedute omaggio?» apre il regolamento dei premi',
    reg.trovata && reg.tasto && reg.aperto && reg.voci === 8 && reg.esempi === 2 && reg.inVetrina, JSON.stringify(reg));
  tac.t('tornando alla vetrina il regolamento si chiude', reg.chiuso);

  /* ── «Sono io» / «Non sono io» ──
     con una scheda sola da confermare, AVANTI chiede prima chi sei */
  const chi = await p.evaluate(()=>{
    const vecchio = localStorage.getItem('zfl_app_v1');
    const db = JSON.parse(vecchio || '{}');
    db.clients = (db.clients || []).concat([{id:'cprovachi', nome:'Eliana', cognome:'Cascone', telefono:'3331234567', anamnesi:{}}]);
    localStorage.setItem('zfl_app_v1', JSON.stringify(db));
    const scrivi = ()=>{ startCheck(); D.nome=''; D.cogn=''; FIELD='nome';
      ['E','L','I','A','N','A'].forEach(c=> kbType(c)); FIELD='cogn'; ['C','A','S'].forEach(c=> kbType(c)); };
    const r = {};
    scrivi();
    r.dueTasti = !!document.querySelector('.trov .go.si') && !!document.querySelector('.scelta.sotto .no');
    { const a = document.querySelector('.trov .go.si'), b = document.querySelector('.scelta.sotto .no'), t = document.querySelector('.trov');
      r.posto = a.closest('.trov') === t && b.getBoundingClientRect().top > t.getBoundingClientRect().bottom
        && Math.abs(b.offsetWidth - b.parentElement.clientWidth) <= 2; }
    passoAvanti();
    r.domanda = !!document.querySelector('.match.domanda') && passi()[PASSO].k === 'nome';
    document.querySelector('.trov .go.si').click();
    r.si = D.clienteId === 'cprovachi';
    scrivi(); passoAvanti();
    document.querySelector('.match.domanda .scelta.sotto .no').click();
    r.no = !D.clienteId && passi()[PASSO].k !== 'nome' && D.cogn === 'Cas';
    scrivi(); kbGo();
    r.tastiera = !!document.querySelector('.match.domanda') && !D.clienteId;
    go('idle');
    if(vecchio === null) localStorage.removeItem('zfl_app_v1'); else localStorage.setItem('zfl_app_v1', vecchio);
    return r;
  });
  tac.t('«Sei tu?» ha «Sono io» e «Non sono io»', chi.dueTasti, JSON.stringify(chi));
  tac.t('«Sono io» sta nella scheda, dove poi compare AVANTI; «Non sono io» sotto a tutta larghezza', chi.posto, JSON.stringify(chi));
  tac.t('AVANTI con una scheda da confermare chiede «Sei tu?» invece di andare avanti', chi.domanda, JSON.stringify(chi));
  tac.t('«Sì, sono io» apre la scheda', chi.si);
  tac.t('«No, sono una persona nuova» va avanti col nome scritto, senza la scheda', chi.no, JSON.stringify(chi));
  tac.t('anche l\'AVANTI della tastiera chiede, invece di scegliere da solo', chi.tastiera);

  await p.close();
  return tac;
};
