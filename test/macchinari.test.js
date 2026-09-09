/* ═══════════════════════════════════════════════════════════════
   COSA DICIAMO DEI MACCHINARI
   Regola dettata a voce, e non e' una preferenza di stile: chi legge
   queste righe ha appena finito di allenarsi. Se il testo gli racconta
   un debito — «ti lascia i muscoli in debito», «l'indolenzimento
   arriva domani», «lavoro concentrato solo sulla parte bassa» — gli
   sta dicendo che quello che ha fatto vale poco, e lo perde. Zenith
   non e' la parte che mancava: e' la cosa che fa rendere di piu'
   quella che ha gia' fatto.
   Qui si prova che la regola vale su TUTTI E DUE i posti in cui quei
   testi compaiono — il foglio della vetrina e quello del gestionale —
   e che i fatti che il centro vuole dire ci sono davvero.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, VETRINA, SCHERMI, Taccuino } = require('./aiuto');

/* le parole che non devono comparire in nessuno dei due fogli */
const AL_NEGATIVO = [
  /in debito di recupero/i,
  /indolenzimento arriva/i,
  /nessun carico da smaltire/i,
  /concentrato sulla parte bassa/i,
  /affatica di piu/i,
  /non basta/i,
  /incompleto/i
];

module.exports = async function(browser){
  const tac = new Taccuino('cosa diciamo dei macchinari');
  const totem = SCHERMI[0], desktop = SCHERMI[2];

  /* ── il foglio della vetrina ── */
  const v = await tac.pagina(browser, VETRINA, totem);
  await v.evaluate(()=> apriMacchine());
  await v.waitForTimeout(400);
  const fv = await v.textContent('#mlist');

  /* ── il foglio del gestionale ── */
  const g = await tac.pagina(browser, GESTIONALE, desktop);
  const fg = await g.evaluate(()=>{ openMachines();
    const t = document.querySelector('.machlist').textContent; closeModal(); return t; });

  for(const [dove, testo] of [['vetrina', fv], ['gestionale', fg]]){
    const q = dove + ': ';
    tac.t(q + 'nessuna frase che suoni come una mancanza',
      AL_NEGATIVO.every(r=> !r.test(testo)),
      (AL_NEGATIVO.find(r=> r.test(testo)) || '').toString());

    /* EMS — quello che il centro vuole che si sappia */
    tac.t(q + 'EMS si chiama elettromiostimolazione', /elettromiostimolazione/i.test(testo));
    tac.t(q + 'EMS dice il total body', /total body/i.test(testo));
    tac.t(q + 'EMS dice le tre ore di sala pesi', /tre ore di sala pesi/i.test(testo));
    tac.t(q + 'EMS dice la schiena e la postura',
      /schiena/i.test(testo) && /postura/i.test(testo));

    /* Vacutherm — le tre cose che lavorano insieme, e l'addome */
    tac.t(q + 'Vacutherm dice la depressione regolata', /depressione regolata/i.test(testo));
    tac.t(q + 'Vacutherm dice che lavora anche l\'addome', /addome/i.test(testo));
    tac.t(q + 'Vacutherm dice il linfodrenaggio e i liquidi in eccesso',
      /linfodrenaggio/i.test(testo) && /liquidi in eccesso/i.test(testo));
    tac.t(q + 'Vacutherm dice gli infrarossi a onde medie', /infrarossi a onde medie/i.test(testo));
    tac.t(q + 'Vacutherm dice le cellule adipose e il consumo calorico',
      /cellule adipose/i.test(testo) && /consumo calorico/i.test(testo));

    /* gli altri tre: ognuno deve nominare le zone che ne traggono beneficio */
    tac.t(q + 'EMS2 nomina gambe, glutei, polpacci e addome',
      /polpacci/i.test(testo) && /glutei/i.test(testo));
    tac.t(q + 'Matrix nomina i gruppi che costruisce',
      /forza e tono/i.test(testo) && /catena posteriore/i.test(testo));
    tac.t(q + 'senza allenamento si parla di collo, spalle e colonna',
      /collo, spalle e colonna/i.test(testo));

    /* la regola di sempre: il modello del costruttore non si nomina */
    tac.t(q + 'la capsula si chiama solo Zenith', /Zenith/.test(testo));
  }

  /* i due fogli devono raccontare la stessa cosa: se domani si cambia
     solo la vetrina, il gestionale resta indietro e l'operatore dice
     al cliente una versione diversa da quella che il cliente ha letto */
  const FATTI = ['elettromiostimolazione','total body','tre ore di sala pesi','postura',
    'depressione regolata','addome','linfodrenaggio','infrarossi a onde medie',
    'cellule adipose','consumo calorico','catena posteriore'];
  tac.t('vetrina e gestionale raccontano gli stessi fatti',
    FATTI.every(f=> new RegExp(f,'i').test(fv) === new RegExp(f,'i').test(fg)),
    FATTI.filter(f=> new RegExp(f,'i').test(fv) !== new RegExp(f,'i').test(fg)).join(', '));

  await v.close(); await g.close();
  return tac;
};
