/* ═══════════════════════════════════════════════════════════════
   LA CHIUSURA (v180): CORTA, PERSONALE, SEMPRE DIVERSA.
   Niente domande al cliente: quello che preferisce si regola durante la
   seduta, e la capsula lo impara dai ritocchi. Resta un messaggio di due
   tre frasi scritto per lui (dallo storico, dalle note, da quello che ha
   chiesto oggi), il tasto delle preferite e la tessera con le sedute che
   mancano alla seduta omaggio. Le tarature date dalle risposte delle sedute vecchie restano
   valide: il protocollo dopo ne tiene ancora conto.
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
  const tac = new Taccuino('la chiusura corta');
  const p = await browser.newPage({viewport:{width:390, height:900}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  await p.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await p.goto(GESTIONALE); await p.waitForTimeout(600);

  /* ── la schermata: messaggio e tessera, nient'altro ── */
  const sch = await p.evaluate(() => {
    const c = DB.clients[0];
    const s = {id:'t1', clientId:c.id, date:'2026-03-01T10:00:00Z', fam:'Z4', prog:'P04', zCode:'x', points:10, quiz:{zones:['lombare'], goal:'sollievo'},
      settings:{airbag:2, fourD:2, calore:true, zerog:true, polpacci:1, plantari:1, timer:20}, manualRef:{zona:'collo, trapezi e spalle'}};
    DB.sessions.push(s); VIEW = {name:'closing', id:c.id, sid:s.id, lvUp:false}; render();
    const t = document.getElementById('app').innerText;
    return {domande: document.querySelectorAll('.fbr, .fbb, .fbcard').length, preferita: /preferite/i.test(t), casa: /Da portare a casa|momento giusto/i.test(t),
      lettera: !!document.querySelector('.lettera .nm'), omg: !!document.querySelector('.omg'), caselle: document.querySelectorAll('.omg-t i').length,
      piene: document.querySelectorAll('.omg-t i.on').length, manca: (document.querySelector('.omg-n b') || {}).textContent,
      sx: document.documentElement.scrollWidth <= innerWidth + 1};
  });
  tac.t('niente domande «troppo forte · giusta · troppo leggera», niente consigli lunghi', !sch.domande && !sch.casa, JSON.stringify(sch));
  tac.t('il messaggio col nome del cliente e la tessera della seduta omaggio', sch.lettera && sch.omg, JSON.stringify(sch));
  tac.t('la tessera ha 13 caselle: 2 sedute fatte, ne mancano 11', sch.caselle === 13 && sch.piene === 2 && sch.manca === '11', JSON.stringify(sch));
  tac.t('la chiusura sta nella larghezza del telefono', sch.sx);

  /* ── le preferite: un tocco sotto il messaggio ── */
  const fav = await p.evaluate(() => {
    const r = {}; const s = DB.sessions.find(x => x.id === 't1');
    r.tasto = !!document.getElementById('clfav'); r.testo = document.getElementById('clfav').textContent;
    document.getElementById('clfav').click(); r.salvata = !!s.fav && document.getElementById('clfav').classList.contains('on') && !document.getElementById('modal').classList.contains('open');
    document.getElementById('clfav').click(); r.tolta = !s.fav;
    /* la prima seduta (quella di prova) non si salva tra le preferite */
    VIEW = {name:'closing', id:'c1', sid:'s0', lvUp:false}; render(); r.primaSenza = !document.getElementById('clfav');
    return r; });
  tac.t('sotto il messaggio il tasto «Salvala tra le preferite»: un tocco la salva, un altro la toglie',
    fav.tasto && /preferite/.test(fav.testo) && fav.salvata && fav.tolta, JSON.stringify(fav));
  tac.t('la prima seduta, quella di prova, non ha il tasto delle preferite', fav.primaSenza, JSON.stringify(fav));

  /* ── il messaggio: breve, sempre diverso, col nome ── */
  const serie = await p.evaluate(() => {
    const c = DB.clients[0]; DB.sessions = DB.sessions.filter(x => x.id === 's0');
    const goal = ['sollievo', 'relax', 'recupero', 'sollievo', 'drenaggio', 'sollievo'];
    const out = [];
    for(let i = 0; i < 14; i++){
      const s = {id:'ms' + i, clientId:c.id, date:new Date(Date.parse('2026-02-01T17:00:00Z') + i * 4 * 864e5).toISOString(), fam:'Z4', prog: i % 3 ? 'P04' : 'P11',
        zCode:'x', points:10, quiz:{zones:['lombare'], goal:goal[i % goal.length], mood:'stanco'}, settings:{airbag:2, fourD:2, calore:true, timer:20}};
      DB.sessions.push(s); fissaMessaggio(c, s);
      out.push({ids:s.msg.ids, temi:s.msg.temi, testo:s.msg.frasi.map(f => f.t).join(' ')});
    }
    return out;
  });
  { let doppie = 0, augDoppi = 0, lunghi = 0, senzaNome = 0;
    serie.forEach((m, i) => {
      if(i && m.ids[0] === serie[i - 1].ids[0]) doppie++;
      const aug = x => x.ids[x.ids.length - 1];
      for(let j = Math.max(0, i - 3); j < i; j++) if(aug(serie[j]) === aug(m)) augDoppi++;
      if(m.testo.replace(/<[^>]+>/g, '').split(/\s+/).length > 60) lunghi++;
      if(!/class="nm">Eliana</.test(m.testo)) senzaNome++;
    });
    tac.t('14 sedute di fila: la prima frase non è mai quella della seduta prima', !doppie, doppie + ' ' + JSON.stringify(serie.map(m => m.ids[0])));
    tac.t('l\'augurio non torna nelle tre sedute dopo', !augDoppi, augDoppi + ' ' + JSON.stringify(serie.map(m => m.ids[m.ids.length - 1])));
    tac.t('ogni messaggio è una via di mezzo (tre frasi, al massimo 60 parole) e chiama il cliente per nome una volta', !lunghi && !senzaNome
      && serie.every(m => m.ids.length === 3 && (m.testo.match(/class="nm"/g) || []).length === 1), lunghi + ' lunghi, ' + senzaNome + ' senza nome ' + JSON.stringify(serie.map(m => m.ids.length)));
    const diversi = new Set(serie.map(m => m.ids[0])).size;
    tac.t('in 14 sedute almeno 8 prime frasi diverse', diversi >= 8, diversi + ' ' + JSON.stringify(serie.map(m => m.ids[0]))); }

  /* ── sa chi e': quello che ha chiesto oggi, le note, la memoria ── */
  const sa = await p.evaluate(() => {
    const c = DB.clients[0]; DB.sessions = DB.sessions.filter(x => x.id === 's0'); c.calx = {}; c.cal = 0;
    const mk = (id, giorni, extra) => { const s = Object.assign({id, clientId:c.id, date:new Date(Date.parse('2026-06-01T17:00:00Z') + giorni * 864e5).toISOString(),
      fam:'Z4', prog:'P04', zCode:'x', points:10, quiz:{zones:['cervicale'], goal:'relax'}, settings:{airbag:2, fourD:2, calore:true, timer:20}}, extra);
      DB.sessions.push(s); fissaMessaggio(c, s); return s.msg.frasi.map(f => f.t.replace(/<[^>]+>/g, '')).join(' '); };
    const r = {};
    r.ritocco = mk('sa1', 0, {proposta:{nome:'X', cambi:['4D 2 → 1']}});
    r.nota = mk('sa2', 5, {notes:'a fine seduta ha detto che la lombare va molto meglio'});
    r.airbag = mk('sa3', 10, {proposta:{nome:'X', cambi:['⊘ Airbag spenti su braccia']}});
    /* la seduta subito dopo la nota cambia argomento; quella dopo ancora se ne ricorda */
    r.dopoNota = mk('sa4', 15, {});
    /* la seduta salvata: il messaggio resta quello anche se poi cambia la scheda */
    const s4 = DB.sessions.find(x => x.id === 'sa4'), prima = JSON.stringify(s4.msg.frasi);
    c.calx = {spente:['spalle']}; c.cal = -2;
    r.stabile = JSON.stringify(messaggioZenith(c, s4).frasi) === prima;
    return r;
  });
  tac.t('chi ha chiesto meno profondità lo ritrova nel messaggio', /più leggera|Più dolce/.test(sa.ritocco), sa.ritocco);
  tac.t('la nota della seduta («la lombare va meglio») entra nel messaggio di oggi', /zona lombare/.test(sa.nota), sa.nota);
  tac.t('e qualche seduta dopo il messaggio se ne ricorda ancora', /zona lombare/.test(sa.dopoNota) && /ti aveva fatto bene/i.test(sa.dopoNota), sa.dopoNota);
  tac.t('gli airbag spenti oggi sulle braccia: il messaggio lo dice, con la preposizione giusta', /airbag (spenti )?sulle braccia/i.test(sa.airbag), sa.airbag);
  tac.t('il messaggio salvato con la seduta resta lo stesso rileggendolo', sa.stabile);

  /* ── la taratura: i ritocchi insegnano, le risposte vecchie valgono ancora ── */
  const tar = await p.evaluate(() => {
    const c = DB.clients[0], r = {}; c.cal = 0; c.calx = {};
    const q = {activity:'riposo', giornata:'tranquilla', goal:'sollievo', zones:['cervicale'], pressione:'media', mood:'sereno', prefSoloAria:false};
    const base = buildProtocol(c, q);
    r.base = {air:base.S.airbag, fourD:base.S.fourD, calore:base.S.calore};
    /* un ritocco in seduta: 4D giu' di uno, calore spento */
    const p1 = copiaDati(base); p1.proposta = fotoProposta(base); p1.S.fourD = base.S.fourD - 1; p1.S.calore = false;
    r.imparato = imparaDalRitocco(c, p1);
    const n = buildProtocol(c, q); r.dopo = {fourD:n.S.fourD, calore:n.S.calore, cal:c.cal};
    /* le tarature delle risposte di una volta restano: airbag, calore */
    c.cal = 0; c.calx = {aria:-1};
    r.vecchia = {air:buildProtocol(c, q).S.airbag};
    c.calx = {};
    return r;
  });
  tac.t('un ritocco in seduta (4D giù, calore spento) e la prossima proposta parte già così',
    tar.dopo.fourD === tar.base.fourD - 1 && tar.dopo.calore === false && tar.dopo.cal === -1, JSON.stringify(tar));
  tac.t('la taratura degli airbag data con le risposte di una volta vale ancora', tar.vecchia.air === tar.base.air - 1, JSON.stringify(tar));

  /* ── il messaggio non fa mai capire una sensibilita' dall'anamnesi ── */
  const msg = await p.evaluate(() => { const c = DB.clients[0]; c.anamnesi.caloreSensibile = true;
    const s = {id:'tm', clientId:c.id, date:'2026-07-01T10:00:00Z', fam:'Z4', prog:'P04', zCode:'x', points:10, quiz:{zones:['lombare']}, settings:{airbag:2, fourD:2, calore:false, timer:20}};
    DB.sessions.push(s); return messaggioZenith(c, s).frasi.map(f => f.t).join(' '); });
  tac.t('il messaggio non dice mai il perché di un calore spento (è un dato sanitario)', !/sensibil|anamnesi|scheda/i.test(msg), msg);

  await p.close();
  return tac;
};
