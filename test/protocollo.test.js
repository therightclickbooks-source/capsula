/* ═══════════════════════════════════════════════════════════════
   I DUE MOTORI DEVONO DARE LA STESSA RISPOSTA
   Il protocollo si calcola in due posti diversi: buildProtocol() nel
   gestionale e costruisciProtocollo() nella vetrina. Sono due copie
   scritte a mano della stessa logica, e due copie a mano divergono —
   sempre, e in silenzio. Il giorno in cui divergono, il totem promette
   al cliente una seduta e il gestionale ne prepara un'altra.
   Qui si passano migliaia di combinazioni di risposte a tutt'e due e
   si confronta quello che comanda davvero la macchina: il programma,
   la famiglia e i nove parametri. Le frasi del «perche'» no: quelle
   possono essere scritte con parole diverse senza che cambi niente.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, VETRINA, SCHERMI, Taccuino } = require('./aiuto');

/* un cliente qualunque: idoneo, senza taratura personale e senza
   macro-parametri suoi, cosi' i due motori partono dallo stesso posto */
function archivio(){
  const anamnesi = {certificatoOk:false};
  ['a1','a2','a3','a4','a5','a6',
   'b1','b2','b3','b4','b5','b6','b7','b8','b9'].forEach(k=> anamnesi[k] = false);
  return {codeHash:'x', codeLen:4,
    clients:[{id:'cprova', nome:'Prova', cognome:'Confronto', telefono:'3330000000',
              anamnesi, cal:0, calTuned:false}],
    sessions:[{id:'s0', clientId:'cprova', date:'2026-01-01T10:00:00.000Z'}],
    operators:[{id:'o1', nome:'Raffaele'}], checkins:[]};
}

/* le combinazioni: tutte le attivita' per tutti gli obiettivi per tutti
   gli umori per tutte le pressioni, su otto gruppi di zone scelti
   perche' toccano ogni ramo del motore */
const ATTIVITA  = ['ems','ems2','vacufit','matrix','riposo'];
const OBIETTIVI = ['recupero','sollievo','drenaggio','relax','sonno','energia'];
const UMORI     = ['sereno','stanco','stressato','dolorante','carico'];
const PRESSIONI = ['dolce','media','decisa','abituale'];
/* «solo aria»: nel gestionale e' l'interruttore della proposta, nel totem
   la domanda che si fa solo a chi serve. I due motori devono dare la
   stessa seduta anche cosi' */
const ARIA = [false, true];
const ZONE = [
  [], ['gambe'], ['glutei'], ['braccia'], ['cervicale','spalle'],
  ['lombare'], ['dorsale','lombare'], ['gambe','piedi']
];
const ORE = [10, 14, 20];   /* mattina, pranzo, sera */

function casi(){
  const out = [];
  for(const activity of ATTIVITA)
    for(const zones of ZONE)
      for(const goal of OBIETTIVI)
        for(const mood of UMORI)
          for(const pressione of PRESSIONI)
            for(const prefSoloAria of ARIA)
              out.push({activity, zones, goal, mood, pressione, prefSoloAria});
  return out;
}

/* la firma di un protocollo: quello che finisce davvero nella capsula */
const FIRMA = `p => [p.prog, p.fam, p.S.intensita, p.S.fourD, p.S.airbag,
  p.S.calore?1:0, p.S.ioni?1:0, p.S.zerog?1:0, p.S.timer, p.S.plantari,
  p.S.polpacci].join('|')`;

module.exports = async function(browser){
  const tac = new Taccuino('i due motori del protocollo');
  const lista = casi();
  const DB0 = archivio();

  async function apri(url){
    const p = await browser.newPage({viewport:{width:SCHERMI[2].w, height:SCHERMI[2].h}});
    p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
    await p.addInitScript(d => {
      try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){}
    }, DB0);
    await p.goto(url);
    await p.waitForTimeout(700);
    return p;
  }

  const g = await apri(GESTIONALE);
  const v = await apri(VETRINA);

  /* la premessa: se i due non partono dallo stesso cliente il confronto
     non vuol dire niente, quindi si controlla prima di partire */
  const premessa = await Promise.all([
    g.evaluate(()=> ({clienti: DB.clients.length, sedute: DB.sessions.length,
                      idoneo: idoneita(DB.clients[0]), cal: DB.clients[0].cal|0})),
    v.evaluate(()=> ({clienti: clienti().length}))
  ]);
  tac.t('il gestionale vede il cliente di prova, idoneo e senza taratura',
    premessa[0].clienti === 1 && premessa[0].idoneo === 'ok' && premessa[0].cal === 0,
    JSON.stringify(premessa[0]));
  tac.t('la vetrina vede lo stesso cliente', premessa[1].clienti === 1);

  let confrontati = 0, diversi = [];
  for(const ora of ORE){
    const rg = await g.evaluate(({lista, ora, firma})=>{
      const f = eval(firma);
      const vero = Date.prototype.getHours;
      Date.prototype.getHours = function(){ return ora; };
      const c = DB.clients[0];
      const out = lista.map(q => {
        try { return f(buildProtocol(c, q)); }
        catch(e){ return 'ERRORE ' + e.message; }
      });
      Date.prototype.getHours = vero;
      return out;
    }, {lista, ora, firma: FIRMA});

    const rv = await v.evaluate(({lista, ora, firma})=>{
      const f = eval(firma);
      const vero = Date.prototype.getHours;
      Date.prototype.getHours = function(){ return ora; };
      D.clienteId = 'cprova';
      const out = lista.map(q => {
        try { return f(costruisciProtocollo(Object.assign({clienteId:'cprova'}, q))); }
        catch(e){ return 'ERRORE ' + e.message; }
      });
      Date.prototype.getHours = vero;
      return out;
    }, {lista, ora, firma: FIRMA});

    for(let i = 0; i < lista.length; i++){
      confrontati++;
      if(rg[i] !== rv[i] && diversi.length < 8)
        diversi.push('ore ' + ora + ' ' + JSON.stringify(lista[i])
          + '\n       gestionale ' + rg[i] + '\n       vetrina    ' + rv[i]);
      else if(rg[i] !== rv[i]) diversi.push('…');
    }
    tac.t('alle ' + ora + ' i due motori dicono la stessa cosa su tutti i ' + lista.length + ' casi',
      rg.every((x, i) => x === rv[i]),
      diversi.slice(0, 3).join('\n     '));
    tac.t('alle ' + ora + ' nessuno dei due va in errore',
      !rg.some(x => x.startsWith('ERRORE')) && !rv.some(x => x.startsWith('ERRORE')),
      (rg.find(x => x.startsWith('ERRORE')) || rv.find(x => x.startsWith('ERRORE')) || ''));
  }
  /* ── la scala della capsula ──
     Sul display vero il 4D e la forza degli airbag si usano da 0 a 3: il
     motore non deve MAI prescrivere oltre il 3. Polpacci e piedi si
     accendono e si spengono e basta: 0 o 1, mai un livello. Si controlla
     su tutti i casi di tutte le fasce orarie, non su un campione. */
  const tutti = await g.evaluate(({lista, firma})=>{
    const f = eval(firma), out = [];
    for(const ora of [10, 14, 20]){
      const vero = Date.prototype.getHours;
      Date.prototype.getHours = function(){ return ora; };
      lista.forEach(q => out.push(f(buildProtocol(DB.clients[0], q))));
      Date.prototype.getHours = vero;
    }
    return out;
  }, {lista, firma: FIRMA});
  const oltre = tutti.filter(x => { const v = x.split('|');
    return +v[2] > 3 || +v[3] > 3 || +v[4] > 3; });
  const livelli = tutti.filter(x => { const v = x.split('|');
    return !['0','1'].includes(v[9]) || !['0','1'].includes(v[10]); });
  tac.t('il motore non prescrive mai 4D, airbag o intensita\' oltre il 3',
    oltre.length === 0, oltre.length + ' casi oltre, per es. ' + (oltre[0] || ''));
  tac.t('polpacci e piedi sono solo accesi o spenti, mai un livello',
    livelli.length === 0, livelli.length + ' casi con un livello, per es. ' + (livelli[0] || ''));
  tac.t('una seduta normale esce al livello medio (2)',
    tutti.some(x => { const v = x.split('|'); return v[3] === '2' && v[4] === '2'; }));
  tac.t('la pressione decisa arriva al massimo (3), non oltre',
    tutti.some(x => x.split('|')[3] === '3'));

  /* oltre il 3 ci si arriva solo con la taratura di fine seduta: se il
     cliente ha detto «troppo leggera», il 3 diventa 4 */
  const tarato = await g.evaluate(()=>{
    const c = Object.assign({}, DB.clients[0], {cal:1, calTuned:true});
    const p = buildProtocol(c, {activity:'ems', zones:[], goal:'recupero', mood:'sereno',
      pressione:'decisa', prefSoloAria:false});
    return {fourD:p.S.fourD, airbag:p.S.airbag};
  });
  tac.t('con la taratura «troppo leggera» il 4D passa da 3 a 4',
    tarato.fourD === 4, JSON.stringify(tarato));

  /* ── il codice della seduta ──
     La I non e' piu' un'«intensita'» (ripeteva la D): vuol dire ioni
     accesi, come C e G. Il codice deve essere lo stesso nei due motori,
     e c'e' la I solo quando gli ioni sono accesi. */
  const codici = await Promise.all([
    g.evaluate(({lista})=> lista.map(q => { const p = buildProtocol(DB.clients[0], q); return p.zCode + '|' + (p.S.ioni?1:0); }), {lista}),
    v.evaluate(({lista})=> lista.map(q => costruisciProtocollo(Object.assign({clienteId:'cprova'}, q)).zCode), {lista})
  ]);
  const forma = codici[0].filter(x => !/^Z\d·P\d\d·D\dA\dI?C?G?\|[01]$/.test(x));
  tac.t('il codice e\' «Z·P·D·A» e poi le lettere di quello che e\' acceso',
    forma.length === 0, forma.slice(0, 2).join(' '));
  const ioni = codici[0].filter(x => { const [z, i] = x.split('|'); return /\d(I)C?G?$/.test(z) !== (i === '1'); });
  tac.t('la I c\'e\' solo quando gli ioni sono accesi', ioni.length === 0, ioni.slice(0, 2).join(' '));
  const cdiv = codici[0].filter((x, i) => x.split('|')[0] !== codici[1][i]);
  tac.t('il totem scrive lo stesso codice del gestionale', cdiv.length === 0, cdiv.slice(0, 2).join(' '));

  /* le sedute salvate con la vecchia I si riscrivono da sole all'apertura */
  const vecchio = Object.assign(archivio(), {sessions:[
    {id:'v1', clientId:'cprova', date:'2026-09-01T10:00:00.000Z', zCode:'Z6·P18·I1D2A2CG', settings:{ioni:true}},
    {id:'v2', clientId:'cprova', date:'2026-09-02T10:00:00.000Z', zCode:'Z2·P07·I3D3A3G', settings:{ioni:false}},
    {id:'v3', clientId:'cprova', date:'2026-09-03T10:00:00.000Z', zCode:'Z3·P08·D1A3ICG', settings:{ioni:true}}]});
  const pm = await browser.newPage();
  await pm.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, vecchio);
  await pm.goto(GESTIONALE); await pm.waitForTimeout(500);
  const migrati = await pm.evaluate(()=> DB.sessions.map(s => s.zCode).join(' '));
  await pm.close();
  tac.t('i codici vecchi diventano nuovi: la I col numero sparisce, gli ioni diventano I',
    migrati === 'Z6·P18·D2A2ICG Z2·P07·D3A3G Z3·P08·D1A3ICG', migrati);

  console.log('   (' + confrontati + ' combinazioni confrontate, '
    + diversi.filter(x => x !== '…').length + ' divergenze)');

  await g.close(); await v.close();
  return tac;
};
