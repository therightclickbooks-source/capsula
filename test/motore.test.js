/* ═══════════════════════════════════════════════════════════════
   IL MOTORE DEI PROTOCOLLI (motore.js)
   Le regole decise con Raffaele, controllate su tutte le combinazioni:
   · la zona dice DOVE: collo e centro schiena → rifinitura UP, lombare e
     glutei → rifinitura DOWN, gambe → Leg Kneading, piedi → Foot Roller;
   · l'obiettivo dice COME: con la stessa zona, obiettivi diversi danno
     sedute diverse;
   · tutte e sei le tecniche manuali si usano, ognuna dove ha senso;
   · 4D e airbag seguono la seduta; mai oltre il 3, il 4 solo se il
     cliente l'ha chiesto;
   · mai due sedute uguali di fila;
   · per chi non si e' allenato, la giornata sceglie il programma;
   · i limiti di sicurezza non si scavalcano mai.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, VETRINA, Taccuino } = require('./aiuto');

function archivio(){
  const anamnesi = {certificatoOk:false, zone:[], prefIntensita:'medio', sonno:'buono', caloreSensibile:false};
  ['a1','a2','a3','a4','a5','a6','b1','b2','b3','b4','b5','b6','b7','b8','b9'].forEach(k=> anamnesi[k] = false);
  return {codeHash:'x', codeLen:4,
    clients:[{id:'c1', nome:'Prova', cognome:'Motore', genere:'F', telefono:'3330000000', anamnesi, cal:0}],
    sessions:[{id:'s0', clientId:'c1', date:'2026-01-01T10:00:00.000Z'}],
    operators:[], checkins:[]};
}

module.exports = async function(browser){
  const tac = new Taccuino('il motore dei protocolli');
  const p = await browser.newPage({viewport:{width:430, height:900}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  await p.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await p.goto(GESTIONALE); await p.waitForTimeout(600);

  const r = await p.evaluate(() => {
    const M = MOTORE.motoreZenith;
    const ACT = ['ems','ems2','vacufit','matrix','riposo'], GOAL = ['recupero','sollievo','drenaggio','relax','sonno','energia'];
    const MOOD = ['sereno','stanco','stressato','dolorante','carico'], PR = ['dolce','media','decisa'];
    const Z = ['cervicale','braccia','dorsale','lombare','glutei','gambe','piedi'];
    const GI = MOTORE.GIORNATE;
    const an0 = DB.clients[0].anamnesi;
    const base = {anamnesi:an0, genere:'F', primaVolta:false, ora:15};
    const out = {tecniche:{}, prog:{}, dove:[], oltre:[], quattro:[], sicurezza:[], tot:0, uguali:0, senzaAlt:0, firme:new Set()};
    const giro = (extra, cb) => {
      for(const activity of ACT) for(let m = 0; m < 128; m++){ const zones = Z.filter((z,i)=> m & (1<<i));
        if(zones.length > 3) continue;
        for(const goal of GOAL) for(const mood of MOOD) for(const pressione of PR)
          for(const giornata of (activity === 'riposo' ? GI : [null])){
            const quiz = {activity, zones, goal, mood, pressione, giornata, prefSoloAria:false};
            cb(quiz, M(Object.assign({}, base, extra, {quiz})));
          }
      }
    };
    giro({}, (q, pr) => {
      out.tot++; out.firme.add(pr.firma); out.prog[pr.prog] = (out.prog[pr.prog]||0) + 1;
      [pr.manualRef, pr.manualBasso].forEach(x => { if(x) out.tecniche[x.tkey] = (out.tecniche[x.tkey]||0) + 1; });
      const has = z => q.zones.includes(z);
      /* dove: la zona accende la parte giusta */
      const upAtteso = has('cervicale') || has('dorsale'), dnAtteso = has('lombare') || has('glutei');
      if(!!pr.manualRef !== upAtteso || !!pr.manualBasso !== dnAtteso
         || (has('gambe') && !pr.S.polpacci) || (has('piedi') && !pr.S.plantari))
        out.dove.length < 3 && out.dove.push(JSON.stringify(q) + ' → ' + pr.firma);
      if(pr.S.fourD > 3 || pr.S.airbag > 3) out.oltre.length < 3 && out.oltre.push(JSON.stringify(q) + ' → ' + pr.zCode);
      if(pr.manualRef && pr.manualRef.velocita > 5) out.oltre.push('velocità ' + pr.manualRef.velocita);
      /* mai due uguali: la stessa domanda ripetuta subito dopo non deve dare la stessa seduta */
      const dopo = M(Object.assign({}, base, {quiz:q, ultima:{prog:pr.prog, firma:pr.firma}}));
      if(dopo.firma === pr.firma){ out.uguali++; if(pr.pool.length > 1 || pr.manualRef || pr.manualBasso) out.senzaAlt++; }
      /* anche la seduta che alterna conta: P02 e P11 nascono soprattutto cosi' */
      out.prog[dopo.prog] = (out.prog[dopo.prog]||0) + 1;
    });
    /* stesse risposte per sei sedute di fila: le varianti adatte ruotano */
    const giri = q => { let ult = [], seq = [];
      for(let i = 0; i < 6; i++){ const x = M(Object.assign({}, base, {quiz:q, ultime:ult}));
        seq.push({prog:x.prog, tec:[x.manualRef, x.manualBasso].filter(Boolean).map(r => r.tkey).join('+'), firma:x.firma});
        ult = [{prog:x.prog, firma:x.firma}].concat(ult).slice(0, 3); }
      return seq; };
    out.rot = giri({activity:'ems', zones:['lombare'], goal:'recupero', mood:'carico', pressione:'media'});
    out.rot2 = giri({activity:'riposo', giornata:'tranquilla', zones:['cervicale'], goal:'relax', mood:'stressato', pressione:'media'});
    /* dopo una rifinitura: cosa si riaccende */
    const R = MOTORE.riattivaDopo;
    out.ria = {
      tutto: R({prog:'P04', S:{polpacci:1, plantari:1, airbag:2, zerog:true}, aria:{icone:['spalle','vita']}}),
      sonno: R({prog:'P18', S:{polpacci:1, plantari:1, airbag:1, zerog:true}, aria:{icone:['tutto']}}),
      vuoto: R({prog:'P13', S:{polpacci:0, plantari:0, airbag:0}, aria:{icone:[]}}),
      perche: M(Object.assign({}, base, {quiz:{activity:'riposo', giornata:'tranquilla', zones:['cervicale','lombare'], goal:'sollievo', mood:'sereno', pressione:'media'}})).why.join(' ')
    };
    /* la mattina il relax parte da P11 (a pranzo da P16, la sera da P18) */
    out.mattina = M(Object.assign({}, base, {ora:10, quiz:{activity:'riposo', giornata:'tranquilla', zones:[], goal:'relax', mood:'stanco', pressione:'media'}})).prog;
    out.sera = M(Object.assign({}, base, {ora:20, quiz:{activity:'riposo', giornata:'tranquilla', zones:[], goal:'relax', mood:'stanco', pressione:'media'}})).prog;
    out.distinte = out.firme.size; delete out.firme;

    /* il 4 solo se chiesto: pressione decisa e una taratura «troppo leggera» */
    const q4 = {activity:'ems', zones:['lombare'], goal:'recupero', mood:'carico', pressione:'decisa', prefSoloAria:false};
    out.q4 = M(Object.assign({}, base, {quiz:q4, cal:1})).S.fourD;
    out.q4media = M(Object.assign({}, base, {quiz:Object.assign({}, q4, {pressione:'media'}), cal:2})).S.fourD;
    out.q4aria = M(Object.assign({}, base, {quiz:q4, calx:{aria:1}})).S.airbag;

    /* la sicurezza: sensibile al calore e profilo soft, su tutte le combinazioni */
    const anSens = Object.assign({}, an0, {caloreSensibile:true});
    const anSoft = Object.assign({}, an0, {b1:true, certificatoOk:true});
    giro({anamnesi:anSens, cal:2, calx:{aria:2, up:2, down:2}}, (q, pr) => { if(pr.S.calore) out.sicurezza.push('calore acceso con sensibilità: ' + JSON.stringify(q)); });
    giro({anamnesi:anSoft, cal:2, calx:{aria:2}}, (q, pr) => { if(pr.S.fourD > 1 || pr.S.airbag > 2) out.sicurezza.length < 3 && out.sicurezza.push('soft superato: ' + JSON.stringify(q) + ' ' + pr.zCode); });

    /* la stessa zona con obiettivi diversi */
    const z = g => M(Object.assign({}, base, {quiz:{activity:'riposo', giornata:'scrivania', zones:['cervicale'], goal:g, mood:'sereno', pressione:'media'}}));
    out.collo = GOAL.map(g => { const x = z(g); return g + ':' + x.prog + '/' + (x.manualRef ? x.manualRef.tkey : '-') + '/D' + x.S.fourD; });

    /* due zone lontane: collo e gambe, collo e lombare */
    const cg = M(Object.assign({}, base, {quiz:{activity:'riposo', giornata:'tranquilla', zones:['cervicale','gambe'], goal:'sollievo', mood:'sereno', pressione:'media'}}));
    const cl = M(Object.assign({}, base, {quiz:{activity:'riposo', giornata:'tranquilla', zones:['cervicale','lombare'], goal:'sollievo', mood:'sereno', pressione:'media'}}));
    out.cg = {up: cg.manualRef && cg.manualRef.zona, polpacci: cg.S.polpacci, aria: cg.aria.icone.join('+')};
    out.cl = {up: !!cl.manualRef, dn: !!cl.manualBasso};

    /* la giornata: solo con «nessun allenamento» */
    const g = (gi, act, goal) => M(Object.assign({}, base, {quiz:{activity:act || 'riposo', giornata:gi, zones:[], goal: goal || 'recupero', mood:'sereno', pressione:'media'}})).prog;
    out.giornata = {guida:g('guida'), fisico:g('fisico'), scrivania:g('scrivania'), inpiedi:g('inpiedi'), emsGuida:g('guida','ems')};

    /* prima volta: niente rifiniture, 15 minuti, tutto basso */
    const pv = M(Object.assign({}, base, {primaVolta:true, quiz:{activity:'ems', zones:['cervicale','lombare'], goal:'recupero', mood:'carico', pressione:'decisa'}}));
    out.prima = {rif: !!(pv.manualRef || pv.manualBasso), timer: pv.S.timer, D: pv.S.fourD, A: pv.S.airbag, prog: pv.prog};
    return out;
  });

  const sei = ['KNEADING','SHIATSU','MASSAGE','TAPPING','TAP','KNEADKNOCK'];
  tac.t('si usano tutte e sei le tecniche manuali', sei.every(k => r.tecniche[k] > 0), JSON.stringify(r.tecniche));
  tac.t('la zona accende la parte giusta: collo e centro schiena → UP, lombare e glutei → DOWN, gambe → polpacci, piedi → piedi', !r.dove.length, r.dove.join('\n'));
  tac.t('mai oltre il 3 se il cliente non lo chiede', !r.oltre.length, r.oltre.join('\n'));
  tac.t('il 4 c\'è solo con pressione decisa e una taratura «troppo leggera»', r.q4 === 4 && r.q4media === 3 && r.q4aria === 4, JSON.stringify({q4:r.q4, q4media:r.q4media, q4aria:r.q4aria}));
  tac.t('sensibile al calore e profilo soft non si scavalcano mai, nemmeno con le tarature al massimo', !r.sicurezza.length, r.sicurezza.slice(0,3).join('\n'));
  tac.t('mai due sedute uguali di fila quando esiste un\'alternativa adatta', r.senzaAlt === 0, r.senzaAlt + ' casi su ' + r.tot);
  tac.t('collo con obiettivi diversi: sedute diverse', new Set(r.collo.map(x => x.split(':')[1])).size >= 5, r.collo.join(' '));
  tac.t('collo e gambe: rifinitura alta sul collo, Leg Kneading e airbag sulle gambe', /collo/.test(r.cg.up || '') && r.cg.polpacci === 1 && /gambe/.test(r.cg.aria), JSON.stringify(r.cg));
  tac.t('collo e lombare: tutte e due le rifiniture nella stessa seduta', r.cl.up && r.cl.dn, JSON.stringify(r.cl));
  tac.t('la giornata sceglie il programma: guida → P20, lavoro fisico → P06, scrivania → P13, in piedi → P10',
    r.giornata.guida === 'P20' && r.giornata.fisico === 'P06' && r.giornata.scrivania === 'P13' && r.giornata.inpiedi === 'P10', JSON.stringify(r.giornata));
  tac.t('con un allenamento la giornata non conta', r.giornata.emsGuida === 'P21', JSON.stringify(r.giornata));
  tac.t('prima volta: niente rifiniture, 15 minuti, 4D e airbag bassi', !r.prima.rif && r.prima.timer === 15 && r.prima.D <= 1 && r.prima.A <= 1, JSON.stringify(r.prima));
  const usati = Object.keys(r.prog).sort();
  tac.t('dopo la prima volta escono tutti i programmi tranne P22 (prima volta), P23 (solo aria) e P24 (personalizzato)',
    ['P01','P02','P03','P04','P05','P06','P07','P08','P09','P10','P11','P12','P13','P14','P15','P16','P17','P18','P19','P20','P21'].every(k => usati.includes(k)), usati.join(' '));
  const rotOk = s => new Set(s.slice(0, 4).map(x => x.firma)).size === 4 && s[4].firma === s[0].firma && s.every((x, i) => !i || x.firma !== s[i-1].firma);
  const rotTxt = s => s.map(x => x.prog + ' ' + x.tec).join(' → ');
  tac.t('con le stesse risposte quattro sedute diverse di fila, poi si ricomincia dalla migliore (dopo EMS, lombare)', rotOk(r.rot), rotTxt(r.rot));
  tac.t('con le stesse risposte quattro sedute diverse di fila (relax, collo, stressato)', rotOk(r.rot2), rotTxt(r.rot2));
  console.log('   rotazione 1: ' + rotTxt(r.rot) + '\n   rotazione 2: ' + rotTxt(r.rot2));
  const ri = r.ria;
  tac.t('dopo una rifinitura si riaccende quello che il programma aveva acceso: Leg Kneading, Foot Roller, airbag sulle stesse zone, e lo Zero Gravity se serve',
    !ri.tutto.niente && ri.tutto.voci.map(v => v.k).join(',') === 'leg,foot,aria,zerog' && ri.tutto.voci[2].zone.join(',') === 'spalle,vita' && ri.tutto.voci[2].forza === 2, JSON.stringify(ri.tutto));
  tac.t('nei programmi del sonno e della sera non si riaccende niente, e lo dice', ri.sonno.niente && /sonno/.test(ri.sonno.perche), JSON.stringify(ri.sonno));
  tac.t('se il programma non usava airbag né rulli di gambe e piedi, non c\'è niente da riaccendere', ri.vuoto.niente, JSON.stringify(ri.vuoto));
  tac.t('il «perché» dice i minuti delle rifiniture e cosa riaccendere', /8 minuti dalla fine/.test(ri.perche) && /5 minuti dalla fine/.test(ri.perche) && /si riaccendono/.test(ri.perche), ri.perche);
  tac.t('il relax segue l\'ora: la mattina P11, la sera P18', r.mattina === 'P11' && r.sera === 'P18', JSON.stringify({mattina:r.mattina, sera:r.sera}));
  console.log('   (' + r.tot + ' sedute provate, ' + r.distinte + ' diverse; tecniche: ' + JSON.stringify(r.tecniche) + ')');

  /* ── la domanda sulla giornata, nel gestionale e sul totem ── */
  const gq = await p.evaluate(() => {
    quizState = {clientId:'c1', step:0, zones:[], activity:'riposo'};
    const conRiposo = activeQuizSteps().map(s => s.k).join(',');
    quizState.activity = 'ems';
    return {conRiposo, conEms: activeQuizSteps().map(s => s.k).join(',')};
  });
  tac.t('nel gestionale la domanda sulla giornata c\'è solo dopo «nessun allenamento»',
    /activity,giornata,/.test(gq.conRiposo) && !/giornata/.test(gq.conEms), JSON.stringify(gq));

  /* il gestionale legge davvero le ultime sedute salvate nell'archivio */
  const ga = await p.evaluate(() => {
    const c = DB.clients[0], q = {activity:'ems', zones:['lombare'], goal:'recupero', mood:'carico', pressione:'media', prefSoloAria:false};
    const salva = (pr, d) => DB.sessions.push({id:'v' + d, clientId:'c1', date:'2026-02-0' + d + 'T10:00:00.000Z', prog:pr.prog, settings:pr.S, manualRef:pr.manualRef, manualBasso:pr.manualBasso});
    const seq = [];
    for(let d = 1; d <= 5; d++){ const pr = buildProtocol(c, q); seq.push(pr.firma); salva(pr, d); }
    const rip = buildProtocol(c, q, {senzaVarieta:true}).firma;
    return {seq, rip};
  });
  tac.t('nel gestionale, con le sedute salvate, le stesse risposte danno quattro sedute diverse e poi la migliore',
    new Set(ga.seq.slice(0, 4)).size === 4 && ga.seq[4] === ga.seq[0], ga.seq.join('\n'));
  tac.t('«ripeti seduta» resta identica: la varietà non la tocca', ga.rip === ga.seq[0], ga.rip);
  await p.close();

  const v = await browser.newPage({viewport:{width:1080, height:1920}});
  v.on('pageerror', e => tac.rossi.push('errore di pagina (vetrina): ' + e.message));
  await v.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio());
  await v.goto(VETRINA); await v.waitForTimeout(800);
  const vt = await v.evaluate(() => {
    D.activity = 'riposo'; const a = passi().map(p => p.k).join(',');
    D.activity = 'ems'; const b = passi().map(p => p.k).join(',');
    return {a, b, motore: typeof MOTORE === 'object' && typeof costruisciProtocollo === 'function'};
  });
  tac.t('sul totem la domanda sulla giornata c\'è solo dopo «nessun allenamento»', /activity,giornata,zones/.test(vt.a) && !/giornata/.test(vt.b), JSON.stringify(vt));
  tac.t('il totem usa lo stesso motore del gestionale', vt.motore);

  /* il ?v= di motore.js segue la versione: senza, un telefono puo' tenere in
     cache il motore vecchio sotto una pagina nuova */
  const fs = require('fs'), path = require('path');
  const vers = f => { const s = fs.readFileSync(path.join(__dirname, '..', 'app', f), 'utf8');
    const v = (s.match(/_VERSION = 'v(\d+)\.(\d+)\.(\d+)\((\d+)\)'/) || []).slice(1).join('.');
    return {v, q: (s.match(/motore\.js\?v=([\d.]+)"/) || [])[1]}; };
  const vg = vers('index.html'), vv = vers('totem/index.html');
  tac.t('motore.js si carica con la versione giusta, nel gestionale e sul totem', vg.v && vg.q === vg.v && vv.q === vv.v, JSON.stringify({vg, vv}));
  await v.close();
  return tac;
};
