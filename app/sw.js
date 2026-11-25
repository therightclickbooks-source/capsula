/* ═══════════════════════════════════════════════════════════════
   IL SERVICE WORKER DI ZENITH (v189)
   Serve solo a una cosa: far riconoscere a Chrome il sito come
   un'applicazione da installare, cosi' sul totem si apre dall'icona a
   schermo intero, senza la barra degli indirizzi.
   Non tiene in memoria versioni vecchie: ogni pagina e ogni file si
   chiedono SEMPRE a internet (rete prima). Solo se internet manca si
   usa l'ultima copia scaricata, cosi' la vetrina non resta bianca.
   ═══════════════════════════════════════════════════════════════ */
/* v196 · un cassetto nuovo: quello di prima si era riempito di copie
   vecchie (una per ogni controllo della versione) e se ne butta via */
const CASSETTO = 'zenith-riserva-2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(n => n !== CASSETTO).map(n => caches.delete(n)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const r = e.request;
  if(r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  /* il controllo della versione nuova («no-store») va dritto a internet:
     se la rete manca non deve mai ricevere la copia di riserva, che e'
     vecchia (era l'avviso «e' uscita la v189» rimasto fermo sul totem) */
  if(r.cache === 'no-store') return;
  /* una copia sola per file, senza il «?v=…»: e' sempre l'ultima scaricata */
  const u = new URL(r.url); u.search = ''; const chiave = u.href;
  e.respondWith(
    /* «no-cache»: il browser chiede sempre a GitHub se il file e' cambiato.
       Senza, per 10 minuti dopo ogni apertura teneva la copia vecchia e la
       versione nuova non compariva nemmeno ricaricando. */
    fetch(r.mode === 'navigate' ? new Request(r.url, {cache:'no-cache', credentials:'same-origin'}) : new Request(r, {cache:'no-cache'})).then(risp => {
      if(risp && risp.ok){ const copia = risp.clone(); caches.open(CASSETTO).then(c => c.put(chiave, copia)).catch(() => {}); }
      return risp;
    }).catch(() => caches.match(chiave).then(v => v || Response.error()))
  );
});
