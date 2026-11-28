/* =====================================================================
   JARVIS · LIVE-ATLAS
   Alles live auf der Erde, wie ein Lagebild:
   Flugzeuge (ADS-B, adsb.lol) mit Route, öffentliche Webcams (Windy),
   Verkehrskameras mit Live-Bild (NYC DOT, TfL London),
   Erdbeben (USGS) und Naturereignisse (NASA EONET).
   Keine erfundenen Daten.
   ===================================================================== */
(function () {
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NAVY = '#1c2b4a', CH = '#a8864a', RED = '#c4553f';
  const KEY = 'atlas-layers';
  const L = Object.assign({ planes: true, cams: true, traffic: true, quakes: true, events: true }, (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(L)); } catch (e) {} };

  /* ---------- Leiste ---------- */
  const IC = {
    planes: '<svg viewBox="0 0 24 24"><path d="M10.5 21l1.5-1 1.5 1v-2l-1-1v-4.5l8 2.5v-2l-8-5V4a1.5 1.5 0 0 0-3 0v5L1.5 14v2l8-2.5V18l-1 1z" transform="translate(1 0)"/></svg>',
    cams: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3"/></svg>',
    traffic: '<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="17" r="1.6"/></svg>',
    quakes: '<svg viewBox="0 0 24 24"><path d="M2 12h4l2-6 3 12 3-9 2 3h6"/></svg>',
    events: '<svg viewBox="0 0 24 24"><path d="M12 3c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3 1-5 1-7z"/></svg>',
  };
  const NAMES = { planes: 'Flugzeuge', cams: 'Webcams', traffic: 'Verkehr', quakes: 'Erdbeben', events: 'Ereignisse' };
  const bar = document.createElement('div'); bar.id = 'atlasBar';
  bar.innerHTML = Object.keys(IC).map(k => `<button data-k="${k}" class="${L[k] ? 'on' : ''}" aria-label="${NAMES[k]}">${IC[k]}<b id="atN_${k}"></b><span>${NAMES[k]}</span></button>`).join('');
  document.body.appendChild(bar);
  bar.onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k; L[k] = !L[k]; b.classList.toggle('on', L[k]); save(); apply(); refresh(true); };
  const cnt = (k, n) => { const el = $('#atN_' + k); if (el) el.textContent = n ? (n > 999 ? Math.round(n / 100) / 10 + 'k' : n) : ''; };

  /* ---------- Karte vorbereiten ---------- */
  let map = null;
  const FC = f => ({ type: 'FeatureCollection', features: f });
  function planeIcon() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.translate(32, 32); g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(0, -28); g.bezierCurveTo(3, -28, 4, -22, 4, -16); g.lineTo(4, -6); g.lineTo(28, 6); g.lineTo(28, 11); g.lineTo(4, 5); g.lineTo(3, 18); g.lineTo(11, 24); g.lineTo(11, 28); g.lineTo(0, 25); g.lineTo(-11, 28); g.lineTo(-11, 24); g.lineTo(-3, 18); g.lineTo(-4, 5); g.lineTo(-28, 11); g.lineTo(-28, 6); g.lineTo(-4, -6); g.lineTo(-4, -16); g.bezierCurveTo(-4, -22, -3, -28, 0, -28); g.fill();
    return g.getImageData(0, 0, 64, 64);
  }
  function init(m) {
    map = m;
    if (!map.hasImage('plane')) map.addImage('plane', planeIcon(), { sdf: true, pixelRatio: 2 });
    const src = ['at-route', 'at-quakes', 'at-events', 'at-traffic', 'at-wcams', 'at-planes', 'at-sel'];
    src.forEach(s => map.getSource(s) || map.addSource(s, { type: 'geojson', data: FC([]) }));
    const add = l => map.getLayer(l.id) || map.addLayer(l);
    add({ id: 'at-route', type: 'line', source: 'at-route', paint: { 'line-color': CH, 'line-width': 2, 'line-dasharray': [2, 1.5], 'line-opacity': .9 } });
    add({ id: 'at-quakes', type: 'circle', source: 'at-quakes', paint: { 'circle-radius': ['interpolate', ['linear'], ['get', 'm'], 1, 3, 4, 7, 7, 16], 'circle-color': RED, 'circle-opacity': .25, 'circle-stroke-color': RED, 'circle-stroke-width': 1.4 } });
    add({ id: 'at-events', type: 'circle', source: 'at-events', paint: { 'circle-radius': 6, 'circle-color': ['match', ['get', 'k'], 'wildfires', '#d9822b', 'severeStorms', '#5b86c2', 'volcanoes', '#b5503c', 'seaLakeIce', '#9fc3e0', '#8a7a5c'], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 } });
    add({ id: 'at-traffic', type: 'circle', source: 'at-traffic', minzoom: 3, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.2, 10, 4.5, 15, 8], 'circle-color': CH, 'circle-stroke-color': '#fff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, .5, 12, 2] } });
    add({ id: 'at-wcams', type: 'circle', source: 'at-wcams', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 2.6, 10, 5, 15, 8], 'circle-color': NAVY, 'circle-stroke-color': '#fff', 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 2, .6, 12, 2] } });
    add({ id: 'at-planes', type: 'symbol', source: 'at-planes', layout: { 'icon-image': 'plane', 'icon-size': ['interpolate', ['linear'], ['zoom'], 3, .32, 8, .5, 12, .7], 'icon-rotate': ['get', 'tr'], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true},
      paint: { 'icon-color': ['case', ['==', ['get', 'em'], 1], RED, ['==', ['get', 'sel'], 1], CH, ['<', ['get', 'al'], 10000], '#ffffff', '#ffffff'], 'icon-halo-color': ['case', ['==', ['get', 'em'], 1], '#fff', NAVY], 'icon-halo-width': 1.6 } });
    add({ id: 'at-may', type: 'circle', source: 'at-planes', filter: ['==', ['get', 'em'], 1], paint: { 'circle-radius': 14, 'circle-color': 'rgba(196,85,63,.18)', 'circle-stroke-color': RED, 'circle-stroke-width': 2 } });
    add({ id: 'at-sel', type: 'circle', source: 'at-sel', paint: { 'circle-radius': 16, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': CH, 'circle-stroke-width': 2 } });
    ['at-planes', 'at-wcams', 'at-traffic', 'at-quakes', 'at-events'].forEach(id => {
      map.on('mouseenter', id, () => map.getCanvas().style.cursor = 'pointer'); map.on('mouseleave', id, () => map.getCanvas().style.cursor = '');
    });
    map.on('click', 'at-planes', e => { const f = e.features[0]; f && selectPlane(f.properties.h); });
    map.on('click', 'at-wcams', e => { const f = e.features[0]; if (!f) return; const c = wcams.get(String(f.properties.id)); c && window.CAMS && window.CAMS.show(c); });
    map.on('click', 'at-traffic', e => { const f = e.features[0]; if (!f) return; const c = traffic.find(x => x.id === f.properties.id); c && openTraffic(c); });
    map.on('click', 'at-quakes', e => { const f = e.features[0]; f && showQuake(f.properties); });
    map.on('click', 'at-events', e => { const f = e.features[0]; f && showEvent(f.properties); });
    map.on('moveend', () => refresh(false));
    apply(); refresh(true); loadTraffic(); loadQuakes(); loadEvents();
  }
  function apply() {
    if (!map) return;
    const vis = (id, on) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    vis('at-planes', L.planes); vis('at-sel', L.planes); vis('at-may', L.planes); vis('at-wcams', L.cams); vis('at-traffic', L.traffic); vis('at-quakes', L.quakes); vis('at-events', L.events);
  }

  /* ---------- Flugzeuge ---------- */
  let planes = new Map(), sel = null, lastQ = '', pT = 0, routeCache = {};
  async function loadPlanes(force) {
    if (!map || !L.planes) return;
    const c = map.getCenter(), b = map.getBounds();
    const diag = Math.hypot((b.getNorth() - b.getSouth()) * 60, (b.getEast() - b.getWest()) * 60 * Math.cos(c.lat * Math.PI / 180)) / 2;
    const nm = Math.max(30, Math.min(250, Math.round(diag)));
    const q = `${c.lat.toFixed(1)},${c.lng.toFixed(1)},${nm}`;
    if (!force && q === lastQ && Date.now() - pT < 9000) return; lastQ = q; pT = Date.now();
    try {
      const r = await fetch(`${API}flights?lat=${c.lat.toFixed(3)}&lon=${c.lng.toFixed(3)}&nm=${nm}`); if (!r.ok) return; const d = await r.json();
      const now = Date.now(), keep = new Map();
      (innerWidth < 900 ? d.ac.slice(0, 350) : d.ac).forEach(a => { const o = planes.get(a.h); keep.set(a.h, Object.assign(o || {}, a, { t0: now, la0: a.la, lo0: a.lo })); });
      if (sel && planes.has(sel) && !keep.has(sel)) keep.set(sel, planes.get(sel));
      planes = keep; cnt('planes', planes.size); drawPlanes(); if (sel) flightPanel();
    } catch (e) {}
  }
  function drawPlanes() {
    if (!map || !map.getSource('at-planes')) return;
    const now = Date.now(), feats = [];
    planes.forEach(p => {
      if (p.gs && !p.g) { const dt = (now - p.t0) / 3600000, d = p.gs * dt / 60, a = p.tr * Math.PI / 180; p.la = p.la0 + d * Math.cos(a); p.lo = p.lo0 + d * Math.sin(a) / Math.cos(p.la0 * Math.PI / 180); }
      feats.push({ type: 'Feature', properties: { h: p.h, c: p.c || p.r || p.h, tr: p.tr || 0, al: p.al || 0, em: p.em ? 1 : 0, sel: p.h === sel ? 1 : 0 }, geometry: { type: 'Point', coordinates: [p.lo, p.la] } });
    });
    map.getSource('at-planes').setData(FC(feats));
    const s = sel && planes.get(sel);
    map.getSource('at-sel').setData(FC(s ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [s.lo, s.la] } }] : []));
  }
  setInterval(() => { if (!document.hidden && L.planes && planes.size && window.SIT && window.SIT.view === 'cockpit') drawPlanes(); }, innerWidth < 900 ? 2000 : 1000);
  setInterval(() => { if (!document.hidden && L.planes && window.SIT && window.SIT.view === 'cockpit') loadPlanes(true); }, 12000);

  const ft2m = f => f == null ? null : Math.round(f * .3048);
  const kn2kmh = k => k == null ? null : Math.round(k * 1.852);
  function gc(a, b, n = 96) { // Grosskreis
    const R = Math.PI / 180, [l1, p1] = [a[0] * R, a[1] * R], [l2, p2] = [b[0] * R, b[1] * R];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2)); if (!d) return [a, b];
    const out = []; for (let i = 0; i <= n; i++) { const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2), y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2), z = A * Math.sin(p1) + B * Math.sin(p2);
      out.push([Math.atan2(y, x) / R, Math.atan2(z, Math.hypot(x, y)) / R]); }
    for (let i = 1; i < out.length; i++) { while (out[i][0] - out[i - 1][0] > 180) out[i][0] -= 360; while (out[i][0] - out[i - 1][0] < -180) out[i][0] += 360; }
    return out;
  }
  async function selectPlane(h) {
    sel = h; const p = planes.get(h); if (!p) return;
    window.SIT && window.SIT.openPan('#shFlight'); drawPlanes(); flightPanel();
    map.flyTo({ center: [p.lo, p.la], zoom: Math.max(map.getZoom(), 7), duration: 1600, padding: innerWidth >= 900 ? { right: 400 } : { bottom: innerHeight * .45 } });
    if (p.c && !(p.c in routeCache)) { routeCache[p.c] = null; try { const r = await fetch(API + 'flights?cs=' + encodeURIComponent(p.c)); routeCache[p.c] = r.ok ? await r.json() : null; } catch (e) {} }
    flightPanel();
  }
  function flightPanel() {
    const p = sel && planes.get(sel); const B = $('#flBody'); if (!p || !B) return;
    const rt = p.c && routeCache[p.c]; const v = rt && rt.von, n = rt && rt.nach;
    let prog = '';
    if (v && n && v.lat != null && n.lat != null) {
      const dist = (a, b) => { const R = Math.PI / 180; return 6371 * 2 * Math.asin(Math.sqrt(Math.sin((b[1] - a[1]) * R / 2) ** 2 + Math.cos(a[1] * R) * Math.cos(b[1] * R) * Math.sin((b[0] - a[0]) * R / 2) ** 2)); };
      const tot = dist([v.lon, v.lat], [n.lon, n.lat]), rest = dist([p.lo, p.la], [n.lon, n.lat]);
      const pc = Math.max(0, Math.min(100, Math.round((1 - rest / tot) * 100))); const eta = p.gs ? rest / (p.gs * 1.852) : null;
      prog = `<div class="fl-rt"><div><b>${esc(v.iata || v.icao || '')}</b><span>${esc(v.stadt || v.name || '')}</span></div><div class="fl-bar"><i style="width:${pc}%"></i><em style="left:${pc}%"></em></div><div><b>${esc(n.iata || n.icao || '')}</b><span>${esc(n.stadt || n.name || '')}</span></div></div>
        <div class="fl-eta">${p.g ? 'Am Boden' : `Unterwegs · noch ${Math.round(rest).toLocaleString('de-CH')} km${eta ? ` · Ankunft in ca. ${Math.floor(eta)} h ${String(Math.round((eta % 1) * 60)).padStart(2, '0')} min` : ''}`}</div>`;
      map.getSource('at-route') && map.getSource('at-route').setData(FC([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: gc([v.lon, v.lat], [n.lon, n.lat]) } }]));
    } else map.getSource('at-route') && map.getSource('at-route').setData(FC([]));
    B.innerHTML = `<div class="sd-k">${p.em ? '<span class="fl-may">MAYDAY · ' + esc(p.em) + '</span>' : 'Flug · live'}</div><h2>${esc(p.c || p.r || p.h.toUpperCase())}</h2>
      ${rt && rt.airline ? `<div class="fl-al">${esc(rt.airline)}${rt.iata ? ' · ' + esc(rt.iata) : ''}</div>` : ''}${prog}
      <div class="sd-st"><div><span>Höhe</span><b>${p.g ? 'Boden' : (ft2m(p.al) != null ? ft2m(p.al).toLocaleString('de-CH') + ' m' : '—')}</b></div><div><span>Tempo</span><b>${kn2kmh(p.gs) != null ? kn2kmh(p.gs) + ' km/h' : '—'}</b></div><div><span>Kurs</span><b>${p.tr != null ? p.tr + '°' : '—'}</b></div></div>
      <ul class="fl-dt"><li><span>Flugzeug</span><b>${esc(p.t || '—')}</b></li><li><span>Kennzeichen</span><b>${esc(p.r || '—')}</b></li><li><span>Transponder</span><b>${esc(p.sq || '—')}</b></li><li><span>Steigrate</span><b>${p.vr ? Math.round(p.vr * .3048) + ' m/min' : '—'}</b></li></ul>
      <div class="ob-src">Quelle: adsb.lol (ADS-B) · Route: adsbdb${rt && !v ? ' (keine Route bekannt)' : ''}</div>`;
  }
  $('#flX') && ($('#flX').onclick = () => { sel = null; window.SIT.closePan('#shFlight'); map && map.getSource('at-route') && map.getSource('at-route').setData(FC([])); drawPlanes(); });

  /* ---------- Webcams (Windy, ganze Welt in Clustern) ---------- */
  const wcams = new Map(); let wQ = '';
  async function loadWcams() {
    if (!map || !L.cams) return;
    const b = map.getBounds(), z = Math.round(map.getZoom());
    const clamp = v => Math.max(-85, Math.min(85, v));
    const q = [clamp(b.getNorth()).toFixed(1), clamp(b.getSouth()).toFixed(1), Math.min(180, b.getEast()).toFixed(1), Math.max(-180, b.getWest()).toFixed(1), z].join(',');
    if (q === wQ) return; wQ = q;
    try {
      const r = await fetch(`${API}webcams?n=${clamp(b.getNorth())}&s=${clamp(b.getSouth())}&e=${Math.min(180, b.getEast())}&w=${Math.max(-180, b.getWest())}&z=${Math.max(3, z)}`); if (!r.ok) return;
      const d = await r.json(); (d.kameras || []).forEach(c => wcams.set(String(c.id), c));
      if (wcams.size > 4000) { const k = [...wcams.keys()].slice(0, wcams.size - 4000); k.forEach(x => wcams.delete(x)); }
      map.getSource('at-wcams').setData(FC([...wcams.values()].map(c => ({ type: 'Feature', properties: { id: String(c.id) }, geometry: { type: 'Point', coordinates: [c.lon, c.lat] } }))));
      cnt('cams', wcams.size);
    } catch (e) {}
  }

  /* ---------- Verkehrskameras (NYC, London) ---------- */
  let traffic = [];
  async function loadTraffic() {
    try { const r = await fetch(API + 'webcams?typ=verkehr'); if (!r.ok) return; const d = await r.json(); traffic = d.kameras || [];
      map.getSource('at-traffic').setData(FC(traffic.map(c => ({ type: 'Feature', properties: { id: c.id }, geometry: { type: 'Point', coordinates: [c.lo, c.la] } }))));
      cnt('traffic', traffic.length);
    } catch (e) {}
  }
  function openTraffic(c) {
    window.CAMS && window.CAMS.show({ titel: c.n, ort: c.ort + ' · ' + c.src, lat: c.la, lon: c.lo, bild: c.img, video: c.vid || null, refresh: c.vid ? 0 : 2500 });
  }

  /* ---------- Erdbeben (USGS) & Naturereignisse (NASA EONET) ---------- */
  let quakes = [], events = [];
  async function loadQuakes() {
    try { const r = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'); const d = await r.json();
      quakes = d.features.map(f => ({ type: 'Feature', properties: { m: f.properties.mag, ort: f.properties.place, t: f.properties.time, tief: f.geometry.coordinates[2], url: f.properties.url }, geometry: { type: 'Point', coordinates: f.geometry.coordinates.slice(0, 2) } }));
      map.getSource('at-quakes').setData(FC(quakes)); cnt('quakes', quakes.length);
    } catch (e) {}
  }
  const EVN = { wildfires: 'Waldbrand', severeStorms: 'Sturm', volcanoes: 'Vulkan', seaLakeIce: 'Eis', floods: 'Hochwasser', dustHaze: 'Staub', earthquakes: 'Erdbeben', landslides: 'Erdrutsch', snow: 'Schnee', drought: 'Dürre', tempExtremes: 'Hitze/Kälte', manmade: 'Menschgemacht', waterColor: 'Wasserfarbe' };
  async function loadEvents() {
    try { const r = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=400'); const d = await r.json();
      events = (d.events || []).map(e => { const g = e.geometry && e.geometry[e.geometry.length - 1]; if (!g || g.type !== 'Point') return null; const k = (e.categories[0] || {}).id || '';
        return { type: 'Feature', properties: { k, n: e.title, typ: EVN[k] || (e.categories[0] || {}).title || 'Ereignis', t: g.date, url: (e.sources[0] || {}).url || e.link }, geometry: { type: 'Point', coordinates: g.coordinates } }; }).filter(Boolean);
      map.getSource('at-events').setData(FC(events)); cnt('events', events.length);
    } catch (e) {}
  }
  function info(k, h, rows, url, src) {
    const B = $('#flBody'); window.SIT.openPan('#shFlight');
    B.innerHTML = `<div class="sd-k">${esc(k)}</div><h2>${esc(h)}</h2><ul class="fl-dt">${rows.map(([a, b]) => `<li><span>${esc(a)}</span><b>${esc(b)}</b></li>`).join('')}</ul>${url ? `<a class="fl-link" href="${esc(url)}" target="_blank" rel="noopener">Details öffnen</a>` : ''}<div class="ob-src">Quelle: ${esc(src)}</div>`;
  }
  function showQuake(p) { info('Erdbeben · live', `Magnitude ${(+p.m).toFixed(1)}`, [['Ort', p.ort], ['Zeit', new Date(+p.t).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })], ['Tiefe', Math.round(p.tief) + ' km']], p.url, 'USGS'); }
  function showEvent(p) { info('Naturereignis · ' + p.typ, p.n, [['Art', p.typ], ['Letzte Meldung', new Date(p.t).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })]], p.url, 'NASA EONET'); }
  setInterval(() => { if (!document.hidden) { loadQuakes(); loadEvents(); } }, 10 * 60000);

  /* ---------- Steuerung ---------- */
  let rT = 0;
  function refresh(force) { clearTimeout(rT); rT = setTimeout(() => { loadPlanes(force); loadWcams(); }, force ? 0 : 450); }
  window.ATLAS = {
    async flights(lat, lon) { if (lat != null && map) map.flyTo({ center: [lon, lat], zoom: 7, duration: 2000 }); await new Promise(r => setTimeout(r, lat != null ? 2300 : 0)); await loadPlanes(true);
      const arr = [...planes.values()]; return { quelle: 'adsb.lol (ADS-B)', anzahl: arr.length, notfaelle: arr.filter(p => p.em).map(p => ({ flug: p.c, code: p.em })), beispiele: arr.filter(p => !p.g).sort((a, b) => (b.al || 0) - (a.al || 0)).slice(0, 8).map(p => ({ flug: p.c, typ: p.t, hoehe_m: ft2m(p.al), kmh: kn2kmh(p.gs) })) }; },
    selectPlane, layers: L,
  };
  (function wait() { const m = window.SIT && window.SIT.getMap && window.SIT.getMap(); if (m) init(m); else setTimeout(wait, 400); })();
})();
