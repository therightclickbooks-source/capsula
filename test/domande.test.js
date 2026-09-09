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
  tac.t('ogni quanto: il perche\' sono i 25,3 milioni di combinazioni',
    /25,3 milioni/.test(quanto.piu), quanto.piu);
  tac.t('ogni quanto: non si dice piu\' «una volta a settimana»',
    !/una volta a settimana/.test(quanto.a + quanto.piu));

  const hc = trova('Health Check');
  tac.t('health check: e\' una misurazione, non una misura',
    /misurazione/.test(hc.a) && hc.a.indexOf('Una <b>misura c') < 0, hc.a);
  tac.t('health check: legge diversi valori, con attenzione particolare a due',
    /diversi valori/.test(hc.a) && /attenzione particolare/.test(hc.a), hc.a);

  await p.close();
  return tac;
};
