/* ═══════════════════════════════════════════════════════════════
   LA HOME DELLA VETRINA
   Due cose si provano qui, e sono di natura diversa.

   L'ORDINE E LA FORMA: cosa viene prima di cosa, e che ogni sezione
   abbia il suo rettangolo e il suo titolo. Sono decisioni prese a
   voce, e senza una prova che le tenga ferme la prima modifica che
   sposta un blocco le disfa senza che nessuno se ne accorga.

   LO SPAZIO: la colonna della vetrina ha un'altezza fissa e dentro ci
   sta tutto per pochi punti. Ogni parola in piu' e ogni bordo in piu'
   la fanno sbordare, e su un 49 pollici sbordare vuol dire che il
   tasto del check-in finisce sotto il vetro. Per questo lo spazio si
   MISURA a ogni formato, e non si guarda a occhio.
   ═══════════════════════════════════════════════════════════════ */
const { VETRINA, GESTIONALE, RADICE, SCHERMI, Taccuino } = require('./aiuto');
const fs = require('fs');
const path = require('path');

module.exports = async function(browser){
  const tac = new Taccuino('la home della vetrina');

  for(const s of SCHERMI){
    const p = await tac.pagina(browser, VETRINA, s);
    const q = s.n + ': ';

    /* ── niente bande ai lati: in verticale il foglio riempie lo schermo ── */
    if(s.h > s.w){
      const riempie = await p.evaluate(()=>{
        const r = document.getElementById('tot').getBoundingClientRect();
        return {sx: r.left, dx: innerWidth - r.right, su: r.top, giu: innerHeight - r.bottom};
      });
      tac.t(q + 'il foglio arriva ai due lati dello schermo, senza bande',
        Math.abs(riempie.sx) <= 2 && Math.abs(riempie.dx) <= 2, JSON.stringify(riempie));
    }

    /* ── la vetrina non si sposta strisciando ──
       il contenitore non deve poter scorrere di lato: prima una mano sul
       vetro spostava tutto a sinistra */
    const ferma = await p.evaluate(()=>{
      const f = document.getElementById('fit'), c = getComputedStyle(f);
      f.scrollLeft = 300;
      const dopo = f.scrollLeft; f.scrollLeft = 0;
      return {x: c.overflowX, y: c.overflowY, dopo};
    });
    if(s.h > s.w) tac.t(q + 'la vetrina non scorre di lato', ferma.x !== 'auto' && ferma.x !== 'scroll'
      && ferma.x !== 'visible' && ferma.dopo === 0, JSON.stringify(ferma));

    /* ── l'ordine della colonna (v170) ──
       la frase con la capsula, i sei bisogni, l'invito (v193: salito
       sopra il nastro, all'altezza della mano), il nastro di oggi, e le
       due strade in piu' (domande e respiro) */
    const colonna = await p.evaluate(()=>
      [...document.querySelector('.vetr').children].map(e=> e.className.split(' ')[0]));
    tac.t(q + 'la colonna e\' frase · bisogni · invito · nastro · due strade',
      colonna.join(',') === 'zhero,zbisogni,zinvito,zdir,zdue', colonna.join(' | '));

    /* ── lo spazio: niente sborda, niente si accavalla ── */
    const spazio = await p.evaluate(()=>{
      const v = document.querySelector('.vetr'), f = [...v.children];
      const sovrap = f.slice(1).some((e,i)=> e.offsetTop < f[i].offsetTop + f[i].offsetHeight - 1);
      const d = document.getElementById('dbg');
      return {fuori: v.scrollHeight - v.clientHeight, sovrap,
        dbg: v.offsetTop + v.offsetHeight <= d.offsetTop + 2};
    });
    tac.t(q + 'la colonna non sborda', spazio.fuori <= 0, 'fuori di ' + spazio.fuori);
    tac.t(q + 'le fasce non si accavallano', !spazio.sovrap);
    tac.t(q + 'le due strade non toccano la riga di servizio', spazio.dbg);

    /* ── i sei bisogni: sei carte, sei colori, e girano con le frasi ── */
    const bis = await p.evaluate(()=>{
      const c = [...document.querySelectorAll('#zgri .zbis')];
      return {n:c.length, col:new Set(c.map(e=> e.style.getPropertyValue('--c').trim())).size,
        frasi:document.querySelectorAll('#zslides .zslide').length,
        insieme:frasiVetrina().every((f, i)=>{ mostraFrase(i); const a = document.querySelectorAll('#zgri .zbis.acceso');
          return a.length === 1 && a[0].dataset.k === f.k && document.querySelectorAll('#zslides .zslide.on').length === 1; }),
        dentro:c.every(e=> e.querySelector('.n').scrollWidth <= e.clientWidth)};
    });
    tac.t(q + 'sei bisogni, ognuno col suo colore', bis.n === 6 && bis.col === 6, JSON.stringify(bis));
    tac.t(q + 'ogni frase accende il suo rettangolo, e solo quello', bis.frasi >= 60 && bis.insieme, JSON.stringify(bis));
    tac.t(q + 'il nome di ogni bisogno sta dentro la sua carta', bis.dentro);
    tac.t(q + 'le frasi grandi stanno nella loro casella', await p.evaluate(()=>
      [...document.querySelectorAll('.zslide')].every(e=> e.offsetHeight <= e.parentElement.offsetHeight)));

    /* ── l'invito ── */
    const invito = await p.evaluate(()=>{
      const t = document.querySelector('#gocheck .t1'), r = document.querySelector('#gocheck .t2');
      return {t:t.textContent, r:r.textContent, una: r.offsetHeight <= parseFloat(getComputedStyle(r).fontSize) * 1.7,
        dentro: t.scrollWidth <= t.parentElement.clientWidth + 1};
    });
    tac.t(q + 'l\'invito dice quanti passi e chi ti chiama', /5 passi/.test(invito.r) && /operatore/.test(invito.r), invito.r);
    tac.t(q + 'la riga dell\'invito sta su una riga sola', invito.una);
    tac.t(q + 'l\'invito non e\' tutto maiuscolo', invito.t !== invito.t.toUpperCase());
    tac.t(q + 'il titolo dell\'invito non esce dal tasto', invito.dentro);
    await p.close();
  }

  /* ── il numero di versione ──
     Il totem resta acceso per giorni con la stessa pagina aperta e il
     browser tiene quella che ha scaricato la prima volta: si pubblica
     una modifica e sul vetro non cambia niente, senza che nessun errore
     lo dica. Per questo la vetrina scrive in fondo il suo numero e ogni
     dieci minuti, solo da ferma, va a vedere se ne esiste uno diverso.
     Due cose devono restare vere, e nessuna delle due si vede a occhio:
     che il numero sia lo stesso del gestionale, e che il modello con cui
     la pagina cerca la versione non trovi SE STESSO — se lo trovasse, il
     totem si ricaricherebbe da solo ogni dieci minuti, per sempre. */
  const testoVetrina = fs.readFileSync(path.join(RADICE,'app','totem','index.html'),'utf8');
  const testoGest    = fs.readFileSync(path.join(RADICE,'app','index.html'),'utf8');
  const modello = new RegExp('VETRINA_' + "VERSION = '([^']+)'");
  const nVetrina = (testoVetrina.match(modello) || [])[1];
  const nGest = (testoGest.match(new RegExp('APP_' + "VERSION = '([^']+)'")) || [])[1];

  tac.t('la vetrina dichiara la sua versione', !!nVetrina, String(nVetrina));
  tac.t('vetrina e gestionale stanno allo stesso numero',
    nVetrina === nGest, nVetrina + ' contro ' + nGest);
  tac.t('il modello della versione trova la riga giusta, non se stesso',
    nVetrina === nGest && /^v\d+\.\d+\.\d+\(\d+\)$/.test(nVetrina || ''), String(nVetrina));

  /* ── i bisogni aprono la loro pagina, e il check-in parte con l'obiettivo gia' scelto ── */
  const pf = await tac.pagina(browser, VETRINA, SCHERMI[0]);
  const sc = await pf.evaluate(()=>{
    const out = BISOGNI.map(b=>{
      apriBisogno(b.k);
      const box = document.getElementById('zscopri'), nm = box.querySelector('.znasce .nm');
      const cta = box.querySelector('.zcta2');
      return {k:b.k, on: SCENE === 'scopri', nome: nm ? nm.textContent : '',
        sborda: box.scrollHeight > box.clientHeight + 1,
        nomeDentro: nm ? nm.scrollWidth <= nm.clientWidth + 1 : false,
        ctaSotto: cta.offsetTop + cta.offsetHeight <= box.clientHeight + 1};
    });
    apriBisogno('gambe'); document.querySelector('#zscopri .zcta2').click();
    const goal = D.goal, scena = SCENE;
    go('idle');
    return {out, goal, scena};
  });
  tac.t('ogni bisogno apre la sua pagina', sc.out.every(x=> x.on), JSON.stringify(sc.out.filter(x=> !x.on)));
  tac.t('ogni pagina mostra un nome di protocollo vero', sc.out.every(x=> x.nome.length > 5), JSON.stringify(sc.out.map(x=> x.nome)));
  tac.t('ogni pagina sta nello schermo, col tasto in fondo', sc.out.every(x=> !x.sborda && x.ctaSotto), JSON.stringify(sc.out.filter(x=> x.sborda || !x.ctaSotto)));
  tac.t('il nome di esempio non esce dal suo riquadro', sc.out.every(x=> x.nomeDentro), JSON.stringify(sc.out.filter(x=> !x.nomeDentro).map(x=> x.nome)));
  tac.t('«La voglio provare» apre il check-in con l\'obiettivo gia\' scelto', sc.scena === 'form' && sc.goal === 'drenaggio', JSON.stringify(sc));

  /* ── le frasi: almeno dieci per bisogno, mai due di fila sullo stesso
     rettangolo, e le domande sono domande vere che si aprono ── */
  const fr = await pf.evaluate(()=>{
    const L = frasiVetrina(), per = {};
    L.forEach(f => per[f.k] = (per[f.k] || 0) + 1);
    const alte = [...document.querySelectorAll('#zslides .zslide')].filter(e => e.offsetHeight > e.parentElement.offsetHeight || e.querySelector('.h1').scrollWidth > e.clientWidth + 1).length;
    const dom = L.filter(f => f.t === 'd');
    const ap = dom.slice(0, 3).map(f => { mostraFrase(L.indexOf(f)); apriBisognoCorrente(); const ok = SCENE === 'ask' && document.getElementById('rq').textContent === QA[f.qa].q; go('idle'); return ok; });
    return {n: L.length, per, alte, fila: L.every((f, i) => i === 0 || f.k !== L[i-1].k), dom: dom.length, ap, vere: dom.every(f => QA[f.qa]),
      tipi: [...new Set(L.map(f => f.t))].sort().join('')};
  });
  tac.t('le frasi sono almeno sessanta, dieci per ogni bisogno', fr.n >= 60 && Object.values(fr.per).every(n => n >= 10), JSON.stringify(fr.per));
  tac.t('ogni frase entra nella sua casella', fr.alte === 0, fr.alte + ' fuori');
  tac.t('due frasi di fila non accendono mai lo stesso rettangolo', fr.fila);
  tac.t('ci sono le tre famiglie: ti succede, lo sapevi, lo chiedono tutti', /c/.test(fr.tipi) && /d/.test(fr.tipi) && /p/.test(fr.tipi), fr.tipi);
  tac.t('le domande in vetrina sono domande vere, e toccandole si apre la risposta', fr.dom >= 12 && fr.vere && fr.ap.every(Boolean), JSON.stringify(fr));

  /* ── le schede che si aprono toccando ── */
  const sc2 = await pf.evaluate(()=>{
    const chiavi = ['capsula','sdraiato','durata','misura'].concat(Object.keys(ELEMENTI));
    const aperte = chiavi.map(k => { apriInfo(k); const v = document.getElementById('zinfo'); const ok = v.classList.contains('on') && v.querySelector('.zit1').textContent.length > 3; chiudiInfo(); return ok; });
    apriInfo('capsula'); const tessere = document.querySelectorAll('#zinfo .zit').length; chiudiInfo();
    const tocc = {orb: [...document.querySelectorAll('.zorb')].every(o => /apriInfo/.test(o.getAttribute('onclick') || '')),
      tre: [...document.querySelectorAll('.ztre span')].every(o => /apriInfo/.test(o.getAttribute('onclick') || '')),
      caps: /apriInfo/.test(document.querySelector('.zcaps').getAttribute('onclick') || '')};
    const nome = MOTORE.nomeProtocollo('P04', {fourD:2, airbag:2, calore:true, ioni:false, zerog:true, polpacci:0, plantari:1}, null);
    apriNome(nome); const n = document.getElementById('zinfo').textContent; chiudiInfo();
    go('form'); apriInfo('calore'); go('idle'); const chiusa = !document.getElementById('zinfo').classList.contains('on');
    return {aperte, tessere, tocc, nome: n.indexOf(nome) >= 0 && /Back Relieve/i.test(n), chiusa};
  });
  tac.t('capsula, elementi ed etichette aprono ognuno la sua scheda', sc2.aperte.every(Boolean) && sc2.tessere === 6, JSON.stringify(sc2));
  tac.t('in vetrina si toccano la capsula, le quattro etichette intorno e le tre sotto la frase', sc2.tocc.orb && sc2.tocc.tre && sc2.tocc.caps, JSON.stringify(sc2.tocc));
  tac.t('un nome del nastro apre il protocollo che descrive', sc2.nome);
  tac.t('cambiando schermata la scheda si chiude', sc2.chiusa);

  /* ── componi il tuo: il nome cambia, il tempo no, e si finisce col solo nome ── */
  const cp = await pf.evaluate(()=>{
    apriComponi('schiena');
    const n0 = document.getElementById('zcnome').textContent;
    compSet('mood', 'stressato'); compSet('zona', 'cervicale');
    const n1 = document.getElementById('zcnome').textContent;
    const tempo = /Quanto dura/.test(document.getElementById('zcomp').textContent) && !document.querySelector('#zcomp [onclick*="timer"]');
    const sborda = BISOGNI.map(b => { apriComponi(b.k); ['cervicale','lombare','gambe'].forEach(z => compSet('zona', z)); const z = document.getElementById('zcomp'); return z.scrollHeight - z.clientHeight; });
    apriComponi('gambe'); compSet('des', 'calore');
    const atteso = protComponi(COMP).nome, des = Object.assign({}, COMP.des);
    startCheckRapido();
    const r = {passi: passi().map(x => x.k).join(','), etichetta: document.getElementById('fstep').textContent};
    go('idle');
    return {n0, n1, tempo, sborda, atteso, des, r};
  });
  tac.t('in «Componi il tuo» il nome cambia con le scelte, e il tempo non si sceglie', cp.n0 !== cp.n1 && cp.tempo, JSON.stringify(cp));
  tac.t('«Componi il tuo» sta nello schermo per ogni bisogno', cp.sborda.every(x => x <= 0), JSON.stringify(cp.sborda));
  tac.t('«Lo voglio così» chiede soltanto il nome', cp.r.passi === 'nome' && /UN SOLO PASSO/.test(cp.r.etichetta), JSON.stringify(cp.r));

  /* ── v175: OGNI tocco in «Componi il tuo» fa nascere un nome nuovo ── */
  const tocchi = await pf.evaluate(()=>{
    let seme = 175; const rnd = n => { seme = (seme * 1664525 + 1013904223) >>> 0; return (seme >>> 12) % n; };
    const att = PASSI_TUTTI.find(x => x.k === 'activity').opts.map(o => o[0]), umo = PASSI_TUTTI.find(x => x.k === 'mood').opts.map(o => o[0]);
    const out = {tocchi:0, uguali:0, esempi:[]};
    BISOGNI.forEach(b => {
      apriComponi(b.k);
      for(let i = 0; i < 80; i++){
        const C = COMP, prima = document.getElementById('zcnome').textContent;
        const tipo = rnd(5); let k, v;
        if(tipo === 0){ v = att[rnd(att.length)]; if(v === C.activity) continue; k = 'activity'; }
        else if(tipo === 1){ v = umo[rnd(umo.length)]; if(v === C.mood) continue; k = 'mood'; }
        else if(tipo === 2){ v = ['dolce','media','decisa'][rnd(3)]; if(v === C.pressione) continue; k = 'pressione'; }
        else if(tipo === 3){ const z = ZONE_COMP.map(x => x[0]).concat(['totale','nessuna']); v = z[rnd(z.length)]; k = 'zona';
          if(v === C.zmode || (C.zones.length >= 3 && C.zones.indexOf(v) < 0 && v !== 'totale' && v !== 'nessuna')) continue; }
        else { v = DES[rnd(DES.length)][0]; k = 'des'; }
        compSet(k, v); out.tocchi++;
        const dopo = document.getElementById('zcnome').textContent;
        if(dopo === prima){ out.uguali++; if(out.esempi.length < 3) out.esempi.push(b.k + ' ' + k + '=' + v + ' ' + dopo); }
      }
    });
    go('idle');
    return out;
  });
  tac.t('in «Componi il tuo» ogni tocco fa nascere un nome nuovo (' + tocchi.tocchi + ' tocchi provati su tutti i bisogni)',
    tocchi.tocchi > 300 && tocchi.uguali === 0, JSON.stringify(tocchi));

  /* ── il respiro: 4 dentro, 2 fermi, 6 fuori ── */
  const rs = await pf.evaluate(async ()=>{
    apriRespira();
    const fase = ()=> document.getElementById('zfase').textContent;
    RESP_0 = performance.now() - 1000; passoRespiro(); const a = fase();
    RESP_0 = performance.now() - 5000; passoRespiro(); const b = fase();
    RESP_0 = performance.now() - 9000; passoRespiro(); const c = fase();
    const attivo = !!RESP_T; go('idle'); const fermo = !RESP_T;
    return {a, b, c, attivo, fermo};
  });
  tac.t('il respiro va: inspira, trattieni, espira', rs.a === 'Inspira' && rs.b === 'Trattieni' && rs.c === 'Espira', JSON.stringify(rs));
  tac.t('uscendo dal respiro il conto si ferma', rs.attivo && rs.fermo);
  await pf.close();

  /* ── il nastro di oggi: i nomi delle sedute di oggi, mai quelli dei clienti ── */
  const pn = await browser.newPage({viewport:{width:1080, height:1920}});
  pn.on('pageerror', e => tac.rossi.push('errore di pagina (nastro): ' + e.message));
  const ora = new Date().toISOString(), ieri = new Date(Date.now() - 864e5).toISOString();
  await pn.addInitScript(d => localStorage.setItem('zfl_app_v1', JSON.stringify(d)), {
    clients:[{id:'c1', nome:'Gianna', cognome:'Riservata'}], operators:[],
    sessions:[{id:'a', clientId:'c1', date:ora, nome:'Pure Reef Contour'}, {id:'b', clientId:'c1', date:ora, nome:'Onyx Dusk Nocturne'},
              {id:'c', clientId:'c1', date:ieri, nome:'Sage Candle Cooldown'}]});
  await pn.goto(VETRINA); await pn.waitForTimeout(600);
  const na = await pn.evaluate(()=> ({t: document.getElementById('zdirn').textContent, c: document.getElementById('zdirc').textContent,
    k: document.getElementById('zdirk').textContent}));
  tac.t('il nastro mostra i protocolli di oggi e quante sedute', /Pure Reef Contour/.test(na.t) && /Onyx Dusk Nocturne/.test(na.t)
    && !/Sage Candle/.test(na.t) && na.c === '2 sedute oggi' && na.k === 'OGGI IN CAPSULA', JSON.stringify(na));
  tac.t('nel nastro non c\'e\' mai il nome di un cliente', !/Gianna|Riservata/.test(na.t));

  /* ── le cinque sequenze anche al totem: a caso, mai una delle ultime tre ── */
  const sq = await pn.evaluate(()=>{
    const db = JSON.parse(localStorage.getItem('zfl_app_v1'));
    db.sessions = [1,2,3].map(i => ({id:'z' + i, clientId:'c1', date:'2026-10-0' + i + 'T10:00:00.000Z', prog:'P04', quiz:{seq:i}}));
    localStorage.setItem('zfl_app_v1', JSON.stringify(db));
    const scelte = new Set(); for(let i = 0; i < 40; i++) scelte.add(scegliSeq('c1'));
    const testi = SEQ_TOTEM.map((_, i) => { D.seq = i; return testoDomanda(PASSI_TUTTI.find(x => x.k === 'goal')).q; });
    const valori = SEQ_TOTEM.map((_, i) => { D.seq = i; return carteDi('mood').map(o => o[0]).join(','); });
    D.seq = 0;
    return {scelte:[...scelte].sort().join(','), testi:new Set(testi).size, valori:new Set(valori).size};
  });
  tac.t('al totem la sequenza di domande si sceglie a caso, mai una delle ultime tre', sq.scelte === '0,4', sq.scelte);
  tac.t('le cinque sequenze del totem hanno parole diverse e le stesse risposte', sq.testi === 5 && sq.valori === 1, JSON.stringify(sq));
  await pn.close();

  /* anche il gestionale va a vedere se ne esiste una nuova: senza, il
     telefono dell'operatore resta indietro di giorni senza dirlo */
  tac.t('il gestionale controlla da solo se ne esiste una versione nuova',
    /function guardaVersioneNuova/.test(testoGest) && /visibilitychange/.test(testoGest));

  const p2 = await tac.pagina(browser, VETRINA, SCHERMI[0]);
  tac.t('il numero si legge in fondo alla vetrina',
    (await p2.textContent('#dbg')).includes(nVetrina),
    await p2.textContent('#dbg'));
  tac.t('da ferma la vetrina controlla se ne esiste una nuova',
    await p2.evaluate(()=> typeof guardaSeCeNeUnaNuova === 'function'));
  /* se qualcuno sta rispondendo alle domande, non si ricarica niente */
  tac.t('con qualcuno dentro il controllo non fa niente',
    await p2.evaluate(async ()=>{
      go('form');
      let ricaricato = false;
      const vero = location.reload;
      location.reload = ()=>{ ricaricato = true; };
      await guardaSeCeNeUnaNuova();
      location.reload = vero;
      go('idle');
      return !ricaricato;
    }));
  await p2.close();

  return tac;
};
