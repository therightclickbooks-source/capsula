/* ═══════════════════════════════════════════════════════════════
   IL MOTORE DEI PROTOCOLLI ZENITH — un file solo, per tutti
   Fino alla v158 c'erano due copie scritte a mano: buildProtocol() nel
   gestionale e costruisciProtocollo() nella vetrina, tenute uguali da
   una prova. Adesso il motore e' qui, e le due pagine lo chiamano
   passandogli quello che sanno. Una regola si cambia in un posto solo.

   Le regole, in breve:
   · la ZONA dice DOVE si lavora: la rifinitura UP (dal collo al centro
     schiena) e la rifinitura DOWN (dalla lombare ai glutei). Airbag, Leg
     Kneading e Foot Roller li accende il programma (dalla v173-v174): si
     spengono solo se il cliente lo chiede, e il motore se lo ricorda;
   · l'OBIETTIVO dice COME: il programma, il ritmo, la tecnica, la
     profondita';
   · l'ATTIVITA' e la GIORNATA (per chi non si e' allenato) scelgono fra
     i programmi adatti a quell'obiettivo;
   · 4D e airbag seguono obiettivo, umore e pressione chiesta. Il motore
     non va mai oltre il 3: il 4 c'e' solo quando e' il cliente a
     chiederlo (pressione «decisa» e, in passato, «troppo leggera»);
   · le rifiniture si fanno ALLA FINE, perche' una volta accese non si
     spengono piu': l'alta a 8 minuti dalla fine, la bassa a 5 (a 8 se e'
     da sola), e lavorano insieme. Accendendole la capsula stacca airbag e
     rulli di polpacci e piedi: riattivaDopo() dice cosa riaccendere;
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
/* le altre regolazioni della rifinitura, per variare senza cambiare intenzione:
   la larghezza vicina (piu' ampia per chi cerca relax, sonno, leggerezza o
   energia; piu' raccolta per chi cerca sollievo o recupero) e l'intervallo
   vicino (tutta la zona ↔ zona locale; il punto fisso passa alla zona locale) */
const larghezzaAlt = (wkey, goal) => ['relax','sonno','drenaggio','energia'].includes(goal)
  ? ({W_NARROW:'W_MEDIUM', W_MEDIUM:'W_WIDE', W_WIDE:'W_MEDIUM'})[wkey]
  : ({W_NARROW:'W_MEDIUM', W_MEDIUM:'W_NARROW', W_WIDE:'W_MEDIUM'})[wkey];
const intervalloAlt = ikey => ({INT_WHOLE:'INT_LOCAL', INT_LOCAL:'INT_WHOLE', INT_FIXED:'INT_LOCAL'})[ikey];
/* quante sedute ricorda il motore per non ripetersi: con le stesse risposte
   la stessa seduta torna, al piu' presto, dopo MEMORIA sedute diverse */
const MEMORIA = 7;
const GIORNATE = ['guida','scrivania','inpiedi','fisico','tranquilla'];

/* v198 · la capsula arriva a 6. Il motore propone come prima (0-3, il 4 se
   chiesto), ma la scheda cliente puo' fissare 4, 5 o 6: si salvano come 7, 8
   e 9, cosi' i valori vecchi (fino a 6, che diventano 3) restano uguali */
function scalaCapsula(v){ return v <= 0 ? 0 : v <= 2 ? 1 : v === 3 ? 2 : v <= 6 ? 3 : Math.min(6, v - 3); }
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
/* «spalle», «spalle e braccia», «spalle, braccia e vita e fianchi» */
const elenco = l => l.length < 2 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1];

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

/* ── le zone degli airbag: prima quelle di oggi, poi quelle dell'anamnesi ──
   Dalla v173 servono solo alla seduta solo aria (P23), dove gli airbag sono
   tutto il massaggio. Nelle altre sedute lavorano gli airbag del programma,
   con la loro alternanza: si spengono solo le zone che il cliente chiede
   spente (zoneSpente). */
const ARIA_NOME = {spalle:'spalle', braccia:'braccia', vita:'vita e fianchi', gambe:'gambe e piedi', tutto:'corpo intero'};
const ZONE_SPEGNIBILI = ['spalle', 'braccia', 'vita', 'gambe'];
/* le zone spente, pulite e sempre nello stesso ordine */
function zoneSpente(z){ return Array.isArray(z) ? ZONE_SPEGNIBILI.filter(k => z.indexOf(k) >= 0) : []; }
/* le zone accese meno quelle spente («corpo intero» si apre nelle quattro) */
function senzaSpente(icone, spente){
  spente = zoneSpente(spente);
  if(!spente.length || !icone) return icone;
  const tutte = icone.indexOf('tutto') >= 0 ? ZONE_SPEGNIBILI.slice() : icone.slice();
  let r = tutte.filter(k => spente.indexOf(k) < 0);
  /* spente proprio quelle scelte: lavorano le altre zone */
  if(!r.length) r = ZONE_SPEGNIBILI.filter(k => spente.indexOf(k) < 0);
  return r.length ? r : icone;
}
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

/* ══ DOPO UNA RIFINITURA: cosa si riaccende ══
   Accendendo Up o Down movement la capsula stacca gli airbag e i rulli di
   polpacci e piedi, e la rifinitura non si spegne piu' fino alla fine. Il
   motore dice all'operatore cosa riaccendere a mano, e cosa no:
   · di regola si riaccende quello che il programma aveva acceso (Leg
     Kneading, Foot Roller, gli airbag sulle stesse zone);
   · nei programmi del sonno e della sera (P17, P18) non si riaccende
     niente: gli ultimi minuti restano tranquilli, lavora solo la rifinitura.
   Usa solo cio' che viaggia anche nel QR (programma, valori, zone), cosi' il
   telefono dice esattamente le stesse cose del tablet. */
const QUIETE = ['P17', 'P18'];
/* gli airbag da riaccendere dopo una rifinitura: le zone della seduta, se
   la seduta le sceglie (solo aria, o una seduta di prima della v173);
   altrimenti corpo intero, tranne le zone che il cliente vuole spente.
   p.zone: le zone applicate (null = quelle del programma) */
function zoneDaRiaccendere(p){
  p = p || {};
  const z = p.zone !== undefined ? p.zone : (p.prog === 'P23' && p.aria ? p.aria.icone : null);
  if(z && z.length) return z.slice();
  const sp = zoneSpente(p.spente);
  return sp.length ? ZONE_SPEGNIBILI.filter(k => sp.indexOf(k) < 0) : ['tutto'];
}
function riattivaDopo(p){
  const S = (p && p.S) || {}, aria = zoneDaRiaccendere(p);
  if(QUIETE.includes(p && p.prog))
    return {niente:true, perche:'programma per il sonno e la sera: gli ultimi minuti restano tranquilli, lavora solo la rifinitura', voci:[]};
  const voci = [];
  if(S.polpacci > 0) voci.push({k:'leg', nome:'Leg Kneading', dove:'tasto in basso, anche da questa schermata'});
  if(S.plantari > 0) voci.push({k:'foot', nome:'Foot Roller', dove:'tasto in basso, accanto a Leg Kneading'});
  if(S.airbag > 0 && aria.length) voci.push({k:'aria', nome:'Airbag', zone:aria.slice(), forza:S.airbag,
    tutte: aria.length === 1 && aria[0] === 'tutto', spente: p && p.prog !== 'P23' ? zoneSpente(p.spente) : [],
    dove:'“Airbag” nella barra in alto → accendi ' + aria.map(k => ARIA_NOME[k] || k).join(', ') + ' (sfondo azzurro)'});
  if(S.zerog && voci.some(v => v.k === 'aria'))
    voci.push({k:'zerog', nome:'Zero Gravity', dove:'solo se aprendo gli airbag la poltrona si è rialzata: schermata Auto → Zero Gravity'});
  if(!voci.length) return {niente:true, perche:'il programma non usava né airbag né rulli di gambe e piedi', voci};
  return {niente:false, perche:'tornano a lavorare come nel programma, insieme alla rifinitura', voci};
}

/* le ultime tre sedute di un cliente, la piu' recente per prima: le
   leggono il gestionale e il totem dallo stesso archivio */
function ultimeDa(sessions, clientId){
  return (sessions || []).filter(x => x.clientId === clientId && x.prog)
    .sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, MEMORIA)
    .map(s => ({prog: s.prog, nome: s.nome || '', firma: firma({prog: s.prog, S: s.settings || {}, manualRef: s.manualRef, manualBasso: s.manualBasso})}));
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
    why.push('Applicata la sua pressione abituale (' + hab + '), ricavata dalle ultime sedute.');
  }
  const qp = Object.assign({}, q, {pressione: press});

  /* ── programma ── */
  let prog, fam, pool = [], alternato = false;
  /* «solo aria» ha sempre la precedenza, anche alla prima volta: niente rulli */
  if(soloAria){
    prog = 'P23'; fam = 'Z3'; pool = ['P23'];
    why.push('💨 Preferenza «solo compressione d\'aria» applicata: P23 Airbag Massage Mode, effetto pressoterapia — nessun rullo.');
  } else if(prima){
    prog = an.prefIntensita === 'deciso' ? 'P01' : 'P22'; fam = 'Z1'; pool = [prog];
    why.push('Prima seduta in capsula: si parte dolcemente per far conoscere ogni sensazione.');
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
  /* il tetto resta 3, a meno che la scheda del cliente non dica di piu' */
  const tettoD = Math.max(3, fourD0), tettoA = Math.max(3, S.airbag);
  if(fourD0 > 0) S.fourD = lim(fourD0 + dD, 1, tettoD);

  /* airbag: piu' alti dove c'e' da far defluire, piu' bassi verso il sonno */
  let dA = 0;
  const gambeOggi = (has('gambe') || has('piedi')) && q.goal !== 'relax' && q.goal !== 'sonno';
  if(q.goal === 'drenaggio' || q.activity === 'ems2' || q.activity === 'vacufit' || gambeOggi || soloAria) dA++;
  if(q.goal === 'sonno') dA--;
  if(press === 'dolce') dA--;
  if(press === 'decisa') dA++;
  S.airbag = lim(S.airbag + dA, 1, tettoA);
  if(press === 'dolce') why.push('Pressione alleggerita: oggi ha chiesto un tocco più dolce.');
  if(press === 'decisa') why.push('Pressione aumentata di un livello: oggi vuole sentire il lavoro in profondità.');
  if(dD && fourD0 > 0 && (q.goal === 'sonno' || q.goal === 'relax')) why.push('Profondità 4D più bassa: per rilassarsi i rulli lavorano più in superficie.');
  if(q.goal === 'recupero' && allen && fourD0 > 0) why.push('Profondità 4D più alta: dopo l\'allenamento i rulli vanno a fondo sui muscoli lavorati.');

  /* gli elementi accesi/spenti */
  if(q.goal === 'sollievo') S.calore = true;
  if(q.goal === 'relax' || q.goal === 'sonno' || q.mood === 'stressato') S.ioni = true;
  if(q.activity === 'ems2' || q.activity === 'vacufit' || q.goal === 'drenaggio' || gambeOggi || soloAria) S.zerog = true;
  if(q.goal === 'energia') S.zerog = false;
  /* Leg Kneading e Foot Roller: dalla v174 li accende il programma, come
     gli airbag, e l'operatore non li tocca. Si spengono solo se il cliente
     non li vuole: nella sua scheda (macro), o chiesto durante una seduta
     passata (il pannello «Regola durante la seduta» lo ricorda in
     calx.noLeg e calx.noFoot) */
  S.polpacci = M.polpacci > 0 && !cx.noLeg ? 1 : 0;
  S.plantari = M.plantari > 0 && !cx.noFoot ? 1 : 0;
  if(!soloAria && cx.noLeg) why.push('🦵 Leg Kneading spento: in una seduta passata il cliente ha chiesto di spegnerlo.');
  if(!soloAria && cx.noFoot) why.push('🦶 Foot Roller spento: in una seduta passata il cliente ha chiesto di spegnerlo.');

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
      if(cal){ S.airbag = lim(S.airbag + cal, 1, Math.max(tettoA, chiedeDiPiu && cal > 0 ? 4 : 3));
        why.push('🎚️ Taratura personale applicata (' + (cal>0?'+':'') + cal + ' livell' + (Math.abs(cal)>1?'i':'o') + ') sulla forza dell\'aria: ' + (cal<0 ? 'a fine seduta aveva riferito che era troppo forte.' : 'a fine seduta aveva riferito che era troppo leggera.')); }
    } else {
      if(cal && S.fourD > 0){ S.fourD = lim(S.fourD + cal, 1, Math.max(tettoD, chiedeDiPiu && cal > 0 ? 4 : 3));
        why.push('🎚️ Taratura personale applicata (' + (cal>0?'+':'') + cal + ' livell' + (Math.abs(cal)>1?'i':'o') + '): ' + (cal<0 ? 'a fine seduta aveva riferito che era troppo forte.' : 'a fine seduta aveva riferito che era troppo leggera.')); }
      if(cx.aria){ S.airbag = lim(S.airbag + cx.aria, 1, Math.max(tettoA, chiedeDiPiu && cx.aria > 0 ? 4 : 3));
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
    why.push(fam === 'Z6' ? 'Relax/sonno: seduta lunga di ' + rec + ' minuti — il rilassamento profondo ha bisogno di tempo.'
      : fam === 'Z2' ? 'Recupero: 25 minuti per un defaticamento completo dei gruppi muscolari.'
      : fam === 'Z3' ? 'Leggerezza: 25 minuti — la compressione a onde dà il meglio con la durata.'
      : 'Durata di 20 minuti.');
  }

  /* ── i limiti di sicurezza, prima del confronto con ieri: nessuna regola li scavalca ── */
  if(an.caloreSensibile){ S.calore = false; why.push('Calore disattivato: sensibilità dichiarata in anamnesi.'); }
  if(soft){ S.fourD = Math.min(S.fourD, 1); S.airbag = Math.min(S.airbag, 2); why.push('Profilo soft: idoneità con certificato medico.'); }

  /* ── mai due sedute uguali di fila, e piu' varieta' possibile ──
     Con le stesse risposte le varianti adatte sono fino a sedici: il
     programma migliore o l'altro adatto, e per le rifiniture la tecnica, la
     larghezza dei rulli e l'intervallo giusti o i loro vicini, sempre dentro
     la stessa intenzione. L'ordine va dalla piu' vicina alla proposta
     migliore (un cambio solo) alla piu' lontana. Si prende la prima che il
     cliente non ha fatto nelle ultime MEMORIA sedute; se le ha fatte tutte,
     la piu' lontana nel tempo. Mai quella dell'ultima volta. Cosi', a
     risposte identiche, la stessa seduta torna solo dopo otto sedute. */
  const recenti = (inp.ultime || (inp.ultima ? [inp.ultima] : [])).map(u => u && u.firma).filter(Boolean).slice(0, MEMORIA);
  if(!prima && recenti.length){
    const tocca = (r, f) => { if(!r) return r; const o = Object.assign({}, r); f(o); return o; };
    const conTec = r => tocca(r, o => { const t = tecnicaAlt(o.tkey, q.goal); if(t){ o.tkey = t; o.tecnica = TECNICA_NOME[t]; } });
    const conLar = r => tocca(r, o => { const w = larghezzaAlt(o.wkey, q.goal); if(w){ o.wkey = w; o.larghezza = LARGHEZZA_NOME[w]; } });
    const conInt = r => tocca(r, o => { const k = intervalloAlt(o.ikey); if(k){ o.ikey = k; o.intervallo = INTERVALLO_NOME[k]; } });
    /* le combinazioni: 1 tecnica, 2 programma, 4 larghezza, 8 intervallo; prima i cambi singoli */
    const maschere = Array.from({length:16}, (_, m) => m)
      .sort((a, b) => (a.toString(2).replace(/0/g, '').length - b.toString(2).replace(/0/g, '').length) || a - b);
    const varianti = [];
    maschere.forEach(m => {
      if((m & 2) && pool.length < 2) return;
      const cambia = r => { if(m & 1) r = conTec(r); if(m & 4) r = conLar(r); if(m & 8) r = conInt(r); return r; };
      const v = {prog: m & 2 ? pool[1] : pool[0], S, manualRef: cambia(manualRef), manualBasso: cambia(manualBasso),
        altroProg: !!(m & 2), cambiaTec: !!(m & 1), cambiaLar: !!(m & 4), cambiaInt: !!(m & 8)};
      v.firma = firma(v);
      if(!varianti.some(x => x.firma === v.firma)) varianti.push(v);
    });
    const quando = f => { const i = recenti.indexOf(f); return i < 0 ? 99 : i; };
    const scelta = varianti.filter(v => v.firma !== recenti[0])
      .sort((a, b) => quando(b.firma) - quando(a.firma))[0];
    if(scelta && varianti[0].firma !== scelta.firma && recenti.includes(varianti[0].firma)){
      prog = scelta.prog; manualRef = scelta.manualRef; manualBasso = scelta.manualBasso; alternato = true;
      const rif = [scelta.manualRef, scelta.manualBasso].filter(Boolean);
      if(scelta.altroProg) why.push('🔁 Con queste risposte ha già fatto ' + pool[0] + ' di recente: oggi si alterna con ' + scelta.prog + ', adatto allo stesso obiettivo.');
      const cosa = [scelta.cambiaTec && 'la tecnica ' + rif.map(r => r.tecnica).join(' e '),
        scelta.cambiaLar && 'la larghezza ' + rif.map(r => r.larghezza).join(' e '),
        scelta.cambiaInt && 'l\'intervallo ' + rif.map(r => r.intervallo).join(' e ')].filter(Boolean);
      if(cosa.length && rif.length) why.push('🔁 Per non ripetere le ultime sedute, la rifinitura oggi cambia ' + cosa.join(', ') + ': sempre adatta allo stesso obiettivo.');
    }
  }
  /* ── gli airbag: quelli del programma, con la sua alternanza. Si spengono
     solo le zone che il cliente ha chiesto spente in una seduta passata
     (il pannello «Regola durante la seduta» le ricorda: calx.spente).
     Nella seduta solo aria le zone le sceglie il protocollo, senza quelle. */
  const memSpente = zoneSpente(cx.spente);
  let aria = scegliZoneAirbag(q, fam, an.zone);
  const spente = prog === 'P23' ? [] : memSpente;
  if(prog === 'P23' && memSpente.length){
    const ic = senzaSpente(aria.icone, memSpente);
    if(ic !== aria.icone){
      /* il motivo resta quello di sempre (il QR lo porta come numero); le zone tolte a parte */
      const senza = memSpente.filter(k => aria.icone.indexOf(k) >= 0 || aria.icone.indexOf('tutto') >= 0);
      aria = {icone: ic, perche: aria.perche, senza,
        testo: 'Zone airbag: ' + ic.map(k => ARIA_NOME[k]).join(', ') + ' — ' + aria.perche
          + (senza.length ? ', senza ' + elenco(senza.map(k => '«' + ARIA_NOME[k] + '»')) + ' (le vuole spente)' : '') + '.'};
    }
  }
  if(manualRef || manualBasso){
    const rif = manualRef && manualBasso
      ? 'alta su ' + manualRef.zona + ' con ' + manualRef.tecnica + ' a 8 minuti dalla fine, poi anche bassa su ' + manualBasso.zona + ' con ' + manualBasso.tecnica + ' a 5 minuti dalla fine: lavorano insieme'
      : (manualRef ? 'alta su ' + manualRef.zona + ' con ' + manualRef.tecnica : 'bassa su ' + manualBasso.zona + ' con ' + manualBasso.tecnica) + ' negli ultimi 8 minuti';
    const ri = riattivaDopo({prog, S, aria, spente});
    why.push('✋ Rifinitura ' + rif + ', e una volta accese non si spengono fino alla fine. '
      + (ri.niente ? 'Dopo, non si riaccende niente: ' + ri.perche + '.'
                   : 'Dopo, si riaccendono ' + ri.voci.filter(v => v.k !== 'zerog').map(v => v.k === 'aria' ? 'gli airbag' : v.nome).join(', ') + ': la rifinitura li stacca.'));
  }
  if(prog === 'P23') why.push('💨 ' + aria.testo);
  else if(spente.length) why.push('💨 Airbag del programma, con la sua alternanza, ma spenti su ' + elenco(spente.map(k => '«' + ARIA_NOME[k] + '»'))
    + ': in una seduta passata il cliente ha chiesto di spegnerli lì.');
  const zCode = fam + '·' + prog + '·D' + S.fourD + 'A' + S.airbag + (S.ioni ? 'I' : '') + (S.calore ? 'C' : '') + (S.zerog ? 'G' : '');
  /* la variante del nome: cambia con ogni risposta, e non ripete un nome
     che il cliente ha avuto nelle ultime sedute (vedi varianteDa) */
  const variante = varianteDa(q, prog, S, prog === 'P23' ? aria.icone : null,
    (inp.ultime || []).map(u => u && u.nome).filter(Boolean).slice(0, MEMORIA), spente);
  const out = {prog, fam, S, why, zCode, manualRef, manualBasso, soloAria, soloAriaConflitto, aria, spente, pool, alternato, variante};
  out.firma = firma(out);
  return out;
}

/* ══ LA VARIANTE DEL NOME (v175) ══
   Il cliente deve vedere il nome cambiare a OGNI risposta che tocca, anche
   quando la risposta non cambia nessun valore della capsula (l'umore, una
   zona in piu'...). Il nome ha uno spazio libero: quello che fino alla v172
   diceva le zone degli airbag, e che dalla v173 non serve piu' (gli airbag
   sono quelli del programma). Li' va la VARIANTE, un numero da 0 a 17 che
   viene dalle risposte. Nella seduta solo aria (P23) quello spazio dice
   ancora le zone accese, e la variante va al posto della 4D (da 0 a 6),
   che senza rulli resta sempre ferma.
   Ogni risposta pesa: attivita', giornata, obiettivo, umore, pressione e
   una per ogni zona; «tutto il corpo» pesa 9. Cambiando UNA risposta la
   somma cambia di 1-10, mai di un multiplo di 18: il nome cambia sempre.
   Se il nome che ne esce e' fra quelli delle ultime sedute del cliente, la
   variante va avanti di un passo, finche' ne trova uno nuovo: con le
   stesse risposte, la volta dopo nasce un nome diverso. */
const VAR_N = 18, VAR_N23 = 7;
const V_ATT = ['ems','ems2','vacufit','matrix','riposo'], V_OBI = ['recupero','sollievo','drenaggio','relax','sonno','energia'];
const V_UMO = ['sereno','stanco','stressato','dolorante','carico'], V_PRE = ['dolce','media','decisa','abituale'];
const V_ZONE = ['cervicale','spalle','braccia','dorsale','lombare','glutei','gambe','piedi'];
function sommaRisposte(q){
  q = q || {};
  const pos = (l, v) => l.indexOf(v) + 1;      /* 0 se manca */
  const zone = V_ZONE.filter(z => (q.zones || []).indexOf(z) >= 0).length;
  const totale = q.zmode === 'totale' || (!(q.zones || []).length && q.zone === 'totale');
  return pos(V_ATT, q.activity) + (q.activity === 'riposo' ? pos(GIORNATE, q.giornata) : 0)
    + pos(V_OBI, q.goal) + pos(V_UMO, q.mood) + pos(V_PRE, q.pressione) + zone + (totale ? 9 : 0);
}
function varianteDa(q, prog, S, zone, recenti, spente){
  const p23 = prog === 'P23', N = p23 ? VAR_N23 : VAR_N, passo = p23 ? 3 : 5;
  const v0 = sommaRisposte(q) % N;
  for(let i = 0; i < N; i++){
    const v = (v0 + i * passo) % N;
    if(!recenti || recenti.indexOf(nomeProtocollo(prog, S, zone, varianteNome(prog, v, spente))) < 0) return v;
  }
  return v0;
}
/* ══ GLI AIRBAG NEL NOME (v176) ══
   Scegliendo o escludendo una zona degli airbag il nome cambia: alla
   variante si aggiungono le zone spente, ognuna col suo peso (spalle 1,
   braccia 2, vita 4, gambe 8). Due scelte diverse danno sempre una somma
   diversa (da 0 a 15, meno di 18): il nome cambia sempre. Nella solo aria
   le zone sono gia' nel nome, e qui non si aggiunge niente.
   variante: quella delle risposte (puo' mancare nelle sedute di prima) */
function pesoSpente(spente){ return zoneSpente(spente).reduce((m, k) => m | (1 << ZONE_SPEGNIBILI.indexOf(k)), 0); }
function varianteNome(prog, variante, spente){
  if(prog === 'P23') return variante;
  const m = pesoSpente(spente), conV = typeof variante === 'number' && isFinite(variante);
  if(!m) return conV ? variante : undefined;
  return ((conV ? variante : 0) + m) % VAR_N;
}
/* la variante delle risposte, dal nome e dalle zone spente: il contrario di varianteNome */
function varianteDaNome(prog, vNome, spente){
  if(prog === 'P23' || typeof vNome !== 'number') return vNome;
  return ((vNome - pesoSpente(spente)) % VAR_N + VAR_N) % VAR_N;
}
/* il nome di un protocollo, con le sue zone spente */
function nomeDi(p, zone){
  if(!p) return '';
  return nomeProtocollo(p.prog, p.S, p.prog === 'P23' ? zone : null, varianteNome(p.prog, p.variante, p.spente));
}

/* ══ IL NOME DEL PROTOCOLLO ══
   «Gently Rub Soothing» e' la CATEGORIA: il programma che si tocca sul
   touchscreen, e resta quello. Il NOME del protocollo invece cambia con
   le regolazioni, cosi' il cliente non legge sempre la stessa cosa: tre
   parole inglesi, le prime due da due elenchi comuni, la terza
   dall'elenco della sua categoria.
   Ogni combinazione dei parametri principali ha il suo nome, e ogni nome
   una combinazione sola: 4D (0-6), forza airbag (0-6), ioni, calore,
   zero gravity, Leg Kneading, Foot Roller e le zone degli airbag (18
   casi: quelle del programma, corpo intero, o una scelta fra spalle,
   braccia, vita e gambe). Sono 7·7·2·2·2·2·2·18 = 28.224 combinazioni
   per categoria, tante quanti i nomi 84·84·4: nessun nome avanza e
   nessuno si ripete. Dal nome si torna ai parametri (daNome): e' cosi'
   che si recupera una seduta persa scrivendo solo il nome.
   Come nei 20,3 milioni, la durata non conta; le rifiniture neanche.
   Dalla v175 lo spazio delle zone (18 casi) e' la VARIANTE: ogni
   combinazione di valori ha 18 nomi, e le risposte scelgono quale (vedi
   varianteDa). Dal nome si torna sempre ai valori e alla variante, e
   ritorna lo stesso nome: anche quelli dati prima.
   Il numero della combinazione passa per un mescolamento fisso (sempre lo
   stesso, su ogni dispositivo): cambiando un solo parametro cambiano
   tutte e tre le parole. Il seme NON si cambia mai: cambierebbero tutti
   i nomi, anche quelli delle sedute gia' fatte. */
const NOME_A = ['Amber','Velvet','Silver','Golden','Ivory','Pearl','Coral','Indigo','Opal','Jade',
  'Emerald','Sapphire','Crystal','Copper','Bronze','Marble','Satin','Silk','Cashmere','Linen',
  'Honey','Saffron','Lavender','Rose','Sage','Cedar','Vanilla','Ruby','Topaz','Azure',
  'Cobalt','Lilac','Platinum','Onyx','Silent','Maple','Serene','Tranquil','Radiant','Mellow',
  'Tender','Quiet','Olive','Turquoise','Calm','Teal','Pure','Clear','Bright','Hidden',
  'Ancient','Still','Birch','Rising','Flowing','Dreaming','Morning','Evening','Midnight','Northern',
  'Southern','Eastern','Western','Royal','Noble','Sacred','Secret','Lunar','Solar','Misty',
  'Distant','Endless','Eternal','Timeless','Blissful','Peaceful','Graceful','Mystic','Celestial','Starlit',
  'Moonlit','Sunlit','Gilded','Luminous'];
const NOME_B = ['Harbor','Dune','Meadow','Tide','Ember','Horizon','Lagoon','Valley','River','Ocean',
  'Forest','Garden','Island','Cove','Bay','Shore','Cliff','Canyon','Glacier','Summit',
  'Prairie','Orchard','Grove','Willow','Breeze','Cloud','Moon','Star','Dawn','Dusk',
  'Aurora','Ripple','Wave','Stream','Rain','Mist','Petal','Feather','Pebble','Fern',
  'Moss','Lake','Fjord','Delta','Oasis','Reef','Lantern','Candle','Hearth','Haven',
  'Pavilion','Terrace','Courtyard','Villa','Cabin','Chalet','Lighthouse','Bridge','Trail','Ridge',
  'Plateau','Savanna','Blossom','Magnolia','Jasmine','Gardenia','Camellia','Peony','Iris','Sky',
  'Rainbow','Comet','Galaxy','Nebula','Solstice','Equinox','Season','Waterfall','Fountain','Spring',
  'Glade','Brook','Cascade','Sunrise'];
/* la terza parola dice la categoria: quattro per ognuna, scelte sul suo carattere */
const NOME_C = {
  P01:['Balance','Harmony','Equilibrium','Wholeness'],      /* Health Mode: completo ed equilibrato */
  P02:['Grace','Elegance','Radiance','Allure'],             /* Queen Bodycare */
  P03:['Uplift','Lightness','Freedom','Poise'],             /* Shoulder Care */
  P04:['Release','Unwinding','Restoration','Alignment'],    /* Back Relieve */
  P05:['Contour','Sculpt','Core','Curve'],                  /* Buttock & Waist */
  P06:['Stretch','Unfolding','Expansion','Suppleness'],     /* Muscle Relax: l'allungamento */
  P07:['Remedy','Mending','Revival','Recovery'],            /* Soreness Improvement */
  P08:['Stride','Footstep','Wanderer','Pathway'],           /* Leg & Foot Relief */
  P09:['Crest','Ascent','Pinnacle','Apex'],                 /* Upper Body */
  P10:['Roots','Grounding','Foundation','Anchor'],          /* Lower Body */
  P11:['Meridian','Lotus','Bamboo','Zen'],                  /* TCM Massage */
  P12:['Siam','Orchid','Temple','Monsoon'],                 /* Thai SPA */
  P13:['Escape','Respite','Downtime','Reset'],              /* White-collar */
  P14:['Signature','Masterpiece','Heritage','Legacy'],      /* Master Classic */
  P15:['Awakening','Spark','Vigor','Zest'],                 /* Fresh Morning */
  P16:['Interlude','Recharge','Breather','Siesta'],         /* Lunch Break */
  P17:['Hammock','Cradle','Sway','Swing'],                  /* Shake Sleeping: il dondolio */
  P18:['Slumber','Nocturne','Lullaby','Dreamland'],         /* Sleep Aid at Night */
  P19:['Clarity','Focus','Composure','Mastery'],            /* CEO Fitness */
  P20:['Journey','Voyage','Odyssey','Milestone'],           /* Long-term Driving */
  P21:['Cooldown','Rebound','Refuel','Triumph'],            /* Exercise Recovery */
  P22:['Caress','Whisper','Embrace','Comfort'],             /* Gently Rub Soothing */
  P23:['Breath','Cushion','Billow','Zephyr'],               /* Airbag Massage: solo aria */
  P24:['Bespoke','Atelier','Couture','Tailormade']};        /* Customised */
const NOME_PROG = Object.keys(NOME_C);
const ZONE_ARIA = ['spalle','braccia','vita','gambe'];
const NOME_TOT = 7 * 7 * 32 * 18;   /* 28.224 = 84 · 84 · 4 */
const nomeScarto = prog => (NOME_PROG.indexOf(prog) * 2357) % NOME_TOT;
/* il mescolamento: una permutazione fissa dei 28.224 numeri, e la sua inversa */
let NOME_MIX = null, NOME_DEMIX = null;
function nomeMix(){
  if(NOME_MIX) return;
  NOME_MIX = new Int32Array(NOME_TOT); NOME_DEMIX = new Int32Array(NOME_TOT);
  for(let i = 0; i < NOME_TOT; i++) NOME_MIX[i] = i;
  let s = 0x5EED2026;
  const caso = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for(let i = NOME_TOT - 1; i > 0; i--){ const j = Math.floor(caso() * (i + 1)); const t = NOME_MIX[i]; NOME_MIX[i] = NOME_MIX[j]; NOME_MIX[j] = t; }
  for(let i = 0; i < NOME_TOT; i++) NOME_DEMIX[NOME_MIX[i]] = i;
}
/* le zone degli airbag in un numero: 0 quelle del programma (nessuna scelta),
   1 corpo intero, 2-17 una scelta fra spalle, braccia, vita e gambe */
function zonaStato(z){
  if(!z) return 0;
  if(z.indexOf('tutto') >= 0) return 1;
  let m = 0; ZONE_ARIA.forEach((k, i) => { if(z.indexOf(k) >= 0) m |= 1 << i; });
  return 2 + m;
}
function statoZona(n){ return n === 0 ? null : n === 1 ? ['tutto'] : ZONE_ARIA.filter((k, i) => (n - 2) & (1 << i)); }
/* zone: l'elenco delle icone accese (null = quelle del programma).
   variante (dalla v175, facoltativa): nelle sedute coi rulli prende il posto
   delle zone (0-17); nella solo aria (P23) quello della 4D (0-6). Senza
   variante il nome e' quello di sempre: i nomi gia' dati non cambiano */
function nomeProtocollo(prog, S, zone, variante){
  const C = NOME_C[prog]; if(!C) return '';
  S = S || {};
  const v7 = x => lim(Math.round(+x || 0), 0, 6);
  const conV = typeof variante === 'number' && isFinite(variante), mod = (v, n) => ((Math.round(v) % n) + n) % n;
  const p23 = prog === 'P23';
  let k = (p23 && conV ? mod(variante, VAR_N23) : v7(S.fourD)) * 7 + v7(S.airbag);
  [S.ioni, S.calore, S.zerog, S.polpacci, S.plantari].forEach(b => { k = k * 2 + (b ? 1 : 0); });
  k = k * 18 + (!p23 && conV ? mod(variante, VAR_N) : zonaStato(zone));
  nomeMix();
  let x = NOME_MIX[(k + nomeScarto(prog)) % NOME_TOT];
  const c = x % 4; x = (x - c) / 4;
  const a = x % 84;
  return NOME_A[a] + ' ' + NOME_B[(x - a) / 84] + ' ' + C[c];
}
/* dal nome ai parametri: le maiuscole, le virgolette e i trattini non contano */
function daNome(testo){
  const p = String(testo || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z]+/g, ' ').trim().split(' ');
  if(p.length !== 3) return null;
  const trova = (l, w) => l.findIndex(x => x.toLowerCase() === w);
  const a = trova(NOME_A, p[0]), b = trova(NOME_B, p[1]);
  const prog = NOME_PROG.find(pg => trova(NOME_C[pg], p[2]) >= 0);
  if(a < 0 || b < 0 || !prog) return null;
  const x = (b * 84 + a) * 4 + trova(NOME_C[prog], p[2]);
  nomeMix();
  let k = (NOME_DEMIX[x] - nomeScarto(prog) + NOME_TOT) % NOME_TOT;
  const z = k % 18; k = (k - z) / 18;
  const bit = []; for(let i = 0; i < 5; i++){ bit.unshift(k % 2); k = (k - k % 2) / 2; }
  const A = k % 7, d = (k - A) / 7;
  const S = {fourD:d, airbag:A, ioni:!!bit[0], calore:!!bit[1], zerog:!!bit[2], polpacci:bit[3], plantari:bit[4]};
  /* dalla v175 lo spazio delle zone, nelle sedute coi rulli, e' la variante
     (anche nei nomi di prima: il nome resta identico); nella solo aria la
     variante e' al posto della 4D, che senza rulli e' ferma */
  if(prog === 'P23'){ S.fourD = 0; const zone = statoZona(z); return {prog, S, zone, variante:d, nome: nomeProtocollo(prog, S, zone, d)}; }
  return {prog, S, zone:null, variante:z, nome: nomeProtocollo(prog, S, null, z)};
}

G.MOTORE = {motoreZenith, firma, ultimeDa, riattivaDopo, scalaCapsula, idoneitaDa, macroDa, scegliZoneAirbag, ARIA_NOME,
  zoneSpente, senzaSpente, zoneDaRiaccendere, ZONE_SPEGNIBILI, elenco,
  TECNICA_NOME, LARGHEZZA_NOME, INTERVALLO_NOME, ZONA_RIF, GIORNATE,
  nomeProtocollo, daNome, NOME_A, NOME_B, NOME_C, NOME_TOT, MEMORIA, zonaStato, sommaRisposte, varianteDa, VAR_N, VAR_N23,
  varianteNome, varianteDaNome, pesoSpente, nomeDi};
})(typeof window !== 'undefined' ? window : globalThis);
