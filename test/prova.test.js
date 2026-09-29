/* ═══════════════════════════════════════════════════════════════
   LA PRENOTAZIONE DELLA SETTIMANA DI PROVA
   Si apre il link e c'e' subito il calendario. Si tocca un orario, si
   scrivono nome e cognome, e il posto e' preso. Si puo' cambiare, e
   quando e' tutto pieno c'e' la lista d'attesa. Qui gira in prova
   dimostrativa, senza foglio Google.
   ═══════════════════════════════════════════════════════════════ */
const path = require('path');
const { Taccuino } = require('./aiuto');
const PAGINA = 'file://' + path.join(__dirname, '..', 'app', 'prova', 'index.html') + '?demo=1';

module.exports = async function(browser){
  const tac = new Taccuino('la prenotazione della prova');
  const p = await browser.newPage({viewport:{width:390, height:844}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  p.on('dialog', d => d.accept());
  await p.goto(PAGINA);
  await p.evaluate(()=>{ localStorage.removeItem('zfl_prova_demo'); localStorage.removeItem('zfl_prova_io'); });
  await p.reload(); await p.waitForTimeout(400);

  const cal = await p.evaluate(()=> ({on: document.getElementById('s-cal').classList.contains('on'),
    giorni: document.querySelectorAll('.giorno').length, presi: document.querySelectorAll('.ora.preso').length,
    liberi: document.querySelectorAll('.ora:not(.preso)').length, tel: !!document.getElementById('tel')}));
  tac.t('aperto il link, c\'e\' subito il calendario coi sei giorni', cal.on && cal.giorni === 6, JSON.stringify(cal));
  tac.t('gli orari presi si vedono, ma senza nomi', cal.presi > 0 && cal.liberi > 0 && !/altro/.test(await p.textContent('#orari')));
  tac.t('si chiedono solo nome e cognome, niente cellulare', !cal.tel);

  await p.click('.ora:not(.preso) >> nth=0'); await p.waitForTimeout(200);
  await p.click('#ok'); await p.waitForTimeout(200);
  tac.t('senza nome e cognome non si prenota', await p.evaluate(()=> document.getElementById('errConf').style.display === 'block'));
  await p.fill('#nome', 'Giulia'); await p.fill('#cognome', 'Esposito');
  await p.click('#ok'); await p.waitForTimeout(400);
  const b = await p.evaluate(()=> ({on: document.getElementById('s-fatto').classList.contains('on'), ora: document.getElementById('bora').textContent}));
  tac.t('confermato, compare il biglietto con l\'orario', b.on && /^\d\d:\d\d$/.test(b.ora), JSON.stringify(b));

  await p.reload(); await p.waitForTimeout(400);
  tac.t('riaprendo il link ritrova la sua prenotazione', await p.evaluate(()=> document.getElementById('s-fatto').classList.contains('on')));

  const vecchio = await p.evaluate(()=> STATO.mia.id);
  await p.click('#cambia'); await p.waitForTimeout(100);
  const cam = await p.evaluate(()=> ({cal: document.getElementById('s-cal').classList.contains('on'),
    mio: document.querySelectorAll('.ora.mio').length, avviso: getComputedStyle(document.getElementById('cambio')).display,
    ancora: !!STATO.mia}));
  tac.t('«Cambia orario» apre subito il calendario, col tuo orario segnato e senza liberare niente',
    cam.cal && cam.mio === 1 && cam.avviso === 'block' && cam.ancora, JSON.stringify(cam));
  await p.click('#tieni'); await p.waitForTimeout(100);
  tac.t('«Tieni il mio orario» torna al biglietto', await p.evaluate(()=> document.getElementById('s-fatto').classList.contains('on')));
  await p.click('#cambia'); await p.waitForTimeout(100);
  await p.click('.ora:not(.preso):not(.mio) >> nth=0'); await p.waitForTimeout(150);
  await p.click('#ok'); await p.waitForTimeout(400);
  const nuovo = await p.evaluate(()=> STATO.mia.id);
  tac.t('scelto l\'orario nuovo, il biglietto cambia e il vecchio si libera da solo',
    nuovo !== vecchio && await p.evaluate(v=> STATO.posti.find(x=> x.id === v).libero, vecchio), vecchio + ' → ' + nuovo);
  await p.reload(); await p.waitForTimeout(400);
  tac.t('anche riaprendo il link: un orario solo, quello nuovo', await p.evaluate(n=> STATO.mia.id === n, nuovo));

  p.removeAllListeners('dialog'); p.on('dialog', d => d.accept());
  await p.click('#annulla'); await p.waitForTimeout(300);
  tac.t('«Non posso più venire» libera il posto e mostra il calendario',
    await p.evaluate(()=> document.getElementById('s-cal').classList.contains('on') && !STATO.mia));

  await p.evaluate(()=>{ const db = {posti:{}, attesa:[]}; Object.entries(ORARI).forEach(([g, l])=> l.forEach(o=> db.posti[g + '_' + o] = 'altro'));
    localStorage.setItem('zfl_prova_demo', JSON.stringify(db)); });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#attesa'); await p.waitForTimeout(200); await p.click('#ok'); await p.waitForTimeout(300);
  tac.t('tutto pieno: si entra in lista d\'attesa', await p.evaluate(()=> document.getElementById('s-pieno').classList.contains('on')
    && /lista d'attesa/.test(document.getElementById('attesa').textContent) && document.getElementById('attesa').disabled));

  tac.t('la pagina non finisce nei motori di ricerca', !!(await p.$('meta[name="robots"][content*="noindex"]')));
  await p.close();

  /* ── la velocita' ──
     Lo script di Google e' lento (anche qualche secondo, a freddo). La
     pagina non deve restare bianca con una rotellina: il calendario si
     vede subito, e la seconda volta si apre dalla copia. Qui lo script e'
     finto e ci mette un secondo e mezzo a rispondere. */
  const REALE = 'file://' + path.join(__dirname, '..', 'app', 'prova', 'index.html');
  const stato = (liberoTutto)=> ({ok:true, nome:'', mia:null, inAttesa:false, posti:
    ['2026-10-05','2026-10-06'].flatMap(g=> ['08:15','09:00','16:30'].map(o=> ({id:g+'_'+o, data:g, ora:o, libero: liberoTutto || o !== '09:00'})))});
  async function conScript(risposta, ritardo){
    const ctx = await browser.newContext({viewport:{width:390, height:844}});
    const pg = await ctx.newPage();
    pg.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
    let chiamate = 0;
    await pg.route('https://script.google.com/**', async route=>{
      chiamate++; await new Promise(r=> setTimeout(r, ritardo));
      if(risposta === null) return route.abort();
      await route.fulfill({status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body: JSON.stringify(risposta)});
    });
    return {ctx, pg, chiamate: ()=> chiamate};
  }
  const vedi = pg => pg.evaluate(()=> ({on: document.getElementById('s-cal').classList.contains('on'),
    giorni: document.querySelectorAll('.giorno').length, sk: document.querySelectorAll('.ora.sk').length,
    veri: document.querySelectorAll('.ora:not(.sk)').length, spinner: getComputedStyle(document.getElementById('carica')).display}));

  {
    const {ctx, pg, chiamate} = await conScript(stato(false), 1500);
    await pg.goto(REALE); await pg.waitForTimeout(500);
    const subito = await vedi(pg);
    tac.t('mentre lo script risponde si vede gia\' il calendario, con giorni e orari in grigio',
      subito.on && subito.giorni === 6 && subito.sk > 0 && subito.veri === 0, JSON.stringify(subito));
    tac.t('senza rotellina che gira a vuoto', subito.spinner === 'none', subito.spinner);
    tac.t('la richiesta dei posti e\' partita una volta sola, subito', chiamate() === 1, String(chiamate()));
    await pg.waitForTimeout(1600);
    const dopo = await vedi(pg);
    tac.t('quando arriva la risposta i posti veri prendono il posto del grigio',
      dopo.sk === 0 && dopo.veri > 0 && await pg.evaluate(()=> document.querySelectorAll('.ora.preso').length) === 1, JSON.stringify(dopo));
    tac.t('la richiesta resta una sola anche dopo la risposta', chiamate() === 1, String(chiamate()));

    /* la seconda volta: dalla copia, subito, e in silenzio si aggiorna */
    await pg.evaluate(()=> localStorage.setItem('zfl_prova_io', JSON.stringify({nome:'', cognome:''})));
    const t0 = Date.now(); await pg.reload({waitUntil:'domcontentloaded'}); await pg.waitForTimeout(250);
    const copia = await vedi(pg);
    tac.t('la seconda volta il calendario vero c\'e\' subito, senza aspettare lo script',
      copia.sk === 0 && copia.veri > 0 && Date.now() - t0 < 1400, JSON.stringify(copia));
    await pg.waitForTimeout(1500);
    tac.t('e intanto si aggiorna, senza rimandare in cima', (await vedi(pg)).veri > 0);
    await ctx.close();
  }

  {
    /* prenotare: il biglietto compare subito, la conferma vera arriva dopo */
    const conferma = {ok:true, nome:'Giulia', inAttesa:false, mia:{id:'2026-10-05_08:15', data:'2026-10-05', ora:'08:15', libero:false}, posti:stato(true).posti.map(x=> x.id === '2026-10-05_08:15' ? Object.assign({}, x, {libero:false}) : x)};
    const {ctx, pg} = await conScript(stato(true), 1500);
    await pg.goto(REALE); await pg.waitForTimeout(1800);
    /* da qui lo script risponde con la conferma */
    await pg.unroute('https://script.google.com/**');
    await pg.route('https://script.google.com/**', async route=>{ await new Promise(r=> setTimeout(r, 1500));
      await route.fulfill({status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body: JSON.stringify(conferma)}); });
    await pg.click('.ora:not(.preso) >> nth=0'); await pg.fill('#nome', 'Giulia'); await pg.fill('#cognome', 'Esposito');
    await pg.click('#ok'); await pg.waitForTimeout(150);
    const su = await pg.evaluate(()=> ({fatto: document.getElementById('s-fatto').classList.contains('on'),
      tag: document.getElementById('tagFatto').textContent, ora: document.getElementById('bora').textContent,
      cambia: document.getElementById('cambia').disabled}));
    tac.t('appena tocchi «Prenota» compare il biglietto, con «confermo…», senza aspettare Google',
      su.fatto && /CONFERMO/.test(su.tag) && su.ora === '08:15' && su.cambia, JSON.stringify(su));
    await pg.waitForTimeout(1700);
    const fine = await pg.evaluate(()=> ({tag: document.getElementById('tagFatto').textContent, cambia: document.getElementById('cambia').disabled}));
    tac.t('quando Google conferma diventa «Prenotato» e si puo\' cambiare', /PRENOTATO/.test(fine.tag) && !fine.cambia, JSON.stringify(fine));

    /* «Cambia» apre il calendario senza chiamate in attesa: e' immediato */
    const t0 = Date.now(); await pg.click('#cambia'); 
    const cal = await pg.evaluate(()=> ({on: document.getElementById('s-cal').classList.contains('on'), mio: document.querySelectorAll('.ora.mio').length}));
    tac.t('«Cambia orario» mostra il calendario subito, mentre Google e\' ancora lento', cal.on && cal.mio === 1 && Date.now() - t0 < 600, JSON.stringify(cal) + ' ' + (Date.now() - t0) + 'ms');
    await ctx.close();
  }

  {
    /* l'orario risulta preso mentre si confermava: si torna al calendario con la spiegazione */
    const preso = {ok:false, messaggio:'Questo orario è appena stato preso. Scegline un altro.', stato: stato(false)};
    const {ctx, pg} = await conScript(stato(true), 200);
    await pg.goto(REALE); await pg.waitForTimeout(500);
    await pg.unroute('https://script.google.com/**');
    await pg.route('https://script.google.com/**', async route=>{ await new Promise(r=> setTimeout(r, 400));
      await route.fulfill({status:200, contentType:'application/json', headers:{'access-control-allow-origin':'*'}, body: JSON.stringify(preso)}); });
    await pg.click('.ora:not(.preso) >> nth=0'); await pg.fill('#nome', 'Sara'); await pg.fill('#cognome', 'Romano');
    await pg.click('#ok'); await pg.waitForTimeout(900);
    const x = await pg.evaluate(()=> ({cal: document.getElementById('s-cal').classList.contains('on'),
      msg: document.getElementById('errCal').textContent, mia: !!STATO.mia}));
    tac.t('se l\'orario era stato preso da un altro, si torna al calendario e lo dice',
      x.cal && /appena stato preso/.test(x.msg) && !x.mia, JSON.stringify(x));
    await ctx.close();
  }

  {
    /* senza rete: niente rotellina infinita, un messaggio e il tasto per riprovare */
    const {ctx, pg} = await conScript(null, 300);
    await pg.goto(REALE); await pg.waitForTimeout(900);
    const e = await pg.evaluate(()=> ({riprova: getComputedStyle(document.getElementById('riprova')).display,
      msg: document.getElementById('lead').textContent, sk: document.querySelectorAll('.sk').length,
      spinner: getComputedStyle(document.getElementById('carica')).display}));
    tac.t('senza connessione compare il messaggio e il tasto «Riprova», non il grigio che lampeggia',
      e.riprova === 'block' && /Riprova/.test(e.msg) && e.sk === 0 && e.spinner === 'none', JSON.stringify(e));
    await ctx.close();
  }
  return tac;
};
