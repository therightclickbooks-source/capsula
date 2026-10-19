/* ═══════════════════════════════════════════════════════════════
   LA NOTA DOPO LA SEDUTA
   Nello storico ogni seduta ha la matita: la nota si aggiunge o si
   corregge anche a seduta finita, e resta salvata.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, Taccuino } = require('./aiuto');

module.exports = async function(browser){
  const tac = new Taccuino('la nota dopo la seduta');
  const anamnesi = {certificatoOk:false, zone:[], prefIntensita:'medio', sonno:'buono', caloreSensibile:false};
  ['a1','a2','a3','a4','a5','a6','b1','b2','b3','b4','b5','b6','b7','b8','b9'].forEach(k=> anamnesi[k] = false);
  const db = {codeHash:'x', codeLen:4,
    clients:[{id:'c1', nome:'Jole', cognome:'Abagnale', genere:'F', telefono:'3330000000', anamnesi, cal:0}],
    sessions:[{id:'s1', clientId:'c1', date:'2026-10-19T10:00:00.000Z', prog:'P05', fam:'Z4', settings:{timer:20}, quiz:{activity:'riposo', zones:['lombare'], goal:'sollievo', mood:'dolorante'}}],
    operators:[], checkins:[]};
  const p = await browser.newPage({viewport:{width:430, height:900}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  await p.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, db);
  await p.goto(GESTIONALE); await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    go('client', {id:'c1'});
    const riga = () => document.querySelector('.sessrow[data-sid="s1"]');
    const matita = !!riga().querySelector('.srnote .ntedit');
    riga().querySelector('.ntedit').click();
    const aperta = document.getElementById('modal').classList.contains('open') && !!document.getElementById('ntxt');
    document.getElementById('ntxt').value = '  va molto meglio  ';
    document.querySelector('#modal .mrow .btn:not(.sec)').click();
    const salvata = JSON.parse(localStorage.getItem('zfl_app_v1')).sessions[0].notes;
    const vista = riga().querySelector('.srnote').textContent;
    riga().querySelector('.ntedit').click();
    const ritrovata = document.getElementById('ntxt').value;
    document.getElementById('ntxt').value = '';
    document.querySelector('#modal .mrow .btn:not(.sec)').click();
    return {matita, aperta, salvata, vista: /va molto meglio/.test(vista), ritrovata, tolta: JSON.parse(localStorage.getItem('zfl_app_v1')).sessions[0].notes};
  });
  tac.t('ogni seduta dello storico ha la matita, che apre la nota', r.matita && r.aperta, JSON.stringify(r));
  tac.t('la nota scritta dopo si salva e compare nella seduta', r.salvata === 'va molto meglio' && r.vista, JSON.stringify(r));
  tac.t('riaprendo la matita si ritrova la nota, e svuotandola si toglie', r.ritrovata === 'va molto meglio' && r.tolta === '', JSON.stringify(r));
  await p.close();
  return tac;
};
