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
const { VETRINA, SCHERMI, Taccuino } = require('./aiuto');

module.exports = async function(browser){
  const tac = new Taccuino('la home della vetrina');

  for(const s of SCHERMI){
    const p = await tac.pagina(browser, VETRINA, s);
    const q = s.n + ': ';

    /* ── l'ordine della colonna ── */
    const colonna = await p.evaluate(()=>
      [...document.querySelector('.vetr').children].map(e=>{
        const h = e.querySelector('.sezh');
        return h ? h.textContent.trim() : e.className.split(' ')[0];
      }));
    tac.t(q + 'la colonna e\' hero · numeri · faccina · allenamento · check-in · tasto',
      colonna.length === 7
      && colonna[0] === 'hero' && colonna[1] === 'sezione'
      && colonna[2] === 'avatar'
      && colonna[3].startsWith('Cosa hai fatto oggi')
      && colonna[4].startsWith('Cosa succede adesso')
      && colonna[5] === 'spazio' && colonna[6] === 'cta',
      colonna.join(' | '));

    tac.t(q + '«cosa hai fatto oggi» sta sopra «cosa succede adesso»',
      await p.evaluate(()=>{
        const a = document.querySelector('.porte'), b = document.querySelector('.sez');
        return a.offsetTop < b.offsetTop;
      }));

    /* ── la forma delle sezioni ── */
    tac.t(q + 'ogni sezione sta dentro un rettangolo suo', await p.evaluate(()=>
      [...document.querySelectorAll('.sezione')].every(e=>{
        const c = getComputedStyle(e);
        return parseFloat(c.borderTopWidth) > 0 && parseFloat(c.borderTopLeftRadius) >= 24
          && c.backgroundColor !== 'rgba(0, 0, 0, 0)';
      })));
    tac.t(q + 'i due titoli hanno occhiello in oro e titolo grande', await p.evaluate(()=>
      [...document.querySelectorAll('.sezt')].every(e=>{
        const oc = e.querySelector('.seze'), ti = e.querySelector('.sezh');
        return oc && ti && parseFloat(getComputedStyle(ti).fontSize) >= 28
          && oc.offsetWidth > 0;
      })));
    /* la faccina e' una scorciatoia, non un passo: se le mettessimo la
       cornice diventerebbe una quarta sezione e l'ordine si perderebbe */
    tac.t(q + 'la faccina non ha la cornice di sezione',
      await p.evaluate(()=> !document.getElementById('avatar').classList.contains('sezione')));

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

    /* ── i tre passi ── */
    const passi = await p.textContent('.passi');
    tac.t(q + 'fra i tre passi non si parla piu\' di «dove tira»',
      !passi.includes('dove tira'));
    tac.t(q + 'i tre passi hanno tutti il sottotitolo su una riga sola',
      await p.evaluate(()=>{
        const h = [...document.querySelectorAll('.pz .t2')].map(e=> e.offsetHeight);
        return h.length === 3 && h.every(x=> x === h[0]);
      }));

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
  return tac;
};
