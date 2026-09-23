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
    return {n: QA.length, sot, somma: nums.reduce((a,b)=> a+b, 0), bolle: BUBBLES.every(b=> b.includes('{N}'))};
  });
  tac.t('la pagina delle domande dice quante risposte ci sono',
    conta.sot.includes(conta.n + ' risposte'), conta.sot);
  tac.t('i numeri sui quattro temi fanno il totale', conta.somma === conta.n, conta.somma + ' su ' + conta.n);
  tac.t('la faccina in home dice il numero delle risposte', conta.bolle);

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

  await p.close();
  return tac;
};
