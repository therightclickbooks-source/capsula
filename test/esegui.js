#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   LE PROVE DI ZENITH
       node test/esegui.js              tutte
       node test/esegui.js vetrina      solo quelle che si chiamano cosi'
   Esce con 0 se e' tutto verde, con 1 al primo rosso: cosi' si puo'
   attaccare a un controllo automatico senza cambiare niente.
   ═══════════════════════════════════════════════════════════════ */
const { apriBrowser } = require('./aiuto');

const PROVE = [
  ['vetrina',     require('./vetrina.test.js')],
  ['macchinari',  require('./macchinari.test.js')],
  ['domande',     require('./domande.test.js')],
  ['anagrafica',  require('./anagrafica.test.js')],
  ['operatori',   require('./operatori.test.js')],
  ['casa',        require('./casa.test.js')],
  ['protocollo',  require('./protocollo.test.js')]
];

(async ()=>{
  const filtro = process.argv[2];
  const scelte = filtro ? PROVE.filter(([n]) => n.includes(filtro)) : PROVE;
  if(!scelte.length){
    console.error('Nessuna prova si chiama «' + filtro + '». Ci sono: '
      + PROVE.map(([n]) => n).join(', '));
    process.exit(2);
  }

  const browser = await apriBrowser();
  let verdi = 0, rossi = 0;
  const inizio = Date.now();
  try {
    for(const [nome, prova] of scelte){
      let tac;
      try { tac = await prova(browser); }
      catch(e){
        console.log('── ' + nome + ' · la prova stessa e\' esplosa');
        console.log('   ' + (e && e.stack ? e.stack.split('\n').slice(0,3).join('\n   ') : e));
        rossi++; continue;
      }
      rossi += tac.stampa();
      verdi += tac.verdi;
    }
  } finally { await browser.close(); }

  const sec = ((Date.now() - inizio) / 1000).toFixed(1);
  console.log('\nTOTALE · ' + verdi + ' verdi · ' + rossi + ' rossi · ' + sec + 's');
  process.exit(rossi ? 1 : 0);
})();
