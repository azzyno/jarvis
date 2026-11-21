/* =====================================================================
   JARVIS · MERIDIAN-OBERFLÄCHE
   Zentrale mit flüssigem Chrom-Kern, Tiefen-Karussell mit Live-Daten,
   Vollbild-Menü, Sprach-Knopf auf jeder Seite, Vorhang-Übergänge.
   Alle Zahlen kommen live aus echten Quellen; ohne Daten: „—“.
   ===================================================================== */
(function () {
  const J = window.J; if (!J) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const V = () => window.JARVIS || {};
  const words = (html, d0 = 0) => html.split('|').map((w, i) => `<span class="w"><i style="animation-delay:${(d0 + i * .09).toFixed(2)}s">${w}</i></span>`).join(' ');
  try { Object.defineProperty(window, '__holoPause', { get: () => true, set() {}, configurable: true }); } catch (e) {}

  /* ---------- Grundgerüst ---------- */
  document.body.insertAdjacentHTML('afterbegin', '<div id="osGrain"></div><div id="osTop"></div><div id="osCurtain"></div>');
  const brand = $('.brand'); if (brand) { brand.innerHTML = 'Jarvis<small>Ω</small>'; brand.onclick = () => J.go('cockpit'); }
  document.body.insertAdjacentHTML('beforeend', `
    <button id="osMenuBtn" aria-label="Menü"><span id="osMenuT">MENÜ</span><i></i></button>
    <nav id="osMenu" aria-label="Hauptmenü"><ol>
      <li><a data-v="cockpit"><span>01</span><b>Zentrale</b><em id="mm1"></em></a></li>
      <li><a data-v="office"><span>02</span><b>Atrium</b><em>3D-BÜRO</em></a></li>
      <li><a data-v="lage"><span>03</span><b>Weltlage</b><em id="mm3"></em></a></li>
      <li><a data-v="port"><span>04</span><b>Finanzen</b><em id="mm4"></em></a></li>
      <li><a data-v="invest"><span>05</span><b>Märkte</b><em id="mm5"></em></a></li>
      <li><a data-v="calc"><span>06</span><b>Immobilien</b><em>RECHNER</em></a></li>
      <li><a data-v="hub"><span>07</span><b>Verbindungen</b><em id="mm7"></em></a></li>
    </ol><div class="mf"><span>JARVIS · ZÜRICH</span><span id="mmT"></span></div></nav>
    <button id="osFab" aria-label="Mit JARVIS sprechen" data-s="off"></button>`);
  $$('#osMenu a').forEach((a, i) => a.style.transitionDelay = (.12 + i * .05) + 's');
  const menu = on => { document.body.classList.toggle('menu', on); $('#osMenuT').textContent = on ? 'SCHLIESSEN' : 'MENÜ'; if (on) refreshMenu(); };
  $('#osMenuBtn').onclick = () => menu(!document.body.classList.contains('menu'));
  $('#osMenu').onclick = e => { const a = e.target.closest('a[data-v]'); if (!a) return; menu(false); setTimeout(() => J.go(a.dataset.v), 250); };
  $('#osFab').onclick = () => { const s = V().state; if (!s || s === 'off' || s === 'err') V().start && V().start(); else { V().end && V().end(); J.toast('Gespräch beendet'); } };

  /* ---------- Seitenköpfe ---------- */
  const HEAD = {
    port: ['04', 'FINANZEN · SAXO · ORDER', 'Ihre|<em>Finanzen</em>'],
    invest: ['05', 'MÄRKTE · ANALYSE', 'Die|<em>Märkte</em>'],
    calc: ['06', 'IMMOBILIEN · RECHNER', 'Ihr|<em>Zuhause</em>'],
    hub: ['07', 'VERBINDUNGEN · EINSTELLUNGEN', 'Ver|<em>bindungen</em>'],
    welt: ['—', 'VERMÖGEN NACH LÄNDERN', 'Die|<em>Welt</em>'],
    jarvis: ['—', 'GESPRÄCH', 'Im|<em>Dialog</em>'],
  };
  function head(v) {
    const h = HEAD[v], sec = document.getElementById('v-' + v); if (!h || !sec) return;
    let el = sec.querySelector('.os-ph'); if (!el) { el = document.createElement('div'); el.className = 'os-ph'; sec.prepend(el); }
    el.innerHTML = `<span><i>${h[0]}</i> — ${h[1]}</span><h1>${words(h[2], .15)}</h1><div class="ln"></div>`;
  }

  /* ---------- Beschriftungen beruhigen ---------- */
  const EMO = /^\s*(?:[\p{Extended_Pictographic}←-⇿⌀-⏿■-➿⬀-⯿]️?‍?)+\s*/u;
  function clean(root = document) {
    root.querySelectorAll('button, .btn, a.btn').forEach(b => { const t = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t && EMO.test(t.textContent)) t.textContent = t.textContent.replace(EMO, ''); });
    root.querySelectorAll('.card[style*="border-color"]').forEach(c => c.style.removeProperty('border-color'));
    root.querySelectorAll('.ct[style*="color"]').forEach(c => c.style.removeProperty('color'));
  }

  /* =====================================================================
     ZENTRALE
     ===================================================================== */
  const sec = $('#v-cockpit');
  const home = document.createElement('div'); home.id = 'osHome';
  const ARROW = '<svg viewBox="0 0 24 24"><path d="M4 12h16M14 6l6 6-6 6"/></svg>';
  home.innerHTML = `
    <section class="oh-hero">
      <div class="oh-glow"></div>
      <div class="oh-ring"><svg viewBox="-100 -100 200 200" fill="none">
        <g class="a"><circle r="96" stroke="rgba(239,238,233,.10)" stroke-width=".3"/><circle r="96" stroke="rgba(239,238,233,.35)" stroke-width=".3" stroke-dasharray=".4 3.6"/>
          <path d="M0 -96 A96 96 0 0 1 60 -75" stroke="#ff6a2b" stroke-width=".5"/></g>
        <g class="b"><circle r="84" stroke="rgba(239,238,233,.08)" stroke-width=".3" stroke-dasharray="20 6 2 6"/></g>
      </svg></div>
      <div id="ohCore" role="button" aria-label="Mit JARVIS sprechen"></div>
      <div class="oh-meta"><span><i></i><b id="ohDate">—</b></span><span id="ohWx">ZÜRICH —</span></div>
      <div class="oh-txt"><h1 class="oh-hi" id="ohHi"></h1></div>
      <div class="oh-st" id="ohSt" data-s="off"><i></i><span id="ohStT">Bereit · Kern antippen</span><span class="sp"></span><button id="ohMute" hidden>Stumm</button><button id="ohEnd" hidden>Beenden</button><button id="ohLog">Protokoll</button></div>
      <div class="oh-say" id="ohSay"></div>
      <form class="oh-ask" id="ohAsk" autocomplete="off"><input id="ohAskIn" placeholder="Was darf ich für Sie tun?" enterkeyhint="send"><button type="submit" aria-label="Senden">${ARROW}</button></form>
      <div class="oh-chips" id="ohChips">
        <button data-ask="Wie ist die Weltlage gerade?">Weltlage</button><button data-ask="Wie ist der Verkehr nach Genf?">Verkehr Genf</button>
        <button data-ask="Wie wird das Wetter morgen in Zürich?">Wetter morgen</button><button data-ask="Wie steht mein Saxo-Konto?">Mein Konto</button><button data-ask="Ich will nach Berlin.">Nach Berlin</button>
      </div>
    </section>
    <div class="oh-sec"><span>01</span><h2>Live-<em>Lage</em></h2><small id="ohStamp">—</small></div>
    <div class="oh-deck" id="ohDeck">
      <button class="oh-card" id="cWx"><div class="n"><span><b>01</b> · ZÜRICH</span><span class="lv">LIVE</span></div><div id="cWxB"><span class="oh-shim" style="width:60%"></span><span class="oh-shim" style="width:40%"></span></div><canvas class="sp" id="cWxS"></canvas><div class="ft">Prognose öffnen</div></button>
      <button class="oh-card" id="cLage"><div class="n"><span><b>02</b> · WELTLAGE</span><span class="lv" id="cLageN">LIVE</span></div><h3>Brenn-<em>punkte</em></h3><ul class="oh-news" id="cLageB"><li><span class="oh-shim" style="width:80%"></span></li></ul><div class="ft">Globus öffnen</div></button>
      <div class="oh-card" id="cRoute" style="cursor:default"><div class="n"><span><b>03</b> · ROUTE</span><span>LIVE-VERKEHR</span></div><h3>Wohin,<br><em>Master?</em></h3>
        <form class="oh-route" id="ohRoute"><input id="ohRouteIn" placeholder="Ziel …" enterkeyhint="go"><button type="submit">LOS →</button></form>
        <div class="oh-rq"><span>Genf</span><span>Bern</span><span>Basel</span><span>Luzern</span><span>Mailand</span><span>Berlin</span></div><div class="ft" style="pointer-events:none">Stau · Zug · Wetter</div></div>
      <button class="oh-card" id="cMk"><div class="n"><span><b>04</b> · BÖRSEN</span><span class="lv">LIVE</span></div><h3>Han<em>del</em></h3><div class="oh-mk" id="cMkB"></div><div class="ft">Märkte öffnen</div></button>
      <button class="oh-card" id="cSx"><div class="n"><span><b>05</b> · KONTO</span><span id="cSxE">SAXO</span></div><div id="cSxB"><h3>…</h3></div><div class="ft">Finanzen öffnen</div></button>
      <button class="oh-card oh-off" id="cOff"><div class="n"><span><b>06</b> · ATRIUM</span><span>3D</span></div><h3>Das<br><em>Büro</em></h3><div class="pv"><i></i><i></i></div><div class="ft">Eintreten</div></button>
    </div>
    <div class="oh-sec"><span>02</span><h2>Ihr <em>Vermögen</em></h2><small>APP-PORTFOLIO</small></div>`;
  sec.prepend(home);

  /* ---------- Uhr & Begrüssung ---------- */
  let lastHi = '';
  function tick() {
    const now = new Date();
    const d = now.toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase();
    const t = now.toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' });
    $('#ohDate').textContent = `${d} · ${t}`; $('#mmT').textContent = t; const m1 = $('#mm1'); if (m1) m1.textContent = t;
    const h = +now.toLocaleString('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', hour12: false });
    const g = h < 5 ? 'Gute|Nacht,' : h < 11 ? 'Guten|Morgen,' : h < 17 ? 'Guten|Tag,' : h < 22 ? 'Guten|Abend,' : 'Gute|Nacht,';
    if (g !== lastHi) { lastHi = g; $('#ohHi').innerHTML = words(g, .3) + '<br>' + words('<em>Master.</em>', .5); }
  }

  /* ---------- Stimme ---------- */
  const STXT = { off: 'Bereit · Kern antippen', busy: 'Verbinde …', err: 'Fehler · erneut antippen', listening: 'Ich höre zu', speaking: 'JARVIS spricht', muted: 'Mikrofon stumm' };
  $('#ohCore').onclick = () => { const s = V().state; if (!s || s === 'off' || s === 'err') V().start && V().start(); else if (s === 'muted') V().mute(); };
  $('#ohMute').onclick = () => V().mute && V().mute();
  $('#ohEnd').onclick = () => V().end && V().end();
  $('#ohLog').onclick = () => { const w = $('#vLogWrap'); w && w.classList.toggle('open'); };
  const ask = t => { t = String(t || '').trim(); if (t && V().send) V().send(t); };
  $('#ohAsk').onsubmit = e => { e.preventDefault(); const i = $('#ohAskIn'); ask(i.value); i.value = ''; i.blur(); };
  $('#ohChips').onclick = e => { const b = e.target.closest('[data-ask]'); if (b) ask(b.dataset.ask); };
  const greet = $('#greet');
  if (greet) new MutationObserver(() => { if (!['listening', 'speaking', 'muted'].includes(V().state)) return; const s = $('#ohSay'); s.style.opacity = 0; setTimeout(() => { s.textContent = greet.textContent; s.style.opacity = 1; }, 250); }).observe(greet, { childList: true, characterData: true, subtree: true });
  let lastS = '';
  function voiceUI() {
    const st = V().state || 'off'; if (st === lastS) return; lastS = st;
    $('#ohSt').dataset.s = st; $('#ohStT').textContent = STXT[st] || STXT.off; $('#osFab').dataset.s = st;
    const live = ['listening', 'speaking', 'muted'].includes(st);
    $('#ohMute').hidden = $('#ohEnd').hidden = !live; $('#ohMute').textContent = st === 'muted' ? 'Mikro an' : 'Stumm';
    document.body.classList.toggle('voice-speaking', st === 'speaking'); document.body.classList.toggle('voice-listening', st === 'listening');
  }

  /* ---------- Chrom-Kern ---------- */
  let core = null;
  (function makeCore() {
    const host = $('#ohCore'); if (typeof THREE === 'undefined' || !window.JCore) return;
    let r; try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { host.innerHTML = '<div style="position:absolute;inset:28%;border-radius:50%;background:radial-gradient(circle at 35% 28%,#fff,#bfc2c8 18%,#55575d 45%,#141417 70%)"></div>'; return; }
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); r.setClearColor(0, 0); host.appendChild(r.domElement);
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(26, 1, .1, 50); cam.position.set(0, 0, 6.2);
    const mat = window.JCore.material(); const m = new THREE.Mesh(new THREE.SphereGeometry(1, 192, 144), mat); sc.add(m);
    let tx = 0, ty = 0, rx = 0, ry = 0, vis = true, w = 0;
    host.addEventListener('pointermove', e => { const b = host.getBoundingClientRect(); tx = ((e.clientX - b.left) / b.width - .5) * .6; ty = ((e.clientY - b.top) / b.height - .5) * .4; });
    host.addEventListener('pointerleave', () => { tx = ty = 0; });
    new IntersectionObserver(es => es.forEach(e => vis = e.isIntersecting)).observe(host);
    core = {
      frame(T) {
        if (!vis) return; const s = host.clientWidth; if (!s) return; if (s !== w) { w = s; r.setSize(s, s, false); cam.aspect = 1; cam.updateProjectionMatrix(); }
        const st = window.JCore.update(mat, T); rx += (ty - rx) * .05; ry += (tx - ry) * .05;
        m.rotation.y = T * .15 + ry; m.rotation.x = rx; m.position.y = Math.sin(T * .8) * .04; m.scale.setScalar(1 + st.lvl * .06);
        r.render(sc, cam);
      },
    };
  })();

  /* ---------- Tiefen-Karussell ---------- */
  const deck = $('#ohDeck');
  function flow() {
    const dr = deck.getBoundingClientRect(), cx = dr.left + dr.width / 2;
    deck.querySelectorAll('.oh-card').forEach(c => { const b = c.getBoundingClientRect(); const o = (b.left + b.width / 2 - cx) / b.width; const a = Math.min(1.6, Math.abs(o));
      c.style.transform = `translateZ(${-a * 110}px) rotateY(${Math.max(-1.6, Math.min(1.6, o)) * -16}deg) scale(${1 - a * .05})`; c.style.opacity = 1 - a * .38; });
  }
  deck.addEventListener('scroll', () => requestAnimationFrame(flow), { passive: true });
  addEventListener('resize', flow);

  /* ---------- Live-Daten ---------- */
  const MK = [
    { n: 'SIX', c: 'Zürich', tz: 'Europe/Zurich', o: 540, e: 1050 }, { n: 'XETRA', c: 'Frankfurt', tz: 'Europe/Berlin', o: 540, e: 1050 }, { n: 'LSE', c: 'London', tz: 'Europe/London', o: 480, e: 990 },
    { n: 'NYSE', c: 'New York', tz: 'America/New_York', o: 570, e: 960 }, { n: 'TSE', c: 'Tokio', tz: 'Asia/Tokyo', o: 540, e: 930 }, { n: 'HKEX', c: 'Hongkong', tz: 'Asia/Hong_Kong', o: 570, e: 960 },
  ];
  const tzp = tz => { const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).forEach(p => o[p.type] = p.value); return o; };
  const isOpen = m => { const p = tzp(m.tz); if (p.weekday === 'Sat' || p.weekday === 'Sun') return false; const t = (+p.hour % 24) * 60 + +p.minute; return t >= m.o && t < m.e; };
  function renderMk() {
    $('#cMkB').innerHTML = MK.map(m => { const p = tzp(m.tz), on = isOpen(m); return `<div><i class="${on ? 'on' : ''}"></i><span>${m.n} <small>${m.c}</small></span><small>${(+p.hour % 24 + '').padStart(2, '0')}:${p.minute} · ${on ? 'OFFEN' : 'ZU'}</small></div>`; }).join('');
    const open = MK.filter(isOpen).length; const m5 = $('#mm5'); if (m5) m5.textContent = open ? `${open} BÖRSEN OFFEN` : 'ALLE BÖRSEN ZU';
  }
  function spark(cv, vals) {
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight; if (!w || vals.length < 2) return;
    cv.width = w * dpr; cv.height = h * dpr; const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const mn = Math.min(...vals) - .5, mx = Math.max(...vals) + .5, pt = i => [i / (vals.length - 1) * w, h - 10 - (vals[i] - mn) / (mx - mn) * (h - 24)];
    const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#9fd4ff'); gr.addColorStop(1, '#ff6a2b');
    x.beginPath(); vals.forEach((v, i) => { const [a, b] = pt(i); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.strokeStyle = gr; x.lineWidth = 1.4; x.stroke();
    x.lineTo(w, h); x.lineTo(0, h); x.closePath(); const fg = x.createLinearGradient(0, 0, 0, h); fg.addColorStop(0, 'rgba(255,106,43,.16)'); fg.addColorStop(1, 'rgba(255,106,43,0)'); x.fillStyle = fg; x.fill();
    vals.forEach((v, i) => { if (i % 3) return; const [a, b] = pt(i); x.fillStyle = '#efeee9'; x.beginPath(); x.arc(a, b, 1.6, 0, 7); x.fill(); });
  }
  async function loadWx() {
    try {
      const r = await fetch(API + 'weather?q=Z%C3%BCrich'); const d = await r.json(); if (!r.ok) throw 0;
      const j = d.jetzt, t0 = (d.tage || [])[0];
      $('#cWxB').innerHTML = `<div class="big">${Math.round(j.temp)}<sup>°</sup></div><p><b>${esc(j.wetter)}</b>${t0 ? ` · H ${Math.round(t0.max)}° · T ${Math.round(t0.min)}°` : ''}<br>Wind ${Math.round(j.wind)} km/h${j.boeen ? ' · Böen ' + Math.round(j.boeen) : ''}</p>`;
      $('#ohWx').textContent = `ZÜRICH ${Math.round(j.temp)}° · ${String(j.wetter).toUpperCase()}`;
      spark($('#cWxS'), (d.stunden || []).map(s => s.temp));
    } catch (e) { $('#cWxB').innerHTML = '<div class="big">—</div><p>Wetter nicht erreichbar</p>'; }
  }
  async function loadLage() {
    try {
      const d = window.__lageData && window.__lageData.hotspots ? window.__lageData : await (await fetch(API + 'news')).json();
      window.__lageData = d;
      $('#cLageN').textContent = `${d.total || 0} MELD.`; const m3 = $('#mm3'); if (m3) m3.textContent = `${d.total || 0} MELDUNGEN`;
      $('#cLageB').innerHTML = (d.hotspots || []).slice(0, 4).map(h => `<li class="${h.watch ? 'w' : ''}"><b>${esc(h.c)}</b><span><strong>${esc(h.n)}</strong> — ${esc(h.headline || '')}</span></li>`).join('');
      $('#ohStamp').textContent = 'STAND ' + new Date(d.stand || Date.now()).toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' });
    } catch (e) { $('#cLageB').innerHTML = '<li><span>Nachrichtendienst nicht erreichbar</span></li>'; }
  }
  const hasSaxo = () => { try { return !!(JSON.parse(localStorage.getItem('omega-saxo') || 'null') || {}).token; } catch (e) { return false; } };
  async function loadSx() {
    const m4 = $('#mm4'), m7 = $('#mm7');
    if (!hasSaxo()) { $('#cSxB').innerHTML = '<h3>Nicht<br><em>verbunden</em></h3><p>Tippen, um Ihr Saxo-Konto zu verbinden.</p>'; if (m4) m4.textContent = 'SAXO AUS'; if (m7) m7.textContent = 'SAXO AUS'; return; }
    try { window.__saxoRefresh && await window.__saxoRefresh(); } catch (e) {}
    const s = window.__saxoSnap;
    if (!s || s.gesamtwert == null) { $('#cSxB').innerHTML = '<h3><em>Verbunden</em></h3><p>Kontostand gerade nicht abrufbar.</p>'; if (m4) m4.textContent = 'SAXO VERBUNDEN'; return; }
    $('#cSxE').textContent = 'SAXO · ' + (s.umgebung === 'SIM' ? 'DEMO' : 'LIVE');
    $('#cSxB').innerHTML = `<div class="big" style="font-size:78px;margin-top:30px">${Math.round(s.gesamtwert).toLocaleString('de-CH')}</div><p><b>${esc(s.waehrung || '')}</b> · ${(s.positionen || []).length} Positionen<br>Cash ${Math.round(s.cash || 0).toLocaleString('de-CH')} ${esc(s.waehrung || '')}</p>`;
    if (m4) m4.textContent = `${Math.round(s.gesamtwert).toLocaleString('de-CH')} ${s.waehrung || ''}`; if (m7) m7.textContent = 'SAXO VERBUNDEN';
  }
  function refreshMenu() { renderMk(); tick(); $$('#osMenu a').forEach(a => a.classList.toggle('on', a.dataset.v === view)); }

  $('#cWx').onclick = () => window.TRAVEL && window.TRAVEL.weather('Zürich');
  $('#cLage').onclick = () => J.go('lage');
  $('#cMk').onclick = () => J.go('invest');
  $('#cSx').onclick = () => J.go('port');
  $('#cOff').onclick = () => J.go('office');
  const route = z => { z = String(z || '').trim(); if (z && window.TRAVEL) window.TRAVEL.route(z).catch(e => J.toast('Route: ' + e.message)); };
  $('#ohRoute').onsubmit = e => { e.preventDefault(); route($('#ohRouteIn').value); $('#ohRouteIn').blur(); };
  $('#cRoute .oh-rq').onclick = e => { if (e.target.tagName === 'SPAN') route(e.target.textContent); };

  /* ---------- Seitenwechsel ---------- */
  let view = 'cockpit', first = true;
  const curtain = $('#osCurtain');
  J.onView(v => {
    const prev = view; view = v;
    [...document.body.classList].filter(c => c.startsWith('v-')).forEach(c => document.body.classList.remove(c)); document.body.classList.add('v-' + v);
    if (!first && prev !== v) { curtain.classList.remove('go'); void curtain.offsetWidth; curtain.classList.add('go'); }
    first = false; head(v); setTimeout(() => clean(), 30);
    if (v === 'cockpit') { loadSx(); renderMk(); setTimeout(flow, 60); }
  });
  document.body.classList.add('v-cockpit');

  /* ---------- Taktgeber ---------- */
  (function loop(t) { requestAnimationFrame(loop); if (document.hidden) return; voiceUI(); if (view === 'cockpit' && core) core.frame(t / 1000); })(performance.now());
  tick(); renderMk(); loadWx(); loadLage(); loadSx(); clean(); setTimeout(flow, 100); setTimeout(flow, 800);
  setInterval(tick, 5000); setInterval(renderMk, 30000); setInterval(loadWx, 10 * 60000);
  setInterval(() => { window.__lageData = null; loadLage(); }, 10 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); renderMk(); } });
})();
