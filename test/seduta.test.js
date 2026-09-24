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

  /* ── il QR del telefono mostra gli stessi passi del tablet ── */
  const qr = await p.evaluate(()=>{
    const c = DB.clients[0];
    const giro = q => { const pr = buildProtocol(c, Object.assign({prefSoloAria:false}, q)); pr.quizZones = q.zones;
      const tab = buildSteps(pr).map(x => x.title + '|' + x.markers.length);
      const tel = decodificaSeduta(codificaSeduta(pr, 'Prova', q.zones));
      return {tab, tel: buildSteps(tel).map(x => x.title + '|' + x.markers.length)}; };
    return [giro({activity:'ems', zones:['cervicale','braccia','dorsale'], goal:'recupero', mood:'sereno', pressione:'media'}),
            giro({activity:'riposo', zones:['gambe','piedi'], goal:'relax', mood:'sereno', pressione:'media'})];
  });
  tac.t('dal QR il telefono ha gli stessi passi del tablet (rifinitura sul punto e Down movement compresi)',
    qr.every(x => JSON.stringify(x.tab) === JSON.stringify(x.tel)), JSON.stringify(qr.map(x => x.tel)));
  tac.t('i vecchi QR senza rifiniture si aprono ancora',
    await p.evaluate(()=> !!decodificaSeduta('Z3.P08.2.2.3.1.0.1.25.1.1..Prova.gambe')));

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

  /* la chiusura: la compila l'operatore ma la legge anche il cliente */
  const chiusura = await p.evaluate(()=>{
    const c = DB.clients[0];
    const base = {clientId:c.id, prog:'P08', zCode:'x', settings:{timer:25}, points:10,
      quiz:{activity:'vacufit', goal:'drenaggio', mood:'stanco', zones:['gambe']}};
    const r = {fam:{}, testi:[]};
    Object.keys(ZFAM).forEach((f, i)=>{
      const s = Object.assign({id:'schiu' + i, date:'2026-02-0' + (i + 1) + 'T10:00:00.000Z', fam:f}, base);
      DB.sessions.push(s);
      VIEW = {name:'closing', id:c.id, sid:s.id, lvUp:false}; render();
      const t = document.getElementById('app').innerText;
      r.fam[f] = document.querySelectorAll('.dopo .dx').length === 3 && !!document.querySelector('.prossima');
      r.testi.push(t);
      r.tasti = [...document.querySelectorAll('.fbtn .fbt')].map(b => b.textContent).join('|');
      r.nome = (r.nome !== false) && !!document.querySelector('.lettera .nm') && /Prova/.test(document.querySelector('.ch-nome').textContent);
      r.ids = (r.ids || []).concat([messaggioZenith(c, s).ids]);
    });
    DB.sessions = DB.sessions.filter(s => !/^schiu/.test(s.id));
    return r;
  });
  tac.t('la chiusura ha le tre cose da portare a casa e la prossima, per ogni famiglia',
    Object.values(chiusura.fam).every(Boolean), JSON.stringify(chiusura.fam));
  tac.t('il messaggio di Zenith chiama il cliente per nome, in oro', chiusura.nome);
  { let uguali = 0;
    for(let i = 1; i < chiusura.ids.length; i++)
      uguali += chiusura.ids[i].filter(x => chiusura.ids[i - 1].includes(x) && !/^c-fb|^a-liv|^a-dec/.test(x)).length;
    tac.t('due sedute di fila non hanno frasi del messaggio in comune', !uguali, uguali + ' frasi ripetute ' + JSON.stringify(chiusura.ids)); }
  { const sanitarie = chiusura.testi.filter(t => /Trombosi|Pacemaker|Gravidanza|Tumore|Diabete|certificato/i.test(t));
    tac.t('il messaggio non tira mai fuori l\'anamnesi sanitaria', !sanitarie.length); }
  tac.t('la pressione a fine seduta si sceglie come prima',
    chiusura.tasti === 'Troppo forte|Perfetta|Troppo leggera', chiusura.tasti);
  { const vietate = /vend|propor|lascialo parlare|silenzio|momento d.oro|ora ne ha\b/i;
    const no = chiusura.testi.filter(t => vietate.test(t));
    tac.t('la chiusura parla al cliente: niente copioni di vendita a vista', !no.length,
      no.length ? (no[0].match(vietate) || [''])[0] : ''); }

  /* i premi: le regole scritte nel regolamento, fatte a conti */
  const premi = await p.evaluate(()=>{
    const salva = DB.sessions, clienti = DB.clients;
    const giro = (passo, quante) => {
      const c = {id:'cpremi', nome:'Premio', cognome:'Prova', anamnesi:{}};
      DB.clients = clienti.concat([c]);
      const t0 = new Date('2025-01-06T10:00:00Z').getTime();
      DB.sessions = salva.concat(Array.from({length: quante}, (_, i) => ({id:'sp' + i, clientId:'cpremi',
        date: new Date(t0 + i * passo * 864e5).toISOString(), fam:'Z8', prog:'P01', quiz:{}, settings:{timer:20}})));
      const v = premiCliente(c).flatMap(p => p.voci);
      return {te: v.filter(x => x.tipo === 'te').length, regalo: v.filter(x => x.tipo === 'regalo').length,
              tappe: premiCliente(c).map(p => p.tappa.nome + (p.inTempo ? '+' : '')), c};
    };
    const r = {};
    r.settimana = giro(7, 52); r.dieci = giro(10, 13); r.due = giro(7, 104);
    /* la seduta che fa salire di livello mostra il premio al cliente */
    const g = giro(7, 13);
    VIEW = {name:'closing', id:'cpremi', sid:'sp12', lvUp:true}; render();
    r.vinto = !!document.querySelector('.premiovinto') && /hai vinto/.test(document.querySelector('.premiovinto').textContent);
    DB.sessions = DB.sessions.filter(x => x.id !== 'sp12');
    VIEW = {name:'closing', id:'cpremi', sid:'sp11', lvUp:false}; render();
    r.conto = /Premio Costanza/.test((document.querySelector('.costanza') || {}).textContent || '');
    r.vuoto = messaggioZenith(g.c, DB.sessions.find(x => x.id === 'sp11')).frasi.map(f => f.t).join(' ');
    r.tooltip = [...document.querySelectorAll('.fbtn')].map(b => b.getAttribute('data-zt') || '').join(' ');
    /* la seduta da regalare: passa a un'altra scheda, o resta a lui */
    { const amico = {id:'camico', nome:'Marco', cognome:'Bianchi', anamnesi:{}};
      DB.clients = DB.clients.concat([amico]);
      const g13 = DB.clients.find(x => x.id === 'cpremi');
      DB.sessions.push({id:'sp12', clientId:'cpremi', date:new Date(new Date('2025-01-06T10:00:00Z').getTime() + 84 * 864e5).toISOString(), fam:'Z8', prog:'P01', quiz:{}, settings:{timer:20}});
      const reg = premiCliente(g13)[0].voci.find(v => v.tipo === 'regalo');
      const prima = premiDaUsare(g13).length;
      regalaA('cpremi', reg.id, 'camico');
      r.regalo = {prima, dopoGiver: premiDaUsare(g13).length, amico: premiDaUsare(amico).length,
        ricevuto: regaliRicevuti(amico).length === 1 && regaliRicevuti(amico)[0].da.id === 'cpremi'};
      VIEW = {name:'client', id:'camico'}; render();
      r.regalo.scheda = /regalata da/.test(document.querySelector('.premicard').textContent);
      usaPremio('cpremi', reg.id);
      r.regalo.usato = premiDaUsare(amico).length === 0;
      delete g13.premiUsati[reg.id];
      window.confirm = () => true;
      annullaScelta('cpremi', reg.id);
      perSe('cpremi', reg.id);
      r.regalo.perSe = premiDaUsare(g13).length === prima && regaliRicevuti(amico).length === 0;
      VIEW = {name:'client', id:'cpremi'}; render();
      r.regalo.schedaPerSe = /era da regalare/.test(document.querySelector('.premicard').textContent); }
    DB.sessions = salva; DB.clients = clienti;
    delete r.settimana.c; delete r.dieci.c; delete r.due.c;
    return r;
  });
  tac.t('una seduta a settimana per un anno: 6 sedute per sé e 3 da regalare',
    premi.settimana.te === 6 && premi.settimana.regalo === 3, JSON.stringify(premi.settimana));
  tac.t('ogni 10 giorni: Silver arriva dopo 120 giorni, solo la seduta omaggio',
    premi.dieci.te === 1 && premi.dieci.regalo === 0, JSON.stringify(premi.dieci));
  tac.t('dopo Diamond i premi ripartono con il 2° giro',
    premi.due.te === 12 && premi.due.regalo === 6 && premi.due.tappe.includes('Silver · 2° giro+'), JSON.stringify(premi.due.tappe));
  tac.t('la seduta che fa salire di livello dice al cliente «hai vinto»', premi.vinto);
  tac.t('senza risposte al check-in il messaggio non lascia buchi', !/undefined|così come stavi|null/.test(premi.vuoto), premi.vuoto.slice(0, 200));
  tac.t('sotto la strada c\'e\' il conto alla rovescia del Premio Costanza', premi.conto);
  tac.t('nella chiusura le schede della pressione parlano al cliente, non all\'operatore',
    !/Il cliente|gestionale|questa persona/.test(premi.tooltip) && /Hai sentito/.test(premi.tooltip), premi.tooltip.slice(0, 200));
  tac.t('la seduta regalata passa nella scheda dell\'amico, e lui la usa',
    premi.regalo.prima === 2 && premi.regalo.dopoGiver === 1 && premi.regalo.amico === 1 && premi.regalo.ricevuto
    && premi.regalo.scheda && premi.regalo.usato, JSON.stringify(premi.regalo));
  tac.t('chi non ha nessuno a cui regalarla la tiene per se\'', premi.regalo.perSe && premi.regalo.schedaPerSe, JSON.stringify(premi.regalo));
  { const g = await p.evaluate(()=>{
      const salva = DB.sessions, clienti = DB.clients;
    const t0 = Date.parse('2026-01-05T10:00:00Z');
    const sed = (id, n, passo) => Array.from({length:n}, (_, i) => ({id: id + i, clientId: id,
      date: new Date(t0 + i * passo * 864e5).toISOString(), fam:'Z8', prog:'P01', quiz:{}, settings:{timer:20}}));
    const FIX = {clients:[
        {id:'cA', nome:'Anna', cognome:'Prova', anamnesi:{}, premiUsati:{'g1-1-b':{data:'2026-04-01T10:00:00Z'}}, premiScelte:{'g1-1-r':{a:'cB', data:'2026-04-01T10:00:00Z'}}},
        {id:'cB', nome:'Bruno', cognome:'Prova', anamnesi:{}}],
      sessions: sed('cA', 26, 7).concat(sed('cB', 3, 7))};
      DB.clients = clienti.concat(FIX.clients); DB.sessions = salva.concat(FIX.sessions);
      const A = DB.clients.find(x => x.id === 'cA'), B = DB.clients.find(x => x.id === 'cB');
      const r = {a:{k: prossimaTappa(A).k, daUsare: premiDaUsare(A).length, scade: new Date(prossimaTappa(A).scade).toISOString().slice(0,10)},
                 b:{k: prossimaTappa(B).k, daUsare: premiDaUsare(B).length}};
      DB.sessions = salva; DB.clients = clienti;
      return r; });
    tac.t('il gestionale conta i premi come il totem',
      g.a.k === 39 && g.a.daUsare === 2 && g.a.scade === '2026-10-07' && g.b.k === 13 && g.b.daUsare === 1, JSON.stringify(g)); }
  { const vecchi = await p.evaluate(()=> premiCliente({id:'cpremi', nome:'x', cognome:'y'}).length);
    tac.t('(i premi di prova sono stati tolti dall\'archivio)', vecchi === 0); }
  { const fs = require('fs'), path = require('path');
    const blocco = f => { const t = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
      const i = t.indexOf('const REGOLA = ['), j = t.indexOf('];', t.indexOf('const REGOLA_ESEMPI = ['));
      return i < 0 || j < 0 ? '' : t.slice(i, j); };
    const g = blocco('app/index.html'), v = blocco('app/totem/index.html');
    tac.t('il regolamento dei premi e\' identico nel gestionale e nella vetrina', g && g === v); }

  console.log('   (' + sedute.length + ' sedute passate al setaccio)');
  await p.close();
  return tac;
};
