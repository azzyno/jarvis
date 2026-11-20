/* =====================================================================
   JARVIS OMEGA · WELTLAGE (v4, fotorealistischer Globus)
   - Echte Satellitentexturen (NASA Blue Marble / Black Marble), Wolken,
     Wasserreflexion, Tag/Nacht nach dem echten Sonnenstand (UTC)
   - Landesgrenzen fein eingezeichnet, Antippen eines Landes → Lagebild
   - Live-Scan echter Schlagzeilen, Impulse am jeweiligen Land
   - Brennpunkte + Beobachtet (Schweiz, Kurdistan) mit Bögen ab Zürich
   - Antippen → JARVIS spricht den Master an (Live-Stimme)
   Daten: /api/news (Google News, BBC, DW, Al Jazeera, Bing-Bilder, Open-Meteo)
   ===================================================================== */
(function () {
  if (typeof THREE === 'undefined' || !window.J) return;
  const J = window.J;
  const API = 'https://jarvis-iota-weld.vercel.app/api/news';
  const stage = document.getElementById('lageStage'); if (!stage) return;
  const $ = s => stage.querySelector(s);
  const isMobile = matchMedia('(max-width:899px)').matches;
  const PR = Math.min(devicePixelRatio || 1, isMobile ? 1.75 : 2);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const D2R = Math.PI / 180;

  /* ---------- Länderdaten (Grenzen) aus der eingebauten Weltkarte ---------- */
  function worldFeatures() {
    const m = window.echarts && echarts.getMap && echarts.getMap('world'); if (!m) return [];
    const j = m.geoJson || m; const F = j.features || [];
    const sc = j.UTF8Scale || 1024;
    const dp = (s, off) => { const r = []; let px = off[0], py = off[1]; for (let i = 0; i < s.length; i += 2) { let x = s.charCodeAt(i) - 64, y = s.charCodeAt(i + 1) - 64; x = (x >> 1) ^ -(x & 1); y = (y >> 1) ^ -(y & 1); x += px; y += py; px = x; py = y; r.push([x / sc, y / sc]); } return r; };
    return F.map(f => { const g = f.geometry; if (!g) return null; let polys;
      const enc = typeof (g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0]) === 'string';
      if (g.type === 'Polygon') polys = [enc ? g.coordinates.map((r, i) => dp(r, g.encodeOffsets[i])) : g.coordinates];
      else polys = enc ? g.coordinates.map((p, i) => p.map((r, k) => dp(r, g.encodeOffsets[i][k]))) : g.coordinates;
      return { name: f.properties.name, polys }; }).filter(Boolean);
  }
  const FEATS = worldFeatures();
  const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const featAt = (lon, lat) => FEATS.find(f => f.polys.some(p => inRing(lon, lat, p[0]) && !p.slice(1).some(h => inRing(lon, lat, h))));

  /* ---------- Renderer / Szene ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(PR); renderer.setClearColor(0x020306, 1);
  stage.insertBefore(renderer.domElement, stage.firstChild);
  const cv = renderer.domElement;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, 1, 0.05, 400);
  const tilt = new THREE.Group(), spin = new THREE.Group(); tilt.add(spin); scene.add(tilt);
  const R = 1.5;

  const TL = new THREE.TextureLoader(); const hi = !isMobile && (navigator.hardwareConcurrency || 4) >= 6;
  const tex = (u, cb) => { const t = TL.load(u, cb); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const tDay = tex(`tex/day${hi ? '4k' : '2k'}.jpg`), tNight = tex(`tex/night${hi ? '4k' : '2k'}.jpg`), tWater = tex('tex/water.jpg'), tCloud = tex('tex/clouds.jpg');

  const sunW = new THREE.Vector3(1, 0, 0);
  const earthU = { day: { value: tDay }, night: { value: tNight }, water: { value: tWater }, sun: { value: sunW }, camPos: { value: new THREE.Vector3() } };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), new THREE.ShaderMaterial({ uniforms: earthU,
    vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vW;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform sampler2D day,night,water;uniform vec3 sun,camPos;varying vec2 vUv;varying vec3 vN;varying vec3 vW;
      void main(){vec3 n=normalize(vN);vec3 v=normalize(camPos-vW);float d=dot(n,sun);float m=smoothstep(-.10,.22,d);
      vec3 dc=texture2D(day,vUv).rgb;vec3 nc=texture2D(night,vUv).rgb;float w=texture2D(water,vUv).r;
      vec3 lit=dc*(.18+1.05*max(d,0.));vec3 dark=nc*vec3(1.,.82,.55)*1.8+dc*.035;vec3 col=mix(dark,lit,m);
      vec3 h=normalize(sun+v);col+=vec3(1.,.93,.8)*pow(max(dot(n,h),0.),70.)*w*.9*m;
      float tw=smoothstep(-.12,0.,d)*(1.-smoothstep(0.,.14,d));col+=vec3(1.,.45,.15)*tw*.18;
      float fr=pow(1.-max(dot(n,v),0.),2.6);col=mix(col,vec3(.35,.62,1.)*(.2+.8*m),fr*.32);
      gl_FragColor=vec4(col,1.);}` }));
  spin.add(earth);

  const cloudU = { map: { value: tCloud }, sun: { value: sunW }, off: { value: 0 } };
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.007, 96, 72), new THREE.ShaderMaterial({ uniforms: cloudU, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform sampler2D map;uniform vec3 sun;uniform float off;varying vec2 vUv;varying vec3 vN;void main(){float a=texture2D(map,vec2(vUv.x+off,vUv.y)).r;float d=dot(normalize(vN),sun);float l=.06+1.*smoothstep(-.15,.4,d);gl_FragColor=vec4(vec3(l),a*.85);}' }));
  spin.add(clouds);

  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 96, 72), new THREE.ShaderMaterial({ uniforms: { sun: { value: sunW } }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN;varying vec3 vV;varying vec3 vNW;void main(){vN=normalize(normalMatrix*normal);vNW=normalize(mat3(modelMatrix)*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 sun;varying vec3 vN;varying vec3 vV;varying vec3 vNW;void main(){float f=pow(clamp(.70-dot(vN,vV),0.,1.),3.6)*1.7;float s=.35+.65*smoothstep(-.3,.5,dot(vNW,sun));gl_FragColor=vec4(vec3(.32,.6,1.)*f*s,f*s);}' }));
  scene.add(atmo);

  // Sterne
  { const n = 2200, P = [], C = []; for (let i = 0; i < n; i++) { const v = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(120 + Math.random() * 60); P.push(v.x, v.y, v.z); const k = .35 + Math.random() * .65; C.push(k, k, k * (.9 + Math.random() * .1)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: .32, vertexColors: true, transparent: true, opacity: .85 }))); }

  /* ---------- Koordinaten ---------- */
  const ll = (lat, lon, r = R) => { const phi = (lon + 180) * D2R, la = lat * D2R; return new THREE.Vector3(-Math.cos(phi) * Math.cos(la) * r, Math.sin(la) * r, Math.sin(phi) * Math.cos(la) * r); };
  function sunLatLon(d = new Date()) {
    const start = Date.UTC(d.getUTCFullYear(), 0, 0), day = (d - start) / 864e5;
    const decl = -23.44 * Math.cos(2 * Math.PI / 365 * (day + 10));
    const B = 2 * Math.PI * (day - 81) / 364, eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const utcMin = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
    let lon = -((utcMin + eot) / 4 - 180); lon = ((lon + 540) % 360) - 180; return [decl, lon];
  }

  /* ---------- Landesgrenzen ---------- */
  const borderMat = new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: .22, depthWrite: false });
  { const P = []; FEATS.forEach(f => f.polys.forEach(p => p.forEach(ring => { for (let i = 0; i < ring.length - 1; i++) { const a = ll(ring[i][1], ring[i][0], R * 1.0012), b = ll(ring[i + 1][1], ring[i + 1][0], R * 1.0012); P.push(a.x, a.y, a.z, b.x, b.y, b.z); } })));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); spin.add(new THREE.LineSegments(g, borderMat)); }
  let hiLine = null;
  function highlight(rings, color) {
    if (hiLine) { spin.remove(hiLine); hiLine.traverse(o => o.geometry && o.geometry.dispose()); hiLine = null; }
    if (!rings) return;
    hiLine = new THREE.Group();
    rings.forEach(ring => { [1.0025, 1.004].forEach((rr, k) => { const pts = ring.map(([lon, lat]) => ll(lat, lon, R * rr)); const g = new THREE.BufferGeometry().setFromPoints(pts); hiLine.add(new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: k ? .45 : 1, depthWrite: false }))); }); });
    spin.add(hiLine);
  }

  /* ---------- Impulse, Markierungen, Bögen ---------- */
  const pulses = []; const pulseGeo = new THREE.RingGeometry(.02, .028, 40);
  function pulse(lat, lon, color = 0xffffff, size = 1) { const m = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    const v = ll(lat, lon, R * 1.003); m.position.copy(v); m.lookAt(v.clone().multiplyScalar(2)); spin.add(m); pulses.push({ m, t: 0, s: size }); }
  const ZRH = [47.37, 8.54];
  let pins = [], arcs = [], places = [];
  function clearMarks() { pins.forEach(p => spin.remove(p.g)); arcs.forEach(a => spin.remove(a.g)); pins = []; arcs = []; $('#lgPins').innerHTML = ''; }
  function setPins(hs) {
    clearMarks();
    hs.forEach((h, i) => {
      const col = h.watch ? 0x8fe6ff : 0xff4d3a, g = new THREE.Group(); const v = ll(h.lat, h.lon, R * 1.003); g.position.copy(v); g.lookAt(v.clone().multiplyScalar(2)); spin.add(g);
      g.add(new THREE.Mesh(new THREE.CircleGeometry(.018, 24), new THREE.MeshBasicMaterial({ color: 0xffffff })));
      const rings = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(.03, .036, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, depthWrite: false })); g.add(m); return m; });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .22, 6), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .9 })); beam.rotation.x = Math.PI / 2; beam.position.z = .11; g.add(beam);
      pins.push({ g, rings, h, i });
      const a = ll(ZRH[0], ZRH[1], 1).normalize(), b = ll(h.lat, h.lon, 1).normalize(); const ang = a.angleTo(b); if (ang < .02) return;
      const N = 96, pts = []; for (let k = 0; k <= N; k++) { const t = k / N; const qv = new THREE.Vector3().copy(a).multiplyScalar(Math.sin((1 - t) * ang)).add(b.clone().multiplyScalar(Math.sin(t * ang))).divideScalar(Math.sin(ang)); pts.push(qv.multiplyScalar(R * (1.004 + Math.sin(Math.PI * t) * ang * .16))); }
      const ag = new THREE.BufferGeometry().setFromPoints(pts); ag.setDrawRange(0, 0);
      const line = new THREE.Line(ag, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: .75, depthWrite: false })); spin.add(line);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); line.add(dot);
      arcs.push({ g: line, pts, t0: performance.now() + i * 260, dot });
    });
    $('#lgPins').innerHTML = hs.map((h, i) => `<button class="lgpin${h.watch ? ' w' : ''}" data-hs="${i}"><b>${h.watch ? '◎' : i + 1}</b>${esc(h.n)}<small>${h.count}</small></button>`).join('');
  }
  const KPLACES = [['Qamişlo', 37.05, 41.22], ['Kobanê', 36.89, 38.35], ['Amed', 37.91, 40.23], ['Hewlêr', 36.19, 44.01], ['Silêmanî', 35.56, 45.43], ['Mahabad', 36.76, 45.72]];
  const KREG = [['ROJAVA', 36.7, 40.0], ['BAKUR', 38.6, 41.2], ['BAŞÛR', 36.0, 44.6], ['ROJHILAT', 36.2, 46.9]];
  const KURD = [[37.0, 37.0], [38.4, 38.1], [39.8, 38.9], [41.4, 39.8], [43.4, 39.9], [44.6, 39.4], [45.3, 38.3], [46.2, 37.0], [46.9, 35.8], [46.5, 34.6], [45.6, 34.1], [44.9, 34.9], [44.0, 35.3], [43.1, 36.1], [42.3, 36.4], [41.2, 36.5], [40.0, 36.8], [38.8, 36.5], [37.7, 36.3]];
  function showPlaces(on) {
    places.forEach(p => spin.remove(p.m)); places = []; const box = $('#lgPlaces'); box.innerHTML = '';
    if (!on) return;
    KPLACES.forEach(([n, la, lo]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(.008, 16), new THREE.MeshBasicMaterial({ color: 0xffe2b0 })); const v = ll(la, lo, R * 1.003); m.position.copy(v); m.lookAt(v.clone().multiplyScalar(2)); spin.add(m); places.push({ m, n }); });
    KREG.forEach(([n, la, lo]) => { const m = new THREE.Object3D(); m.position.copy(ll(la, lo, R * 1.003)); spin.add(m); places.push({ m, n, reg: true }); });
    box.innerHTML = places.map((p, i) => `<span class="lgplace${p.reg ? ' r' : ''}" data-i="${i}">${esc(p.n)}</span>`).join('');
  }

  /* ---------- Kamera ---------- */
  let want = null, auto = .05, dist = 7, distGoal = 7, panelOpen = false, lastUser = 0;
  const baseDist = () => (stage.clientWidth < stage.clientHeight ? 9.2 : 6.6);
  function faceTo(lat, lon) { const v = ll(lat, lon); const a = Math.atan2(v.z, v.x); want = { y: a - Math.PI / 2, x: lat * D2R * .9 }; }
  cv.style.touchAction = 'none';
  const ptr = new Map(); let pinch0 = 0, dist0 = 0, down = null;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY, t: performance.now() }; lastUser = performance.now();
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = distGoal; } });
  cv.addEventListener('pointermove', e => { const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; lastUser = performance.now();
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; distGoal = Math.min(12, Math.max(2.25, dist0 * pinch0 / Math.hypot(a.x - b.x, a.y - b.y))); return; }
    want = null; const k = .0045 * dist / 6; spin.rotation.y += dx * k; tilt.rotation.x = Math.max(-1.2, Math.min(1.2, tilt.rotation.x + dy * k)); });
  const up = e => { ptr.delete(e.pointerId); if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 450) tapAt(e); down = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => ptr.delete(e.pointerId));
  cv.addEventListener('wheel', e => { distGoal = Math.min(12, Math.max(2.25, distGoal * (1 + e.deltaY * .001))); e.preventDefault(); }, { passive: false });

  const ray = new THREE.Raycaster(), nd = new THREE.Vector2();
  function tapAt(e) {
    const r = cv.getBoundingClientRect(); nd.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(nd, cam);
    const hit = ray.intersectObject(earth)[0]; if (!hit) return;
    const lon = hit.uv.x * 360 - 180, lat = (hit.uv.y - .5) * 180;
    if (inRing(lon, lat, KURD)) return openCode('KU', true);
    const f = featAt(lon, lat); if (!f) return;
    const code = data && Object.keys(data.geo || {}).find(k => data.geo[k][3] === f.name);
    if (code) return openCode(code, true);
    openGeneric(f, lat, lon);
  }

  /* ---------- Lagebild-Panel ---------- */
  const WX = c => c == null ? '' : c === 0 ? 'klar' : c <= 3 ? 'bewölkt' : c <= 48 ? 'Nebel' : c <= 67 ? 'Regen' : c <= 77 ? 'Schnee' : c <= 82 ? 'Schauer' : 'Gewitter';
  let clockT = 0;
  function fillPanel({ meta, head, count, tz, wx, items, images, extra, watch }) {
    const P = $('#lgPanel'); P.classList.toggle('w', !!watch);
    $('#lgcMeta').textContent = meta; $('#lgcHead').textContent = head;
    $('#lgcN').textContent = count ?? '–';
    $('#lgcWx').textContent = wx && wx.temp != null ? `${Math.round(wx.temp)}° ${WX(wx.code)}` : '–';
    $('#lgcWind').textContent = wx && wx.wind != null ? `${Math.round(wx.wind)} km/h` : '–';
    clearInterval(clockT); const tick = () => { $('#lgcTime').textContent = tz ? new Date().toLocaleTimeString('de-CH', { timeZone: tz }) : '–'; }; tick(); clockT = setInterval(tick, 1000);
    $('#lgcImgs').innerHTML = (images || []).slice(0, 8).map(im => `<figure><img src="${esc(im.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"><figcaption>${esc(im.s || '')}</figcaption></figure>`).join('');
    $('#lgcList').innerHTML = (items || []).slice(0, 5).map(it => `<li>${it.u ? `<a href="${esc(it.u)}" target="_blank" rel="noopener">${esc(it.t)}</a>` : esc(it.t)}<small>${esc(it.s || '')}</small></li>`).join('') || '<li class="none">Keine Meldungen im aktuellen Datensatz.</li>';
    $('#lgcExtra').innerHTML = extra || '';
    P.classList.add('on'); panelOpen = true;
  }
  function closePanel() { $('#lgPanel').classList.remove('on'); panelOpen = false; clearInterval(clockT); highlight(null); showPlaces(false); distGoal = baseDist(); auto = .05; }
  const featByEn = en => FEATS.find(f => f.name === en);
  function focusCountry(h) {
    faceTo(h.lat, h.lon);
    const big = ['US', 'RU', 'CN', 'CA', 'BR', 'IN'].includes(h.c);
    distGoal = isMobile ? (big ? 5.6 : 4.4) : (big ? 4.4 : 3.1);
    if (h.c === 'KU') { highlight([KURD], 0xffb547); showPlaces(true); }
    else { const f = featByEn(h.en); highlight(f ? f.polys.map(p => p[0]) : null, h.watch ? 0x8fe6ff : 0xff6a3d); showPlaces(false); }
  }
  function hotspotPanel(h) {
    const extra = h.c === 'KU' ? `<div class="lgx">Orientierungspunkte: Rojava, Bakur, Başûr, Rojhilat · Qamişlo, Kobanê, Amed, Hewlêr, Silêmanî, Mahabad. Keine eingezeichneten Staatsgrenzen.<br><a href="https://www.rudaw.net/english" target="_blank" rel="noopener">Rudaw</a> · <a href="https://www.kurdistan24.net/en" target="_blank" rel="noopener">Kurdistan 24</a></div>` : '';
    fillPanel({ meta: `${h.watch ? 'BEOBACHTET' : 'BRENNPUNKT'} · ${h.n.toUpperCase()} · ${h.cap.toUpperCase()}`, head: h.headline || h.n, count: h.count, tz: h.tz, wx: h.weather, items: h.items, images: h.images, extra, watch: h.watch });
  }
  function openCode(code, speak) {
    if (!data) return; const h = data.hotspots.find(x => x.c === code);
    if (h) { runId++; phase(''); auto = 0; focusCountry(h); hotspotPanel(h); if (speak) narrate(h); return; }
    const g = data.geo[code]; if (!g) return;
    const items = (data.headlines || []).filter(x => (x.c || []).includes(code)).map(x => ({ t: x.t, s: x.s }));
    const pseudo = { c: code, n: g[2], en: g[3], lat: g[0], lon: g[1] };
    runId++; phase(''); auto = 0; focusCountry(pseudo);
    fillPanel({ meta: `LAGEBILD · ${g[2].toUpperCase()}`, head: items[0]?.t || `${g[2]}: keine aktuelle Schlagzeile`, count: data.counts?.[code] ?? items.length, tz: null, wx: null, items, images: [] });
    if (speak) narrate({ n: g[2], count: data.counts?.[code] ?? items.length, items });
  }
  function openGeneric(f, lat, lon) {
    runId++; phase(''); auto = 0; faceTo(lat, lon); distGoal = isMobile ? 4.6 : 3.4;
    highlight(f.polys.map(p => p[0]), 0xd9e8ff); showPlaces(false);
    const items = (data?.headlines || []).filter(x => x.t.toLowerCase().includes(f.name.toLowerCase())).map(x => ({ t: x.t, s: x.s }));
    fillPanel({ meta: `LAGEBILD · ${f.name.toUpperCase()}`, head: items[0]?.t || `${f.name}: keine Meldung im aktuellen Datensatz`, count: items.length, tz: null, wx: null, items, images: [] });
    narrate({ n: f.name, count: items.length, items });
  }
  function narrate(h) {
    const top = (h.items || []).slice(0, 3).map(x => x.t).join(' | ');
    const ctx = `Der Master hat in der Weltlage auf ${h.n} getippt. Meldungen im aktuellen Datensatz: ${h.count ?? 0}. Schlagzeilen: ${top || 'keine'}.${h.weather && h.weather.temp != null ? ` Wetter in ${h.cap}: ${Math.round(h.weather.temp)} Grad.` : ''}`;
    const v = $('#lgVoice'); v.classList.add('on'); setTimeout(() => v.classList.remove('on'), 9000);
    try { window.JARVIS && window.JARVIS.say(ctx); } catch (e) {}
  }

  /* ---------- Live-Feed ---------- */
  const feed = $('#lgFeed');
  function feedLine(x) {
    const d = document.createElement('div'); d.className = 'lgf';
    d.innerHTML = `<i>${esc((x.c && x.c[0]) || '··')}</i><span>${esc(x.t)}</span><em>${esc(x.s || '')}</em>`;
    feed.prepend(d); while (feed.children.length > (isMobile ? 4 : 16)) feed.lastChild.remove();
  }

  /* ---------- Ablauf ---------- */
  let data = null, runId = 0, active = false, sweep = 0;
  const phase = t => { const p = $('#lgPhase'); p.textContent = t || ''; p.classList.toggle('on', !!t); };
  async function load() { const r = await fetch(API, { cache: 'no-store' }); if (!r.ok) throw new Error('Nachrichtendienst ' + r.status); const j = await r.json(); if (!j.hotspots) throw new Error(j.error || 'keine Daten'); return j; }
  async function run() {
    const id = ++runId; const alive = () => id === runId && active;
    closePanel(); clearMarks(); phase('VERBINDE MIT QUELLEN'); $('#lgCount').textContent = '0'; feed.innerHTML = ''; want = null; auto = .18;
    try { data = await load(); } catch (e) { phase(''); $('#lgSrc').textContent = 'Weltlage nicht erreichbar: ' + e.message; return; }
    if (!alive()) return; window.__lageData = data;
    const srcN = new Set(data.headlines.map(h => h.s).filter(Boolean)).size; $('#lgSrcN').textContent = srcN;
    $('#lgSrc').textContent = `Quellen: Google News, BBC, DW, Al Jazeera · Bilder: Bing News · Wetter: Open-Meteo · Stand ${new Date(data.stand).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;
    $('#lgBtns').innerHTML = data.hotspots.map((h, i) => `<button data-hs="${i}"${h.watch ? ' class="w"' : ''}>${h.watch ? '◎' : i + 1} · ${esc(h.n)}</button>`).join('');
    phase('LIVE-AUSWERTUNG'); sweep = 1;
    const H = data.headlines, N = data.total, t0 = performance.now(), dur = 7000; let k = 0;
    while (performance.now() - t0 < dur && alive()) {
      const f = (performance.now() - t0) / dur; $('#lgCount').textContent = Math.round(N * Math.min(1, f * 1.05)).toLocaleString('de-CH');
      const x = H[k++ % H.length]; feedLine(x);
      (x.c || []).forEach(c => { const g = data.geo[c]; if (g) pulse(g[0], g[1], c === 'KU' || c === 'CH' ? 0x8fe6ff : 0xffb08a, 1); });
      await sleep(110);
    }
    $('#lgCount').textContent = N.toLocaleString('de-CH'); sweep = 0; if (!alive()) return;
    const top = data.hotspots.filter(h => !h.watch), nw = data.hotspots.length - top.length;
    setPins(data.hotspots); auto = 0; if (top[0]) faceTo(top[0].lat, top[0].lon); phase(`${top.length === 3 ? 'DREI' : top.length} BRENNPUNKTE${nw ? ` · ${nw} BEOBACHTET` : ''}`);
    await sleep(3400); if (!alive()) return; phase('');
    for (const h of data.hotspots) {
      if (!alive()) return; focusCountry(h); await sleep(1500); if (!alive()) return;
      hotspotPanel(h); await sleep(9000); if (!alive()) return;
      $('#lgPanel').classList.remove('on'); panelOpen = false; await sleep(500);
    }
    if (alive()) { highlight(null); showPlaces(false); distGoal = baseDist(); auto = .05; want = null; }
    let j = 0; while (alive()) { feedLine(H[j++ % H.length]); await sleep(2600); }
  }
  stage.addEventListener('click', e => {
    const b = e.target.closest('[data-hs]'); if (b && data) { const h = data.hotspots[+b.dataset.hs]; if (h) openCode(h.c, true); return; }
    if (e.target.closest('#lgReplay')) run();
    if (e.target.closest('#lgcClose')) { runId++; phase(''); closePanel(); }
  });

  /* ---------- Render-Schleife ---------- */
  let raf = 0, last = performance.now(), shiftNow = 0, focusT = 0;
  const tv = new THREE.Vector3(), cw = new THREE.Vector3(), q = new THREE.Quaternion();
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 46 : 34; cam.updateProjectionMatrix(); }
  addEventListener('resize', () => setTimeout(resize, 80));
  function project(obj, el, off = 0) { obj.getWorldPosition(tv); const facing = tv.clone().normalize().dot(cw.copy(cam.position).normalize()) > .18; tv.project(cam);
    el.style.opacity = facing ? 1 : 0; el.style.pointerEvents = facing ? 'auto' : 'none'; el.style.transform = `translate(${(tv.x * .5 + .5) * stage.clientWidth}px,${(-tv.y * .5 + .5) * stage.clientHeight + off}px)`; }
  function loop(now) {
    raf = requestAnimationFrame(loop); if (document.hidden) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now; const T = now / 1000;
    const ez = 1 - Math.pow(.05, dt); if (want) { spin.rotation.y += Math.atan2(Math.sin(want.y - spin.rotation.y), Math.cos(want.y - spin.rotation.y)) * ez; tilt.rotation.x += (want.x - tilt.rotation.x) * ez; }
    else if (!ptr.size && now - lastUser > 2500) { spin.rotation.y += auto * dt; tilt.rotation.x += (.32 - tilt.rotation.x) * .006; }
    dist += (distGoal - dist) * (1 - Math.pow(.08, dt));
    const w = stage.clientWidth, h = stage.clientHeight; const shift = panelOpen ? (w > h ? w * .17 : -h * .2) : 0;
    shiftNow += (shift - shiftNow) * .08;
    if (w > h) cam.setViewOffset(w, h, shiftNow, 0, w, h); else cam.setViewOffset(w, h, 0, -shiftNow, w, h);
    cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0);
    const [sl, so] = sunLatLon(); earth.getWorldQuaternion(q); sunW.copy(ll(sl, so, 1).normalize().applyQuaternion(q));
    earthU.camPos.value.copy(cam.position); cloudU.off.value = (T * .0012) % 1;
    for (let i = pulses.length - 1; i >= 0; i--) { const p = pulses[i]; p.t += dt; const k = p.t / 1.6; p.m.scale.setScalar(1 + k * 6 * p.s); p.m.material.opacity = Math.max(0, 1 - k); if (k >= 1) { spin.remove(p.m); p.m.material.dispose(); pulses.splice(i, 1); } }
    pins.forEach(p => { p.rings.forEach((m, k) => { const qq = (T * .6 + k * .5) % 1; m.scale.setScalar(1 + qq * 2.6); m.material.opacity = .9 * (1 - qq); }); const el = stage.querySelector(`.lgpin[data-hs="${p.i}"]`); if (el) project(p.g, el); });
    arcs.forEach(a => { const k = Math.max(0, Math.min(1, (now - a.t0) / 1400)); const n = Math.floor(k * (a.pts.length - 1)); a.g.geometry.setDrawRange(0, n + 1); const j = Math.floor(((T * .35 + a.t0 * .001) % 1) * (n || 1)); a.dot.position.copy(a.pts[Math.min(j, a.pts.length - 1)]); a.dot.visible = k >= 1; });
    places.forEach((p, i) => { const el = stage.querySelector(`.lgplace[data-i="${i}"]`); if (el) project(p.m, el, -6); });
    borderMat.opacity = .14 + Math.max(0, (7 - dist)) * .05;
    $('#lgClock').textContent = 'UTC ' + new Date().toISOString().slice(11, 19);
    if (now - focusT > 400) { focusT = now; ray.setFromCamera(nd.set(0, 0), cam); const hit = ray.intersectObject(earth)[0]; if (hit) { const lo = hit.uv.x * 360 - 180, la = (hit.uv.y - .5) * 180; $('#lgFocus').textContent = `FOKUS ${Math.abs(la).toFixed(2)}°${la >= 0 ? 'N' : 'S'} ${Math.abs(lo).toFixed(2)}°${lo >= 0 ? 'E' : 'W'}`; } }
    stage.classList.toggle('scan', !!sweep);
    renderer.render(scene, cam);
  }
  function start() { if (active) return; active = true; window.__holoPause = true; resize(); dist = 14; distGoal = baseDist(); last = performance.now(); raf = requestAnimationFrame(loop); run(); }
  function stop() { if (!active) return; active = false; runId++; cancelAnimationFrame(raf); closePanel(); if (!document.querySelector('#v-office.on')) window.__holoPause = false; }
  J.onView(v => { if (v === 'lage') start(); else stop(); });

  window.LAGE = {
    start, run, open: code => openCode(code, false),
    async briefing() { const d = window.__lageData || data || await load().catch(() => null); if (!d) return { fehler: 'Weltlage nicht erreichbar' };
      return { stand: d.stand, quelle: d.quelle, gescannte_schlagzeilen: d.total, brennpunkte: d.hotspots.map(h => ({ land: h.n, beobachtet: !!h.watch, meldungen: h.count, top_schlagzeile: h.headline, weitere: h.items.slice(1, 4).map(x => x.t), ortszeit: new Date().toLocaleTimeString('de-CH', { timeZone: h.tz, hour: '2-digit', minute: '2-digit' }), wetter: h.weather })) }; },
  };
})();
