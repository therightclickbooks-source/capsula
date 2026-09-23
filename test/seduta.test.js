/* ═══════════════════════════════════════════════════════════════
   LA SEDUTA COME LA FA LA CAPSULA VERA
   Il costruttore non ha una modalita' professionale: la capsula,
   appena si accende il tablet, controlla la posizione e fa partire da
   sola un programma di default. Toccare le cose fuori ordine la fa
   ripartire. Quindi i passi guidati devono seguire il suo ordine, non
   il nostro:
     pulsantiera laterale a monitor spento → accensione e Pausa →
     programma → Timing PER PRIMO → tutto il resto.
   E devono tacere su quello che sulla capsula non si puo' fare in
   seduta: l'Health Check (ferma il programma e sposta la poltrona), la
   musica (cambia programma), i livelli di Leg Kneading e Foot Roller
   (non ne hanno).
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, Taccuino } = require('./aiuto');

function archivio(){
  const anamnesi = {certificatoOk:false};
  ['a1','a2','a3','a4','a5','a6',
   'b1','b2','b3','b4','b5','b6','b7','b8','b9'].forEach(k=> anamnesi[k] = false);
  return {codeHash:'x', codeLen:4,
    clients:[{id:'cprova', nome:'Prova', cognome:'Seduta', telefono:'3330000000',
              anamnesi, cal:0, calTuned:false}],
    sessions:[{id:'s0', clientId:'cprova', date:'2026-01-01T10:00:00.000Z'}],
    operators:[{id:'o1', nome:'Raffaele'}], checkins:[]};
}

const ATTIVITA  = ['ems','ems2','vacufit','matrix','riposo'];
const OBIETTIVI = ['recupero','sollievo','drenaggio','relax','sonno','energia'];
const ZONE = [[], ['gambe'], ['braccia'], ['cervicale','spalle'], ['lombare'], ['braccia','gambe']];
const PRESSIONI = ['dolce','media','decisa'];

module.exports = async function(browser){
  const tac = new Taccuino('la seduta come la fa la capsula');
  const p = await browser.newPage({viewport:{width:820, height:1200}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  await p.addInitScript(d => {
    try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){}
  }, archivio());
  await p.goto(GESTIONALE);
  await p.waitForTimeout(700);

  /* tutti i passi di tante sedute diverse, ridotti a testo e marcatori */
  const casi = [];
  for(const activity of ATTIVITA) for(const goal of OBIETTIVI)
    for(const zones of ZONE) for(const pressione of PRESSIONI)
      casi.push({activity, goal, zones, pressione, mood:'sereno'});
  const sedute = await p.evaluate(casi => casi.map(q => {
    const prot = buildProtocol(DB.clients[0], Object.assign({prefSoloAria:false}, q));
    prot.quizZones = q.zones;
    return {q, prog: prot.prog, S: prot.S,
      passi: buildSteps(prot).map(s => ({img: s.img, kind: s.kind || '', titolo: s.title,
        testo: s.title + ' ' + (s.extra || '') + ' ' + s.markers.map(m => m.label).join(' '),
        marcatori: s.markers.map(m => ({pos: m.pos, label: m.label, type: m.type || ''}))}))};
  }), casi);

  const ogni = f => sedute.filter(s => !f(s));

  let no = ogni(s => s.passi[0].img === null && /pulsantiera/.test(s.passi[0].titolo)
                   && /monitor ancora spento/.test(s.passi[0].titolo));
  tac.t('il primo passo e\' la pulsantiera, a monitor spento', !no.length,
    no.length + ' sedute, per es. ' + (no[0] ? no[0].passi[0].titolo : ''));

  no = ogni(s => /Pausa|pausa/.test(s.passi[1].testo) && s.passi[1].img === 'auto');
  tac.t('il secondo passo accende il tablet e mette in Pausa il programma di default', !no.length,
    no.length + ' sedute');

  no = ogni(s => {
    const t = s.passi.findIndex(x => /Timing/.test(x.titolo));
    const r = s.passi.findIndex(x => /Regola i parametri/.test(x.titolo));
    const prog = s.passi.findIndex(x => /programma/i.test(x.titolo) && /modes|home/.test(x.img || ''));
    return t > 0 && r > t && prog >= 0 && prog < t;
  });
  tac.t('il Timing viene subito dopo il programma e prima di ogni altro parametro', !no.length,
    no.length + ' sedute, per es. ' + (no[0] ? no[0].passi.map(x => x.titolo).join(' | ') : ''));

  const vietate = /Health Check|\bSTART\b|\bEND\b|Music\b|Musica|musica/;
  no = ogni(s => !s.passi.some(x => vietate.test(x.titolo) || x.marcatori.some(m => vietate.test(m.label))
                                   || x.kind === 'start' || x.kind === 'end'));
  tac.t('nessun passo fa toccare Health Check o musica', !no.length,
    no.length + ' sedute, per es. ' + (no[0] ? (no[0].passi.find(x => vietate.test(x.testo)) || {}).titolo : ''));

  no = ogni(s => s.passi.every(x => x.marcatori.every(m =>
    !/Leg Kneading|Foot Roller/.test(m.label) || /non ha livelli/.test(m.label))));
  tac.t('Leg Kneading e Foot Roller si accendono soltanto, senza livelli', !no.length, no.length + ' sedute');

  no = ogni(s => s.passi.every(x => x.marcatori.every(m => {
    const v = (m.label.match(/porta il valore a <b>(\d+)<\/b>/) || [])[1];
    return v === undefined || +v <= 3;
  })));
  tac.t('i passi non chiedono mai un valore oltre il 3', !no.length, no.length + ' sedute');

  no = ogni(s => /intensit/.test(s.passi[s.passi.length - 1].titolo));
  tac.t('l\'ultimo passo chiede com\'era l\'intensita\'', !no.length, no.length + ' sedute');

  /* le icone degli airbag: l'ordine del nostro display, non del libretto.
     Da sinistra braccio flesso, mano, ginocchio, piede, figura seduta. */
  const icone = await p.evaluate(()=> TILE.airbag);
  tac.t('le icone airbag vanno da sinistra a destra: spalle, braccia, vita, gambe, corpo intero',
    icone.SPALLE[0] < icone.BRACCIA[0] && icone.BRACCIA[0] < icone.VITA[0]
      && icone.VITA[0] < icone.GAMBE[0] && icone.GAMBE[0] < icone.TUTTO[0], JSON.stringify(icone));
  const gambe = sedute.find(s => s.q.zones.join() === 'braccia,gambe' && s.prog !== 'P23');
  const zonePasso = gambe && gambe.passi.find(x => x.img === 'airbag');
  tac.t('«gambe» accende la quarta icona (il piede), «braccia» la seconda (la mano)',
    !!zonePasso && zonePasso.marcatori.some(m => m.pos[0] === icone.GAMBE[0] && /gambe/.test(m.label))
      && zonePasso.marcatori.some(m => m.pos[0] === icone.BRACCIA[0] && /braccia/.test(m.label)),
    zonePasso ? JSON.stringify(zonePasso.marcatori) : 'nessun passo airbag');

  /* le zone degli airbag le decide il protocollo: nella seduta solo aria
     ci sono sempre, e sono icone precise, non «tocca quelle desiderate» */
  const aria = await p.evaluate(()=>{
    const c = DB.clients[0];
    const giro = q => { const pr = buildProtocol(c, Object.assign({prefSoloAria:true}, q));
      pr.quizZones = q.zones; return buildSteps(pr).filter(x => x.img === 'airbag')
        .map(x => x.markers.map(m => m.label)); };
    return {
      drenaggio: giro({activity:'riposo', zones:[], goal:'drenaggio', mood:'sereno', pressione:'media'}),
      relax:     giro({activity:'riposo', zones:[], goal:'relax', mood:'sereno', pressione:'media'}),
      lombare:   giro({activity:'ems', zones:['lombare'], goal:'recupero', mood:'sereno', pressione:'media'}),
      tante:     giro({activity:'ems', zones:['cervicale','braccia','lombare','gambe'], goal:'recupero', mood:'sereno', pressione:'media'})
    };
  });
  tac.t('solo aria, drenaggio senza zone: il protocollo accende gambe e piedi',
    aria.drenaggio.length === 1 && aria.drenaggio[0].length === 1 && /gambe e piedi/.test(aria.drenaggio[0][0]),
    JSON.stringify(aria.drenaggio));
  tac.t('solo aria, relax senza zone: corpo intero', aria.relax.length === 1 && /corpo intero/.test(aria.relax[0].join()),
    JSON.stringify(aria.relax));
  tac.t('solo aria con la lombare: vita e fianchi', aria.lombare.length === 1 && /vita e fianchi/.test(aria.lombare[0].join()),
    JSON.stringify(aria.lombare));
  tac.t('quattro zone diverse: si accende direttamente corpo intero',
    aria.tante.length === 1 && aria.tante[0].length === 1 && /corpo intero/.test(aria.tante[0][0]), JSON.stringify(aria.tante));
  tac.t('nessun passo dice piu\' «tocca quelle desiderate»',
    !JSON.stringify(aria).includes('desiderate'));

  /* una seduta salvata prima della scala 0-3 (airbag a 5) ripetuta oggi
     torna sulla scala della capsula */
  const ripetuta = await p.evaluate(()=>{
    DB.sessions.push({id:'svecchia', clientId:'cprova', date:'2026-09-01T10:00:00.000Z', prog:'P23', fam:'Z3',
      settings:{intensita:0, fourD:0, airbag:5, calore:true, ioni:false, zerog:true, timer:20, plantari:0, polpacci:0},
      quiz:{zones:[], goal:'drenaggio', activity:'riposo'}});
    DB.operators = [];
    repeatSession('svecchia');
    const S = currentProt.S, air = document.body.innerText;
    DB.sessions = DB.sessions.filter(x => x.id !== 'svecchia');
    return {airbag: S.airbag, testo: /porta il valore a 5/.test(air)};
  });
  tac.t('ripetere una seduta vecchia con airbag a 5 la riporta a 3', ripetuta.airbag === 3 && !ripetuta.testo,
    JSON.stringify(ripetuta));

  /* ── la parte bassa: Down movement con ioni, velocita' e rulli plantari ──
     relax o sonno con gambe o piedi, e nessun allenamento: comanda
     l'obiettivo, e le gambe si curano dalla pagina Down movement */
  const basso = await p.evaluate(()=>{
    const c = DB.clients[0];
    const giro = q => { const pr = buildProtocol(c, Object.assign({prefSoloAria:false}, q));
      pr.quizZones = q.zones; const st = buildSteps(pr).find(x => x.img === 'manualDown');
      return {prog: pr.prog, ioni: pr.S.ioni, plantari: pr.S.plantari, mb: pr.manualBasso,
        passo: st ? st.markers.map(m => m.label) : null}; };
    return {
      relax: giro({activity:'riposo', zones:['gambe'], goal:'relax', mood:'sereno', pressione:'media'}),
      sonno: giro({activity:'riposo', zones:['gambe','piedi'], goal:'sonno', mood:'stanco', pressione:'media'}),
      drenaggio: giro({activity:'riposo', zones:['gambe'], goal:'drenaggio', mood:'sereno', pressione:'media'})
    };
  });
  tac.t('relax con le gambe: Down movement, ioni accesi, velocita\' e rulli plantari a 2',
    !!basso.relax.passo && basso.relax.ioni && basso.relax.plantari === 1
      && /Down movement/.test(basso.relax.passo[0]) && /velocità a <b>2<\/b>/.test(basso.relax.passo.join())
      && /livello <b>2<\/b>/.test(basso.relax.passo.join()), JSON.stringify(basso.relax));
  tac.t('sonno con gambe e piedi: tutto piu\' lento, velocita\' e rulli plantari a 1',
    !!basso.sonno.passo && basso.sonno.ioni && /velocità a <b>1<\/b>/.test(basso.sonno.passo.join())
      && /livello <b>1<\/b>/.test(basso.sonno.passo.join()), JSON.stringify(basso.sonno));
  tac.t('il drenaggio con le gambe resta la leggerezza, senza Down movement',
    basso.drenaggio.prog === 'P08' && !basso.drenaggio.passo, JSON.stringify(basso.drenaggio));

  /* ── la ripetizione si porta dietro le rifiniture manuali ── */
  const rip = await p.evaluate(()=>{
    const c = DB.clients[0];
    const q = {activity:'ems', zones:['cervicale','braccia','dorsale'], goal:'recupero', mood:'sereno', pressione:'media'};
    const pr = buildProtocol(c, Object.assign({prefSoloAria:false}, q));
    /* una seduta vecchia, salvata senza la rifinitura: si ricalcola */
    DB.sessions.push({id:'srip', clientId:c.id, date:'2026-09-20T10:00:00.000Z', prog:pr.prog, fam:pr.fam,
      settings:{...pr.S}, scala:'capsula', quiz:q});
    DB.operators = [];
    repeatSession('srip');
    const st = buildSteps(currentProt).map(x => x.title);
    DB.sessions = DB.sessions.filter(x => x.id !== 'srip');
    return {prog: pr.prog, titoli: st};
  });
  tac.t('ripetendo il P04 torna la rifinitura manuale sul punto',
    rip.titoli.some(t => /Rifinitura manuale sul punto/.test(t)), JSON.stringify(rip));

  /* ogni marcatore abbraccia il suo tasto: porta con se' misura e forma
     del tasto (cerchio o rettangolo), non un cerchio fisso appoggiato li'
     vicino */
  no = ogni(s => s.passi.every(x => x.marcatori.every(m =>
    m.pos.length === 5 && m.pos[2] > 0 && m.pos[3] > 0 && ['c','r'].includes(m.pos[4])
    && m.pos[0] - m.pos[2]/2 >= 0 && m.pos[0] + m.pos[2]/2 <= 100
    && m.pos[1] - m.pos[3]/2 >= 0 && m.pos[1] + m.pos[3]/2 <= 100)));
  tac.t('ogni marcatore ha forma e misura del suo tasto, dentro la schermata', !no.length,
    no.length + ' sedute, per es. ' + (no[0] ? JSON.stringify(no[0].passi.flatMap(x => x.marcatori)
      .find(m => m.pos.length !== 5)) : ''));

  /* la pagina della proposta: niente blocchi, niente IN/OUT, niente musica */
  const pagina = await p.evaluate(()=>{
    quizState = {clientId:'cprova', activity:'ems', zones:['gambe'], goal:'recupero',
                 mood:'sereno', pressione:'media', prefSoloAria:false};
    go('proposal');
    const b = document.getElementById('okbtn');
    const griglia = document.querySelector('.settinggrid').textContent;
    return {abilitato: !!b && !b.disabled, griglia, tutto: document.body.innerText};
  });
  tac.t('il tasto OK della seduta e\' subito attivo, senza START da spuntare', pagina.abilitato);
  tac.t('i riquadri dei valori mostrano Leg Kneading e Foot Roller come ON/OFF e niente musica',
    /Leg Kneading/.test(pagina.griglia) && /Foot Roller/.test(pagina.griglia)
      && !/Musica|Rulli piedi/.test(pagina.griglia), pagina.griglia.replace(/\s+/g, ' '));
  tac.t('la proposta non parla di Health Check, START o END',
    !/Health Check|\bSTART\b|\bEND\b/.test(pagina.tutto));

  /* il riquadro del Timing sta davvero sul tasto Timing: il quadrato
     ambra e' largo, e il vecchio calcolo lo spingeva in alto */
  await p.waitForTimeout(600);
  const quadrato = await p.evaluate(()=>{
    const g = [...document.querySelectorAll('.gstep')].find(x => /Timing/.test(x.querySelector('.gt').textContent));
    const sh = g.querySelector('.shot'), m = sh.querySelector('.marker');
    return {cy: (m.offsetTop + (parseFloat(m.style.marginTop) || 0)) / sh.clientHeight};
  });
  tac.t('il quadrato del Timing resta sul tasto Timing', Math.abs(quadrato.cy - 0.92) < 0.02,
    'al ' + Math.round(quadrato.cy * 100) + '% invece del 92%');

  /* la scheda cliente: i macro-parametri parlano la scala del display */
  const scheda = await p.evaluate(()=>{
    editClient('cprova');
    const t = document.body.innerText;
    const prima = MDRAFT.fourD;
    stepCap('fourD', 1); stepCap('fourD', 1); stepCap('fourD', 1); stepCap('fourD', 1);
    const alMassimo = document.getElementById('sv_fourD').textContent;
    return {t, alMassimo, salvato: MDRAFT.fourD, prima,
            scalaDiNuovo: scalaCapsula(MDRAFT.fourD)};
  });
  tac.t('nella scheda cliente Leg Kneading e Foot Roller sono interruttori, senza «0–3»',
    /Leg Kneading/.test(scheda.t) && /Foot Roller/.test(scheda.t) && !/Rulli plantari\s*0–3/.test(scheda.t));
  tac.t('nella scheda cliente 4D e airbag si fermano al 3, e il 3 salvato torna 3',
    scheda.alMassimo === '3' && scheda.scalaDiNuovo === 3, JSON.stringify(scheda, ['alMassimo','salvato','scalaDiNuovo']));

  console.log('   (' + sedute.length + ' sedute passate al setaccio)');
  await p.close();
  return tac;
};
