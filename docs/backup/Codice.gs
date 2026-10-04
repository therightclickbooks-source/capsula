/* ═══════════════════════════════════════════════════════════════
   BACKUP AUTOMATICO DI ZENITH COPILOT SU GOOGLE DRIVE
   Si incolla in un progetto Apps Script dell'account Google del centro.
   Riceve la copia che l'app manda da sola (una volta al giorno, quando si
   apre) e la salva come file .json nella cartella «Backup Zenith Copilot»
   del Drive. Tiene le ultime TIENI copie e butta nel cestino le piu' vecchie.

   La PAROLA D'ORDINE non sta qui dentro: si scrive in
   Impostazioni progetto → Proprietà dello script, nome SEGRETO.
   Cosi' il codice si puo' guardare e copiare senza rischi.
   ═══════════════════════════════════════════════════════════════ */
const CARTELLA = 'Backup Zenith Copilot';
const TIENI = 60;                 /* quante copie tenere (con piu' dispositivi servono piu' righe) */
const FUSO = 'Europe/Rome';

function doPost(e){
  try{
    const segreto = PropertiesService.getScriptProperties().getProperty('SEGRETO');
    if(!segreto) return risposta({esito:'no', motivo:'la parola d\'ordine non è impostata nello script'});
    let corpo;
    try{ corpo = JSON.parse(e.postData.contents); }
    catch(x){ return risposta({esito:'no', motivo:'dati non leggibili'}); }
    if(!corpo || corpo.segreto !== segreto) return risposta({esito:'no', motivo:'parola d\'ordine errata'});
    if(!corpo.dati || typeof corpo.dati !== 'object') return risposta({esito:'no', motivo:'nessun dato da salvare'});

    const nCl = (corpo.dati.clients || []).length, nSe = (corpo.dati.sessions || []).length;
    const quando = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd_HH-mm');
    /* il nome dice quanti clienti e quante sedute: cosi' si riconosce da che dispositivo viene */
    const nome = 'zenith-backup-' + quando + '_' + nCl + 'clienti-' + nSe + 'sedute.json';
    const cartella = trovaCartella();
    cartella.createFile(nome, JSON.stringify(corpo.dati), 'application/json');
    puliscivecchi(cartella);
    return risposta({esito:'ok', salvato:nome});
  }catch(err){
    return risposta({esito:'no', motivo:String(err)});
  }
}
/* aprendo l'indirizzo dal browser si vede solo che lo script e' vivo */
function doGet(){ return risposta({esito:'ok', nota:'Zenith backup attivo'}); }

function risposta(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function trovaCartella(){
  const it = DriveApp.getFoldersByName(CARTELLA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARTELLA);
}
function puliscivecchi(cartella){
  const tutti = [], it = cartella.getFiles();
  while(it.hasNext()){ const f = it.next(); tutti.push([f.getName(), f]); }
  tutti.sort((a, b)=> a[0] < b[0] ? 1 : -1);          /* dal piu' recente: il nome comincia con la data */
  tutti.slice(TIENI).forEach(x=> x[1].setTrashed(true));
}

/* Da lanciare UNA volta a mano (▶ Esegui), per far chiedere il permesso sul Drive */
function provaAutorizzazione(){ trovaCartella(); Logger.log('Cartella pronta: ' + CARTELLA); }
