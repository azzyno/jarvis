/* =====================================================================
   JARVIS · OBSIDIAN-OBERFLÄCHE
   Neue Zentrale mit lebendem Kern, Live-Kacheln (Wetter, Börsen,
   Weltlage, Route, Konto, Büro), Aurora-Hintergrund, Dock-Navigation.
   Alle Zahlen kommen live aus echten Quellen; ohne Daten: „—“.
   ===================================================================== */
(function () {
  const J = window.J; if (!J) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const V = () => window.JARVIS || {};

  // Alter 3D-Avatar bleibt aus (spart Akku und Rechenzeit, damit die Stimme flüssig bleibt)
  try { Object.defineProperty(window, '__holoPause', { get: () => true, set() {}, configurable: true }); } catch (e) {}

  /* ---------- Hintergrund ---------- */
  const bg = document.createElement('div'); bg.id = 'osBg'; bg.innerHTML = '<i></i><i></i><i></i><canvas></canvas>';
  document.body.prepend(bg);
  const bc = bg.querySelector('canvas'), bx = bc.getContext('2d');
  const dots = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .00012, vy: (Math.random() - .5) * .00012 }));
  let bgOn = true;
  function bgFrame() {
    const dpr = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = innerHeight;
    if (bc.width !== w * dpr) { bc.width = w * dpr; bc.height = h * dpr; }
    bx.setTransform(dpr, 0, 0, dpr, 0, 0); bx.clearRect(0, 0, w, h);
    for (const d of dots) { d.x = (d.x + d.vx + 1) % 1; d.y = (d.y + d.vy + 1) % 1; }
    bx.lineWidth = .6;
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i], ax = a.x * w, ay = a.y * h;
      for (let j = i + 1; j < dots.length; j++) {
        const b = dots[j], dx = ax - b.x * w, dy = ay - b.y * h, dd = dx * dx + dy * dy;
        if (dd < 22000) { bx.strokeStyle = `rgba(160,190,255,${.12 * (1 - dd / 22000)})`; bx.beginPath(); bx.moveTo(ax, ay); bx.lineTo(b.x * w, b.y * h); bx.stroke(); }
      }
      bx.fillStyle = 'rgba(200,220,255,.35)'; bx.fillRect(ax - .8, ay - .8, 1.6, 1.6);
    }
  }

  /* ---------- Dock-Navigation ---------- */
  const nav = $('#nav'); const pill = document.createElement('i'); pill.id = 'osPill'; nav.prepend(pill);
  function movePill() { const b = nav.querySelector('button.on'); if (!b) { pill.style.opacity = 0; return; } pill.style.opacity = 1; pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 6}px)`; pill.style.left = '6px'; }

  /* ---------- Emojis aus Knöpfen entfernen (ruhigeres Bild) ---------- */
  const EMO = /^\s*(?:[\p{Extended_Pictographic}←-⇿⌀-⏿■-➿⬀-⯿]️?‍?)+\s*/u;
  const tc = w => w.toLowerCase().replace(/(^|[\s\-\/(·])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Und|Oder|Der|Die|Das|Mit|Von|Nach|Pro|Im|In|Am|Zu|Je|Ohne|Für|Nur|Auf|Des|Dein|Deine|Deines)\b/g, x => x.toLowerCase()).replace(/^./, c => c.toUpperCase()).replace(/\b(Etf|Etfs|Ch|Usa|Smi|Saxo|Ai|Ki)\b/g, x => ({ Etf: 'ETF', Etfs: 'ETFs', Ch: 'CH', Usa: 'USA', Smi: 'SMI', Saxo: 'Saxo', Ai: 'AI', Ki: 'KI' }[x]));
  function cleanTitles(root = document) {
    root.querySelectorAll('.ct').forEach(ct => { const t = [...ct.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t && /^[^a-zäöü]+$/.test(t.textContent.trim())) t.textContent = tc(t.textContent.trim()) + ' '; });
    root.querySelectorAll('.card[style*="border-color"]').forEach(c => c.style.removeProperty('border-color'));
    root.querySelectorAll('.ct[style*="color"]').forEach(c => c.style.removeProperty('color'));
  }
  function cleanLabels(root = document) {
    cleanTitles(root);
    root.querySelectorAll('button, .btn, a.btn, .obar button, .lg-bar button').forEach(b => {
      const t = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t && EMO.test(t.textContent)) t.textContent = t.textContent.replace(EMO, '');
    });
  }

  /* ---------- Zentrale ---------- */
  const sec = $('#v-cockpit');
  const home = document.createElement('div'); home.id = 'osHome';
  const IC = {
    wx: '<svg viewBox="0 0 24 24"><path d="M7 18a4 4 0 1 1 .6-7.95A6 6 0 0 1 19 12a3 3 0 0 1-1 5.83V18H7z"/></svg>',
    mk: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
    car: '<svg viewBox="0 0 24 24"><path d="M5 16V11l2-5h10l2 5v5M5 16h14M5 16v2M19 16v2M7.5 13h.01M16.5 13h.01"/></svg>',
    bank: '<svg viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>',
    room: '<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-4h6v4"/></svg>',
    go: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };
  home.innerHTML = `
    <div class="os-top"><div><div class="os-date" id="osDate"></div><div class="os-hi" id="osHi"></div></div>
      <div class="os-clock"><span id="osClock">--:--</span><small>ZÜRICH</small></div></div>
    <div class="os-orbwrap" id="osOrbWrap" role="button" aria-label="Mit JARVIS sprechen"><canvas id="osOrb"></canvas></div>
    <div class="os-state" id="osState" data-s="off"><i></i><span>Tippen Sie auf den Kern, um zu sprechen</span></div>
    <div class="os-ctl"><button id="osMute" hidden>Stumm</button><button id="osEnd" hidden>Beenden</button><button id="osLog">Protokoll</button></div>
    <div class="os-say" id="osSay"></div>
    <form class="os-ask" id="osAsk" autocomplete="off"><input id="osAskIn" placeholder="Fragen Sie JARVIS …" enterkeyhint="send"><button type="submit" aria-label="Senden">${IC.go}</button></form>
    <div class="os-chips" id="osChips">
      <button data-ask="Wie ist die Weltlage gerade?">Weltlage jetzt</button>
      <button data-ask="Wie ist der Verkehr nach Genf?">Verkehr nach Genf</button>
      <button data-ask="Wie wird das Wetter morgen in Zürich?">Wetter morgen</button>
      <button data-ask="Wie steht mein Saxo-Konto?">Mein Konto</button>
      <button data-ask="Ich will nach Berlin.">Nach Berlin</button>
    </div>
    <div class="os-sec"><h2>Live-Lage</h2><span id="osStamp">—</span></div>
    <div class="os-grid">
      <button class="os-tile" id="tWx" style="animation-delay:.05s"><div class="os-k">${IC.wx}Zürich<span class="live">LIVE</span></div><div id="tWxB"><span class="os-shim" style="width:60%"></span><span class="os-shim" style="width:40%"></span></div><canvas class="os-spark" id="tWxS"></canvas></button>
      <button class="os-tile" id="tMk" style="animation-delay:.1s"><div class="os-k">${IC.mk}Börsen<span class="live">LIVE</span></div><div class="os-mk" id="tMkB"></div></button>
      <button class="os-tile w2 os-lage-t" id="tLage" style="animation-delay:.15s"><div class="os-k">${IC.globe}Weltlage<span class="live" id="tLageN">LIVE</span></div><ul class="os-news" id="tLageB"><li><span class="os-shim" style="width:90%"></span></li><li><span class="os-shim" style="width:75%"></span></li></ul><span class="os-go">${IC.go}</span></button>
      <div class="os-tile w2" id="tRoute" style="animation-delay:.2s;cursor:default"><div class="os-k">${IC.car}Route mit Live-Verkehr</div>
        <form class="os-route" id="osRoute"><input id="osRouteIn" placeholder="Wohin, Master?" enterkeyhint="go"><button type="submit">Los</button></form>
        <div class="os-route-q"><span>Genf</span><span>Bern</span><span>Basel</span><span>Luzern</span><span>Mailand</span><span>Berlin</span></div></div>
      <button class="os-tile" id="tSx" style="animation-delay:.25s"><div class="os-k">${IC.bank}Saxo-Konto</div><div id="tSxB"><div class="os-big" style="font-size:30px">—</div><div class="os-sub">Wird geladen …</div></div><span class="os-go">${IC.go}</span></button>
      <button class="os-tile os-office" id="tOff" style="animation-delay:.3s"><div class="os-k" style="color:#dfe3ff">${IC.room}3D</div><div class="os-big">Investment-<br>Büro betreten</div><span class="os-go">${IC.go}</span></button>
    </div>
    <div class="os-sec"><h2>Vermögen</h2><span>PORTFOLIO</span></div>`;
  sec.prepend(home);

  /* Kopfzeile: Uhr, Datum, Begrüssung */
  function tickClock() {
    const now = new Date();
    $('#osClock').textContent = now.toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' });
    $('#osDate').textContent = now.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long' });
    const h = +now.toLocaleString('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', hour12: false });
    const g = h < 5 ? 'Gute Nacht' : h < 11 ? 'Guten Morgen' : h < 17 ? 'Guten Tag' : h < 22 ? 'Guten Abend' : 'Gute Nacht';
    const hi = `${g},<br><em>Master.</em>`; if ($('#osHi').innerHTML !== hi) $('#osHi').innerHTML = hi;
  }

  /* Sprechen */
  const STXT = { off: 'Tippen Sie auf den Kern, um zu sprechen', busy: 'Verbinde …', err: 'Fehler – nochmals tippen', listening: 'Ich höre zu, Master', speaking: 'JARVIS spricht', muted: 'Mikrofon stumm' };
  $('#osOrbWrap').onclick = () => { const s = V().state; if (s === 'off' || s === 'err' || !s) V().start && V().start(); else if (s === 'muted') V().mute(); };
  $('#osMute').onclick = () => V().mute && V().mute();
  $('#osEnd').onclick = () => V().end && V().end();
  $('#osLog').onclick = () => { const w = $('#vLogWrap'); w && w.classList.toggle('open'); };
  const ask = t => { t = String(t || '').trim(); if (!t) return; if (V().send) V().send(t); };
  $('#osAsk').onsubmit = e => { e.preventDefault(); const i = $('#osAskIn'); ask(i.value); i.value = ''; i.blur(); };
  $('#osChips').onclick = e => { const b = e.target.closest('[data-ask]'); if (b) ask(b.dataset.ask); };
  // Letzte JARVIS-Antwort spiegeln
  const greet = $('#greet');
  if (greet) new MutationObserver(() => { if (!['listening', 'speaking', 'muted'].includes(V().state)) return; const s = $('#osSay'); s.style.opacity = 0; setTimeout(() => { s.textContent = greet.textContent; s.style.opacity = 1; }, 200); }).observe(greet, { childList: true, characterData: true, subtree: true });

  /* ---------- Kern (Partikel-Sphäre, reagiert auf die Stimme) ---------- */
  const oc = $('#osOrb'), ox = oc.getContext('2d');
  const N = 760, P = [];
  for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * 2.399963; P.push([Math.cos(t) * r, y, Math.sin(t) * r]); }
  const COL = [[109, 124, 255], [56, 214, 255], [255, 138, 92], [235, 240, 255]];
  let rot = 0, lvl = 0, amp = .04, spin = .15, hue = 0, lastS = '';
  function orbFrame(t) {
    const dpr = Math.min(2, devicePixelRatio || 1), S = oc.clientWidth; if (!S) return;
    if (oc.width !== S * dpr) { oc.width = oc.height = S * dpr; }
    ox.setTransform(dpr, 0, 0, dpr, 0, 0); ox.clearRect(0, 0, S, S);
    const st = V().state || 'off';
    const raw = Math.min(1, (V().level ? V().level() : 0) * 2.4); lvl += (raw - lvl) * .18;
    const tgtAmp = st === 'speaking' ? .04 + lvl * .12 : st === 'listening' ? .03 + lvl * .08 : st === 'busy' ? .06 : .02;
    const tgtSpin = st === 'busy' ? 1.6 : st === 'speaking' ? .5 : st === 'listening' ? .3 : .12;
    const tgtHue = st === 'speaking' ? 1 : st === 'listening' ? .5 : 0;
    amp += (tgtAmp - amp) * .08; spin += (tgtSpin - spin) * .05; hue += (tgtHue - hue) * .04; rot += spin * .016;
    const T = t / 1000, c = S / 2, R = S * .3, cy = Math.cos(rot), sy = Math.sin(rot), tx = .35, cx = Math.cos(tx), sx = Math.sin(tx);
    // Glühen
    const g = ox.createRadialGradient(c, c, R * .1, c, c, R * 1.7);
    const gc = hue > .7 ? '255,150,100' : hue > .3 ? '90,200,255' : '120,130,255';
    g.addColorStop(0, `rgba(${gc},${.28 + lvl * .25})`); g.addColorStop(.45, `rgba(${gc},.08)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ox.fillStyle = g; ox.fillRect(0, 0, S, S);
    ox.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      let [x, y, z] = P[i];
      const n = Math.sin(x * 3.1 + T * 1.3) * Math.sin(y * 3.7 - T * 1.1) * Math.sin(z * 2.9 + T * .8);
      const k = 1 + amp * n * 1.6 + (st === 'speaking' ? lvl * .05 * Math.sin(T * 7 + y * 5) : 0);
      x *= k; y *= k; z *= k;
      const x1 = x * cy - z * sy, z1 = x * sy + z * cy; const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
      const p = 2.6 / (2.6 + z2), px = c + x1 * R * p, py = c + y2 * R * p;
      const d = (z2 + 1) / 2; const a = .12 + (1 - d) * .75;
      const m = (y + 1) / 2; const A = COL[hue > .5 ? 2 : 0], B = COL[1];
      const r = A[0] + (B[0] - A[0]) * m, gg = A[1] + (B[1] - A[1]) * m, b = A[2] + (B[2] - A[2]) * m;
      ox.fillStyle = `rgba(${r | 0},${gg | 0},${b | 0},${a})`; const s = (.55 + (1 - d) * .75) * p; ox.beginPath(); ox.arc(px, py, s, 0, 6.283); ox.fill();
    }
    // Umlaufbahnen
    ox.lineWidth = 1;
    for (let k = 0; k < 2; k++) {
      ox.save(); ox.translate(c, c); ox.rotate(T * (k ? -.25 : .18) + k * 1.2);
      ox.strokeStyle = `rgba(200,220,255,${.16 + lvl * .25})`; ox.beginPath(); ox.ellipse(0, 0, R * (1.42 + k * .14), R * (.36 + k * .1), 0, 0, Math.PI * 2); ox.stroke();
      const a = T * (k ? 1.1 : .8); ox.fillStyle = k ? '#ffb38a' : '#8fe6ff'; ox.beginPath(); ox.arc(Math.cos(a) * R * (1.42 + k * .14), Math.sin(a) * R * (.36 + k * .1), 2.2, 0, 7); ox.fill(); ox.restore();
    }
    // Kern
    const cg = ox.createRadialGradient(c, c, 0, c, c, R * .5);
    cg.addColorStop(0, `rgba(255,255,255,${.5 + lvl * .4})`); cg.addColorStop(.4, `rgba(${gc},.25)`); cg.addColorStop(1, 'rgba(0,0,0,0)');
    ox.fillStyle = cg; ox.beginPath(); ox.arc(c, c, R * (.5 + lvl * .2), 0, 7); ox.fill();
    ox.globalCompositeOperation = 'source-over';
    if (st !== lastS) {
      lastS = st; const el = $('#osState'); el.dataset.s = st; el.querySelector('span').textContent = STXT[st] || STXT.off;
      const live = st === 'listening' || st === 'speaking' || st === 'muted';
      $('#osMute').hidden = $('#osEnd').hidden = !live; $('#osMute').textContent = st === 'muted' ? 'Mikrofon an' : 'Stumm';
      document.body.classList.toggle('voice-speaking', st === 'speaking'); document.body.classList.toggle('voice-listening', st === 'listening');
    }
  }

  /* ---------- Live-Kacheln ---------- */
  const MK = [
    { n: 'SIX', tz: 'Europe/Zurich', o: 540, c: 1050 }, { n: 'XETRA', tz: 'Europe/Berlin', o: 540, c: 1050 }, { n: 'LSE', tz: 'Europe/London', o: 480, c: 990 },
    { n: 'NYSE', tz: 'America/New_York', o: 570, c: 960 }, { n: 'TSE', tz: 'Asia/Tokyo', o: 540, c: 930 }, { n: 'HKEX', tz: 'Asia/Hong_Kong', o: 570, c: 960 },
  ];
  const tzp = tz => { const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).forEach(p => o[p.type] = p.value); return o; };
  function renderMk() {
    $('#tMkB').innerHTML = MK.map(m => { const p = tzp(m.tz), we = p.weekday === 'Sat' || p.weekday === 'Sun', t = (+p.hour % 24) * 60 + +p.minute, on = !we && t >= m.o && t < m.c;
      return `<div><b><i class="${on ? 'on' : ''}"></i>${m.n}</b><small>${(+p.hour % 24 + '').padStart(2, '0')}:${p.minute} · ${on ? 'offen' : 'zu'}</small></div>`; }).join('');
  }
  function spark(cv, vals) {
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w || !vals.length) return;
    cv.width = w * dpr; cv.height = h * dpr; const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const mn = Math.min(...vals) - .5, mx = Math.max(...vals) + .5, pt = i => [i / (vals.length - 1) * w, h - 6 - (vals[i] - mn) / (mx - mn) * (h - 14)];
    const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#6d7cff'); gr.addColorStop(.5, '#38d6ff'); gr.addColorStop(1, '#ff8a5c');
    x.beginPath(); vals.forEach((v, i) => { const [a, b] = pt(i); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.strokeStyle = gr; x.lineWidth = 1.6; x.stroke();
    x.lineTo(w, h); x.lineTo(0, h); x.closePath(); const fg = x.createLinearGradient(0, 0, 0, h); fg.addColorStop(0, 'rgba(56,214,255,.18)'); fg.addColorStop(1, 'rgba(56,214,255,0)'); x.fillStyle = fg; x.fill();
  }
  async function loadWx() {
    try {
      const r = await fetch(API + 'weather?q=Z%C3%BCrich'); const d = await r.json(); if (!r.ok) throw 0;
      const j = d.jetzt, t0 = d.tage?.[0];
      $('#tWxB').innerHTML = `<div class="os-big">${Math.round(j.temp)}<small>°</small></div><div class="os-sub"><b>${esc(j.wetter)}</b>${t0 ? ` · H ${Math.round(t0.max)}° T ${Math.round(t0.min)}°` : ''}<br>Wind ${Math.round(j.wind)} km/h${j.boeen ? ', Böen ' + Math.round(j.boeen) : ''}</div>`;
      spark($('#tWxS'), (d.stunden || []).map(s => s.temp));
    } catch (e) { $('#tWxB').innerHTML = '<div class="os-big">—</div><div class="os-sub">Wetter nicht erreichbar</div>'; }
  }
  async function loadLage() {
    try {
      const d = window.__lageData && Date.now() - (window.__lageT || 0) < 6e5 ? window.__lageData : await (await fetch(API + 'news')).json();
      window.__lageData = d; window.__lageT = window.__lageT || Date.now();
      const hs = (d.hotspots || []).slice(0, 5);
      $('#tLageN').textContent = `${d.total || 0} MELDUNGEN`;
      $('#tLageB').innerHTML = hs.map(h => `<li class="${h.watch ? 'w' : ''}"><b>${esc(h.c)}</b><span><strong style="color:#fff;font-weight:500">${esc(h.n)}</strong> · ${esc(h.headline || '')}</span></li>`).join('') || '<li><span>Keine Meldungen</span></li>';
      $('#osStamp').textContent = 'STAND ' + new Date(d.stand || Date.now()).toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' });
    } catch (e) { $('#tLageB').innerHTML = '<li><span>Nachrichtendienst nicht erreichbar</span></li>'; }
  }
  async function loadSx() {
    const hasTok = (() => { try { return !!(JSON.parse(localStorage.getItem('omega-saxo') || 'null') || {}).token; } catch (e) { return false; } })();
    if (!hasTok) { $('#tSxB').innerHTML = '<div class="os-big t2">Nicht<br>verbunden</div><div class="os-sub">Tippen, um Saxo zu verbinden</div>'; return; }
    try { if (window.__saxoRefresh) await window.__saxoRefresh(); } catch (e) {}
    const s = window.__saxoSnap;
    if (!s || s.gesamtwert == null) { $('#tSxB').innerHTML = '<div class="os-big t2">Verbunden</div><div class="os-sub">Kontostand gerade nicht abrufbar</div>'; return; }
    const v = Math.round(s.gesamtwert).toLocaleString('de-CH');
    $('#tSxB').innerHTML = `<div class="os-big" style="font-size:30px">${v}</div><div class="os-sub"><b>${esc(s.waehrung || '')}</b> · ${esc(s.umgebung)} · ${(s.positionen || []).length} Positionen</div>`;
  }
  $('#tWx').onclick = () => window.TRAVEL && window.TRAVEL.weather('Zürich');
  $('#tMk').onclick = () => J.go('invest');
  $('#tLage').onclick = () => J.go('lage');
  $('#tSx').onclick = () => J.go('port');
  $('#tOff').onclick = () => J.go('office');
  const route = z => { z = String(z || '').trim(); if (z && window.TRAVEL) window.TRAVEL.route(z).catch(e => J.toast('Route: ' + e.message)); };
  $('#osRoute').onsubmit = e => { e.preventDefault(); route($('#osRouteIn').value); $('#osRouteIn').blur(); };
  $('#tRoute').querySelector('.os-route-q').onclick = e => { if (e.target.tagName === 'SPAN') route(e.target.textContent); };
  $$('.os-tile').forEach(t => t.addEventListener('pointermove', e => { const r = t.getBoundingClientRect(); t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px'); }));

  /* ---------- Taktgeber ---------- */
  let view = 'cockpit';
  J.onView(v => { view = v; setTimeout(() => { movePill(); cleanLabels(); }, 20); if (v === 'cockpit') { loadSx(); renderMk(); } });
  addEventListener('resize', movePill);
  let fr = 0;
  (function loop(t) {
    requestAnimationFrame(loop); if (document.hidden) return;
    const heavy = view === 'lage' || view === 'office';
    if (view === 'cockpit') orbFrame(t);
    if (!heavy && (++fr % 2 === 0)) bgFrame();
  })(performance.now());
  tickClock(); renderMk(); loadWx(); loadLage(); loadSx(); cleanLabels();
  setTimeout(movePill, 300); setTimeout(movePill, 1500);
  setInterval(tickClock, 5000); setInterval(renderMk, 30000);
  setInterval(loadWx, 10 * 60000); setInterval(() => { window.__lageT = 0; loadLage(); }, 10 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tickClock(); renderMk(); } });
})();
