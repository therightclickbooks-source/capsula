/* ═══════════════════════════════════════════════════════════════
   IL TIMER DELLA SEDUTA
   Tre cose da garantire:
     1. l'ordine dei passi: lo Zero Gravity e' l'ULTIMO passo di impostazione,
        da solo, mai fra i parametri; gli extra restano in fondo;
     2. i minuti: regola unica in proporzione alla durata (su 20′: 8→13 e
        14→18) e i bip suonano al secondo giusto — leggero 10″ prima, bip
        all'inizio, bip doppio alla fine, tre note a fine seduta;
     3. il timer vive fuori dalle schermate: sopravvive a un ricaricamento,
        tiene lo schermo acceso, sta nella cornice su ogni schermo.
   L'orologio e' finto (TM_NOW): si fanno passare venti minuti in un attimo.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, Taccuino } = require('./aiuto');

function archivio(){
  const anamnesi = {certificatoOk:false};
  ['a1','a2','a3','a4','a5','a6','b1','b2','b3','b4','b5','b6','b7','b8','b9'].forEach(k=> anamnesi[k] = false);
  return {codeHash:'x', codeLen:4,
    clients:[{id:'c1', nome:'Giulia', cognome:'Prova', telefono:'3330000000', anamnesi, cal:0, calTuned:false}],
    sessions:[{id:'s0', clientId:'c1', date:'2026-01-01T10:00:00.000Z'}],
    operators:[{id:'o1', nome:'Raffaele'}], checkins:[]};
}

module.exports = async function(browser){
  const tac = new Taccuino('il timer della seduta');
  const p = await browser.newPage({viewport:{width:430, height:900}});
  p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
  await p.addInitScript(d => {
    try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){}
    window.__lock = {richieste:0, rilasci:0};
    Object.defineProperty(navigator, 'wakeLock', {configurable:true, value:{request: async () => { window.__lock.richieste++;
      return {release: async () => { window.__lock.rilasci++; }, addEventListener(){}}; }}});
  }, archivio());
  await p.goto(GESTIONALE);
  await p.waitForTimeout(600);

  /* ── 1 · l'ordine dei passi ── */
  const ordine = await p.evaluate(() => {
    const out = {zg:0, senza:0, male:[], extraInFondo:0, esempi:0};
    for(const goal of ['recupero','sollievo','drenaggio','relax','sonno','energia'])
      for(const zones of [[],['gambe'],['lombare'],['cervicale','spalle'],['lombare','gambe']])
        for(const activity of ['ems','riposo','vacufit']){
          const prot = buildProtocol(DB.clients[0], {activity, goal, zones, pressione:'media', mood:'sereno', prefSoloAria:false});
          prot.quizZones = zones;
          const st = buildSteps(prot), tit = st.map(s => s.title);
          const z = tit.findIndex(t => /Zero Gravity/.test(t));
          const par = tit.findIndex(t => /Regola i parametri/.test(t));
          const parTxt = st[par].markers.map(m => m.label).join(' ');
          if(/Zero Gravity/.test(parTxt)) out.male.push('zero gravity ancora fra i parametri: ' + prot.prog);
          const fine = tit.findIndex(t => /A fine seduta/.test(t));
          if(prot.S.zerog){
            out.zg++;
            const aria = tit.findIndex(t => /zon[ae] degli airbag/.test(t));
            const ult = st.map((s,i) => [s,i]).filter(([s]) => s.kind !== 'extra' && !/A fine seduta/.test(s.title)).pop()[1];
            if(z !== ult) out.male.push('zero gravity non e\' l\'ultimo passo: ' + tit.join(' | '));
            if(aria >= 0 && aria > z) out.male.push('airbag dopo lo zero gravity');
            if(st[z].markers.length !== 1) out.male.push('lo zero gravity deve avere un solo tasto');
            if(st.filter(s => s.markers.some(m => m.pos === TILE.auto.ZEROG)).length !== 1) out.male.push('il tasto Zero Gravity compare piu\' di una volta');
          } else { out.senza++; if(z >= 0) out.male.push('passo zero gravity con zero gravity spento'); }
          const primoExtra = st.findIndex(s => s.kind === 'extra');
          if(primoExtra >= 0){ out.extraInFondo++; if(!(primoExtra > z && primoExtra < fine)) out.male.push('extra fuori posto: ' + tit.join(' | ')); }
        }
    return out;
  });
  tac.t('lo Zero Gravity e\' l\'ultimo passo di impostazione, da solo, mai fra i parametri',
    !ordine.male.length && ordine.zg > 0 && ordine.senza > 0, JSON.stringify(ordine.male.slice(0,2)) + ' zg=' + ordine.zg + ' senza=' + ordine.senza);
  tac.t('gli extra restano in fondo, dopo lo Zero Gravity e prima della domanda finale', ordine.extraInFondo > 0 && !ordine.male.length, 'extra=' + ordine.extraInFondo);

  /* ── 2 · i minuti ── */
  const minuti = await p.evaluate(() => {
    const r = {};
    for(const T of [15,20,25,30]){
      const pi = pianoSeduta({S:{timer:T}, manualRef:{zona:'x'}, manualBasso:{zona:'y'}});
      r[T] = pi.eventi.map(e => e.a + '-' + e.b).join(' ');
    }
    return r;
  });
  /* le rifiniture stanno alla fine perche' una volta accese non si spengono piu' (provato in capsula):
     l'alta a 8 minuti dalla fine, la bassa a 5, e lavorano insieme fino alla fine */
  tac.t('su 20 minuti: alta dal minuto 12, bassa dal 15, tutte e due fino alla fine', minuti[20] === '12-20 15-20', JSON.stringify(minuti));
  tac.t('con 25 e 30 minuti: sempre 8 e 5 minuti dalla fine', minuti[25] === '17-25 20-25' && minuti[30] === '22-30 25-30', JSON.stringify(minuti));
  const una = await p.evaluate(() => [20,25,30].map(T => pianoSeduta({S:{timer:T}, manualRef:{zona:'x'}}).eventi.map(e => e.a + '-' + e.b).join(' ')).join(' | ')
    + ' / ' + pianoSeduta({S:{timer:20}, manualBasso:{zona:'y'}}).eventi.map(e => e.a + '-' + e.b).join(' '));
  tac.t('una rifinitura sola, alta o bassa, parte a 8 minuti dalla fine', una === '12-20 | 17-25 | 22-30 / 12-20', una);

  /* una seduta con zero gravity e tutte e due le rifiniture: collo (alta) e lombare (bassa) */
  const prot = await p.evaluate(() => {
    const zones = ['cervicale','lombare'];
    const pr = buildProtocol(DB.clients[0], {activity:'riposo', giornata:'tranquilla', goal:'sollievo', zones, pressione:'media', mood:'sereno', prefSoloAria:false}, {senzaVarieta:true});
    pr.quizZones = zones;
    if(!(pr.manualRef && pr.manualBasso && pr.S.zerog && pr.S.timer === 20)) return null;
    return {hash: codificaSeduta(pr, 'Giulia', zones), ok: !!decodificaSeduta(codificaSeduta(pr, 'Giulia', zones)).manualBasso};
  });
  tac.t('esiste una seduta con zero gravity e tutte e due le rifiniture su cui provare', !!prot && prot.ok, JSON.stringify(prot));
  if(!prot){ await p.close(); return tac; }

  /* ── il flusso vero, come sul telefono: si apre il link del QR ── */
  await p.goto(GESTIONALE + '#s=' + prot.hash); await p.waitForTimeout(700);
  const prima = await p.evaluate(() => ({go: !!document.querySelector('.tmgo-b'), barra: !!document.querySelector('#tmr.bar'),
    passo: (document.querySelector('.tmgo-b').closest('.gstep').querySelector('.gt') || {}).textContent, quanti: document.querySelectorAll('.tmgo-b').length,
    chip: Array.from(document.querySelectorAll('.tmchip')).map(c => c.textContent)}));
  tac.t('sul telefono il tasto «Avvia il timer» sta nel passo della Pausa, una volta sola', prima.go && !prima.barra && prima.quanti === 1 && /pausa e avvia il timer/.test(prima.passo) && !/Timing/.test(prima.passo), JSON.stringify(prima));
  tac.t('al massimo due sezioni extra: le due rifiniture, con i loro minuti scritti',
    prima.chip.join('|') === 'dal minuto 12 alla fine|dal minuto 15 alla fine', JSON.stringify(prima.chip));
  /* dentro i passi: i tasti per riaccendere Leg Kneading e Foot Roller, e le zone degli airbag */
  const passi = await p.evaluate(() => Array.from(document.querySelectorAll('.gstep')).filter(g => /Rifinitura|riaccendi gli airbag/.test(g.querySelector('.gt').textContent))
    .map(g => ({t: g.querySelector('.gt').textContent, leg: /Riaccendi “Leg Kneading”/.test(g.textContent), foot: /Riaccendi “Foot Roller”/.test(g.textContent),
      aria: Array.from(g.querySelectorAll('.rianote')).some(x => /Gli airbag:/.test(x.textContent) && /forza resta/.test(x.textContent)),
      id: g.id, nota: (g.querySelector('.rianote') || {}).textContent || ''})));
  tac.t('ogni rifinitura dice di riaccendere Leg Kneading, Foot Roller e, dentro la stessa sezione, le zone degli airbag',
    passi.length === 2 && passi.every(x => x.leg && x.foot && x.aria) && passi[0].id === 'rif-ref' && passi[1].id === 'rif-bas'
    && /stacca gli airbag/.test(passi[0].nota) && /di nuovo/.test(passi[1].nota), JSON.stringify(passi));

  /* orologio finto: parte da zero e si avanza a mano */
  await p.evaluate(() => { window.__t = 1000000; TM_NOW = () => window.__t; });
  await p.evaluate(() => document.querySelector('.tmgo-b').click());
  await p.waitForTimeout(100);
  const via = await p.evaluate(() => ({barra: !!document.querySelector('#tmr.bar'), t: document.getElementById('tm-time').textContent,
    tasto: getComputedStyle(document.querySelector('.tmgo-b')).display, lock: window.__lock.richieste,
    tmh: document.documentElement.style.getPropertyValue('--tmh')}));
  tac.t('premuto «Avvia» compare la barra del timer con 20:00', via.barra && via.t === '20:00', JSON.stringify(via));
  tac.t('il tasto Avvia sparisce e resta «Timer in corso»', via.tasto === 'none', JSON.stringify(via));

  /* «Vai alla rifinitura»: dal timer al passo nel protocollo, che batte una volta */
  const vai = await p.evaluate(async () => {
    const t = document.querySelector('#tmr [data-act="vai"]');
    if(!t) return {tasto:false};
    t.click(); await new Promise(r => setTimeout(r, 150));
    const el = document.getElementById(t.getAttribute('data-ev') === 'bas' ? 'rif-bas' : 'rif-ref');
    return {tasto:true, ev:t.getAttribute('data-ev'), battito: !!el && el.classList.contains('battito')};
  });
  tac.t('dal timer «Vai alla rifinitura» porta al passo della rifinitura, che batte una volta', vai.tasto && vai.ev === 'ref' && vai.battito, JSON.stringify(vai));
  tac.t('lo schermo viene tenuto acceso', via.lock === 1, JSON.stringify(via));
  tac.t('la barra riserva il suo spazio alla barra in alto (non la copre)', parseInt(via.tmh) > 40, JSON.stringify(via));

  /* scorrendo la pagina in basso la barra resta in cima e la barra del titolo le sta sotto */
  const scorri = await p.evaluate(async () => {
    window.scrollTo(0, 2500); await new Promise(r => setTimeout(r, 400));
    const bar = document.getElementById('tmr').getBoundingClientRect();
    const top = document.querySelector('.topbar');
    const tb = top ? top.getBoundingClientRect() : null;
    const r = {y: Math.round(scrollY), barTop: Math.round(bar.top), barBottom: Math.round(bar.bottom), tbTop: tb ? Math.round(tb.top) : null, nascosta: document.body.classList.contains('tb-via') || document.documentElement.classList.contains('tb-via') || !!(top && top.closest('.tb-via'))};
    window.scrollTo(0, 0); return r;
  });
  tac.t('scorrendo la pagina in basso il timer resta sempre in cima, e la barra del titolo non lo copre',
    scorri.y > 500 && scorri.barTop === 0 && (scorri.tbTop === null || scorri.tbTop >= scorri.barBottom - 1 || scorri.nascosta), JSON.stringify(scorri));

  /* venti minuti, un secondo alla volta: quando suona cosa? */
  const giro = await p.evaluate(() => {
    const quando = []; let n = TM.log.length;
    for(let s = 1; s <= 1205; s++){
      window.__t += 1000; tmTick();
      while(n < TM.log.length){ quando.push(TM.log[n] + '@' + s); n++; }
    }
    return {quando, fine: TM.fine, stato: tmStato(tmEl()).fase};
  });
  /* alta al 12, bassa al 15, tutte e due fino alla fine: nessuno «spegni». Senza «Fatto» la musica torna dopo 20″ e 40″ */
  const atteso = ['rifpre@710','rif@720','rif@740','rif@760','rifpre@890','rif@900','rif@920','rif@940','fine@1200'];
  tac.t('i suoni al secondo giusto: campanella 10″ prima, musica delle rifiniture al minuto esatto (ripetuta se nessuno conferma), fine seduta',
    JSON.stringify(giro.quando) === JSON.stringify(atteso), JSON.stringify(giro.quando));
  tac.t('a 20 minuti il timer e\' finito e lo schermo viene rilasciato', giro.fine && giro.stato === 'fine', JSON.stringify(giro));
  const rilascio = await p.evaluate(() => window.__lock);
  tac.t('lo schermo torna libero a fine seduta', rilascio.rilasci >= 1, JSON.stringify(rilascio));

  /* finita la seduta: resta «seduta finita» qualche secondo, poi si sgretola e sparisce da sola, ovunque */
  const addio = await p.evaluate(async () => {
    const r = {}; r.finito = !!TM && TM.fine; r.pezziPrima = document.querySelectorAll('.tm-pz').length; r.barra = !!document.querySelector('#tmr.bar');
    window.__t += 20000; tmTick();
    r.sgretola = !!document.querySelector('#tmr.sgr'); r.pezzi = document.querySelectorAll('.tm-pz').length;
    await new Promise(x => setTimeout(x, 2600));
    r.tolto = TM === null && document.getElementById('tmr').innerHTML === '' && localStorage.getItem('zfl_timer') === null;
    return r;
  });
  tac.t('finita la seduta il timer si sgretola e sparisce da solo, senza restare in giro', addio.finito && addio.pezziPrima === 0 && addio.sgretola && addio.pezzi > 20 && addio.tolto, JSON.stringify(addio));

  /* un timer vecchio (altra seduta) non deve mai restare al posto di quello nuovo */
  const vecchio = await p.evaluate(() => {
    timerChiudi();
    const mk = (goal, zones, act) => { const pr = buildProtocol(DB.clients[0], {activity:act, goal, zones, pressione:'media', mood:'sereno', prefSoloAria:false}); pr.quizZones = zones; return pr; };
    const A = mk('recupero', [], 'ems'); A.S.timer = 25; const B = mk('sollievo', ['lombare'], 'riposo');
    const v = VIEW; VIEW = {name:'setupqr', prot:A}; timerAvvia(); const prima = {dur:TM.dur, ev:TM.eventi.length};
    VIEW = {name:'setupqr', prot:B}; timerAvvia(); const dopo = {dur:TM.dur, ev:TM.eventi.length, titolo:TM.info.titolo};
    const t0 = TM; timerAvvia(); const stesso = TM === t0;   /* stessa seduta: non riparte */
    const barra = document.querySelector('#tmr .tm-who2'); const r = {prima, dopo, stesso, chi: barra ? barra.textContent : ''};
    VIEW = v; timerChiudi(); return r;
  });
  tac.t('premendo Avvia con un timer vecchio acceso, parte quello della seduta di adesso (20′, con la rifinitura)',
    vecchio.prima.dur === 25 && vecchio.prima.ev === 0 && vecchio.dopo.dur === 20 && vecchio.dopo.ev === 1 && vecchio.stesso, JSON.stringify(vecchio));
  tac.t('la barra dice di quale programma e\' il timer', /“/.test(vecchio.chi), JSON.stringify(vecchio));

  /* l'avviso di una rifinitura resta finche' non si tocca «Fatto», e apre il timer a tutto schermo */
  const fasi = await p.evaluate(() => {
    timerChiudi(); window.__t = 5000000; timerAvvia();
    const r = {};
    const vai = s => { window.__t = 5000000 + s*1000; tmTick(); return tmStato(tmEl()); };
    const box = () => document.getElementById('tmr');
    r.s100 = vai(100).fase; r.s705 = vai(705).fase; r.s715 = vai(715).fase; r.sec = Math.ceil(tmStato(tmEl()).sec);
    r.oroPre = box().classList.contains('rif');
    r.s721 = vai(721).fase; r.full721 = box().classList.contains('full'); r.testo721 = (box().querySelector('.tm-rt') || {}).textContent;
    r.s800 = vai(800).fase;   /* nessuno ha toccato «Fatto»: l'avviso e' ancora li' */
    timerFatto(); r.dopoFatto = tmStato(tmEl()).fase; r.fullDopo = box().classList.contains('full');
    r.s880 = vai(880).fase; r.s895 = vai(895).fase; r.s901 = vai(901).fase; r.testo901 = (box().querySelector('.tm-rt') || {}).textContent;
    r.insieme = (box().querySelector('.tm-rs') || {}).textContent;
    timerFatto(); r.dopoFatto2 = tmStato(tmEl()).fase; r.chi = (box().querySelector('.tm-mt') || {}).textContent;
    r.s1195 = vai(1195).fase;
    return r;
  });
  tac.t('le fasi: attesa → preavviso (10″) → ACCENDI alta → resta finché «Fatto» → in corso → preavviso bassa → ACCENDI ANCHE la bassa → in corso insieme fino alla fine',
    fasi.s100 === 'attesa' && fasi.s705 === 'attesa' && fasi.s715 === 'pre' && fasi.sec === 5 && fasi.s721 === 'attiva' && fasi.s800 === 'attiva' && fasi.dopoFatto === 'corso'
    && fasi.s880 === 'corso' && fasi.s895 === 'pre' && fasi.s901 === 'attiva' && fasi.dopoFatto2 === 'corso' && fasi.s1195 === 'corso', JSON.stringify(fasi));
  tac.t('al minuto della rifinitura il timer diventa oro e si apre a tutto schermo; con «Fatto» torna com\'era',
    fasi.oroPre && fasi.full721 && /ACCENDI LA RIFINITURA ALTA/.test(fasi.testo721) && !fasi.fullDopo, JSON.stringify(fasi));
  tac.t('al minuto 15 «accendi anche la bassa»: l\'alta continua e lavorano insieme',
    /ACCENDI ANCHE LA RIFINITURA BASSA/.test(fasi.testo901) && /continua/.test(fasi.insieme) && /alta \+ bassa/.test(fasi.chi), JSON.stringify(fasi));

  /* «Cosa riaccendo?»: l'elenco si apre, ogni riga si spunta */
  const ria = await p.evaluate(() => {
    timerChiudi(); window.__t = 6000000; timerAvvia();
    window.__t = 6000000 + 721*1000; tmTick();
    const box = document.getElementById('tmr'), r = {};
    const tasto = box.querySelector('[data-act="riatt"]'); r.tasto = tasto ? tasto.textContent : '';
    tasto.click();
    r.righe = Array.from(box.querySelectorAll('.tm-rv')).map(x => x.querySelector('b').textContent);
    box.querySelector('.tm-rv[data-k$=":leg"]').click();
    r.spuntata = !!box.querySelector('.tm-rv.ok[data-k$=":leg"]'); r.conto = (box.querySelector('.tm-n') || {}).textContent;
    r.salvata = /leg/.test(localStorage.getItem('zfl_timer'));
    timerChiudi(); return r;
  });
  tac.t('«Cosa riaccendo?» elenca Leg Kneading, Foot Roller, gli airbag con la forza e lo Zero Gravity; le righe si spuntano',
    /Cosa riaccendo\?/.test(ria.tasto) && ria.righe.length === 4 && /Leg Kneading/.test(ria.righe[0]) && /Foot Roller/.test(ria.righe[1]) && /Airbag · forza/.test(ria.righe[2]) && /Zero Gravity/.test(ria.righe[3])
    && ria.spuntata && ria.conto === '1/4' && ria.salvata, JSON.stringify(ria));

  /* pausa: il tempo non corre; ripresa: riparte da dove era */
  const pausa = await p.evaluate(() => {
    timerChiudi(); window.__t = 9000000; timerAvvia();
    window.__t += 100000; tmTick(); const a = tmEl();
    timerPausa(); window.__t += 500000; tmTick(); const b = tmEl();
    timerPausa(); window.__t += 20000; tmTick(); const c = tmEl();
    return {a, b, c, richieste: window.__lock.richieste, rilasci: window.__lock.rilasci};
  });
  tac.t('in pausa il tempo si ferma, alla ripresa riparte da dove era', Math.round(pausa.a) === 100 && Math.round(pausa.b) === 100 && Math.round(pausa.c) === 120, JSON.stringify(pausa));

  /* ricaricando la pagina il timer riparte da solo, senza rifare i suoni vecchi */
  const sal = await p.evaluate(() => {
    timerChiudi(); window.__t = 20000000; timerAvvia(); window.__t += 780000; tmTick();   /* minuto 13: dentro la rifinitura alta, avviso non ancora confermato */
    const prima = tmEl(); const nLog = TM.log.length;
    const salvato = localStorage.getItem('zfl_timer');
    TM = null; clearInterval(TM_H); timerRipristina();
    return {prima, dopo: tmEl(), ce: !!salvato, logNuovo: TM.log.length, nLog, fase: tmStato(tmEl()).fase};
  });
  tac.t('dopo un ricaricamento il timer c\'e\' ancora e segna lo stesso minuto, senza ripetere i suoni vecchi',
    sal.ce && Math.abs(sal.dopo - sal.prima) < 1 && sal.logNuovo === 0 && sal.fase === 'attiva', JSON.stringify(sal));

  /* ── a schermo pieno: dentro la cornice su ogni schermo ── */
  for(const [w,h] of [[390,844],[768,1024],[1080,1920],[1280,800]]){
    await p.setViewportSize({width:w, height:h});
    const r = await p.evaluate(() => {
      TM.full = true; tmDisegna(true); tmTick();
      const box = document.getElementById('tmr');
      const chips = Array.from(box.querySelectorAll('.tc')).map(c => c.textContent);
      const fuori = Array.from(box.querySelectorAll('*')).filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 1 || b.left < -1); }).length;
      return {full: box.classList.contains('full'), anello: !!box.querySelector('.tm-ring'), chips, fuori, sx: box.scrollWidth <= innerWidth + 1,
        coperto: getComputedStyle(box).position};
    });
    tac.t(`a schermo pieno ${w}×${h}: anello, livelli della sessione, niente fuori dalla cornice`,
      r.full && r.anello && r.sx && r.fuori === 0 && r.chips.includes('Zero Gravity') && r.chips.some(c => /Rifinitura alta/.test(c)), JSON.stringify(r));
  }
  await p.setViewportSize({width:430, height:900});

  /* barra compatta su un telefono stretto: niente scorrimento laterale */
  const stretto = await p.evaluate(() => { TM.full = false; tmDisegna(true); tmTick();
    return {sx: document.documentElement.scrollWidth <= innerWidth + 1, bar: document.getElementById('tmr').className}; });
  tac.t('la barra compatta sta nella larghezza del telefono', stretto.sx && /bar/.test(stretto.bar), JSON.stringify(stretto));

  /* «Chiudi» toglie tutto */
  const chiuso = await p.evaluate(() => { timerChiudi(); return {box: document.getElementById('tmr').innerHTML, salvato: localStorage.getItem('zfl_timer'), tmh: document.documentElement.style.getPropertyValue('--tmh')}; });
  tac.t('chiudendo il timer sparisce la barra e non resta niente salvato', chiuso.box === '' && chiuso.salvato === null && chiuso.tmh === '0px', JSON.stringify(chiuso));

  await p.close();
  return tac;
};
