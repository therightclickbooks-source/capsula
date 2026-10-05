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
  /* ── i check-in dal totem: eliminare (con conferma), doppioni, serbatoio, ripristino ── */
  {
    const p = await browser.newPage({viewport:{width:1100, height:800}});
    p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
    await p.addInitScript(()=>{ const now = Date.now(); const mk = (id,n,c,min)=> ({id, nome:n, cognome:c, op:'o1', quando:new Date(now - min*60000).toISOString(), quiz:{activity:'matrix', zmode:'totale', zones:[], goal:'recupero', mood:'sereno'}});
      try{ localStorage.setItem('zfl_app_v1', JSON.stringify({codeHash:'x', codeLen:4, clients:[], sessions:[], operators:[{id:'o1', nome:'Raffaele'}],
        checkins:[mk('k1','Serena','Cecco',3), mk('k2','Serena','Cecco',6), mk('k3','Eliana','Cascone',23), mk('k4','Eliana','Cascone',37), mk('k5','Marco','Rossi',50)]})); }catch(e){} });
    await p.goto(GESTIONALE); await p.waitForTimeout(800);
    const r = await p.evaluate(()=>{
      const o = {}; const q = s => document.querySelector(s);
      o.righe = document.querySelectorAll('.cwline').length; o.tasti = document.querySelectorAll('.cwline .del').length;
      o.bollini = document.querySelectorAll('.cwline .dopp').length;
      o.dopp = doppioniCheckin().slice().sort().join(',');
      o.btnDopp = /Elimina i 2 doppioni/.test(q('.ckwait .cw-x').textContent);
      /* eliminare chiede conferma e non toglie niente da solo */
      chiediEliminaCheckin('k5');
      o.conferma = q('#modal').classList.contains('open') && /Eliminare questo check-in/.test(q('#modal').textContent) && /Marco Rossi/.test(q('#modal').textContent);
      o.primaDellaConferma = DB.checkins.length;
      eliminaCheckin('k5');
      o.dopo = DB.checkins.length; o.nelSerbatoio = (DB.checkinEliminati||[]).map(k=>k.id).join(',');
      o.serbatoioVisibile = !!q('.tank') && /1 check-in eliminato/.test(q('.tank').textContent);
      /* i doppioni: si tiene il piu' recente */
      chiediEliminaDoppioni(); o.confDopp = /Serena Cecco/.test(q('#modal').textContent) && /Eliana Cascone/.test(q('#modal').textContent);
      eliminaDoppioni();
      o.restano = DB.checkins.map(k=>k.id).sort().join(',');
      o.serbatoioDopo = (DB.checkinEliminati||[]).length;
      /* ripristino */
      ripristinaCheckin('k2');
      o.ripristinato = DB.checkins.some(k=> k.id === 'k2') && !(DB.checkinEliminati||[]).some(k=> k.id === 'k2') && !('eliminatoIl' in DB.checkins.find(k=> k.id === 'k2'));
      /* un vecchio, dopo sette giorni, se ne va dal serbatoio */
      DB.checkinEliminati.push({id:'vecchio', nome:'Vecchio', cognome:'Check', quando:new Date().toISOString(), eliminatoIl:new Date(Date.now() - 8*86400000).toISOString()});
      o.scaduto = serbatoioPulisci().some(k=> k.id === 'vecchio') === false;
      /* uno eliminato molto tempo dopo averlo creato, ripristinato, non sparisce subito */
      DB.checkinEliminati.push({id:'tardi', nome:'Tardi', cognome:'Check', quando:new Date(Date.now() - 9*3600000).toISOString(), eliminatoIl:new Date().toISOString()});
      ripristinaCheckin('tardi'); o.tardi = checkinAttesa().some(k=> k.id === 'tardi');
      /* svuotare chiede conferma */
      chiediSvuotaSerbatoio(); o.confSvuota = /per sempre/.test(q('#modal').textContent);
      svuotaSerbatoio(); o.svuotato = (DB.checkinEliminati||[]).length === 0;
      return o;
    });
    tac.t('ogni check-in ha il suo tasto «Elimina», e i doppioni hanno il bollino', r.righe === 5 && r.tasti === 5 && r.bollini === 2 && r.dopp === 'k2,k4' && r.btnDopp, JSON.stringify(r));
    tac.t('eliminare chiede conferma e non toglie niente prima', r.conferma && r.primaDellaConferma === 5, JSON.stringify(r));
    tac.t('l\'eliminato finisce nel serbatoio, che compare', r.dopo === 4 && r.nelSerbatoio === 'k5' && r.serbatoioVisibile, JSON.stringify(r));
    tac.t('i doppioni: conferma, e si tiene il check-in piu\' recente di ognuno', r.confDopp && r.restano === 'k1,k3' && r.serbatoioDopo === 3, JSON.stringify(r));
    tac.t('si ripristina un check-in eliminato', r.ripristinato, JSON.stringify(r));
    tac.t('dopo sette giorni il serbatoio lo butta, e un vecchio ripristinato non sparisce subito', r.scaduto && r.tardi, JSON.stringify(r));
    tac.t('svuotare il serbatoio chiede conferma («per sempre»)', r.confSvuota && r.svuotato, JSON.stringify(r));
    await p.close();
  }
  /* ── i check-in in attesa stanno dentro la cornice, su ogni schermo: telefono, tablet in piedi, pc, totem in verticale ── */
  for(const sc of [{n:'iPhone', w:390, h:844}, {n:'Android', w:412, h:915}, {n:'tablet 3:4', w:768, h:1024}, {n:'tablet 10:16', w:800, h:1280},
                   {n:'monitor 1280', w:1280, h:800}, {n:'monitor 16:9', w:1920, h:1080}, {n:'totem verticale', w:1080, h:1920}]){
    const p = await browser.newPage({viewport:{width:sc.w, height:sc.h}});
    p.on('pageerror', e => tac.rossi.push('errore di pagina su ' + sc.n + ': ' + e.message));
    await p.addInitScript(()=>{ const now = Date.now(); const mk = (id,n,c,min,act,zm,goal,mood)=> ({id, nome:n, cognome:c, op:'o1', quando:new Date(now - min*60000).toISOString(), quiz:{activity:act, zmode:zm, zones:[], goal, mood}});
      try{ localStorage.setItem('zfl_app_v1', JSON.stringify({codeHash:'x', codeLen:4, clients:[], sessions:[], operators:[{id:'o1', nome:'Raffaele'}],
        checkinEliminati:[{...mk('e1','Marco','Rossi',130,'ems','totale','recupero','stanco'), eliminatoIl:new Date(now - 7200000).toISOString()}],
        checkins:[mk('k1','Serena','Cecco',3,'matrix','totale','recupero','sereno'), mk('k2','Serena','Cecco',6,'ems2','nessuna','drenaggio','stanco'), mk('k3','Maria Antonietta','Cascone di Savoia',23,'ems2','totale','sollievo','dolorante')]})); }catch(e){} });
    await p.goto(GESTIONALE); await p.waitForTimeout(800);
    const r = await p.evaluate(()=>{
      const w = document.querySelector('.ckwait').getBoundingClientRect(); const o = {fuori:[], sovrapposti:0, orizzontale: document.documentElement.scrollWidth - innerWidth};
      document.querySelectorAll('.ckwait .cwline, .ckwait .cwline *, .ckwait .cw-x *, .ckwait .tank, .ckwait .tank *').forEach(e=>{ const b = e.getBoundingClientRect();
        if(b.width && (b.right > w.right + 0.5 || b.left < w.left - 0.5)) o.fuori.push((e.className || e.tagName).toString()); });
      /* i bollini non devono finire sotto «Apri · quanto tempo fa» */
      document.querySelectorAll('.ckwait .cwline').forEach(l=>{ const tx = l.querySelector('.cw-tx').getBoundingClientRect(), tt = l.querySelector('.cw-t').getBoundingClientRect();
        l.querySelectorAll('.cw-n > span').forEach(b=>{ if(b.getBoundingClientRect().right > tt.left + 0.5 && b.getBoundingClientRect().right > tx.right + 0.5) o.sovrapposti++; }); });
      return o; });
    tac.t(sc.n + ': i check-in e il tasto «Elimina» restano dentro la cornice', r.fuori.length === 0 && r.sovrapposti === 0 && r.orizzontale <= 2, JSON.stringify(r));
    await p.close();
  }
  return tac;
};
