/* ═══════════════════════════════════════════════════════════════
   CHI SEGUE QUESTA SEDUTA
   La domanda dell'operatore: nel gestionale e' la domanda zero del
   check-in, sul totem e' il primo passo. In tutt'e due i nomi stanno
   UNO SOTTO L'ALTRO, una riga per nome, come tutte le altre domande.
   Non e' una preferenza di forma: chi scende dalla prima domanda alla
   sesta non deve trovare un salto — una griglia in mezzo a cinque
   elenchi sembra un'altra app, e l'occhio si ferma a capire invece di
   rispondere.
   Le due cose che si rompono da sole se qualcuno tocca la griglia: il
   numero di colonne, e i nomi lunghi, che stretti escono dalla riga
   senza dare errore.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, VETRINA, Taccuino } = require('./aiuto');

const NOMI = ['Raffaele','Eliana','Chiara','Mariagrazia','Gennaro','Vincenzo'];
const COLORI = ['#5fd08a','#d9a3e0','#e6b45c','#8fd3ec','#ef8a5c','#b98adf'];

function archivio(quanti){
  const operators = NOMI.slice(0, quanti).map((n,i)=>({id:'o'+i, nome:n, color:COLORI[i]}));
  return {codeHash:'x', codeLen:4, sessions:[], checkins:[], operators, opAttivo:'o0',
    clients:[{id:'c1', nome:'Eliana', cognome:'Prova', telefono:'3330000000',
              anamnesi:{}, cal:0}]};
}

/* una colonna sola: tutte le schede cominciano allo stesso x, e ognuna
   sta su una riga sua */
function inColonna(m){
  return m.colonne === 1 && m.righe === m.n;
}

module.exports = async function(browser){
  const tac = new Taccuino('chi segue questa seduta');

  async function apri(url, quanti, schermo, prepara){
    const p = await browser.newPage({viewport:{width:schermo.w, height:schermo.h}});
    p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
    await p.addInitScript(d => {
      try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){}
    }, archivio(quanti));
    await p.goto(url);
    await p.waitForTimeout(600);
    await p.evaluate(prepara);
    await p.waitForTimeout(300);
    return p;
  }

  const misura = p => p.evaluate(()=>{
    const c = [...document.querySelectorAll('.opcard')];
    if(!c.length) return null;
    const nm = c.map(e => e.querySelector('.nm'));
    return {n:c.length,
      righe:new Set(c.map(e => e.offsetTop)).size,
      colonne:new Set(c.map(e => e.offsetLeft)).size,
      larg:c[0].offsetWidth, alt:c[0].offsetHeight,
      sborda: nm.some(e => e.scrollWidth > e.clientWidth + 1),
      avAccanto: Math.abs(c[0].querySelector('.av').offsetTop - nm[0].offsetTop) < 40};
  });

  /* ── il gestionale ── */
  for(const schermo of [{n:'telefono', w:390, h:844}, {n:'desktop', w:1280, h:860}]){
    for(const quanti of [2, 3, 6]){
      const p = await apri(GESTIONALE, quanti, schermo, ()=>{
        quizState = {clientId:'c1', step:0, operatore:null, activity:null, zone:null,
          zones:[], goal:null, mood:null, pressione:null, prefSoloAria:false};
        VIEW = {name:'quiz'}; render();
      });
      const m = await misura(p);
      const q = 'gestionale su ' + schermo.n + ' con ' + quanti + ': ';
      if(!m){ tac.t(q + 'la domanda dell\'operatore compare', false, 'nessuna scheda'); await p.close(); continue; }
      tac.t(q + 'ci sono tutti', m.n === quanti, String(m.n));
      tac.t(q + 'i nomi stanno uno sotto l\'altro', inColonna(m),
        m.colonne + ' colonne, ' + m.righe + ' righe');
      tac.t(q + 'la faccia sta accanto al nome, non sopra', m.avAccanto);
      tac.t(q + 'nessun nome esce dalla sua riga', !m.sborda);
      await p.close();
    }
  }

  /* ── la vetrina ── */
  for(const quanti of [2, 3, 6]){
    const p = await apri(VETRINA, quanti, {w:1080, h:1920}, ()=>{
      go('form'); D.nome = 'Prova'; PASSO = 1; disegnaPasso();
    });
    const m = await misura(p);
    const q = 'vetrina con ' + quanti + ': ';
    if(!m){ tac.t(q + 'il passo dell\'operatore compare', false, 'nessuna scheda'); await p.close(); continue; }
    tac.t(q + 'ci sono tutti', m.n === quanti, String(m.n));
    tac.t(q + 'i nomi stanno uno sotto l\'altro', inColonna(m),
      m.colonne + ' colonne, ' + m.righe + ' righe');
    tac.t(q + 'la faccia sta accanto al nome, non sopra', m.avAccanto);
    tac.t(q + 'nessun nome esce dalla sua riga', !m.sborda);
    /* la riga dell'operatore deve essere alta come quelle delle altre
       domande: se no il primo passo si vede diverso dai cinque dopo */
    const altreDomande = await p.evaluate(async ()=>{
      PASSO = 2; disegnaPasso();
      await new Promise(z=> setTimeout(z, 250));
      const o = document.querySelector('.opt');
      return o ? o.offsetHeight : null;
    });
    tac.t(q + 'le righe sono alte come quelle delle altre domande',
      altreDomande !== null && Math.abs(m.alt - altreDomande) <= 2,
      m.alt + ' contro ' + altreDomande);
    await p.close();
  }

  return tac;
};
