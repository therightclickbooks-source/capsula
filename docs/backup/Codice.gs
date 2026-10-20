/* ═══════════════════════════════════════════════════════════════
   BACKUP AUTOMATICO DI ZENITH COPILOT SU GOOGLE DRIVE
   Si incolla in un progetto Apps Script dell'account Google del centro.
   Riceve la copia che l'app manda da sola (una volta al giorno, quando si
   apre) e la salva come file .json nella cartella «Zenith Copilot Backup»
   del Drive. Tiene le ultime TIENI copie e butta nel cestino le piu' vecchie.

   La PAROLA D'ORDINE non sta qui dentro: si scrive in
   Impostazioni progetto → Proprietà dello script, nome SEGRETO.
   Cosi' il codice si puo' guardare e copiare senza rischi.

   ANCHE PER MAIL: se nell'app di un dispositivo e' acceso «✉️ Anche per
   mail», la stessa copia arriva anche come allegato a MAIL (sotto).
   Dopo aver incollato questa versione: ▶ Esegui «provaMail» una volta
   (chiede il permesso di mandare mail), poi Gestisci deployment →
   matita → Nuova versione → Esegui il deployment. L'indirizzo /exec
   resta lo stesso: nell'app non si cambia niente.

   IL SIMBOLO: le mail di questo backup cominciano con 🛡️ (lo scudo),
   per non confonderle con quelle di Fresha, che hanno 💾 (il dischetto).
   Per lo stesso motivo la cartella si chiama «Zenith Copilot Backup» e
   non «Zenith Backup», che e' quella di Fresha.
   ═══════════════════════════════════════════════════════════════ */
const CARTELLA = 'Zenith Copilot Backup';
const CARTELLA_VECCHIA = 'Backup Zenith Copilot';   /* il nome di prima: la cartella si rinomina da sola */
const TIENI = 60;                 /* quante copie tenere (con piu' dispositivi servono piu' righe) */
const FUSO = 'Europe/Rome';
const MAIL = 'zenithfitnesslab@gmail.com';   /* dove arriva la copia per mail */

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
    /* il nome del dispositivo (scritto in Impostazioni dell'app), pulito: solo lettere, numeri e trattini */
    const disp = String(corpo.dispositivo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
    /* il nome del file: data, dispositivo, e quanti clienti e quante sedute ci sono dentro */
    const nome = 'zenith-backup-' + quando + (disp ? '_' + disp : '') + '_' + nCl + 'clienti-' + nSe + 'sedute.json';
    const cartella = trovaCartella();
    const file = cartella.createFile(nome, JSON.stringify(corpo.dati), 'application/json');
    puliscivecchi(cartella);
    /* la copia per mail: solo se il dispositivo l'ha chiesta. Se la mail non parte,
       la copia su Drive resta comunque salvata */
    let mail;
    if(corpo.perMail === true){
      try{
        MailApp.sendEmail({to: MAIL,
          subject: '🛡️ Zenith Copilot — backup del ' + Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd') + (disp ? ' · ' + disp : ''),
          body: 'Copia di sicurezza del gestionale della capsula, in allegato.\n\n'
            + 'clienti: ' + nCl + ' · sedute: ' + nSe + (disp ? '\ndispositivo: ' + disp : '')
            + '\n\nLo stesso file è anche su Google Drive, nella cartella «' + CARTELLA + '».'
            + '\nPer ripristinarlo: nell\'app, Impostazioni › Importa backup, e scegli il file allegato.',
          attachments: [file.getBlob().setName(nome)]});
        mail = true;
      }catch(x){ mail = false; }
    }
    return risposta({esito:'ok', salvato:nome, mail:mail});
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
  if(it.hasNext()) return it.next();
  /* c'e' ancora la cartella col nome di prima: si rinomina, cosi' le copie vecchie restano insieme alle nuove */
  const vecchia = DriveApp.getFoldersByName(CARTELLA_VECCHIA);
  if(vecchia.hasNext()){ const c = vecchia.next(); c.setName(CARTELLA); return c; }
  return DriveApp.createFolder(CARTELLA);
}
function puliscivecchi(cartella){
  const tutti = [], it = cartella.getFiles();
  while(it.hasNext()){ const f = it.next(); tutti.push([f.getName(), f]); }
  tutti.sort((a, b)=> a[0] < b[0] ? 1 : -1);          /* dal piu' recente: il nome comincia con la data */
  tutti.slice(TIENI).forEach(x=> x[1].setTrashed(true));
}

/* Da lanciare UNA volta a mano (▶ Esegui), per far chiedere il permesso sul Drive */
function provaAutorizzazione(){ trovaCartella(); Logger.log('Cartella pronta: ' + CARTELLA); }
/* Da lanciare UNA volta a mano dopo aver incollato questa versione: chiede il permesso per le mail */
function provaMail(){
  trovaCartella();   /* intanto rinomina la cartella, se ha ancora il nome di prima */
  MailApp.sendEmail(MAIL, '🛡️ Zenith Copilot — prova della mail del backup', 'Se leggi questa mail, i backup di Zenith Copilot arriveranno qui.');
  Logger.log('Mail di prova mandata a ' + MAIL + ' · cartella su Drive: ' + CARTELLA);
}
