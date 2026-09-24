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

    /* ── l'ordine della colonna ── */
    const colonna = await p.evaluate(()=>
      [...document.querySelector('.vetr').children].map(e=>{
        const h = e.querySelector('.sezh');
        return h ? h.textContent.trim() : e.className.split(' ')[0];
      }));
    /* quattro fasce, un compito ciascuna: «cosa succede adesso» non e'
       piu' un riquadro a parte, i tre passaggi stanno dentro il tasto */
    tac.t(q + 'la colonna e\' frase · numeri · allenamento · invito',
      colonna.length === 4
      && colonna[0] === 'hero' && colonna[1] === 'sezione'
      && colonna[2].startsWith('Cosa hai fatto oggi')
      && colonna[3] === 'cta',
      colonna.join(' | '));
    tac.t(q + 'il riquadro «cosa succede adesso» non c\'e\' piu\'',
      !(await p.textContent('.vetr')).includes('Cosa succede adesso'));
    tac.t(q + 'lo spazio che avanza si divide fra le fasce, non fa un buco sopra il tasto',
      await p.evaluate(()=>{
        const f = [...document.querySelector('.vetr').children];
        const g = f.slice(1).map((e,i)=> e.offsetTop - (f[i].offsetTop + f[i].offsetHeight));
        return Math.max(...g) - Math.min(...g) <= 30;
      }));

    /* ── la forma delle sezioni ── */
    tac.t(q + 'ogni sezione sta dentro un rettangolo suo', await p.evaluate(()=>
      [...document.querySelectorAll('.sezione')].every(e=>{
        const c = getComputedStyle(e);
        return parseFloat(c.borderTopWidth) > 0 && parseFloat(c.borderTopLeftRadius) >= 24
          && c.backgroundColor !== 'rgba(0, 0, 0, 0)';
      })));
    /* il titolo di sezione e' fatto come una risposta aperta: targhetta a
       pastiglia sopra, e sotto la domanda con la barra a sinistra. Le due
       cose devono stare in colonna e allineate fra loro — sulla stessa
       riga, quindici punti accanto a ventotto non si allineano a niente */
    tac.t(q + 'i due titoli hanno la targhetta sopra e la domanda sotto',
      await p.evaluate(()=>
        [...document.querySelectorAll('.sezt')].every(e=>{
          const oc = e.querySelector('.seze'), ti = e.querySelector('.sezh');
          if(!oc || !ti) return false;
          const c = getComputedStyle(ti), co = getComputedStyle(oc);
          return oc.offsetTop + oc.offsetHeight <= ti.offsetTop      /* in colonna */
            && parseFloat(c.fontSize) >= 26
            && parseFloat(c.borderLeftWidth) >= 3                    /* la barra */
            && parseFloat(co.borderTopWidth) > 0                     /* la pastiglia */
            && parseFloat(co.borderTopLeftRadius) > 20;
        })));
    /* il gradino: la testata sta su un ripiano che arriva ai bordi della
       sezione, e la riga che lo chiude corre da bordo a bordo. Se
       qualcuno toglie i margini negativi il ripiano si stringe e la
       riga diventa un trattino in mezzo, che non divide piu' niente */
    tac.t(q + 'la testata e\' un ripiano che arriva ai bordi della sezione',
      await p.evaluate(()=>
        [...document.querySelectorAll('.sezione .sezt')].every(e=>{
          const c = getComputedStyle(e);
          return parseFloat(c.borderBottomWidth) > 0
            && e.offsetWidth >= e.parentElement.clientWidth - 1
            && c.backgroundImage !== 'none';
        })));

    /* la faccina e' una scorciatoia, non un passo: se le mettessimo la
       cornice diventerebbe una sezione e l'ordine si perderebbe. Sta
       sotto il tasto, come seconda strada */
    tac.t(q + 'la faccina non ha la cornice di sezione',
      await p.evaluate(()=> !document.getElementById('avatar').classList.contains('sezione')));
    tac.t(q + 'la faccina sta sotto il tasto del check-in',
      await p.evaluate(()=>{
        const a = document.getElementById('avatar'), b = document.getElementById('gocheck');
        return a.closest('.cta') && a.offsetTop > b.offsetTop + b.offsetHeight;
      }));
    tac.t(q + 'la faccina non esce dalla colonna e non tocca la riga di servizio',
      await p.evaluate(()=>{
        const a = document.getElementById('avatar').getBoundingClientRect();
        const d = document.getElementById('dbg').getBoundingClientRect();
        return a.bottom <= d.top;
      }));

    /* ── il disegno in alto a destra: il guscio di luce ──
       niente piu' fila di sagome, e la pastiglia non copre la testiera */
    tac.t(q + 'in alto a destra c\'e\' il guscio, senza la fila di sagome',
      await p.evaluate(()=>{
        const svg = document.querySelector('.pod svg');
        return !!svg.querySelector('#gb1') && !svg.querySelector('#zcf')
          && !document.querySelector('.pb2');
      }));

    /* ── lo spazio: niente deve sbordare ── */
    const spazio = await p.evaluate(()=>{
      const v = document.querySelector('.vetr'), po = document.querySelector('.porte');
      const serve = [...po.children].reduce((a,e)=>
        a + e.offsetHeight + parseFloat(getComputedStyle(e).marginTop || 0), 0);
      return {fuori: v.scrollHeight - v.clientHeight,
              serve, dentro: po.clientHeight
                - parseFloat(getComputedStyle(po).paddingTop)
                - parseFloat(getComputedStyle(po).paddingBottom)};
    });
    tac.t(q + 'la colonna non sborda', spazio.fuori <= 0, 'fuori di ' + spazio.fuori);
    tac.t(q + 'le cinque porte e il pensiero stanno nel loro rettangolo',
      spazio.serve <= spazio.dentro + 1, spazio.serve + ' su ' + spazio.dentro);

    /* ── il pensiero: tutti e cinque, interi ──
       il riquadro ha overflow:hidden, quindi una frase troppo lunga
       non da' errore: sparisce a meta' e nessuno se ne accorge */
    for(const k of ['ems','matrix','vacufit','ems2','riposo']){
      const ok = await p.evaluate(async kk=>{
        disegnaPensiero(kk);
        await new Promise(z=> setTimeout(z, 340));
        const b = document.getElementById('pens'), t = b.querySelector('.px');
        const c = getComputedStyle(b);
        return t.offsetHeight <= b.clientHeight
          - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
      }, k);
      tac.t(q + 'il pensiero di ' + k + ' ci sta tutto', ok);
    }

    /* ── i tre passaggi, dentro il tasto ── */
    const passi = await p.evaluate(()=>{
      const e = document.querySelector('#gocheck .passi3');
      return {testo: e ? e.textContent : '', numeri: e ? e.querySelectorAll('i').length : 0,
              righe: e ? Math.round(e.offsetHeight / parseFloat(getComputedStyle(e).lineHeight || 24)) : 0,
              alto: e ? e.offsetHeight : 0, corpo: e ? parseFloat(getComputedStyle(e).fontSize) : 0};
    });
    tac.t(q + 'nel tasto ci sono i tre passaggi: nome, poche domande, ti accomodi',
      passi.numeri === 3 && /nome/.test(passi.testo) && /poche domande/.test(passi.testo)
        && /accomodi/.test(passi.testo), passi.testo);
    tac.t(q + 'i tre passaggi stanno su una riga sola',
      passi.alto <= passi.corpo * 1.7, passi.alto + 'px per ' + passi.corpo + 'px');

    /* ── il pensiero, che e' una risposta ──
       stessa lingua del foglio dei macchinari: barra a sinistra del
       testo, e in oro la parte che parla di Zenith */
    const pensiero = await p.evaluate(()=>{
      disegnaPensiero('vacufit');
      const b = document.getElementById('pens');
      const px = b.querySelector('.px'), pf = b.querySelector('.pf');
      const c = getComputedStyle(px);
      const g = document.createElement('b'); pf.appendChild(g);
      const oro = getComputedStyle(g).color;
      g.remove();
      return {barra: parseFloat(c.borderLeftWidth), passo: parseFloat(c.paddingLeft), oro};
    });
    tac.t(q + 'il pensiero ha la barra a sinistra, come la risposta del foglio',
      pensiero.barra >= 3 && pensiero.passo >= 14, JSON.stringify(pensiero));
    tac.t(q + 'la parte di Zenith nel pensiero e\' in oro, non in bianco',
      pensiero.oro !== 'rgb(255, 255, 255)' && /^rgb/.test(pensiero.oro), pensiero.oro);

    /* la riga sotto il tasto e la riga di servizio in fondo non si toccano */
    tac.t(q + 'la riga sotto il tasto non tocca la riga di servizio',
      await p.evaluate(()=>{
        const h = document.querySelector('.cta .hint'), d = document.getElementById('dbg');
        return h.getBoundingClientRect().bottom <= d.getBoundingClientRect().top;
      }));

    /* ── l'invito grande ──
       Non urla piu': se qualcuno rimette il titolo tutto maiuscolo o lo
       riporta a cinquantadue punti, questa diventa rossa. */
    const invito = await p.evaluate(()=>{
      const b = document.querySelector('.cta .btn');
      const t = b.querySelector('.t1'), i = b.querySelector('.ic'), g = b.querySelector('.go');
      const ci = getComputedStyle(i), cg = getComputedStyle(g);
      return {testo:t.textContent, corpo:parseFloat(getComputedStyle(t).fontSize),
        icona:{l:i.offsetWidth, r:parseFloat(ci.borderTopLeftRadius)},
        freccia:cg.backgroundImage};
    });
    tac.t(q + 'l\'invito non e\' tutto maiuscolo',
      invito.testo !== invito.testo.toUpperCase(), invito.testo);
    tac.t(q + 'l\'invito non urla: al massimo 44 punti',
      invito.corpo <= 44, invito.corpo + 'px');
    tac.t(q + 'l\'icona dell\'invito sta in un quadrato smussato, come nel gestionale',
      invito.icona.l >= 60 && invito.icona.r >= 16, JSON.stringify(invito.icona));
    tac.t(q + 'la freccia del cliente e\' dentro una pastiglia piena',
      /gradient/.test(invito.freccia), invito.freccia);

    /* ── le cinque porte ── */
    tac.t(q + 'le cinque porte ci sono tutte, e ognuna col suo colore',
      await p.evaluate(()=>{
        const c = [...document.querySelectorAll('#centro .ccard')];
        const col = c.map(e=> e.style.getPropertyValue('--mc').trim());
        return c.length === 5 && new Set(col).size === 5 && col.every(x=> x);
      }));
    tac.t(q + 'EMS si presenta come elettromiostimolazione',
      (await p.textContent('#centro')).includes('elettromiostimolazione'));

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

  /* ── le frasi che girano in alto ──
     La casella e' alta 508 punti e non cresce: una frase piu' alta
     spingerebbe giu' tutta la vetrina a ogni giro. Si misurano tutte. */
  const pf = await tac.pagina(browser, VETRINA, SCHERMI[0]);
  const frasi = await pf.evaluate(()=>{
    roamStop();
    const L = frasiVetrina(), box = document.getElementById('roams');
    const alte = [];
    L.forEach(m=>{
      box.innerHTML = '<div class="roam on ' + m.k + '"><span class="rtag"><i>' + m.ic + '</i>' + RTAG[m.k]
        + '</span><div class="tx">' + m.tx + '</div>' + (m.sub ? '<div class="sub">' + m.sub + '</div>' : '') + '</div>';
      if(box.firstChild.offsetHeight > 508) alte.push(m.tx);
    });
    const k = t => L.filter(x=> x.k === t);
    return {n:L.length, alte, problemi:k('beneficio').length,
      conZenith: k('beneficio').every(x=> /Zenith/.test(x.sub || '')),
      domande: k('domanda').every(x=> QA[x.qa] && QA[x.qa].q === x.tx), nDom: k('domanda').length,
      giro: L.every((x,i)=> i === 0 || x.a !== L[i-1].a),
      vecchie: L.filter(x=> /battito|indice di fatica|Cinque domande|Cinque risposte/i.test(x.tx + ' ' + (x.sub||''))).length};
  });
  tac.t('le frasi in alto sono almeno cinquanta', frasi.n >= 50, frasi.n + '');
  tac.t('ogni frase entra nella casella da 508 punti', !frasi.alte.length, frasi.alte.join(' | '));
  tac.t('sotto ogni «ti succede?» c\'e\' cosa ci fa Zenith', frasi.conZenith);
  tac.t('le domande in alto sono domande vere, che si aprono', frasi.domande && frasi.nDom >= 10, frasi.nDom + '');
  tac.t('due frasi di fila non entrano mai dallo stesso lato', frasi.giro);
  tac.t('nessuna frase promette piu\' battito, fatica o «cinque domande»', frasi.vecchie === 0, frasi.vecchie + '');
  await pf.close();

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
