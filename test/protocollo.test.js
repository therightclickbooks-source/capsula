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
            out.push({activity, zones, goal, mood, pressione});
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
        try { return f(buildProtocol(c, Object.assign({prefSoloAria:false}, q))); }
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
  console.log('   (' + confrontati + ' combinazioni confrontate, '
    + diversi.filter(x => x !== '…').length + ' divergenze)');

  await g.close(); await v.close();
  return tac;
};
