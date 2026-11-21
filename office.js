/* =====================================================================
   JARVIS OMEGA · INVESTMENT-BÜRO (3D)
   Ein begehbares Penthouse-Büro mit Live-Bildschirmen, Hologramm-Globus,
   Immobilien-Modell und JARVIS-Kern. Zeigt nur echte Daten:
   Saxo-Konto (falls verbunden), App-Portfolio, Börsenzeiten, Richtwerte mit Datum.
   ===================================================================== */
(function () {
  if (typeof THREE === 'undefined') return;
  const J = window.J;
  const host = document.getElementById('officeStage');
  if (!host || !J) return;

  const isMobile = matchMedia('(max-width:899px)').matches;
  const PR = Math.min(devicePixelRatio || 1, isMobile ? 1.6 : 2);
  const hour = new Date().getHours();
  const NIGHT = hour < 7 || hour >= 18;

  /* ---------- Renderer / Szene ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
  renderer.setPixelRatio(PR);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = NIGHT ? 1.05 : 1.15;
  renderer.physicallyCorrectLights = false;
  host.insertBefore(renderer.domElement, host.firstChild);
  const cv = renderer.domElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NIGHT ? 0x02040a : 0x0a1420);
  scene.fog = new THREE.Fog(NIGHT ? 0x02040a : 0x0b1622, 14, 70);
  const cam = new THREE.PerspectiveCamera(50, 1, 0.05, 200);

  /* ---------- Hilfen ---------- */
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    t.userData = { c, g }; return t;
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const font = (px, w = 600) => `${w} ${px}px "Geist","SF Pro Display",system-ui,sans-serif`;
  const mono = px => `500 ${px}px "Geist Mono","SF Mono",ui-monospace,monospace`;

  /* ---------- Umgebungs-Reflexionen ---------- */
  {
    const env = new THREE.Scene();
    const box = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 30), new THREE.MeshBasicMaterial({ color: 0x0b1220, side: THREE.BackSide }));
    env.add(box);
    const strip = (x, y, z, w, h, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 1, 0); env.add(m); };
    strip(0, 4.8, 0, 14, 1.2, 0xbfd8ff);
    strip(0, 2, -14, 26, 6, NIGHT ? 0x1d3a6a : 0x9ec8ff);
    strip(-14, 2, 0, 6, 3, 0xffb066);
    strip(14, 2, 2, 6, 3, 0x5ad1ff);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.04).texture;
    pm.dispose();
  }

  /* ---------- Materialien ---------- */
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#0d1016'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd(120, 200)|0},${rnd(130, 210)|0},${rnd(160, 230)|0},${rnd(0.01, 0.05)})`; g.fillRect(rnd(0, w), rnd(0, h), rnd(1, 3), rnd(1, 3)); }
    g.strokeStyle = 'rgba(160,190,230,.10)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += w / 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += h / 2) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(200,220,255,${rnd(0.02, 0.06)})`; g.lineWidth = rnd(1, 3); g.beginPath(); let x = rnd(0, w), y = rnd(0, h); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += rnd(-140, 140); y += rnd(-140, 140); g.lineTo(x, y); } g.stroke(); }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(3, 3);
  const woodTex = canvasTex(1024, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a1a10'); gr.addColorStop(1, '#1a0f08'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { g.strokeStyle = `rgba(${rnd(60, 110)|0},${rnd(35, 60)|0},${rnd(18, 30)|0},${rnd(0.15, 0.45)})`; g.lineWidth = rnd(0.5, 2.5); g.beginPath(); const y = rnd(0, h); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * rnd(1, 6)); g.stroke(); }
  });

  const M = {
    floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.34, metalness: 0.25, envMapIntensity: 0.7 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 0.85, metalness: 0.05 }),
    wallPanel: new THREE.MeshStandardMaterial({ color: 0x1b222e, roughness: 0.6, metalness: 0.2 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.38, metalness: 0.05, envMapIntensity: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8b95a5, roughness: 0.25, metalness: 0.95 }),
    black: new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 0.35, metalness: 0.6 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x15100d, roughness: 0.55, metalness: 0.05 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fc6ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.08, envMapIntensity: 1.4 }),
    lightStrip: new THREE.MeshBasicMaterial({ color: 0xdfeeff }),
    warmStrip: new THREE.MeshBasicMaterial({ color: 0xffb36b }),
    cyan: new THREE.MeshBasicMaterial({ color: 0x5ad1ff }),
  };
  const box = (w, h, d, m, x, y, z, parent = scene) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); parent.add(o); return o; };

  /* ---------- Raum ---------- */
  const RW = 12, RH = 3.6, RD = 10, ZW = -4.2; // Fensterwand bei z = ZW
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD + 4), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.z = 0.8; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD + 4), M.ceiling); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, RH, 0.8); scene.add(ceil);
  box(0.2, RH, RD + 4, M.wall, -RW / 2, RH / 2, 0.8);
  box(0.2, RH, RD + 4, M.wall, RW / 2, RH / 2, 0.8);
  box(RW, RH, 0.2, M.wall, 0, RH / 2, 5.6);
  // Wandpaneele links mit Lichtfugen
  for (let i = 0; i < 6; i++) { box(0.04, RH - 0.5, 1.3, M.wallPanel, -RW / 2 + 0.12, RH / 2, ZW + 1 + i * 1.45); box(0.02, RH - 0.6, 0.02, M.warmStrip, -RW / 2 + 0.15, RH / 2, ZW + 1.72 + i * 1.45); }
  // Deckenlichtbänder
  [-2.6, 0, 2.6].forEach(x => box(0.08, 0.02, 7.5, M.lightStrip, x, RH - 0.01, 0.4));
  box(RW - 0.4, 0.02, 0.06, M.cyan, 0, 0.02, ZW + 0.12); // Bodenlichtlinie an der Fensterfront

  /* ---------- Skyline hinter der Glasfront ---------- */
  const skyTex = canvasTex(4096, 1024, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.72);
    if (NIGHT) { sky.addColorStop(0, '#01030a'); sky.addColorStop(0.55, '#06122a'); sky.addColorStop(1, '#2a1d3a'); }
    else { sky.addColorStop(0, '#0d2a52'); sky.addColorStop(0.6, '#3d7cc0'); sky.addColorStop(1, '#f2b880'); }
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    if (NIGHT) for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${rnd(0.1, 0.8)})`; g.fillRect(rnd(0, w), rnd(0, h * 0.5), rnd(1, 2.2), rnd(1, 2.2)); }
    // Berge (Alpenpanorama)
    g.fillStyle = NIGHT ? '#0a1222' : '#6e8db3';
    g.beginPath(); g.moveTo(0, h * 0.62); for (let x = 0; x <= w; x += 40) g.lineTo(x, h * 0.62 - Math.abs(Math.sin(x * 0.0021) * 90 + Math.sin(x * 0.0067) * 40 + Math.sin(x * 0.019) * 12)); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    if (!NIGHT) { g.fillStyle = 'rgba(255,255,255,.55)'; for (let x = 0; x < w; x += 40) { const y = h * 0.62 - Math.abs(Math.sin(x * 0.0021) * 90 + Math.sin(x * 0.0067) * 40 + Math.sin(x * 0.019) * 12); if (h * 0.62 - y > 80) g.fillRect(x, y, 40, 10); } }
    // Gebäude in Schichten
    const layers = NIGHT ? ['#060a14', '#04070e', '#020409'] : ['#3b4f68', '#2a3a50', '#1b2638'];
    layers.forEach((col, L) => {
      let x = 0; while (x < w) {
        const bw = rnd(40, 140) * (1 + L * 0.3), bh = rnd(60, 260) * (1 + L * 0.5) * (Math.random() < 0.08 ? 2 : 1);
        const top = h * (0.74 + L * 0.05) - bh; g.fillStyle = col; g.fillRect(x, top, bw, h - top);
        const lit = NIGHT ? 0.38 : 0.05;
        for (let wy = top + 8; wy < h - 6; wy += 11) for (let wx = x + 6; wx < x + bw - 6; wx += 9) if (Math.random() < lit) { const t = Math.random(); g.fillStyle = t < 0.65 ? `rgba(255,${rnd(190, 225)|0},${rnd(120, 160)|0},${rnd(0.5, 1)})` : t < 0.9 ? `rgba(170,215,255,${rnd(0.4, 0.9)})` : 'rgba(255,255,255,.95)'; g.fillRect(wx, wy, 4, 5); }
        if (NIGHT && Math.random() < 0.15) { g.fillStyle = Math.random() < 0.5 ? '#ff3344' : '#ffffff'; g.fillRect(x + bw / 2 - 2, top - 4, 4, 4); }
        x += bw + rnd(2, 18);
      }
    });
    // See mit Spiegelungen
    const lake = g.createLinearGradient(0, h * 0.86, 0, h); lake.addColorStop(0, NIGHT ? '#050b18' : '#3d6488'); lake.addColorStop(1, NIGHT ? '#01030a' : '#1c3550');
    g.fillStyle = lake; g.fillRect(0, h * 0.88, w, h * 0.12);
    for (let i = 0; i < 700; i++) { g.fillStyle = NIGHT ? `rgba(255,200,140,${rnd(0.05, 0.3)})` : `rgba(255,255,255,${rnd(0.05, 0.2)})`; g.fillRect(rnd(0, w), rnd(h * 0.885, h), rnd(6, 30), 1.5); }
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(150, 37.5), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }));
  sky.position.set(0, 9, -48); scene.add(sky);
  // Glasfront mit Sprossen
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), M.glass); glass.position.set(0, RH / 2, ZW); scene.add(glass);
  for (let i = -3; i <= 3; i++) box(0.05, RH, 0.08, M.black, i * (RW / 6), RH / 2, ZW);
  box(RW, 0.08, 0.1, M.black, 0, RH - 0.04, ZW); box(RW, 0.08, 0.1, M.black, 0, 0.04, ZW);

  /* ---------- Schreibtisch + Stuhl ---------- */
  const desk = new THREE.Group(); scene.add(desk); desk.position.set(0, 0, -0.6);
  box(3.0, 0.06, 1.15, M.wood, 0, 0.76, 0, desk);
  box(3.04, 0.012, 1.19, M.metal, 0, 0.729, 0, desk);
  box(0.06, 0.73, 1.0, M.metal, -1.38, 0.365, 0, desk); box(0.06, 0.73, 1.0, M.metal, 1.38, 0.365, 0, desk);
  box(2.7, 0.35, 0.04, M.black, 0, 0.55, -0.48, desk);
  box(2.9, 0.008, 0.01, M.cyan, 0, 0.73, 0.575, desk); // Lichtkante
  // Tastatur, Tablet, Tasse
  box(0.5, 0.015, 0.16, M.black, 0, 0.775, 0.28, desk);
  box(0.26, 0.012, 0.18, M.black, 0.62, 0.774, 0.25, desk).rotation.y = -0.3;
  { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3 })); cup.position.set(-0.9, 0.84, 0.25); desk.add(cup); }
  // Schreibtischlampe
  { const L = new THREE.Group(); L.position.set(-1.2, 0.79, -0.3); desk.add(L); box(0.16, 0.02, 0.16, M.metal, 0, 0, 0, L); const arm = box(0.02, 0.55, 0.02, M.metal, 0, 0.28, 0, L); arm.rotation.z = 0.25; const head = box(0.24, 0.03, 0.06, M.metal, 0.1, 0.55, 0, L); box(0.22, 0.004, 0.05, M.warmStrip, 0.1, 0.533, 0, L);
    const pl = new THREE.PointLight(0xffb36b, 0.9, 3.2, 2); pl.position.set(-1.1, 1.25, -0.9); scene.add(pl); }
  // Stuhl
  const chair = new THREE.Group(); chair.position.set(-0.95, 0, 0.35); chair.rotation.y = 0.9; scene.add(chair);
  { box(0.6, 0.1, 0.55, M.leather, 0, 0.5, 0, chair); const back = box(0.58, 0.75, 0.08, M.leather, 0, 0.95, 0.26, chair); back.rotation.x = -0.12; box(0.05, 0.4, 0.05, M.metal, 0, 0.27, 0, chair);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = box(0.34, 0.03, 0.04, M.metal, Math.cos(a) * 0.17, 0.07, Math.sin(a) * 0.17, chair); leg.rotation.y = -a; } }

  /* ---------- Bildschirme ---------- */
  const SW = 1024, SH = 576;
  const screens = [];
  function mkScreen(key, w, h, x, y, z, ry) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; desk.add(g);
    box(w + 0.03, h + 0.03, 0.025, M.black, 0, 0, -0.014, g);
    const tex = canvasTex(SW, SH, () => {}); tex.minFilter = THREE.LinearFilter;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    scr.position.z = 0.0; g.add(scr);
    box(0.03, 0.22, 0.03, M.metal, 0, -h / 2 - 0.11, -0.03, g);
    box(0.2, 0.01, 0.14, M.metal, 0, -h / 2 - 0.22, -0.03, g);
    const glow = new THREE.PointLight(0x5ad1ff, 0.35, 1.8, 2); glow.position.set(0, 0, 0.35); g.add(glow);
    const s = { key, tex, mesh: scr, group: g }; screens.push(s); scr.userData.hot = key; return s;
  }
  const scrL = mkScreen('port', 0.82, 0.46, -0.98, 1.24, -0.3, 0.42);
  const scrC = mkScreen('cmd', 1.04, 0.58, 0, 1.3, -0.42, 0);
  const scrR = mkScreen('invest', 0.82, 0.46, 0.98, 1.24, -0.3, -0.42);

  /* ---------- Bildschirminhalte (nur echte Daten) ---------- */
  const MARKETS = [
    { n: 'SIX Zürich', tz: 'Europe/Zurich', o: [9, 0], c: [17, 30], lat: 47.37, lon: 8.54 },
    { n: 'Xetra Frankfurt', tz: 'Europe/Berlin', o: [9, 0], c: [17, 30], lat: 50.11, lon: 8.68 },
    { n: 'London LSE', tz: 'Europe/London', o: [8, 0], c: [16, 30], lat: 51.51, lon: -0.13 },
    { n: 'New York NYSE', tz: 'America/New_York', o: [9, 30], c: [16, 0], lat: 40.71, lon: -74.01 },
    { n: 'Tokio TSE', tz: 'Asia/Tokyo', o: [9, 0], c: [15, 30], lat: 35.68, lon: 139.69 },
    { n: 'Hongkong HKEX', tz: 'Asia/Hong_Kong', o: [9, 30], c: [16, 0], lat: 22.28, lon: 114.16 },
  ];
  function localParts(tz) {
    const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const o = {}; f.forEach(p => o[p.type] = p.value); return { wd: o.weekday, h: +o.hour % 24, m: +o.minute };
  }
  function isOpen(mk) { const p = localParts(mk.tz); if (p.wd === 'Sat' || p.wd === 'Sun') return false; const t = p.h * 60 + p.m; return t >= mk.o[0] * 60 + mk.o[1] && t < mk.c[0] * 60 + mk.c[1]; }
  const fmt = (n, d = 0) => Number(n || 0).toLocaleString('de-CH', { maximumFractionDigits: d });

  function frame(g, title, sub) {
    const w = SW, h = SH;
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#04101f'); bg.addColorStop(1, '#020611'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(90,209,255,.08)'; g.lineWidth = 1; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#5ad1ff'; g.font = font(30, 700); g.fillText(title, 36, 56);
    if (sub) { g.fillStyle = 'rgba(180,210,240,.6)'; g.font = mono(18); g.textAlign = 'right'; g.fillText(sub, w - 36, 54); g.textAlign = 'left'; }
    g.fillStyle = 'rgba(90,209,255,.5)'; g.fillRect(36, 72, 120, 3);
  }
  function drawPort(g) {
    const sx = window.__saxoSnap; frame(g, 'PORTFOLIO', sx ? 'SAXO ' + (sx.umgebung || '') : 'SAXO NICHT VERBUNDEN');
    let y = 130;
    if (sx) {
      g.fillStyle = 'rgba(180,210,240,.7)'; g.font = mono(20); g.fillText('GESAMTWERT', 36, y);
      g.fillStyle = '#ffffff'; g.font = font(64, 700); g.fillText(fmt(sx.gesamtwert) + ' ' + (sx.waehrung || ''), 36, y + 66);
      g.fillStyle = 'rgba(180,210,240,.7)'; g.font = mono(20); g.fillText('CASH  ' + fmt(sx.cash) + ' ' + (sx.waehrung || ''), 36, y + 110);
      y += 160;
      const P = (sx.positionen || []).slice(0, 4);
      if (!P.length) { g.fillStyle = 'rgba(200,220,240,.6)'; g.font = font(24, 500); g.fillText('Keine offenen Positionen', 36, y); y += 40; }
      P.forEach(p => { g.fillStyle = '#dfefff'; g.font = font(24, 600); g.fillText(String(p.titel || p.symbol).slice(0, 28), 36, y); g.textAlign = 'right'; g.fillText(fmt(p.marktwert), SW - 36, y); g.textAlign = 'left'; y += 40; });
      if (sx.umgebung === 'SIM') { g.fillStyle = '#ffb36b'; g.font = mono(18); g.fillText('DEMO · SPIELGELD', 36, SH - 30); }
    } else {
      g.fillStyle = 'rgba(200,220,240,.75)'; g.font = font(28, 500); g.fillText('Verbinden unter Finance →', 36, y + 10);
    }
    const a = J.analyze ? J.analyze() : null;
    if (a && a.A > 0) { g.fillStyle = 'rgba(180,210,240,.7)'; g.font = mono(18); g.textAlign = 'right'; g.fillText('APP-PORTFOLIO  ' + (J.chf ? J.chf(a.net) : fmt(a.net)), SW - 36, SH - 30); g.textAlign = 'left'; }
  }
  let scan = 0;
  function drawCmd(g) {
    const now = new Date();
    frame(g, 'COMMAND CENTER', 'MASTER · ' + now.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }));
    const hm = now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    g.fillStyle = '#ffffff'; g.font = font(110, 300); g.fillText(hm, 36, 200); const hw = g.measureText(hm).width;
    g.fillStyle = 'rgba(90,209,255,.9)'; g.font = font(44, 300); g.fillText(':' + String(now.getSeconds()).padStart(2, '0'), 36 + hw + 6, 200);
    g.fillStyle = 'rgba(180,210,240,.7)'; g.font = mono(18); g.fillText('BÖRSENZEITEN · ORTSZEIT · OHNE FEIERTAGE', 36, 260);
    MARKETS.forEach((mk, i) => {
      const col = i % 2, row = (i / 2) | 0, x = 36 + col * 480, y = 300 + row * 76;
      const open = isOpen(mk), p = localParts(mk.tz);
      g.fillStyle = open ? 'rgba(80,230,150,.12)' : 'rgba(255,255,255,.04)'; g.fillRect(x, y, 450, 62);
      g.fillStyle = open ? '#50e696' : '#ff6b7a'; g.beginPath(); g.arc(x + 22, y + 31, 7, 0, 7); g.fill();
      g.fillStyle = '#e6f2ff'; g.font = font(24, 600); g.fillText(mk.n, x + 42, y + 30);
      g.fillStyle = 'rgba(180,210,240,.7)'; g.font = mono(17); g.fillText((open ? 'OFFEN' : 'GESCHLOSSEN') + ' · ' + String(p.h).padStart(2, '0') + ':' + String(p.m).padStart(2, '0'), x + 42, y + 52);
    });
    scan = (scan + 6) % SH; g.fillStyle = 'rgba(90,209,255,.06)'; g.fillRect(0, scan, SW, 26);
  }
  function drawInvest(g) {
    frame(g, 'MARKT-BRIEFING', 'RICHTWERTE · STAND 16.–18.11.2026');
    const B = J.BRIEF || [];
    B.slice(0, 8).forEach((b, i) => {
      const col = i % 2, row = (i / 2) | 0, x = 36 + col * 480, y = 110 + row * 100;
      g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x, y, 450, 86);
      g.fillStyle = 'rgba(180,210,240,.75)'; g.font = mono(18); g.fillText(b.n.toUpperCase(), x + 18, y + 28);
      g.fillStyle = '#ffffff'; g.font = font(34, 700); g.fillText(b.v, x + 18, y + 66);
      g.fillStyle = 'rgba(180,210,240,.55)'; g.font = font(16, 500); g.textAlign = 'right'; g.fillText(String(b.i).slice(0, 30), x + 436, y + 66); g.textAlign = 'left';
    });
    g.fillStyle = '#ffb36b'; g.font = mono(16); g.fillText('KEINE LIVE-KURSE · TIPPEN FÜR MARKT-ANALYSE', 36, SH - 24);
  }
  const DRAW = { port: drawPort, cmd: drawCmd, invest: drawInvest };
  function redraw(s) { const { g } = s.tex.userData; DRAW[s.key](g); s.tex.needsUpdate = true; }

  /* ---------- Hologramm-Globus mit Börsenplätzen ---------- */
  const globe = new THREE.Group(); globe.position.set(1.6, 1.55, -1.25); scene.add(globe);
  const GR = 0.42;
  {
    const N = isMobile ? 1800 : 3000, P = [], C = [];
    for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996; P.push(Math.cos(th) * r * GR, y * GR, Math.sin(th) * r * GR); const k = 0.35 + Math.random() * 0.4; C.push(0.2 * k, 0.65 * k, 1 * k); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    globe.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.012, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
    for (let i = -2; i <= 2; i++) { const r = GR * Math.cos(i * 0.5), ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0016, 6, 90), new THREE.MeshBasicMaterial({ color: 0x5ad1ff, transparent: true, opacity: 0.35 })); ring.rotation.x = Math.PI / 2; ring.position.y = GR * Math.sin(i * 0.5); globe.add(ring); }
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(GR, 0.0014, 6, 90), new THREE.MeshBasicMaterial({ color: 0x5ad1ff, transparent: true, opacity: 0.22 })); m.rotation.y = (i / 6) * Math.PI; globe.add(m); }
  }
  const pins = MARKETS.map(mk => {
    const la = THREE.MathUtils.degToRad(mk.lat), lo = THREE.MathUtils.degToRad(-mk.lon);
    const v = new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), Math.cos(la) * Math.sin(lo)).multiplyScalar(GR * 1.01);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), new THREE.MeshBasicMaterial({ color: 0x50e696 })); m.position.copy(v); globe.add(m);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 6), new THREE.MeshBasicMaterial({ color: 0x50e696, transparent: true, opacity: 0.8 })); beam.position.copy(v.clone().multiplyScalar(1.12)); beam.lookAt(0, 0, 0); beam.rotateX(Math.PI / 2); globe.add(beam);
    return { mk, m, beam };
  });
  const globeBase = new THREE.Group(); globeBase.position.set(1.6, 0, -1.25); scene.add(globeBase);
  { const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.9, 40), M.black); ped.position.y = 0.45; globeBase.add(ped); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 40), M.cyan); top.position.y = 0.91; globeBase.add(top);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.6, 40, 1, true), new THREE.MeshBasicMaterial({ color: 0x5ad1ff, transparent: true, opacity: 0.06, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); cone.position.y = 1.22; globeBase.add(cone); }
  globe.userData.hot = 'welt';

  /* ---------- Immobilien-Modell (Hologramm-Stadtblock) ---------- */
  const estate = new THREE.Group(); estate.position.set(-2.0, 0.95, -1.6); scene.add(estate);
  { const table = box(1.1, 0.05, 0.7, M.wood, -2.0, 0.9, -1.6); box(1.0, 0.88, 0.6, M.black, -2.0, 0.44, -1.6);
    const em = new THREE.MeshBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
    const lm = new THREE.LineBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.85 });
    const plot = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.08 })); plot.rotation.x = -Math.PI / 2; plot.position.y = 0.01; estate.add(plot);
    for (let i = 0; i < 14; i++) { const w = rnd(0.07, 0.15), d = rnd(0.07, 0.15), h = rnd(0.08, 0.42); const x = rnd(-0.32, 0.32), z = rnd(-0.18, 0.18);
      const geo = new THREE.BoxGeometry(w, h, d); const b = new THREE.Mesh(geo, em); b.position.set(x, h / 2 + 0.01, z); estate.add(b);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm); e.position.copy(b.position); estate.add(e); b.userData.grow = h; }
  }
  estate.userData.hot = 'calc';

  /* ---------- JARVIS-Kern ---------- */
  const core = new THREE.Group(); core.position.set(0, 2.25, -1.3); scene.add(core);
  const coreBall = new THREE.Mesh(new THREE.SphereGeometry(0.09, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffb36b, toneMapped: false })); core.add(coreBall);
  const coreShell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), new THREE.MeshBasicMaterial({ color: 0x5ad1ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })); core.add(coreShell);
  const coreRings = [0.22, 0.28, 0.34].map((r, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 8, 100), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffb36b : 0x5ad1ff, transparent: true, opacity: 0.7, toneMapped: false })); core.add(m); return m; });
  const coreLight = new THREE.PointLight(0x5ad1ff, 0.6, 4, 2); core.add(coreLight);
  core.userData.hot = 'cockpit';

  /* ---------- Laufschrift (Richtwerte) über der Fensterfront ---------- */
  const tick = canvasTex(4096, 64, (g, w, h) => {
    g.fillStyle = '#020611'; g.fillRect(0, 0, w, h); g.font = mono(30); g.textBaseline = 'middle';
    const B = J.BRIEF || []; let x = 20; let k = 0;
    while (x < w) { const b = B[k++ % Math.max(1, B.length)]; if (!b) break; g.fillStyle = '#5ad1ff'; g.fillText(b.n, x, h / 2); x += g.measureText(b.n).width + 14; g.fillStyle = '#ffffff'; g.fillText(b.v, x, h / 2); x += g.measureText(b.v).width + 14; g.fillStyle = '#ffb36b'; g.fillText('·', x, h / 2); x += 40; }
  });
  tick.wrapS = THREE.RepeatWrapping; tick.repeat.set(1, 1);
  const ticker = new THREE.Mesh(new THREE.PlaneGeometry(RW - 0.4, 0.18), new THREE.MeshBasicMaterial({ map: tick, toneMapped: false }));
  ticker.position.set(0, RH - 0.3, ZW + 0.06); scene.add(ticker); ticker.userData.hot = 'invest';

  /* ---------- Licht ---------- */
  scene.add(new THREE.HemisphereLight(NIGHT ? 0x34507a : 0x9ec8ff, 0x0a0806, NIGHT ? 0.35 : 0.6));
  const win = new THREE.DirectionalLight(NIGHT ? 0x6f8fd0 : 0xfff1dc, NIGHT ? 0.35 : 1.1); win.position.set(-2, 5, -8); scene.add(win);
  [-2.6, 0, 2.6].forEach(x => { const p = new THREE.PointLight(0xcfe3ff, 0.35, 6, 2); p.position.set(x, RH - 0.2, 0.2); scene.add(p); });
  const spot = new THREE.SpotLight(0xfff0dd, 0.55, 8, 0.6, 0.8, 1.5); spot.position.set(0, RH - 0.1, 0.2); spot.target.position.set(0, 0.7, -0.6); scene.add(spot, spot.target);

  /* ---------- Staub im Licht ---------- */
  const dust = (() => { const n = isMobile ? 250 : 500, P = []; for (let i = 0; i < n; i++) P.push(rnd(-5, 5), rnd(0.2, RH - 0.2), rnd(-4, 4));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe3ff, size: 0.012, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(p); return p; })();

  /* ---------- Bloom ---------- */
  let composer = null, bloom = null;
  try { if (THREE.EffectComposer && THREE.UnrealBloomPass) { composer = new THREE.EffectComposer(renderer); composer.addPass(new THREE.RenderPass(scene, cam)); bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.5, 0.82); composer.addPass(bloom); } } catch (e) { composer = null; }

  /* ---------- Kamera-Steuerung ---------- */
  const target = new THREE.Vector3(0.15, isMobile ? 1.5 : 1.22, -0.9);
  let yaw = 0, pitch = 0.04, dist = 3.6, vy = 0, vp = 0, enter = 0, active = false, lastUser = 0;
  const ptr = new Map(); let pinch0 = 0, dist0 = dist, downAt = null;
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; lastUser = performance.now(); if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = dist; } });
  cv.addEventListener('pointermove', e => { const p = ptr.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; lastUser = performance.now();
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; dist = Math.min(6, Math.max(1.6, dist0 * pinch0 / Math.hypot(a.x - b.x, a.y - b.y))); } else { vy = -dx * 0.004; vp = dy * 0.002; } });
  const up = e => { ptr.delete(e.pointerId); if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 8 && performance.now() - downAt.t < 400) pick(e); downAt = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => ptr.delete(e.pointerId));
  cv.addEventListener('wheel', e => { dist = Math.min(6, Math.max(1.6, dist * (1 + e.deltaY * 0.001))); e.preventDefault(); }, { passive: false });

  const ray = new THREE.Raycaster(), nd = new THREE.Vector2();
  const hotObjs = [scrL.mesh, scrC.mesh, scrR.mesh, ticker];
  function pick(e) {
    const r = cv.getBoundingClientRect(); nd.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(nd, cam);
    const hit = ray.intersectObjects([...hotObjs, globe, estate, core], true)[0]; if (!hit) return;
    let o = hit.object; while (o && !o.userData.hot) o = o.parent; if (!o) return;
    const k = o.userData.hot; if (k === 'cmd') return; flash(o); setTimeout(() => J.go(k), 260);
  }
  function flash(o) { o.traverse?.(c => { if (c.material && c.material.color) { const col = c.material.color.clone(); c.material.color.set(0xffffff); setTimeout(() => c.material.color.copy(col), 180); } }); }

  /* ---------- HTML-Markierungen ---------- */
  const tags = [...document.querySelectorAll('#officeStage .otag')];
  const tagAnchor = { port: () => scrL.group, invest: () => scrR.group, welt: () => globe, calc: () => estate, order: () => scrC.group };
  const tv = new THREE.Vector3();
  function placeTags() {
    const w = cv.clientWidth, h = cv.clientHeight;
    tags.forEach(t => { const a = tagAnchor[t.dataset.a]?.(); if (!a) return; a.getWorldPosition(tv); tv.y += t.dataset.a === 'welt' ? 0.62 : t.dataset.a === 'calc' ? 0.55 : 0.36; tv.project(cam);
      const vis = tv.z < 1 && Math.abs(tv.x) < 1.05 && Math.abs(tv.y) < 1.05; t.style.opacity = vis && enter > 0.85 ? 1 : 0; t.style.transform = `translate(-50%,-100%) translate(${(tv.x * 0.5 + 0.5) * w}px,${(-tv.y * 0.5 + 0.5) * h}px)`; });
  }

  /* ---------- Grösse ---------- */
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 62 : 48; cam.updateProjectionMatrix(); if (composer) { composer.setSize(w, h); const q = isMobile ? 0.5 : 0.75; bloom.resolution.set(w * q, h * q); } }
  addEventListener('resize', () => setTimeout(resize, 60));

  /* ---------- Loop ---------- */
  let raf = 0, t0 = performance.now(), lastDraw = 0, lvl = 0, lastT = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop); if (document.hidden) return;
    const T = (now - t0) / 1000;
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now; enter = Math.min(1, enter + dt * 0.75); const e = 1 - Math.pow(1 - enter, 3);
    yaw += vy; pitch = Math.max(-0.18, Math.min(0.32, pitch + vp)); vy *= 0.9; vp *= 0.85;
    yaw = Math.max(-0.75, Math.min(0.75, yaw));
    if (now - lastUser > 5000) yaw += (Math.sin(T * 0.12) * 0.22 - yaw) * 0.004;
    const d = dist + (1 - e) * 5.5;
    cam.position.set(target.x + Math.sin(yaw) * d, target.y + (isMobile ? -0.05 : 0.2) + Math.sin(pitch) * d + (1 - e) * 0.6, target.z + Math.cos(yaw) * d);
    cam.lookAt(target.x, target.y + Math.sin(T * 0.3) * 0.01, target.z);

    globe.rotation.y = T * 0.18; globe.position.y = 1.55 + Math.sin(T * 0.8) * 0.02;
    pins.forEach(p => { const o = isOpen(p.mk); const c = o ? 0x50e696 : 0xff6b7a; p.m.material.color.setHex(c); p.beam.material.color.setHex(c); p.beam.material.opacity = 0.4 + 0.4 * Math.abs(Math.sin(T * 2 + p.mk.lon)); });
    estate.rotation.y = T * 0.15; estate.children.forEach((c, i) => { if (c.isLineSegments) c.material.opacity = 0.55 + 0.35 * Math.sin(T * 1.5 + i); });

    const H = J.holo || {}; const goal = H.speaking ? 0.9 + 0.3 * Math.sin(T * 12) : H.listening ? 0.45 + 0.15 * Math.sin(T * 6) : 0.15;
    lvl += (goal - lvl) * 0.12;
    core.position.y = 2.25 + Math.sin(T * 1.1) * 0.04;
    coreBall.scale.setScalar(1 + lvl * 0.35); coreShell.scale.setScalar(1 + lvl * 0.8 + Math.sin(T * 2) * 0.04); coreShell.material.opacity = 0.08 + lvl * 0.2;
    coreRings.forEach((r, i) => { r.rotation.x = T * (0.4 + i * 0.25); r.rotation.y = T * (0.3 - i * 0.2); });
    coreLight.intensity = 0.4 + lvl * 1.2;

    tick.offset.x = (T * 0.018) % 1;
    const dp = dust.geometry.attributes.position; for (let i = 0; i < dp.count; i++) { let y = dp.getY(i) + 0.0012; if (y > RH - 0.1) y = 0.2; dp.setY(i, y); dp.setX(i, dp.getX(i) + Math.sin(T + i) * 0.0006); } dp.needsUpdate = true;

    if (now - lastDraw > 500) { lastDraw = now; screens.forEach(redraw); }
    else redraw(scrC);

    placeTags();
    if (composer) composer.render(); else renderer.render(scene, cam);
  }

  function start() { if (active) return; active = true; try { window.__saxoRefresh && window.__saxoRefresh().then(() => screens.forEach(redraw)); } catch (e) {} enter = 0; yaw = 0.18; pitch = isMobile ? 0.16 : 0.06; dist = isMobile ? 4.5 : 3.4; lastT = performance.now(); window.__holoPause = true; resize(); screens.forEach(redraw); t0 = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { if (!active) return; active = false; cancelAnimationFrame(raf); window.__holoPause = false; }
  J.onView(v => { if (v === 'office') start(); else stop(); });
  document.querySelectorAll('#officeStage [data-go]').forEach(b => b.addEventListener('click', e => e.stopPropagation()));
  window.OFFICE = { start, stop };
})();
