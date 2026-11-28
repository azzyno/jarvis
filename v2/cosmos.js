/* JARVIS · KOSMOS
   Filmreifes Sonnensystem als Startbild: glühende Sonne, Staubscheibe, Planeten mit langen Schatten.
   Planet antippen → Live-Daten. Erde antippen → Flug hinein in die Live-Erde. Alles prozedural, keine Bilddateien. */
(() => {
  const T = window.THREE; if (!T) return;
  const $ = s => document.querySelector(s);
  const mobile = matchMedia('(max-width:700px)').matches || /iPhone|iPad|Android/.test(navigator.userAgent);
  const cv = $('#cosmos');
  let R;
  try { R = new T.WebGLRenderer({ canvas: cv, antialias: !mobile, powerPreference: 'high-performance' }); } catch (e) { document.body.classList.remove('cosmos'); return; }
  R.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.6 : 2));
  R.setClearColor(0x000000, 1);
  R.toneMapping = T.ACESFilmicToneMapping; R.toneMappingExposure = .95;
  const S = new T.Scene();
  const cam = new T.PerspectiveCamera(42, 1, 0.1, 4000);
  let fly = null, active = true;

  /* ---------- gemeinsames Rauschen (GLSL) ---------- */
  const NOISE = `
    vec3 h3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return -1.+2.*fract(sin(p)*43758.5453);}
    float n3(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.-2.*f);
      return mix(mix(mix(dot(h3(i),f),dot(h3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(h3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(h3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
                 mix(mix(dot(h3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(h3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(h3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(h3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}
    float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n3(p);p*=2.03;a*=.5;}return s;}`;

  /* ---------- Sterne ---------- */
  {
    const n = mobile ? 2500 : 5000, g = new T.BufferGeometry(), p = new Float32Array(n * 3), c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = 1500;
      p.set([r * Math.sqrt(1 - u * u) * Math.cos(a), r * u, r * Math.sqrt(1 - u * u) * Math.sin(a)], i * 3);
      const k = .4 + Math.random() * .6, w = Math.random(); c.set([k, k * (.9 + w * .1), k * (.8 + w * .2)], i * 3);
    }
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('color', new T.BufferAttribute(c, 3));
    S.add(new T.Points(g, new T.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: .55, depthWrite: false })));
  }

  /* ---------- Sonne ---------- */
  const SUN_R = 9;
  const sunMat = new T.ShaderMaterial({
    uniforms: { t: { value: 0 } },
    vertexShader: `varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: NOISE + `uniform float t;varying vec3 vP;varying vec3 vN;varying vec3 vV;
      void main(){vec3 p=normalize(vP)*2.6;float n=fbm(p+vec3(t*.05,t*.03,-t*.04));float g=fbm(p*3.+n*2.+t*.08);
        float k=clamp(.55+n*.9+g*.5,0.,1.);
        vec3 col=mix(vec3(1.,.38,.05),vec3(1.,.82,.45),k);col=mix(col,vec3(1.,.97,.88),smoothstep(.65,1.,k));
        float limb=pow(max(dot(vN,vV),0.),.45);col*=.55+.75*limb;
        gl_FragColor=vec4(col*2.4,1.);}`,
  });
  const sun = new T.Mesh(new T.SphereGeometry(SUN_R, 64, 64), sunMat); S.add(sun);
  // Glanz um die Sonne
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(.12, 'rgba(255,200,120,.85)'); gr.addColorStop(.35, 'rgba(255,140,50,.28)'); gr.addColorStop(.7, 'rgba(200,90,30,.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return new T.CanvasTexture(c); })();
  const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(62, 62, 1); S.add(glow);
  const glow2 = new T.Sprite(new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: .16 }));
  glow2.scale.set(220, 90, 1); S.add(glow2);

  /* ---------- Planeten (stilisierte Abstände, echte Reihenfolge) ---------- */
  // a: echte grosse Halbachse (AE) für Live-Daten; d: Abstand in der Szene
  const P = [
    { n: 'Merkur', d: 20, r: .9, t: 0, c1: [.55, .52, .5], c2: [.35, .33, .32], a: .387, e: .2056, L: 252.25, w: 77.46, per: 87.97, info: 'Kleinster Planet, ohne Mond.' },
    { n: 'Venus', d: 28, r: 1.6, t: 1, c1: [.93, .82, .6], c2: [.8, .62, .38], a: .723, e: .0068, L: 181.98, w: 131.6, per: 224.7, info: 'Heissester Planet – 465 °C.' },
    { n: 'Erde', d: 37, r: 1.75, t: 2, a: 1, e: .0167, L: 100.46, w: 102.94, per: 365.256, info: 'Ihre Heimat, Boss.' },
    { n: 'Mars', d: 46, r: 1.15, t: 0, c1: [.78, .38, .2], c2: [.5, .2, .1], a: 1.524, e: .0934, L: 355.45, w: 336.04, per: 686.98, info: 'Der rote Planet.' },
    { n: 'Jupiter', d: 64, r: 5.2, t: 3, c1: [.86, .74, .58], c2: [.62, .45, .32], a: 5.203, e: .0484, L: 34.4, w: 14.75, per: 4332.6, info: 'Grösster Planet, 95 bekannte Monde.' },
    { n: 'Saturn', d: 84, r: 4.4, t: 3, ring: 1, c1: [.9, .82, .62], c2: [.72, .62, .42], a: 9.537, e: .0539, L: 49.94, w: 92.43, per: 10759, info: 'Ringe aus Eis und Gestein.' },
    { n: 'Uranus', d: 100, r: 2.6, t: 4, c1: [.62, .86, .9], c2: [.45, .72, .8], a: 19.19, e: .0473, L: 313.23, w: 170.96, per: 30687, info: 'Rollt auf der Seite um die Sonne.' },
    { n: 'Neptun', d: 113, r: 2.5, t: 4, c1: [.3, .45, .9], c2: [.2, .3, .7], a: 30.07, e: .0086, L: -55.12, w: 44.97, per: 60190, info: 'Stärkste Winde: über 2000 km/h.' },
  ];
  const ANG0 = -0.06; // Bogen der Planetenreihe
  const planetVS = `varying vec3 vP;varying vec3 vW;varying vec3 vN;void main(){vP=position;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`;
  const planetFS = NOISE + `uniform int ty;uniform vec3 c1;uniform vec3 c2;uniform float t;uniform float seed;varying vec3 vP;varying vec3 vW;varying vec3 vN;
    void main(){vec3 L=normalize(-vW);vec3 V=normalize(cameraPosition-vW);vec3 p=normalize(vP);vec3 col;
      if(ty==2){ float h=fbm(p*2.2+seed); float land=smoothstep(.02,.08,h);
        vec3 sea=mix(vec3(.02,.09,.25),vec3(.05,.2,.42),fbm(p*6.)*.5+.5);
        vec3 gr=mix(vec3(.12,.3,.1),vec3(.5,.42,.25),smoothstep(.1,.35,h)); gr=mix(gr,vec3(.92),smoothstep(.75,.9,abs(p.y)));
        col=mix(sea,gr,land); float cl=smoothstep(.1,.45,fbm(p*3.+vec3(t*.01,0,0)+4.)); col=mix(col,vec3(.97),cl*.85);
        col=mix(col,vec3(.92),smoothstep(.82,.95,abs(p.y)));}
      else if(ty==3){ float b=p.y*7.+fbm(p*vec3(3.,10.,3.)+seed)*1.6; col=mix(c1,c2,.5+.5*sin(b*3.1)); col=mix(col,c1*1.08,smoothstep(.3,.8,fbm(p*12.+seed)));}
      else if(ty==4){ col=mix(c1,c2,.5+.5*sin(p.y*5.+fbm(p*4.+seed)));}
      else if(ty==1){ col=mix(c1,c2,fbm(p*vec3(2.,6.,2.)+seed)*.8+.4);}
      else { float h=fbm(p*4.+seed); col=mix(c2,c1,h*.8+.5); col*=.85+.3*fbm(p*18.+seed);}
      float d=max(dot(vN,L),0.);float lit=smoothstep(-.06,.35,dot(vN,L));
      vec3 c=col*(.015+1.25*lit*(.35+.65*d));
      float spec=ty==2?pow(max(dot(reflect(-L,vN),V),0.),40.)*.5*(1.-smoothstep(.02,.08,fbm(p*2.2+seed))):0.;
      float rim=pow(1.-max(dot(vN,V),0.),3.);
      vec3 atm=ty==2?vec3(.35,.6,1.):ty==1?vec3(1.,.85,.6):ty==4?c1:vec3(0.);
      c+=spec*vec3(1.,.95,.85)+atm*rim*lit*.9;
      gl_FragColor=vec4(c,1.);}`;
  const planets = [];
  P.forEach((p, i) => {
    const m = new T.Mesh(new T.SphereGeometry(p.r, 48, 48), new T.ShaderMaterial({ uniforms: { ty: { value: p.t }, c1: { value: new T.Color(...(p.c1 || [1, 1, 1])) }, c2: { value: new T.Color(...(p.c2 || [1, 1, 1])) }, t: { value: 0 }, seed: { value: i * 7.3 } }, vertexShader: planetVS, fragmentShader: planetFS }));
    const a = ANG0 + i * 0.065;
    m.position.set(Math.cos(a) * p.d, p.r * .9, Math.sin(a) * p.d);
    m.rotation.z = (i === 6 ? 1.6 : .3) * (i % 2 ? 1 : -1) * .3;
    m.userData = p; S.add(m); planets.push(m);
    // langer Schatten auf der Scheibe
    const len = p.r * 26, sh = new T.Mesh(new T.PlaneGeometry(len, p.r * 2.1), new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vU;void main(){float x=vU.x,y=abs(vU.y-.5)*2.;float a=pow(1.-x,1.4)*(1.-smoothstep(.5-x*.3,1.-x*.25,y))*.92;gl_FragColor=vec4(0.,0.,0.,a);}`,
    }));
    sh.rotation.x = -Math.PI / 2; sh.rotation.z = -a;
    sh.position.set(Math.cos(a) * (p.d + p.r * .4 + len / 2), 0.04, Math.sin(a) * (p.d + p.r * .4 + len / 2));
    S.add(sh);
    if (p.ring) {
      const rg = new T.Mesh(new T.RingGeometry(p.r * 1.35, p.r * 2.4, 96, 1), new T.ShaderMaterial({
        side: T.DoubleSide, transparent: true, depthWrite: false,
        uniforms: { r0: { value: p.r * 1.35 }, r1: { value: p.r * 2.4 } },
        vertexShader: `varying vec3 vL;varying vec3 vW;void main(){vL=position;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
        fragmentShader: `uniform float r0;uniform float r1;varying vec3 vL;varying vec3 vW;void main(){float k=(length(vL.xy)-r0)/(r1-r0);
          float b=.55+.45*sin(k*60.)*sin(k*13.+1.);float a=smoothstep(0.,.05,k)*(1.-smoothstep(.92,1.,k))*(k>.62&&k<.67?.15:1.)*b;
          vec3 c=mix(vec3(.85,.76,.58),vec3(.6,.52,.4),k);float lit=.35+.65*clamp(dot(normalize(-vW),vec3(0,1,0))*3.+.5,0.,1.);gl_FragColor=vec4(c*lit*1.1,a*.85);}`,
      }));
      rg.rotation.x = -Math.PI / 2 + .42; rg.rotation.y = .12; m.add(rg);
    }
  });
  const earth = planets[2];
  // Mond
  const moon = new T.Mesh(new T.SphereGeometry(.42, 24, 24), new T.ShaderMaterial({ uniforms: { ty: { value: 0 }, c1: { value: new T.Color(.7, .7, .7) }, c2: { value: new T.Color(.42, .42, .44) }, t: { value: 0 }, seed: { value: 2 } }, vertexShader: planetVS, fragmentShader: planetFS }));
  moon.userData = { n: 'Mond', r: .42, info: 'Gedächtnis & Dokumente.' }; S.add(moon);

  /* ---------- Staubscheibe ---------- */
  const DISK = 150;
  const disk = new T.Mesh(new T.RingGeometry(SUN_R * 1.05, DISK, 200, 8), new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, uniforms: { t: { value: 0 } },
    vertexShader: `varying vec3 vL;void main(){vL=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: NOISE + `uniform float t;varying vec3 vL;void main(){float r=length(vL.xy);float a=atan(vL.y,vL.x);
      float sp=a+log(r)*2.2-t*.02;float bands=.6+.4*sin(r*.7+fbm(vec3(r*.05,sp*.7,0.)*2.)*6.)*(.5+.5*sin(r*.23+1.7+fbm(vec3(sp,r*.03,3.))*4.));
      float dust=fbm(vec3(cos(sp)*r*.06,sin(sp)*r*.06,r*.02))*.5+.5;float grain=fbm(vec3(vL.xy*.6,1.))*.5+.5;
      float fall=pow(10./max(r,10.),1.05);float edge=1.-smoothstep(${(DISK * .55).toFixed(1)},${DISK.toFixed(1)},r);
      float k=fall*edge*(.35+bands*.65)*(.5+dust*.7)*(.7+grain*.5);
      vec3 c=mix(vec3(.55,.42,.3),vec3(1.,.9,.75),clamp(fall*1.3,0.,1.));
      gl_FragColor=vec4(c*k*1.05,1.);}`,
  }));
  disk.rotation.x = -Math.PI / 2; S.add(disk);
  // Staubkörner und Gesteinsbrocken
  const NP = mobile ? 14000 : 32000;
  const dg = new T.BufferGeometry(), dp = new Float32Array(NP * 3), dc = new Float32Array(NP * 3), ds = new Float32Array(NP);
  for (let i = 0; i < NP; i++) {
    const r = SUN_R * 1.3 + Math.pow(Math.random(), 1.6) * (DISK - SUN_R * 1.3), a = Math.random() * 6.283, y = (Math.random() - .5) * (.3 + r * .012);
    dp.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
    const b = Math.min(1, 12 / r) * (.25 + Math.random() * .55); dc.set([b, b * .86, b * .7], i * 3); ds[i] = Math.random() < .015 ? 3 + Math.random() * 3 : .6 + Math.random() * 1.2;
  }
  dg.setAttribute('position', new T.BufferAttribute(dp, 3)); dg.setAttribute('color', new T.BufferAttribute(dc, 3)); dg.setAttribute('sz', new T.BufferAttribute(ds, 1));
  const dust = new T.Points(dg, new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { px: { value: R.getPixelRatio() } },
    vertexShader: `attribute float sz;varying vec3 vC;uniform float px;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=sz*px*(60./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vC;void main(){vec2 d=gl_PointCoord-.5;float a=1.-smoothstep(.2,.5,length(d));gl_FragColor=vec4(vC*a,1.);}`, vertexColors: true,
  }));
  S.add(dust);

  /* ---------- Licht-Nachglühen (Bloom) ---------- */
  let comp = null, bloom = null;
  try {
    comp = new T.EffectComposer(R); comp.addPass(new T.RenderPass(S, cam));
    bloom = new T.UnrealBloomPass(new T.Vector2(256, 256), mobile ? .7 : .8, .55, .86); comp.addPass(bloom);
  } catch (e) { comp = null; }

  /* ---------- Kamera ---------- */
  const shot = () => {
    const port = innerHeight > innerWidth;
    return port ? { pos: new T.Vector3(-46, 30, 92), look: new T.Vector3(40, -14, 14), fov: 62 } : { pos: new T.Vector3(-44, 24, 86), look: new T.Vector3(62, -2, 4), fov: 38 };
  };
  let base = shot(); cam.position.copy(base.pos); cam.fov = base.fov; const look = base.look.clone();
  function size() { const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cv.style.width = w + 'px'; cv.style.height = h + 'px'; cam.aspect = w / h; base = shot(); if (!fly) { cam.fov = base.fov; } cam.updateProjectionMatrix(); if (comp) { comp.setSize(w, h); bloom.resolution.set(w / 2, h / 2); } }
  addEventListener('resize', size); size();

  // sanftes Schweben mit Finger/Maus/Neigung
  let px = 0, py = 0, tx = 0, ty = 0;
  addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5); }, { passive: true });
  addEventListener('deviceorientation', e => { if (e.gamma != null) { tx = Math.max(-.5, Math.min(.5, e.gamma / 60)); ty = Math.max(-.5, Math.min(.5, (e.beta - 50) / 80)); } }, { passive: true });

  /* ---------- Live-Daten der Planeten (Kepler-Bahnen, J2000) ---------- */
  function helio(p, date) {
    const d = (date - Date.UTC(2000, 0, 1, 12)) / 864e5;
    const M = ((p.L - p.w + 360 * d / p.per) % 360 + 360) % 360 * Math.PI / 180;
    let E = M; for (let k = 0; k < 6; k++) E = E - (E - p.e * Math.sin(E) - M) / (1 - p.e * Math.cos(E));
    const x = p.a * (Math.cos(E) - p.e), y = p.a * Math.sqrt(1 - p.e * p.e) * Math.sin(E);
    const v = Math.atan2(y, x) + p.w * Math.PI / 180, r = Math.hypot(x, y);
    return { x: r * Math.cos(v), y: r * Math.sin(v), r };
  }
  function facts(p) {
    const now = Date.now(), h = helio(p, now), e = helio(P[2], now);
    const AU = 149597870.7, dist = Math.hypot(h.x - e.x, h.y - e.y);
    return { sonne: h.r * AU, erde: p.n === 'Erde' ? 0 : dist * AU, licht: dist * AU / 299792.458 };
  }
  window.COSMOS_FACTS = n => { const p = P.find(x => x.n.toLowerCase() === String(n).toLowerCase()); return p ? Object.assign({ planet: p.n }, facts(p)) : null; };

  /* ---------- Planeten = Funktionsbereiche (ehrlicher Status) ---------- */
  const ST = { LIVE: ['LIVE', '#5fcf8f'], VERB: ['VERBINDUNG ERFORDERLICH', '#e7cb92'], DEV: ['IN ENTWICKLUNG', '#8fa7ff'], DEMO: ['DEMO', '#c9a0ff'], NO: ['NICHT UNTERSTÜTZT', '#ff7a66'] };
  const MOD = {
    Erde: { t: 'Weltlage', parts: [['Nachrichten & Brennpunkte (GDELT)', 'LIVE'], ['Erdbeben (USGS)', 'LIVE'], ['Flugverkehr (adsb.lol)', 'LIVE'], ['Webcams (Windy)', 'LIVE'], ['Wetter (Open-Meteo)', 'LIVE'], ['Kurdistan-Zentrum', 'DEV'], ['Schiffe, Waldbrände, Luftqualität', 'DEV']] },
    Mars: { t: 'Onlyhair · Unternehmen', parts: [['Umsätze, Termine, Auslastung (Salonkee)', 'VERB'], ['Preisvergleich der 4 Standorte', 'VERB'], ['Dienstpläne', 'DEV'], ['Samsung VXT Bildschirme', 'VERB']] },
    Neptun: { t: 'AZZYNO · Musik', parts: [['Streams & Hörer (Spotify for Artists)', 'VERB'], ['YouTube / TikTok / Instagram', 'VERB'], ['Release-Planer', 'DEV']] },
    Jupiter: { t: 'Finanzen & Wirtschaft', parts: [['Börsenkurse (Yahoo)', 'LIVE'], ['Saxo-Depot (Simulation)', 'VERB'], ['Budget, Rechnungen, Verträge', 'DEV']] },
    Venus: { t: 'Leben & Wohnung', parts: [['Einrichtungsliste & Preisalarm', 'DEV'], ['Smart Home (Home Assistant)', 'VERB']] },
    Saturn: { t: 'Fahrzeuge & Reisen', parts: [['Route & Verkehr', 'LIVE'], ['Audi S3 (myAudi)', 'VERB'], ['BMW M235i (ConnectedDrive)', 'VERB']] },
    Merkur: { t: 'Kommunikation & Termine', parts: [['E-Mail, Kalender, Kontakte', 'VERB']] },
    Uranus: { t: 'System & Agenten', parts: [['Systemprüfung', 'LIVE'], ['Agenten-Team', 'DEV']], sys: 1 },
    Mond: { t: 'Gedächtnis & Dokumente', parts: [['Verschlüsseltes Gedächtnis (braucht Anmeldung)', 'DEV'], ['Import von Notizen & Chats', 'DEV']] },
  };
  const chip = k => `<span class="stc" style="--c:${ST[k][1]}">${ST[k][0]}</span>`;
  const modHTML = n => { const m = MOD[n]; if (!m) return ''; return `<div class="pmod"><div class="pk">Bereich</div><div class="pmt">${m.t}</div>${m.parts.map(([a, k]) => `<div class="pr"><span>${a}</span>${chip(k)}</div>`).join('')}</div>`; };
  // echte Systemprüfung: ruft jeden Dienst wirklich auf
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const CHECKS = [
    ['Gehirn (Gemini)', () => fetch(API + 'chat').then(r => r.json()).then(d => d.gemini || d.groq)],
    ['Stimme & Ohr', () => fetch(API + 'tts', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }).then(r => r.status === 400)],
    ['Wetter', () => fetch(API + 'weather?lat=46.95&lon=7.45').then(r => r.ok)],
    ['Flugverkehr', () => fetch(API + 'flights?lat=46.95&lon=7.45&nm=30').then(r => r.ok)],
    ['Börsenkurse', () => fetch(API + 'quotes?s=^SSMI').then(r => r.ok)],
    ['Webcams', () => fetch(API + 'webcams?lat=46.95&lon=7.45&r=20').then(r => r.ok)],
    ['Satelliten', () => fetch(API + 'sats').then(r => r.ok)],
    ['Weltnachrichten', () => fetch(API + 'news').then(r => r.ok)],
    ['Erdbeben (USGS)', () => fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson').then(r => r.ok)],
  ];
  async function sysCheck() {
    card.innerHTML = `<div class="pk">Uranus · Systemprüfung</div><h3>INFINITY OS</h3><p>Ich prüfe jeden Dienst gerade wirklich, Boss.</p><div id="sysl">${CHECKS.map(([n], i) => `<div class="pr" id="sc${i}"><span>${n}</span><b>…</b></div>`).join('')}</div>`;
    card.classList.add('on');
    let ok = 0;
    await Promise.all(CHECKS.map(async ([n, f], i) => { const t0 = performance.now(); let good = false; try { good = await Promise.race([f(), new Promise((_, x) => setTimeout(() => x(), 15000))]); } catch (e) {} const el = document.getElementById('sc' + i); if (good) ok++; if (el) el.lastChild.outerHTML = good ? `<b style="color:#5fcf8f">● ${Math.round(performance.now() - t0)} ms</b>` : '<b style="color:#ff7a66">● gestört</b>'; }));
    card.insertAdjacentHTML('beforeend', `<p style="margin-top:10px">${ok} von ${CHECKS.length} Diensten laufen. Stand ${new Date().toLocaleTimeString('de-CH')}.</p>`);
  }
  window.SYSCHECK = sysCheck;

  /* ---------- Antippen ---------- */
  const ray = new T.Raycaster(), v2 = new T.Vector2();
  const card = $('#pcard'), tag = $('#etag');
  function pick(e) {
    v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(v2, cam);
    // grosszügige Trefferzone auf dem Handy
    let best = null, bd = 1e9;
    [...planets, moon].forEach(m => { const s = m.position.clone().project(cam); const dx = (s.x - v2.x) * innerWidth / 2, dy = (s.y - v2.y) * innerHeight / 2; const d = Math.hypot(dx, dy); const rad = Math.max(m === moon ? 18 : 26, (m.userData.r || .4) * 9); if (d < rad && d < bd) { bd = d; best = m; } });
    return best;
  }
  const fmt = n => Math.round(n).toLocaleString('de-CH');
  function showCard(m) {
    const p = m.userData;
    if (p.n === 'Mond') { card.innerHTML = `<div class="pk">Mond</div><h3>Mond</h3><p>Rund 384'400 km von Ihnen entfernt.</p>${modHTML('Mond')}`; card.classList.add('on'); return; }
    const f = facts(p);
    const lt = f.licht < 3600 ? Math.round(f.licht / 60) + ' Lichtminuten' : (f.licht / 3600).toFixed(1).replace('.', ',') + ' Lichtstunden';
    card.innerHTML = `<div class="pk">Live · ${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}</div><h3>${p.n}</h3><p>${p.info}</p>
      <div class="pr"><span>Zur Sonne</span><b>${fmt(f.sonne / 1e6)} Mio. km</b></div>
      ${p.n === 'Erde' ? '' : `<div class="pr"><span>Zu Ihnen</span><b>${fmt(f.erde / 1e6)} Mio. km</b></div><div class="pr"><span>Funk braucht</span><b>${lt}</b></div>`}
      ${modHTML(p.n)}
      ${p.n === 'Erde' ? '<button id="pgo">Eintreten →</button>' : MOD[p.n] && MOD[p.n].sys ? '<button id="psys">Systemprüfung starten</button>' : ''}`;
    card.classList.add('on');
    const go = $('#pgo'); if (go) go.onclick = ev => { ev.stopPropagation(); enter(); };
    const sy = $('#psys'); if (sy) sy.onclick = ev => { ev.stopPropagation(); sysCheck(); };
  }
  cv.addEventListener('click', e => {
    if (fly) return;
    const m = pick(e);
    if (!m) { card.classList.remove('on'); return; }
    if (m === earth) { enter(); return; }
    showCard(m); focusOn(m);
  });
  let focus = null; function focusOn(m) { focus = m; }
  tag.addEventListener('click', e => { e.stopPropagation(); enter(); });

  /* ---------- Flug in die Erde ---------- */
  function enter() {
    if (fly) return; card.classList.remove('on'); tag.classList.add('off');
    fly = { t0: performance.now(), from: cam.position.clone(), look0: look.clone(), fov0: cam.fov };
    document.body.classList.add('warp');
  }
  function exitToCosmos() {
    active = true; fly = null; focus = null; document.body.classList.remove('warp', 'earthside'); document.body.classList.add('cosmos'); tag.classList.remove('off');
    cam.position.copy(base.pos); look.copy(base.look); cam.fov = base.fov; cam.updateProjectionMatrix(); loop(performance.now());
  }
  window.COSMOS = { enter, exit: exitToCosmos };

  /* ---------- Bildschleife ---------- */
  const clock = new T.Clock(); let raf = 0;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const tmp = new T.Vector3();
  function loop(now) {
    if (!active) return;
    raf = requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    sunMat.uniforms.t.value = t; disk.material.uniforms.t.value = t;
    sun.rotation.y += dt * .03; dust.rotation.y -= dt * .006; disk.rotation.z += dt * .004;
    planets.forEach((m, i) => { m.rotation.y += dt * (.25 - i * .02); m.material.uniforms.t.value = t; });
    const ma = t * .35; moon.position.set(earth.position.x + Math.cos(ma) * 3.6, earth.position.y + .4, earth.position.z + Math.sin(ma) * 3.6);
    glow.material.rotation += dt * .01; glow.scale.setScalar(62 + Math.sin(t * 1.3) * 2);

    if (fly) {
      const k = Math.min(1, (now - fly.t0) / 3200), e = ease(k);
      const ep = earth.position, dir = tmp.copy(ep).sub(fly.from).normalize();
      const end = ep.clone().sub(dir.multiplyScalar(earth.userData.r * 1.6)).add(new T.Vector3(0, .4, 0));
      cam.position.lerpVectors(fly.from, end, e);
      cam.position.y += Math.sin(e * Math.PI) * 6;
      look.lerpVectors(fly.look0, ep, Math.min(1, e * 1.6));
      cam.fov = fly.fov0 + (24 - fly.fov0) * e; cam.updateProjectionMatrix();
      if (bloom) bloom.strength = (mobile ? .7 : .8) + e * .6;
      if (k > .78 && !fly.handed) { fly.handed = true; document.body.classList.add('earthside'); window.APP && APP.open(); }
      if (k >= 1) { active = false; document.body.classList.remove('cosmos', 'warp'); if (bloom) bloom.strength = mobile ? .7 : .8; R.clear(); return; }
    } else {
      px += (tx - px) * .03; py += (ty - py) * .03;
      const target = focus ? focus.position : null;
      const want = base.pos.clone().add(new T.Vector3(px * 8, -py * 4 + Math.sin(t * .2) * .8, 0));
      cam.position.lerp(want, .04);
      look.lerp(target ? tmp.copy(base.look).lerp(target, .35) : base.look, .03);
    }
    cam.lookAt(look);
    // Erd-Hinweis folgt der Erde
    const s = earth.position.clone().project(cam);
    tag.style.transform = `translate(${(s.x * .5 + .5) * innerWidth}px,${(-s.y * .5 + .5) * innerHeight}px)`;
    comp ? comp.render() : R.render(S, cam);
  }
  requestAnimationFrame(loop);
})();
