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

  await p.click('#cambia'); await p.waitForTimeout(300);
  tac.t('«Cambia orario» libera il posto e torna al calendario', await p.evaluate(()=> document.getElementById('s-cal').classList.contains('on') && !STATO.mia));

  await p.evaluate(()=>{ const db = {posti:{}, attesa:[]}; Object.entries(ORARI).forEach(([g, l])=> l.forEach(o=> db.posti[g + '_' + o] = 'altro'));
    localStorage.setItem('zfl_prova_demo', JSON.stringify(db)); });
  await p.reload(); await p.waitForTimeout(400);
  await p.click('#attesa'); await p.waitForTimeout(200); await p.click('#ok'); await p.waitForTimeout(300);
  tac.t('tutto pieno: si entra in lista d\'attesa', await p.evaluate(()=> document.getElementById('s-pieno').classList.contains('on')
    && /lista d'attesa/.test(document.getElementById('attesa').textContent) && document.getElementById('attesa').disabled));

  tac.t('la pagina non finisce nei motori di ricerca', !!(await p.$('meta[name="robots"][content*="noindex"]')));
  await p.close();
  return tac;
};
