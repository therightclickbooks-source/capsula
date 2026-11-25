/* ═══════════════════════════════════════════════════════════════
   GLI ADDOBBI DI NATALE (v185) — un file solo per vetrina e gestionale
   Dal 20 novembre al 6 gennaio la vetrina e il gestionale si vestono a
   festa; il 7 gennaio tutto sparisce da solo. In Impostazioni del
   gestionale si puo' spegnere prima (DB.natale === false).
   Tutto sta su uno strato che non si tocca (pointer-events:none):
     · la ghirlanda di abete in cima, ago per ago, con le lucine calde
       e i fiocchi di velluto prugna dove si appoggia;
     · le palline di vetro appese ai lati, che oscillano piano;
     · la slitta con le renne che ogni tanto attraversa il cielo
       lasciando una scia d'oro;
     · la neve su tre piani (lontana, media, vicina e sfocata) e le stelle;
     · il cumulo di neve in fondo, con tre abeti e la loro stella.
   I colori sono quelli del marchio (prugna, nero, bianco) con l'oro delle
   feste e un solo rosso, quello delle palline e del cappello.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function attivo(d){
    d = d || new Date();
    const m = d.getMonth() + 1, g = d.getDate();
    const periodo = (m === 11 && g >= 20) || m === 12 || (m === 1 && g <= 6);
    let spento = false;
    try{ spento = (JSON.parse(localStorage.getItem('zfl_app_v1') || '{}') || {}).natale === false; }catch(e){}
    return periodo && !spento;
  }

  /* v197 · ghirlanda e corona come UNA immagine sola. Disegnate ago per ago
     dentro la pagina erano 2.500-6.700 pezzi da ricalcolare e ridipingere
     (sul totem, a ogni fiocco che passava davanti); in un'immagine il totem
     le disegna una volta e poi le appoggia, ferme, come una foto. */
  const IMMAGINI = new Map();
  function immagine(svg, cls){
    let url = IMMAGINI.get(svg);
    if(!url){
      /* l'ombra morbida sotto i rami sta DENTRO l'immagine: si calcola una
         volta sola. Come filtro della pagina (drop-shadow) il totem la
         ricalcolava a ogni fiocco che passava: era la meta' del lavoro */
      const ombra = '<filter id="zn-ombra" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000" flood-opacity=".45"/></filter>';
      const testo = svg.replace(/^\s*<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ')
        .replace('<defs>', '<defs>' + ombra).replace('</defs>', '</defs><g filter="url(#zn-ombra)">').replace(/<\/svg>\s*$/, '</g></svg>');
      try{ url = URL.createObjectURL(new Blob([testo], {type:'image/svg+xml'})); }
      catch(e){ url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(testo); }
      IMMAGINI.set(svg, url);
    }
    return `<img class="${cls}" src="${url}" alt="" aria-hidden="true" draggable="false">`;
  }

  /* un caso ripetibile: gli addobbi sono sempre uguali, non tremano a ogni ridisegno */
  function caso(seme){ let s = seme >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  /* ── la ghirlanda: festoni di abete fra punti d'appoggio ── */
  function ghirlanda(W, alto, r){
    const giunti = W > 900 ? 4 : 3;                    /* quanti festoni */
    const passo = W / giunti, cala = alto * .62;        /* quanto pende ogni festone */
    let aghi = '', luci = '', fiocchi = '';
    const verdi = ['#14382b', '#1d4b39', '#27604a', '#33765a', '#2a5a45'];
    for(let k = 0; k < giunti; k++){
      const x0 = k * passo, x1 = x0 + passo, y0 = 6, cx = (x0 + x1) / 2, cy = y0 + cala * 2;
      const P = t => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y0];
      const n = Math.round(passo / 3.2);
      for(let i = 0; i <= n; i++){
        const t = i / n, [x, y] = P(t);
        const fitto = 1 - Math.abs(t - .5) * .35;         /* piu' folto al centro */
        for(let j = 0; j < 7; j++){
          const a = (r() * 2 - 1) * Math.PI * .95 + Math.PI / 2, L = (9 + r() * 13) * fitto;
          const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L * .85;
          aghi += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${verdi[(r() * verdi.length) | 0]}" stroke-width="${(1.4 + r() * 1.2).toFixed(2)}" stroke-linecap="round"/>`;
        }
        if(i % 3 === 0 && r() < .5) aghi += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + (r() * 16 - 8)).toFixed(1)}" y2="${(y + 4 + r() * 10).toFixed(1)}" stroke="#4d8d6f" stroke-width="1" opacity=".7" stroke-linecap="round"/>`;
      }
      /* le lucine lungo il festone */
      const nl = Math.max(5, Math.round(passo / 52));
      for(let i = 1; i < nl; i++){
        const [x, y] = P(i / nl), c = ['#ffd98a', '#fff4dc', '#ffcf6e', '#f6c2dc'][i % 4];
        luci += `<g class="zn-l" style="animation-delay:${(-r() * 3).toFixed(2)}s"><circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="11" fill="url(#zn-alone)" opacity=".75"/><circle cx="${x.toFixed(1)}" cy="${(y + 5).toFixed(1)}" r="3.4" fill="${c}"/></g>`;
      }
      /* le bacche d'oro e le pigne fra gli aghi */
      for(let i = 0; i < 6; i++){
        const [x, y] = P(.1 + r() * .8);
        luci += `<circle cx="${(x + r() * 10 - 5).toFixed(1)}" cy="${(y + r() * 8).toFixed(1)}" r="${(2.2 + r() * 1.6).toFixed(1)}" fill="url(#zn-oro)"/>`;
      }
    }
    /* i fiocchi di velluto prugna dove la ghirlanda si appoggia */
    for(let k = 0; k <= giunti; k++){
      const x = Math.min(W - 26, Math.max(26, k * passo));
      fiocchi += `<g transform="translate(${x.toFixed(1)} 10) scale(${Math.min(1, alto / 80).toFixed(2)})">
        <path d="M0 0 C-18 -16 -34 -6 -30 6 C-27 15 -12 10 0 0 Z" fill="url(#zn-velluto)"/>
        <path d="M0 0 C18 -16 34 -6 30 6 C27 15 12 10 0 0 Z" fill="url(#zn-velluto)"/>
        <path d="M-2 2 C-8 16 -14 30 -10 42 L-4 38 C-6 28 -2 14 2 4 Z" fill="#5c3352"/>
        <path d="M2 2 C8 16 16 28 12 40 L6 37 C8 26 4 14 -1 4 Z" fill="#6b3d60"/>
        <ellipse cx="0" cy="1" rx="6" ry="5.5" fill="#8a5a7c"/><ellipse cx="-1.5" cy="-.5" rx="2.5" ry="1.6" fill="#c99bbb" opacity=".7"/></g>`;
    }
    return `<svg class="zn-ghirl" viewBox="0 0 ${W} ${alto + 40}" width="${W}" height="${alto + 40}" aria-hidden="true">
      <defs>
        <radialGradient id="zn-alone"><stop offset="0" stop-color="#ffe7b0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe7b0" stop-opacity="0"/></radialGradient>
        <radialGradient id="zn-oro" cx=".35" cy=".35"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#d9ac45"/><stop offset="1" stop-color="#7a5a14"/></radialGradient>
        <linearGradient id="zn-velluto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a26a92"/><stop offset=".55" stop-color="#7a496c"/><stop offset="1" stop-color="#4b2a43"/></linearGradient>
      </defs>
      <g class="zn-aghi">${aghi}</g>${luci}${fiocchi}</svg>`;
  }

  /* ── una pallina di vetro ── */
  const COLORI_PALLA = {
    prugna: ['#e6bdd8', '#8a5a7c', '#3a1f33'], oro: ['#fff2c2', '#d4a83f', '#6e4f10'],
    perla: ['#ffffff', '#e5dde3', '#8f8290'], rosso: ['#ff9c9c', '#b3202d', '#4a0b12']
  };
  function pallina(col, R, filo, decoro){
    const [c0, c1, c2] = COLORI_PALLA[col], id = 'zp' + Math.random().toString(36).slice(2, 7);
    const H = filo + R * 2 + 14, W = R * 2 + 8;
    const fascia = decoro === 'fascia'
      ? `<path d="M${4 + R * .08} ${filo + 12 + R} q${R * .92} ${R * .34} ${R * 1.84} 0" stroke="#f3dc8a" stroke-width="${R * .09}" fill="none" opacity=".9"/><path d="M${4 + R * .2} ${filo + 12 + R * .62} q${R * .8} ${R * .26} ${R * 1.6} 0" stroke="#f3dc8a" stroke-width="${R * .04}" fill="none" opacity=".6"/>`
      : decoro === 'stelle'
      ? [[.6, .9], [1.2, 1.3], [.9, 1.55], [1.45, .85]].map(([a, b]) => `<path d="M${4 + R * a} ${filo + 12 + R * b - 3}l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#fff6d8" opacity=".9"/>`).join('')
      : '';
    return `<svg class="zn-palla" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true" style="--f:${filo}px">
      <defs><radialGradient id="${id}" cx=".34" cy=".3" r=".75"><stop offset="0" stop-color="${c0}"/><stop offset=".45" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs>
      <line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${filo + 4}" stroke="#d9b65e" stroke-width="1.2" opacity=".8"/>
      <rect x="${W / 2 - R * .22}" y="${filo + 2}" width="${R * .44}" height="10" rx="2" fill="url(#zn-cap)"/>
      <circle cx="${W / 2}" cy="${filo + 12 + R}" r="${R}" fill="url(#${id})"/>
      ${fascia}
      <ellipse cx="${W / 2 - R * .38}" cy="${filo + 12 + R * .55}" rx="${R * .22}" ry="${R * .13}" fill="#fff" opacity=".75" transform="rotate(-35 ${W / 2 - R * .38} ${filo + 12 + R * .55})"/>
      <circle cx="${W / 2 + R * .42}" cy="${filo + 12 + R * 1.4}" r="${R * .07}" fill="#fff" opacity=".45"/>
    </svg>`;
  }

  /* ── la slitta con le renne (v187: disegnate dal vero) ──
     Ogni renna ha il corpo pieno (garrese, petto profondo, groppa), il collo
     con la gola, il muso lungo, l'orecchio, i palchi ramificati che salgono
     all'indietro e la coda corta. Le zampe hanno due pose del galoppo
     (raccolte e distese) che si alternano: le renne corrono davvero, e
     ognuna ha il suo tempo. Davanti alla slitta: Babbo Natale col sacco,
     il pattino che si arriccia in punta, le redini fino al collare. */
  function renna(x, y, k, fase, guida){
    /* una zampa: coscia scura e spessa, canna piu' chiara e sottile, zoccolo nero */
    const zampa = (a, b, c, lontana) => `<path d="M${a} L${b}" fill="none" stroke="${lontana ? '#3e2716' : '#5e3b22'}" stroke-width="3.8" stroke-linecap="round"/>`
      + `<path d="M${b} L${c}" fill="none" stroke="${lontana ? '#6d5a48' : '#a08a72'}" stroke-width="2.2" stroke-linecap="round"/>`
      + `<ellipse cx="${c.split(' ')[0]}" cy="${c.split(' ')[1]}" rx="2.1" ry="1.5" fill="#1d1510"/>`;
    const posa = (cl, L) => `<g class="${cl}">${L.map(([a, b, c, far]) => zampa(a, b, c, far)).join('')}</g>`;
    const A = [['55 33', '60 44', '69 50', 1], ['22 33', '16 44', '6 51', 1], ['59 31', '66 41', '76 46', 0], ['17 30', '12 41', '1 47', 0]];
    const B = [['55 33', '58 45', '53 54', 1], ['22 33', '28 44', '35 52', 1], ['59 31', '64 42', '60 52', 0], ['17 30', '22 42', '29 51', 0]];
    const lontane = l => l.filter(z => z[3]), vicine = l => l.filter(z => !z[3]);
    return `<g class="zn-renna" transform="translate(${x} ${y}) scale(${k})" style="--f:${fase}s">
      ${posa('zn-zA', lontane(A))}${posa('zn-zB', lontane(B))}
      <g class="zn-corpo">
        <path d="M14 21 C10 18 7 19 6 22 C9 22.5 12 23.5 14 25 Z" fill="#efe6d6"/>
        <path d="M14 23 C13 18 19 16 27 17 C37 18 47 16 54 15 C58 14 60 11 62 7 L65 0 C66 -3 69 -4 71 -3 C74 -2 78 2 81 5 C83 7 82 9 80 9 L74 8 C71 9 69 11 67 14 C65 21 63 28 59 32 C55 35 47 35 40 34 C32 34 23 35 18 33 C14 31 13 27 14 23 Z" fill="url(#zr-pelo)"/>
        <path d="M18 31 C26 33 40 33 52 32 C55 31.5 57 30 58 28 C52 30.5 34 31 18 28 Z" fill="#cdb99b" opacity=".8"/>
        <path d="M60 11 C66 15 66.5 23 62.5 31 C59.5 27 58.5 18 58.5 12 Z" fill="#efe6d6"/>
        <path d="M61 14 C63 17 63.5 21 62 25" fill="none" stroke="#d8c8ae" stroke-width=".9"/>
        <path d="M74 8 C77 8.6 80 9 81 7.5 C82.5 6.5 82 4.5 80.5 3.8 C79 5 77 6.5 74 8 Z" fill="#4a3020"/>
        <ellipse cx="81.2" cy="5.8" rx="1.6" ry="1.3" fill="${guida ? '#d8282f' : '#1a1210'}"/>
        <circle cx="72.6" cy="1.4" r="1.05" fill="#140c08"/><circle cx="72.9" cy="1.1" r=".35" fill="#fff"/>
        <path d="M68 -1 L72.5 -6.5 L72 0.5 Z" fill="#6b4428"/><path d="M69.4 -1.2 L72 -4.6 L71.6 -.4 Z" fill="#c9928a"/>
        <g fill="none" stroke-linecap="round">
          <g stroke="#b99464" stroke-width="2.1"><path d="M71 -3 C70 -11 67.5 -17 62 -23 M69 -11 C71 -15 74 -17 77 -17.5 M66.5 -17 C67.5 -21 69.5 -24 72.5 -25.5"/></g>
          <g stroke="#d9be8e" stroke-width="2.3"><path d="M69 -2 C66 -10 62 -16 55 -21 M66 -9 C66 -14 68 -17 71 -20 M62.5 -14 C61.5 -18 62.5 -22 65 -25 M58.5 -17.5 C56.5 -20 55.5 -23 56 -27 M70 -3 C73 -7 76 -8 79 -7"/></g>
          <g stroke="#f3e5c4" stroke-width=".7" opacity=".8"><path d="M68.6 -3 C66 -10 62 -15.6 56 -20 M66 -10 C66.4 -14 68 -16.5 70.6 -19"/></g>
        </g>
        <path d="M58.5 9.5 C62.5 14 65.5 16.5 68.5 15.5" fill="none" stroke="#b3202d" stroke-width="3"/>
        <path d="M58.5 9.5 C62.5 14 65.5 16.5 68.5 15.5" fill="none" stroke="#e8505a" stroke-width=".8" opacity=".7"/>
        <circle cx="63" cy="14.2" r="1.6" fill="url(#zr-oro)"/><circle cx="66.5" cy="15.8" r="1.6" fill="url(#zr-oro)"/>
        <path d="M41 16.5 C41.5 22 41.5 28 41 33.8" fill="none" stroke="#b3202d" stroke-width="3"/>
        <circle cx="41.2" cy="19" r="1.4" fill="url(#zr-oro)"/>
        <path d="M27 18.5 C31 17.5 36 17.3 41 17" fill="none" stroke="#fff" stroke-width=".8" opacity=".25"/>
      </g>
      ${posa('zn-zA', vicine(A))}${posa('zn-zB', vicine(B))}
    </g>`;
  }
  function slitta(){
    /* quattro renne in due coppie: le lontane un po' piu' in alto e piccole;
       la prima ha il naso rosso */
    const R = [[318, 2, 1, 0, 1], [238, -3, .93, -.27], [158, 1, 1, -.13], [78, -4, .93, -.4]];
    const redine = R.map(([x, y, k]) => `M38 12 C${x - 30} ${4 + y} ${x + 30 * k} ${y + 8 * k} ${(x + 62 * k).toFixed(1)} ${(y + 12 * k).toFixed(1)}`).join(' ');
    return `<svg class="zn-slitta" viewBox="-8 -32 420 92" aria-hidden="true">
      <defs>
        <linearGradient id="zr-pelo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3820"/><stop offset=".5" stop-color="#835534"/><stop offset="1" stop-color="#a47a55"/></linearGradient>
        <radialGradient id="zr-oro" cx=".35" cy=".35"><stop offset="0" stop-color="#fff3c4"/><stop offset=".55" stop-color="#d9ac45"/><stop offset="1" stop-color="#7a5a14"/></radialGradient>
        <linearGradient id="zs-legno" x1="0" y1="0" x2="1" y2=".15">
          <stop offset="0" stop-color="#5e3a1c"/><stop offset=".18" stop-color="#8f5d2e"/><stop offset=".3" stop-color="#734822"/><stop offset=".5" stop-color="#a06a37"/>
          <stop offset=".66" stop-color="#7c4f27"/><stop offset=".82" stop-color="#9b6633"/><stop offset="1" stop-color="#5e3a1c"/></linearGradient>
        <linearGradient id="zs-rosso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d63a44"/><stop offset="1" stop-color="#7e121c"/></linearGradient>
        <linearGradient id="zs-sacco" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c49a62"/><stop offset="1" stop-color="#7d5a32"/></linearGradient>
        <radialGradient id="zs-viso" cx=".4" cy=".4"><stop offset="0" stop-color="#f7d6bd"/><stop offset="1" stop-color="#e0a888"/></radialGradient>
      </defs>
      <path d="${redine}" fill="none" stroke="#3a2414" stroke-width=".8" opacity=".9"/>
      ${R.map(([x, y, k, f, g]) => renna(x, y, k, f, g)).join('')}
      <g class="zn-slitta-c">
        <path d="M37 20 C35 10 41 4 48 7 C53 10 53 17 50 21 Z" fill="url(#zs-sacco)"/>
        <path d="M40 9 C43 6.5 46 7 47.5 8.8" fill="none" stroke="#5a3f20" stroke-width="1.2"/>
        <path d="M42 14 C44 12 47 13 48 16 M39.5 17 C41 15.5 43 16 44 18" fill="none" stroke="#6b4a26" stroke-width=".7" opacity=".7"/>
        <rect x="44" y="2.5" width="7" height="6" rx=".6" fill="#2f6b4a" transform="rotate(12 47.5 5.5)"/>
        <path d="M47.6 2.6 L46.4 8.4 M44.4 5 L50.6 6.2" stroke="#e7c35a" stroke-width="1" transform="rotate(12 47.5 5.5)"/>
        <path d="M16 23 C15 13 19 8 26 8.5 C32 9 35.5 13 35.5 23 Z" fill="url(#zs-rosso)"/>
        <path d="M25.5 9 L25.5 23" stroke="#fbf6ee" stroke-width="2.6"/>
        <path d="M16.3 18.5 C22 19.5 30 19.5 35.2 18.5" stroke="#1d1510" stroke-width="2.4" fill="none"/>
        <rect x="23.6" y="17" width="4" height="3.2" rx=".6" fill="none" stroke="#e7c35a" stroke-width="1"/>
        <path d="M30 12 C34 13 37 13.5 40 12.5" stroke="#9e1b26" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M37.5 11.5 L38.5 14" stroke="#fbf6ee" stroke-width="2.2"/>
        <circle cx="40.6" cy="12.3" r="1.9" fill="#1d1510"/>
        <circle cx="25" cy="2.5" r="5" fill="url(#zs-viso)"/>
        <path d="M20.6 3 C20.5 9 23 12.5 25.6 13 C28.4 12.5 30.8 9.2 30.2 3.2 C28.8 5 27.5 5.6 25.5 5.4 C23.5 5.6 21.9 4.8 20.6 3 Z" fill="#fbf8f2"/>
        <path d="M22.8 5.2 C24 4 25 4.4 25.6 5 C26.2 4.4 27.3 4 28.4 5.2 C27 6 26 5.9 25.6 5.6 C25.1 5.9 24.1 6 22.8 5.2 Z" fill="#ffffff"/>
        <circle cx="25.8" cy="3.4" r="1" fill="#e59686"/><circle cx="23.6" cy="1.2" r=".6" fill="#2a1a12"/><circle cx="27.8" cy="1.2" r=".6" fill="#2a1a12"/>
        <path d="M20 -.5 C20.5 -7.5 27 -11 33 -6.5 C35 -5 36.5 -3 37 -.8 C34.5 -3 32 -3.2 30.5 -1.8 C29 -.5 25 -1 20 -.5 Z" fill="url(#zs-rosso)"/>
        <path d="M19.4 -.2 C23 -1.6 27.5 -1.8 31.2 -.6" stroke="#fbf6ee" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        <circle cx="37.4" cy="-.4" r="2.2" fill="#fbf6ee"/>
        <path d="M-1 47.5 L48 47.5 C58 47.5 63 43.5 62 37.5 C61.4 34 58 33.5 56.5 36" fill="none" stroke="#2b1c10" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M-1 46.6 L48 46.6 C57 46.6 61.6 43 61 38" fill="none" stroke="#d9ac45" stroke-width=".8" opacity=".9"/>
        <path d="M10 47 L12 39 M36 47 L35 39" stroke="#4b2f17" stroke-width="2.4"/>
        <path d="M3 39 C0 31 2 22 6 18 L8 9 C8.5 5 13 5 13.5 9 L14.5 20 L42 22 C50 22 55 26 57 30 C58.5 34 56.5 39 52 39 Z" fill="url(#zs-legno)" stroke="#3b2412" stroke-width=".8"/>
        <path d="M7.5 9.5 C8 7 12.5 7 12.8 9.5 L13.6 19" fill="none" stroke="#b3202d" stroke-width="1.8"/>
        <path d="M8 25 C16 23 32 24 47 25.5 C51 26 53.5 29 53 32 C52.6 35 50 36 46 36 L8 36 C6 33 6.5 28 8 25 Z" fill="url(#zs-rosso)"/>
        <path d="M8 25 C16 23 32 24 47 25.5 C51 26 53.5 29 53 32 C52.6 35 50 36 46 36 L8 36 C6 33 6.5 28 8 25 Z" fill="none" stroke="#e7c35a" stroke-width=".9"/>
        <path d="M17 30.5 C19 28 22.5 28 23 30.5 C23.4 32.5 20.5 33.2 19.6 31.4 M37 30.5 C35 28 31.5 28 31 30.5 C30.6 32.5 33.5 33.2 34.4 31.4" fill="none" stroke="#e7c35a" stroke-width=".8"/>
        <path d="M5 20 C6 16 7 13 7.5 11" fill="none" stroke="#c48c55" stroke-width=".8" opacity=".6"/>
        <path d="M14.5 20 L42 22 C46 22.2 49 23.2 51.5 24.6" fill="none" stroke="#c48c55" stroke-width=".9" opacity=".7"/>
      </g></svg>`;
  }

  /* ── il cumulo di neve con tre abeti ── */
  function cumulo(W){
    const abete = (x, h) => `<g transform="translate(${x} ${118 - h})">
      <path d="M0 ${h} L${h * .32} ${h * .62} L${h * .16} ${h * .64} L${h * .28} ${h * .38} L${h * .12} ${h * .4} L0 ${h * .08} L${-h * .12} ${h * .4} L${-h * .28} ${h * .38} L${-h * .16} ${h * .64} L${-h * .32} ${h * .62} Z" fill="#163a2c"/>
      <path d="M0 ${h * .08} L${-h * .12} ${h * .4} L${-h * .04} ${h * .37} Z M${-h * .16} ${h * .64} L${-h * .32} ${h * .62} L${-h * .1} ${h * .58} Z" fill="#eef3f6" opacity=".85"/>
      <path class="zn-stella" d="M0 -9 l2.6 5.6 6 .8 -4.4 4.2 1.1 6 -5.3-2.9 -5.3 2.9 1.1-6 -4.4-4.2 6-.8z" fill="#f3dc8a"/></g>`;
    return `<svg class="zn-cumulo" viewBox="0 0 ${W} 120" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="zn-neve-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9cfdc"/></linearGradient></defs>
      ${abete(W * .06, 86)}${abete(W * .115, 58)}${abete(W * .92, 74)}
      <path d="M0 92 C${W * .12} 70 ${W * .22} 96 ${W * .36} 88 C${W * .5} 80 ${W * .62} 100 ${W * .76} 90 C${W * .86} 82 ${W * .94} 92 ${W} 84 L${W} 120 L0 120 Z" fill="url(#zn-neve-g)" opacity=".92"/>
      <path d="M0 98 C${W * .2} 90 ${W * .4} 104 ${W * .6} 96 C${W * .8} 90 ${W * .9} 100 ${W} 94" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/></svg>`;
  }

  /* v188 · la neve leggera: ogni fiocco scende e dondola solo con
     spostamenti (transform e translate), che la scheda grafica muove da sola;
     niente margini che si muovono e niente sfocature. I fiocchi vicini sono
     morbidi gia' nel disegno. Sul totem ne bastano meno. */
  function neve(n, cls, r, misura, durata){
    let h = '';
    for(let i = 0; i < n; i++){
      const s = misura[0] + r() * (misura[1] - misura[0]), t = durata[0] + r() * (durata[1] - durata[0]);
      h += `<i style="left:${(r() * 100).toFixed(2)}%; width:${s.toFixed(1)}px; height:${s.toFixed(1)}px; opacity:${(.35 + r() * .6).toFixed(2)}; --dx:${((i * 37) % 61) - 30}px; animation-duration:${t.toFixed(1)}s, ${(t * .45).toFixed(1)}s; animation-delay:${(-r() * t).toFixed(1)}s, ${(-r() * 4).toFixed(1)}s"></i>`;
    }
    return `<div class="zn-neve ${cls}">${h}</div>`;
  }

  /* ══ monta: host e' l'elemento che riempie lo schermo (o la vetrina) ══
     opt.W/opt.H: misure in punti · opt.cumulo: il cumulo in fondo ·
     opt.palline: quante per lato · opt.ghirlanda: altezza della ghirlanda */
  function monta(host, opt){
    smonta(host);
    opt = opt || {};
    const W = opt.W || host.clientWidth || innerWidth, H = opt.H || host.clientHeight || innerHeight, r = caso(opt.seme || 2512);
    const strato = document.createElement('div');
    strato.className = 'zn-strato' + (opt.classe ? ' ' + opt.classe : '') + (opt.leggera ? ' zn-leggera' : ''); strato.setAttribute('aria-hidden', 'true');
    /* v197 · sul totem: niente slitta, meta' dei fiocchi, palline ferme */
    const meno = n => opt.senzaNeve ? 0 : opt.leggera ? Math.round(n * .45) : n;
    const altoG = opt.ghirlanda ?? 70;
    /* le palline: appese ai lati, a lunghezze diverse, mai sopra i contenuti */
    let palline = '';
    const tipi = [['prugna', 'fascia'], ['oro', ''], ['rosso', 'stelle'], ['perla', 'fascia'], ['prugna', 'stelle'], ['oro', 'fascia']];
    const quante = opt.palline ?? 3, R0 = opt.raggio || 22;
    for(let lato = 0; lato < 2; lato++) for(let i = 0; i < quante; i++){
      const [col, dec] = tipi[(i * 2 + lato) % tipi.length];
      const R = R0 * (.7 + r() * .55), filo = opt.fili ? opt.fili[i] * (.9 + r() * .2) : (opt.filo || 90) * (.5 + i * .55 + r() * .3);
      const passo = opt.passo || R0 * 2.2;
      const x = lato ? W - (opt.margine || 18) - i * passo - R * 2 - 8 : (opt.margine || 18) + i * passo;
      palline += `<div class="zn-appesa" style="left:${x.toFixed(0)}px; top:${(opt.cima ?? altoG * .35).toFixed(0)}px; animation-duration:${(3.6 + r() * 2.4).toFixed(1)}s; animation-delay:${(-r() * 4).toFixed(1)}s">${pallina(col, R, filo, dec)}</div>`;
    }
    let stelle = '';
    for(let i = 0; i < (opt.stelle ?? 22); i++) stelle += `<b style="left:${(r() * 100).toFixed(1)}%; top:${(8 + r() * 34).toFixed(1)}%; animation-delay:${(-r() * 4).toFixed(1)}s; transform:scale(${(.5 + r() * .9).toFixed(2)})"></b>`;
    strato.innerHTML = `
      <div class="zn-stelle">${stelle}</div>
      ${neve(meno(opt.neveLontana ?? 46), 'lontana', r, [1.6, 3], [16, 26])}
      ${neve(meno(opt.neveMedia ?? 30), 'media', r, [3, 5.5], [11, 17])}
      ${opt.slitta === false || opt.leggera ? '' : `<div class="zn-volo" style="--Wv:${W}px; --Hv:${H}px"><div class="zn-scia"></div>${slitta()}</div>`}
      ${opt.cumulo ? cumulo(W) : ''}
      ${neve(meno(opt.neveVicina ?? 10), 'vicina', r, [7, 12], [7, 11])}
      ${altoG ? `<div class="zn-top" style="height:${altoG + 40}px">${immagine(ghirlanda(W, altoG, r), 'zn-ghirl')}</div>` : ''}
      ${palline}`;
    if(opt.dopo) opt.dopo.after(strato); else host.appendChild(strato);
    return strato;
  }

  /* ── la corona d'abete intorno all'orologio: la stessa ghirlanda chiusa in
     cerchio, con le lucine e il fiocco prugna in basso. viewBox -128..128:
     il quadrante dell'orologio arriva a 91, la corona sta fra 93 e 120 ── */
  function corona(seme){
    const r = caso(seme || 1225), verdi = ['#14382b', '#1d4b39', '#27604a', '#33765a', '#2a5a45'];
    let aghi = '', luci = '', bacche = '';
    const R = 106, n = 300;
    for(let i = 0; i < n; i++){
      const a = i / n * Math.PI * 2, cx = Math.cos(a) * R, cy = Math.sin(a) * R;
      for(let j = 0; j < 6; j++){
        const d = a + (r() * 2 - 1) * 1.3 + (r() < .5 ? Math.PI / 2 : -Math.PI / 2) * .35, L = 6 + r() * 9;
        const ox = (r() * 2 - 1) * 4, oy = (r() * 2 - 1) * 4;
        aghi += `<line x1="${(cx + ox).toFixed(1)}" y1="${(cy + oy).toFixed(1)}" x2="${(cx + ox + Math.cos(d) * L).toFixed(1)}" y2="${(cy + oy + Math.sin(d) * L).toFixed(1)}" stroke="${verdi[(r() * verdi.length) | 0]}" stroke-width="${(1.1 + r()).toFixed(2)}" stroke-linecap="round"/>`;
      }
    }
    for(let i = 0; i < 22; i++){
      const a = i / 22 * Math.PI * 2 + .07, x = Math.cos(a) * (R + (i % 2 ? 6 : -6)), y = Math.sin(a) * (R + (i % 2 ? 6 : -6));
      if(Math.abs(a - Math.PI * 1.5) < .3) continue;    /* li' c'e' il fiocco, in cima */
      const c = ['#ffd98a', '#fff4dc', '#ffcf6e', '#f6c2dc'][i % 4];
      luci += `<g class="zn-l" style="animation-delay:${(-r() * 3).toFixed(2)}s"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="url(#zn-alone)" opacity=".8"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="${c}"/></g>`;
    }
    for(let i = 0; i < 14; i++){
      const a = r() * Math.PI * 2, d = R + (r() * 2 - 1) * 8;
      bacche += `<circle cx="${(Math.cos(a) * d).toFixed(1)}" cy="${(Math.sin(a) * d).toFixed(1)}" r="${(1.6 + r() * 1.4).toFixed(1)}" fill="url(#zn-oro)"/>`;
    }
    const fiocco = `<g transform="translate(0 ${-R - 2}) scale(.78)">
        <path d="M0 0 C-18 -16 -34 -6 -30 6 C-27 15 -12 10 0 0 Z" fill="url(#zn-velluto)"/>
        <path d="M0 0 C18 -16 34 -6 30 6 C27 15 12 10 0 0 Z" fill="url(#zn-velluto)"/>
        <path d="M-2 2 C-8 14 -14 22 -12 30 L-6 27 C-7 20 -3 12 2 4 Z" fill="#5c3352"/>
        <path d="M2 2 C8 14 14 22 12 30 L6 27 C7 20 3 12 -1 4 Z" fill="#6b3d60"/>
        <ellipse cx="0" cy="1" rx="6" ry="5.5" fill="#8a5a7c"/><ellipse cx="-1.5" cy="-.5" rx="2.5" ry="1.6" fill="#c99bbb" opacity=".7"/></g>`;
    return immagine(`<svg class="zn-corona" viewBox="-128 -128 256 256" width="256" height="256" aria-hidden="true">
      <defs>
        <radialGradient id="zn-alone"><stop offset="0" stop-color="#ffe7b0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe7b0" stop-opacity="0"/></radialGradient>
        <radialGradient id="zn-oro" cx=".35" cy=".35"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#d9ac45"/><stop offset="1" stop-color="#7a5a14"/></radialGradient>
        <linearGradient id="zn-velluto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a26a92"/><stop offset=".55" stop-color="#7a496c"/><stop offset="1" stop-color="#4b2a43"/></linearGradient>
      </defs><g>${aghi}</g>${bacche}${luci}${fiocco}</svg>`, 'zn-corona');
  }
  function smonta(host){ const s = host && host.querySelector('.zn-strato'); if(s) s.remove(); }

  /* ── lo stile, una volta sola ── */
  const CSS = `
  .zn-strato{position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:0}
  .zn-strato *{pointer-events:none}
  .zn-top{position:absolute; left:0; right:0; top:0}
  .zn-ghirl{display:block; width:100%; height:100%; overflow:visible}
  /* v187: le lucine restano accese, ferme: un bagliore caldo e morbido, niente intermittenza */
  .zn-l{opacity:.95}
  .zn-appesa{position:absolute; transform-origin:50% 0; animation:znOscilla 4s ease-in-out infinite alternate; will-change:transform}
  .zn-palla{display:block}
  @keyframes znOscilla{from{transform:rotate(-4deg)} to{transform:rotate(4deg)}}
  .zn-neve{position:absolute; inset:0}
  .zn-neve i{position:absolute; top:-16px; border-radius:50%; background:radial-gradient(circle, #fff 0 40%, rgba(255,255,255,.45) 62%, transparent 72%);
    animation-name:znCade, znDondola; animation-timing-function:linear, ease-in-out; animation-iteration-count:infinite, infinite; animation-direction:normal, alternate}
  .zn-neve.vicina i{background:radial-gradient(circle, rgba(255,255,255,.85) 0, rgba(255,255,255,.45) 35%, rgba(255,255,255,.12) 60%, transparent 72%)}
  @keyframes znCade{to{transform:translateY(calc(100vh + 60px))}}
  .zn-strato.vetrina .zn-neve i{animation-name:znCadeV, znDondola}
  @keyframes znCadeV{to{transform:translateY(1980px)}}
  @keyframes znDondola{from{translate:-18px 0} to{translate:18px 0}}
  .zn-stelle b{position:absolute; width:14px; height:14px;
    background:radial-gradient(circle, #fff 0 8%, transparent 9%), linear-gradient(#fff, #fff) center/1.5px 100% no-repeat, linear-gradient(#fff, #fff) center/100% 1.5px no-repeat;
    -webkit-mask:radial-gradient(circle, #000 20%, transparent 70%); mask:radial-gradient(circle, #000 20%, transparent 70%); opacity:.55}
  .zn-volo{position:absolute; left:0; top:16%; width:min(48%, 480px); animation:znVola 36s linear infinite; opacity:0; will-change:transform, opacity}
  /* v187: a colori, con un filo di luce di luna sul bordo per staccarsi dal cielo scuro */
  .zn-slitta{display:block; width:100%; filter:drop-shadow(0 4px 5px rgba(0,0,0,.45))}
  /* il galoppo: due pose delle zampe che si alternano, e il corpo che sale e scende */
  .zn-renna .zn-zA, .zn-renna .zn-zB{animation:znPasso .5s steps(1, end) infinite; animation-delay:var(--f)}
  .zn-renna .zn-zB{animation-name:znPasso2}
  @keyframes znPasso{0%{opacity:1} 50%{opacity:0}}
  @keyframes znPasso2{0%{opacity:0} 50%{opacity:1}}
  .zn-scia{position:absolute; right:88%; top:52%; width:120%; height:3px; border-radius:3px;
    background:linear-gradient(90deg, transparent, rgba(243,220,138,.0) 10%, rgba(243,220,138,.75) 85%, #fff6d8);
    box-shadow:0 0 12px rgba(243,220,138,.6); transform:rotate(4deg); transform-origin:100% 50%}
  .zn-scia::before, .zn-scia::after{content:""; position:absolute; top:-6px; width:3px; height:3px; border-radius:50%; background:#fff6d8;
    box-shadow:30px 8px 0 #f3dc8a, 70px -6px 0 #fff, 120px 10px 0 #f3dc8a, 170px -4px 0 #fff6d8, 230px 6px 0 #f3dc8a}
  .zn-scia::before{left:20%} .zn-scia::after{left:45%; top:10px; opacity:.7}
  @keyframes znVola{
    0%{transform:translate(-110%, 40px) rotate(-6deg); opacity:0}
    3%{opacity:1}
    18%{transform:translate(calc(var(--Wv) * .45), -10px) rotate(-3deg); opacity:1}
    33%{transform:translate(calc(var(--Wv) + 40px), -70px) rotate(-8deg); opacity:1}
    34%, 100%{transform:translate(calc(var(--Wv) + 40px), -70px); opacity:0}}
  .zn-strato.vetrina .zn-volo{top:10.8%; width:470px}
  .zn-cumulo{position:absolute; left:0; bottom:0; width:100%; height:120px}
  /* v197 · la versione leggera del totem: palline ferme, e ogni fiocco con
     una sola animazione (scende e scivola un poco di lato insieme) */
  .zn-strato.zn-leggera .zn-appesa{animation:none}
  .zn-strato.zn-leggera .zn-neve i{animation-name:znCadeL; animation-timing-function:linear; animation-iteration-count:infinite}
  .zn-strato.zn-leggera.vetrina{--cad:1980px}
  @keyframes znCadeL{to{transform:translate(var(--dx, 0px), var(--cad, calc(100vh + 60px)))}}
  .zn-stella{opacity:.95}
  /* il cappello di Babbo Natale sulla Z del logo (gestionale e vetrina) */
  html.natale .logowrap, html.natale .logobox{position:relative}
  html.natale .logowrap::before, html.natale .logobox::before{content:""; position:absolute; left:-7%; top:-44%; width:27%; aspect-ratio:1.15; z-index:3; pointer-events:none;
    transform:rotate(-16deg); filter:drop-shadow(0 3px 4px rgba(0,0,0,.45));
    background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 115 100'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23e8434f'/%3E%3Cstop offset='1' stop-color='%23981a26'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M14 78C22 40 46 12 78 10c14-1 26 8 30 22-10-6-22-6-30 2-10 10-12 28-12 44z' fill='url(%23a)'/%3E%3Cpath d='M78 10c14-1 26 8 30 22-10-6-22-6-30 2' fill='%237e1520'/%3E%3Crect x='6' y='70' width='70' height='20' rx='10' fill='%23fff'/%3E%3Crect x='10' y='72' width='62' height='5' rx='2.5' fill='%23e9e4ea'/%3E%3Ccircle cx='106' cy='36' r='10' fill='%23fff'/%3E%3C/svg%3E")}
  /* ── nel gestionale: la neve sui bordi dei riquadri principali ── */
  html.natale .quad, html.natale .qbox{position:relative}
  html.natale .quad::after, html.natale .qbox::after{content:""; position:absolute; left:18px; right:18px; top:-6px; height:12px; opacity:.92;
    pointer-events:none; z-index:4; filter:drop-shadow(0 2px 2px rgba(0,0,0,.3));
    background:no-repeat center top/100% 100% url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 20' preserveAspectRatio='none'%3E%3Cpath d='M0 9C12 2 26 1 40 6S64 2 80 5 108 0 124 6 150 3 168 7 196 1 214 5 240 2 258 7 284 1 302 6 330 2 346 6 374 1 400 8V12C392 14 386 13 380 18 376 13 366 13 352 13 346 17 340 13 320 13 312 15 300 12 270 12 262 18 256 12 230 13 210 12 190 13 176 13 168 19 162 13 140 12 112 13 96 12 90 16 84 12 60 13 36 13 28 17 22 12 0 12Z' fill='%23ffffff'/%3E%3Cpath d='M10 8C40 3 80 4 120 6S220 3 280 5 360 3 392 7' stroke='%23e9e1ea' stroke-width='1.2' fill='none'/%3E%3C/svg%3E")}
  html.light.natale .quad::after, html.light.natale .qbox::after{filter:drop-shadow(0 1px 2px rgba(58,40,66,.35))}
  /* la ghirlanda e le palline in cima alla scheda del protocollo */
  .zn-phead{position:absolute !important; left:0; right:0; top:0; height:0; pointer-events:none; z-index:3 !important}
  .zn-phead .zn-top{position:absolute; left:0; right:0; top:-4px}
  html.natale .proposal .phead, html.natale .phead{padding-top:50px}
  /* l'orologio: corona intorno al quadrante, ghirlanda, palline e neve dietro */
  html #tmr.full > .zn-strato.timer{position:fixed; inset:0; z-index:0}
  html.natale #tmr.full .tm-top{z-index:2}
  .zn-corona{position:absolute; inset:-15%; width:130%; height:130%; pointer-events:none; overflow:visible; z-index:-1}
  html.natale #tmr.full{padding-top:52px; overflow-x:hidden}
  @media (max-width:520px){ .zn-corona{inset:-10%; width:120%; height:120%} }
  @media (prefers-reduced-motion: reduce){
    .zn-corona{animation:none}
    .zn-neve, .zn-volo{display:none} .zn-appesa{animation:none}
  }`;
  function stile(){
    if(document.getElementById('zn-stile')) return;
    const s = document.createElement('style'); s.id = 'zn-stile'; s.textContent = CSS; document.head.appendChild(s);
  }

  window.ZNatale = {attivo, monta, smonta, stile, corona,
    ghirlanda: (W, alto, seme) => immagine(ghirlanda(W, alto, caso(seme || 7)), 'zn-ghirl'), pallina};
})();
