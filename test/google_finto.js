/* ═══════════════════════════════════════════════════════════════
   UN GOOGLE FINTO
   Quanto basta per far girare docs/prenotazioni/Codice.gs senza Google:
   un foglio in memoria, la cache, il blocco e la posta. Serve a provare
   lo script delle prenotazioni: aperto dal vero non si puo' provare senza
   sporcare il foglio del centro.
   ═══════════════════════════════════════════════════════════════ */
/* un Google finto quanto basta per far girare Codice.gs: foglio, cache, blocco, mail */
const vm = require('vm'), fs = require('fs');
/* La prova gira sempre «il 2 ottobre a mezzogiorno»: lo script rifiuta di cambiare
   una prenotazione che e' oggi o gia' passata, e i test non devono cambiare
   risultato a seconda del giorno in cui girano. */
const T_FERMO = Date.parse('2026-10-02T12:00:00+02:00');
const DATA_FERMA = class extends Date {
  constructor(...a){ if(a.length) super(...a); else super(T_FERMO); }
  static now(){ return T_FERMO; }
};
function fmt(d, tz, f){
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
    .formatToParts(d).map(x=>[x.type,x.value]));
  return f.replace('yyyy',p.year).replace('MM',p.month).replace('dd',p.day).replace('HH',p.hour).replace('mm',p.minute);
}
function foglio(dati){   /* dati: {Posti:[[..]], Attesa:[[..]], Iscritti:[[..]]}, con la riga delle intestazioni */
  const fogli = {};
  Object.keys(dati).forEach(n=>{
    const righe = dati[n];
    fogli[n] = {
      getDataRange: ()=> ({getValues: ()=> righe.map(r=> r.map(c=> c instanceof Date ? new Date(c.getTime()) : c)) }),
      getRange: (r, c, nr, nc)=> ({
        clearContent(){ for(let i=0;i<nr;i++) for(let j=0;j<nc;j++) righe[r-1+i][c-1+j] = ''; },
        setValues(v){ for(let i=0;i<nr;i++) for(let j=0;j<nc;j++) righe[r-1+i][c-1+j] = v[i][j]; return this; },
        setNumberFormat(){ return this; } }),
      appendRow: a => righe.push(a), getLastRow: ()=> righe.length };
  });
  return fogli;
}
function carica(file, dati, opz){
  opz = opz || {};
  const fogli = foglio(dati), cache = new Map(), mail = [], conta = {getActive:0, formatDate:0};
  const ctx = {
    console, Date: DATA_FERMA, JSON, String, Object, Array, Set, Math, Intl,
    SpreadsheetApp: { getActive(){ conta.getActive++; return {getSheetByName: n => fogli[n]}; }, flush(){}, getUi(){ return {createMenu(){ return {addItem(){ return this; }, addToUi(){}}; }, alert(){}}; } },
    CacheService: { getScriptCache: ()=> ({ get: k => cache.has(k) ? cache.get(k) : null, put: (k,v)=> { cache.set(k,v); }, remove: k => cache.delete(k) }) },
    LockService: { getScriptLock: ()=> ({waitLock(){}, releaseLock(){}}) },
    MailApp: { sendEmail: (a, o, t)=> mail.push(o) },
    Utilities: { formatDate: (d, tz, f)=> { conta.formatDate++; return fmt(d, tz, f); } },
    ContentService: { MimeType:{JSON:'json'}, createTextOutput: t => ({t, setMimeType(){ return this; }}) }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  const chiama = p => JSON.parse(vm.runInContext('doGet(' + JSON.stringify({parameter:p}) + ').t', ctx));
  return {chiama, fogli: dati, cache, mail, conta, ctx};
}
module.exports = {carica};
