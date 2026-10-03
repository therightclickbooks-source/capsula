/* ═══════════════════════════════════════════════════════════════
   LA CONDIZIONE PER SALVARE UNA SCHEDA
   Detta a voce, e senza mezzi termini: nome e cognome obbligatori (il
   telefono no, e' facoltativo), e tutte e quindici le domande
   dell'anamnesi risposte SI' o NO. Conditio sine
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
    const pieno = k => ({id:'x1', nome:'Mario', cognome:'Rossi', telefono:'3331234567', attivita:['EMS'],
                          anamnesi: Object.assign({}, tutte, k || {})});
    const out = {};

    out.completa      = cheManca(pieno());
    out.senzaTelefono = cheManca(Object.assign(pieno(), {telefono:''}));
    out.senzaNome     = cheManca(Object.assign(pieno(), {nome:'', cognome:''}));
    out.senzaCognome  = cheManca(Object.assign(pieno(), {cognome:''}));
    out.soloNomeCognome = cheManca(Object.assign(pieno(), {telefono:'', prefisso:''}));

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
  tac.t('il telefono e\' facoltativo: senza, la scheda si salva', r.senzaTelefono === null, String(r.senzaTelefono));
  tac.t('servono nome E cognome: senza il cognome non si salva', /cognome/i.test(r.senzaCognome || ''), String(r.senzaCognome));
  tac.t('senza nome non si salva', /nome/i.test(r.senzaNome || ''), String(r.senzaNome));
  tac.t('nome e cognome bastano, con l\'anamnesi completa', r.soloNomeCognome === null, String(r.soloNomeCognome));
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

  /* ── il flusso unico: quattro passi di seguito, un solo salvataggio con la firma ── */
  const fl = await p.evaluate(()=>{
    newClient({}); const r = {};
    const q = s => document.querySelector(s);
    r.passi = document.querySelectorAll('#stepbar span').length;
    r.capitoli = [...document.querySelectorAll('#app .cap .cap-h')].map(h=> h.textContent.replace(/\s+/g,' ').trim().slice(0, 40));
    r.obbligatori = ['f_nome','f_cognome','seg_att'].every(id=> q('.card.req #' + id));
    r.facoltativi = ['f_tel','seg_gen'].every(id=> q('.card.opz #' + id)) && !!q('.card.opz .bdwrap');
    r.reqFuori = !q('.card.req #f_tel') && !q('.card.opz #f_nome') && !q('.card.opz #seg_att');
    r.anamnesiSenzaFirma = !q('#app .cap:nth-of-type(2) canvas') && !/Conferma firma e blocca/.test(document.querySelector('#app').textContent);
    r.firmaAlQuarto = !!document.querySelectorAll('#app .cap')[3].querySelector('#sigpad');
    r.unTastoFinale = [...document.querySelectorAll('#app button')].filter(b=> /Firma e salva la scheda/.test(b.textContent)).length === 1;
    return r;
  });
  tac.t('i capitoli sono quattro, in ordine: dati, anamnesi, seduta, firma e salva',
    fl.passi === 4 && fl.capitoli.length === 4 && /^1/.test(fl.capitoli[0]) && /^2.*Anamnesi/.test(fl.capitoli[1]) && /^3/.test(fl.capitoli[2]) && /^4.*Firma e salva/.test(fl.capitoli[3]), JSON.stringify(fl.capitoli));
  tac.t('i tre obbligatori (nome, cognome, attivita\') stanno nel riquadro «obbligatori»', fl.obbligatori && fl.reqFuori, JSON.stringify(fl));
  tac.t('data di nascita, genere, prefisso e telefono stanno nel riquadro dei facoltativi', fl.facoltativi, JSON.stringify(fl));
  tac.t('l\'anamnesi e\' solo risposte: niente firma a meta\' strada', fl.anamnesiSenzaFirma, JSON.stringify(fl));
  tac.t('la firma e il tasto «Firma e salva la scheda» stanno in fondo, uno solo', fl.firmaAlQuarto && fl.unTastoFinale, JSON.stringify(fl));

  /* senza le tre cose, senza risposte e senza firma il tasto non salva, e dice cosa manca */
  const bloc = await p.evaluate(()=>{
    const prima = DB.clients.length, avvisi = []; const vt = toast; toast = m => avvisi.push(m);
    try { firmaESalva(); } catch(e){ avvisi.push('ECCEZIONE ' + e.message); }
    document.getElementById('f_nome').value = 'Anna'; document.getElementById('f_cognome').value = 'Verdi';
    try { firmaESalva(); } catch(e){ avvisi.push('ECCEZIONE ' + e.message); }   /* manca l'attivita' */
    toggleAtt('EMS');
    try { firmaESalva(); } catch(e){ avvisi.push('ECCEZIONE ' + e.message); }   /* mancano le risposte */
    document.querySelectorAll('.yn .no').forEach(b=> b.click());
    try { firmaESalva(); } catch(e){ avvisi.push('ECCEZIONE ' + e.message); }   /* manca la firma */
    toast = vt; aggiornaFlusso();
    return {salvate: DB.clients.length - prima, avvisi, chk: document.getElementById('chk').textContent.replace(/\s+/g,' ')};
  });
  tac.t('non salva finche\' manca qualcosa, e a ogni passo dice cosa',
    bloc.salvate === 0 && /nome e cognome/i.test(bloc.avvisi[0]) && /attivit/i.test(bloc.avvisi[1]) && /anamnesi/i.test(bloc.avvisi[2]) && /firma/i.test(bloc.avvisi[3]), JSON.stringify(bloc));
  tac.t('le spunte sopra il tasto dicono cosa e\' a posto', /✓ Nome e cognome/.test(bloc.chk) && /✓ Attività/.test(bloc.chk) && /✓ Anamnesi/.test(bloc.chk) && /✕ Firma/.test(bloc.chk), bloc.chk);

  /* con tutto a posto: un solo tocco salva e blocca l'anamnesi */
  await p.evaluate(()=> document.getElementById('sigpad').scrollIntoView({block:'center'}));
  await p.waitForTimeout(400);
  const bb = await (await p.$('#sigpad')).boundingBox();
  await p.mouse.move(bb.x + 30, bb.y + 40); await p.mouse.down(); await p.mouse.move(bb.x + 120, bb.y + 20, {steps:6}); await p.mouse.move(bb.x + 200, bb.y + 60, {steps:6}); await p.mouse.up();
  const ok = await p.evaluate(()=>{ const prima = DB.clients.length; firmaESalva();
    const c = DB.clients.find(x=> x.nome === 'Anna' && x.cognome === 'Verdi');
    return {salvate: DB.clients.length - prima, firmata: !!(c && c.anamnesi.firma && c.anamnesi.firmaData), telefono: c ? c.telefono : null, att: c ? c.attivita.join() : null}; });
  tac.t('un solo tocco: la scheda e\' salvata, firmata e bloccata, anche senza telefono',
    ok.salvate === 1 && ok.firmata && ok.telefono === '' && ok.att === 'EMS', JSON.stringify(ok));

  /* ── «sensibile al calore» e i parametri acceso/spento: le due cose non si contraddicono ── */
  const ca = await p.evaluate(()=>{
    newClient({}); const r = {}; const q = s => document.querySelector(s);
    r.tasti = !!q('#yn_cal button.si') && !!q('#yn_cal button.no') && !!q('#calic svg');
    r.acceso = ['polpacci','plantari','calore','ioni','zerog'].every(k=> q('#mrow_' + k + ' .seg2') && q('#mrow_' + k + ' .seg2').children.length === 2);
    r.vecchiInterruttori = document.querySelectorAll('#app .sw[onclick*="m_toggle"], #app .sw[onclick*="m_onoff"], #app .sw[onclick*="caloreSensibile"]').length;
    r.calorePartenza = MDRAFT.calore;
    setCaloreSens(true);
    r.siBloccata = q('#mrow_calore').classList.contains('bloccata') && MDRAFT.calore === false && q('#mrow_calore .seg2 span:nth-child(2)').classList.contains('on');
    r.siTesto = /sempre spento/i.test(q('#cal_esito').textContent) && /sensibile/i.test(q('#mrow_calore').textContent);
    m_set('calore', true);
    r.siNonSiAccende = MDRAFT.calore === false;
    setCaloreSens(false);
    r.noSbloccata = !q('#mrow_calore').classList.contains('bloccata') && MDRAFT.calore === r.calorePartenza && /può essere usato/i.test(q('#cal_esito').textContent);
    m_set('ioni', true); r.ioni = MDRAFT.ioni === true;
    m_set('polpacci', false); r.polpacci = MDRAFT.polpacci === 0;
    m_set('plantari', true); r.plantari = MDRAFT.plantari > 0;
    m_set('zerog', false); r.zerog = MDRAFT.zerog === false;
    return r;
  });
  tac.t('«Sensibile al calore» ha l\'icona e i tasti SÌ / NO', ca.tasti, JSON.stringify(ca));
  tac.t('leg, foot, calore, ioni e zero gravity sono ACCESO / SPENTO, niente interruttori', ca.acceso && ca.vecchiInterruttori === 0, JSON.stringify(ca));
  tac.t('con SÌ il calore lombare va su spento e si blocca', ca.siBloccata && ca.siTesto && ca.siNonSiAccende, JSON.stringify(ca));
  tac.t('con NO il calore lombare si sblocca e torna com\'era', ca.noSbloccata, JSON.stringify(ca));
  tac.t('i parametri acceso/spento cambiano davvero il punto di partenza', ca.ioni && ca.polpacci && ca.plantari && ca.zerog, JSON.stringify(ca));

  /* e il motore: sensibile = calore spento in ogni seduta, anche per un protocollo che lo userebbe */
  const mo = await p.evaluate(()=>{
    const base = {id:'k1', nome:'A', cognome:'B', genere:'F', macro:{intensita:3,fourD:3,airbag:3,calore:true,ioni:false,zerog:true,timer:20,plantari:2,polpacci:2}};
    const tutte = {}; QA.concat(QB).forEach(([k])=> tutte[k] = false);
    DB.sessions = DB.sessions || [];
    const mk = sens => Object.assign({}, base, {anamnesi: Object.assign({}, tutte, {caloreSensibile: sens, zone:[], prefIntensita:'medio', sonno:'buono'})});
    const quiz = {activity:'riposo', goal:'sollievo', zones:['lombare'], mood:'sereno', pressione:'media'};
    const prima = DB.sessions.length;
    DB.sessions.push({id:'s0', clientId:'k1', date:new Date().toISOString(), fam:'Z8', prog:'P01', quiz:{}, settings:{timer:20}});
    const sens = buildProtocol(mk(true), quiz).S.calore, tol = buildProtocol(mk(false), quiz).S.calore;
    DB.sessions.pop();
    return {sens, tol};
  });
  tac.t('sensibile = nessun protocollo accende il calore; non sensibile = il protocollo per la schiena lo accende', mo.sens === false && mo.tol === true, JSON.stringify(mo));

  await p.close();
  return tac;
};
