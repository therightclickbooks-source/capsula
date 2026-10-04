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

      tac.t(q + 'i gruppi della home ci sono tutti', m.length === 2, String(m.length));
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

      /* il ＋ non ripete il check-in: apre le azioni veloci, e si chiude
         toccando fuori */
      await p.click('.bnav .fab'); await p.waitForTimeout(250);
      const az = await p.evaluate(()=> ({aperto: document.getElementById('modal').classList.contains('open'),
        voci: [...document.querySelectorAll('#modal .azv b')].map(b=> b.textContent)}));
      tac.t(q + 'il ＋ apre le azioni veloci, con la nuova seduta in cima',
        az.aperto && az.voci[0] === 'Nuova seduta' && az.voci.includes('Nuovo cliente') && az.voci.includes('Sedute omaggio'),
        JSON.stringify(az));
      await p.mouse.click(5, 5); await p.waitForTimeout(150);
      tac.t(q + 'toccando fuori le azioni si chiudono',
        await p.evaluate(()=> !document.getElementById('modal').classList.contains('open')));

      await p.close();
    }
  }
  /* il nome del dispositivo: va nel backup che parte per Drive, e non viaggia nei dati */
  {
    const p = await browser.newPage({viewport:{width:430, height:900}});
    p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
    await p.addInitScript(()=>{ try{ localStorage.setItem('zfl_app_v1', JSON.stringify(
      {codeHash:'x', codeLen:4, clients:[{id:'a',nome:'A',cognome:'B'}], sessions:[], checkins:[], operators:[]})); localStorage.removeItem('zfl_dispositivo'); }catch(e){} });
    await p.goto(GESTIONALE); await p.waitForTimeout(700);
    const r = await p.evaluate(async ()=>{
      go('settings'); await new Promise(r=> setTimeout(r, 200));
      const campo = document.getElementById('dr_nome');
      const out = {campo: !!campo};
      campo.value = 'Tablet Chiara è 1'; salvaDrive();
      out.salvato = localStorage.getItem('zfl_dispositivo');
      out.nomeFile = nomeDispositivoFile();
      DB.driveUrl = 'https://script.google.com/macros/s/x/exec'; DB.driveKey = 'k';
      let corpo = null; const vf = window.fetch;
      window.fetch = async (u, o)=>{ corpo = JSON.parse(o.body); return {text: async ()=> '{"esito":"ok","salvato":"x"}'}; };
      await inviaDrive(false); window.fetch = vf;
      out.inviato = corpo && corpo.dispositivo;
      out.nonNeiDati = corpo && !('zfl_dispositivo' in corpo.dati) && !JSON.stringify(corpo.dati).includes('Tablet Chiara');
      return out;
    });
    tac.t('nelle Impostazioni c\'e\' il campo «Nome di questo dispositivo»', r.campo);
    tac.t('il nome si salva su questo dispositivo, e il file lo scrive pulito', r.salvato === 'Tablet Chiara è 1' && r.nomeFile === 'Tablet-Chiara-e-1', JSON.stringify(r));
    tac.t('il backup per Drive porta il nome del dispositivo, ma il nome non e\' nei dati', r.inviato === 'Tablet Chiara è 1' && r.nonNeiDati, JSON.stringify(r));
    await p.close();
  }
  return tac;
};
