/* ══════════════════════════════════════════════════════════════
   ZENITH · LE PRENOTAZIONI DELLA SETTIMANA DI PROVA
   Da incollare in Estensioni › Apps Script del Foglio Google
   «Zenith Settimana di Prova», sull'account zenithfitnesslab@gmail.com.

   Il foglio ha tre schede, che lo script crea da solo:
   · Posti    — un orario per riga. Quando qualcuno prenota, accanto
                compare il suo nome e cognome. Scrivendo «chiuso» nella
                colonna Chiuso l'orario sparisce dalla pagina.
   · Attesa   — chi ha trovato tutto pieno.
   · Iscritti — FACOLTATIVA. Se resta vuota, prenota chiunque abbia il
                link. Se ci scrivi nomi e cognomi, prenota solo chi e'
                nell'elenco.
   Le persone si riconoscono da nome e cognome: ognuno tiene un orario
   solo, e se ne sceglie un altro il primo si libera.

   A ogni prenotazione, cambio o annullamento arriva una mail a EMAIL.
   La pagina dei clienti non vede mai nomi o numeri degli altri: di un
   orario sa solo se e' libero o preso.
   ══════════════════════════════════════════════════════════════ */

const EMAIL = 'zenithfitnesslab@gmail.com';
const ORARI = {
  '2026-10-12': ['08:15','09:00','09:45','10:30','11:15','16:30','17:15','18:00','18:45','19:30'],
  '2026-10-13': ['08:15','09:00','09:45','10:30','11:15','12:00','12:45','13:30','14:15','15:00','15:45','16:30','17:15','18:00','18:45','19:30'],
  '2026-10-14': ['08:15','09:00','09:45','10:30','11:15','16:30','17:15','18:00','18:45','19:30'],
  '2026-10-15': ['08:15','09:00','09:45','10:30','11:15','12:00','12:45','13:30','14:15','15:00','15:45','16:30','17:15','18:00','18:45','19:30'],
  '2026-10-16': ['08:15','09:00','09:45','10:30','11:15','15:45','16:30','17:15','18:00','18:45'],
  '2026-10-17': ['08:15','09:00','09:45','10:30','11:15','12:00','12:45']
};
const FUSO = 'Europe/Rome';
const GIORNI = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];

/* ── il menu nel foglio ── */
function onOpen(){
  SpreadsheetApp.getUi().createMenu('Zenith')
    .addItem('Prepara le schede e gli orari', 'prepara')
    .addItem('Prova la mail', 'provaMail')
    .addToUi();
}
function prepara(){
  const ss = SpreadsheetApp.getActive();
  const scheda = (nome, intest) => {
    let sh = ss.getSheetByName(nome);
    if(!sh){ sh = ss.insertSheet(nome); sh.appendRow(intest); sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, intest.length).setFontWeight('bold').setBackground('#2b1f2c').setFontColor('#f3dc8a'); }
    return sh;
  };
  scheda('Iscritti', ['Nome', 'Cognome']);
  const posti = scheda('Posti', ['Giorno', 'Ora', 'Nome', 'Cellulare', 'Prenotato il', 'Chiuso', 'Id']);
  scheda('Attesa', ['Nome', 'Cellulare', 'Quando']);
  if(posti.getLastRow() < 2){
    const righe = [];
    Object.keys(ORARI).forEach(g => ORARI[g].forEach(o => righe.push([g, o, '', '', '', '', g + '_' + o])));
    posti.getRange(2, 1, righe.length, 7).setNumberFormat('@').setValues(righe);
  }
  SpreadsheetApp.getUi().alert('Fatto: ' + (posti.getLastRow() - 1) + ' orari pronti.');
}
function provaMail(){
  MailApp.sendEmail(EMAIL, 'Zenith · prova della mail', 'Se leggi questa mail, le prenotazioni ti arriveranno qui.');
  SpreadsheetApp.getUi().alert('Mail di prova mandata a ' + EMAIL + '.');
}

/* ── la pagina chiama qui ── */
function doGet(e){
  const p = (e && e.parameter) || {};
  let r;
  try{ r = rispondi(p); }catch(err){ r = {ok:false, messaggio:'Qualcosa non ha funzionato. Riprova tra un momento.'}; }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}

/* «Giulia  Esposito», «giulia esposito» e «Giùlia Esposito» sono la stessa persona */
function chiave(t){ return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z' ]/g, ' ').replace(/\s+/g, ' ').trim(); }
/* il nome si salva sempre in ordine: «giulia ESPOSITO» diventa «Giulia Esposito» */
function pulito(t){ return String(t || '').replace(/[<>=+@]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40).toLowerCase()
  .replace(/(^|[\s'-])(\S)/g, (m, a, b) => a + b.toUpperCase()); }
function ilGiorno(data, ora){ const d = new Date(data + 'T12:00:00');
  return GIORNI[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + ' alle ' + ora; }
function avvisa(oggetto, righe){ try{ MailApp.sendEmail(EMAIL, oggetto, righe.join('\n')); }catch(e){} }

function rispondi(p){
  const nome = pulito(p.nome), cognome = pulito(p.cognome);
  const chi = (nome + ' ' + cognome).trim();
  const io = nome && cognome ? chiave(chi) : '';
  const ss = SpreadsheetApp.getActive();
  const oggi = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');
  if(p.azione !== 'prenota' && p.azione !== 'annulla' && p.azione !== 'attesa') return stato(io, oggi);
  if(!io) return {ok:false, messaggio:'Scrivi nome e cognome.'};

  /* l'elenco degli iscritti, se c'e', decide chi puo' prenotare */
  const iscritti = ss.getSheetByName('Iscritti').getDataRange().getValues().slice(1)
    .map(r => chiave(String(r[0]) + ' ' + String(r[1]))).filter(k => k.includes(' '));
  if(iscritti.length && p.azione !== 'annulla' && !iscritti.includes(io))
    return {ok:false, messaggio:'Non ti troviamo tra gli iscritti con pacchetto attivo: controlla come hai scritto nome e cognome, o chiedici in reception.'};

  const posti = ss.getSheetByName('Posti');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try{
    const dati = posti.getDataRange().getValues();
    const mia = dati.findIndex((r, i) => i > 0 && chiave(r[2]) === io);
    /* il giorno stesso della prova non si cambia piu' */
    if(mia > 0 && p.azione !== 'attesa' && String(dati[mia][0]) <= oggi)
      return {ok:false, messaggio:'La tua prova è oggi: per cambiarla chiamaci in reception.', stato: stato(io, oggi)};

    if(p.azione === 'attesa'){
      const att = ss.getSheetByName('Attesa');
      if(!att.getDataRange().getValues().some((r, i) => i > 0 && chiave(r[0]) === io)){
        att.appendRow([chi, '', Utilities.formatDate(new Date(), FUSO, 'dd/MM HH:mm')]);
        avvisa('Zenith · lista d\'attesa: ' + chi, ['In lista d\'attesa: ' + chi]);
      }
    }
    if(p.azione === 'prenota'){
      const riga = dati.findIndex((r, i) => i > 0 && String(r[6]) === String(p.id));
      if(riga < 0 || String(dati[riga][5]).trim() || (String(dati[riga][2]).trim() && chiave(dati[riga][2]) !== io))
        return {ok:false, messaggio:'Questo orario è appena stato preso. Scegline un altro.', stato: stato(io, oggi)};
      let prima = '';
      if(mia > 0 && mia !== riga){ prima = ilGiorno(String(dati[mia][0]), String(dati[mia][1])); posti.getRange(mia + 1, 3, 1, 3).clearContent(); }
      posti.getRange(riga + 1, 3, 1, 3).setValues([[chi, '', Utilities.formatDate(new Date(), FUSO, 'dd/MM HH:mm')]]);
      const q = ilGiorno(String(dati[riga][0]), String(dati[riga][1]));
      avvisa('Zenith · ' + (prima ? 'prova spostata' : 'nuova prova') + ': ' + q + ' · ' + chi,
        [(prima ? 'Prova SPOSTATA' : 'Nuova prova prenotata'), '', 'Quando: ' + q, 'Chi: ' + chi]
          .concat(prima ? ['', 'Prima era: ' + prima + ' (ora libero)'] : []));
    }
    if(p.azione === 'annulla' && mia > 0){
      const q = ilGiorno(String(dati[mia][0]), String(dati[mia][1]));
      posti.getRange(mia + 1, 3, 1, 3).clearContent();
      avvisa('Zenith · prova annullata: ' + q + ' · ' + dati[mia][2], ['Prova ANNULLATA (orario di nuovo libero)', '', 'Quando: ' + q, 'Chi: ' + dati[mia][2]]);
    }
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  return stato(io, oggi, nome);
}

function stato(io, oggi, nome){
  const ss = SpreadsheetApp.getActive();
  const dati = ss.getSheetByName('Posti').getDataRange().getValues().slice(1);
  let mia = null, suo = nome || '';
  const posti = [];
  dati.forEach(r => {
    const data = String(r[0]).length > 10 ? Utilities.formatDate(new Date(r[0]), FUSO, 'yyyy-MM-dd') : String(r[0]);
    const ora = typeof r[1] === 'object' ? Utilities.formatDate(r[1], FUSO, 'HH:mm') : String(r[1]);
    const p = {id: String(r[6]), data, ora, libero: !String(r[2]).trim()};
    if(io && chiave(r[2]) === io){ mia = p; if(!suo) suo = String(r[2]).split(' ')[0]; }
    if(!String(r[5]).trim() && data >= oggi) posti.push(p);
  });
  const inAttesa = !!io && ss.getSheetByName('Attesa').getDataRange().getValues().some((r, i) => i > 0 && chiave(r[0]) === io);
  return {ok:true, nome: suo, posti, mia, inAttesa};
}
