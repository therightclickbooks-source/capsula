/* ═══════════════════════════════════════════════════════════════
   IL GESTIONALE SUL TOTEM DA 49 POLLICI (v184)
   Il totem e' Android, in verticale, 60 × 107 cm. Con la modalita' totem
   accesa la pagina si disegna larga 820 punti e Chrome la ingrandisce
   fino a riempire lo schermo: prima stava in una colonna stretta, coi
   testi del telefono e due terzi dello schermo vuoti. Sul telefono, e sul
   totem con la modalita' spenta, non cambia niente.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, Taccuino } = require('./aiuto');

function archivio(totem){
  const anamnesi = {certificatoOk:false};
  ['a1','a2','a3','a4','a5','a6','b1','b2','b3','b4','b5','b6','b7','b8','b9'].forEach(k=> anamnesi[k] = false);
  return {codeHash:'x', codeLen:4, totemMode:totem,
    clients:[{id:'c1', nome:'Eliana', cognome:'Prova', telefono:'3330000000', anamnesi, cal:0}],
    sessions:[{id:'s0', clientId:'c1', date:'2026-01-01T10:00:00.000Z', prog:'P04', settings:{fourD:2, airbag:2, timer:20}}],
    operators:[], checkins:[]};
}
async function apri(browser, misura, totem){
  const ctx = await browser.newContext({viewport:misura, screen:misura, isMobile:true, hasTouch:true, deviceScaleFactor:1});
  const p = await ctx.newPage();
  await p.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio(totem));
  await p.goto(GESTIONALE); await p.waitForTimeout(700);
  return {ctx, p};
}
const misura = p => p.evaluate(() => ({largo: innerWidth, classe: document.documentElement.classList.contains('totem-grande'),
  fuori: document.documentElement.scrollWidth > innerWidth + 1}));

module.exports = async function(browser){
  const tac = new Taccuino('il gestionale sul totem');
  const errori = [];

  /* 1 · il totem, modalita' totem accesa */
  { const {ctx, p} = await apri(browser, {width:1080, height:1920}, true);
    p.on('pageerror', e => errori.push(e.message));
    const m = await misura(p);
    tac.t('sul totem la pagina si disegna larga 820 punti e si ingrandisce fino a riempire lo schermo', m.largo === 820 && m.classe && !m.fuori, JSON.stringify(m));
    /* le domande del check-in scendono verso il centro, all'altezza della mano */
    const q = await p.evaluate(() => { quizState = {clientId:'c1', step:0, zones:[], seq:0}; VIEW = {name:'quiz'}; render();
      const r = document.querySelector('.qbox').getBoundingClientRect(); return {cima: r.top, alto: innerHeight}; });
    tac.t('sul totem le domande non stanno in cima: partono più in basso, verso il centro', q.cima > q.alto * 0.15, JSON.stringify(q));
    /* spegnendo la modalita' totem si torna alla misura normale */
    const spento = await p.evaluate(() => { DB.totemMode = false; render(); return document.querySelector('meta[name=viewport]').content; });
    tac.t('spenta la modalità totem, la pagina torna alla misura normale', /width=device-width/.test(spento), spento);
    await ctx.close(); }

  /* 2 · il telefono, anche con la modalita' totem accesa per sbaglio */
  { const {ctx, p} = await apri(browser, {width:390, height:844}, true);
    p.on('pageerror', e => errori.push(e.message));
    const m = await misura(p);
    tac.t('sul telefono non cambia niente, nemmeno con la modalità totem accesa', m.largo === 390 && !m.classe && !m.fuori, JSON.stringify(m));
    await ctx.close(); }

  /* 3 · un tablet in verticale con la modalita' totem: resta com'era */
  { const {ctx, p} = await apri(browser, {width:1024, height:1366}, true);
    const m = await misura(p);
    tac.t('su un tablet in verticale resta com\'era', m.largo === 1024 && !m.classe, JSON.stringify(m));
    await ctx.close(); }

  /* 4 · v191 · il totem vero: la ToolBox ruota lo schermo di 90° e Android
     dichiara le misure coricate (screen piu' largo che alto) anche se la
     pagina e' in verticale. Prima l'ingrandimento non scattava. */
  { const ctx = await browser.newContext({viewport:{width:1215, height:2160}, screen:{width:2160, height:1215}, isMobile:true, hasTouch:true, deviceScaleFactor:1});
    const p = await ctx.newPage();
    p.on('pageerror', e => errori.push(e.message));
    await p.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio(true));
    await p.goto(GESTIONALE); await p.waitForTimeout(700);
    const m = await misura(p);
    tac.t('sul totem con lo schermo dichiarato coricato la pagina si ingrandisce lo stesso (820 punti)', m.largo === 820 && m.classe && !m.fuori, JSON.stringify(m));
    await ctx.close(); }

  /* 5 · v191 · se l'ingrandimento non c'e' (schermo largo), le Impostazioni
     non si schiacciano in una striscia accanto alla barra di lato */
  { const {ctx, p} = await apri(browser, {width:1440, height:1600}, true);
    p.on('pageerror', e => errori.push(e.message));
    const w = await p.evaluate(() => { VIEW = {name:'settings'}; render();
      const a = document.getElementById('app'), cs = getComputedStyle(a);
      return Math.round(a.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)); });
    tac.t('le Impostazioni restano larghe anche sullo schermo grande non ingrandito', w >= 600, 'larghezza utile ' + w);
    await ctx.close(); }

  /* 6 · v193 · se Chrome non ingrandisce la pagina (resta larga 1600), la
     rete di sicurezza la ingrandisce da se': il protocollo prende tutto lo
     schermo invece di restare una colonna stretta in mezzo */
  { const ctx = await browser.newContext({viewport:{width:1600, height:2844}, isMobile:false, hasTouch:true, deviceScaleFactor:1});
    const p = await ctx.newPage();
    p.on('pageerror', e => errori.push(e.message));
    await p.addInitScript(d => { try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){} }, archivio(true));
    await p.goto(GESTIONALE); await p.waitForTimeout(700);
    const r = await p.evaluate(async () => {
      quizState = {clientId:'c1', activity:'riposo', giornata:'scrivania', goal:'relax', zones:['lombare'], mood:'stressato', pressione:'media', prefSoloAria:false};
      NAV = [{name:'home'}]; VIEW = {name:'proposal'}; render();
      await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)));
      const q = document.querySelector('.qd, .quadrante, #app .card') || document.getElementById('app');
      const b = q.getBoundingClientRect();   /* gia' in punti dello schermo, zoom compreso */
      return {riserva: document.documentElement.classList.contains('totem-largo'), largo: Math.round(b.width), schermo: innerWidth};
    });
    tac.t('sul totem che non ingrandisce, il protocollo prende comunque tutta la larghezza', r.riserva && r.largo > r.schermo * 0.85 && r.largo <= r.schermo + 2, JSON.stringify(r));
    await ctx.close(); }

  tac.t('nessun errore di pagina', !errori.length, errori.join(' | '));
  return tac;
};
