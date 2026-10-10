/* ═══════════════════════════════════════════════════════════════
   LA CHIUSURA: SI CHIEDE SOLO DI QUELLO CHE C'ERA, E OGNI RISPOSTA TARA
   LA SUA PARTE.
   Domande: massaggio (rulli), airbag, rifinitura manuale (Up), rifinitura
   della parte bassa (Down), calore. Una riga per cosa realmente accesa;
   mai Zero Gravity, mai calore spento.
   Taratura: massaggio e airbag delle sedute solo aria → c.cal; airbag dopo
   un massaggio completo, Up, Down e calore → c.calx, ciascuno per conto
   suo, e il protocollo successivo ne tiene conto davvero.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, Taccuino } = require('./aiuto');

function archivio(){
  const anamnesi = {certificatoOk:false};
  ['a1','a2','a3','a4','a5','a6','b1','b2','b3','b4','b5','b6','b7','b8','b9'].forEach(k=> anamnesi[k] = false);
  return {codeHash:'x', codeLen:4,
    clients:[{id:'c1', nome:'Eliana', cognome:'Prova', telefono:'3330000000', anamnesi, cal:0, calTuned:false}],
    sessions:[{id:'s0', clientId:'c1', date:'2026-01-01T10:00:00.000Z'}],
    operators:[{id:'o1', nome:'Raffaele'}], checkins:[]};
}

module.exports = async function(browser){
  const tac = new Taccuino('la chiusura per componenti');
  const p = await browser.newPage({viewport:{width:390, height:900}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  await p.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await p.goto(GESTIONALE); await p.waitForTimeout(600);

  /* ── quali domande compaiono ── */
  const dom = await p.evaluate(() => {
    const c = DB.clients[0], out = {};
    const mostra = (nome, s) => { s = Object.assign({id:'t_' + nome, clientId:c.id, date:'2026-03-01T10:00:00Z', fam:'Z4', zCode:'x', points:10, quiz:{zones:['lombare']}}, s);
      DB.sessions.push(s); VIEW = {name:'closing', id:c.id, sid:s.id, lvUp:false}; render();
      out[nome] = {righe: [...document.querySelectorAll('.fbr .fbn b')].map(b => b.textContent).join('|'),
                   zg: /zero gravity/i.test(document.querySelector('.fbcard').textContent),
                   sx: document.documentElement.scrollWidth <= innerWidth + 1,
                   casa: document.querySelector('.dopo').innerText}; };
    mostra('completo', {prog:'P04', settings:{airbag:2, fourD:2, calore:false, zerog:true, polpacci:1, plantari:1, timer:20}, manualRef:{zona:'zona lombare'}});
    mostra('calore', {prog:'P04', settings:{airbag:2, fourD:2, calore:true, zerog:false, polpacci:0, plantari:0, timer:20}});
    mostra('soloAria', {prog:'P23', fam:'Z3', settings:{airbag:2, fourD:0, calore:false, zerog:false, polpacci:0, plantari:0, timer:25}});
    mostra('basso', {prog:'P11', fam:'Z6', settings:{airbag:1, fourD:1, calore:false, zerog:true, polpacci:1, plantari:1, timer:30}, manualBasso:{zona:'gambe e piedi'}});
    mostra('nudo', {prog:'P01', settings:{airbag:0, fourD:1, calore:false, zerog:false, polpacci:0, plantari:0, timer:20}});
    return out;
  });
  tac.t('massaggio completo con manuale, senza calore: massaggio, airbag, rifinitura manuale', dom.completo.righe === 'Massaggio|Airbag|Rifinitura manuale', dom.completo.righe);
  tac.t('con il calore acceso c\'e\' anche la riga del calore; spento, no', dom.calore.righe === 'Massaggio|Airbag|Calore' && !/Calore/.test(dom.completo.righe), dom.calore.righe);
  tac.t('seduta solo aria: niente massaggio, solo gli airbag', dom.soloAria.righe === 'Airbag', dom.soloAria.righe);
  tac.t('la parte bassa compare solo se c\'e\' stata', dom.basso.righe === 'Massaggio|Airbag|Rifinitura parte bassa', dom.basso.righe);
  tac.t('a airbag spenti e rulli soli resta solo il massaggio', dom.nudo.righe === 'Massaggio', dom.nudo.righe);
  tac.t('mai una domanda sullo Zero Gravity', !dom.completo.zg && !dom.basso.zg);
  tac.t('i consigli a casa non parlano di calore se il calore era spento', !/calore|caldo/i.test(dom.completo.casa), dom.completo.casa);
  tac.t('con il calore acceso il consiglio sul calore resta', /calore/i.test(dom.calore.casa), dom.calore.casa);
  tac.t('le righe stanno nella larghezza del telefono', Object.values(dom).every(d => d.sx));

  /* il tasto scelto si illumina, e solo quello della sua riga; riaprendo la schermata resta */
  const lume = await p.evaluate(() => {
    const c = DB.clients[0], s = DB.sessions.find(x => x.id === 't_completo');
    VIEW = {name:'closing', id:c.id, sid:s.id, lvUp:false}; render();
    document.querySelector('#fbr_aria button[aria-label="troppo forte"]').click();
    document.querySelector('#fbr_rulli button[aria-label="giusta"]').click();
    const dopo = [...document.querySelectorAll('.fbb.on')].map(b => b.closest('.fbr').id + ':' + b.getAttribute('aria-label'));
    render();
    const riaperta = [...document.querySelectorAll('.fbb.on')].map(b => b.closest('.fbr').id + ':' + b.getAttribute('aria-label'));
    return {dopo, riaperta};
  });
  tac.t('toccando un tasto si illumina quello, uno per riga', JSON.stringify(lume.dopo) === JSON.stringify(['fbr_rulli:giusta','fbr_aria:troppo forte']), JSON.stringify(lume));
  tac.t('riaprendo la chiusura le risposte date restano segnate', JSON.stringify(lume.riaperta) === JSON.stringify(lume.dopo), JSON.stringify(lume));

  /* ── ogni risposta tara solo la sua parte, e il protocollo dopo ne tiene conto ── */
  const tar = await p.evaluate(() => {
    const c = DB.clients[0], r = {}; c.cal = 0; c.calx = {};
    const q = {activity:'riposo', goal:'sollievo', zones:['lombare'], pressione:'media', mood:'sereno', prefSoloAria:false};
    const base = buildProtocol(c, q);
    const mk = (id, extra) => { const s = Object.assign({id, clientId:c.id, date:'2026-04-0' + id.length + 'T10:00:00Z', fam:base.fam, prog:base.prog, zCode:'x', points:10, quiz:q,
      settings:Object.assign({}, base.S, {calore:true}), manualRef:Object.assign({}, base.manualRef)}, extra); DB.sessions.push(s); return s; };
    const s = mk('tx1');
    r.base = {air:base.S.airbag, fourD:base.S.fourD, w:base.manualRef && base.manualRef.wkey, cal:base.S.calore};
    setFeedback('tx1','aria','soft');
    let n = buildProtocol(c, q);
    r.aria = {calx:c.calx.aria, cal:c.cal|0, air:n.S.airbag, fourD:n.S.fourD};
    setFeedback('tx1','aria','ok');
    n = buildProtocol(c, q); r.ariaOk = {calx:c.calx.aria, air:n.S.airbag};
    setFeedback('tx1','rulli','soft');
    n = buildProtocol(c, q); r.rulli = {cal:c.cal, fourD:n.S.fourD, air:n.S.airbag};
    setFeedback('tx1','rulli','ok'); setFeedback('tx1','up','soft');
    n = buildProtocol(c, q); r.up = {calx:c.calx.up, w:n.manualRef && n.manualRef.wkey};
    setFeedback('tx1','up','hard');
    n = buildProtocol(c, q); r.upHard = {w:n.manualRef && n.manualRef.wkey};
    setFeedback('tx1','up','ok');
    setFeedback('tx1','calore','soft');
    n = buildProtocol(c, q); r.calore = {calx:c.calx.calore, calore:n.S.calore, base:base.S.calore};
    setFeedback('tx1','calore','ok');
    n = buildProtocol(c, q); r.caloreOk = {calore:n.S.calore};
    r.primario = DB.sessions.find(x => x.id === 'tx1').feedback;
    /* solo aria: gli airbag tarano la taratura generale */
    const qa = Object.assign({}, q, {prefSoloAria:true}); c.cal = 0; c.calx = {};
    const ba = buildProtocol(c, qa);
    DB.sessions.push({id:'tx2', clientId:c.id, date:'2026-05-01T10:00:00Z', fam:ba.fam, prog:ba.prog, zCode:'x', points:10, quiz:qa, settings:Object.assign({}, ba.S)});
    setFeedback('tx2','aria','hard');
    const na = buildProtocol(c, qa); r.solo = {cal:c.cal, air:na.S.airbag, base:ba.S.airbag};
    /* la parte bassa */
    c.cal = 0; c.calx = {};
    const qb = {activity:'riposo', goal:'sonno', zones:['gambe'], pressione:'media', mood:'sereno', prefSoloAria:false};
    const bb = buildProtocol(c, qb);
    r.hasBasso = !!bb.manualBasso;
    if(bb.manualBasso){
      DB.sessions.push({id:'tx3', clientId:c.id, date:'2026-06-01T10:00:00Z', fam:bb.fam, prog:bb.prog, zCode:'x', points:10, quiz:qb, settings:Object.assign({}, bb.S), manualBasso:Object.assign({}, bb.manualBasso)});
      setFeedback('tx3','down','hard'); const nb = buildProtocol(c, qb);
      r.down = {base:[bb.manualBasso.velocita, bb.manualBasso.plantare], dopo:[nb.manualBasso.velocita, nb.manualBasso.plantare]};
      setFeedback('tx3','down','soft'); setFeedback('tx3','down','soft'); const nb2 = buildProtocol(c, qb);
      r.downMin = [nb2.manualBasso.velocita, nb2.manualBasso.plantare];
    }
    return r;
  });
  tac.t('gli airbag «troppo forti» abbassano SOLO gli airbag del protocollo dopo', tar.aria.calx === -1 && tar.aria.cal === 0 && tar.aria.air === tar.base.air - 1 && tar.aria.fourD === tar.base.fourD, JSON.stringify(tar));
  tac.t('rispondendo «giusta» al posto di «troppo forti» la taratura degli airbag torna com\'era', tar.ariaOk.calx === 0 && tar.ariaOk.air === tar.base.air, JSON.stringify(tar.ariaOk));
  tac.t('il massaggio «troppo forte» abbassa i rulli e lascia gli airbag', tar.rulli.cal === -1 && tar.rulli.fourD === tar.base.fourD - 1 && tar.rulli.air === tar.base.air, JSON.stringify(tar.rulli));
  tac.t('la rifinitura manuale «troppo forte» si allarga, «troppo leggera» si stringe', tar.up.calx === -1 && tar.up.w === 'W_MEDIUM' || tar.base.w === 'W_MEDIUM' && tar.up.w === 'W_WIDE', JSON.stringify(tar.up) + ' ' + tar.base.w);
  tac.t('«troppo leggera» sulla manuale la stringe', (tar.base.w === 'W_MEDIUM' && tar.upHard.w === 'W_NARROW') || (tar.base.w === 'W_NARROW' && tar.upHard.w === 'W_NARROW'), JSON.stringify(tar.upHard) + ' ' + tar.base.w);
  tac.t('il calore «troppo caldo» lo spegne al protocollo dopo, e «giusto» lo rimette', tar.calore.calx === -1 && tar.calore.calore === false && tar.caloreOk.calore === true, JSON.stringify(tar.calore) + JSON.stringify(tar.caloreOk));
  tac.t('nelle sedute solo aria gli airbag tarano la taratura generale', tar.solo.cal === 1 && tar.solo.air === tar.solo.base + 1, JSON.stringify(tar.solo));
  tac.t('parte bassa: «troppo leggera» alza velocità e rulli plantari, e non scendono sotto 1', tar.hasBasso && tar.down.dopo[0] === Math.min(3, tar.down.base[0] + 1) && tar.down.dopo[1] === Math.min(3, tar.down.base[1] + 1) && tar.downMin[0] >= 1 && tar.downMin[1] >= 1, JSON.stringify(tar.down) + JSON.stringify(tar.downMin));
  tac.t('la risposta principale resta in s.feedback come prima', tar.primario === 'ok', tar.primario);

  /* ── il messaggio al cliente non fa mai capire una sensibilita' dall'anamnesi ── */
  const msg = await p.evaluate(() => { const c = DB.clients[0]; c.anamnesi.caloreSensibile = true;
    const s = {id:'tm', clientId:c.id, date:'2026-07-01T10:00:00Z', fam:'Z4', prog:'P04', zCode:'x', points:10, quiz:{zones:['lombare']}, settings:{airbag:2, fourD:2, calore:false, timer:20}};
    DB.sessions.push(s); return messaggioZenith(c, s).frasi.map(f => f.t).join(' '); });
  tac.t('il messaggio può dire che il calore è spento, ma non perché (è un dato sanitario)', !/preferisci|scheda|sensibil|anamnesi/i.test(msg), msg);

  await p.close();
  return tac;
};
