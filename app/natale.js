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

  /* ── la slitta con le renne, in silhouette luminosa ── */
  function renna(x){
    return `<g transform="translate(${x} 0)">
      <path d="M22 24 C26 15 44 13 56 17 C62 19 64 23 62 27 C56 31 34 32 24 30 C20 29 20 26 22 24 Z"/>
      <path d="M56 18 C60 12 63 7 67 4 L71 7 C68 11 66 16 63 21 Z"/>
      <ellipse cx="71" cy="5" rx="6" ry="3.4" transform="rotate(-14 71 5)"/>
      <path d="M67 2 C65 -4 66 -9 70 -13 M66 -3 C62 -5 60 -8 60 -11 M70 -10 C73 -12 75 -15 75 -18 M70 1 C72 -5 76 -8 80 -10 M75 -6 C78 -6 81 -8 82 -11" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M58 26 L72 33 L74 31 M55 28 L66 38 L68 36 M28 27 L14 33 L12 31 M31 29 L20 39 L18 37" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 24 C17 22 15 24 16 27 C18 26 20 26 22 26 Z"/></g>`;
  }
  function slitta(){
    return `<svg class="zn-slitta" viewBox="-6 -24 360 74" aria-hidden="true">
      <g fill="#fff6e4" stroke="#fff6e4">
        ${renna(196)}${renna(130)}${renna(64)}
        <path d="M62 24 C90 20 130 20 150 22 M128 24 C160 20 196 20 214 22 M194 24 C230 20 262 20 270 22" stroke-width="1" fill="none" opacity=".8"/>
        <path d="M0 40 C10 46 46 46 58 40" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <path d="M6 38 L8 22 C8 16 14 12 22 12 L44 14 C52 14 56 20 56 26 L54 38 Z"/>
        <circle cx="20" cy="4" r="6"/><path d="M14 2 C16 -8 26 -10 30 -4 L33 -2 L30 1 C28 -2 25 -2 24 0 Z"/><circle cx="34" cy="-3" r="2.2"/>
        <path d="M12 14 C10 6 30 6 28 14 Z"/><rect x="36" y="4" width="14" height="10" rx="3"/>
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

  function neve(n, cls, r, misura, durata, sfoca){
    let h = '';
    for(let i = 0; i < n; i++){
      const s = misura[0] + r() * (misura[1] - misura[0]), t = durata[0] + r() * (durata[1] - durata[0]);
      h += `<i style="left:${(r() * 100).toFixed(2)}%; width:${s.toFixed(1)}px; height:${s.toFixed(1)}px; opacity:${(.35 + r() * .6).toFixed(2)}; animation-duration:${t.toFixed(1)}s, ${(t * .45).toFixed(1)}s; animation-delay:${(-r() * t).toFixed(1)}s, ${(-r() * 4).toFixed(1)}s${sfoca ? '; filter:blur(' + (1 + r() * 2.5).toFixed(1) + 'px)' : ''}"></i>`;
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
    strato.className = 'zn-strato' + (opt.classe ? ' ' + opt.classe : ''); strato.setAttribute('aria-hidden', 'true');
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
      ${neve(opt.neveLontana ?? 46, 'lontana', r, [1.6, 3], [16, 26], false)}
      ${neve(opt.neveMedia ?? 30, 'media', r, [3, 5.5], [11, 17], false)}
      ${opt.slitta === false ? '' : `<div class="zn-volo" style="--Wv:${W}px; --Hv:${H}px"><div class="zn-scia"></div>${slitta()}</div>`}
      ${opt.cumulo ? cumulo(W) : ''}
      ${neve(opt.neveVicina ?? 10, 'vicina', r, [7, 12], [7, 11], true)}
      ${altoG ? `<div class="zn-top" style="height:${altoG + 40}px">${ghirlanda(W, altoG, r)}</div>` : ''}
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
    return `<svg class="zn-corona" viewBox="-128 -128 256 256" aria-hidden="true">
      <defs>
        <radialGradient id="zn-alone"><stop offset="0" stop-color="#ffe7b0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe7b0" stop-opacity="0"/></radialGradient>
        <radialGradient id="zn-oro" cx=".35" cy=".35"><stop offset="0" stop-color="#fff3c4"/><stop offset=".5" stop-color="#d9ac45"/><stop offset="1" stop-color="#7a5a14"/></radialGradient>
        <linearGradient id="zn-velluto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a26a92"/><stop offset=".55" stop-color="#7a496c"/><stop offset="1" stop-color="#4b2a43"/></linearGradient>
      </defs><g>${aghi}</g>${bacche}${luci}${fiocco}</svg>`;
  }
  function smonta(host){ const s = host && host.querySelector('.zn-strato'); if(s) s.remove(); }

  /* ── lo stile, una volta sola ── */
  const CSS = `
  .zn-strato{position:absolute; inset:0; pointer-events:none; overflow:hidden; z-index:0}
  .zn-strato *{pointer-events:none}
  .zn-top{position:absolute; left:0; right:0; top:0; filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}
  .zn-ghirl{display:block; width:100%; height:100%; overflow:visible}
  .zn-l{animation:znLuce 3s ease-in-out infinite}
  @keyframes znLuce{0%,100%{opacity:1} 50%{opacity:.45}}
  .zn-appesa{position:absolute; transform-origin:50% 0; animation:znOscilla 4s ease-in-out infinite alternate; filter:drop-shadow(0 8px 10px rgba(0,0,0,.4))}
  .zn-palla{display:block}
  @keyframes znOscilla{from{transform:rotate(-4deg)} to{transform:rotate(4deg)}}
  .zn-neve{position:absolute; inset:0}
  .zn-neve i{position:absolute; top:-16px; border-radius:50%; background:radial-gradient(circle, #fff 0 45%, rgba(255,255,255,.4) 70%, transparent 72%);
    animation-name:znCade, znDondola; animation-timing-function:linear, ease-in-out; animation-iteration-count:infinite, infinite; animation-direction:normal, alternate}
  .zn-neve.vicina i{background:radial-gradient(circle, rgba(255,255,255,.95) 0 35%, rgba(255,255,255,.25) 65%, transparent 72%)}
  @keyframes znCade{to{transform:translateY(calc(100vh + 60px))}}
  .zn-strato.vetrina .zn-neve i{animation-name:znCadeV, znDondola}
  @keyframes znCadeV{to{transform:translateY(1980px)}}
  @keyframes znDondola{from{margin-left:-18px} to{margin-left:18px}}
  .zn-stelle b{position:absolute; width:14px; height:14px; animation:znBrilla 4s ease-in-out infinite;
    background:radial-gradient(circle, #fff 0 8%, transparent 9%), linear-gradient(#fff, #fff) center/1.5px 100% no-repeat, linear-gradient(#fff, #fff) center/100% 1.5px no-repeat;
    -webkit-mask:radial-gradient(circle, #000 20%, transparent 70%); mask:radial-gradient(circle, #000 20%, transparent 70%); opacity:.7}
  @keyframes znBrilla{0%,100%{opacity:.15} 50%{opacity:.85}}
  .zn-volo{position:absolute; left:0; top:16%; width:min(42%, 420px); animation:znVola 36s linear infinite; opacity:0}
  .zn-slitta{display:block; width:100%; filter:drop-shadow(0 0 6px rgba(255,236,190,.9)) drop-shadow(0 0 18px rgba(255,214,140,.5))}
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
  .zn-strato.vetrina .zn-volo{top:11.5%; width:400px}
  .zn-cumulo{position:absolute; left:0; bottom:0; width:100%; height:120px}
  .zn-stella{animation:znBrilla 2.6s ease-in-out infinite; transform-box:fill-box; transform-origin:center}
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
  .zn-corona{position:absolute; inset:-15%; width:130%; height:130%; pointer-events:none; overflow:visible; z-index:-1;
    filter:drop-shadow(0 8px 14px rgba(0,0,0,.5)); animation:znCorona 6s ease-in-out infinite}
  @keyframes znCorona{0%,100%{filter:drop-shadow(0 8px 14px rgba(0,0,0,.5)) brightness(1)} 50%{filter:drop-shadow(0 8px 14px rgba(0,0,0,.5)) brightness(1.12)}}
  html.natale #tmr.full{padding-top:52px; overflow-x:hidden}
  @media (max-width:520px){ .zn-corona{inset:-10%; width:120%; height:120%} }
  @media (prefers-reduced-motion: reduce){
    .zn-corona{animation:none}
    .zn-neve, .zn-volo{display:none} .zn-l, .zn-appesa, .zn-stelle b, .zn-stella{animation:none}
  }`;
  function stile(){
    if(document.getElementById('zn-stile')) return;
    const s = document.createElement('style'); s.id = 'zn-stile'; s.textContent = CSS; document.head.appendChild(s);
  }

  window.ZNatale = {attivo, monta, smonta, stile, corona,
    ghirlanda: (W, alto, seme) => ghirlanda(W, alto, caso(seme || 7)), pallina};
})();
