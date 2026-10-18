/* ═══════════════════════════════════════════════════════════════
   LE TRE SEQUENZE DI DOMANDE
   Lo stesso cliente non risponde sempre alle stesse domande: tre
   sequenze equivalenti, a giro, mai la stessa due volte di fila. Le
   parole e l'ordine cambiano, le risposte (i valori) no: il motore
   deve proporre lo stesso protocollo qualunque sequenza si usi.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, Taccuino } = require('./aiuto');

function archivio(){
  const anamnesi = {certificatoOk:false, zone:[], prefIntensita:'medio', sonno:'buono', caloreSensibile:false};
  ['a1','a2','a3','a4','a5','a6','b1','b2','b3','b4','b5','b6','b7','b8','b9'].forEach(k=> anamnesi[k] = false);
  return {codeHash:'x', codeLen:4,
    clients:[{id:'c1', nome:'Giulia', cognome:'Esposito', genere:'F', telefono:'3330000000', anamnesi, cal:0}],
    sessions:[{id:'s0', clientId:'c1', date:'2026-01-01T10:00:00.000Z', prog:'P04', settings:{fourD:2, airbag:2, timer:20}}],
    operators:[], checkins:[]};
}

module.exports = async function(browser){
  const tac = new Taccuino('le tre sequenze di domande');
  const p = await browser.newPage({viewport:{width:430, height:900}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  await p.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await p.goto(GESTIONALE); await p.waitForTimeout(600);

  const r = await p.evaluate(() => {
    const c = DB.clients[0];
    const risposte = {activity:'ems', zones:['lombare'], zone:'lombare', goal:'recupero', mood:'stanco', pressione:'decisa', prefSoloAria:false};
    const giri = [];
    for(let i = 0; i < 4; i++){
      quizState = Object.assign({clientId:'c1', step:0}, JSON.parse(JSON.stringify(risposte)));
      const steps = activeQuizSteps();
      giri.push({seq: quizState.seq, domande: steps.map(s=> s.t).join('|'), ordine: steps.map(s=> s.k).join(','),
        ultima: steps[steps.length-1].type, completo: steps.every(s=> s.type !== 'cards' || s.opts.every(o=> o.length === 4 && o[2])),
        valori: steps.filter(s=> s.opts).map(s=> s.k + ':' + s.opts.map(o=> o[0]).join('/')).sort().join(' ')});
      DB.sessions.push({id:'q' + i, clientId:'c1', date:'2026-02-0' + (i + 1) + 'T10:00:00.000Z', prog:'P04', settings:{}, quiz:{...quizState}});
    }
    /* lo stesso protocollo con le stesse risposte, qualunque sequenza */
    const firme = [0,1,2].map(seq => buildProtocol(c, Object.assign({seq}, risposte), {senzaVarieta:true}).firma);
    /* nella sequenza 2 si vedono le parole nuove */
    quizState = Object.assign({clientId:'c1', step:1, seq:1}, JSON.parse(JSON.stringify(risposte)));
    VIEW = {name:'quiz'}; render();
    const schermo = document.querySelector('.qb-dom').textContent;
    return {giri, firme, schermo};
  });
  const seqs = r.giri.map(g => g.seq);
  tac.t('le sequenze vanno a giro e mai la stessa due volte di fila', seqs.join(',') === '1,2,0,1', seqs.join(','));
  tac.t('le tre sequenze hanno domande diverse', new Set(r.giri.slice(0,3).map(g => g.domande)).size === 3, r.giri.map(g => g.domande).join('\n'));
  tac.t('le risposte possibili sono le stesse in tutte le sequenze', new Set(r.giri.map(g => g.valori)).size === 1, r.giri.map(g => g.valori).join('\n'));
  tac.t('ogni risposta ha icona, nome e spiegazione', r.giri.every(g => g.completo), JSON.stringify(r.giri));
  tac.t('l\'attività è sempre la prima domanda e le zone mai l\'ultima',
    r.giri.every(g => g.ordine.startsWith('activity') && g.ultima !== 'zones'), r.giri.map(g => g.ordine).join(' / '));
  tac.t('con le stesse risposte il protocollo è lo stesso in tutte e tre', new Set(r.firme).size === 1, JSON.stringify(r.firme));
  tac.t('sullo schermo compare la domanda della sequenza scelta', /allenamento ha fatto prima di venire|energia sente/.test(r.schermo), r.schermo);

  await p.close();
  return tac;
};
