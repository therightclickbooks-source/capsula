/* ═══════════════════════════════════════════════════════════════
   CHI SEGUE QUESTA SEDUTA
   La domanda zero del check-in nel gestionale. I nomi stanno in fila,
   uno accanto all'altro, come sul totem: una colonna di righe alte si
   prendeva mezzo schermo per tre nomi, e chi la guardava doveva
   scorrere un elenco invece di riconoscere una faccia.
   Le due cose che si rompono da sole se qualcuno tocca la griglia:
   il numero di file (tre nomi devono starci in una), e i nomi lunghi,
   che in una colonna stretta escono dalla scheda senza dare errore.
   ═══════════════════════════════════════════════════════════════ */
const { GESTIONALE, Taccuino } = require('./aiuto');

const NOMI = ['Raffaele','Eliana','Chiara','Mariagrazia','Gennaro','Vincenzo'];
const COLORI = ['#5fd08a','#d9a3e0','#e6b45c','#8fd3ec','#ef8a5c','#b98adf'];

function archivio(quanti){
  const operators = NOMI.slice(0, quanti).map((n,i)=>({id:'o'+i, nome:n, color:COLORI[i]}));
  return {codeHash:'x', codeLen:4, sessions:[], checkins:[], operators, opAttivo:'o0',
    clients:[{id:'c1', nome:'Eliana', cognome:'Prova', telefono:'3330000000',
              anamnesi:{}, cal:0}]};
}

module.exports = async function(browser){
  const tac = new Taccuino('chi segue questa seduta');

  for(const schermo of [{n:'telefono', w:390, h:844}, {n:'desktop', w:1280, h:860}]){
    for(const quanti of [2, 3, 6]){
      const p = await browser.newPage({viewport:{width:schermo.w, height:schermo.h}});
      p.on('pageerror', e => tac.rossi.push('errore di pagina: ' + e.message));
      await p.addInitScript(d => {
        try{ localStorage.setItem('zfl_app_v1', JSON.stringify(d)); }catch(e){}
      }, archivio(quanti));
      await p.goto(GESTIONALE);
      await p.waitForTimeout(600);
      await p.evaluate(()=>{
        quizState = {clientId:'c1', step:0, operatore:null, activity:null, zone:null,
          zones:[], goal:null, mood:null, pressione:null, prefSoloAria:false};
        VIEW = {name:'quiz'}; render();
      });
      await p.waitForTimeout(250);

      const m = await p.evaluate(()=>{
        const c = [...document.querySelectorAll('.opcard')];
        if(!c.length) return null;
        const nm = c.map(e => e.querySelector('.nm'));
        return {n:c.length, righe:new Set(c.map(e => e.offsetTop)).size,
          larg:c[0].offsetWidth, alt:c[0].offsetHeight,
          sborda: nm.some(e => e.scrollWidth > e.clientWidth + 1),
          avSopra: c[0].querySelector('.av').offsetTop < nm[0].offsetTop};
      });
      const q = schermo.n + ' con ' + quanti + ' operatori: ';
      if(!m){ tac.t(q + 'la domanda zero compare', false, 'nessuna scheda'); await p.close(); continue; }

      tac.t(q + 'ci sono tutti', m.n === quanti, String(m.n));
      tac.t(q + 'i nomi stanno in fila, non in colonna',
        quanti <= 3 ? m.righe === 1 : m.righe <= 2, m.righe + ' file');
      tac.t(q + 'la faccia sta sopra il nome, come sul totem', m.avSopra);
      tac.t(q + 'nessun nome esce dalla sua scheda', !m.sborda);
      /* una scheda alta piu' che larga vuol dire che e' tornata una riga */
      tac.t(q + 'le schede sono affiancate, non impilate',
        m.alt < m.larg * 2.2, m.larg + 'x' + m.alt);
      await p.close();
    }
  }
  return tac;
};
