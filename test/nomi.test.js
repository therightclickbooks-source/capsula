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
      /* dalla v175: nelle sedute coi rulli lo spazio delle zone e' la variante,
         nella solo aria la variante sta al posto della 4D; il nome torna identico */
      const r = M.daNome(nm), p23 = pg === 'P23';
      if(!r || r.prog !== pg || r.nome !== nm || r.S.airbag !== a
        || (p23 ? r.S.fourD !== 0 || r.variante !== d || JSON.stringify(r.zone) !== JSON.stringify(z)
                : r.S.fourD !== d || r.zone !== null || r.variante !== M.zonaStato(z))) sbagli++;
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
  tac.t('24 categorie × 28.224 combinazioni = 677.376 nomi, tutti diversi, e dal nome si torna sempre ai parametri e alla variante',
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
    const acceso = t => { const x = [...q.querySelectorAll('.qd-s, .qd-l')].find(e => e.textContent.indexOf(t) >= 0); return x ? x.classList.contains('on') : null; };
    const top = [...q.querySelectorAll('.qd-top .qd-l')].map(e => e.querySelector('.qd-lt').lastChild.textContent.trim());
    const det = [...document.querySelectorAll('details.gdet')];
    const tm = document.getElementById('qd-tempo'); /* v198: il timer parte dal «Tempo» del quadrante */
    return {titolo: document.querySelector('.pname2').textContent, atteso: '“' + nomeProt(currentProt) + '”',
      categoria: document.querySelector('.pprog').textContent, prog: PROGRAMS[currentProt.prog].o,
      quad: !!q, sopra: q && q.compareDocumentPosition(document.querySelector('.call.acc')) & Node.DOCUMENT_POSITION_FOLLOWING,
      d: [...q.querySelectorAll('.qd-top .qd-l')][1].querySelector('.qd-v').textContent, S, top,
      sotto: [...q.querySelectorAll('.qd-sw .qd-s')].map(e => e.querySelector('.qd-sn').textContent.trim()),
      icone: [...q.querySelectorAll('.qd-ai b')].map(e => e.textContent.trim()),
      calore: acceso('Calore'), ioni: acceso('Ioni'), zerog: acceso('Zero Gravity'), leg: acceso('Leg Kneading'), foot: acceso('Foot Roller'),
      vecchia: !!document.querySelector('.proposal .settinggrid'),
      cassetti: det.length, aperti: det.filter(x => x.open).length,
      timer: !!tm && !tm.closest('details') && tm.offsetHeight > 0,
      legendaDentro: [...document.querySelectorAll('.glegend')].every(g => !!g.closest('details.gdet')),
      testoTocco: !!document.querySelector('details.gdet summary') && /istruzioni/.test(document.querySelector('details.gdet summary').textContent)};
  });
  tac.t('in cima alla proposta c\'è il nome del protocollo, non quello della categoria', prop.titolo === prop.atteso && prop.titolo.indexOf(prop.prog) < 0, prop.titolo);
  tac.t('sotto il nome c\'è la riga P · categoria · schermata del tablet', prop.categoria.indexOf(prop.prog) >= 0 && /schermata|Home Page/.test(prop.categoria), prop.categoria);
  tac.t('il quadrante sta sopra il «perché», con il 4D e gli interruttori accesi e spenti come nel protocollo',
    prop.quad && !!prop.sopra && +prop.d === prop.S.fourD
      && prop.top.join('|') === 'Tempo|Profondità 4D|Forza airbag|Zero Gravity' && prop.sotto.join('|') === 'Calore|Ioni|Leg Kneading|Foot Roller'
      && prop.icone.join('|') === 'Spalle|Braccia|Vita e fianchi|Gambe e piedi|Corpo intero' && prop.calore === !!prop.S.calore && prop.ioni === !!prop.S.ioni
      && prop.zerog === !!prop.S.zerog && prop.leg === (prop.S.polpacci > 0) && prop.foot === (prop.S.plantari > 0) && !prop.vecchia, JSON.stringify(prop));
  tac.t('le istruzioni scritte dei passi stanno chiuse dietro il tasto lieve «istruzioni»; il tasto del timer resta a vista',
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
    out.mano = {prev: document.getElementById('rc_prev').textContent, atteso: MOTORE.nomeProtocollo('P08', Sm, null, MOTORE.varianteNome('P08', undefined, ['braccia'])),
      ok: !document.getElementById('rc_ok').disabled, leg: document.querySelectorAll('#rc_par .rcch b').length,
      spenta: ((document.querySelector('#rc_par .rp-z.off b') || {}).textContent || '').trim()};
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
    rec.codice.ok && /Gently rub soothing/i.test(rec.codice.testo) && rec.senzaFamiglia.ok && /Back Relieve/.test(rec.senzaFamiglia.testo)
      && /rulli di gambe e piedi/.test(rec.senzaFamiglia.testo) && rec.leg, JSON.stringify([rec.codice, rec.senzaFamiglia]));
  tac.t('la seduta recuperata entra con giorno e ora scelti, conta 10 punti ed è segnata «recuperata» nello storico',
    rec.salvata.n === 1 && rec.salvata.prog === 'P04' && rec.salvata.fam === 'Z4' && rec.salvata.zCode === 'Z4·P04·D2A2ICG' && rec.salvata.giorno === '2026-10-30'
      && rec.salvata.ora === '18:15' && rec.salvata.leg === 1 && rec.salvata.foot === 0 && rec.salvata.recuperata && rec.salvata.punti === 10 && !!rec.salvata.nome && rec.storico,
    JSON.stringify(rec.salvata));
  tac.t('dal nome torna tutto: categoria, valori e rulli; la seduta recuperata ha lo stesso nome (gli airbag sono quelli del programma)',
    rec.dalNome.ok && rec.nome.nome === rec.nome.atteso && rec.nome.prog === 'P05' && rec.nome.S.fourD === 3 && rec.nome.S.ioni === true && rec.nome.S.calore === false
      && rec.nome.S.polpacci === 0 && rec.nome.S.plantari === 1 && rec.nome.aria === null, JSON.stringify(rec.nome));
  tac.t('una seduta nel futuro non si recupera', rec.futuro);
  tac.t('a mano, scegliendo Z, P, D, A, I, C, G, extra e airbag spenti, esce lo stesso nome del motore e si salva col segno ⊘',
    rec.manoVuoto && rec.mano.ok && rec.mano.prev.indexOf(rec.mano.atteso) >= 0 && /⊘ braccia/.test(rec.mano.prev) && rec.mano.spenta === 'Braccia' && rec.mano.leg === 9 + 24
      && rec.manoSalvata.nome === rec.mano.atteso && rec.manoSalvata.zCode === 'Z3·P08·D2A3IG'
      && rec.manoSalvata.aria === null && JSON.stringify(rec.manoSalvata.spente) === '["braccia"]' && rec.manoSalvata.timer === 25 && rec.manoSalvata.foot === 1,
    JSON.stringify([rec.mano, rec.manoSalvata]));
  tac.t('le rifiniture caricate a mano si salvano con tecnica, piedi e minuto (v186: qualsiasi minuto, anche l\'ultimo), e il timer le accende a quel minuto',
    rec.rif.up === 'SHIATSU' && rec.rif.upDa === 17 && rec.rif.dnPiedi === 2 && rec.rif.piano === 'ref:17,bas:24', JSON.stringify(rec.rif));
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
    const pa = buildSteps(currentProt).find(x => x.img === 'airbag');
    const prima = {nome: nomeProt(currentProt), passoAria: pa ? pa.title + ' · ' + pa.markers.length : '',
      tasto: !!pan && /Tutti quelli del programma/.test(pan.textContent), zona: (document.querySelector('.quad .qd-abn') || {}).textContent || '',
      tutteAccese: document.querySelectorAll('.quad .qd-ai.on').length};
    rtSet('spegni', 'braccia');
    const passo = buildSteps(currentProt).find(x => x.img === 'airbag');
    const dopo = {nome: nomeProt(currentProt), sim: spenteSim(currentProt), titolo: document.querySelector('.pname2').textContent,
      diff: differenze(currentProt), passo: passo && passo.title, marcatori: passo ? passo.markers.length : 0,
      chip: tmChips(currentProt).map(c => typeof c === 'string' ? c : c.t + (c.v ? ' ' + c.v : '')).join(' | '), quad: [...document.querySelectorAll('.quad .qd-ai.off b')].map(b => b.textContent).join(',')};
    OMAGGIO = false; confirmSession();
    const s = DB.sessions[DB.sessions.length - 1];
    const salvata = {spente: s.spente, nome: s.nome, cambi: s.proposta && s.proposta.cambi, memoria: (c.calx.spente || []).join(',')};
    quizState = Object.assign({}, q); VIEW = {name:'proposal'}; render();
    const poi = {spente: (currentProt.spente || []).join(','), perche: currentProt.why.some(w => /spenti su «braccia»/.test(w)), ritocco: !!currentProt.proposta,
      tasto: ((document.querySelector('#regola .rp-z.off b') || {}).textContent || '').trim(),
      /* il tasto della zona esclusa resta toccabile, per riaccenderla */
      clic: (b => !!b && getComputedStyle(b).pointerEvents !== 'none' && getComputedStyle(b).opacity === '1')(document.querySelector('#regola .rp-z.off'))};
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
  tac.t('con le zone dette dal cliente gli airbag restano quelli del programma: solo «controlla che siano accesi», nel quadrante «Quelle del programma»',
    sp.prima.passoAria === 'Airbag automatici · 0' && sp.prima.tasto && /automatici: seguono il programma/.test(sp.prima.zona) && sp.prima.tutteAccese === 5, JSON.stringify(sp.prima));
  tac.t('escludere una zona dal pannello: il nome cambia, accanto compare ⊘, nei passi «Airbag automatici, tranne braccia», nel quadrante e nel timer la stessa zona',
    sp.dopo.nome !== sp.prima.nome && sp.dopo.sim === '⊘ braccia' && /⊘ braccia/.test(sp.dopo.titolo) && sp.dopo.diff.indexOf('⊘ Airbag spenti su braccia') >= 0
      && sp.dopo.passo === 'Airbag automatici, tranne braccia' && sp.dopo.marcatori === 1 && /Zone airbag tutti → tranne braccia/.test(sp.dopo.chip) && sp.dopo.quad === 'Braccia,Corpo intero', JSON.stringify(sp.dopo));
  tac.t('la seduta si salva con la zona spenta, e il motore se la ricorda: la prossima proposta parte già spenta lì, e lo scrive',
    JSON.stringify(sp.salvata.spente) === '["braccia"]' && sp.salvata.memoria === 'braccia' && sp.poi.spente === 'braccia' && sp.poi.perche && !sp.poi.ritocco && sp.poi.tasto === 'Braccia' && sp.poi.clic,
    JSON.stringify([sp.salvata, sp.poi]));
  tac.t('ripetendo una seduta vecchia, gli airbag spenti sono quelli che il cliente vuole oggi', sp.rip === null || sp.rip === 'braccia', JSON.stringify(sp.rip));
  /* Leg Kneading spento dal pannello: anche questo si ricorda (v174) */
  const lk = await p.evaluate(() => {
    const c = DB.clients.find(x => x.id === 'c1'); c.cal = 0; c.calx = {};
    const q = {clientId:'c1', step:0, operatore:null, activity:'riposo', giornata:'scrivania', zones:['gambe'], zone:'gambe', goal:'relax', mood:'sereno', pressione:'media', prefSoloAria:false};
    RT = null; quizState = Object.assign({}, q); VIEW = {name:'proposal'}; render();
    const prima = currentProt.S.polpacci, quad = (document.querySelector('.quad').textContent.match(/Leg Kneading\s*PROGRAMMA/) || [''])[0];
    rtSet('leg'); OMAGGIO = false; confirmSession();
    const mem = c.calx.noLeg === true;
    RT = null; quizState = Object.assign({}, q); VIEW = {name:'proposal'}; render();
    const poi = currentProt.S.polpacci;
    rtSet('leg'); OMAGGIO = false; confirmSession();
    const cancellata = c.calx.noLeg === undefined;
    RT = null; VIEW = {name:'home'}; render();
    return {prima, quad, mem, poi, cancellata};
  });
  tac.t('Leg Kneading: nel quadrante «PROGRAMMA»; spento dal pannello si ricorda, riacceso la memoria si cancella',
    lk.prima === 1 && !!lk.quad && lk.mem && lk.poi === 0 && lk.cancellata, JSON.stringify(lk));
  /* v176: una seduta di prima della v173 (zone airbag scelte) ripetuta oggi:
     stesso nome, ma gli airbag seguono la regola nuova (controlla che siano accesi) */
  const vec = await p.evaluate(() => {
    const S0 = {intensita:0, fourD:2, airbag:2, ioni:false, calore:true, zerog:true, polpacci:1, plantari:1, timer:20};
    const nome = MOTORE.nomeProtocollo('P04', S0, ['spalle','vita']);
    DB.sessions.push({id:'svec', clientId:'c1', date:'2026-10-01T10:00:00.000Z', prog:'P04', fam:'Z4', settings:S0, scala:'capsula', quiz:{zones:['cervicale','lombare']}, aria:['spalle','vita'], nome});
    const ops = DB.operators; DB.operators = []; RT = null; repeatSession('svec'); DB.operators = ops;
    const passi = buildSteps(currentProt).filter(x => x.img === 'airbag').map(x => x.title + ' · ' + x.markers.length);
    const r = {nome, rip: nomeProt(currentProt), passi};
    DB.sessions = DB.sessions.filter(x => x.id !== 'svec'); RT = null; VIEW = {name:'home'}; render();
    return r;
  });
  tac.t('ripetendo una seduta di prima della v173 il nome resta lo stesso, e gli airbag si controllano soltanto (niente «accendi solo»)',
    vec.rip === vec.nome && vec.passi.length === 1 && vec.passi[0] === 'Airbag automatici · 0', JSON.stringify(vec));
  /* v178: il timer che gira segue i ritocchi: nome nuovo, «era» il nome di
     prima, e le voci cambiate ognuna col suo colore */
  const tmr = await p.evaluate(() => {
    const c = DB.clients.find(x => x.id === 'c1'); c.calx = {};
    RT = null; quizState = {clientId:'c1', step:0, operatore:null, activity:'riposo', giornata:'scrivania', zones:['lombare'], zone:'lombare', goal:'sollievo', mood:'stanco', pressione:'media', prefSoloAria:false};
    VIEW = {name:'proposal'}; render(); timerAvvia();
    const prima = TM.info.titolo;
    rtSet('D', Math.max(0, currentProt.S.fourD - 1)); rtSet('spegni', 'braccia'); rtSet('I');
    TM.full = true; tmDisegna(true);
    const box = document.getElementById('tmr');
    const r = {prima, ora: TM.info.titolo, nome: nomeProt(currentProt), era: TM.info.prima,
      cambiati: [...box.querySelectorAll('.tc.cambiato')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
      nuovi: [...box.querySelectorAll('.tc.nuovo')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
      testa: (box.querySelector('.tm-who') || {}).textContent || '', legenda: !!box.querySelector('.tm-leg')};
    timerChiudi();
    RT = null; VIEW = {name:'home'}; render();
    return r;
  });
  /* v182: toccando una voce sotto il timer a tutto schermo si va al suo tasto nel pannello */
  const voce = await p.evaluate(async () => {
    RT = null; quizState = {clientId:'c1', step:0, operatore:null, activity:'riposo', giornata:'scrivania', zones:['lombare'], zone:'lombare', goal:'sollievo', mood:'stanco', pressione:'media', prefSoloAria:false};
    VIEW = {name:'proposal'}; render(); timerAvvia(); TM.full = true; tmDisegna(true); scrollTo(0, 0);
    const box = document.getElementById('tmr'), r = {};
    r.voci = [...box.querySelectorAll('.tm-chips [data-act="regola"]')].map(x => x.getAttribute('data-k')).join(',');
    box.querySelector('.tm-chips [data-k="D"]').click();
    await new Promise(x => setTimeout(x, 1200));
    const d = document.querySelector('#regola [data-anc="D"]').getBoundingClientRect();
    r.full = TM.full; r.inVista = d.top > 0 && d.bottom < innerHeight; r.acceso = document.querySelector('#regola [data-anc="D"]').classList.contains('rg-qui');
    timerChiudi(); RT = null; VIEW = {name:'home'}; render();
    return r;
  });
  tac.t('a tutto schermo, toccando «4D» il timer si rimpicciolisce e la pagina va dritta al tasto della 4D nel pannello',
    /^D,A,/.test(voce.voci) && !voce.full && voce.inVista && voce.acceso, JSON.stringify(voce));
  tac.t('il timer segue i ritocchi: nome nuovo, «era» la proposta, voci cambiate e aggiunte in un altro colore',
    tmr.ora !== tmr.prima && tmr.ora.indexOf(tmr.nome) === 0 && tmr.era && tmr.prima.indexOf(tmr.era.split(' ')[0]) === 0 && /SEDUTA RITOCCATA/.test(tmr.testa)
      && tmr.cambiati.some(x => /^4D \d → \d$/.test(x)) && tmr.cambiati.some(x => /Zone airbag tutti → tranne braccia/.test(x)) && tmr.nuovi.some(x => /Ioni/.test(x)) && tmr.legenda,
    JSON.stringify(tmr));
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
      atteso: '“' + MOTORE.nomeProtocollo(pr.prog, pr.S, pr.prog === 'P23' ? pr.aria.icone : null, pr.variante) + '”', prog: pr.prog};
  });
  tac.t('anche la vetrina, dopo il check-in, mostra il nome del protocollo e sotto la categoria', vet.nom === vet.atteso && vet.cat.indexOf(vet.prog) >= 0, JSON.stringify(vet));
  await v.close();

  /* 6b · v177: il pannello. Toccando una zona degli airbag si accendono solo
     quelle scelte (e il nome cambia); la pagina resta ferma sul tasto toccato;
     le tecniche nell'ordine della capsula */
  const pg = await browser.newPage({viewport:{width:430, height:900}});
  pg.on('pageerror', e => tac.rossi.push('errore di pagina (pannello): ' + e.message));
  await pg.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await pg.goto(GESTIONALE); await pg.waitForTimeout(600);
  await pg.evaluate(() => { RT = null; quizState = {clientId:'c1', step:0, operatore:null, activity:'riposo', giornata:'scrivania', zones:['cervicale','lombare'], zone:'cervicale',
    goal:'sollievo', mood:'stanco', pressione:'media', prefSoloAria:false}; VIEW = {name:'proposal', ptab:'regola'}; render(); });
  const n0 = await pg.evaluate(() => nomeProt(currentProt));
  /* un tocco vero sulla zona «Braccia»: si accende solo quella */
  const z = pg.locator('#regola [data-anc="aria-braccia"]');
  await z.scrollIntoViewIfNeeded(); await pg.evaluate(() => window.scrollBy(0, 120)); await pg.waitForTimeout(150);
  const y0 = await z.evaluate(e => e.getBoundingClientRect().top);
  await z.click(); await pg.waitForTimeout(250);
  const dopo1 = await pg.evaluate(() => ({nome: nomeProt(currentProt), sp: (currentProt.spente || []).join(','),
    y: document.querySelector('#regola [data-anc="aria-braccia"]').getBoundingClientRect().top,
    on: [...document.querySelectorAll('#regola .rp-z.on b')].map(b => b.textContent).join(','), tutti: document.querySelector('#regola .rp-tutti').classList.contains('on')}));
  /* un secondo tocco su «Gambe e piedi»: accese braccia e gambe */
  await pg.locator('#regola [data-anc="aria-gambe"]').click(); await pg.waitForTimeout(250);
  const dopo2 = await pg.evaluate(() => ({nome: nomeProt(currentProt), sp: (currentProt.spente || []).join(',')}));
  /* «Tutti quelli del programma»: si torna come prima, col nome di prima */
  await pg.locator('#regola [data-anc="aria-tutti"]').click(); await pg.waitForTimeout(250);
  const dopo3 = await pg.evaluate(() => ({nome: nomeProt(currentProt), sp: (currentProt.spente || []).join(','),
    tec: [...document.querySelectorAll('#regola .rcrif.up .rp-ics.tre')][0] ? [...[...document.querySelectorAll('#regola .rcrif.up .rp-ics.tre')][0].querySelectorAll('b')].map(b => b.textContent).join(',') : '',
    striscia: !!document.querySelector('#tmr.sap')}));
  /* il + della 4D: la pagina resta ferma */
  const piu = pg.locator('#regola .rp-dial[data-anc="D"] .rp-pm').nth(1);
  await piu.scrollIntoViewIfNeeded(); await pg.waitForTimeout(150);
  const y1 = await piu.evaluate(e => e.getBoundingClientRect().top);
  await piu.click(); await pg.waitForTimeout(250);
  const y2 = await pg.evaluate(() => document.querySelectorAll('#regola .rp-dial[data-anc="D"] .rp-pm')[1].getBoundingClientRect().top);
  await pg.close();
  /* v182: toccando una zona la si spegne (il cliente non la vuole), le altre restano accese */
  tac.t('pannello: toccando «Braccia» si spengono solo le braccia, le altre restano accese, e il nome cambia', dopo1.sp === 'braccia' && dopo1.on === 'Spalle,Vita e fianchi,Gambe e piedi' && !dopo1.tutti && dopo1.nome !== n0,
    JSON.stringify({n0, dopo1}));
  tac.t('pannello: un altro tocco spegne anche quella zona; «Tutti quelli del programma» riporta il nome di prima', dopo2.sp === 'braccia,gambe' && dopo2.nome !== dopo1.nome && dopo3.sp === '' && dopo3.nome === n0,
    JSON.stringify({dopo2, dopo3}));
  tac.t('toccando un tasto del pannello la pagina resta ferma lì (zona airbag e + della 4D)', Math.abs(dopo1.y - y0) < 3 && Math.abs(y2 - y1) < 3, JSON.stringify({y0, y: dopo1.y, y1, y2}));
  tac.t('le tecniche delle rifiniture nell\'ordine della capsula, con le sue icone', dopo3.tec === 'Kneading,Tapping,Tap,Massage,Knead and Knock,Shiatsu', dopo3.tec);
  tac.t('nella pagina del protocollo niente striscia «seduta da chiudere» in cima', !dopo3.striscia);

  /* 6b2 · v180: i colori del pannello. Azzurro = la scelta del programma,
     giallo tratteggiato = cambiata, bianco = le altre */
  const col = await browser.newPage({viewport:{width:430, height:900}});
  col.on('pageerror', e => tac.rossi.push('errore di pagina (colori): ' + e.message));
  await col.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await col.goto(GESTIONALE); await col.waitForTimeout(600);
  const colori = await col.evaluate(() => { RT = null; quizState = {clientId:'c1', step:0, operatore:null, activity:'riposo', giornata:'scrivania', zones:['cervicale','lombare'], zone:'cervicale',
    goal:'sollievo', mood:'stanco', pressione:'media', prefSoloAria:false}; VIEW = {name:'proposal'}; render();
    const z = () => [...document.querySelectorAll('#regola .rp-z')].map(b => b.className.replace('rp-z', '').trim()).join('|');
    const tec = () => [...document.querySelectorAll('#regola .rcrif.up .rp-ics.tre')][0];
    const t = () => [...tec().querySelectorAll('.rp-ic')].map(b => b.querySelector('b').textContent + ':' + b.className.replace('rp-ic', '').trim()).filter(x => !/:$/.test(x)).join('|');
    const r = {z0: z(), t0: t()};
    rtSet('spegni', 'braccia'); r.z1 = z();
    const k = currentProt.manualRef.tkey; rtRif('up', 'tkey', k === 'SHIATSU' ? 'KNEADING' : 'SHIATSU'); r.t1 = t();
    const ic = tec().querySelector('.rp-ic:not(.on):not(.orig) .capic');
    r.bianca = ic ? getComputedStyle(ic).filter : '';
    return r; });
  await col.close();
  tac.t('pannello: senza ritocchi gli airbag del programma sono tutti azzurri, e la tecnica del programma pure', colori.z0 === 'on|on|on|on' && /^[^|]+:on$/.test(colori.t0), JSON.stringify(colori));
  tac.t('pannello: spegnendo «Braccia» le braccia diventano grigie col bordo giallo, le altre restano azzurre', colori.z1 === 'on|off mod|on|on', JSON.stringify(colori));
  tac.t('pannello: la tecnica cambiata è gialla tratteggiata, quella del programma resta azzurra, le altre bianche',
    /:on mod/.test(colori.t1) && /:orig/.test(colori.t1) && colori.t1.split('|').length === 2 && /grayscale/.test(colori.bianca), JSON.stringify(colori));

  /* 6c · v179: gli effetti della scheda. Il nome e' fatto di lettere ma si
     legge uguale; le bolle ci sono solo in questa pagina; a pagina ferma le
     lettere volano via e tornano, senza far scorrere la pagina di lato */
  const fx = await browser.newPage({viewport:{width:430, height:900}});
  fx.on('pageerror', e => tac.rossi.push('errore di pagina (effetti): ' + e.message));
  await fx.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await fx.goto(GESTIONALE); await fx.waitForTimeout(600);
  const ef = await fx.evaluate(() => { RT = null; quizState = {clientId:'c1', step:0, operatore:null, activity:'riposo', giornata:'scrivania', zones:['lombare'], zone:'lombare',
    goal:'sollievo', mood:'stanco', pressione:'media', prefSoloAria:false}; VIEW = {name:'proposal'}; render();
    const n = document.querySelector('.pn-t');
    return {testo: n.textContent, atteso: '“' + nomeProt(currentProt) + '”', lettere: n.querySelectorAll('.pl').length, entra: n.classList.contains('entra'),
      bolle: document.querySelectorAll('#fxBolle i').length, testata: document.querySelectorAll('.phead .p-bolle i').length, vfx: app.classList.contains('vfx'),
      titolo: document.querySelector('.fx-tit').textContent};
  });
  await fx.waitForTimeout(1800);
  const quieta = await fx.evaluate(() => { FX.tocco = Date.now() - 10000; FX.via = 0; fxBattito();
    return {via: document.querySelector('.pn-t').classList.contains('via'), gira: !!document.querySelector('.quad.gira'),
      quiete: document.documentElement.classList.contains('fx-quiete')}; });
  await fx.waitForTimeout(900);
  const largo = await fx.evaluate(() => document.scrollingElement.scrollWidth - innerWidth);
  await fx.mouse.click(5, 5);
  const fuori = await fx.evaluate(() => { const calma = !document.documentElement.classList.contains('fx-quiete');
    VIEW = {name:'home'}; render(); return {calma, bolle: !!document.getElementById('fxBolle'), vfx: app.classList.contains('vfx')}; });
  await fx.close();
  tac.t('effetti: il nome è fatto di lettere ma si legge uguale, e arriva lettera per lettera', ef.testo === ef.atteso && ef.lettere >= ef.atteso.replace(/ /g, '').length && ef.entra
    && ef.titolo === 'Setup guidato sulla capsula', JSON.stringify(ef));
  tac.t('effetti: bolle dietro la pagina e nella testata', ef.bolle >= 10 && ef.testata >= 6 && ef.vfx, JSON.stringify(ef));
  tac.t('effetti: a pagina ferma le lettere volano via e i numeri girano; la pagina non scorre di lato', quieta.via && quieta.gira && quieta.quiete && largo <= 0,
    JSON.stringify({quieta, largo}));
  tac.t('effetti: un tocco rimette la pagina calma; fuori dal protocollo niente bolle', fuori.calma && !fuori.bolle && !fuori.vfx, JSON.stringify(fuori));

  /* 7 · v175: lo stesso check-in da' lo stesso nome sul totem e nel gestionale,
     con la variante (anche «tutto il corpo», «decide Zenith», la giornata, i desideri) */
  const casi = [
    {activity:'riposo', giornata:'scrivania', zones:['lombare'], zmode:null, goal:'sollievo', mood:'stanco', pressione:'media'},
    {activity:'ems', giornata:'', zones:[], zmode:'totale', goal:'recupero', mood:'carico', pressione:'decisa'},
    {activity:'riposo', giornata:'guida', zones:[], zmode:'nessuna', goal:'relax', mood:'stressato', pressione:'dolce', desideri:{calore:false, zerog:false}},
    {activity:'vacufit', giornata:'', zones:['gambe','piedi','braccia'], zmode:null, goal:'drenaggio', mood:'sereno', pressione:'media'}];
  const vt = await browser.newPage({viewport:{width:1080, height:1920}});
  vt.on('pageerror', e => tac.rossi.push('errore di pagina (vetrina 2): ' + e.message));
  await vt.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await vt.goto(VETRINA); await vt.waitForTimeout(600);
  const sulTotem = await vt.evaluate(casi => casi.map(q => { Object.assign(D, {nome:'Palma', clienteId:'c1', desideri:null}, JSON.parse(JSON.stringify(q)));
    return disegnaProtocollo().nomeP; }), casi);
  await vt.close();
  const gq = await browser.newPage({viewport:{width:430, height:900}});
  gq.on('pageerror', e => tac.rossi.push('errore di pagina (gestionale 2): ' + e.message));
  await gq.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await gq.goto(GESTIONALE); await gq.waitForTimeout(600);
  const nelGest = await gq.evaluate(casi => casi.map(q => {
    /* come arriva il biglietto del totem: la zona di regola, o «totale» / «nessuna» */
    RT = null; quizState = {clientId:'c1', step:0, operatore:null, activity:q.activity, zones:q.zones.slice(), zone: q.zones.length ? q.zones[0] : q.zmode,
      giornata:q.giornata || null, goal:q.goal, mood:q.mood, pressione:q.pressione, prefSoloAria:false, desideri:q.desideri || null};
    VIEW = {name:'proposal'}; render(); const n = nomeProt(currentProt); RT = null; VIEW = {name:'home'}; render(); return n; }), casi);
  await gq.close();
  tac.t('lo stesso check-in dà lo stesso nome sul totem e nel gestionale (variante compresa)',
    sulTotem.every((n, i) => n && n === nelGest[i]), JSON.stringify({sulTotem, nelGest}));
  return tac;
};
