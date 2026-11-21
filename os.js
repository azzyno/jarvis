/* =====================================================================
   JARVIS · LAGEZENTRUM
   Echtes Satellitenbild der Erde (Esri World Imagery, NASA Black Marble),
   Live-Brennpunkte aus den Nachrichten, Dossiers je Land, Routen mit
   Live-Verkehr, Funkverkehr, Sprach-Steuerung. Keine erfundenen Daten.
   ===================================================================== */
(function () {
  const J = window.J; if (!J) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const V = () => window.JARVIS || {};
  const HOME = [8.5417, 47.3769];
  const ZTZ = 'Europe/Zurich';
  try { Object.defineProperty(window, '__holoPause', { get: () => true, set() {}, configurable: true }); } catch (e) {}

  /* =====================================================================
     GRUNDGERÜST
     ===================================================================== */
  document.body.insertAdjacentHTML('afterbegin', '<div id="sitMap"></div><div id="osScan"></div><div id="osCurtain"></div>');
  const brand = $('.brand'); if (brand) { brand.innerHTML = 'JARVIS<small>// LAGEZENTRUM ZRH</small>'; brand.onclick = () => J.go('cockpit'); }
  document.body.insertAdjacentHTML('beforeend', `
    <button id="osMenuBtn" aria-label="Menü"><span id="osMenuT">MENÜ</span><i></i></button>
    <nav id="osMenu" aria-label="Hauptmenü"><div class="mh">◤ ZUGRIFF · STUFE MASTER</div><ol>
      <li><a data-v="cockpit"><span>01</span><b>Lagezentrum</b><em id="mm1">SATELLIT LIVE</em></a></li>
      <li><a data-v="office"><span>02</span><b>Atrium</b><em>3D-BÜRO</em></a></li>
      <li><a data-v="port"><span>03</span><b>Finanzen</b><em id="mm3"></em></a></li>
      <li><a data-v="invest"><span>04</span><b>Märkte</b><em id="mm4"></em></a></li>
      <li><a data-v="calc"><span>05</span><b>Immobilien</b><em>RECHNER</em></a></li>
      <li><a data-v="hub"><span>06</span><b>Verbindungen</b><em id="mm6"></em></a></li>
    </ol><div class="mf"><span>KANAL GESICHERT</span><span id="mmT"></span></div></nav>
    <button id="osFab" aria-label="Mit JARVIS sprechen" data-s="off"><i></i></button>`);
  $$('#osMenu a').forEach((a, i) => a.style.transitionDelay = (.1 + i * .05) + 's');
  const menu = on => { document.body.classList.toggle('menu', on); $('#osMenuT').textContent = on ? 'SCHLIESSEN' : 'MENÜ'; if (on) refreshMenu(); };
  $('#osMenuBtn').onclick = () => menu(!document.body.classList.contains('menu'));
  $('#osMenu').onclick = e => { const a = e.target.closest('a[data-v]'); if (!a) return; menu(false); setTimeout(() => J.go(a.dataset.v), 250); };
  const talk = () => { const s = V().state; if (!s || s === 'off' || s === 'err') V().start && V().start(); else { V().end && V().end(); funk('VERBINDUNG ZU JARVIS GETRENNT', 'dim'); } };
  $('#osFab').onclick = talk;

  /* Vermögen gehört zu Finanzen */
  const port = $('#v-port'); const ck = $('#v-cockpit');
  ['.kpis', '.cols'].forEach(s => { const el = ck.querySelector(':scope > ' + s); if (el && port) port.appendChild(el); });

  /* Seitenköpfe */
  const HEAD = { port: ['03', 'FINANZEN', 'Konto · Order · Vermögen'], invest: ['04', 'MÄRKTE', 'Kurse · Analyse'], calc: ['05', 'IMMOBILIEN', 'Tragbarkeit · Rendite'], hub: ['06', 'VERBINDUNGEN', 'Systeme · Schlüssel'], welt: ['—', 'WELTKARTE', 'Vermögen nach Ländern'], jarvis: ['—', 'DIALOG', 'Gespräch'] };
  function head(v) {
    const h = HEAD[v], sec = document.getElementById('v-' + v); if (!h || !sec) return;
    let el = sec.querySelector('.os-ph'); if (!el) { el = document.createElement('div'); el.className = 'os-ph'; sec.prepend(el); }
    el.innerHTML = `<span>◤ DOSSIER ${h[0]} // ${h[2].toUpperCase()}</span><h1 data-t="${h[1]}">${h[1]}</h1><div class="ln"></div>`;
    scramble(el.querySelector('h1'));
  }
  const GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>';
  function scramble(el, txt) {
    txt = txt || el.dataset.t || el.textContent; let f = 0; const N = 18;
    const step = () => { el.textContent = txt.split('').map((c, i) => c === ' ' ? ' ' : i < (f / N) * txt.length ? c : GLY[(Math.random() * GLY.length) | 0]).join(''); if (++f <= N) requestAnimationFrame(step); else el.textContent = txt; };
    step();
  }
  const EMO = /^\s*(?:[\p{Extended_Pictographic}←-⇿⌀-⏿■-➿⬀-⯿]️?‍?)+\s*/u;
  function clean(root = document) {
    root.querySelectorAll('button, .btn').forEach(b => { if (b.closest('#sitHud,#osMenu')) return; const t = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t && EMO.test(t.textContent)) t.textContent = t.textContent.replace(EMO, ''); });
    root.querySelectorAll('.card[style*="border-color"]').forEach(c => c.style.removeProperty('border-color'));
    root.querySelectorAll('.ct[style*="color"]').forEach(c => c.style.removeProperty('color'));
  }

  /* =====================================================================
     HUD
     ===================================================================== */
  const hud = document.createElement('div'); hud.id = 'sitHud';
  hud.innerHTML = `
    <svg class="sh-frame" preserveAspectRatio="none" viewBox="0 0 100 100"><path d="M0 6V0h6M94 0h6v6M100 94v6h-6M6 100H0v-6" vector-effect="non-scaling-stroke"/></svg>
    <div class="sh-class"><i></i>STRENG VERTRAULICH · NUR FÜR DEN MASTER<i></i></div>
    <div class="sh-head">
      <div class="sh-greet"><small id="shGr">—</small><b>MASTER</b></div>
      <div class="sh-clock"><b id="shClock">--:--:--</b><small id="shDate">—</small></div>
    </div>
    <div class="sh-strip" id="shStrip"></div>
    <div class="sh-funk"><div class="sh-h"><span>▸ FUNKVERKEHR</span><span id="shFunkN">—</span></div><div id="shFunk"></div></div>
    <aside id="shDossier"><button class="sd-x" id="sdX" aria-label="Schliessen">✕</button>
      <div class="sd-k" id="sdK">DOSSIER</div><h2 id="sdH">—</h2>
      <div class="sd-st"><div><span>MELDUNGEN</span><b id="sdN">—</b></div><div><span>ORTSZEIT</span><b id="sdT">—</b></div><div><span>WETTER</span><b id="sdW">—</b></div></div>
      <ul id="sdL"></ul><div class="sd-v" id="sdV"><i></i><i></i><i></i><i></i><span>JARVIS BRIEFT</span></div></aside>
    <div class="sh-dock">
      <div class="sh-voice"><button id="shTalk" aria-label="Mit JARVIS sprechen"><i></i></button><canvas id="shWave"></canvas>
        <div class="sv-t"><span id="shState">BEREIT · KERN ANTIPPEN</span><p id="shSay">—</p></div></div>
      <form id="shAsk" autocomplete="off"><span>›</span><input id="shAskIn" placeholder="BEFEHL AN JARVIS …" enterkeyhint="send"><button type="submit">SENDEN</button></form>
      <div class="sh-cmds" id="shCmds">
        <button data-c="scan">◎ WELTLAGE</button><button data-r="Genf">⌖ ROUTE GENF</button><button data-c="route">⌖ ROUTE …</button>
        <button data-c="wx">☁ WETTER</button><button data-v="port">▣ KONTO</button><button data-v="office">◧ BÜRO</button><button data-c="home">⌂ ZÜRICH</button>
      </div>
    </div>
    <div class="sh-rt" id="shRt" hidden><span>⌖ ZIEL</span><input id="shRtIn" placeholder="ORT EINGEBEN" enterkeyhint="go"><button id="shRtGo">LOS</button><button id="shRtX">✕</button></div>`;
  document.body.appendChild(hud);

  /* ---------- Funkverkehr ---------- */
  const funkEl = $('#shFunk'); let funkQ = [], typing = false;
  function funk(t, cls = '') { funkQ.push([t, cls]); if (!typing) nextFunk(); }
  function nextFunk() {
    const it = funkQ.shift(); if (!it) { typing = false; return; } typing = true;
    const [t, cls] = it; const d = document.createElement('div'); d.className = 'fl ' + cls;
    const ts = new Date().toLocaleTimeString('de-CH', { timeZone: ZTZ });
    d.innerHTML = `<em>${ts}</em><span></span>`; funkEl.appendChild(d); while (funkEl.children.length > 6) funkEl.firstChild.remove();
    const sp = d.querySelector('span'); let i = 0; const s = String(t);
    const tick = () => { sp.textContent = s.slice(0, i += 2); if (i < s.length) setTimeout(tick, 14); else setTimeout(nextFunk, 220); };
    tick();
  }

  /* ---------- Uhr, Begrüssung, Statusleiste ---------- */
  const MK = [
    { n: 'SIX', tz: 'Europe/Zurich', o: 540, e: 1050 }, { n: 'XETRA', tz: 'Europe/Berlin', o: 540, e: 1050 }, { n: 'LSE', tz: 'Europe/London', o: 480, e: 990 },
    { n: 'NYSE', tz: 'America/New_York', o: 570, e: 960 }, { n: 'TSE', tz: 'Asia/Tokyo', o: 540, e: 930 }, { n: 'HKEX', tz: 'Asia/Hong_Kong', o: 570, e: 960 },
  ];
  const tzp = tz => { const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).forEach(p => o[p.type] = p.value); return o; };
  const isOpen = m => { const p = tzp(m.tz); if (p.weekday === 'Sat' || p.weekday === 'Sun') return false; const t = (+p.hour % 24) * 60 + +p.minute; return t >= m.o && t < m.e; };
  const live = { wx: null, lage: null, saxo: null };
  function tick() {
    const now = new Date();
    $('#shClock').textContent = now.toLocaleTimeString('de-CH', { timeZone: ZTZ });
    $('#shDate').textContent = now.toLocaleDateString('de-CH', { timeZone: ZTZ, weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase() + ' · UTC+1';
    const h = +now.toLocaleString('en-GB', { timeZone: ZTZ, hour: '2-digit', hour12: false });
    $('#shGr').textContent = h < 5 ? 'NOCH WACH,' : h < 11 ? 'GUTEN MORGEN,' : h < 17 ? 'GUTEN TAG,' : h < 22 ? 'GUTEN ABEND,' : 'GUTE NACHT,';
    $('#mmT').textContent = $('#shClock').textContent;
  }
  function strip() {
    const it = [];
    if (live.wx) it.push(`<span><b>ZRH</b> ${Math.round(live.wx.jetzt.temp)}° ${esc(String(live.wx.jetzt.wetter).toUpperCase())}</span>`);
    MK.forEach(m => it.push(`<span><i class="${isOpen(m) ? 'on' : ''}"></i><b>${m.n}</b> ${isOpen(m) ? 'OFFEN' : 'ZU'}</span>`));
    if (live.lage) it.push(`<span><b>MELD</b> ${live.lage.total}</span>`);
    it.push(`<span><i class="${live.saxo ? 'on' : 'off'}"></i><b>SAXO</b> ${live.saxo && live.saxo.gesamtwert != null ? Math.round(live.saxo.gesamtwert).toLocaleString('de-CH') + ' ' + esc(live.saxo.waehrung || '') : live.saxo ? 'VERBUNDEN' : 'AUS'}</span>`);
    $('#shStrip').innerHTML = it.join('');
  }

  /* ---------- Stimme ---------- */
  const STXT = { off: 'BEREIT · KERN ANTIPPEN', busy: 'VERBINDE MIT JARVIS …', err: 'FEHLER · ERNEUT ANTIPPEN', listening: 'JARVIS HÖRT ZU', speaking: 'JARVIS SPRICHT', muted: 'MIKROFON STUMM' };
  $('#shTalk').onclick = talk;
  const ask = t => { t = String(t || '').trim(); if (!t) return; funk('MASTER › ' + t.toUpperCase(), 'me'); V().send && V().send(t); };
  $('#shAsk').onsubmit = e => { e.preventDefault(); const i = $('#shAskIn'); ask(i.value); i.value = ''; i.blur(); };
  const greet = $('#greet');
  if (greet) new MutationObserver(() => { if (!['listening', 'speaking', 'muted'].includes(V().state)) return; $('#shSay').textContent = greet.textContent; funk('JARVIS › ' + greet.textContent, 'jv'); }).observe(greet, { childList: true, characterData: true, subtree: true });
  let lastS = '';
  function voiceUI() {
    const st = V().state || 'off'; if (st === lastS) return; lastS = st;
    hud.dataset.v = st; $('#osFab').dataset.s = st; $('#shState').textContent = STXT[st] || STXT.off;
    if (st === 'listening' && lastS !== 'speaking') {}
    document.body.classList.toggle('voice-speaking', st === 'speaking'); document.body.classList.toggle('voice-listening', st === 'listening');
  }
  const wave = $('#shWave'), wx = wave.getContext('2d'); const hist = new Array(48).fill(0);
  function waveFrame(T) {
    const dpr = Math.min(2, devicePixelRatio || 1), w = wave.clientWidth, h = wave.clientHeight; if (!w) return;
    if (wave.width !== w * dpr) { wave.width = w * dpr; wave.height = h * dpr; }
    let l = 0; try { l = V().level ? V().level() : 0; } catch (e) {}
    const st = V().state || 'off'; const base = st === 'off' ? .04 + .03 * Math.sin(T * 2) : st === 'busy' ? .3 * Math.abs(Math.sin(T * 6)) : 0;
    hist.push(Math.min(1, l * 3 + base)); hist.shift();
    wx.setTransform(dpr, 0, 0, dpr, 0, 0); wx.clearRect(0, 0, w, h);
    const bw = w / hist.length; const col = st === 'speaking' ? '255,61,61' : st === 'listening' ? '79,216,255' : '200,220,235';
    hist.forEach((v, i) => { const bh = Math.max(1, v * h * .9); wx.fillStyle = `rgba(${col},${.25 + v * .75})`; wx.fillRect(i * bw + 1, (h - bh) / 2, bw - 2, bh); });
  }

  /* =====================================================================
     SATELLITENKARTE
     ===================================================================== */
  let map = null, ready = false, markers = [], homeMk = null, idleSpin = true, lastUser = 0, introDone = false;
  const ML = window.maplibregl;
  function makeMap() {
    if (!ML) { $('#sitMap').classList.add('nomap'); funk('KARTENMODUL NICHT GELADEN', 'warn'); return; }
    try {
      map = new ML.Map({
        container: 'sitMap', attributionControl: { compact: true }, center: [20, 25], zoom: 1.15, maxPitch: 70, fadeDuration: 200, renderWorldCopies: false,
        style: {
          version: 8, projection: { type: 'globe' },
          sources: {
            sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Satellit: Esri, Maxar, Earthstar Geographics' },
            night: { type: 'raster', tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png'], tileSize: 256, maxzoom: 8, attribution: 'Nachtlichter: NASA Black Marble' },
            lab: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 },
            links: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
            route: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
          },
          layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': '#010307' } },
            { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.25, 'raster-brightness-max': 0.92, 'raster-contrast': 0.12 } },
            { id: 'night', type: 'raster', source: 'night', paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.6, 3.5, 0.35, 5.5, 0] } },
            { id: 'lab', type: 'raster', source: 'lab', paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 6, 0.85] } },
            { id: 'links-glow', type: 'line', source: 'links', paint: { 'line-color': ['get', 'c'], 'line-width': 6, 'line-opacity': 0.12, 'line-blur': 4 } },
            { id: 'links', type: 'line', source: 'links', paint: { 'line-color': ['get', 'c'], 'line-width': 1.3, 'line-opacity': 0.85, 'line-dasharray': [2, 2] } },
            { id: 'route-glow', type: 'line', source: 'route', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#4fd8ff', 'line-width': 10, 'line-opacity': 0.2, 'line-blur': 6 } },
            { id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#4fd8ff', 'line-width': 2.4 } },
          ],
          sky: { 'sky-color': '#000000', 'horizon-color': '#0b2a44', 'fog-color': '#010307', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.4, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0] },
        },
      });
    } catch (e) { $('#sitMap').classList.add('nomap'); funk('3D-GRAFIK NICHT VERFÜGBAR', 'warn'); map = null; return; }
    map.on('load', () => { ready = true; setTimeout(() => document.querySelectorAll('.maplibregl-compact-show').forEach(x => x.classList.remove('maplibregl-compact-show')), 4000); funk('SATELLITENVERBINDUNG STEHT · ESRI / NASA', 'ok'); placeHome(); if (live.lage) placeHotspots(); });
    ['dragstart', 'zoomstart', 'rotatestart', 'pitchstart'].forEach(ev => map.on(ev, e => { if (e.originalEvent) { lastUser = performance.now(); idleSpin = false; } }));
    map.on('error', () => {});
  }
  function el(cls, html) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; return d; }
  function placeHome() {
    if (!map || homeMk) return;
    const e = el('sm-home', `<i></i><i></i><svg viewBox="0 0 40 40"><path d="M20 2v10M20 28v10M2 20h10M28 20h10"/><circle cx="20" cy="20" r="7"/></svg><div class="sm-lab"><b>ZÜRICH</b><span>47.37N 8.54E</span><span id="smHomeWx"></span></div>`);
    homeMk = new ML.Marker({ element: e }).setLngLat(HOME).addTo(map);
    if (live.wx) $('#smHomeWx').textContent = `${Math.round(live.wx.jetzt.temp)}° ${String(live.wx.jetzt.wetter).toUpperCase()}`;
  }
  function placeHotspots() {
    if (!map || !ready || !live.lage) return;
    markers.forEach(m => m.remove()); markers = [];
    const hs = live.lage.hotspots || [], feats = [];
    hs.forEach((h, k) => {
      if (h.lat == null) return;
      const e = el('sm-pin' + (h.watch ? ' w' : '') + (h.c === 'CH' ? ' l' : ''), `<i></i><i></i><b>${k + 1 <= 3 && !h.watch ? k + 1 : '◎'}</b><div class="sm-lab"><b>${esc(h.n.toUpperCase())}</b><span>${h.count} MELD.</span></div>`);
      e.querySelectorAll('b,.sm-lab').forEach(x => x.style.animationDelay = (k * .25) + 's');
      e.addEventListener('click', ev => { ev.stopPropagation(); dossier(h); });
      markers.push(new ML.Marker({ element: e }).setLngLat([h.lon, h.lat]).addTo(map));
      feats.push({ type: 'Feature', properties: { c: h.watch ? '#4fd8ff' : '#ff3d3d' }, geometry: { type: 'LineString', coordinates: arc(HOME, [h.lon, h.lat]) } });
    });
    map.getSource('links').setData({ type: 'FeatureCollection', features: feats });
  }
  function arc(a, b, n = 48) { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + Math.sin(Math.PI * t) * Math.min(12, Math.hypot(b[0] - a[0], b[1] - a[1]) * .18)]); } return pts; }

  /* ---------- Dossier ---------- */
  let openH = null;
  function dossier(h, speak = true) {
    openH = h; idleSpin = false;
    const D = $('#shDossier');
    $('#sdK').textContent = `◤ DOSSIER · ${h.c}${h.watch ? ' · DAUERBEOBACHTUNG' : ''}`;
    $('#sdH').textContent = h.n.toUpperCase(); scramble($('#sdH'), h.n.toUpperCase());
    $('#sdN').textContent = h.count;
    $('#sdT').textContent = h.tz ? new Date().toLocaleTimeString('de-CH', { timeZone: h.tz, hour: '2-digit', minute: '2-digit' }) : '—';
    $('#sdW').textContent = h.weather && h.weather.temp != null ? `${Math.round(h.weather.temp)}°` : (h.weather && h.weather.jetzt ? `${Math.round(h.weather.jetzt.temp)}°` : '—');
    $('#sdL').innerHTML = (h.items || []).slice(0, 5).map(it => `<li><span>${esc(it.s || 'QUELLE')}</span>${it.u ? `<a href="${esc(it.u)}" target="_blank" rel="noopener">${esc(it.t)}</a>` : esc(it.t)}</li>`).join('') || `<li>${esc(h.headline || 'Keine Meldungen')}</li>`;
    D.classList.add('on'); document.body.classList.add('dossier');
    funk(`ZIEL ERFASST · ${h.n.toUpperCase()} · ${h.count} MELDUNGEN`, h.watch ? 'ok' : 'warn');
    if (map) map.flyTo({ center: [h.lon, h.lat - (innerWidth < 900 ? 4 : 0)], zoom: h.c === 'KU' ? 5.2 : 4.4, pitch: 35, bearing: -8, duration: 2600, essential: true, padding: innerWidth >= 900 ? { right: 380 } : { bottom: 260 } });
    if (speak && window.JARVIS && window.JARVIS.say && ['listening', 'speaking', 'muted'].includes(V().state)) {
      const top = (h.items || []).slice(0, 3).map(x => x.t).join(' | ');
      window.JARVIS.say(`Dossier ${h.n}: ${h.count} Meldungen. Ortszeit ${$('#sdT').textContent}. Wichtigste Schlagzeilen: ${top || h.headline}.`);
    }
  }
  function closeDossier() { openH = null; $('#shDossier').classList.remove('on'); document.body.classList.remove('dossier'); goHome(); }
  $('#sdX').onclick = closeDossier;
  function goHome(z = innerWidth < 900 ? 3.4 : 3.9) { if (map) map.flyTo({ center: [HOME[0] + 6, HOME[1] - (innerWidth < 900 ? 6 : 2)], zoom: z, pitch: 28, bearing: -6, duration: 3000, essential: true }); }

  /* ---------- Lagescan (statt altem Globus) ---------- */
  let scanId = 0;
  async function scan() {
    const id = ++scanId; if (!live.lage) await loadLage();
    const d = live.lage; if (!d) return;
    document.body.classList.add('scanning'); setTimeout(() => document.body.classList.remove('scanning'), 2600);
    funk(`LAGESCAN GESTARTET · ${d.total} SCHLAGZEILEN AUS ${new Set((d.headlines || []).map(x => x.s)).size || '—'} QUELLEN`, 'ok');
    if (map) map.flyTo({ center: [25, 30], zoom: 1.6, pitch: 0, bearing: 0, duration: 2200 });
    await wait(2600);
    for (const h of d.hotspots) { if (id !== scanId) return; dossier(h, false); await wait(5200); }
    if (id === scanId) closeDossier();
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Routen auf der Karte ---------- */
  function showRoute(d) {
    if (!d || !d.start || !d.ziel) return;
    const a = [d.start.lon, d.start.lat], b = [d.ziel.lon, d.ziel.lat];
    funk(`ROUTE ${d.start.name.toUpperCase()} › ${d.ziel.name.toUpperCase()} · ${d.verkehr ? Math.round(d.verkehr.minuten_mit_verkehr) + ' MIN · STAU ' + Math.round(d.verkehr.stau_minuten || 0) + ' MIN' : d.auto ? Math.round(d.auto.minuten_ohne_verkehr) + ' MIN' : ''}`, 'ok');
    if (!map || !ready) return;
    map.getSource('route').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: arc(a, b, 64) } }] });
    const bb = new ML.LngLatBounds(a, a).extend(b);
    map.fitBounds(bb, { padding: { top: 140, bottom: innerHeight * .45, left: 40, right: 40 }, pitch: 40, duration: 2600, maxZoom: 8 });
  }

  /* ---------- Daten ---------- */
  async function loadWx() { try { const r = await fetch(API + 'weather?q=Z%C3%BCrich'); if (r.ok) { live.wx = await r.json(); const s = $('#smHomeWx'); if (s) s.textContent = `${Math.round(live.wx.jetzt.temp)}° ${String(live.wx.jetzt.wetter).toUpperCase()}`; strip(); } } catch (e) {} }
  async function loadLage() {
    try { const d = window.__lageData && window.__lageData.hotspots ? window.__lageData : await (await fetch(API + 'news')).json(); window.__lageData = live.lage = d;
      $('#shFunkN').textContent = `${d.total} MELD.`; strip(); placeHotspots(); } catch (e) { funk('NACHRICHTENDIENST NICHT ERREICHBAR', 'warn'); }
  }
  const hasSaxo = () => { try { return !!(JSON.parse(localStorage.getItem('omega-saxo') || 'null') || {}).token; } catch (e) { return false; } };
  async function loadSx() { if (!hasSaxo()) { live.saxo = null; strip(); return; } try { window.__saxoRefresh && await window.__saxoRefresh(); } catch (e) {} live.saxo = window.__saxoSnap || { gesamtwert: null }; strip(); }
  function refreshMenu() {
    const open = MK.filter(isOpen).length;
    $('#mm4').textContent = open ? `${open} BÖRSEN OFFEN` : 'ALLE BÖRSEN ZU';
    $('#mm3').textContent = live.saxo && live.saxo.gesamtwert != null ? `${Math.round(live.saxo.gesamtwert).toLocaleString('de-CH')} ${live.saxo.waehrung || ''}` : hasSaxo() ? 'SAXO VERBUNDEN' : 'SAXO AUS';
    $('#mm6').textContent = hasSaxo() ? 'SAXO · STIMME · VERKEHR' : 'SAXO AUS';
    $$('#osMenu a').forEach(a => a.classList.toggle('on', a.dataset.v === view));
  }
  // Funkverkehr mit echten Schlagzeilen füttern
  let fi = 0;
  setInterval(() => { if (view !== 'cockpit' || document.hidden || typing) return; const hl = live.lage && live.lage.headlines; if (!hl || !hl.length) return; const x = hl[fi++ % hl.length]; funk(`${x.c ? x.c + ' · ' : ''}${String(x.t).toUpperCase()}${x.s ? ' — ' + String(x.s).toUpperCase() : ''}`, 'dim'); }, 7000);

  /* ---------- Befehle ---------- */
  $('#shCmds').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v) return J.go(b.dataset.v);
    if (b.dataset.r) return route(b.dataset.r);
    const c = b.dataset.c;
    if (c === 'scan') scan();
    if (c === 'home') { closeDossier(); }
    if (c === 'wx') window.TRAVEL && window.TRAVEL.weather('Zürich');
    if (c === 'route') { $('#shRt').hidden = false; $('#shRtIn').focus(); }
  };
  const route = z => { z = String(z || '').trim(); if (!z || !window.TRAVEL) return; funk('BERECHNE ROUTE › ' + z.toUpperCase(), ''); window.TRAVEL.route(z).catch(err => funk('ROUTE FEHLGESCHLAGEN · ' + err.message, 'warn')); };
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

  /* ---------- Einstieg: Anflug auf Zürich ---------- */
  function intro() {
    if (introDone) return; introDone = true; idleSpin = false;
    funk('AUTHENTIFIZIERUNG · MASTER BESTÄTIGT', 'ok');
    if (map) map.flyTo({ center: [HOME[0] + 6, HOME[1] - (innerWidth < 900 ? 6 : 2)], zoom: innerWidth < 900 ? 3.4 : 3.9, pitch: 28, bearing: -6, duration: 5200, curve: 1.6, essential: true });
    setTimeout(() => { funk('BRENNPUNKTE MARKIERT · SCHWEIZ & KURDISTAN UNTER DAUERBEOBACHTUNG', 'warn'); idleSpin = true; }, 5600);
  }
  $('#boot') && $('#boot').addEventListener('click', () => setTimeout(intro, 300), { once: true });

  /* Weltlage-Werkzeug der Stimme */
  window.LAGE = {
    start() {}, run: scan, open: code => { const h = live.lage && live.lage.hotspots.find(x => x.c === code); h && dossier(h); },
    async briefing() { if (!live.lage) await loadLage(); const d = live.lage; if (!d) return { fehler: 'Weltlage nicht erreichbar' };
      return { stand: d.stand, quelle: d.quelle, gescannte_schlagzeilen: d.total, brennpunkte: d.hotspots.map(h => ({ land: h.n, beobachtet: !!h.watch, meldungen: h.count, top_schlagzeile: h.headline, weitere: (h.items || []).slice(1, 4).map(x => x.t), ortszeit: h.tz ? new Date().toLocaleTimeString('de-CH', { timeZone: h.tz, hour: '2-digit', minute: '2-digit' }) : null, wetter: h.weather })) }; },
  };
  window.SIT = { scan, dossier, showRoute, funk, goHome };

  /* ---------- Takt ---------- */
  (function loop(t) {
    requestAnimationFrame(loop); if (document.hidden) return; const T = t / 1000;
    voiceUI(); if (view === 'cockpit') waveFrame(T);
    if (map && ready && view === 'cockpit') {
      if (!introDone || (idleSpin && !openH && performance.now() - lastUser > 8000 && !map.isMoving())) {
        if (!introDone) { const c = map.getCenter(); map.setCenter([c.lng + .06, c.lat]); }
        else map.setBearing(map.getBearing() + .008);
      }
      if ((t | 0) % 3 === 0) map.setPaintProperty('links', 'line-opacity', .55 + .35 * Math.sin(T * 2.4));
    }
  })(performance.now());
  setTimeout(() => { // nach travel.js: Routen auch auf der Karte zeigen
    if (window.TRAVEL && !window.TRAVEL.__sit) { const o = window.TRAVEL.route; window.TRAVEL.route = async (...a) => { const d = await o(...a); try { showRoute(d); } catch (e) {} return d; }; window.TRAVEL.__sit = true; }
  }, 0);
  makeMap(); tick(); strip(); loadWx(); loadLage(); loadSx(); clean();
  funk('JARVIS LAGEZENTRUM · SYSTEMSTART', 'dim');
  setInterval(tick, 1000); setInterval(strip, 30000); setInterval(loadWx, 10 * 60000);
  setInterval(() => { window.__lageData = null; loadLage(); }, 10 * 60000);
})();
