/* ═══════════════════════════════════════════════════════════════
   IL MOTORE DEI PROTOCOLLI ZENITH — un file solo, per tutti
   Fino alla v158 c'erano due copie scritte a mano: buildProtocol() nel
   gestionale e costruisciProtocollo() nella vetrina, tenute uguali da
   una prova. Adesso il motore e' qui, e le due pagine lo chiamano
   passandogli quello che sanno. Una regola si cambia in un posto solo.

   Le regole, in breve:
   · la ZONA dice DOVE si lavora: le zone degli airbag, la rifinitura UP
     (dal collo al centro schiena), la rifinitura DOWN (dalla lombare ai
     glutei), i rulli di polpacci e piedi;
   · l'OBIETTIVO dice COME: il programma, il ritmo, la tecnica, la
     profondita';
   · l'ATTIVITA' e la GIORNATA (per chi non si e' allenato) scelgono fra
     i programmi adatti a quell'obiettivo;
   · 4D e airbag seguono obiettivo, umore e pressione chiesta. Il motore
     non va mai oltre il 3: il 4 c'e' solo quando e' il cliente a
     chiederlo (pressione «decisa» e, in passato, «troppo leggera»);
   · le rifiniture si fanno ALLA FINE: in modalita' manuale la capsula
     ferma airbag e rulli di polpacci e piedi, quindi prima lavora il
     programma completo e poi si rifinisce;
   · mai due sedute uguali di fila: con le stesse risposte il motore
     ruota fra fino a quattro varianti adatte (l'altro programma adatto,
     l'altra tecnica adatta) guardando le ultime tre sedute. Le preferite
     si ripetono identiche di proposito, e non passano di qui.
   · i limiti di sicurezza (sensibile al calore, profilo soft con
     certificato) si applicano per ultimi: nessuna regola li scavalca.
   ═══════════════════════════════════════════════════════════════ */
(function(G){
'use strict';

const TECNICA_NOME = {
  KNEADING:'Kneading (impastamento)', SHIATSU:'Shiatsu (digitopressione)',
  MASSAGE:'Massage (massaggio)', TAPPING:'Tapping (picchiettamento)',
  TAP:'Tap (percussione)', KNEADKNOCK:'Knead and Knock (impastamento e percussione)'};
const LARGHEZZA_NOME = {W_NARROW:'stretta (paravertebrali)', W_MEDIUM:'media', W_WIDE:'larga'};
const INTERVALLO_NOME = {INT_WHOLE:'tutta la zona', INT_LOCAL:'zona locale', INT_FIXED:'punto fisso'};
/* le zone delle rifiniture: chiavi corte, perche' viaggiano nel QR */
const ZONA_RIF = {
  collo:'collo, trapezi e spalle', dorso:'centro schiena', collodorso:'dal collo al centro schiena',
  lombare:'zona lombare', glutei:'glutei', lombglut:'lombare e glutei'};
/* le alternative giuste di ogni tecnica: si usano solo per non ripetere
   la seduta di ieri, e restano dentro la stessa intenzione */
const TECNICA_ALT = {SHIATSU:'KNEADING', KNEADING:'SHIATSU', MASSAGE:'SHIATSU',
  KNEADKNOCK:'TAP', TAP:'KNEADKNOCK', TAPPING:'TAP'};
/* dove l'obiettivo chiede un'alternativa diversa: il relax resta fra le
   tecniche lente, il sonno fra le piu' morbide, il drenaggio fra quelle
   che accompagnano i liquidi */
const TECNICA_ALT_PER = {
  relax:{SHIATSU:'MASSAGE', MASSAGE:'SHIATSU'},
  sonno:{MASSAGE:'KNEADING'},
  drenaggio:{TAPPING:'MASSAGE'}};
const tecnicaAlt = (tkey, goal) => (TECNICA_ALT_PER[goal] || {})[tkey] || TECNICA_ALT[tkey];
const GIORNATE = ['guida','scrivania','inpiedi','fisico','tranquilla'];

function scalaCapsula(v){ return v <= 0 ? 0 : v <= 2 ? 1 : v === 3 ? 2 : 3; }
const lim = (v, a, b) => Math.max(a, Math.min(b, v));

/* l'idoneita' dall'anamnesi: A = non idoneo, B = serve il certificato */
function idoneitaDa(an){
  an = an || {};
  for(let i = 1; i <= 6; i++) if(an['a' + i] === true) return 'no';
  for(let i = 1; i <= 9; i++) if(an['b' + i] === true) return an.certificatoOk ? 'cert' : 'blocked';
  return 'ok';
}
/* i parametri di partenza: quelli della scheda, o ricavati dall'anamnesi */
function macroDa(macro, an){
  if(macro) return macro;
  an = an || {};
  const base = an.prefIntensita === 'delicato' ? {intensita:2, fourD:2}
             : an.prefIntensita === 'deciso'   ? {intensita:4, fourD:4} : {intensita:3, fourD:3};
  return Object.assign(base, {airbag:3, calore:!an.caloreSensibile, ioni:an.sonno === 'scarso',
    zerog:true, timer:20, plantari:1, polpacci:1});
}

/* ── le zone degli airbag: prima quelle di oggi, poi quelle dell'anamnesi ── */
const ARIA_NOME = {spalle:'spalle', braccia:'braccia', vita:'vita e fianchi', gambe:'gambe e piedi', tutto:'corpo intero'};
function scegliZoneAirbag(quiz, fam, anZone){
  const z2i = {cervicale:'spalle', spalle:'spalle', braccia:'braccia', dorsale:'vita', lombare:'vita',
               glutei:'vita', gambe:'gambe', piedi:'gambe'};
  const mappa = arr => (arr||[]).map(z=>z2i[z]).filter(Boolean);
  const oggi = mappa(quiz.zones), anam = mappa(anZone);
  let icone = [...new Set([...oggi, ...anam])], perche;
  if (icone.length){
    perche = oggi.length && anam.length ? 'dalle zone indicate oggi e da quelle segnalate in anamnesi'
           : oggi.length ? 'dalle zone indicate oggi' : 'dalle zone segnalate in anamnesi';
  } else {
    const a = quiz.activity, g = quiz.goal;
    if (g==='drenaggio' || a==='matrix'){ icone = ['gambe']; perche = 'gambe leggere: la compressione accompagna i liquidi verso l\'alto'; }
    else if (a==='ems2' || a==='vacufit'){ icone = ['gambe','vita']; perche = 'dopo '+(a==='ems2'?'EMS2':'Vacutherm')+' lavorano gambe, glutei e fianchi'; }
    else { icone = ['tutto']; perche = 'nessuna zona in particolare: compressione su tutto il corpo'; }
  }
  if (icone.includes('tutto') || icone.length >= 4) icone = ['tutto'];
  return { icone, perche,
    testo: 'Zone airbag: ' + icone.map(k=>ARIA_NOME[k]).join(', ') + ' — ' + perche + '.' };
}

/* ══ 1 · IL PROGRAMMA: l'obiettivo sceglie la famiglia, il resto sceglie fra i
   programmi adatti. Ogni ramo da' una lista: il primo e' il piu' adatto, il
   secondo (se c'e') e' quello con cui si alterna. ══ */
function programmi(q, ctx){
  const has = z => (q.zones||[]).includes(z);
  const alto = has('cervicale') || has('dorsale'), schiena = has('dorsale') || has('lombare');
  const bassa = has('gambe') || has('piedi'), glutei = has('glutei');
  const solaParteAlta = (has('cervicale') || has('braccia')) && !schiena && !glutei && !bassa;
  const solaParteBassa = (bassa || glutei) && !alto && !has('lombare') && !has('braccia');
  const a = q.activity, g = q.goal, m = q.mood, gi = a === 'riposo' ? q.giornata : null;
  const F = ctx.genere === 'F';

  if(g === 'recupero'){
    if(m === 'dolorante' && a !== 'riposo') return {fam:'Z2', pool:['P07','P21'], perche:'muscoli indolenziti dopo l\'allenamento: manovre lente e profonde anti-indolenzimento'};
    if(a === 'ems'){
      if(solaParteAlta) return {fam:'Z2', pool:['P09','P03'], perche:'EMS con la parte alta al centro: spalle, dorso e braccia'};
      if(solaParteBassa) return {fam:'Z2', pool:['P10','P08'], perche:'EMS con gambe e glutei al centro'};
      return {fam:'Z2', pool:['P21','P06'], perche:'dopo l\'EMS il recupero è parte del metodo: defaticamento completo'};
    }
    if(a === 'ems2'){
      if(bassa) return {fam:'Z3', pool:['P08','P10'], perche:'dopo EMS2 le gambe sono quelle che hanno camminato sotto stimolo'};
      return {fam:'Z2', pool:['P21','P06'], perche:'EMS2: defaticamento di tutti i gruppi che l\'elettrostimolazione ha fatto contrarre'};
    }
    if(a === 'vacufit') return {fam:'Z3', pool: F ? ['P08','P02'] : ['P08','P10'], perche:'dopo il Vacutherm si prolunga la leggerezza di gambe e glutei'};
    if(a === 'matrix'){
      if(solaParteBassa) return {fam:'Z2', pool:['P10','P08'], perche:'leg day: il recupero va sulla parte bassa'};
      if(solaParteAlta) return {fam:'Z2', pool:['P09','P03'], perche:'upper day: recupero della parte alta'};
      return {fam:'Z2', pool:['P21','P06'], perche:'allenamento completo in sala: defaticamento e allungamento'};
    }
    /* nessun allenamento: decide la giornata */
    if(gi === 'fisico') return {fam:'Z2', pool:['P06','P21'], perche:'giornata di lavoro fisico: allungamento e defaticamento'};
    if(gi === 'inpiedi') return {fam:'Z2', pool:['P10','P08'], perche:'in piedi tutto il giorno: il recupero parte dalle gambe'};
    if(gi === 'guida') return {fam:'Z4', pool:['P20','P04'], perche:'ore alla guida: lombare, glutei, collo e spalle'};
    if(gi === 'scrivania') return {fam:'Z5', pool:['P13','P09'], perche:'ore alla scrivania: collo, trapezi, lombare e avambracci'};
    return {fam:'Z8', pool: m === 'sereno' ? ['P14','P01'] : ['P01','P14'], perche:'riequilibrio completo dalla nuca ai piedi'};
  }
  if(g === 'sollievo'){
    if(solaParteAlta){
      if(!has('cervicale')) return {fam:'Z5', pool:['P09','P03'], perche:'braccia e spalle sono la zona del giorno'};
      if(m === 'stressato') return {fam:'Z5', pool:['P19','P13'], perche:'collo e spalle tesi con la testa sotto pressione: decontratturante e antistress'};
      if(gi === 'guida') return {fam:'Z5', pool:['P20','P03'], perche:'dopo ore di guida: collo e spalle'};
      return {fam:'Z5', pool: a === 'riposo' ? ['P13','P03'] : ['P03','P13'], perche:'focus su collo, trapezi e spalle'};
    }
    if(glutei && !has('dorsale')) return {fam:'Z4', pool: gi === 'guida' ? ['P20','P05'] : ['P05','P04'], perche:'la tensione parte da glutei e zona lombare: si lavora all\'origine'};
    if(schiena || has('cervicale')) return {fam:'Z4', pool: gi === 'guida' ? ['P20','P04'] : gi === 'scrivania' ? ['P04','P13'] : ['P04','P20'], perche:'tratto dorso-lombare, con calore e pressioni lente e profonde'};
    if(bassa) return {fam:'Z3', pool:['P08','P10'], perche:'gambe e piedi sono la zona del giorno'};
    if(gi === 'guida') return {fam:'Z4', pool:['P20','P04'], perche:'ore alla guida: lombare, glutei, collo e spalle'};
    if(gi === 'scrivania') return {fam:'Z5', pool:['P13','P19'], perche:'ore alla scrivania: collo, trapezi, lombare e avambracci'};
    if(gi === 'inpiedi') return {fam:'Z3', pool:['P10','P08'], perche:'in piedi tutto il giorno: dalla vita in giù'};
    if(gi === 'fisico') return {fam:'Z2', pool:['P06','P21'], perche:'giornata di lavoro fisico: allungamento e scioglimento'};
    return {fam:'Z4', pool:['P04','P01'], perche:'sollievo sulla schiena, dove si accumula la tensione'};
  }
  if(g === 'drenaggio'){
    if(a === 'matrix') return {fam:'Z3', pool:['P10','P08'], perche:'leggerezza dopo i pesi: dalla vita in giù'};
    return {fam:'Z3', pool: F ? ['P08','P02'] : ['P08','P10'], perche:'compressione a onde e rulli dai piedi verso l\'alto'};
  }
  if(g === 'sonno'){
    return {fam:'Z6', pool: m === 'stressato' ? ['P17','P18'] : ['P18','P17'], perche:'rituale lento che prepara il corpo al sonno'};
  }
  if(g === 'relax'){
    if(m === 'stressato' || has('cervicale')) return {fam:'Z6', pool:['P19','P11'], perche:'decontratturante su collo e spalle e rilassamento profondo antistress'};
    if(a === 'matrix' || a === 'ems' || gi === 'fisico') return {fam:'Z8', pool:['P12','P06'], perche:'dopo lo sforzo: allungamenti e pressioni ampie in stile spa'};
    if(gi === 'guida') return {fam:'Z4', pool:['P20','P11'], perche:'reset dopo ore di guida, a ritmo lento'};
    if(gi === 'scrivania') return {fam:'Z6', pool:['P19','P16'], perche:'staccare dalla scrivania: collo e spalle, poi relax profondo'};
    if(ctx.quando === 'pranzo') return {fam:'Z8', pool:['P16','P11'], perche:'pausa rigenerante di metà giornata'};
    if(ctx.quando === 'sera') return {fam:'Z6', pool:['P18','P11'], perche:'sera: rilassamento che accompagna verso il riposo'};
    return {fam:'Z6', pool: m === 'sereno' ? ['P14','P11'] : ['P11','P14'], perche:'trattamento lento e atmosfera rilassante'};
  }
  if(g === 'energia') return {fam:'Z7', pool:['P15','P01'], perche:'ritmo vivace e tonificante che accende corpo e circolazione'};
  return {fam:'Z8', pool:['P01','P14'], perche:'riequilibrio completo dalla nuca ai piedi'};
}

/* ══ 2 · LE RIFINITURE: dove le dice la zona, come le dice l'obiettivo ══ */
function tecnicaPer(reg, zk, q, allen){
  const g = q.goal, m = q.mood, deciso = q.pressione === 'decisa' || m === 'carico';
  if(g === 'sonno') return 'MASSAGE';
  if(g === 'relax') return (reg === 'up' && m === 'stressato') ? 'SHIATSU' : 'MASSAGE';
  if(g === 'energia') return deciso ? 'TAP' : 'TAPPING';
  if(g === 'drenaggio') return 'TAPPING';
  if(g === 'recupero'){
    if(m === 'dolorante') return 'KNEADING';
    if(!allen) return 'KNEADING';
    return deciso ? 'TAP' : 'KNEADKNOCK';
  }
  /* sollievo: il punto preciso del collo vuole la pressione, la schiena l'impastamento */
  if(zk === 'collo' || zk === 'collodorso') return 'SHIATSU';
  if(zk === 'glutei') return m === 'dolorante' ? 'SHIATSU' : 'KNEADING';
  return 'KNEADING';
}
function larghezzaPer(zk, q){
  const morbido = ['relax','sonno','drenaggio','energia'].includes(q.goal);
  if(zk === 'collo' || zk === 'collodorso') return 'W_MEDIUM';
  if(morbido) return 'W_WIDE';
  if(zk === 'lombare') return 'W_NARROW';
  if(zk === 'glutei') return 'W_WIDE';
  return 'W_MEDIUM';
}
function intervalloPer(q){
  if(q.goal === 'sollievo') return q.mood === 'dolorante' ? 'INT_FIXED' : 'INT_LOCAL';
  if(q.goal === 'recupero') return 'INT_LOCAL';
  return 'INT_WHOLE';
}
function velocitaPer(q){
  let v = {sonno:1, relax:2, sollievo:2, recupero:3, drenaggio:3, energia:4}[q.goal] || 2;
  if(q.pressione === 'dolce') v--;
  if(q.pressione === 'decisa') v++;
  if(q.mood === 'carico') v++;
  return lim(v, 1, 5);
}
function rifinitura(reg, zk, q, allen, tara){
  const tkey = tecnicaPer(reg, zk, q, allen);
  const W = ['W_NARROW','W_MEDIUM','W_WIDE'];
  let wi = W.indexOf(larghezzaPer(zk, q)), vel = velocitaPer(q), tarata = 0;
  /* la risposta di fine seduta su questa rifinitura: «troppo forte» la allarga
     e la rallenta, «troppo leggera» la stringe e la accelera */
  if(tara){ const s = Math.sign(tara); wi = lim(wi - s, 0, 2); vel = lim(vel + tara, 1, 5); tarata = tara; }
  return {reg, zk, zona:ZONA_RIF[zk], tkey, tecnica:TECNICA_NOME[tkey], wkey:W[wi], larghezza:LARGHEZZA_NOME[W[wi]],
    ikey:intervalloPer(q), intervallo:INTERVALLO_NOME[intervalloPer(q)], velocita:vel, tarata};
}

/* la firma di una seduta: quello che la capsula fa davvero. Serve a non
   ripetere due volte di fila la stessa seduta */
function firma(p){
  const r = x => x ? [x.tkey, x.wkey, x.ikey, x.velocita, x.zk || ''].join(',') : '-';
  return [p.prog, p.S.fourD, p.S.airbag, p.S.calore?1:0, p.S.ioni?1:0, p.S.zerog?1:0,
    p.S.polpacci?1:0, p.S.plantari?1:0, r(p.manualRef), r(p.manualBasso)].join('|');
}

/* le ultime tre sedute di un cliente, la piu' recente per prima: le
   leggono il gestionale e il totem dallo stesso archivio */
function ultimeDa(sessions, clientId){
  return (sessions || []).filter(x => x.clientId === clientId && x.prog)
    .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3)
    .map(s => ({prog: s.prog, firma: firma({prog: s.prog, S: s.settings || {}, manualRef: s.manualRef, manualBasso: s.manualBasso})}));
}

/* ══ IL MOTORE ══
   inp = {quiz, anamnesi, macro, cal, calx, genere, primaVolta, abituale,
          ora (0-23), ultime: [{prog, firma}] delle ultime sedute, la piu'
          recente per prima (oppure ultima: {prog, firma}, una sola)} */
function motoreZenith(inp){
  const q = Object.assign({zones:[]}, inp.quiz || {});
  const an = inp.anamnesi || {};
  const st = idoneitaDa(an), soft = st === 'cert';
  const prima = !!inp.primaVolta;
  const M = macroDa(inp.macro, an);
  const cal = inp.cal | 0, cx = inp.calx || {};
  const ora = typeof inp.ora === 'number' ? inp.ora : new Date().getHours();
  const quando = q.when || (ora < 12 ? 'mattina' : ora < 16 ? 'pranzo' : 'sera');
  const has = z => (q.zones||[]).includes(z);
  const allen = ['ems','ems2','vacufit','matrix'].includes(q.activity);
  const soloAria = q.prefSoloAria === true;
  const why = [];
  let press = q.pressione;
  if(press === 'abituale'){
    const hab = inp.abituale || 'media';
    press = hab === 'media' ? 'media' : hab;
    why.push('Applicata la sua pressione abituale (' + hab + '), ricavata dalle ultime sessioni.');
  }
  const qp = Object.assign({}, q, {pressione: press});

  /* ── programma ── */
  let prog, fam, pool = [], alternato = false;
  /* «solo aria» ha sempre la precedenza, anche alla prima volta: niente rulli */
  if(soloAria){
    prog = 'P23'; fam = 'Z3'; pool = ['P23'];
    why.push('💨 Preferenza «solo compressione d\'aria» applicata: P23 Airbag Massage, effetto pressoterapia — nessun rullo.');
  } else if(prima){
    prog = an.prefIntensita === 'deciso' ? 'P01' : 'P22'; fam = 'Z1'; pool = [prog];
    why.push('Prima sessione in capsula: si parte dolcemente per far conoscere ogni sensazione.');
  } else {
    const r = programmi(qp, {genere: inp.genere, quando});
    fam = r.fam; pool = r.pool; prog = pool[0];
    why.push(r.perche.charAt(0).toUpperCase() + r.perche.slice(1) + '.');
  }
  const soloAriaConflitto = soloAria && !prima && (q.goal === 'sollievo' || has('dorsale') || has('lombare') || has('glutei') || has('cervicale'));
  if(soloAriaConflitto) why.push('⚠️ Nota: era stato chiesto un lavoro mirato che di norma usa i rulli. Con «solo aria» quel lavoro coi rulli non viene eseguito: se serve la schiena coi rulli, disattiva l\'interruttore.');

  /* ── i parametri: si parte dalla scheda ── */
  const S = {intensita: 0, fourD: scalaCapsula(M.fourD), airbag: scalaCapsula(M.airbag),
    calore: !!M.calore, ioni: !!M.ioni, zerog: M.zerog !== false,
    polpacci: M.polpacci > 0 ? 1 : 0, plantari: M.plantari > 0 ? 1 : 0, timer: 20};
  const fourD0 = S.fourD;

  /* 4D: lo spostano l'obiettivo, l'umore e la pressione di oggi */
  let dD = 0;
  if(q.goal === 'sonno' || q.goal === 'relax') dD--;
  if(q.goal === 'recupero' && allen) dD++;
  if(q.mood === 'carico' && q.goal !== 'sonno' && q.goal !== 'relax') dD++;
  if(press === 'dolce') dD--;
  if(press === 'decisa') dD++;
  if(fourD0 > 0) S.fourD = lim(fourD0 + dD, 1, 3);

  /* airbag: piu' alti dove c'e' da far defluire, piu' bassi verso il sonno */
  let dA = 0;
  const gambeOggi = (has('gambe') || has('piedi')) && q.goal !== 'relax' && q.goal !== 'sonno';
  if(q.goal === 'drenaggio' || q.activity === 'ems2' || q.activity === 'vacufit' || gambeOggi || soloAria) dA++;
  if(q.goal === 'sonno') dA--;
  if(press === 'dolce') dA--;
  if(press === 'decisa') dA++;
  S.airbag = lim(S.airbag + dA, 1, 3);
  if(press === 'dolce') why.push('Pressione alleggerita: oggi ha chiesto un tocco più dolce.');
  if(press === 'decisa') why.push('Pressione aumentata di un livello: oggi vuole sentire il lavoro in profondità.');
  if(dD && fourD0 > 0 && (q.goal === 'sonno' || q.goal === 'relax')) why.push('Profondità 4D più bassa: per rilassarsi i rulli lavorano più in superficie.');
  if(q.goal === 'recupero' && allen && fourD0 > 0) why.push('Profondità 4D più alta: dopo l\'allenamento i rulli vanno a fondo sui muscoli lavorati.');

  /* gli elementi accesi/spenti */
  if(q.goal === 'sollievo') S.calore = true;
  if(q.goal === 'relax' || q.goal === 'sonno' || q.mood === 'stressato') S.ioni = true;
  if(q.activity === 'ems2' || q.activity === 'vacufit' || q.goal === 'drenaggio' || gambeOggi || soloAria) S.zerog = true;
  if(q.goal === 'energia') S.zerog = false;
  if(has('gambe') || q.activity === 'ems2' || q.activity === 'vacufit' || q.goal === 'drenaggio') S.polpacci = 1;
  if(has('piedi') || q.activity === 'ems2' || q.activity === 'vacufit' || q.goal === 'drenaggio' || q.goal === 'energia') S.plantari = 1;
  if(has('gambe') && !soloAria) why.push('Gambe fra le zone: Leg Kneading acceso sui polpacci e airbag su gambe e piedi.');
  if(has('piedi') && !soloAria) why.push('Piedi fra le zone: Foot Roller acceso sulla pianta del piede.');

  /* ── le rifiniture ── */
  let manualRef = null, manualBasso = null;
  if(!prima && !soloAria){
    const zkUp = has('cervicale') && has('dorsale') ? 'collodorso' : has('cervicale') ? 'collo' : has('dorsale') ? 'dorso' : null;
    const zkDn = has('lombare') && has('glutei') ? 'lombglut' : has('lombare') ? 'lombare' : has('glutei') ? 'glutei' : null;
    if(zkUp) manualRef = rifinitura('up', zkUp, qp, allen, cx.up | 0);
    if(zkDn) manualBasso = rifinitura('down', zkDn, qp, allen, cx.down | 0);
  }

  /* ── solo aria: nessun rullo, tutte le manopole dei rulli a zero ── */
  if(soloAria){ S.fourD = 0; S.polpacci = 0; S.plantari = 0; }

  /* ── prima volta: tutto dolce ── */
  if(prima){ S.fourD = Math.min(S.fourD, 1); S.airbag = Math.min(S.airbag, soloAria ? 2 : 1); }

  /* ── tarature di fine seduta. Il 4 c'e' solo se il cliente l'ha chiesto ── */
  const chiedeDiPiu = press === 'decisa';
  if(!prima){
    if(soloAria){
      if(cal){ S.airbag = lim(S.airbag + cal, 1, chiedeDiPiu && cal > 0 ? 4 : 3);
        why.push('🎚️ Taratura personale applicata (' + (cal>0?'+':'') + cal + ' livell' + (Math.abs(cal)>1?'i':'o') + ') sulla forza dell\'aria: ' + (cal<0 ? 'a fine seduta aveva riferito che era troppo forte.' : 'a fine seduta aveva riferito che era troppo leggera.')); }
    } else {
      if(cal && S.fourD > 0){ S.fourD = lim(S.fourD + cal, 1, chiedeDiPiu && cal > 0 ? 4 : 3);
        why.push('🎚️ Taratura personale applicata (' + (cal>0?'+':'') + cal + ' livell' + (Math.abs(cal)>1?'i':'o') + '): ' + (cal<0 ? 'a fine seduta aveva riferito che era troppo forte.' : 'a fine seduta aveva riferito che era troppo leggera.')); }
      if(cx.aria){ S.airbag = lim(S.airbag + cx.aria, 1, chiedeDiPiu && cx.aria > 0 ? 4 : 3);
        why.push('🎚️ Airbag tarati (' + (cx.aria>0?'+':'') + cx.aria + '): ' + (cx.aria<0 ? 'li aveva trovati troppo forti.' : 'li aveva trovati troppo leggeri.')); }
    }
    if(manualRef && manualRef.tarata) why.push('🎚️ Rifinitura alta ' + (manualRef.tarata < 0 ? 'più larga e più lenta: la volta scorsa era troppo forte.' : 'più stretta e più veloce: la volta scorsa era troppo leggera.'));
    if(manualBasso && manualBasso.tarata) why.push('🎚️ Rifinitura bassa ' + (manualBasso.tarata < 0 ? 'più larga e più lenta: la volta scorsa era troppo forte.' : 'più stretta e più veloce: la volta scorsa era troppo leggera.'));
    if(cx.calore < 0 && S.calore){ S.calore = false; why.push('🎚️ Calore spento: la volta scorsa era troppo caldo.'); }
  }

  /* ── la durata ── */
  if(prima) S.timer = 15;
  else {
    const rec = {Z6: q.goal === 'sonno' ? 30 : 25, Z2:25, Z3:25}[fam] || 20;
    S.timer = rec;
    why.push(fam === 'Z6' ? 'Relax/sonno: sessione lunga di ' + rec + ' minuti — il rilassamento profondo ha bisogno di tempo.'
      : fam === 'Z2' ? 'Recupero: 25 minuti per un defaticamento completo dei gruppi muscolari.'
      : fam === 'Z3' ? 'Leggerezza: 25 minuti — la compressione a onde dà il meglio con la durata.'
      : 'Durata di 20 minuti.');
  }

  /* ── i limiti di sicurezza, prima del confronto con ieri: nessuna regola li scavalca ── */
  if(an.caloreSensibile){ S.calore = false; why.push('Calore disattivato: sensibilità dichiarata in anamnesi.'); }
  if(soft){ S.fourD = Math.min(S.fourD, 1); S.airbag = Math.min(S.airbag, 2); why.push('Profilo soft: idoneità con certificato medico.'); }

  /* ── mai due sedute uguali di fila, e piu' varieta' possibile ──
     Con le stesse risposte le varianti adatte sono fino a quattro: il
     programma migliore e l'altro adatto, ognuno con la tecnica di
     rifinitura giusta o con la sua alternativa. Si prende la prima che il
     cliente non ha fatto nelle ultime tre sedute; se le ha fatte tutte, la
     piu' lontana nel tempo. Mai quella dell'ultima volta. */
  const recenti = (inp.ultime || (inp.ultima ? [inp.ultima] : [])).map(u => u && u.firma).filter(Boolean).slice(0, 3);
  if(!prima && recenti.length){
    const alt = r => { const t = r && tecnicaAlt(r.tkey, q.goal); return t ? Object.assign({}, r, {tkey:t, tecnica:TECNICA_NOME[t]}) : r; };
    const varianti = [];
    [false, true].forEach(cambiaTec => pool.slice(0, 2).forEach((pg, i) => {
      const v = {prog:pg, S, manualRef: cambiaTec ? alt(manualRef) : manualRef, manualBasso: cambiaTec ? alt(manualBasso) : manualBasso, altroProg: i > 0, cambiaTec};
      v.firma = firma(v);
      if(!varianti.some(x => x.firma === v.firma)) varianti.push(v);
    }));
    const quando = f => { const i = recenti.indexOf(f); return i < 0 ? 99 : i; };
    const scelta = varianti.filter(v => v.firma !== recenti[0])
      .sort((a, b) => quando(b.firma) - quando(a.firma))[0];
    if(scelta && varianti[0].firma !== scelta.firma && recenti.includes(varianti[0].firma)){
      prog = scelta.prog; manualRef = scelta.manualRef; manualBasso = scelta.manualBasso; alternato = true;
      const tec = [scelta.manualRef, scelta.manualBasso].filter(Boolean).map(r => r.tecnica).join(' e ');
      if(scelta.altroProg) why.push('🔁 Con queste risposte ha già fatto ' + pool[0] + ' di recente: oggi si alterna con ' + scelta.prog + ', adatto allo stesso obiettivo.');
      if(scelta.cambiaTec) why.push('🔁 Per non ripetere le ultime sedute, la rifinitura oggi usa ' + tec + ', adatta allo stesso obiettivo.');
    }
  }
  if(manualRef || manualBasso) why.push('✋ Rifinitura ' + [manualRef && ('alta su ' + manualRef.zona + ' con ' + manualRef.tecnica),
    manualBasso && ('bassa su ' + manualBasso.zona + ' con ' + manualBasso.tecnica)].filter(Boolean).join(', poi ')
    + ': si fa negli ultimi minuti, quando il programma ha già lavorato con airbag e rulli.');

  const aria = scegliZoneAirbag(q, fam, an.zone);
  if(prog === 'P23' || (q.zones||[]).length || (an.zone||[]).length) why.push('💨 ' + aria.testo);
  const zCode = fam + '·' + prog + '·D' + S.fourD + 'A' + S.airbag + (S.ioni ? 'I' : '') + (S.calore ? 'C' : '') + (S.zerog ? 'G' : '');
  const out = {prog, fam, S, why, zCode, manualRef, manualBasso, soloAria, soloAriaConflitto, aria, pool, alternato};
  out.firma = firma(out);
  return out;
}

G.MOTORE = {motoreZenith, firma, ultimeDa, scalaCapsula, idoneitaDa, macroDa, scegliZoneAirbag, ARIA_NOME,
  TECNICA_NOME, LARGHEZZA_NOME, INTERVALLO_NOME, ZONA_RIF, GIORNATE};
})(typeof window !== 'undefined' ? window : globalThis);
