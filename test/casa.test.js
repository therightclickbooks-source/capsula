/* ═══════════════════════════════════════════════════════════════
   LA HOME DEL GESTIONALE
   Ha la stessa mano della vetrina, e non per gusto: chi lavora qui
   passa la giornata a guardare tutt'e due gli schermi, e due modi
   diversi di dire «qui comincia un'altra cosa» costringono l'occhio a
   reimparare ogni volta che alza la testa.
   La forma e' quella: ogni gruppo dentro il suo riquadro, la testata
   su un ripiano rialzato che arriva ai bordi, e una riga che lo chiude
   da bordo a bordo. E' quella riga a dividere, non lo spazio bianco.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, Taccuino } = require('./aiuto');

module.exports = async function(browser){
  const tac = new Taccuino('la home del gestionale');

  for(const schermo of [{n:'telefono', w:390, h:900}, {n:'desktop', w:1280, h:900}]){
    for(const tema of ['scuro', 'chiaro']){
      const p = await browser.newPage({viewport:{width:schermo.w, height:schermo.h}});
      p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
      await p.addInitScript(()=>{
        try{ localStorage.setItem('zfl_app_v1', JSON.stringify(
          {codeHash:'x', codeLen:4, clients:[], sessions:[], checkins:[], operators:[]})); }catch(e){}
      });
      await p.goto(GESTIONALE);
      await p.waitForTimeout(700);
      if(tema === 'chiaro'){
        await p.evaluate(()=> document.documentElement.classList.add('light'));
        await p.waitForTimeout(200);
      }
      const q = schermo.n + ' ' + tema + ': ';

      const m = await p.evaluate(()=>
        [...document.querySelectorAll('.secgroup')].map(g=>{
          const l = g.querySelector('.sg-lab'), pill = l && l.querySelector('span');
          const cg = getComputedStyle(g), cl = l ? getComputedStyle(l) : null;
          return {
            gruppo:{bordo: parseFloat(cg.borderTopWidth), raggio: parseFloat(cg.borderTopLeftRadius),
                    fondo: cg.backgroundColor},
            ripiano: l ? {riga: parseFloat(cl.borderBottomWidth),
                          largo: l.offsetWidth >= g.clientWidth - 1,
                          fondo: cl.backgroundImage !== 'none'} : null,
            pastiglia: pill ? {raggio: parseFloat(getComputedStyle(pill).borderTopLeftRadius),
                               bordo: parseFloat(getComputedStyle(pill).borderTopWidth)} : null
          };
        }));

      tac.t(q + 'i gruppi della home ci sono tutti', m.length === 3, String(m.length));
      tac.t(q + 'ogni gruppo sta dentro il suo riquadro',
        m.every(x => x.gruppo.bordo > 0 && x.gruppo.raggio >= 16
          && x.gruppo.fondo !== 'rgba(0, 0, 0, 0)'),
        JSON.stringify(m.map(x=>x.gruppo)));
      tac.t(q + 'la testata e\' un ripiano che arriva ai bordi',
        m.every(x => x.ripiano && x.ripiano.riga > 0 && x.ripiano.largo && x.ripiano.fondo),
        JSON.stringify(m.map(x=>x.ripiano)));
      tac.t(q + 'l\'etichetta e\' una pastiglia, come la targhetta della vetrina',
        m.every(x => x.pastiglia && x.pastiglia.raggio > 20 && x.pastiglia.bordo > 0),
        JSON.stringify(m.map(x=>x.pastiglia)));

      /* le carte hanno il rilievo: filo di luce sopra e ombra colorata sotto */
      tac.t(q + 'le carte hanno il rilievo', await p.evaluate(()=>
        [...document.querySelectorAll('.tile[data-c]')].every(e=>{
          const o = getComputedStyle(e).boxShadow;
          return /inset/.test(o) && o.split('inset').length === 2 && o.length > 40;
        })));

      /* niente deve sbordare in larghezza: la home si scorre in verticale */
      tac.t(q + 'la home non sborda di lato', await p.evaluate(()=>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));

      await p.close();
    }
  }
  return tac;
};
