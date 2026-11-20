/* =====================================================================
   JARVIS OMEGA · WELTLAGE
   Globus scannt echte Schlagzeilen → drei Brennpunkte → Länder-Zoom
   mit Karte, Bildern, Meldungen, Ortszeit und Wetter.
   Daten: eigener Vercel-Dienst /api/news (Google News RSS, Bing News, Open-Meteo).
   ===================================================================== */
(function () {
  if (typeof THREE === 'undefined' || !window.J) return;
  const J = window.J;
  const API = 'https://jarvis-iota-weld.vercel.app/api/news';
  const stage = document.getElementById('lageStage'); if (!stage) return;
  const $ = s => stage.querySelector(s);
  const isMobile = matchMedia('(max-width:899px)').matches;
  const PR = Math.min(devicePixelRatio || 1, isMobile ? 1.6 : 2);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Weltkarte aus ECharts-Daten dekodieren ---------- */
  function worldFeatures() {
    const m = window.echarts && echarts.getMap && echarts.getMap('world'); if (!m) return [];
    const j = m.geoJson || m; const F = j.features || [];
    if (!j.UTF8Encoding) return F;
    const sc = j.UTF8Scale || 1024;
    const dp = (s, off) => { const r = []; let px = off[0], py = off[1]; for (let i = 0; i < s.length; i += 2) { let x = s.charCodeAt(i) - 64, y = s.charCodeAt(i + 1) - 64; x = (x >> 1) ^ -(x & 1); y = (y >> 1) ^ -(y & 1); x += px; y += py; px = x; py = y; r.push([x / sc, y / sc]); } return r; };
    return F.map(f => { const g = f.geometry; if (!g) return f;
      let coords;
      if (g.type === 'Polygon') coords = g.coordinates.map((ring, i) => dp(ring, g.encodeOffsets[i]));
      else coords = g.coordinates.map((poly, i) => poly.map((ring, k) => dp(ring, g.encodeOffsets[i][k])));
      return { properties: f.properties, geometry: { type: g.type, coordinates: coords } }; });
  }

  /* ---------- Renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false });
  renderer.setPixelRatio(PR); renderer.outputEncoding = THREE.sRGBEncoding; renderer.setClearColor(0x05070c, 1);
  stage.insertBefore(renderer.domElement, stage.firstChild);
  const cv = renderer.domElement;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 200); cam.position.set(0, 0, 6.2);
  const tilt = new THREE.Group(), spin = new THREE.Group(); tilt.add(spin); scene.add(tilt);
  const R = 1.55;

  // Erdtextur
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d', { willReadFrequently: true });
    const oc = g.createLinearGradient(0, 0, 0, 1024); oc.addColorStop(0, '#0a1626'); oc.addColorStop(0.5, '#0d1d33'); oc.addColorStop(1, '#0a1626'); g.fillStyle = oc; g.fillRect(0, 0, 2048, 1024);
    g.strokeStyle = 'rgba(120,160,210,.08)'; g.lineWidth = 1; for (let x = 0; x <= 2048; x += 2048 / 36) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); } for (let y = 0; y <= 1024; y += 1024 / 18) { g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); }
    const P = ([lon, lat]) => [(lon + 180) / 360 * 2048, (90 - lat) / 180 * 1024];
    const draw = rings => { g.beginPath(); rings.forEach(r => r.forEach((pt, i) => { const [x, y] = P(pt); i ? g.lineTo(x, y) : g.moveTo(x, y); })); };
    const F = worldFeatures();
    F.forEach(f => { const gm = f.geometry; const polys = gm.type === 'Polygon' ? [gm.coordinates] : gm.coordinates;
      polys.forEach(rings => { draw(rings); const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, '#6f8db3'); gr.addColorStop(0.5, '#5b7aa3'); gr.addColorStop(1, '#6f8db3'); g.fillStyle = gr; g.fill('evenodd'); g.strokeStyle = 'rgba(200,225,255,.55)'; g.lineWidth = 1.1; g.stroke(); }); });
    if (!F.length) { g.fillStyle = 'rgba(111,141,179,.6)'; g.font = '700 60px Inter'; g.fillText('KARTE WIRD GELADEN', 700, 520); }
    // Stadtlichter-Rauschen
    for (let i = 0; i < 2500; i++) { const x = Math.random() * 2048, y = 200 + Math.random() * 520; const d = g.getImageData(x | 0, y | 0, 1, 1).data; if (d[2] > 120 && d[0] > 80) { g.fillStyle = `rgba(255,${190 + Math.random() * 50 | 0},140,${0.25 + Math.random() * 0.4})`; g.fillRect(x, y, 1.6, 1.6); } }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  })();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshPhongMaterial({ map: tex, shininess: 18, specular: 0x223344, emissive: 0x0a1420, emissiveIntensity: 0.6 }));
  spin.add(earth);
  scene.add(new THREE.AmbientLight(0x8fa8c8, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(-3, 2, 4); scene.add(sun);

  // Roter Atmosphären-Glanz (Fresnel)
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.2, 64, 48), new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(0xff3b1f) }, uP: { value: 1 } }, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uC;uniform float uP;varying vec3 vN;varying vec3 vV;void main(){float f=pow(clamp(0.78-dot(vN,vV),0.,1.),2.4)*1.7*uP;gl_FragColor=vec4(uC*f,f);}'
  })); scene.add(atmo);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.008, 64, 48), new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(0xff6a2a) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uC;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-max(dot(vN,vV),0.),3.)*1.4;gl_FragColor=vec4(uC*f,f);}'
  })); scene.add(rim);

  // HUD-Ringe
  const hud = new THREE.Group(); scene.add(hud);
  const ringM = (r, op, w = 0.004) => { const m = new THREE.Mesh(new THREE.RingGeometry(r, r + w, 160), new THREE.MeshBasicMaterial({ color: 0xffb08a, transparent: true, opacity: op, side: THREE.DoubleSide })); hud.add(m); return m; };
  ringM(R * 1.32, 0.35); const dash = ringM(R * 1.38, 0.18, 0.012); ringM(R * 1.55, 0.08);
  const ticks = new THREE.Group(); hud.add(ticks);
  for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2, L = i % 10 === 0 ? 0.09 : 0.035; const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Math.cos(a) * R * 1.42, Math.sin(a) * R * 1.42, 0), new THREE.Vector3(Math.cos(a) * (R * 1.42 + L), Math.sin(a) * (R * 1.42 + L), 0)]); ticks.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffc8a8, transparent: true, opacity: 0.45 }))); }

  // Scan-Strahlen
  const burst = (() => { const n = 260, P = new Float32Array(n * 6); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffe2c8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(m); return m; })();
  function reburst() { const P = burst.geometry.attributes.position.array; for (let i = 0; i < P.length; i += 6) { const a = Math.random() * Math.PI * 2, r0 = R * (0.4 + Math.random() * 0.6), r1 = R * (1.1 + Math.random() * 0.9); P[i] = Math.cos(a) * r0; P[i + 1] = Math.sin(a) * r0; P[i + 2] = 1.6; P[i + 3] = Math.cos(a) * r1; P[i + 4] = Math.sin(a) * r1; P[i + 5] = 1.6; } burst.geometry.attributes.position.needsUpdate = true; }

  // Sterne
  { const n = 1400, P = []; for (let i = 0; i < n; i++) { const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(40 + Math.random() * 30); P.push(v.x, v.y, v.z); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfd2ff, size: 0.09, transparent: true, opacity: 0.7 }))); }

  // Brennpunkt-Pins
  const ll = (lat, lon, r = R) => { const phi = (lon + 180) / 180 * Math.PI, la = lat * Math.PI / 180; return new THREE.Vector3(-Math.cos(phi) * Math.cos(la) * r, Math.sin(la) * r, Math.sin(phi) * Math.cos(la) * r); };
  let pins = [];
  function setPins(hs) {
    pins.forEach(p => spin.remove(p.g)); pins = [];
    hs.forEach((h, i) => { const g = new THREE.Group(); const v = ll(h.lat, h.lon, R * 1.004); g.position.copy(v); g.lookAt(v.clone().multiplyScalar(2)); spin.add(g);
      const col = h.watch ? 0x8fe6ff : 0xff3b1f, col2 = h.watch ? 0xbff1ff : 0xff5a2a, col3 = h.watch ? 0x8fe6ff : 0xff7a3a;
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.035, 24), new THREE.MeshBasicMaterial({ color: col })); g.add(dot);
      const rings = [0, 1, 2].map(k => { const m = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.062, 40), new THREE.MeshBasicMaterial({ color: col2, transparent: true, opacity: 0.8, side: THREE.DoubleSide })); g.add(m); return m; });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.35, 8), new THREE.MeshBasicMaterial({ color: col3, transparent: true, opacity: 0.85 })); beam.rotation.x = Math.PI / 2; beam.position.z = 0.175; g.add(beam);
      pins.push({ g, rings, h, i }); });
    $('#lgPins').innerHTML = hs.map((h, i) => `<div class="lgpin${h.watch ? ' w' : ''}" data-i="${i}"><b>${h.watch ? '◎' : i + 1}</b>${esc(h.n)}</div>`).join('');
  }

  /* ---------- Kamera/Ausrichtung ---------- */
  const Z0 = () => (stage.clientWidth < stage.clientHeight ? 8.6 : 6.2); let want = null, autoSpin = 0.08, zoomGoal = 6.2;
  function faceTo(lat, lon) { const v = ll(lat, lon); const a = Math.atan2(v.z, v.x); want = { y: a - Math.PI / 2, x: THREE.MathUtils.degToRad(lat) * 0.85 }; }
  // Ziehen zum Drehen
  let drag = null; cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drag) return; spin.rotation.y += (e.clientX - drag.x) * 0.006; tilt.rotation.x = Math.max(-0.9, Math.min(0.9, tilt.rotation.x + (e.clientY - drag.y) * 0.004)); drag = { x: e.clientX, y: e.clientY }; want = null; });
  cv.addEventListener('pointerup', () => drag = null); cv.addEventListener('pointercancel', () => drag = null);

  /* ---------- Fliegende Schlagzeilen ---------- */
  const stream = $('#lgStream');
  function flyLine(text) {
    const d = document.createElement('div'); d.className = 'lgfly'; d.textContent = text;
    const top = 8 + Math.random() * 78, dur = 2.2 + Math.random() * 2.6, dir = Math.random() < 0.5;
    d.style.top = top + '%'; d.style.fontSize = (isMobile ? 9 : 11) + Math.random() * (isMobile ? 4 : 6) + 'px'; d.style.opacity = 0.45 + Math.random() * 0.55;
    d.style.animation = `${dir ? 'lgflyL' : 'lgflyR'} ${dur}s linear forwards`;
    stream.appendChild(d); setTimeout(() => d.remove(), dur * 1000 + 50);
  }

  /* ---------- Länder-Ansicht ---------- */
  const WX = c => c == null ? '' : c === 0 ? 'klar' : c <= 3 ? 'bewölkt' : c <= 48 ? 'Nebel' : c <= 67 ? 'Regen' : c <= 77 ? 'Schnee' : c <= 82 ? 'Schauer' : 'Gewitter';
  // ungefähres kurdisches Siedlungsgebiet (vereinfachte Umrisslinie)
  const KURD = [[37.0, 37.0], [38.4, 38.1], [39.8, 38.9], [41.4, 39.8], [43.4, 39.9], [44.6, 39.4], [45.3, 38.3], [46.2, 37.0], [46.9, 35.8], [46.5, 34.6], [45.6, 34.1], [44.9, 34.9], [44.0, 35.3], [43.1, 36.1], [42.3, 36.4], [41.2, 36.5], [40.0, 36.8], [38.8, 36.5], [37.7, 36.3]];
  let mapChart = null, clockT = 0;
  function showCountry(h) {
    const L = $('#lgCountry');
    $('#lgcHead').textContent = h.headline || h.n;
    $('#lgcMeta').textContent = `${h.watch ? 'BEOBACHTET' : 'BRENNPUNKT'} · ${h.n.toUpperCase()} · ${h.count ? h.count + ' MELDUNGEN' : 'KEINE WELT-SCHLAGZEILE · AKTUELLE BERICHTE'}`;
    $('#lgcCap').textContent = h.cap.toUpperCase();
    $('#lgcList').innerHTML = h.items.slice(0, 4).map(it => `<li><a href="${esc(it.u)}" target="_blank" rel="noopener">${esc(it.t)}</a><small>${esc(it.s || '')}</small></li>`).join('');
    $('#lgcImgs').innerHTML = (h.images || []).slice(0, isMobile ? 6 : 9).map((im, i) => `<figure class="${i === 0 ? 'big' : ''}"><img src="${esc(im.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"><figcaption>${esc(im.s || '')}</figcaption></figure>`).join('') || '<div class="lgc-noimg">Keine Bilder verfügbar</div>';
    $('#lgcN').textContent = h.count;
    $('#lgcWx').textContent = h.weather && h.weather.temp != null ? `${Math.round(h.weather.temp)}° · ${WX(h.weather.code)}` : '–';
    $('#lgcWind').textContent = h.weather && h.weather.wind != null ? `${Math.round(h.weather.wind)} km/h` : '–';
    clearInterval(clockT); const tick = () => { $('#lgcTime').textContent = new Date().toLocaleTimeString('de-CH', { timeZone: h.tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }); }; tick(); clockT = setInterval(tick, 1000);
    if (window.echarts) {
      if (!mapChart) mapChart = echarts.init($('#lgcMap'), null, { renderer: 'canvas' });
      mapChart.clear();
      mapChart.setOption({ backgroundColor: 'transparent', animationDurationUpdate: 1200,
        geo: { map: 'world', roam: false, silent: true, boundingCoords: [[h.box[0][0], h.box[1][1]], [h.box[1][0], h.box[0][1]]], layoutCenter: ['50%', '50%'], layoutSize: '100%',
          itemStyle: { areaColor: '#1f2d42', borderColor: 'rgba(150,180,220,.35)', borderWidth: 0.8 },
          regions: h.en ? [{ name: h.en, itemStyle: { areaColor: h.watch ? '#3f9fc4' : '#f08a4b', borderColor: h.watch ? '#bff1ff' : '#ffd3ad', borderWidth: 1.6, shadowColor: h.watch ? 'rgba(143,230,255,.8)' : 'rgba(255,120,60,.8)', shadowBlur: 24 } }] : [] },
        series: [{ type: 'effectScatter', coordinateSystem: 'geo', data: [[h.lon, h.lat]], symbolSize: 12, rippleEffect: { scale: 5, brushType: 'stroke' }, itemStyle: { color: '#fff1e6' }, z: 5 }]
          .concat(h.c === 'KU' ? [{ type: 'custom', coordinateSystem: 'geo', data: [0], silent: true, z: 3, renderItem: (p, api) => ({ type: 'polygon', shape: { points: KURD.map(c => api.coord(c)) }, style: { fill: 'rgba(240,138,75,.88)', stroke: '#ffd3ad', lineWidth: 1.6, shadowBlur: 24, shadowColor: 'rgba(255,120,60,.8)' } }) }] : []) });
      setTimeout(() => mapChart && mapChart.resize(), 50);
    }
    L.classList.add('on');
  }
  function hideCountry() { $('#lgCountry').classList.remove('on'); clearInterval(clockT); }

  /* ---------- Ablauf ---------- */
  let data = null, runId = 0, active = false;
  const phase = t => { const p = $('#lgPhase'); p.textContent = t || ''; p.classList.toggle('on', !!t); };
  async function load() {
    const r = await fetch(API, { cache: 'no-store' }); if (!r.ok) throw new Error('Nachrichtendienst ' + r.status);
    const j = await r.json(); if (!j.hotspots) throw new Error(j.error || 'keine Daten'); return j;
  }
  async function run(startAt) {
    const id = ++runId; const alive = () => id === runId && active;
    hideCountry(); phase('VERBINDE MIT NACHRICHTENQUELLEN …'); $('#lgCount').textContent = '0'; setPins([]); want = null; autoSpin = 0.25;
    try { data = await load(); } catch (e) { phase(''); $('#lgSrc').textContent = 'Weltlage nicht erreichbar: ' + e.message; J.toast?.('Weltlage: ' + e.message); return; }
    if (!alive()) return;
    window.__lageData = data;
    $('#lgSrc').textContent = `Quellen: ${data.quelle} · Stand ${new Date(data.stand).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;
    $('#lgBtns').innerHTML = data.hotspots.map((h, i) => `<button data-hs="${i}"${h.watch ? ' class="w"' : ''}>${h.watch ? '◎' : i + 1} · ${esc(h.n)}</button>`).join('');
    if (startAt == null) {
      // 1 · Scan
      phase('SCANNE WELTWEITE NACHRICHTEN'); reburst(); burstOn = 1;
      const H = data.headlines, N = data.total; const t0 = performance.now(), dur = 6500; let k = 0;
      while (performance.now() - t0 < dur && alive()) { const f = (performance.now() - t0) / dur; $('#lgCount').textContent = Math.round(N * Math.min(1, f * 1.08)); for (let j = 0; j < 2; j++) flyLine(H[k++ % H.length].t); if (Math.random() < 0.3) reburst(); await sleep(140); }
      $('#lgCount').textContent = N; burstOn = 0; if (!alive()) return;
      // 2 · Brennpunkte
      autoSpin = 0; setPins(data.hotspots); faceTo(data.hotspots[0].lat, data.hotspots[0].lon); const nh = data.hotspots.filter(h => !h.watch).length, nw = data.hotspots.length - nh; phase((nh === 3 ? 'DREI BRENNPUNKTE' : nh + ' BRENNPUNKTE') + (nw ? ` · ${nw} BEOBACHTET` : '')); await sleep(3200); if (!alive()) return;
    } else setPins(data.hotspots);
    // 3 · Länder
    const list = startAt == null ? data.hotspots.map((_, i) => i) : [startAt];
    for (const i of list) {
      const h = data.hotspots[i]; if (!h) continue;
      phase(h.watch ? `BEOBACHTET · ${h.n.toUpperCase()}` : `${i + 1} · ${h.n.toUpperCase()}`); autoSpin = 0; faceTo(h.lat, h.lon); await sleep(1600); if (!alive()) return;
      zoomGoal = Z0() * 0.58; await sleep(900); if (!alive()) return;
      phase(''); showCountry(h); await sleep(startAt == null ? 11000 : 15000); if (!alive()) return;
      hideCountry(); zoomGoal = Z0(); await sleep(800); if (!alive()) return;
    }
    phase(''); want = null; autoSpin = 0.08; zoomGoal = Z0();
  }
  stage.addEventListener('click', e => {
    const b = e.target.closest('[data-hs]'); if (b && data) { run(+b.dataset.hs); return; }
    if (e.target.closest('#lgReplay')) run();
    if (e.target.closest('#lgcClose')) { runId++; hideCountry(); zoomGoal = Z0(); autoSpin = 0.08; phase(''); }
  });

  /* ---------- Render-Schleife ---------- */
  let raf = 0, last = performance.now(), burstOn = 0;
  const tv = new THREE.Vector3();
  function resize() { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 58 : 40; cam.updateProjectionMatrix(); if (mapChart) mapChart.resize(); }
  addEventListener('resize', () => setTimeout(resize, 80));
  function loop(now) {
    raf = requestAnimationFrame(loop); if (document.hidden) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; const T = now / 1000;
    if (want) { spin.rotation.y += Math.atan2(Math.sin(want.y - spin.rotation.y), Math.cos(want.y - spin.rotation.y)) * 0.06; tilt.rotation.x += (want.x - tilt.rotation.x) * 0.06; }
    else if (!drag) { spin.rotation.y += autoSpin * dt; tilt.rotation.x += (0.25 - tilt.rotation.x) * 0.01; }
    cam.position.z += (zoomGoal - cam.position.z) * 0.06;
    dash.rotation.z = T * 0.15; ticks.rotation.z = -T * 0.05;
    atmo.material.uniforms.uP.value = 0.9 + Math.sin(T * 1.6) * 0.1 + burstOn * 0.25;
    burst.material.opacity += ((burstOn ? 0.55 : 0) - burst.material.opacity) * 0.15;
    hud.visible = cam.position.z > Z0() * 0.75; if (!want && zoomGoal > 5) zoomGoal = Z0();
    // Pins
    const w = stage.clientWidth, hgt = stage.clientHeight;
    pins.forEach(p => { p.rings.forEach((m, k) => { const q = (T * 0.7 + k / 3) % 1; m.scale.setScalar(1 + q * 3); m.material.opacity = 0.8 * (1 - q); });
      const el = stage.querySelector(`.lgpin[data-i="${p.i}"]`); if (!el) return;
      p.g.getWorldPosition(tv); const facing = tv.clone().normalize().dot(cam.position.clone().normalize()) > 0.15; tv.project(cam);
      el.style.opacity = facing && cam.position.z > Z0() * 0.75 ? 1 : 0; el.style.transform = `translate(${(tv.x * 0.5 + 0.5) * w}px,${(-tv.y * 0.5 + 0.5) * hgt}px)`; });
    renderer.render(scene, cam);
  }
  function start() { if (active) return; active = true; window.__holoPause = true; resize(); last = performance.now(); raf = requestAnimationFrame(loop); run(); }
  function stop() { if (!active) return; active = false; runId++; cancelAnimationFrame(raf); hideCountry(); stream.innerHTML = ''; if (!document.querySelector('#v-office.on')) window.__holoPause = false; }
  J.onView(v => { if (v === 'lage') start(); else stop(); });

  window.LAGE = {
    start, run,
    async briefing() { const d = window.__lageData || await load().catch(() => null); if (!d) return { fehler: 'Weltlage nicht erreichbar' };
      return { stand: d.stand, quelle: d.quelle, gescannte_schlagzeilen: d.total, brennpunkte: d.hotspots.map(h => ({ land: h.n, meldungen: h.count, top_schlagzeile: h.headline, weitere: h.items.slice(1, 4).map(x => x.t), ortszeit: new Date().toLocaleTimeString('de-CH', { timeZone: h.tz, hour: '2-digit', minute: '2-digit' }), wetter: h.weather })) }; },
  };
})();
