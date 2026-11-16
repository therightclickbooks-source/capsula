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
       la frase con la capsula, i sei bisogni, il nastro di oggi,
       l'invito, e le due strade in piu' (domande e respiro) */
    const colonna = await p.evaluate(()=>
      [...document.querySelector('.vetr').children].map(e=> e.className.split(' ')[0]));
    tac.t(q + 'la colonna e\' frase · bisogni · nastro · invito · due strade',
      colonna.join(',') === 'zhero,zbisogni,zdir,zinvito,zdue', colonna.join(' | '));

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
        insieme:c.every((e,i)=> e.style.animationDelay === document.querySelectorAll('#zslides .zslide')[i].style.animationDelay),
        dentro:c.every(e=> e.querySelector('.n').scrollWidth <= e.clientWidth)};
    });
    tac.t(q + 'sei bisogni, ognuno col suo colore', bis.n === 6 && bis.col === 6, JSON.stringify(bis));
    tac.t(q + 'ogni bisogno ha la sua frase, e si accendono insieme', bis.frasi === 6 && bis.insieme, JSON.stringify(bis));
    tac.t(q + 'il nome di ogni bisogno sta dentro la sua carta', bis.dentro);
    tac.t(q + 'le frasi grandi stanno nella loro casella', await p.evaluate(()=>
      [...document.querySelectorAll('.zslide')].every(e=> e.offsetHeight <= e.parentElement.offsetHeight)));

    /* ── l'invito ── */
    const invito = await p.evaluate(()=>{
      const t = document.querySelector('#gocheck .t1'), r = document.querySelector('#gocheck .t2');
      return {t:t.textContent, r:r.textContent, una: r.offsetHeight <= parseFloat(getComputedStyle(r).fontSize) * 1.7,
        dentro: t.scrollWidth <= t.parentElement.clientWidth + 1};
    });
    tac.t(q + 'l\'invito dice quanti passi e chi ti chiama', /4 passi/.test(invito.r) && /operatore/.test(invito.r), invito.r);
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
