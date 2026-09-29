/* ═══════════════════════════════════════════════════════════════
   LO SCRIPT DELLE PRENOTAZIONI
   docs/prenotazioni/Codice.gs gira dentro il foglio Google del centro.
   Le richieste «stato» sono quasi tutte: la pagina chiede quali orari
   sono liberi. Per non aprire il foglio a ogni richiesta i posti restano
   per qualche secondo in una copia. La copia deve accelerare e basta:
   mai far vedere libero un posto preso, mai far uscire un nome.
   ═══════════════════════════════════════════════════════════════ */
const path = require('path');
const { Taccuino } = require('./aiuto');
const { carica } = require('./google_finto');
const SCRIPT = path.join(__dirname, '..', 'docs', 'prenotazioni', 'Codice.gs');

function foglio(){
  const posti = [['Giorno','Ora','Nome','Cellulare','Prenotato il','Chiuso','Id']];
  ['2026-10-05','2026-10-06'].forEach(g=> ['08:15','09:00','09:45'].forEach(o=> posti.push([g,o,'','','','',g+'_'+o])));
  posti.push(['2026-10-07','08:15','Anna Verdi','','','','2026-10-07_08:15']);
  posti.push(['2026-10-07','09:00','','','','chiuso','2026-10-07_09:00']);
  return {Posti: posti, Attesa:[['Nome','Cellulare','Quando']], Iscritti:[['Nome','Cognome']]};
}

module.exports = async function(){
  const tac = new Taccuino('lo script delle prenotazioni');
  const G = carica(SCRIPT, foglio());
  const liberi = r => r.posti.filter(p=> p.libero).length;

  const r1 = G.chiama({azione:'stato'});
  tac.t('«stato» dice quali orari sono liberi', r1.ok && r1.posti.length === 7 && liberi(r1) === 6, JSON.stringify(r1).slice(0, 120));
  tac.t('l\'orario chiuso non compare', !r1.posti.some(p=> p.id === '2026-10-07_09:00'));
  tac.t('i nomi degli altri non escono mai', !/Anna|Verdi/.test(JSON.stringify(r1)));

  const aperture = G.conta.getActive;
  G.chiama({azione:'stato'}); G.chiama({azione:'stato', nome:'Sara', cognome:'Romano'});
  tac.t('le richieste dopo la prima non aprono il foglio: rispondono dalla copia', G.conta.getActive === aperture,
    'aperture ' + aperture + ' → ' + G.conta.getActive);

  const p = G.chiama({azione:'prenota', nome:'giulia', cognome:'ESPOSITO', id:'2026-10-05_09:00'});
  tac.t('si prenota, e il nome si scrive in ordine', p.ok && p.mia && p.mia.id === '2026-10-05_09:00' && p.nome === 'Giulia', JSON.stringify(p.mia));
  tac.t('subito dopo, chi guarda vede quel posto preso (la copia non resta indietro)',
    G.chiama({azione:'stato'}).posti.find(x=> x.id === '2026-10-05_09:00').libero === false);
  tac.t('lei, riaprendo il link, ritrova il suo orario',
    (G.chiama({azione:'stato', nome:'Giulia', cognome:'Esposito'}).mia || {}).id === '2026-10-05_09:00');
  tac.t('un\'altra persona non ha «mia»', G.chiama({azione:'stato', nome:'Sara', cognome:'Romano'}).mia === null);

  const doppio = G.chiama({azione:'prenota', nome:'Sara', cognome:'Romano', id:'2026-10-05_09:00'});
  tac.t('un posto preso non si prende: messaggio e calendario aggiornato',
    doppio.ok === false && /appena stato preso/.test(doppio.messaggio) && doppio.stato && doppio.stato.posti.find(x=> x.id === '2026-10-05_09:00').libero === false);

  const sposta = G.chiama({azione:'prenota', nome:'Giulia', cognome:'Esposito', id:'2026-10-06_08:15'});
  const st = G.chiama({azione:'stato'});
  tac.t('cambiando orario, il primo si libera e resta un orario solo',
    sposta.ok && st.posti.find(x=> x.id === '2026-10-05_09:00').libero === true && st.posti.filter(x=> !x.libero).length === 2,
    JSON.stringify(st.posti.filter(x=> !x.libero).map(x=> x.id)));

  G.chiama({azione:'annulla', nome:'Giulia', cognome:'Esposito'});
  tac.t('annullando, l\'orario torna libero per tutti', G.chiama({azione:'stato'}).posti.find(x=> x.id === '2026-10-06_08:15').libero === true);

  G.chiama({azione:'attesa', nome:'Luca', cognome:'Neri'});
  tac.t('la lista d\'attesa si ricorda di lui', G.chiama({azione:'stato', nome:'Luca', cognome:'Neri'}).inAttesa === true
    && G.chiama({azione:'stato', nome:'Sara', cognome:'Romano'}).inAttesa === false);

  tac.t('a ogni prenotazione, cambio o annullo arriva una mail al centro', G.mail.length >= 4, G.mail.length + ' mail');

  /* un giorno il foglio si modifica a mano (un orario chiuso, un nome tolto):
     la copia dura poco e poi rilegge */
  G.fogli.Posti[1][5] = 'chiuso';
  G.cache.clear();
  tac.t('modificato a mano, dopo la scadenza della copia il foglio vince',
    !G.chiama({azione:'stato'}).posti.some(x=> x.id === '2026-10-05_08:15'));
  return tac;
};
