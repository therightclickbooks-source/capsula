/* ═══════════════════════════════════════════════════════════════
   IL SERVICE WORKER DI ZENITH (v189)
   Serve solo a una cosa: far riconoscere a Chrome il sito come
   un'applicazione da installare, cosi' sul totem si apre dall'icona a
   schermo intero, senza la barra degli indirizzi.
   Non tiene in memoria versioni vecchie: ogni pagina e ogni file si
   chiedono SEMPRE a internet (rete prima). Solo se internet manca si
   usa l'ultima copia scaricata, cosi' la vetrina non resta bianca.
   ═══════════════════════════════════════════════════════════════ */
const CASSETTO = 'zenith-riserva';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if(r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(risp => {
      if(risp && risp.ok){ const copia = risp.clone(); caches.open(CASSETTO).then(c => c.put(r, copia)).catch(() => {}); }
      return risp;
    }).catch(() => caches.match(r).then(v => v || caches.match(r, {ignoreSearch:true})).then(v => v || Response.error()))
  );
});
