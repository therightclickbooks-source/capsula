/* ═══════════════════════════════════════════════════════════════
   GLI ATTREZZI DELLE PROVE
   Tre cose sole: dove stanno i due file, come si apre il browser, e
   come si segna un verde o un rosso. Tutto il resto sta nelle prove.

   Una regola che vale per tutte le misure di questo cartella:
   sulla vetrina il foglio e' disegnato su una tela 1080 e poi
   RIMPICCIOLITO con transform:scale(). getBoundingClientRect() dice i
   punti dello schermo, non quelli della tela, e quindi mente. Si
   misura con offsetTop / offsetHeight / offsetWidth, che sono in punti
   di tela, oppure con getBBox() dentro un SVG.
   ═══════════════════════════════════════════════════════════════ */
const path = require('path');

const RADICE = path.resolve(__dirname, '..');
const GESTIONALE = 'file://' + path.join(RADICE, 'app', 'index.html');
const VETRINA    = 'file://' + path.join(RADICE, 'app', 'totem', 'index.html');

/* i formati su cui la vetrina deve reggere: il totem vero, il monitor
   in orizzontale, e i due telefoni con cui si guarda l'anteprima */
const SCHERMI = [
  {n:'totem 1080x1920', w:1080, h:1920},
  {n:'monitor 16:9',    w:1920, h:1080},
  {n:'monitor 1280',    w:1280, h:800},
  {n:'iPhone',          w:390,  h:844},
  {n:'Android',         w:412,  h:915}
];

function playwright(){
  try { return require('playwright'); }
  catch(e){
    console.error('Manca playwright. Installalo, oppure indica dove sta:\n'
      + '  NODE_PATH=/percorso/node_modules node test/esegui.js');
    process.exit(2);
  }
}

/* Chromium: si prende quello indicato in CHROME_PATH, se c'e'. Senza,
   quello che playwright si e' scaricato da solo. */
async function apriBrowser(){
  const { chromium } = playwright();
  const opz = {};
  if(process.env.CHROME_PATH) opz.executablePath = process.env.CHROME_PATH;
  return chromium.launch(opz);
}

/* Il taccuino: conta i verdi, stampa solo i rossi. Una prova che passa
   non ha niente da raccontare; una che fallisce deve dire cosa si
   aspettava, se no il rosso non serve a niente. */
class Taccuino {
  constructor(titolo){ this.titolo = titolo; this.verdi = 0; this.rossi = []; }
  t(nome, ok, dettaglio){
    if(ok) this.verdi++;
    else this.rossi.push(nome + (dettaglio ? ' → ' + dettaglio : ''));
  }
  /* apre una pagina, raccoglie gli errori di javascript e li fa
     diventare rossi: una pagina che esplode in silenzio e' il modo
     piu' facile per avere una prova verde su un'app rotta */
  async pagina(browser, url, schermo){
    const p = await browser.newPage({viewport:{width:schermo.w, height:schermo.h}});
    p.on('pageerror', e => this.rossi.push('errore di pagina su ' + schermo.n + ': ' + e.message));
    await p.goto(url);
    await p.waitForTimeout(700);
    return p;
  }
  stampa(){
    console.log('── ' + this.titolo + ' · ' + this.verdi + ' verdi · ' + this.rossi.length + ' rossi');
    this.rossi.forEach(r => console.log('   ROSSO · ' + r));
    return this.rossi.length;
  }
}

module.exports = { RADICE, GESTIONALE, VETRINA, SCHERMI, apriBrowser, Taccuino };
