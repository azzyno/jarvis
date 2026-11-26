/* JARVIS · Neue Ansicht
   Zuerst schwebt nur die Erde und dreht sich. Berühren → alles fliegt animiert herein. */
(() => {
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const HOME = [7.4474, 46.948];
  const $ = s => document.querySelector(s);
  const B = document.body;
  const mobile = matchMedia('(max-width:700px)').matches;
  const fmt = (n, d = 0) => n == null || isNaN(n) ? '–' : Number(n).toLocaleString('de-CH', { maximumFractionDigits: d, minimumFractionDigits: d });
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const get = async (p, ms = 12000) => { const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms); try { const r = await fetch(p.startsWith('http') ? p : API + p, { signal: ac.signal }); const d = await r.json(); if (!r.ok) throw new Error(d.error || r.status); return d; } finally { clearTimeout(t); } };
  let toastT; const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 3200); };

  /* ---------- Begrüssung ---------- */
  const greet = () => { const h = +new Date().toLocaleString('de-CH', { hour: 'numeric', hour12: false, timeZone: 'Europe/Zurich' }); return h < 5 ? 'Noch wach,' : h < 11 ? 'Guten Morgen,' : h < 17 ? 'Guten Tag,' : h < 22 ? 'Guten Abend,' : 'Noch wach,'; };
  $('#hl1').textContent = greet();
  const dateLine = () => new Date().toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Zurich' }) + ' · ' + new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
  let wxLine = 'Bern';
  const paintLine = () => { $('#hl3').textContent = dateLine() + ' · ' + wxLine; };
  paintLine(); setInterval(paintLine, 30000);

  /* ---------- Erde ---------- */
  const zStage = () => (innerWidth < 500 ? 0.55 : innerWidth < 900 ? 0.95 : 1.35);
  const map = new maplibregl.Map({
    container: 'globe', attributionControl: { compact: true }, center: [HOME[0] - 40, 18], zoom: zStage(), maxZoom: 18, renderWorldCopies: false, fadeDuration: 200,
    interactive: false, pixelRatio: Math.min(devicePixelRatio || 1, mobile ? 2 : 2),
    style: {
      version: 8, projection: { type: 'globe' },
      sources: {
        sat: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19, attribution: 'Esri, Maxar, Earthstar' },
        lab: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 19 },
        pts: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        eq: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        pl: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        home: { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: HOME } } },
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': 'rgba(0,0,0,0)' } },
        { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.05, 'raster-contrast': 0.06, 'raster-fade-duration': 250 } },
        { id: 'lab', type: 'raster', source: 'lab', paint: { 'raster-opacity': 0 } },
        { id: 'eq', type: 'circle', source: 'eq', paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'm'], 2.5, 3, 7, 13], 'circle-color': '#c2563f', 'circle-opacity': 0.55, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff', 'circle-stroke-opacity': .8 } },
        { id: 'pl', type: 'circle', source: 'pl', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 1.6, 7, 4], 'circle-color': '#a8864a', 'circle-stroke-width': .8, 'circle-stroke-color': '#fff' } },
        { id: 'pts', type: 'circle', source: 'pts', paint: { 'circle-radius': 7, 'circle-color': '#1c2b4a', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } },
        { id: 'home-g', type: 'circle', source: 'home', paint: { 'circle-radius': 14, 'circle-color': '#a8864a', 'circle-opacity': 0 } },
        { id: 'home', type: 'circle', source: 'home', paint: { 'circle-radius': 5, 'circle-color': '#1c2b4a', 'circle-stroke-width': 2.5, 'circle-stroke-color': '#fff', 'circle-opacity': 0, 'circle-stroke-opacity': 0 } },
      ],
      sky: { 'sky-color': '#ffffff', 'horizon-color': '#e8eef7', 'fog-color': '#fbfbfd', 'sky-horizon-blend': .5, 'horizon-fog-blend': .8, 'fog-ground-blend': .3, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 8, 0] },
    },
  });
  window.MAP = map;

  // langsames Drehen (nur im Ruhezustand, 30 Bilder/s – schont den Akku)
  let spin = true, lastT = 0;
  const turn = t => { if (spin && !document.hidden) { if (t - lastT > 33) { const c = map.getCenter(); map.jumpTo({ center: [c.lng + (t - (lastT || t)) * 0.0045, 18] }); lastT = t; } } else lastT = 0; requestAnimationFrame(turn); };
  map.on('load', () => requestAnimationFrame(turn));

  /* ---------- Öffnen / Schliessen ---------- */
  let opened = false, loaded = false;
  function open() {
    if (opened) return; opened = true; spin = false;
    B.classList.remove('stage'); B.classList.add('open');
    map.easeTo({ center: HOME, zoom: mobile ? 1.15 : 2.0, padding: { top: mobile ? 170 : 80, bottom: mobile ? 150 : 140 }, duration: 2400, easing: t => 1 - Math.pow(1 - t, 3) });
    ['dragPan', 'scrollZoom', 'touchZoomRotate', 'doubleClickZoom', 'dragRotate', 'keyboard'].forEach(h => map[h] && map[h].enable());
    try { map.touchZoomRotate.disableRotation(); } catch (e) {}
    let f = 0; const fade = () => { f = Math.min(1, f + .05); map.setPaintProperty('lab', 'raster-opacity', .75 * f); map.setPaintProperty('home', 'circle-opacity', f); map.setPaintProperty('home', 'circle-stroke-opacity', f); if (f < 1) requestAnimationFrame(fade); }; fade();
    pulse();
    if (!loaded) { loaded = true; loadChips(); loadQuakes(); }
  }
  function close() {
    if (!opened) return; opened = false; hideSheet();
    B.classList.add('closing'); B.classList.remove('open');
    setTimeout(() => { B.classList.remove('closing'); B.classList.add('stage'); }, 500);
    map.easeTo({ center: [map.getCenter().lng, 18], zoom: zStage(), padding: { top: 0, bottom: 0 }, duration: 1800 });
    setTimeout(() => { spin = true; }, 1800);
    map.setPaintProperty('lab', 'raster-opacity', 0);
    ['dragPan', 'scrollZoom', 'touchZoomRotate', 'doubleClickZoom', 'dragRotate', 'keyboard'].forEach(h => map[h] && map[h].disable());
  }
  let pulseOn = false;
  function pulse() { if (pulseOn) return; pulseOn = true; let t0 = performance.now(); const p = t => { if (!opened) { pulseOn = false; map.setPaintProperty('home-g', 'circle-opacity', 0); return; } const k = ((t - t0) % 2400) / 2400; map.setPaintProperty('home-g', 'circle-radius', 6 + k * 22); map.setPaintProperty('home-g', 'circle-opacity', .45 * (1 - k)); setTimeout(() => requestAnimationFrame(p), 50); }; requestAnimationFrame(p); }
  $('#orbit').addEventListener('click', () => { if (!opened) open(); });
  $('#hint').addEventListener('click', open);
  $('#mark').addEventListener('click', () => opened ? close() : open());

  /* ---------- Live-Kacheln ---------- */
  async function loadChips() {
    get('weather?lat=46.948&lon=7.4474&label=Bern').then(w => { const c = w.jetzt || w.current || {}; const t = c.temp ?? c.temperatur ?? c.t; $('#cWx').textContent = t != null ? Math.round(t) + '°' : '–'; wxLine = 'Bern ' + (t != null ? Math.round(t) + '°' : '') + (c.text || c.wetter ? ', ' + (c.text || c.wetter) : ''); paintLine(); window.__wx = w; }).catch(() => {});
    get('flights?lat=46.948&lon=7.4474&nm=40').then(d => { $('#cFl').textContent = fmt(d.total); }).catch(() => {});
    get('quotes?s=^SSMI').then(d => { const q = (d.kurse || d.quotes || d.daten || d)[0] || {}; const e = $('#cMk'); e.textContent = q.pct != null ? (q.pct > 0 ? '+' : '') + fmt(q.pct, 2) + '%' : fmt(q.kurs); e.className = q.pct > 0 ? 'up' : q.pct < 0 ? 'dn' : ''; }).catch(() => {});
  }
  async function loadQuakes() {
    try {
      const d = await get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
      const fs = d.features.map(f => ({ type: 'Feature', geometry: f.geometry, properties: { m: f.properties.mag || 0, o: f.properties.place } }));
      map.getSource('eq').setData({ type: 'FeatureCollection', features: fs });
      $('#cEq').textContent = fmt(fs.filter(f => f.properties.m >= 2.5).length);
      window.__eq = fs;
    } catch (e) {}
  }

  /* ---------- Fenster ---------- */
  const sheet = $('#sheet');
  function showSheet(html) { $('#shB').innerHTML = html; $('#shB').scrollTop = 0; sheet.classList.add('on'); }
  function hideSheet() { sheet.classList.remove('on'); document.querySelectorAll('#dock button').forEach(b => b.classList.remove('on')); const p = $('#shB iframe'); if (p) p.src = 'about:blank'; }
  $('#shX').onclick = hideSheet;
  let sy = null; sheet.addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', e => { if (sy != null && e.changedTouches[0].clientY - sy > 90 && $('#shB').scrollTop <= 0) hideSheet(); sy = null; }, { passive: true });
  const loading = (k, t) => showSheet(`<div class="k">${k}</div><h2>${t}</h2><p class="src">Lade live …</p>`);
  const flyTo = (lon, lat, z = 6) => { map.easeTo({ center: [lon, lat], zoom: z, duration: 1800 }); };
  const mark = pts => map.getSource('pts').setData({ type: 'FeatureCollection', features: pts.map(([lo, la]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lo, la] } })) });

  async function geo(ort) {
    if (!ort) return { name: 'Bern', lat: HOME[1], lon: HOME[0] };
    const w = await get('weather?q=' + encodeURIComponent(ort)); return Object.assign(w.ort, { wx: w });
  }

  /* Wetter */
  async function showWeather(ort) {
    loading('Wetter · live', esc(ort || 'Bern'));
    const w = ort ? await get('weather?q=' + encodeURIComponent(ort)) : await get('weather?lat=46.948&lon=7.4474&label=Bern');
    const c = w.jetzt || w.current || {}, o = w.ort || {};
    const hrs = (w.stunden || w.hourly || []).slice(0, 14), days = (w.tage || w.daily || []).slice(0, 7);
    const t = v => v != null ? Math.round(v) + '°' : '–';
    showSheet(`<div class="k">Wetter · live</div><h2>${esc(o.name || ort || 'Bern')}</h2>
      <div class="big"><b>${t(c.temp ?? c.temperatur)}</b><div><span>${esc(c.text || c.wetter || '')}</span><small>gefühlt ${t(c.gefuehlt ?? c.feels)} · Wind ${fmt(c.wind)} km/h · Feuchte ${fmt(c.feuchte ?? c.humidity)}%</small></div></div>
      <div class="hrs">${hrs.map(h => `<div>${esc(h.zeit || h.h || '')}<b>${t(h.temp ?? h.t)}</b>${fmt(h.regen_prozent ?? 0)}%</div>`).join('')}</div>
      ${days.map(d => `<div class="row"><span>${esc(d.datum ? new Date(d.datum + 'T12:00').toLocaleDateString('de-CH', { weekday: 'short' }) : '')} <span class="s">${esc(d.text || d.wetter || '')}</span></span><span>${t(d.max)} / ${t(d.min)}</span></div>`).join('')}
      <div class="src">Quelle: ${esc(w.quelle || 'Open-Meteo')}</div>`);
    if (o.lon != null) { flyTo(o.lon, o.lat, 6); mark([[o.lon, o.lat]]); }
    return w;
  }
  /* Weltlage */
  let lageCache = null;
  async function showLage() {
    loading('Weltlage · live', 'Brennpunkte');
    const d = lageCache || (lageCache = await get('news', 25000));
    const hs = (d.hotspots || []).filter(h => !h.watch).slice(0, 6);
    mark(hs.map(h => [h.lon, h.lat]));
    map.easeTo({ center: [30, 30], zoom: mobile ? 1.3 : 1.9, duration: 1800 });
    showSheet(`<div class="k">Weltlage · ${fmt(d.total)} Meldungen</div><h2>Brennpunkte</h2>
      ${hs.map((h, i) => `<div class="row hot" data-i="${i}"><span><b style="font-weight:500">${esc(h.n)}</b><br><span class="s">${esc(h.headline)}</span></span><span class="s">${h.count}</span></div>`).join('')}
      <div class="src">${esc((d.quelle || '').slice(0, 160))}</div>`);
    document.querySelectorAll('#shB .hot').forEach(r => r.onclick = () => { const h = hs[+r.dataset.i]; flyTo(h.lon, h.lat, 4.5); showHot(h); });
    return d;
  }
  function showHot(h) {
    showSheet(`<div class="k">Dossier · ${h.count} Meldungen</div><h2>${esc(h.n)}</h2>
      ${(h.items || []).map(it => `<div class="row"><a href="${esc(it.u)}" target="_blank" rel="noopener">${esc(it.t)}<br><span class="s">${esc(it.s || '')}</span></a></div>`).join('')}`);
  }
  /* Nachrichten-Suche */
  async function showSearch(q) {
    loading('Nachrichten · weltweit', esc(q));
    const d = await get('search?q=' + encodeURIComponent(q), 20000);
    const a = (d.artikel || []).slice(0, 20);
    showSheet(`<div class="k">Nachrichten · ${fmt(d.total)} Treffer</div><h2>${esc(q)}</h2>
      ${a.map(x => `<div class="row"><a href="${esc(x.u || x.url || '')}" target="_blank" rel="noopener">${esc(x.t || x.titel || '')}<br><span class="s">${esc(x.s || x.quelle || '')} ${esc(x.d || x.zeit || '')}</span></a></div>`).join('')}`);
    return d;
  }
  /* Kameras */
  async function showCams(ort) {
    loading('Live-Kameras', esc(ort || 'In der Nähe'));
    const o = ort ? await geo(ort) : (() => { const c = map.getCenter(); return { name: 'Kartenmitte', lat: c.lat, lon: c.lng }; })();
    const d = await get(`webcams?lat=${o.lat}&lon=${o.lon}&r=60`);
    const k = (d.kameras || []).filter(x => x.bild).slice(0, 16);
    flyTo(o.lon, o.lat, 8); mark(k.map(x => [x.lon, x.lat]));
    showSheet(`<div class="k">Live-Kameras · ${fmt(d.total)}</div><h2>${esc(o.name)}</h2>
      ${k.length ? `<div class="cams">${k.map((x, i) => `<button data-i="${i}"><img src="${esc(x.bild)}" loading="lazy" alt=""><span>${esc(x.titel)}</span></button>`).join('')}</div>` : '<p>Keine öffentlichen Kameras gefunden.</p>'}
      <div class="src">Quelle: ${esc(d.quelle || 'Windy Webcams')}</div>`);
    document.querySelectorAll('.cams button').forEach(b => b.onclick = () => { const x = k[+b.dataset.i]; flyTo(x.lon, x.lat, 12);
      showSheet(`<div class="k">Live-Kamera</div><h2>${esc(x.titel)}</h2><div class="s">${esc(x.ort)}</div>${x.live || x.tag || x.player ? `<iframe class="player" src="${esc(x.live || x.tag || x.player)}" allow="autoplay; fullscreen"></iframe>` : `<img class="player" src="${esc(x.bild)}">`}`); });
    return { ort: o.name, anzahl: d.total, kameras: k.map(x => x.titel) };
  }
  /* Flugzeuge */
  let plOn = false, plT = null;
  async function flights(lat, lon, nm = 120) {
    const d = await get(`flights?lat=${lat}&lon=${lon}&nm=${nm}`);
    map.getSource('pl').setData({ type: 'FeatureCollection', features: (d.ac || []).slice(0, mobile ? 400 : 1200).map(a => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [a.lo, a.la] }, properties: { c: a.c } })) });
    return d;
  }
  async function toggleFlights(force) {
    plOn = force ?? !plOn; clearInterval(plT);
    if (!plOn) { map.getSource('pl').setData({ type: 'FeatureCollection', features: [] }); toast('Flugzeuge ausgeblendet'); return; }
    const c = map.getCenter(); const d = await flights(c.lat, c.lng, 200);
    toast(`${fmt(d.total)} Flugzeuge live in der Umgebung`);
    plT = setInterval(() => { if (plOn && opened) { const c = map.getCenter(); flights(c.lat, c.lng, 200).catch(() => {}); } }, 15000);
    return d;
  }
  /* Märkte */
  async function showMarkets(sym) {
    loading('Märkte · live', sym ? esc(sym) : 'Übersicht');
    const d = await get('quotes' + (sym ? '?s=' + encodeURIComponent(sym) : ''));
    const l = d.kurse || d.quotes || d.daten || (Array.isArray(d) ? d : []);
    showSheet(`<div class="k">Märkte · live</div><h2>${sym ? esc(sym) : 'Übersicht'}</h2>
      ${l.map(q => `<div class="row"><span>${esc(q.n || q.s)}<br><span class="s">${esc(q.s)}</span></span><span>${fmt(q.kurs, 2)} ${esc(q.w || '')}<br><span class="${q.pct > 0 ? 'up' : q.pct < 0 ? 'dn' : ''}">${q.pct != null ? (q.pct > 0 ? '+' : '') + fmt(q.pct, 2) + '%' : ''}</span></span></div>`).join('')}
      <div class="src">Quelle: Yahoo Finance · keine Anlageberatung</div>`);
    return l;
  }

  const ACTIONS = {
    lage: showLage, wx: () => showWeather(), cams: () => showCams(), mk: () => showMarkets(),
    flights: () => toggleFlights().then(() => $('[data-a=flights]').classList.toggle('on', plOn)),
    classic: () => { location.href = 'classic.html'; },
  };
  document.querySelectorAll('#dock button').forEach(b => b.onclick = () => {
    const a = b.dataset.a; if (a !== 'flights') { document.querySelectorAll('#dock button').forEach(x => x !== b && a !== 'flights' && x.dataset.a !== 'flights' && x.classList.remove('on')); b.classList.add('on'); }
    Promise.resolve(ACTIONS[a]()).catch(e => { showSheet(`<h2>Nicht erreichbar</h2><p class="s">${esc(e.message)}</p>`); });
  });
  document.querySelectorAll('.chip').forEach(c => c.onclick = () => ({ wx: () => showWeather(), fl: () => toggleFlights(true), eq: () => { map.easeTo({ center: [150, 10], zoom: 1.3, duration: 1600 }); toast((window.__eq || []).length + ' Erdbeben (M2.5+) in 48 h · USGS'); }, mk: () => showMarkets() })[c.dataset.k]());

  /* ---------- Werkzeuge für die Stimme ---------- */
  const J = s => JSON.stringify(s).slice(0, 5000);
  window.APP = {
    open, close, toast, showSheet,
    tools: {
      jarvis_weather: async ({ ort } = {}) => { open(); const w = await showWeather(ort); return J({ ort: w.ort, jetzt: w.jetzt || w.current, tage: (w.tage || w.daily || []).slice(0, 4), quelle: w.quelle }); },
      jarvis_world_briefing: async () => { open(); const d = await showLage(); return J({ stand: d.stand, meldungen: d.total, brennpunkte: (d.hotspots || []).filter(h => !h.watch).slice(0, 6).map(h => ({ land: h.n, meldungen: h.count, schlagzeile: h.headline })) }); },
      jarvis_news_search: async ({ thema }) => { open(); const d = await showSearch(thema); return J({ thema, treffer: d.total, artikel: (d.artikel || []).slice(0, 8).map(a => ({ titel: a.t, quelle: a.s })) }); },
      jarvis_cameras: async ({ ort } = {}) => { open(); return J(await showCams(ort || 'Bern')); },
      jarvis_flights: async ({ ort } = {}) => { open(); const o = await geo(ort); flyTo(o.lon, o.lat, 6.5); const d = await flights(o.lat, o.lon, 60); plOn = true; $('[data-a=flights]').classList.add('on'); const ac = d.ac || []; return J({ ort: o.name, anzahl: d.total, beispiele: ac.filter(a => a.c).slice(0, 8).map(a => ({ flug: a.c, typ: a.t, hoehe_ft: a.al, kmh: a.gs ? Math.round(a.gs * 1.852) : null })), notfall: ac.filter(a => a.em).map(a => a.c + ' ' + a.em), quelle: d.quelle }); },
      jarvis_market_lookup: async ({ query }) => { open(); const l = await showMarkets(query); return J(l); },
      jarvis_route: async ({ ziel, start }) => { open(); const d = await get('route?to=' + encodeURIComponent(ziel) + (start ? '&from=' + encodeURIComponent(start) : '')); return J(d); },
      jarvis_satellites: async () => J(await get('sats')),
      jarvis_show_module: async ({ module }) => { if (module === 'core') { open(); return 'Erde geöffnet.'; } setTimeout(() => location.href = 'classic.html', 2500); return 'Ich öffne die klassische Ansicht mit allen Bereichen.'; },
      jarvis_vision: async () => 'Sichtmodi gibt es in der klassischen Ansicht (Menü „Mehr“).',
      jarvis_get_portfolio: async () => 'Das Konto ist in der klassischen Ansicht unter Finanzen verbunden.',
    },
    facts: () => `Bern: ${wxLine}. Erdbeben 48h: ${(window.__eq || []).length}.`,
  };
})();
