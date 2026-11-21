/* ═══════════════════════════════════════════════════════════════
   I NOMI DEI PROTOCOLLI, IL QUADRANTE, LE ISTRUZIONI CHIUSE,
   LE SCHEDE DOPPIE E LE SEDUTE RECUPERATE
   · ogni combinazione dei parametri principali ha un nome inglese suo,
     e dal nome si torna ai parametri: 28.224 nomi per categoria;
   · la proposta mostra il nome in grande, la categoria (il programma del
     touchscreen) sotto, e il quadrante con le funzioni accese e spente;
   · le istruzioni scritte dei passi stanno chiuse, il tasto del timer no;
   · due schede della stessa persona si uniscono senza perdere niente;
   · una seduta persa si rimette nella scheda col suo codice o col nome.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, VETRINA, Taccuino } = require('./aiuto');

function archivio(){
  const anamnesi = {certificatoOk:false, zone:[], prefIntensita:'medio', sonno:'buono', caloreSensibile:false};
  ['a1','a2','a3','a4','a5','a6','b1','b2','b3','b4','b5','b6','b7','b8','b9'].forEach(k=> anamnesi[k] = false);
  const S = (d, a) => ({fourD:d, airbag:a, calore:true, ioni:false, zerog:true, polpacci:1, plantari:1, timer:20});
  return {codeHash:'x', codeLen:4,
    clients:[
      {id:'c1', nome:'Palma', cognome:'Lux', genere:'F', telefono:'3331112222', anamnesi, cal:0, createdAt:'2026-09-01T10:00:00.000Z',
       premiUsati:{'g1-1-b':{data:'2026-10-01T10:00:00.000Z'}}},
      {id:'c2', nome:'palma', cognome:'LUX', genere:'', telefono:'', anamnesi:{zone:[]}, cal:0, createdAt:'2026-10-20T10:00:00.000Z', note:'fatta al totem'},
      {id:'c3', nome:'Andrea', cognome:'Rossi', genere:'M', telefono:'3330000000', anamnesi, cal:0,
       premiScelte:{'g1-1-r':{a:'c2', data:'2026-10-21T10:00:00.000Z'}}}],
    sessions:[
      {id:'s1', clientId:'c1', date:'2026-10-09T10:00:00.000Z', prog:'P22', fam:'Z1', zCode:'Z1·P22·D1A1CG', settings:S(1,1), scala:'capsula', quiz:{activity:'riposo', zones:[]}},
      {id:'s2', clientId:'c2', date:'2026-10-20T10:00:00.000Z', prog:'P04', fam:'Z4', zCode:'Z4·P04·D2A2CG', settings:S(2,2), scala:'capsula', quiz:{activity:'riposo', zones:['lombare']}},
      {id:'s3', clientId:'c2', date:'2026-11-02T10:00:00.000Z', prog:'P05', fam:'Z4', zCode:'Z4·P05·D3A2CG', settings:S(3,2), scala:'capsula', quiz:{activity:'riposo', zones:['glutei']},
       omaggio:{da:'c2', pid:'g1-1-b'}}],
    operators:[], checkins:[{id:'k1', clienteId:'c2', nome:'Palma', cognome:'Lux', quando:'2026-11-02T09:00:00.000Z'}]};
}

module.exports = async function(browser){
  const tac = new Taccuino('i nomi dei protocolli, il quadrante, le schede doppie, le sedute recuperate');
  const p = await browser.newPage({viewport:{width:430, height:900}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  await p.addInitScript(d => { try{ if(!localStorage.getItem('zfl_app_v1')) localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await p.goto(GESTIONALE); await p.waitForTimeout(600);

  /* 1 · i nomi: tutti diversi, tutti reversibili */
  const nomi = await p.evaluate(() => {
    const M = MOTORE, C = M.NOME_C, ZS = [null, ['tutto']], Z = ['spalle','braccia','vita','gambe'];
    for(let m = 0; m < 16; m++) ZS.push(Z.filter((k, i) => m & (1 << i)));
    const visti = new Set(); let n = 0, sbagli = 0;
    for(const pg of Object.keys(C)) for(let d = 0; d < 7; d++) for(let a = 0; a < 7; a++) for(let b = 0; b < 32; b++) for(const z of ZS){
      const S = {fourD:d, airbag:a, ioni:!!(b & 16), calore:!!(b & 8), zerog:!!(b & 4), polpacci:(b & 2) ? 1 : 0, plantari:b & 1};
      const nm = M.nomeProtocollo(pg, S, z); n++; visti.add(nm);
      const r = M.daNome(nm);
      if(!r || r.prog !== pg || r.nome !== nm || r.S.fourD !== d || r.S.airbag !== a || JSON.stringify(r.zone) !== JSON.stringify(z)) sbagli++;
    }
    const base = {fourD:1, airbag:1, ioni:false, calore:true, zerog:true, polpacci:1, plantari:1};
    const uno = M.nomeProtocollo('P22', base, null);
    const variati = [{fourD:2}, {airbag:2}, {ioni:true}, {calore:false}, {zerog:false}, {polpacci:0}, {plantari:0}]
      .map(v => M.nomeProtocollo('P22', Object.assign({}, base, v), null)).concat([M.nomeProtocollo('P22', base, ['tutto']), M.nomeProtocollo('P22', base, ['spalle','vita','gambe'])]);
    const parole = M.NOME_A.concat(M.NOME_B, Object.values(C).flat());
    return {n, distinti: visti.size, sbagli, uno, ancora: M.nomeProtocollo('P22', Object.assign({}, base), null), variati,
      inglese: parole.every(w => /^[A-Z][a-z]+$/.test(w)), parole: parole.length, paroleDistinte: new Set(parole).size,
      categoria: C.P22, scritto: M.daNome('  “' + uno.toLowerCase().replace(/ /g, '-') + '” ')};
  });
  tac.t('24 categorie × 28.224 combinazioni = 677.376 nomi, tutti diversi, e dal nome si torna sempre ai parametri',
    nomi.n === 677376 && nomi.distinti === 677376 && nomi.sbagli === 0, JSON.stringify({n:nomi.n, distinti:nomi.distinti, sbagli:nomi.sbagli}));
  tac.t('gli stessi parametri danno sempre lo stesso nome; cambiandone uno solo (4D, airbag, ioni, calore, zero gravity, rulli, zone) il nome cambia',
    nomi.uno === nomi.ancora && nomi.variati.every(v => v !== nomi.uno) && new Set(nomi.variati).size === nomi.variati.length, JSON.stringify(nomi.variati));
  tac.t('i nomi sono tre parole inglesi, l\'ultima della sua categoria (264 parole, nessuna ripetuta)',
    nomi.inglese && nomi.parole === 264 && nomi.paroleDistinte === 264 && nomi.categoria.indexOf(nomi.uno.split(' ')[2]) >= 0, nomi.uno);
  tac.t('il nome si riconosce anche scritto in minuscolo, con trattini e virgolette', !!nomi.scritto && nomi.scritto.nome === nomi.uno, JSON.stringify(nomi.scritto));

  /* 2 · la proposta: il nome, la categoria, il quadrante, le istruzioni chiuse */
  const prop = await p.evaluate(() => {
    quizState = {clientId:'c3', activity:'riposo', giornata:'tranquilla', goal:'sollievo', zones:['cervicale','lombare'], mood:'dolorante', pressione:'media', prefSoloAria:false};
    NAV = [{name:'home'}]; go('proposal');
    const S = currentProt.S, q = document.querySelector('.quad');
    const acceso = t => { const x = [...q.querySelectorAll('.qd-s')].find(e => e.textContent.indexOf(t) >= 0); return x ? x.classList.contains('on') : null; };
    const det = [...document.querySelectorAll('details.gdet')];
    const tm = document.querySelector('.tmgo-b');
    return {titolo: document.querySelector('.pname2').textContent, atteso: '“' + nomeProt(currentProt) + '”',
      categoria: document.querySelector('.pcat').textContent, prog: PROGRAMS[currentProt.prog].o,
      quad: !!q, sopra: q && q.compareDocumentPosition(document.querySelector('.call.acc')) & Node.DOCUMENT_POSITION_FOLLOWING,
      d: q.querySelector('.qd-v').textContent, S,
      calore: acceso('Calore'), ioni: acceso('Ioni'), zerog: acceso('Zero Gravity'), leg: acceso('Leg Kneading'), foot: acceso('Foot Roller'),
      vecchia: !!document.querySelector('.proposal .settinggrid'),
      cassetti: det.length, aperti: det.filter(x => x.open).length,
      timer: !!tm && !tm.closest('details') && tm.offsetHeight > 0,
      legendaDentro: [...document.querySelectorAll('.glegend')].every(g => !!g.closest('details.gdet')),
      testoTocco: !!document.querySelector('details.gdet summary') && /Leggi le istruzioni/.test(document.querySelector('details.gdet summary').textContent)};
  });
  tac.t('in cima alla proposta c\'è il nome del protocollo, non quello della categoria', prop.titolo === prop.atteso && prop.titolo.indexOf(prop.prog) < 0, prop.titolo);
  tac.t('sotto il nome c\'è la categoria: il programma da toccare sul touchscreen', prop.categoria.indexOf(prop.prog) >= 0 && /touchscreen/.test(prop.categoria), prop.categoria);
  tac.t('il quadrante sta sopra il «perché», con il 4D e gli interruttori accesi e spenti come nel protocollo',
    prop.quad && !!prop.sopra && +prop.d === prop.S.fourD && prop.calore === !!prop.S.calore && prop.ioni === !!prop.S.ioni
      && prop.zerog === !!prop.S.zerog && prop.leg === (prop.S.polpacci > 0) && prop.foot === (prop.S.plantari > 0) && !prop.vecchia, JSON.stringify(prop));
  tac.t('le istruzioni scritte dei passi stanno chiuse sotto «Leggi le istruzioni»; il tasto del timer resta a vista',
    prop.cassetti >= 6 && prop.aperti === 0 && prop.legendaDentro && prop.testoTocco && prop.timer, JSON.stringify({c:prop.cassetti, a:prop.aperti, t:prop.timer}));
  const tutte = await p.evaluate(() => { const b = document.querySelector('.gall'); b.click();
    const a = [...document.querySelectorAll('details.gdet')].every(d => d.open), t1 = b.textContent;
    b.click(); return {a, t1, chiuse: [...document.querySelectorAll('details.gdet')].every(d => !d.open)}; });
  tac.t('«Apri tutte le istruzioni» le apre tutte, e lo stesso tasto le richiude', tutte.a && /Chiudi/.test(tutte.t1) && tutte.chiuse, JSON.stringify(tutte));

  /* 3 · la seduta registrata si porta il nome, e lo storico lo mostra con la categoria */
  const reg = await p.evaluate(() => {
    const atteso = nomeProt(currentProt);
    document.getElementById('okbtn').click();
    const s = DB.sessions[DB.sessions.length - 1];
    go('client', {id:'c3'});
    const riga = document.querySelector('.sessrow[data-sid="' + s.id + '"]');
    return {nome: s.nome, atteso, aria: s.aria !== undefined, titolo: riga.querySelector('.sr-prog').textContent.trim(), cat: riga.querySelector('.sr-cat').textContent,
      prog: PROGRAMS[s.prog].o};
  });
  tac.t('la seduta registrata si porta scritto il suo nome, e lo storico lo mostra con sotto la categoria',
    reg.nome === reg.atteso && reg.aria && reg.titolo === reg.nome && reg.cat.indexOf(reg.prog) >= 0, JSON.stringify(reg));

  /* 4 · le schede doppie */
  const dop = await p.evaluate(() => {
    const out = {};
    go('clients'); out.elenco = !!document.querySelector('.dopbar') && /Palma Lux/i.test(document.querySelector('.dopbar').textContent);
    go('client', {id:'c1'}); out.scheda = !!document.querySelector('.dopbar');
    /* gia' aperta una seduta da registrare per il doppione */
    aperteSalva([{clientId:'c2', stato:'registra', inizio:'2026-11-02T10:00:00.000Z', prot:{prog:'P04', fam:'Z4', S:{fourD:1, airbag:1}}, quiz:{}}]);
    DB.codeHash = hash('1234');
    confermaUnisci('c1', 'c2');
    out.chiede = document.getElementById('modal').classList.contains('open') && /Unire/.test(document.getElementById('modal').textContent);
    document.getElementById('mcode').value = '1234'; confirmCode();
    out.clienti = DB.clients.map(c => c.id).join(',');
    out.sedute = DB.sessions.filter(s => s.clientId === 'c1').length;
    out.orfane = DB.sessions.filter(s => s.clientId === 'c2').length;
    out.omaggio = DB.sessions.find(s => s.id === 's3').omaggio.da;
    out.checkin = DB.checkins[0].clienteId;
    out.regalo = DB.clients.find(c => c.id === 'c3').premiScelte['g1-1-r'].a;
    out.premio = !!DB.clients.find(c => c.id === 'c1').premiUsati['g1-1-b'];
    out.nota = DB.clients.find(c => c.id === 'c1').note;
    out.anamnesiCompleta = anamnesiMancanti(DB.clients.find(c => c.id === 'c1')).length === 0;
    out.aperte = aperte().map(a => a.clientId + ':' + a.stato).join(',');
    out.vista = VIEW.name + ':' + VIEW.id;
    out.nessunBanner = !document.querySelector('.dopbar');
    return out;
  });
  tac.t('due schede con lo stesso nome (anche scritto diverso) si segnalano nell\'elenco e nella scheda', dop.elenco && dop.scheda, JSON.stringify(dop));
  tac.t('unire chiede il Codice Zenith; poi resta una scheda sola con tutte le sedute', dop.chiede && dop.clienti === 'c1,c3' && dop.sedute === 3 && dop.orfane === 0 && dop.vista === 'client:c1' && dop.nessunBanner, JSON.stringify(dop));
  tac.t('passano anche omaggi, check-in del totem, regali ricevuti e sedute da chiudere; i premi usati restano',
    dop.omaggio === 'c1' && dop.checkin === 'c1' && dop.regalo === 'c1' && dop.premio && dop.aperte === 'c1:registra', JSON.stringify(dop));
  tac.t('dei dati si completano quelli vuoti e l\'anamnesi resta la più completa', /fatta al totem/.test(dop.nota || '') && dop.anamnesiCompleta, JSON.stringify(dop));

  /* 5 · recuperare una seduta persa */
  const rec = await p.evaluate(() => {
    const out = {};
    go('client', {id:'c1'});
    const prima = DB.sessions.length;
    apriRecupera('c1');
    const ok = () => document.getElementById('rc_ok').disabled === false;
    const scrivi = t => { document.getElementById('rc_cod').value = t; rcAggiorna(); return {ok: ok(), testo: document.getElementById('rc_prev').textContent.replace(/\s+/g, ' ')}; };
    out.vuoto = scrivi('');
    out.sbagliato = scrivi('ciao come stai');
    out.codice = scrivi('z1 p22 d1a1cg');
    out.senzaFamiglia = scrivi('P04·D2A2ICG');
    out.leg = (RECUPERO.leg = true, rcAggiorna(), document.getElementById('rc_prev').textContent.indexOf('Leg Kneading') >= 0);
    document.getElementById('rc_cod').value = 'Z4·P04·D2A2ICG'; rcAggiorna();
    document.getElementById('rc_data').value = '2026-10-30'; document.getElementById('rc_ora').value = '18:15';
    rcSalva();
    const s = DB.sessions[DB.sessions.length - 1];
    out.salvata = {n: DB.sessions.length - prima, prog: s.prog, fam: s.fam, zCode: s.zCode, giorno: dayKey(s.date), ora: new Date(s.date).getHours() + ':' + new Date(s.date).getMinutes(),
      leg: s.settings.polpacci, foot: s.settings.plantari, recuperata: s.recuperata, punti: s.points, nome: s.nome};
    out.storico = !!document.querySelector('.sessrow[data-sid="' + s.id + '"] .sr-rec');
    /* dal nome: torna tutto, anche le zone degli airbag */
    const z = MOTORE.nomeProtocollo('P05', {fourD:3, airbag:2, ioni:true, calore:false, zerog:true, polpacci:0, plantari:1}, ['vita','gambe']);
    apriRecupera('c1'); out.dalNome = scrivi(z);
    document.getElementById('rc_data').value = '2026-10-31'; rcSalva();
    const t = DB.sessions[DB.sessions.length - 1];
    out.nome = {nome: t.nome, atteso: z, S: t.settings, aria: t.aria, prog: t.prog};
    /* a mano, campo per campo: lo stesso nome che darebbe il motore */
    apriRecupera('c1');
    out.manoVuoto = document.getElementById('rc_ok').disabled;
    rcSet('prog','P08'); rcSet('fam','Z3'); rcSet('D',2); rcSet('A',3); rcSet('I'); rcSet('G'); rcSet('foot'); rcSet('spegni','braccia'); rcDurata(25);
    const Sm = {fourD:2, airbag:3, ioni:true, calore:false, zerog:true, polpacci:0, plantari:1};
    out.mano = {prev: document.getElementById('rc_prev').textContent, atteso: MOTORE.nomeProtocollo('P08', Sm, null),
      ok: !document.getElementById('rc_ok').disabled, leg: document.querySelectorAll('#rc_par .rcch b').length,
      spenta: (document.querySelector('#rc_par .opt.azoff') || {}).textContent || ''};
    rcExtra(); rcRif('up','on'); rcRif('up','tkey','SHIATSU'); rcRif('dn','on'); rcRif('dn','plantare',2); rcRif('dn','da',24);
    document.getElementById('rc_data').value = '2026-11-01'; rcSalva();
    const u = DB.sessions[DB.sessions.length - 1];
    out.rif = {up: u.manualRef && u.manualRef.tkey, upDa: u.manualRef && u.manualRef.da, dnPiedi: u.manualBasso && u.manualBasso.plantare,
      piano: pianoSeduta({S:u.settings, manualRef:u.manualRef, manualBasso:u.manualBasso, fam:u.fam, prog:u.prog}).eventi.map(e => e.id + ':' + e.a).join(',')};
    out.manoSalvata = {nome: u.nome, zCode: u.zCode, aria: u.aria, spente: u.spente, timer: u.settings.timer, foot: u.settings.plantari};
    /* nel futuro no */
    apriRecupera('c1'); document.getElementById('rc_cod').value = 'Z1·P22·D1A1CG'; rcAggiorna();
    const domani = new Date(Date.now() + 2 * 864e5);
    document.getElementById('rc_data').value = domani.toLocaleDateString('sv-SE'); const n0 = DB.sessions.length; rcSalva();
    out.futuro = DB.sessions.length === n0; closeModal();
    /* dallo storico si sceglie prima il cliente */
    go('history'); out.tastoStorico = !!document.querySelector('.rcstor');
    apriRecupera(); out.chiedeCliente = !!document.getElementById('rc_q');
    document.getElementById('rc_q').value = 'rossi'; rcClienti(); document.querySelector('#rc_cl .unr').click();
    out.scelto = RECUPERO.cid; closeModal();
    return out;
  });
  tac.t('il recupero resta spento finché non riconosce un codice o un nome', !rec.vuoto.ok && !rec.sbagliato.ok && /Non riconosco/.test(rec.sbagliato.testo), JSON.stringify([rec.vuoto, rec.sbagliato]));
  tac.t('riconosce il codice scritto come capita, anche senza la famiglia, e chiede i rulli che il codice non dice',
    rec.codice.ok && /Gently Rub Soothing/.test(rec.codice.testo) && rec.senzaFamiglia.ok && /Back Relieve/.test(rec.senzaFamiglia.testo)
      && /rulli di gambe e piedi/.test(rec.senzaFamiglia.testo) && rec.leg, JSON.stringify([rec.codice, rec.senzaFamiglia]));
  tac.t('la seduta recuperata entra con giorno e ora scelti, conta 10 punti ed è segnata «recuperata» nello storico',
    rec.salvata.n === 1 && rec.salvata.prog === 'P04' && rec.salvata.fam === 'Z4' && rec.salvata.zCode === 'Z4·P04·D2A2ICG' && rec.salvata.giorno === '2026-10-30'
      && rec.salvata.ora === '18:15' && rec.salvata.leg === 1 && rec.salvata.foot === 0 && rec.salvata.recuperata && rec.salvata.punti === 10 && !!rec.salvata.nome && rec.storico,
    JSON.stringify(rec.salvata));
  tac.t('dal nome torna tutto: categoria, valori, rulli e zone degli airbag',
    rec.dalNome.ok && rec.nome.nome === rec.nome.atteso && rec.nome.prog === 'P05' && rec.nome.S.fourD === 3 && rec.nome.S.ioni === true && rec.nome.S.calore === false
      && rec.nome.S.polpacci === 0 && rec.nome.S.plantari === 1 && JSON.stringify(rec.nome.aria) === '["vita","gambe"]', JSON.stringify(rec.nome));
  tac.t('una seduta nel futuro non si recupera', rec.futuro);
  tac.t('a mano, scegliendo Z, P, D, A, I, C, G, extra e airbag spenti, esce lo stesso nome del motore e si salva col segno ⊘',
    rec.manoVuoto && rec.mano.ok && rec.mano.prev.indexOf(rec.mano.atteso) >= 0 && /⊘ braccia/.test(rec.mano.prev) && rec.mano.spenta === '⊘ braccia' && rec.mano.leg === 9 + 24
      && rec.manoSalvata.nome === rec.mano.atteso && rec.manoSalvata.zCode === 'Z3·P08·D2A3IG'
      && rec.manoSalvata.aria === null && JSON.stringify(rec.manoSalvata.spente) === '["braccia"]' && rec.manoSalvata.timer === 25 && rec.manoSalvata.foot === 1,
    JSON.stringify([rec.mano, rec.manoSalvata]));
  tac.t('le rifiniture caricate a mano si salvano con tecnica, piedi e minuto, e il timer le accende a quel minuto',
    rec.rif.up === 'SHIATSU' && rec.rif.upDa === 17 && rec.rif.dnPiedi === 2 && rec.rif.piano === 'ref:17,bas:22', JSON.stringify(rec.rif));
  tac.t('dallo storico si recupera anche: prima si sceglie di chi è la seduta', rec.tastoStorico && rec.chiedeCliente && rec.scelto === 'c3', JSON.stringify(rec));
  /* 5b · regola durante la seduta: il ritocco si salva, la proposta resta scritta, il motore impara */
  const rt = await p.evaluate(() => {
    const c = DB.clients.find(x => x.id === 'c1'); c.cal = 0; c.calx = {};
    const q = {clientId:'c1', step:0, operatore:null, activity:'ems', zones:['lombare'], zone:'lombare', goal:'recupero', mood:'stanco', pressione:'media', prefSoloAria:false};
    quizState = Object.assign({}, q); VIEW = {name:'proposal'}; render();
    const prima = {S: Object.assign({}, currentProt.S), nome: nomeProt(currentProt), up: !!currentProt.manualRef};
    const pannello = !!document.getElementById('regola');
    rtSet('A', Math.max(0, prima.S.airbag - 1)); rtSet('C'); if(!prima.up) rtRif('up', 'on');
    const dopo = {nome: nomeProt(currentProt), sim: rifSim(currentProt), diff: differenze(currentProt),
      titolo: document.querySelector('.pname2').textContent, aperta: (JSON.parse(localStorage.getItem('zfl_sedute_aperte')) || []).some(a => a.prot && a.prot.S.airbag === prima.S.airbag - 1)};
    const n0 = DB.sessions.length; OMAGGIO = false; confirmSession();
    const s = DB.sessions[DB.sessions.length - 1];
    const salvata = {n: DB.sessions.length - n0, airbag: s.settings.airbag, calore: s.settings.calore, up: !!s.manualRef, proposta: s.proposta && s.proposta.nome, cambi: s.proposta && s.proposta.cambi.length};
    const impara = {aria: c.calx.aria, calore: c.calx.calore};
    quizState = Object.assign({}, q); VIEW = {name:'proposal'}; render();
    const poi = {airbag: currentProt.S.airbag, calore: currentProt.S.calore, ritocco: !!currentProt.proposta};
    VIEW = {name:'home'}; render();
    return {prima, pannello, dopo, salvata, impara, poi};
  });
  tac.t('in fondo alla proposta c\'è il pannello «Regola durante la seduta», e un tocco cambia seduta, nome e simboli',
    rt.pannello && rt.dopo.nome !== rt.prima.nome && /▲/.test(rt.dopo.sim) && /▲/.test(rt.dopo.titolo) && rt.dopo.diff.length >= 2 && rt.dopo.aperta, JSON.stringify(rt.dopo));
  tac.t('si registra la seduta ritoccata, con sotto la proposta di partenza',
    rt.salvata.n === 1 && rt.salvata.airbag === rt.prima.S.airbag - 1 && rt.salvata.calore === false && rt.salvata.up && rt.salvata.proposta === rt.prima.nome && rt.salvata.cambi >= 2, JSON.stringify(rt.salvata));
  tac.t('il motore impara dal ritocco: la proposta dopo parte con airbag più bassi e calore spento',
    rt.impara.aria === -1 && rt.impara.calore === -1 && rt.poi.airbag === rt.prima.S.airbag - 1 && rt.poi.calore === false && !rt.poi.ritocco, JSON.stringify([rt.impara, rt.poi]));
  /* 5b' · gli airbag del programma, e la zona spenta su richiesta (v173) */
  const sp = await p.evaluate(() => {
    const c = DB.clients.find(x => x.id === 'c1'); c.cal = 0; c.calx = {};
    const q = {clientId:'c1', step:0, operatore:null, activity:'riposo', giornata:'scrivania', zones:['braccia','gambe'], zone:'braccia', goal:'relax', mood:'sereno', pressione:'media', prefSoloAria:false};
    RT = null; quizState = Object.assign({}, q); VIEW = {name:'proposal'}; render();
    const pan = document.getElementById('regola');
    const prima = {nome: nomeProt(currentProt), passoAria: buildSteps(currentProt).some(x => x.img === 'airbag'),
      tasto: !!pan && /Tutti quelli del programma/.test(pan.textContent), zona: (document.querySelector('.quad .qd-zs') || {}).textContent || ''};
    rtSet('spegni', 'braccia');
    const passo = buildSteps(currentProt).find(x => x.img === 'airbag');
    const dopo = {nome: nomeProt(currentProt), sim: spenteSim(currentProt), titolo: document.querySelector('.pname2').textContent,
      diff: differenze(currentProt), passo: passo && passo.title, marcatori: passo ? passo.markers.length : 0,
      chip: tmChips(currentProt).join(' | '), quad: (document.querySelector('.quad').textContent.match(/⊘ Braccia · spenti/) || [''])[0]};
    OMAGGIO = false; confirmSession();
    const s = DB.sessions[DB.sessions.length - 1];
    const salvata = {spente: s.spente, nome: s.nome, cambi: s.proposta && s.proposta.cambi, memoria: (c.calx.spente || []).join(',')};
    quizState = Object.assign({}, q); VIEW = {name:'proposal'}; render();
    const poi = {spente: (currentProt.spente || []).join(','), perche: currentProt.why.some(w => /spenti su «braccia»/.test(w)), ritocco: !!currentProt.proposta,
      tasto: (document.querySelector('#regola .opt.azoff') || {}).textContent || '',
      /* il tasto della zona spenta resta toccabile, per riaccenderla */
      clic: (b => !!b && getComputedStyle(b).pointerEvents !== 'none' && getComputedStyle(b).opacity === '1')(document.querySelector('#regola .opt.azoff'))};
    /* ripetendo una seduta vecchia vale il desiderio di oggi */
    const vecchia = DB.sessions.find(x => x.clientId === 'c1' && x.id !== s.id && x.prog);
    let rip = null;
    if(vecchia){ DB.operators = DB.operators || []; const ops = DB.operators; DB.operators = []; repeatSession(vecchia.id); rip = (currentProt.spente || []).join(','); DB.operators = ops; }
    /* riaccesa: la memoria si cancella */
    RT = null; VIEW = {name:'home'}; render();
    quizState = Object.assign({}, q); VIEW = {name:'proposal'}; render();
    rtSet('spegni', 'braccia'); OMAGGIO = false; confirmSession();
    const riaccesa = {memoria: c.calx.spente === undefined, cambi: (DB.sessions[DB.sessions.length - 1].proposta || {}).cambi};
    RT = null; VIEW = {name:'home'}; render();
    return {prima, dopo, salvata, poi, rip, riaccesa};
  });
  tac.t('con le zone dette dal cliente gli airbag restano quelli del programma: nessun passo da fare, nel quadrante «Quelle del programma»',
    !sp.prima.passoAria && sp.prima.tasto && /Quelle del programma/.test(sp.prima.zona), JSON.stringify(sp.prima));
  tac.t('spegnere una zona dal pannello: il nome resta, accanto compare ⊘, nei passi «Spegni l\'icona» e nel timer la stessa zona',
    sp.dopo.nome === sp.prima.nome && sp.dopo.sim === '⊘ braccia' && /⊘ braccia/.test(sp.dopo.titolo) && sp.dopo.diff.indexOf('⊘ Airbag spenti su braccia') >= 0
      && sp.dopo.passo === 'Spegni gli airbag su una zona' && sp.dopo.marcatori === 1 && /⊘ braccia/.test(sp.dopo.chip) && sp.dopo.quad, JSON.stringify(sp.dopo));
  tac.t('la seduta si salva con la zona spenta, e il motore se la ricorda: la prossima proposta parte già spenta lì, e lo scrive',
    JSON.stringify(sp.salvata.spente) === '["braccia"]' && sp.salvata.memoria === 'braccia' && sp.poi.spente === 'braccia' && sp.poi.perche && !sp.poi.ritocco && sp.poi.tasto === '⊘ braccia' && sp.poi.clic,
    JSON.stringify([sp.salvata, sp.poi]));
  tac.t('ripetendo una seduta vecchia, gli airbag spenti sono quelli che il cliente vuole oggi', sp.rip === null || sp.rip === 'braccia', JSON.stringify(sp.rip));
  tac.t('riaccesa dal pannello, la memoria si cancella', sp.riaccesa.memoria && (sp.riaccesa.cambi || []).indexOf('Airbag di nuovo accesi su braccia') >= 0, JSON.stringify(sp.riaccesa));
  await p.close();

  /* 5c · i desideri scelti dal cliente al totem arrivano come ritocchi, e l'operatore li vede */
  const p3 = await browser.newPage({viewport:{width:430, height:900}});
  p3.on('pageerror', e => tac.rossi.push('errore di pagina (desideri): ' + e.message));
  await p3.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await p3.goto(GESTIONALE); await p3.waitForTimeout(700);
  const des = await p3.evaluate(() => {
    const base = {clientId:'c1', step:0, operatore:null, activity:'riposo', giornata:'scrivania', zones:['lombare'], zone:'lombare', goal:'sollievo', mood:'stanco', pressione:'media', prefSoloAria:false};
    quizState = Object.assign({}, base); VIEW = {name:'proposal'}; render();
    const senza = {calore: currentProt.S.calore, zerog: currentProt.S.zerog};
    RT = null; quizState = Object.assign({}, base, {desideri:{calore: !senza.calore, zerog: !senza.zerog}}); VIEW = {name:'proposal'}; render();
    const con = {calore: currentProt.S.calore, zerog: currentProt.S.zerog, diff: differenze(currentProt), why: currentProt.why.some(w => /Richiesto dal cliente al totem/.test(w))};
    RT = null; VIEW = {name:'home'}; render();
    return {senza, con};
  });
  tac.t('i desideri del cliente dal totem arrivano nel gestionale come ritocchi, scritti nel perché',
    des.con.calore === !des.senza.calore && des.con.zerog === !des.senza.zerog && des.con.diff.length === 2 && des.con.why, JSON.stringify(des));
  await p3.close();

  /* 6 · la vetrina mostra lo stesso nome al cliente */
  const v = await browser.newPage({viewport:{width:1080, height:1920}});
  v.on('pageerror', e => tac.rossi.push('errore di pagina (vetrina): ' + e.message));
  await v.goto(VETRINA); await v.waitForTimeout(600);
  const vet = await v.evaluate(() => {
    Object.assign(D, {nome:'Prova', activity:'riposo', giornata:'tranquilla', zones:['lombare'], zmode:null, goal:'sollievo', mood:'stanco', pressione:'media'});
    disegnaProtocollo();
    const pr = costruisciProtocollo(D);
    return {nom: document.querySelector('.targa .nom').textContent, cat: document.querySelector('.targa .cat').textContent,
      atteso: '“' + MOTORE.nomeProtocollo(pr.prog, pr.S, pr.prog === 'P23' ? pr.aria.icone : null) + '”', prog: pr.prog};
  });
  tac.t('anche la vetrina, dopo il check-in, mostra il nome del protocollo e sotto la categoria', vet.nom === vet.atteso && vet.cat.indexOf(vet.prog) >= 0, JSON.stringify(vet));
  await v.close();
  return tac;
};
