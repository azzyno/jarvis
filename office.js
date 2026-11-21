/* =====================================================================
   JARVIS · ATRIUM (3D-Investmentbüro)
   Dunkler Raum mit spiegelndem Boden, Lichtsäulen am Horizont, dem
   Chrom-Kern in der Mitte und sechs schwebenden Glas-Tafeln mit Live-Daten.
   Nur echte Daten: Saxo (falls verbunden), App-Portfolio, Börsenzeiten,
   Weltlage, Wetter. Richtwerte werden als solche markiert.
   ===================================================================== */
(function () {
  if (typeof THREE === 'undefined') return;
  const J = window.J; const host = document.getElementById('officeStage');
  if (!host || !J) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch (e) { return; }
  const mobile = () => innerWidth < 900 || innerHeight > innerWidth;
  const PR = Math.min(devicePixelRatio || 1, mobile() ? 1.75 : 2);
  renderer.setPixelRatio(PR);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  host.insertBefore(renderer.domElement, host.firstChild);
  const cv = renderer.domElement;
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const $ = s => document.querySelector(s);

  const BG = 0x060608;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(BG); scene.fog = new THREE.FogExp2(BG, 0.035);
  const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 300);
  const C = new THREE.Vector3(0, 1.45, 3.4);   // Mittelpunkt des Tafel-Bogens (Standort)
  const R = 3.7;                                // Bogenradius
  const SERIF = '"Barlow Condensed", "Arial Narrow", sans-serif', SANS = 'Barlow, system-ui, sans-serif', MONO = '"IBM Plex Mono", ui-monospace, monospace';

  /* ---------- Horizont-Kuppel ---------- */
  const dome = new THREE.Mesh(new THREE.SphereGeometry(120, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float uTime;varying vec3 vP;void main(){float y=vP.y;
      vec3 c=vec3(.022,.022,.028);
      c+=vec3(1.,.42,.16)*exp(-pow((y-.01)*14.,2.))*.22;
      c+=vec3(.55,.7,1.)*exp(-pow((y-.05)*5.,2.))*.06;
      c*=1.-smoothstep(.0,.7,y)*.6;
      gl_FragColor=vec4(c,1.);}`,
  })); scene.add(dome);

  /* ---------- Spiegelnder Boden ---------- */
  if (THREE.Reflector) {
    const refl = new THREE.Reflector(new THREE.CircleGeometry(60, 64), { clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x6a6a70 });
    refl.rotation.x = -Math.PI / 2; scene.add(refl);
  }
  const floorTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 2048; const g = c.getContext('2d');
    const rg = g.createRadialGradient(1024, 1024, 0, 1024, 1024, 1024); rg.addColorStop(0, 'rgba(6,6,8,.52)'); rg.addColorStop(.35, 'rgba(6,6,8,.7)'); rg.addColorStop(1, 'rgba(6,6,8,1)');
    g.fillStyle = rg; g.fillRect(0, 0, 2048, 2048);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1.2;
    for (let r = 60; r < 1024; r += 60) { g.beginPath(); g.arc(1024, 1024, r, 0, 7); g.stroke(); }
    for (let a = 0; a < 72; a++) { const t = a / 72 * Math.PI * 2; g.beginPath(); g.moveTo(1024 + Math.cos(t) * 180, 1024 + Math.sin(t) * 180); g.lineTo(1024 + Math.cos(t) * 1024, 1024 + Math.sin(t) * 1024); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t; })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.004; floorTex.repeat.set(1, 1); scene.add(floor);

  /* ---------- Lichtsäulen am Horizont ---------- */
  const cols = new THREE.Group(); scene.add(cols);
  for (let i = 0; i < 0; i++) {
    const a = (i / 90) * Math.PI * 2 + Math.random() * .04, r = 34 + Math.random() * 16, h = 1.5 + Math.pow(Math.random(), 3) * 14;
    const warm = Math.random() < .14;
    const m = new THREE.Mesh(new THREE.BoxGeometry(.04 + Math.random() * .05, h, .04), new THREE.MeshBasicMaterial({ color: warm ? 0xff7a3a : 0xc9d2e2, transparent: true, opacity: .06 + Math.random() * .2, fog: false }));
    m.position.set(Math.sin(a) * r, h / 2, -Math.cos(a) * r); m.userData.ph = Math.random() * 6; cols.add(m);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(26, 26.06, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25, side: THREE.DoubleSide, fog: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .01; scene.add(ring);

  /* ---------- Zifferblatt am Boden + Lichtsäule + Kern ---------- */
  const dial = (spin) => { const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d'); g.translate(512, 512);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 500, 0, 7); g.stroke();
    for (let i = 0; i < 240; i++) { const t = i / 240 * Math.PI * 2, L = i % 20 === 0 ? 34 : i % 5 === 0 ? 18 : 8; g.strokeStyle = i % 20 === 0 ? 'rgba(255,140,80,.9)' : 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(Math.cos(t) * 490, Math.sin(t) * 490); g.lineTo(Math.cos(t) * (490 - L), Math.sin(t) * (490 - L)); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([2, 10]); g.beginPath(); g.arc(0, 0, 380, 0, 7); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(255,120,60,.8)'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 420, -.6, .9); g.stroke();
    g.strokeStyle = 'rgba(160,210,255,.7)'; g.beginPath(); g.arc(0, 0, 420, 2.4, 3.3); g.stroke();
    const t = new THREE.CanvasTexture(c); return new THREE.Mesh(new THREE.PlaneGeometry(spin, spin), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); };
  const corePos = new THREE.Vector3(C.x, 1.55, C.z - R);
  const dialA = dial(3.2), dialB = dial(2.1); [dialA, dialB].forEach((d, i) => { d.rotation.x = -Math.PI / 2; d.position.set(corePos.x, .012 + i * .002, corePos.z); d.material.opacity = i ? .5 : .8; scene.add(d); });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.42, .7, 6, 48, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uL: { value: 0 } },
    vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uL;varying vec2 vU;void main(){float a=pow(1.-vU.y,2.2)*.14*(1.+uL*2.)*(.6+.4*sin(vU.x*60.));gl_FragColor=vec4(vec3(1.,.62,.4)*a,a);}' }));
  beam.position.set(corePos.x, 3, corePos.z); scene.add(beam);
  const coreMat = window.JCore ? window.JCore.material() : new THREE.MeshBasicMaterial({ color: 0xdddddd });
  const core = new THREE.Mesh(new THREE.SphereGeometry(.42, 160, 120), coreMat); core.position.copy(corePos); scene.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,150,90,.55)'); r.addColorStop(.4, 'rgba(255,110,60,.12)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(2.6, 2.6, 1); halo.position.copy(corePos); scene.add(halo);
  const orbits = [0, 1, 2].map(i => { const o = new THREE.Mesh(new THREE.TorusGeometry(.62 + i * .14, .0025, 6, 200), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xff8a50 : 0xffffff, transparent: true, opacity: .55 - i * .12 })); o.position.copy(corePos); scene.add(o); return o; });

  /* ---------- Schwebestaub ---------- */
  const N = 700, dp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { dp[i * 3] = (Math.random() - .5) * 18; dp[i * 3 + 1] = Math.random() * 5; dp[i * 3 + 2] = C.z - Math.random() * 14 + 4; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: .018, color: 0xffffff, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);

  /* ---------- Glas-Tafeln ---------- */
  const MK = [
    { n: 'SIX', c: 'Zürich', tz: 'Europe/Zurich', o: 540, e: 1050 }, { n: 'XETRA', c: 'Frankfurt', tz: 'Europe/Berlin', o: 540, e: 1050 }, { n: 'LSE', c: 'London', tz: 'Europe/London', o: 480, e: 990 },
    { n: 'NYSE', c: 'New York', tz: 'America/New_York', o: 570, e: 960 }, { n: 'TSE', c: 'Tokio', tz: 'Asia/Tokyo', o: 540, e: 930 }, { n: 'HKEX', c: 'Hongkong', tz: 'Asia/Hong_Kong', o: 570, e: 960 },
  ];
  const tzp = tz => { const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).forEach(p => o[p.type] = p.value); return o; };
  const mkOpen = m => { const p = tzp(m.tz); if (p.weekday === 'Sat' || p.weekday === 'Sun') return false; const t = (+p.hour % 24) * 60 + +p.minute; return t >= m.o && t < m.e; };
  const data = { wx: null, lage: null };
  const PANELS = [
    { k: 'Portfolio', go: 'port', draw: drawPort },
    { k: 'Order', go: 'port', draw: drawOrder },
    { k: 'Märkte', go: 'invest', draw: drawMk },
    null, // Kern
    { k: 'Weltlage', go: 'lage', draw: drawLage },
    { k: 'Wetter', fn: () => window.TRAVEL && window.TRAVEL.weather('Bern'), draw: drawWx },
    { k: 'Immobilien', go: 'calc', draw: drawImmo },
  ];
  const SLOT = .44; // Winkelabstand
  const PW = 1.62, PH = 1.02, CW = 1296, CH = 816;
  const panels = [];
  PANELS.forEach((p, i) => {
    if (!p) return;
    const a = (i - 3) * SLOT;
    const g = new THREE.Group(); g.position.set(C.x + Math.sin(a) * R, C.y, C.z - Math.cos(a) * R); g.lookAt(C.x, C.y, C.z);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ color: 0x0d0e12, transparent: true, opacity: .78, depthWrite: false }));
    const c = document.createElement('canvas'); c.width = CW; c.height = CH; const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8; tex.encoding = THREE.sRGBEncoding;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    face.position.z = .003;
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(PW, .006), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, toneMapped: false }));
    edge.position.set(0, PH / 2, .004);
    const stem = new THREE.Mesh(new THREE.PlaneGeometry(.004, C.y - PH / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .12 }));
    stem.position.set(0, -(PH / 2) - (C.y - PH / 2) / 2, 0);
    g.add(glass, face, edge, stem); g.userData = { i, a, c, tex, p, face, glass, edge, unfold: 0, hov: 0, base: g.position.clone() };
    g.scale.set(.001, .001, .001); scene.add(g); panels.push(g); face.userData.panel = g; glass.userData.panel = g;
  });
  const fit = (g, s, max) => { let f = max; g.font = s.replace('#', f); return f; };
  function frame(g, idx, title, live) {
    g.clearRect(0, 0, CW, CH);
    const gr = g.createLinearGradient(0, 0, 0, CH); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(.35, 'rgba(255,255,255,.015)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, CW, CH);
    g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2; g.strokeRect(1, 1, CW - 2, CH - 2);
    g.fillStyle = 'rgba(255,255,255,.9)'; [[0, 0], [CW, 0], [0, CH], [CW, CH]].forEach(([x, y]) => { g.fillRect(x ? x - 26 : 0, y ? y - 2 : 0, 26, 2); g.fillRect(x ? x - 2 : 0, y ? y - 26 : 0, 2, 26); });
    g.font = `500 22px ${MONO}`; g.fillStyle = '#ff7a3a'; g.fillText(String(idx).padStart(2, '0'), 56, 74);
    g.fillStyle = 'rgba(236,235,232,.55)'; g.fillText(title.toUpperCase(), 104, 74);
    if (live) { g.fillStyle = '#5ef0b1'; g.beginPath(); g.arc(CW - 150, 66, 6, 0, 7); g.fill(); g.font = `500 20px ${MONO}`; g.fillText('LIVE', CW - 132, 74); }
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(56, 100, CW - 112, 1);
  }
  const chf = v => (v < 0 ? '−' : '') + Math.round(Math.abs(v)).toLocaleString('de-CH');
  function drawPort(g) {
    frame(g, 1, 'Portfolio', !!window.__saxoSnap);
    const s = window.__saxoSnap; let sum = null; try { sum = J.summary(); } catch (e) {}
    g.font = `400 30px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.55)';
    if (s && s.gesamtwert != null) {
      g.fillText(`Saxo · ${s.umgebung === 'SIM' ? 'Demo-Konto' : 'Live-Konto'}`, 56, 180);
      g.font = `200 150px ${SANS}`; g.fillStyle = '#f4f3f0'; g.fillText(chf(s.gesamtwert), 50, 340);
      g.font = `400 40px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.6)'; g.fillText(`${s.waehrung || ''} · ${(s.positionen || []).length} Positionen · Cash ${chf(s.cash || 0)}`, 56, 410);
      (s.positionen || []).slice(0, 4).forEach((p, k) => { const y = 500 + k * 62; g.font = `400 30px ${SANS}`; g.fillStyle = '#ecebe8'; g.fillText(String(p.titel || p.symbol || '').slice(0, 34), 56, y); g.textAlign = 'right'; g.fillStyle = (p.gv || 0) >= 0 ? '#5ef0b1' : '#ff7a6b'; g.fillText((p.gv >= 0 ? '+' : '') + chf(p.gv || 0), CW - 56, y); g.textAlign = 'left'; });
    } else {
      g.fillText('Saxo', 56, 180);
      g.font = `400 120px ${SERIF}`; g.fillStyle = '#f4f3f0'; g.fillText('nicht verbunden', 50, 320);
      g.font = `400 34px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.6)'; g.fillText('Antippen, um das Konto zu verbinden.', 56, 400);
    }
    if (sum) { g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(56, CH - 150, CW - 112, 1); g.font = `400 28px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.5)'; g.fillText('App-Portfolio netto', 56, CH - 90); g.textAlign = 'right'; g.font = `400 44px ${SANS}`; g.fillStyle = '#ecebe8'; g.fillText('CHF ' + chf(sum.netto || 0), CW - 56, CH - 86); g.textAlign = 'left'; }
  }
  function drawOrder(g) {
    frame(g, 2, 'Order');
    g.font = `400 112px ${SERIF}`; g.fillStyle = '#f4f3f0'; g.fillText('Kaufen.', 50, 260); g.fillText('Verkaufen.', 50, 380);
    g.font = `400 34px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.62)';
    ['Über Ihr Saxo-Konto, mit Kostenprüfung vorab.', 'Gesendet wird nur nach Ihrer ausdrücklichen', 'Bestätigung.'].forEach((t, k) => g.fillText(t, 56, 490 + k * 50));
    const on = !!(window.__saxoSnap); g.font = `500 24px ${MONO}`; g.fillStyle = on ? '#5ef0b1' : '#ff9a5a'; g.fillText(on ? '● SAXO BEREIT' : '○ SAXO NICHT VERBUNDEN', 56, CH - 70);
  }
  function drawMk(g) {
    frame(g, 3, 'Märkte', true);
    const now = new Date(); const t = now.toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich' });
    g.font = `200 120px ${SANS}`; g.fillStyle = '#f4f3f0'; g.fillText(t, 50, 250);
    g.font = `500 22px ${MONO}`; g.fillStyle = 'rgba(236,235,232,.45)'; g.fillText('SCHWEIZ · BERN', 58, 296);
    MK.forEach((m, k) => { const col = k % 2, row = (k / 2) | 0, x = 56 + col * 600, y = 400 + row * 120; const o = mkOpen(m), p = tzp(m.tz);
      g.fillStyle = o ? '#5ef0b1' : 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x + 8, y - 12, 8, 0, 7); g.fill();
      g.font = `500 40px ${SANS}`; g.fillStyle = '#ecebe8'; g.fillText(m.n, x + 34, y);
      g.font = `400 26px ${MONO}`; g.fillStyle = 'rgba(236,235,232,.5)'; g.fillText(`${m.c} ${(+p.hour % 24 + '').padStart(2, '0')}:${p.minute} · ${o ? 'offen' : 'zu'}`, x + 34, y + 40); });
  }
  function drawLage(g) {
    frame(g, 4, 'Weltlage', !!data.lage);
    const d = data.lage; if (!d) { g.font = `400 34px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.5)'; g.fillText('Lade Nachrichten …', 56, 200); return; }
    g.font = `200 120px ${SANS}`; g.fillStyle = '#f4f3f0'; g.fillText(String(d.total || 0), 50, 240);
    g.font = `400 30px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.5)'; g.fillText('Meldungen ausgewertet', 56, 290);
    (d.hotspots || []).slice(0, 4).forEach((h, k) => { const y = 380 + k * 100;
      g.fillStyle = h.watch ? '#9fd4ff' : '#ff7a3a'; g.font = `500 24px ${MONO}`; g.fillText(h.c, 56, y);
      g.font = `500 34px ${SANS}`; g.fillStyle = '#ecebe8'; g.fillText(`${h.n}`, 130, y);
      g.font = `400 26px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.55)'; let hl = h.headline || ''; while (g.measureText(hl).width > CW - 190 && hl.length > 10) hl = hl.slice(0, -2); if (hl !== (h.headline || '')) hl += '…'; g.fillText(hl, 130, y + 40); });
  }
  function drawWx(g) {
    frame(g, 5, 'Wetter Bern', !!data.wx);
    const d = data.wx; if (!d) { g.font = `400 34px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.5)'; g.fillText('Lade Wetter …', 56, 200); return; }
    const j = d.jetzt, t0 = (d.tage || [])[0];
    g.font = `200 220px ${SANS}`; g.fillStyle = '#f4f3f0'; g.fillText(Math.round(j.temp) + '°', 44, 340);
    g.font = `400 64px ${SERIF}`; g.fillText(j.wetter, 470, 250);
    g.font = `400 30px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.55)'; g.fillText(`${t0 ? `H ${Math.round(t0.max)}°  T ${Math.round(t0.min)}°  · ` : ''}Wind ${Math.round(j.wind)} km/h`, 474, 310);
    const hs = (d.stunden || []).map(s => s.temp); if (hs.length > 1) {
      const mn = Math.min(...hs) - .5, mx = Math.max(...hs) + .5, x0 = 56, x1 = CW - 56, y0 = CH - 80, y1 = 470;
      const P = i => [x0 + i / (hs.length - 1) * (x1 - x0), y0 - (hs[i] - mn) / (mx - mn) * (y0 - y1)];
      const lg = g.createLinearGradient(x0, 0, x1, 0); lg.addColorStop(0, '#9fd4ff'); lg.addColorStop(1, '#ff7a3a');
      g.beginPath(); hs.forEach((v, i) => { const [x, y] = P(i); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.strokeStyle = lg; g.lineWidth = 4; g.stroke();
      g.lineTo(x1, y0); g.lineTo(x0, y0); g.closePath(); const fg = g.createLinearGradient(0, y1, 0, y0); fg.addColorStop(0, 'rgba(255,122,58,.18)'); fg.addColorStop(1, 'rgba(255,122,58,0)'); g.fillStyle = fg; g.fill();
      g.font = `400 22px ${MONO}`; g.fillStyle = 'rgba(236,235,232,.45)'; [0, 4, 8, 11].forEach(i => { if (d.stunden[i]) { const [x] = P(i); g.fillText(String(d.stunden[i].zeit || '').slice(0, 5), x - 30, CH - 40); } });
    }
  }
  function drawImmo(g) {
    frame(g, 6, 'Immobilien');
    g.font = `400 104px ${SERIF}`; g.fillStyle = '#f4f3f0'; g.fillText('Eigenheim', 50, 250); g.fillText('& Rendite', 50, 360);
    const b = (J.BRIEF || []).find(x => /Festhypo/.test(x.n));
    if (b) { g.font = `400 30px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.5)'; g.fillText('Festhypothek 10 J. (Richtwert, Stand 18.11.2026)', 56, 470); g.font = `300 70px ${SANS}`; g.fillStyle = '#ecebe8'; g.fillText(b.v, 56, 556); g.font = `400 28px ${SANS}`; g.fillStyle = 'rgba(236,235,232,.5)'; g.fillText(b.i, 56, 606); }
    g.font = `500 24px ${MONO}`; g.fillStyle = '#ff9a5a'; g.fillText('TRAGBARKEIT · RENDITE · SIMULATION', 56, CH - 70);
  }
  const redraw = g => { const u = g.userData; try { u.p.draw(u.c.getContext('2d')); } catch (e) {} u.tex.needsUpdate = true; };

  async function loadData() {
    try { data.lage = window.__lageData && window.__lageData.hotspots ? window.__lageData : await (await fetch(API + 'news')).json(); } catch (e) {}
    try { const r = await fetch(API + 'weather?q=Bern'); if (r.ok) data.wx = await r.json(); } catch (e) {}
    try { window.__saxoRefresh && await window.__saxoRefresh(); } catch (e) {}
    panels.forEach(redraw);
  }

  /* ---------- Nachleuchten ---------- */
  let composer = null, bloom = null;
  if (THREE.EffectComposer && THREE.UnrealBloomPass) {
    composer = new THREE.EffectComposer(renderer); composer.addPass(new THREE.RenderPass(scene, cam));
    bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), .55, .7, .62); composer.addPass(bloom);
  }

  /* ---------- Steuerung ---------- */
  const slots = PANELS.map((p, i) => (i - 3) * SLOT);
  let yaw = 0, yawGoal = 0, focus = 3, intro = 0, active = false, raf = 0, last = 0, t0 = 0, hover = null;
  const cap = { idx: $('#ofIdx'), name: $('#ofName'), open: $('#ofOpen') };
  function setFocus(i) {
    focus = Math.max(0, Math.min(PANELS.length - 1, i)); yawGoal = slots[focus];
    const p = PANELS[focus];
    if (cap.name) { cap.name.textContent = p ? p.k : 'JARVIS'; cap.idx.textContent = p ? String(PANELS.filter(Boolean).indexOf(p) + 1).padStart(2, '0') + ' / 06' : 'KERN'; cap.open.textContent = p ? 'Öffnen' : 'Sprechen'; }
    document.body.classList.toggle('of-core', !p);
  }
  function openSlot(i) {
    const p = PANELS[i];
    if (!p) { window.JARVIS && window.JARVIS.start && window.JARVIS.start(); return; }
    if (p.fn) p.fn(); else J.go(p.go);
  }
  if (cap.open) cap.open.onclick = e => { e.stopPropagation(); openSlot(focus); };
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  const pick = (x, y) => { const r = cv.getBoundingClientRect(); mv.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(mv, cam);
    const hits = ray.intersectObjects(panels.flatMap(p => [p.userData.face]).concat([core])); if (!hits.length) return -1; const o = hits[0].object; return o === core ? 3 : o.userData.panel.userData.i; };
  let down = null;
  cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, yaw: yawGoal, t: performance.now() }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (down) { const dx = e.clientX - down.x; yawGoal = Math.max(slots[0] - .1, Math.min(slots[slots.length - 1] + .1, down.yaw - dx / innerWidth * (mobile() ? 1.6 : 1.1))); return; }
    const i = pick(e.clientX, e.clientY); hover = i >= 0 ? i : null; cv.style.cursor = i >= 0 ? 'pointer' : 'grab';
  });
  cv.addEventListener('pointerup', e => {
    if (!down) return; const dx = e.clientX - down.x, moved = Math.abs(dx) > 8, d0 = down; down = null;
    if (moved) { let best = 0; slots.forEach((s, i) => { if (Math.abs(s - yawGoal) < Math.abs(slots[best] - yawGoal)) best = i; }); const v = dx / Math.max(1, performance.now() - d0.t); if (Math.abs(v) > .5 && best === focus) best += v < 0 ? 1 : -1; setFocus(best); return; }
    const i = pick(e.clientX, e.clientY); if (i < 0) return;
    if (i === focus || !mobile()) { setFocus(i); setTimeout(() => openSlot(i), mobile() ? 0 : 420); } else setFocus(i);
  });
  addEventListener('keydown', e => { if (!active) return; if (e.key === 'ArrowLeft') setFocus(focus - 1); if (e.key === 'ArrowRight') setFocus(focus + 1); if (e.key === 'Enter') openSlot(focus); });

  function resize() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    renderer.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cam.aspect = w / h; cam.fov = mobile() ? 62 : 48; cam.updateProjectionMatrix();
    if (composer) { composer.setSize(w, h); }
  }
  addEventListener('resize', () => active && resize());

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const tmp = new THREE.Vector3(), look = new THREE.Vector3();
  function loop(now) {
    raf = requestAnimationFrame(loop); if (document.hidden) return;
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; const T = (now - t0) / 1000;
    intro = Math.min(1, (now - t0) / 3600); const e = ease(intro);
    yaw += (yawGoal - yaw) * (1 - Math.pow(.004, dt));
    const back = mobile() ? .5 : 1.15;
    // Kamera: von hoch oben herab in den Bogen
    const rig = tmp.set(C.x - Math.sin(yaw) * back, C.y + .08 + Math.sin(T * .4) * .015, C.z + Math.cos(yaw) * back);
    const start = new THREE.Vector3(C.x + 2, 9, C.z + 16);
    cam.position.lerpVectors(start, rig, e);
    look.set(C.x + Math.sin(yaw) * R, C.y - .02, C.z - Math.cos(yaw) * R);
    const lookStart = corePos; cam.lookAt(tmp.lerpVectors(lookStart, look, e));

    const st = window.JCore ? window.JCore.update(coreMat, T) : { lvl: 0 };
    core.rotation.y = T * .12; core.position.y = corePos.y + Math.sin(T * .9) * .05;
    halo.position.y = core.position.y; halo.material.opacity = .55 + st.lvl * .6;
    orbits.forEach((o, i) => { o.position.y = core.position.y; o.rotation.x = Math.PI / 2 + Math.sin(T * .3 + i) * .5; o.rotation.y = T * (.25 + i * .12) * (i % 2 ? -1 : 1); });
    beam.material.uniforms.uL.value = st.lvl;
    dialA.rotation.z = T * .05; dialB.rotation.z = -T * .09;
    cols.children.forEach((m, i) => { if (i % 3 === 0) m.material.opacity = .05 + .2 * (.5 + .5 * Math.sin(T * .6 + m.userData.ph)); });
    const pa = dg.attributes.position; for (let i = 0; i < N; i++) { let y = pa.array[i * 3 + 1] + dt * .05; if (y > 5) y = 0; pa.array[i * 3 + 1] = y; pa.array[i * 3] += Math.sin(T * .3 + i) * .0008; } pa.needsUpdate = true;

    panels.forEach((g, k) => { const u = g.userData;
      const delay = .32 + k * .09; const ue = Math.max(0, Math.min(1, (intro - delay) / .35)); u.unfold += (ease(ue) - u.unfold) * .25;
      const isF = u.i === focus, isH = u.i === hover; u.hov += ((isF ? 1 : isH ? .6 : 0) - u.hov) * .12;
      const s = Math.max(.001, u.unfold) * (1 + u.hov * .04);
      g.scale.set(s, Math.max(.001, u.unfold * u.unfold) * (1 + u.hov * .04), 1);
      g.position.copy(u.base); g.position.y += Math.sin(T * .7 + k) * .018;
      tmp.set(C.x - g.position.x, 0, C.z - g.position.z).normalize(); g.position.addScaledVector(tmp, u.hov * .18);
      u.edge.material.opacity = .35 + u.hov * .65 + (u.unfold < 1 ? Math.random() * .4 : 0);
      u.glass.material.opacity = .86 + u.hov * .08; });
    if (now - (loop.d || 0) > 1000) { loop.d = now; const m = panels.find(g => g.userData.p.k === 'Märkte'); m && redraw(m); }
    if (composer) composer.render(); else renderer.render(scene, cam);
  }
  function start() {
    if (active) return; active = true; host.classList.add('on'); resize(); intro = 0; yaw = yawGoal = 0; setFocus(3);
    panels.forEach(g => { g.userData.unfold = 0; g.scale.set(.001, .001, .001); redraw(g); });
    t0 = last = performance.now(); raf = requestAnimationFrame(loop); loadData();
  }
  function stop() { if (!active) return; active = false; cancelAnimationFrame(raf); host.classList.remove('on'); document.body.classList.remove('of-core'); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => active && panels.forEach(redraw));
  J.onView(v => { if (v === 'office') start(); else stop(); });
  window.OFFICE = { start, stop };
})();
