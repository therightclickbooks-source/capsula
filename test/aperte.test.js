/* ═══════════════════════════════════════════════════════════════
   LE SEDUTE APERTE — nessuna seduta si perde
   Raffaele ha perso delle sedute: il cliente finisce, lui si distrae,
   la pagina si chiude o il telefono si spegne, e la proposta non
   registrata sparisce. Da adesso una seduta, aperta dal timer (o dal QR),
   resta salvata finche' non e' registrata con «✓ OK» e chiusa con le
   risposte di fine seduta: in Home c'e' l'avviso, in cima la striscia.
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
  const tac = new Taccuino('le sedute aperte');
  const p = await browser.newPage({viewport:{width:430, height:900}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  /* l'archivio si mette solo la prima volta: i ricaricamenti devono trovare quello che c'era */
  await p.addInitScript(d => { try{ if(!localStorage.getItem('zfl_app_v1')) localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await p.goto(GESTIONALE); await p.waitForTimeout(600);
  const aperteSalvate = () => p.evaluate(() => JSON.parse(localStorage.getItem('zfl_sedute_aperte') || '[]'));
  /* il telefono che si spegne: si butta via tutto quello che sta in memoria e si
     riparte da quello che e' salvato, come all'apertura dell'app. (Il ricaricamento
     vero, aperto da file in questa prova, a volte perde il salvataggio del browser:
     sul sito non succede, e qui renderebbe la prova un terno al lotto.) */
  const riavvio = () => p.evaluate(() => {
    if(TM){ clearInterval(TM_H); TM = null; }
    DB = store.load(); currentProt = null; quizState = {}; REPEAT = null; NAV = [];
    VIEW = {name: DB.codeLock === true ? 'lock' : 'home'}; render(); timerRipristina();
  });

  /* 1 · la proposta e il timer: la seduta si apre */
  const via = await p.evaluate(() => {
    quizState = {clientId:'c1', activity:'riposo', giornata:'tranquilla', goal:'sollievo', zones:['cervicale','lombare'], mood:'sereno', pressione:'media', prefSoloAria:false};
    NAV = [{name:'home'}]; VIEW = {name:'proposal'}; render();
    const prima = localStorage.getItem('zfl_sedute_aperte');
    window.__t = 1e7; TM_NOW = () => window.__t;
    document.querySelector('.tmgo-b').click();
    return {prima, prog: currentProt.prog};
  });
  let ap = await aperteSalvate();
  tac.t('guardare la proposta non apre niente; avviando il timer la seduta si apre e si salva col suo protocollo',
    via.prima === null && ap.length === 1 && ap[0].stato === 'registra' && ap[0].clientId === 'c1' && ap[0].prot.prog === via.prog, JSON.stringify({via, ap}));

  /* 2 · il timer finisce e si sgretola: la seduta non sparisce, resta la striscia */
  const fine = await p.evaluate(async () => {
    window.__t += 20*60*1000 + 1000; tmTick(); window.__t += 20000; tmTick();
    await new Promise(r => setTimeout(r, 2600));
    const box = document.getElementById('tmr');
    const qui = {timer: TM, sap: box.classList.contains('sap'), testo: box.textContent.replace(/\s+/g,' ')};
    go('clients');
    const altrove = {sap: box.classList.contains('sap'), testo: box.textContent.replace(/\s+/g,' '), tasto: !!box.querySelector('[data-act="sap"]'),
      tmh: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tmh')) || 0};
    return {qui, altrove};
  });
  tac.t('finito il timer, sulla proposta resta la striscia «Finita? Tocca ✓ OK in basso»',
    fine.qui.timer === null && fine.qui.sap && /Tocca «✓ OK» in basso/.test(fine.qui.testo), JSON.stringify(fine.qui));
  tac.t('su un\'altra schermata la striscia dice chi è da chiudere, col tasto per tornarci, e non copre la pagina',
    fine.altrove.sap && /Giulia Esposito/.test(fine.altrove.testo) && fine.altrove.tasto && fine.altrove.tmh > 30, JSON.stringify(fine.altrove));

  /* 3 · il telefono si spegne: riaprendo l'app, in Home c'e' l'avviso */
  /* il protocollo salvato e' quello che conta, anche se ricalcolandolo uscirebbe diverso */
  await p.evaluate(() => { const a = JSON.parse(localStorage.getItem('zfl_sedute_aperte')); a[0].prot.prog = 'P14'; localStorage.setItem('zfl_sedute_aperte', JSON.stringify(a)); });
  await riavvio();
  const home = await p.evaluate(() => {
    const card = document.querySelector('.sapcard');
    return {view: VIEW.name, card: card ? card.textContent.replace(/\s+/g,' ') : '', tasto: !!(card && card.querySelector('.sapgo'))};
  });
  tac.t('riaprendo l\'app, in Home c\'è l\'avviso «seduta da chiudere» con nome, programma e il tasto',
    home.view === 'home' && /SEDUTA DA CHIUDERE/.test(home.card) && /Giulia Esposito/.test(home.card) && /da registrare con ✓ OK/.test(home.card) && home.tasto, JSON.stringify(home));

  /* 4 · il tasto riporta alla proposta, con il protocollo salvato */
  const ripresa = await p.evaluate(() => {
    document.querySelector('.sapcard .sapgo').click();
    return {view: VIEW.name, prog: currentProt && currentProt.prog, avviso: !!document.querySelector('.sapripresa'), ok: !!document.getElementById('okbtn')};
  });
  tac.t('«Chiudi la seduta» riapre la proposta con lo stesso protocollo di allora e il tasto «✓ OK»',
    ripresa.view === 'proposal' && ripresa.prog === 'P14' && ripresa.avviso && ripresa.ok, JSON.stringify(ripresa));

  /* 5 · «✓ OK»: registrata, ma resta aperta finche' mancano le risposte */
  const reg = await p.evaluate(() => {
    document.getElementById('okbtn').click();
    const s = DB.sessions[DB.sessions.length - 1];
    return {view: VIEW.name, sid: VIEW.sid, prog: s.prog, nuova: s.id !== 's0', aperte: JSON.parse(localStorage.getItem('zfl_sedute_aperte') || '[]')};
  });
  tac.t('con «✓ OK» la seduta è registrata (col protocollo salvato) e passa a «mancano le risposte»',
    reg.view === 'closing' && reg.nuova && reg.prog === 'P14' && reg.aperte.length === 1 && reg.aperte[0].stato === 'chiudi' && reg.aperte[0].sid === reg.sid, JSON.stringify(reg));

  await riavvio();
  const home2 = await p.evaluate(() => {
    const card = document.querySelector('.sapcard'); const t = card ? card.textContent.replace(/\s+/g,' ') : '';
    if(card) card.querySelector('.sapgo').click();
    return {t, view: VIEW.name, sid: VIEW.sid};
  });
  tac.t('se l\'app si chiude prima delle risposte, la Home riporta alla chiusura di quella seduta',
    /mancano le risposte/.test(home2.t) && home2.view === 'closing' && home2.sid === reg.sid, JSON.stringify(home2));

  /* 6 · risposte date a tutto: la seduta e' chiusa, l'avviso sparisce */
  const chiusa = await p.evaluate(() => {
    document.querySelectorAll('.fbr').forEach(r => r.querySelector('.fbb.g').click());
    const a = JSON.parse(localStorage.getItem('zfl_sedute_aperte') || '[]');
    go('home');
    return {aperte: a.length, card: !!document.querySelector('.sapcard'), striscia: document.getElementById('tmr').classList.contains('sap')};
  });
  tac.t('risposto a tutte le domande, la seduta è chiusa: niente avviso e niente striscia',
    chiusa.aperte === 0 && !chiusa.card && !chiusa.striscia, JSON.stringify(chiusa));

  /* 7 · «Non è stata fatta»: si toglie solo dopo la conferma */
  const nonfatta = await p.evaluate(() => {
    quizState = {clientId:'c1', activity:'ems', goal:'recupero', zones:[], mood:'carico', pressione:'media', prefSoloAria:false};
    VIEW = {name:'proposal'}; render(); apriQR(); closeModal();
    const dopoQR = JSON.parse(localStorage.getItem('zfl_sedute_aperte') || '[]').length;
    go('home'); document.querySelector('.sapcard .sapno').click();
    const chiede = document.getElementById('modal').classList.contains('open');
    document.querySelector('#modal .mrow .btn:not(.sec)').click();
    return {dopoQR, chiede, dopo: JSON.parse(localStorage.getItem('zfl_sedute_aperte') || '[]').length, card: !!document.querySelector('.sapcard'), sedute: DB.sessions.length};
  });
  tac.t('anche il setup mandato al telefono apre la seduta; «Non è stata fatta» chiede conferma e la toglie senza registrarla',
    nonfatta.dopoQR === 1 && nonfatta.chiede && nonfatta.dopo === 0 && !nonfatta.card && nonfatta.sedute === 2, JSON.stringify(nonfatta));

  await p.close();
  return tac;
};
