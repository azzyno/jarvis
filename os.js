/* =====================================================================
   JARVIS · SCHNEE
   Schneeweisse Oberfläche, Navy-Schrift, Champagner-Akzente.
   Echte 3D-Erde (Esri World Imagery bis Strassenebene, NASA Black Marble
   nicht mehr), Live-Brennpunkte, Satelliten (SGP4), Nachrichten, Routen,
   öffentliche Live-Kameras (Windy). Keine erfundenen Daten.
   ===================================================================== */
(function () {
  const J = window.J; if (!J) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const V = () => window.JARVIS || {};
  const HOME = [7.4474, 46.9480];
  const ZTZ = 'Europe/Zurich';
  const NAVY = '#1c2b4a', CH = '#a8864a';
  try { Object.defineProperty(window, '__holoPause', { get: () => true, set() {}, configurable: true }); } catch (e) {}

  /* =====================================================================
     GRUNDGERÜST
     ===================================================================== */
  document.body.insertAdjacentHTML('afterbegin', '<div id="sitMap"></div><div id="osCurtain"></div>');
  const brand = $('.brand'); if (brand) { brand.innerHTML = 'JARVIS'; brand.onclick = () => J.go('cockpit'); }
  document.body.insertAdjacentHTML('beforeend', `
    <button id="osMenuBtn" aria-label="Menü"><i></i></button>
    <nav id="osMenu" aria-label="Hauptmenü"><ol>
      <li><a data-v="cockpit"><b>Erde</b><em id="mm1">Live</em></a></li>
      <li><a data-v="office"><b>Atrium</b><em>3D-Büro</em></a></li>
      <li><a data-v="port"><b>Finanzen</b><em id="mm3"></em></a></li>
      <li><a data-v="invest"><b>Märkte</b><em id="mm4"></em></a></li>
      <li><a data-v="calc"><b>Immobilien</b><em>Rechner</em></a></li>
      <li><a data-v="hub"><b>Verbindungen</b><em id="mm6"></em></a></li>
    </ol><div class="mf"><span>Bern</span><span id="mmT"></span></div></nav>
    <button id="osFab" aria-label="Mit JARVIS sprechen" data-s="off"><i></i></button>`);
  $$('#osMenu a').forEach((a, i) => a.style.transitionDelay = (.08 + i * .05) + 's');
  const menu = on => { document.body.classList.toggle('menu', on); if (on) refreshMenu(); };
  $('#osMenuBtn').onclick = () => menu(!document.body.classList.contains('menu'));
  $('#osMenu').onclick = e => { const a = e.target.closest('a[data-v]'); if (!a) return; menu(false); setTimeout(() => J.go(a.dataset.v), 250); };
  const talk = () => { const s = V().state; if (!s || s === 'off' || s === 'err') V().start && V().start(); else V().end && V().end(); };
  $('#osFab').onclick = talk;

  /* Vermögen gehört zu Finanzen */
  const port = $('#v-port'); const ck = $('#v-cockpit');
  ['.kpis', '.cols'].forEach(s => { const el = ck.querySelector(':scope > ' + s); if (el && port) port.appendChild(el); });

  /* Seitenköpfe */
  const HEAD = { port: ['Finanzen', 'Konto, Order und Vermögen'], invest: ['Märkte', 'Kurse und Analyse'], calc: ['Immobilien', 'Tragbarkeit und Rendite'], hub: ['Verbindungen', 'Systeme und Schlüssel'], welt: ['Weltkarte', 'Vermögen nach Ländern'], jarvis: ['Dialog', 'Gespräch mit JARVIS'] };
  function head(v) {
    const h = HEAD[v], sec = document.getElementById('v-' + v); if (!h || !sec) return;
    let el = sec.querySelector('.os-ph'); if (!el) { el = document.createElement('div'); el.className = 'os-ph'; sec.prepend(el); }
    el.innerHTML = `<span>${h[1]}</span><h1>${h[0]}</h1>`;
  }
  const EMO = /^\s*(?:[\p{Extended_Pictographic}←-⇿⌀-⏿■-➿⬀-⯿]️?‍?)+\s*/u;
  function clean(root = document) {
    root.querySelectorAll('button, .btn, option').forEach(b => { if (b.closest('#sitHud,#osMenu')) return; const t = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t && EMO.test(t.textContent)) t.textContent = t.textContent.replace(EMO, ''); });
    root.querySelectorAll('.card[style*="border-color"]').forEach(c => c.style.removeProperty('border-color'));
    root.querySelectorAll('.ct[style*="color"]').forEach(c => c.style.removeProperty('color'));
    root.querySelectorAll('.ct').forEach(c => { const t = [...c.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t && t.textContent === t.textContent.toUpperCase()) t.textContent = t.textContent.trim().toLowerCase().replace(/^./, m => m.toUpperCase()) + ' '; });
  }

  /* =====================================================================
     HUD
     ===================================================================== */
  const I = {
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
    sat: '<svg viewBox="0 0 24 24"><path d="M13 7l4-4 4 4-4 4zM3 17l4-4 4 4-4 4zM9 9l6 6M8.5 15.5l7-7"/><path d="M16 21a5 5 0 0 0 5-5"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    route: '<svg viewBox="0 0 24 24"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/></svg>',
    wx: '<svg viewBox="0 0 24 24"><path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 2 3 3 0 0 1 0 6z"/></svg>',
    cam: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };
  const hud = document.createElement('div'); hud.id = 'sitHud';
  hud.innerHTML = `
    <div class="sh-head">
      <div class="sh-greet"><small id="shGr">Guten Tag,</small><b>Master.</b><span id="shDate">—</span></div>
    </div>
    <div class="sh-time" id="shClock">--:--</div>
    <div class="sh-strip" id="shStrip"></div>
    <div class="sh-funk"><div id="shFunk"></div></div>
    <aside id="shDossier" class="sh-pan"><button class="sd-x" id="sdX" aria-label="Schliessen">${I.x}</button>
      <div class="sd-k" id="sdK">Dossier</div><h2 id="sdH">—</h2>
      <div class="sd-st"><div><span>Meldungen</span><b id="sdN">—</b></div><div><span>Ortszeit</span><b id="sdT">—</b></div><div><span>Wetter</span><b id="sdW">—</b></div></div>
      <ul id="sdL"></ul><div class="sd-v" id="sdV"><i></i><i></i><i></i><i></i><span>JARVIS spricht</span></div></aside>
    <div class="sh-dock">
      <div class="sh-cmds" id="shCmds">
        <button data-c="scan">${I.globe}<span>Weltlage</span></button><button data-c="orbit">${I.sat}<span>Satelliten</span></button>
        <button data-c="cams">${I.cam}<span>Kameras</span></button><button data-c="news">${I.search}<span>Suche</span></button>
        <button data-c="route">${I.route}<span>Route</span></button><button data-c="wx">${I.wx}<span>Wetter</span></button><button data-c="home">${I.home}<span>Bern</span></button>
      </div>
      <div class="sh-voice">
        <form id="shAsk" autocomplete="off"><input id="shAskIn" placeholder="Was wünschen Sie, Master?" enterkeyhint="send"><button type="submit" aria-label="Senden">${I.send}</button></form>
        <button id="shTalk" aria-label="Mit JARVIS sprechen">${I.mic}<canvas id="shWave"></canvas></button>
      </div>
      <div class="sv-t"><span id="shState">Bereit</span><p id="shSay"></p></div>
    </div>
    <aside id="shOrbit" class="sh-pan"><button class="sd-x" id="obX" aria-label="Schliessen">${I.x}</button>
      <div class="sd-k">Satelliten · live berechnet</div><h2 id="obH">Über Bern</h2>
      <div class="sd-st"><div><span>Verfolgt</span><b id="obN">—</b></div><div><span>Über Ihnen</span><b id="obO">—</b></div><div><span>Militärisch</span><b id="obM">—</b></div></div>
      <div class="ob-f" id="obF"><button data-f="" class="on">Alle</button><button data-f="Militär">Militär</button><button data-f="Navigation">Navigation</button><button data-f="Wetter">Wetter</button><button data-f="Raumstation">Stationen</button><button data-l="starlink">+ Starlink</button><button data-l="active">+ Alle aktiven</button></div>
      <div id="obSel" class="ob-sel" hidden></div><ul id="obL" class="ob-l"></ul><div class="ob-src" id="obSrc"></div></aside>
    <aside id="shNews" class="sh-pan"><button class="sd-x" id="nwX" aria-label="Schliessen">${I.x}</button>
      <div class="sd-k">Nachrichten · weltweit</div><h2 id="nwH">Suche</h2>
      <form id="nwF" class="nw-f"><input id="nwQ" placeholder="Thema, Person, Firma" enterkeyhint="search"><button>Suchen</button></form>
      <div class="ob-src" id="nwSrc"></div><ul id="nwL" class="ob-l nw-l"></ul></aside>
    <aside id="shCams" class="sh-pan"><button class="sd-x" id="cmX" aria-label="Schliessen">${I.x}</button>
      <div class="sd-k">Live-Kameras · öffentlich</div><h2 id="cmH">In der Nähe</h2>
      <div id="cmPlay" class="cm-play" hidden></div><div class="ob-src" id="cmSrc"></div><ul id="cmL" class="cm-l"></ul></aside>
    <div class="sh-rt" id="shRt" hidden><input id="shRtIn" placeholder="Wohin, Master?" enterkeyhint="go"><button id="shRtGo">Los</button><button id="shRtX" aria-label="Schliessen">${I.x}</button></div>`;
  document.body.appendChild(hud);

  /* ---------- Protokoll (dezent, nur letzte Zeile) ---------- */
  const funkEl = $('#shFunk'); let funkQ = [], typing = false;
  function funk(t, cls = '') { funkQ.push([t, cls]); if (!typing) nextFunk(); }
  function nextFunk() {
    const it = funkQ.shift(); if (!it) { typing = false; return; } typing = true;
    const [t, cls] = it; const d = document.createElement('div'); d.className = 'fl ' + cls;
    d.textContent = String(t); funkEl.innerHTML = ''; funkEl.appendChild(d);
    setTimeout(nextFunk, 2600);
  }

  /* ---------- Uhr, Begrüssung, Statusleiste ---------- */
  const MK = [
    { n: 'SIX', tz: 'Europe/Zurich', o: 540, e: 1050 }, { n: 'XETRA', tz: 'Europe/Berlin', o: 540, e: 1050 }, { n: 'LSE', tz: 'Europe/London', o: 480, e: 990 },
    { n: 'NYSE', tz: 'America/New_York', o: 570, e: 960 }, { n: 'TSE', tz: 'Asia/Tokyo', o: 540, e: 930 }, { n: 'HKEX', tz: 'Asia/Hong_Kong', o: 570, e: 960 },
  ];
  const tzp = tz => { const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).forEach(p => o[p.type] = p.value); return o; };
  const isOpen = m => { const p = tzp(m.tz); if (p.weekday === 'Sat' || p.weekday === 'Sun') return false; const t = (+p.hour % 24) * 60 + +p.minute; return t >= m.o && t < m.e; };
  const live = { wx: null, lage: null, saxo: null, over: null };
  function tick() {
    const now = new Date();
    $('#shClock').textContent = now.toLocaleTimeString('de-CH', { timeZone: ZTZ, hour: '2-digit', minute: '2-digit' });
    const wx = live.wx ? ` · Bern ${Math.round(live.wx.jetzt.temp)}°, ${live.wx.jetzt.wetter}` : ' · Bern';
    $('#shDate').textContent = now.toLocaleDateString('de-CH', { timeZone: ZTZ, weekday: 'long', day: 'numeric', month: 'long' }) + wx;
    const h = +now.toLocaleString('en-GB', { timeZone: ZTZ, hour: '2-digit', hour12: false });
    $('#shGr').textContent = h < 5 ? 'Noch wach,' : h < 11 ? 'Guten Morgen,' : h < 17 ? 'Guten Tag,' : h < 22 ? 'Guten Abend,' : 'Gute Nacht,';
    $('#mmT').textContent = $('#shClock').textContent;
  }
  function strip() {
    const open = MK.filter(isOpen);
    const it = [];
    it.push(`<button class="sc" data-c="wx"><span>Bern</span><b>${live.wx ? Math.round(live.wx.jetzt.temp) + '°' : '—'}</b></button>`);
    it.push(`<button class="sc" data-v="invest"><span>Börsen</span><b>${open.length ? open.length + ' offen' : 'zu'}</b></button>`);
    it.push(`<button class="sc" data-c="orbit"><span>Über Ihnen</span><b>${live.over != null ? live.over : '—'}</b></button>`);
    it.push(`<button class="sc" data-c="scan"><span>Meldungen</span><b>${live.lage ? live.lage.total.toLocaleString('de-CH') : '—'}</b></button>`);
    if (live.saxo && live.saxo.gesamtwert != null) it.push(`<button class="sc" data-v="port"><span>Saxo</span><b>${Math.round(live.saxo.gesamtwert).toLocaleString('de-CH')}</b></button>`);
    $('#shStrip').innerHTML = it.join('');
  }
  $('#shStrip').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.v) return J.go(b.dataset.v); cmd(b.dataset.c); };

  /* ---------- Stimme ---------- */
  const STXT = { off: 'Bereit', busy: 'Verbinde …', err: 'Fehler, bitte erneut tippen', listening: 'JARVIS hört zu', speaking: 'JARVIS spricht', muted: 'Mikrofon stumm' };
  $('#shTalk').onclick = talk;
  const ask = t => { t = String(t || '').trim(); if (!t) return; V().send && V().send(t); $('#shSay').textContent = '„' + t + '“'; };
  $('#shAsk').onsubmit = e => { e.preventDefault(); const i = $('#shAskIn'); ask(i.value); i.value = ''; i.blur(); };
  const greet = $('#greet');
  if (greet) new MutationObserver(() => { if (!['listening', 'speaking', 'muted'].includes(V().state)) return; $('#shSay').textContent = greet.textContent; }).observe(greet, { childList: true, characterData: true, subtree: true });
  let lastS = '';
  function voiceUI() {
    const st = V().state || 'off'; if (st === lastS) return; lastS = st;
    hud.dataset.v = st; $('#osFab').dataset.s = st; $('#shState').textContent = STXT[st] || STXT.off;
    document.body.classList.toggle('voice-speaking', st === 'speaking'); document.body.classList.toggle('voice-listening', st === 'listening');
    document.body.classList.toggle('voice-on', !['off', 'err'].includes(st));
  }
  const wave = $('#shWave'), wx = wave.getContext('2d');
  function waveFrame(T) {
    const dpr = Math.min(2, devicePixelRatio || 1), w = wave.clientWidth, h = wave.clientHeight; if (!w) return;
    if (wave.width !== w * dpr) { wave.width = w * dpr; wave.height = h * dpr; }
    let l = 0; try { l = V().level ? V().level() : 0; } catch (e) {}
    const st = V().state || 'off';
    wx.setTransform(dpr, 0, 0, dpr, 0, 0); wx.clearRect(0, 0, w, h);
    if (st === 'off' || st === 'err') return;
    const amp = Math.min(1, l * 3 + (st === 'busy' ? .25 : .06));
    wx.strokeStyle = st === 'speaking' ? CH : 'rgba(255,255,255,.9)'; wx.lineWidth = 1.4;
    for (let k = 0; k < 2; k++) { wx.beginPath(); for (let x = 0; x <= w; x += 2) { const y = h / 2 + Math.sin(x / w * Math.PI * 3 + T * (4 + k * 2)) * amp * h * .32 * Math.sin(x / w * Math.PI); x ? wx.lineTo(x, y) : wx.moveTo(x, y); } wx.globalAlpha = k ? .45 : 1; wx.stroke(); }
    wx.globalAlpha = 1;
  }

  /* =====================================================================
     ERDE · echte Satellitenbilder bis Strassenebene
     ===================================================================== */
  let map = null, ready = false, markers = [], homeMk = null, idleSpin = true, lastUser = 0, introDone = false;
  const ML = window.maplibregl;
  function makeMap() {
    if (!ML) { $('#sitMap').classList.add('nomap'); return; }
    try {
      map = new ML.Map({
        container: 'sitMap', attributionControl: { compact: true }, center: [HOME[0] - 60, 10], zoom: .1, maxZoom: 19.5, maxPitch: 75, fadeDuration: 250, renderWorldCopies: false,
        style: {
          version: 8, projection: { type: 'globe' },
          sources: {
            sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Satellit: Esri, Maxar, Earthstar Geographics' },
            lab: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 },
            road: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 },
            links: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
            route: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
            sats: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
            strack: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
            cams: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
          },
          layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': '#fbfbfd' } },
            { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': 0.05, 'raster-brightness-min': 0.04, 'raster-contrast': 0.04, 'raster-fade-duration': 250 } },
            { id: 'road', type: 'raster', source: 'road', minzoom: 11, paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0, 13, 0.6] } },
            { id: 'lab', type: 'raster', source: 'lab', paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.35, 6, 0.8] } },
            { id: 'links', type: 'line', source: 'links', paint: { 'line-color': ['get', 'c'], 'line-width': 1.2, 'line-opacity': 0.85 } },
            { id: 'route-c', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': .9 } },
            { id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': CH, 'line-width': 3.2 } },
            { id: 'strack', type: 'line', source: 'strack', paint: { 'line-color': '#ffffff', 'line-width': 1.4, 'line-opacity': .85, 'line-dasharray': [2, 2] } },
            { id: 'sats-sel', type: 'circle', source: 'sats', filter: ['==', ['get', 'sel'], 1], paint: { 'circle-radius': 12, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } },
            { id: 'sats', type: 'circle', source: 'sats', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, ['*', ['get', 'r'], 1.4], 6, ['*', ['get', 'r'], 2.2]], 'circle-color': ['get', 'col'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': ['case', ['==', ['get', 'over'], 1], 1.4, .6], 'circle-opacity': .95 } },
            { id: 'cams', type: 'circle', source: 'cams', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 12, 8], 'circle-color': NAVY, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } },
          ],
          sky: { 'sky-color': '#ffffff', 'horizon-color': '#e4ebf5', 'fog-color': '#fbfbfd', 'sky-horizon-blend': 0.5, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.3, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 8, 0] },
        },
      });
    } catch (e) { $('#sitMap').classList.add('nomap'); map = null; return; }
    map.on('load', () => { ready = true; try { ORBIT.bindMap(); CAMS.bindMap(); } catch (e) {} setTimeout(() => document.querySelectorAll('.maplibregl-compact-show').forEach(x => x.classList.remove('maplibregl-compact-show')), 3000); placeHome(); if (live.lage) placeHotspots(); });
    ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'].forEach(ev => map.on(ev, e => { if (e.originalEvent) { lastUser = performance.now(); idleSpin = false; } }));
    map.on('zoom', () => { const z = map.getZoom(); document.body.classList.toggle('deep', z > 6.5); document.body.classList.toggle('far', z < 2.3); });
    map.on('error', () => {});
  }
  function el(cls, html) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; }
  function placeHome() {
    if (!map || homeMk) return;
    const e = el('sm-home', `<i></i><i></i><b></b><div class="sm-lab"><b>Bern</b><span id="smHomeWx"></span></div>`);
    homeMk = new ML.Marker({ element: e }).setLngLat(HOME).addTo(map);
    if (live.wx) $('#smHomeWx').textContent = `${Math.round(live.wx.jetzt.temp)}°`;
  }
  function placeHotspots() {
    if (!map || !ready || !live.lage) return;
    markers.forEach(m => m.remove()); markers = [];
    const hs = live.lage.hotspots || [], feats = [];
    hs.forEach((h, k) => {
      if (h.lat == null) return;
      const e = el('sm-pin' + (h.watch ? ' w' : '') + (h.c === 'CH' ? ' l' : ''), `<i></i><b></b><div class="sm-lab"><b>${esc(h.n)}</b><span>${h.count} Meldungen</span></div>`);
      e.querySelectorAll('b,.sm-lab').forEach(x => x.style.animationDelay = (k * .2) + 's');
      e.addEventListener('click', ev => { ev.stopPropagation(); dossier(h); });
      markers.push(new ML.Marker({ element: e }).setLngLat([h.lon, h.lat]).addTo(map));
      if (h.c !== 'CH') feats.push({ type: 'Feature', properties: { c: h.watch ? '#ffffff' : CH }, geometry: { type: 'LineString', coordinates: arc(HOME, [h.lon, h.lat]) } });
    });
    map.getSource('links').setData({ type: 'FeatureCollection', features: feats });
  }
  function arc(a, b, n = 48) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * Math.min(12, Math.hypot(b[0] - a[0], b[1] - a[1]) * .18)]); } return pts; }

  /* ---------- Panels ---------- */
  const PANS = ['#shDossier', '#shOrbit', '#shNews', '#shCams'];
  function openPan(id) { PANS.forEach(p => { if (p !== id) $(p).classList.remove('on'); }); $(id).classList.add('on'); document.body.classList.add('pan'); }
  function closePan(id) { $(id).classList.remove('on'); if (!PANS.some(p => $(p).classList.contains('on'))) document.body.classList.remove('pan'); }

  /* ---------- Dossier ---------- */
  let openH = null;
  function dossier(h, speak = true) {
    openH = h; idleSpin = false;
    $('#sdK').textContent = `Dossier · ${h.c}${h.watch ? ' · Dauerbeobachtung' : ''}`;
    $('#sdH').textContent = h.n;
    $('#sdN').textContent = h.count;
    $('#sdT').textContent = h.tz ? new Date().toLocaleTimeString('de-CH', { timeZone: h.tz, hour: '2-digit', minute: '2-digit' }) : '—';
    $('#sdW').textContent = h.weather && h.weather.temp != null ? `${Math.round(h.weather.temp)}°` : (h.weather && h.weather.jetzt ? `${Math.round(h.weather.jetzt.temp)}°` : '—');
    $('#sdL').innerHTML = (h.items || []).slice(0, 5).map(it => `<li><span>${esc(it.s || 'Quelle')}</span>${it.u ? `<a href="${esc(it.u)}" target="_blank" rel="noopener">${esc(it.t)}</a>` : esc(it.t)}</li>`).join('') || `<li>${esc(h.headline || 'Keine Meldungen')}</li>`;
    openPan('#shDossier');
    if (map) map.flyTo({ center: [h.lon, h.lat], zoom: h.c === 'KU' ? 5.2 : 4.4, pitch: 30, bearing: -8, duration: 2600, essential: true, padding: innerWidth >= 900 ? { right: 400 } : { bottom: innerHeight * .45 } });
    if (speak && window.JARVIS && window.JARVIS.say && ['listening', 'speaking', 'muted'].includes(V().state)) {
      const top = (h.items || []).slice(0, 3).map(x => x.t).join(' | ');
      window.JARVIS.say(`Dossier ${h.n}: ${h.count} Meldungen. Ortszeit ${$('#sdT').textContent}. Wichtigste Schlagzeilen: ${top || h.headline}.`);
    }
  }
  function closeDossier() { openH = null; closePan('#shDossier'); goHome(); }
  $('#sdX').onclick = closeDossier;
  const homeView = () => innerWidth < 900 ? { center: [HOME[0] + 6, HOME[1] - 18], zoom: .95, padding: { top: 230, bottom: 120, left: 0, right: 0 } } : { center: [HOME[0] + 8, HOME[1] - 12], zoom: 1.7, padding: { top: 120, bottom: 120, left: 380, right: 0 } };
  function goHome() { if (map) map.flyTo({ ...homeView(), pitch: 0, bearing: 0, duration: 3000, essential: true }); }
  function flyBern() { if (map) map.flyTo({ center: HOME, zoom: 15.5, pitch: 55, bearing: -20, duration: 5000, curve: 1.8, essential: true }); }

  /* ---------- Lagescan ---------- */
  let scanId = 0;
  async function scan() {
    const id = ++scanId; if (!live.lage) await loadLage();
    const d = live.lage; if (!d) return;
    if (map) map.flyTo({ center: [25, 25], zoom: 1.4, pitch: 0, bearing: 0, duration: 2200 });
    await wait(2400);
    for (const h of d.hotspots) { if (id !== scanId) return; dossier(h, false); await wait(5200); }
    if (id === scanId) closeDossier();
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Routen ---------- */
  function showRoute(d) {
    if (!d || !d.start || !d.ziel) return;
    const a = [d.start.lon, d.start.lat], b = [d.ziel.lon, d.ziel.lat];
    if (!map || !ready) return;
    const line = d.geometrie && d.geometrie.length > 1 ? d.geometrie : arc(a, b, 64);
    map.getSource('route').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } }] });
    const bb = new ML.LngLatBounds(a, a); line.forEach(p => bb.extend(p));
    map.fitBounds(bb, { padding: { top: 120, bottom: innerHeight * .5, left: 40, right: 40 }, pitch: 45, duration: 2600, maxZoom: 12 });
  }

  /* ---------- Daten ---------- */
  async function loadWx() { try { const r = await fetch(API + 'weather?q=Bern'); if (r.ok) { live.wx = await r.json(); const s = $('#smHomeWx'); if (s) s.textContent = `${Math.round(live.wx.jetzt.temp)}°`; strip(); tick(); } } catch (e) {} }
  async function loadLage() {
    try { const d = window.__lageData && window.__lageData.hotspots ? window.__lageData : await (await fetch(API + 'news')).json(); window.__lageData = live.lage = d; strip(); placeHotspots(); } catch (e) {}
  }
  const hasSaxo = () => { try { return !!(JSON.parse(localStorage.getItem('omega-saxo') || 'null') || {}).token; } catch (e) { return false; } };
  async function loadSx() { if (!hasSaxo()) { live.saxo = null; strip(); return; } try { window.__saxoRefresh && await window.__saxoRefresh(); } catch (e) {} live.saxo = window.__saxoSnap || { gesamtwert: null }; strip(); }
  function refreshMenu() {
    const open = MK.filter(isOpen).length;
    $('#mm4').textContent = open ? `${open} Börsen offen` : 'Börsen zu';
    $('#mm3').textContent = live.saxo && live.saxo.gesamtwert != null ? `${Math.round(live.saxo.gesamtwert).toLocaleString('de-CH')} ${live.saxo.waehrung || ''}` : hasSaxo() ? 'Saxo verbunden' : 'Saxo aus';
    $('#mm6').textContent = hasSaxo() ? 'Alles verbunden' : 'Saxo aus';
    $$('#osMenu a').forEach(a => a.classList.toggle('on', a.dataset.v === view));
  }

  /* ---------- Befehle ---------- */
  function cmd(c) {
    if (c === 'scan') scan();
    if (c === 'home') { closeDossier(); flyBern(); }
    if (c === 'wx') window.TRAVEL && window.TRAVEL.weather('Bern');
    if (c === 'route') { $('#shRt').hidden = false; $('#shRtIn').focus(); }
    if (c === 'orbit') ORBIT.toggle();
    if (c === 'news') NEWS.open();
    if (c === 'cams') CAMS.toggle();
  }
  $('#shCmds').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.v) return J.go(b.dataset.v); cmd(b.dataset.c); };
  const route = z => { z = String(z || '').trim(); if (!z || !window.TRAVEL) return; window.TRAVEL.route(z).catch(() => {}); };
  $('#shRtGo').onclick = () => { route($('#shRtIn').value); $('#shRt').hidden = true; $('#shRtIn').value = ''; };
  $('#shRtIn').onkeydown = e => { if (e.key === 'Enter') $('#shRtGo').click(); };
  $('#shRtX').onclick = () => { $('#shRt').hidden = true; };

  /* ---------- Seitenwechsel ---------- */
  let view = 'cockpit', first = true;
  const curtain = $('#osCurtain');
  J.onView(v => {
    if (v === 'lage') { setTimeout(() => { J.go('cockpit'); scan(); }, 0); return; }
    const prev = view; view = v;
    [...document.body.classList].filter(c => c.startsWith('v-')).forEach(c => document.body.classList.remove(c)); document.body.classList.add('v-' + v);
    if (!first && prev !== v) { curtain.classList.remove('go'); void curtain.offsetWidth; curtain.classList.add('go'); }
    first = false; head(v); setTimeout(() => clean(), 30);
    if (v === 'cockpit') { loadSx(); if (map) setTimeout(() => map.resize(), 50); }
  });
  document.body.classList.add('v-cockpit');

  /* ---------- Einstieg: Anflug aus dem All auf Bern ---------- */
  function intro() {
    if (introDone) return; introDone = true; idleSpin = false;
    document.body.classList.add('entered');
    if (map) map.flyTo({ ...homeView(), pitch: 0, bearing: 0, duration: 4200, curve: 1.4, essential: true });
    setTimeout(() => { idleSpin = true; }, 4400);
    setTimeout(() => { try { ORBIT.start(true); } catch (e) {} }, 5200);
  }
  $('#boot') && $('#boot').addEventListener('click', () => setTimeout(intro, 900), { once: true });

  /* Weltlage-Werkzeug der Stimme */
  window.LAGE = {
    start() {}, run: scan, open: code => { const h = live.lage && live.lage.hotspots.find(x => x.c === code); h && dossier(h); },
    async briefing() { if (!live.lage) await loadLage(); const d = live.lage; if (!d) return { fehler: 'Weltlage nicht erreichbar' };
      return { stand: d.stand, quelle: d.quelle, gescannte_schlagzeilen: d.total, brennpunkte: d.hotspots.map(h => ({ land: h.n, beobachtet: !!h.watch, meldungen: h.count, top_schlagzeile: h.headline, weitere: (h.items || []).slice(1, 4).map(x => x.t), ortszeit: h.tz ? new Date().toLocaleTimeString('de-CH', { timeZone: h.tz, hour: '2-digit', minute: '2-digit' }) : null, wetter: h.weather })) }; },
  };

  /* =====================================================================
     ORBIT · Satelliten live (CelesTrak + SGP4 im Browser)
     ===================================================================== */
  const OBS = { latitude: HOME[1] * Math.PI / 180, longitude: HOME[0] * Math.PI / 180, height: .54 };
  const TYPE_COL = { 'Militär': '#c4553f', 'Navigation': CH, 'Wetter': '#5b86c2', 'Raumstation': '#ffffff', 'Starlink': '#c9cfdb', 'OneWeb': '#c9cfdb', 'Erdbeobachtung': '#5f9e80', 'Sonstige': '#e8e3d6' };
  function typeOf(s) {
    const n = s.n.toUpperCase(), g = s.g;
    if (g === 'stations' || /^(ISS|CSS|TIANHE|TIANGONG|WENTIAN|MENGTIAN)\b/.test(n)) return 'Raumstation';
    if (g === 'military' || /^(USA \d|NROL|COSMOS|KOSMOS|YAOGAN|OFEK|SAR-LUPE|CSO-|HELIOS|SBIRS|DMSP|WGS|MUOS|AEHF|LACROSSE|TOPAZ|GEO-IK|SKYNET|SYRACUSE|SICRAL|PERSONA|BARS-M|KONDOR|LOTOS|PION|TJS|SHIYAN)/.test(n)) return 'Militär';
    if (/^(GPS|NAVSTAR|GALILEO|GSAT0|GLONASS|COSMOS 2[45]\d\d|BEIDOU|QZS|IRNSS)/.test(n) || ['gps-ops', 'galileo', 'glo-ops', 'beidou'].includes(g)) return 'Navigation';
    if (/^(NOAA|GOES|METEOSAT|METOP|FENGYUN|FY-|HIMAWARI|ELEKTRO|METEOR|DMSP|SUOMI|JPSS|GCOM)/.test(n) || g === 'weather') return 'Wetter';
    if (/^STARLINK/.test(n)) return 'Starlink'; if (/^ONEWEB/.test(n)) return 'OneWeb';
    if (/^(SENTINEL|LANDSAT|WORLDVIEW|PLEIADES|SPOT|TERRA|AQUA|SKYSAT|FLOCK|ICEYE|CAPELLA|GAOFEN|SUPERVIEW|KOMPSAT|RADARSAT)/.test(n) || g === 'resource') return 'Erdbeobachtung';
    return 'Sonstige';
  }
  const ORBIT = (() => {
    let on = false, sats = [], loaded = new Set(), timer = 0, filt = '', sel = null, last = null;
    const lib = () => window.satellite;
    async function load(groups) {
      const r = await fetch(API + 'sats?g=' + groups); const d = await r.json(); if (!r.ok) throw new Error(d.error || r.status);
      const S = lib(); const have = new Set(sats.map(x => x.id));
      for (const s of d.sats) { if (have.has(s.id)) continue; try { const rec = S.twoline2satrec(s.l1, s.l2); const t = typeOf(s); sats.push({ id: s.id, n: s.n, g: s.g, rec, t, col: TYPE_COL[t] }); } catch (e) {} }
      groups.split(',').forEach(g => loaded.add(g)); $('#obSrc').textContent = `Quelle: ${d.quelle} · Stand ${new Date(d.stand).toLocaleTimeString('de-CH', { timeZone: ZTZ, hour: '2-digit', minute: '2-digit' })}`;
      return d;
    }
    function compute(now = new Date()) {
      const S = lib(); if (!S) return null; const gm = S.gstime(now); const feats = [], over = [];
      for (const s of sats) {
        if (filt && s.t !== filt) continue;
        const pv = S.propagate(s.rec, now); if (!pv || !pv.position || typeof pv.position === 'boolean') continue;
        const gd = S.eciToGeodetic(pv.position, gm); const lat = S.degreesLat(gd.latitude), lon = S.degreesLong(gd.longitude), h = gd.height;
        if (!isFinite(lat) || !isFinite(h) || h < 80) continue;
        const la = S.ecfToLookAngles(OBS, S.eciToEcf(pv.position, gm)); const el = la.elevation * 180 / Math.PI;
        const v = pv.velocity ? Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z) : 0;
        s.lat = lat; s.lon = lon; s.h = h; s.el = el; s.v = v; s.az = la.azimuth * 180 / Math.PI;
        const isOver = el > 10; if (isOver) over.push(s);
        feats.push({ type: 'Feature', properties: { id: s.id, col: s.col, r: s.t === 'Raumstation' ? 4 : s.t === 'Starlink' || s.t === 'OneWeb' ? 1.1 : s.t === 'Militär' ? 2.6 : 2, sel: sel === s.id ? 1 : 0, over: isOver ? 1 : 0 }, geometry: { type: 'Point', coordinates: [lon, lat] } });
      }
      over.sort((a, b) => b.el - a.el);
      return last = { feats, over, n: feats.length, mil: sats.filter(s => s.t === 'Militär').length };
    }
    function render() {
      const c = compute(); if (!c) return;
      if (map && ready) map.getSource('sats').setData({ type: 'FeatureCollection', features: c.feats });
      if (live.over !== c.over.length) { live.over = c.over.length; strip(); }
      $('#obN').textContent = c.n.toLocaleString('de-CH'); $('#obO').textContent = c.over.length; $('#obM').textContent = c.mil;
      if (!$('#shOrbit').classList.contains('on')) return;
      $('#obL').innerHTML = c.over.slice(0, 40).map(s => `<li data-id="${s.id}" class="${sel === s.id ? 'on' : ''}"><i style="background:${s.col}"></i><b>${esc(s.n)}</b><span>${esc(s.t)} · ${Math.round(s.h).toLocaleString('de-CH')} km · ${Math.round(s.el)}° hoch</span></li>`).join('') || '<li><span>Gerade kein Satellit dieser Auswahl höher als 10° über Bern.</span></li>';
      if (sel) { const s = sats.find(x => x.id === sel); if (s) $('#obSel').innerHTML = `<b>${esc(s.n)}</b><span>NORAD ${s.id} · ${esc(s.t)}</span><div class="sd-st"><div><span>Höhe</span><b>${Math.round(s.h).toLocaleString('de-CH')} km</b></div><div><span>Tempo</span><b>${(s.v * 3600).toLocaleString('de-CH', { maximumFractionDigits: 0 })} km/h</b></div><div><span>Von Bern</span><b>${Math.round(s.el)}°</b></div></div>`; }
    }
    function track(s) {
      const S = lib(), pts = []; const t0 = Date.now();
      for (let m = -10; m <= 95; m += 1) { const d = new Date(t0 + m * 60000); const pv = S.propagate(s.rec, d); if (!pv || !pv.position || typeof pv.position === 'boolean') continue; const gd = S.eciToGeodetic(pv.position, S.gstime(d)); pts.push([S.degreesLong(gd.longitude), S.degreesLat(gd.latitude)]); }
      const segs = [[]]; pts.forEach((p, i) => { if (i && Math.abs(p[0] - pts[i - 1][0]) > 180) segs.push([]); segs[segs.length - 1].push(p); });
      map && map.getSource('strack').setData({ type: 'FeatureCollection', features: segs.filter(x => x.length > 1).map(c => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c } })) });
    }
    function select(id) {
      sel = id; const s = sats.find(x => x.id === id); if (!s) return;
      if (!$('#shOrbit').classList.contains('on')) openPan('#shOrbit');
      $('#obSel').hidden = false; render(); track(s);
      map && map.flyTo({ center: [s.lon, s.lat], zoom: Math.min(3, Math.max(2, map.getZoom())), duration: 1800 });
    }
    async function start(quiet) {
      if (!lib()) { await new Promise(r => { window.addEventListener('sat-ready', r, { once: true }); setTimeout(r, 4000); }); }
      if (!lib()) return;
      on = true; if (!quiet) openPan('#shOrbit');
      if (!sats.length) { try { await load('stations,visual,military,gps-ops,galileo,glo-ops,beidou,weather'); } catch (e) { $('#obSrc').textContent = 'Satellitenkatalog gerade nicht erreichbar.'; return; } }
      render(); clearInterval(timer); timer = setInterval(() => !document.hidden && render(), sats.length > 3000 ? 3000 : 1000);
      if (!quiet && map) map.flyTo({ center: [HOME[0], HOME[1] - 8], zoom: 1.7, pitch: 0, bearing: 0, duration: 2400 });
    }
    function panel() { if ($('#shOrbit').classList.contains('on')) { closePan('#shOrbit'); sel = null; $('#obSel').hidden = true; map && ready && map.getSource('strack').setData({ type: 'FeatureCollection', features: [] }); } else start(false); }
    $('#obX').onclick = () => { closePan('#shOrbit'); sel = null; $('#obSel').hidden = true; map && ready && map.getSource('strack').setData({ type: 'FeatureCollection', features: [] }); goHome(); };
    $('#obL').onclick = e => { const li = e.target.closest('li[data-id]'); if (li) select(li.dataset.id); };
    $('#obF').onclick = async e => { const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.l) { if (loaded.has(b.dataset.l)) return; b.textContent = 'Lädt …'; try { await load(b.dataset.l); b.textContent = '✓ ' + (b.dataset.l === 'active' ? 'Alle aktiven' : 'Starlink'); clearInterval(timer); timer = setInterval(() => !document.hidden && render(), sats.length > 3000 ? 3000 : 1000); render(); } catch (er) { b.textContent = 'Fehler'; } return; }
      filt = b.dataset.f; $$('#obF button[data-f]').forEach(x => x.classList.toggle('on', x === b)); render(); };
    const bindMap = () => { if (!map) return; map.on('click', 'sats', e => { const f = e.features && e.features[0]; if (f) select(f.properties.id); }); map.on('mouseenter', 'sats', () => map.getCanvas().style.cursor = 'pointer'); map.on('mouseleave', 'sats', () => map.getCanvas().style.cursor = ''); };
    return {
      toggle: panel, start, bindMap,
      async summary() {
        if (!sats.length) { try { if (!lib()) await new Promise(r => { window.addEventListener('sat-ready', r, { once: true }); setTimeout(r, 4000); }); await load('stations,visual,military,gps-ops,galileo,glo-ops,beidou,weather'); } catch (e) { return { fehler: 'Satellitenkatalog nicht erreichbar' }; } }
        const c = compute(); if (!c) return { fehler: 'Bahnrechner nicht geladen' }; const iss = sats.find(s => /^ISS/.test(s.n));
        return { quelle: 'CelesTrak (öffentlicher NORAD-Katalog), Positionen per SGP4 live berechnet', hinweis: 'Geheime Satelliten ohne veröffentlichte Bahndaten sind nicht enthalten.', verfolgt: c.n, militaer_im_katalog: c.mil,
          ueber_bern_hoeher_10_grad: c.over.length, darueber: c.over.slice(0, 10).map(s => ({ name: s.n, typ: s.t, hoehe_km: Math.round(s.h), elevation_grad: Math.round(s.el) })),
          iss: iss && iss.h ? { breite: +iss.lat.toFixed(2), laenge: +iss.lon.toFixed(2), hoehe_km: Math.round(iss.h), ueber_bern_sichtbar: iss.el > 10 } : null };
      },
    };
  })();
  window.ORBIT = ORBIT;

  /* =====================================================================
     KAMERAS · öffentliche Live-Webcams (Windy Webcams API)
     ===================================================================== */
  const CAMS = (() => {
    let list = [], lastQ = '';
    async function near(lat, lon, r = 50) {
      const r0 = await fetch(`${API}webcams?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&r=${Math.round(r)}`); const d = await r0.json();
      if (!r0.ok) throw Object.assign(new Error(d.error || r0.status), { code: d.code }); return d;
    }
    function draw() {
      if (map && ready) map.getSource('cams').setData({ type: 'FeatureCollection', features: list.map(c => ({ type: 'Feature', properties: { id: c.id }, geometry: { type: 'Point', coordinates: [c.lon, c.lat] } })) });
      $('#cmL').innerHTML = list.map(c => `<li data-id="${c.id}">${c.bild ? `<img src="${esc(c.bild)}" alt="" loading="lazy">` : '<div class="ph"></div>'}<b>${esc(c.titel)}</b><span>${esc(c.ort || '')}${c.live ? ' · live' : ''}</span></li>`).join('') || '<li class="empty"><span>Hier gibt es keine öffentlichen Kameras. Zoomen Sie an einen anderen Ort.</span></li>';
    }
    async function load() {
      const c = map ? map.getCenter() : { lat: HOME[1], lng: HOME[0] }; const z = map ? map.getZoom() : 8;
      const r = z > 11 ? 10 : z > 8 ? 30 : z > 5 ? 120 : 250;
      const q = `${c.lat.toFixed(2)},${c.lng.toFixed(2)},${r}`; if (q === lastQ && list.length) return; lastQ = q;
      $('#cmSrc').textContent = 'Suche Kameras …';
      try { const d = await near(c.lat, c.lng, r); list = d.kameras || []; $('#cmH').textContent = d.ort || 'In der Nähe';
        $('#cmSrc').textContent = `${list.length} Kameras im Umkreis von ${r} km · Quelle: Windy Webcams`; draw();
      } catch (e) {
        list = []; draw();
        $('#cmSrc').innerHTML = e.code === 'no_key' ? 'Die Kameras brauchen noch einen kostenlosen Windy-Schlüssel. JARVIS sagt Ihnen, wie.' : 'Kameradienst gerade nicht erreichbar.';
      }
    }
    function play(id) {
      const c = list.find(x => String(x.id) === String(id)); if (!c) return;
      const P = $('#cmPlay'); P.hidden = false;
      const src = c.live || c.tag || c.player;
      P.innerHTML = src ? `<iframe src="${esc(src)}" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe><div class="cm-cap"><b>${esc(c.titel)}</b>${c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener">Quelle öffnen</a>` : ''}</div>`
        : `${c.bild ? `<img src="${esc(c.bild)}" alt="">` : ''}<div class="cm-cap"><b>${esc(c.titel)}</b>${c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener">Quelle öffnen</a>` : ''}</div>`;
      map && map.flyTo({ center: [c.lon, c.lat], zoom: Math.max(map.getZoom(), 12), pitch: 50, duration: 2200, padding: innerWidth >= 900 ? { right: 400 } : { bottom: innerHeight * .5 } });
    }
    function toggle() {
      if ($('#shCams').classList.contains('on')) { close(); return; }
      openPan('#shCams'); document.body.classList.add('camsp');
      if (map && map.getZoom() < 5) { map.flyTo({ center: HOME, zoom: 8.5, pitch: 30, duration: 2600 }); setTimeout(load, 2700); } else load();
    }
    function close() { closePan('#shCams'); document.body.classList.remove('camsp'); const P = $('#cmPlay'); P.hidden = true; P.innerHTML = ''; }
    $('#cmX').onclick = close;
    $('#cmL').onclick = e => { const li = e.target.closest('li[data-id]'); if (li) play(li.dataset.id); };
    const bindMap = () => { if (!map) return; map.on('click', 'cams', e => { const f = e.features && e.features[0]; if (f) play(f.properties.id); }); map.on('moveend', () => { if (document.body.classList.contains('camsp')) load(); }); };
    return { toggle, load, bindMap, play, async summary(lat = HOME[1], lon = HOME[0], r = 50) { try { const d = await near(lat, lon, r); return { anzahl: (d.kameras || []).length, kameras: (d.kameras || []).slice(0, 8).map(c => ({ titel: c.titel, ort: c.ort, live: !!c.live })) }; } catch (e) { return { fehler: e.code === 'no_key' ? 'Windy-Schlüssel fehlt' : 'nicht erreichbar' }; } } };
  })();
  window.CAMS = CAMS;

  /* =====================================================================
     NEWS · weltweite Suche (GDELT + Google News + Bing)
     ===================================================================== */
  const NEWS = (() => {
    async function search(q) { const r = await fetch(API + 'search?q=' + encodeURIComponent(q)); const d = await r.json(); if (!r.ok) throw new Error(d.error || r.status); return d; }
    async function show(q) {
      openPan('#shNews'); $('#nwQ').value = q; $('#nwH').textContent = q; $('#nwL').innerHTML = '<li><span>Durchsuche weltweite Quellen …</span></li>';
      try { const d = await search(q); const qq = d.quellen;
        $('#nwSrc').textContent = `${d.total} Treffer · GDELT ${qq.gdelt} · Google CH ${qq.google_ch} · DE ${qq.google_de} · US ${qq.google_us} · Bing ${qq.bing}`;
        $('#nwL').innerHTML = d.artikel.map(a => `<li><span>${esc(a.s || a.via)}${a.zeit ? ' · ' + new Date(a.zeit).toLocaleString('de-CH', { timeZone: ZTZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</span><a href="${esc(a.u)}" target="_blank" rel="noopener">${esc(a.t)}</a></li>`).join('') || '<li><span>Keine Treffer.</span></li>';
      } catch (e) { $('#nwL').innerHTML = `<li><span>Suche fehlgeschlagen.</span></li>`; }
    }
    $('#nwX').onclick = () => closePan('#shNews');
    $('#nwF').onsubmit = e => { e.preventDefault(); const q = $('#nwQ').value.trim(); if (q) show(q); };
    const open = () => { openPan('#shNews'); setTimeout(() => $('#nwQ').focus(), 300); };
    return { search, show, open };
  })();
  window.NEWS = NEWS;

  window.SIT = { scan, dossier, showRoute, funk, goHome, flyBern, getMap: () => (ready ? map : null), get view() { return view; }, get lage() { return live.lage; } };

  /* ---------- Takt ---------- */
  (function loop(t) {
    requestAnimationFrame(loop); if (document.hidden) return; const T = t / 1000;
    voiceUI(); if (view === 'cockpit') waveFrame(T);
    if (map && ready && view === 'cockpit') {
      if (!introDone) { const c = map.getCenter(); map.setCenter([c.lng + .05, c.lat]); }
      else if (idleSpin && !openH && !document.body.classList.contains('pan') && performance.now() - lastUser > 12000 && !map.isMoving() && map.getZoom() < 4.5) { const c = map.getCenter(); map.setCenter([c.lng + .02, c.lat]); }
    }
  })(performance.now());
  setTimeout(() => { // nach travel.js: Routen auch auf der Karte zeigen
    if (window.TRAVEL && !window.TRAVEL.__sit) { const o = window.TRAVEL.route; window.TRAVEL.route = async (...a) => { const d = await o(...a); try { showRoute(d); } catch (e) {} return d; }; window.TRAVEL.__sit = true; }
  }, 0);
  makeMap(); tick(); strip(); loadWx(); loadLage(); loadSx(); clean();
  setInterval(tick, 1000); setInterval(strip, 30000); setInterval(loadWx, 10 * 60000);
  setInterval(() => { window.__lageData = null; loadLage(); }, 10 * 60000);
})();
