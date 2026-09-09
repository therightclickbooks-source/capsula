/* ═══════════════════════════════════════════════════════════════
   LA CONDIZIONE PER SALVARE UNA SCHEDA
   Detta a voce, e senza mezzi termini: telefono obbligatorio, e tutte
   e quindici le domande dell'anamnesi risposte SI' o NO. Conditio sine
   qua non — senza, la scheda non si salva, la firma non si prende e il
   protocollo non parte.
   La parte pericolosa e' quella che non si vede: prima le risposte in
   bianco diventavano «no» da sole al momento del salvataggio. Una
   scheda cosi' e' peggio di una scheda incompleta, perche' sembra
   completa: dice «no, nessuna trombosi» a nome di uno a cui nessuno
   l'ha chiesto. Per questo qui si prova anche che le risposte non
   toccate restino non toccate.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, SCHERMI, Taccuino } = require('./aiuto');

module.exports = async function(browser){
  const tac = new Taccuino('la condizione per salvare una scheda');
  const p = await tac.pagina(browser, GESTIONALE, SCHERMI[2]);

  /* quante sono le domande, davvero */
  const quante = await p.evaluate(()=> QA.length + QB.length);
  tac.t('le domande dell\'anamnesi sono quindici', quante === 15, 'sono ' + quante);

  const r = await p.evaluate(()=>{
    const tutte = {};
    QA.concat(QB).forEach(([k])=> tutte[k] = false);
    const pieno = k => ({id:'x1', nome:'Mario', cognome:'Rossi', telefono:'3331234567',
                          anamnesi: Object.assign({}, tutte, k || {})});
    const out = {};

    out.completa      = cheManca(pieno());
    out.senzaTelefono = cheManca(Object.assign(pieno(), {telefono:''}));
    out.senzaNome     = cheManca(Object.assign(pieno(), {nome:'', cognome:''}));

    /* una sola risposta in bianco basta a fermare tutto */
    const una = pieno(); delete una.anamnesi.b7;
    out.unaSola = cheManca(una);
    out.unaSolaQuale = anamnesiMancanti(una);

    /* nessuna risposta */
    const zero = pieno(); QA.concat(QB).forEach(([k])=> delete zero.anamnesi[k]);
    out.nessuna = cheManca(zero);
    out.nessunaQuante = anamnesiMancanti(zero).length;

    /* il «no» non si mette da solo: una risposta mai data resta non data */
    out.nonSiRiempieDaSola = typeof una.anamnesi.b7;

    /* saveClient si ferma davvero: la scheda non finisce in archivio */
    const prima = DB.clients.length;
    const vecchiaCattura = captureDraftForm, vecchioToast = toast;
    let avviso = '';
    captureDraftForm = ()=>{}; toast = m => { avviso = m; };
    draftClient = una;
    try { saveClient(); } catch(e){ avviso = 'ECCEZIONE ' + e.message; }
    captureDraftForm = vecchiaCattura; toast = vecchioToast;
    out.salvate = DB.clients.length - prima;
    out.avviso = avviso;
    return out;
  });

  tac.t('una scheda completa si salva', r.completa === null, String(r.completa));
  tac.t('senza telefono non si salva', /telefono/i.test(r.senzaTelefono || ''), String(r.senzaTelefono));
  tac.t('senza nome non si salva', /nome/i.test(r.senzaNome || ''), String(r.senzaNome));
  tac.t('basta una risposta in bianco per fermare tutto',
    /una risposta/i.test(r.unaSola || ''), String(r.unaSola));
  tac.t('e dice quale manca', r.unaSolaQuale.length === 1 && r.unaSolaQuale[0] === 'b7',
    r.unaSolaQuale.join(','));
  tac.t('con nessuna risposta ne conta quindici',
    r.nessunaQuante === 15 && /15/.test(r.nessuna || ''), r.nessuna + ' / ' + r.nessunaQuante);
  tac.t('una risposta mai data NON diventa «no» da sola',
    r.nonSiRiempieDaSola === 'undefined', r.nonSiRiempieDaSola);
  tac.t('la scheda incompleta non finisce in archivio', r.salvate === 0, 'salvate ' + r.salvate);
  tac.t('e l\'operatore viene avvisato di cosa manca',
    /⛔/.test(r.avviso) && /anamnesi/i.test(r.avviso), r.avviso);

  /* l'idoneita' resta quella di prima: le tre risposte cambiano stato */
  const id = await p.evaluate(()=>{
    const base = {}; QA.concat(QB).forEach(([k])=> base[k] = false);
    const con = k => ({anamnesi: Object.assign({}, base, k)});
    return {ok: idoneita(con({})),
            no: idoneita(con({a1:true})),
            bloccato: idoneita(con({b2:true})),
            conCertificato: idoneita(con({b2:true, certificatoOk:true}))};
  });
  tac.t('senza controindicazioni e\' idoneo', id.ok === 'ok', id.ok);
  tac.t('una risposta del gruppo A ferma tutto', id.no === 'no', id.no);
  tac.t('una del gruppo B chiede il certificato', id.bloccato === 'blocked', id.bloccato);
  tac.t('col certificato si procede in sicurezza', id.conCertificato === 'cert', id.conCertificato);

  await p.close();
  return tac;
};
