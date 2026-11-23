/* =====================================================================
   JARVIS · GLAS & BEWEGUNG
   1. Liquid Glass – Glas, das das Bild dahinter bricht und dem Finger folgt
   2. Dock – Befehle wie das Apple-Dock, die beim Überfahren wachsen
   3. Stimme in Partikeln – JARVIS spricht sichtbar
   4. Märkte live – animiertes Finanz-Dashboard mit echten Kursen
   ===================================================================== */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const ZTZ = 'Europe/Zurich';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Liquid Glass ---------- */
  document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="lgF" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="n"/><feGaussianBlur in="n" stdDeviation="2" result="nb"/>
    <feDisplacementMap in="SourceGraphic" in2="nb" scale="38" xChannelSelector="R" yChannelSelector="G"/></filter></svg>`);
  // Die echte Lichtbrechung kann nur Chrome/Edge/Android; Safari bekommt die Glanz-Variante.
  const ua = navigator.userAgent; const chromium = /Chrome\//.test(ua) && !/iPhone|iPad|iPod/.test(ua);
  if (chromium && CSS.supports('backdrop-filter', 'url(#lgF)')) document.documentElement.classList.add('lg-real');
  const GLASS = '.sc,#shAsk,.sh-cmds,#atlasBar,#osMenuBtn,.sh-pan,.sm-lab,.of-cap,.card,.kpi';
  // Lichtreflex folgt Finger oder Maus
  let raf = 0, px = 0, py = 0;
  addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(sheen); }, { passive: true });
  function sheen() {
    raf = 0;
    $$(GLASS).forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      el.style.setProperty('--mx', ((px - r.left) / r.width * 100).toFixed(1) + '%'); el.style.setProperty('--my', ((py - r.top) / r.height * 100).toFixed(1) + '%'); });
  }

  /* ---------- 2. Dock ---------- */
  const dock = $('#shCmds');
  if (dock) {
    dock.classList.add('dock');
    const items = () => [...dock.querySelectorAll('button')];
    const max = 1.38, reach = 90;
    function mag(x) {
      items().forEach(b => { const r = b.getBoundingClientRect(); const c = r.left + r.width / 2; const d = Math.abs(x - c);
        const s = d < reach ? 1 + (max - 1) * Math.cos(d / reach * Math.PI / 2) ** 2 : 1; b.style.setProperty('--s', s.toFixed(3)); b.classList.toggle('big', s > 1.32); });
    }
    const reset = () => items().forEach(b => { b.style.setProperty('--s', 1); b.classList.remove('big'); });
    dock.addEventListener('pointermove', e => mag(e.clientX));
    dock.addEventListener('pointerleave', reset);
    dock.addEventListener('touchmove', e => { const t = e.touches[0]; if (t) mag(t.clientX); }, { passive: true });
    dock.addEventListener('touchend', () => setTimeout(reset, 180));
    // Tippen: kleiner Hüpfer wie beim Mac
    dock.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop'); });
  }

  /* ---------- 3. Stimme in Partikeln ---------- */
  const cv = document.createElement('canvas'); cv.id = 'voiceFx'; document.body.appendChild(cv);
  const g = cv.getContext('2d'); let W = 0, H = 0, dpr = 1; const P = [];
  function size() { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; }
  size(); addEventListener('resize', size);
  const COL = { speaking: [168, 134, 74], listening: [28, 43, 74], busy: [125, 136, 156] };
  let ring = 0;
  function voice(t) {
    requestAnimationFrame(voice);
    if (document.hidden) return;
    const st = (window.JARVIS && window.JARVIS.state) || 'off';
    let lvl = 0; try { lvl = window.JARVIS && window.JARVIS.level ? window.JARVIS.level() : 0; } catch (e) {}
    const active = ['speaking', 'listening', 'busy'].includes(st);
    const btn = document.body.classList.contains('v-cockpit') ? $('#shTalk') : $('#osFab');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (!btn || (!active && !P.length)) return;
    const r = btn.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const c = COL[st] || COL.busy;
    if (active && !reduce) {
      const n = st === 'speaking' ? 2 + Math.round(lvl * 14) : st === 'listening' ? 1 + Math.round(lvl * 8) : 1;
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * (st === 'speaking' ? 2.6 : 3.6); const sp = .6 + Math.random() * (1.2 + lvl * 4);
        P.push({ x: cx + Math.cos(a) * 30, y: cy + Math.sin(a) * 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - .4, life: 1, s: .8 + Math.random() * 2.2, c }); }
      if (P.length > 600) P.splice(0, P.length - 600);
      // Schallringe
      ring += .016 + lvl * .05;
      for (let k = 0; k < 3; k++) { const p = (ring + k / 3) % 1; g.beginPath(); g.arc(cx, cy, 30 + p * (70 + lvl * 120), 0, Math.PI * 2); g.strokeStyle = `rgba(${c},${(1 - p) * (.25 + lvl * .5)})`; g.lineWidth = 1.2; g.stroke(); }
    }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.x += p.vx; p.y += p.vy; p.vy -= .012; p.vx *= .995; p.life -= .011;
      if (p.life <= 0) { P.splice(i, 1); continue; }
      g.beginPath(); g.arc(p.x, p.y, p.s * p.life, 0, Math.PI * 2); g.fillStyle = `rgba(${p.c},${p.life * .75})`; g.fill(); }
  }
  requestAnimationFrame(voice);

  /* ---------- 4. Märkte live ---------- */
  const port = $('#v-port');
  if (port) {
    const box = document.createElement('div'); box.className = 'mk-board'; box.id = 'mkBoard';
    box.innerHTML = `<div class="mk-head"><div><span>Märkte · live</span><h2 id="mkName">—</h2></div><div class="mk-big"><b id="mkVal">—</b><em id="mkPct"></em></div></div>
      <svg id="mkChart" viewBox="0 0 600 200" preserveAspectRatio="none"><defs><linearGradient id="mkG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#a8864a" stop-opacity=".32"/><stop offset="1" stop-color="#a8864a" stop-opacity="0"/></linearGradient></defs>
      <path id="mkArea" fill="url(#mkG)"/><path id="mkLine" fill="none" stroke="#a8864a" stroke-width="2.2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><line id="mkPrev" x1="0" x2="600" stroke="#1c2b4a" stroke-opacity=".18" stroke-dasharray="4 5" vector-effect="non-scaling-stroke"/><circle id="mkDot" r="4.5" fill="#a8864a"/></svg>
      <div class="mk-time" id="mkTime"></div><div class="mk-tiles" id="mkTiles"></div><div class="mk-src" id="mkSrc"></div>`;
    const ph = port.querySelector('.os-ph'); ph ? ph.after(box) : port.prepend(box);
    let data = [], cur = 0, anim = 0;
    const fmt = (v, s) => v == null ? '—' : v.toLocaleString('de-CH', { maximumFractionDigits: /=X$/.test(s) ? 4 : v >= 1000 ? 0 : 2, minimumFractionDigits: /=X$/.test(s) ? 4 : v >= 1000 ? 0 : 2 });
    function spark(serie, up) {
      if (!serie || serie.length < 2) return '';
      const ys = serie.map(p => p[1]), mn = Math.min(...ys), mx = Math.max(...ys) || 1, k = mx - mn || 1;
      const d = serie.map((p, i) => `${(i / (serie.length - 1) * 100).toFixed(1)},${(28 - (p[1] - mn) / k * 26).toFixed(1)}`).join(' ');
      return `<svg viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${d}" fill="none" stroke="${up ? '#3f7d5c' : '#b5503c'}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
    }
    function tiles() {
      $('#mkTiles').innerHTML = data.map((q, i) => q.kurs == null ? '' : `<button class="mk-t${i === cur ? ' on' : ''}" data-i="${i}" style="animation-delay:${i * 60}ms"><span>${q.n}</span><b>${fmt(q.kurs, q.s)}</b><em class="${q.pct >= 0 ? 'up' : 'dn'}">${q.pct >= 0 ? '+' : ''}${q.pct != null ? q.pct.toFixed(2) : '—'} %</em>${spark(q.serie, q.pct >= 0)}</button>`).join('');
    }
    function chart(i, animate = true) {
      const q = data[i]; if (!q || !q.serie || q.serie.length < 2) return; cur = i;
      $$('#mkTiles .mk-t').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
      $('#mkName').textContent = q.n; $('#mkPct').textContent = q.pct != null ? `${q.pct >= 0 ? '+' : ''}${q.pct.toFixed(2)} % heute` : ''; $('#mkPct').className = q.pct >= 0 ? 'up' : 'dn';
      const ys = q.serie.map(p => p[1]).concat(q.vortag != null ? [q.vortag] : []), mn = Math.min(...ys), mx = Math.max(...ys), k = (mx - mn) || 1;
      const X = j => j / (q.serie.length - 1) * 600, Y = v => 186 - (v - mn) / k * 170;
      const pts = q.serie.map((p, j) => [X(j), Y(p[1])]);
      const line = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
      $('#mkLine').setAttribute('d', line); $('#mkArea').setAttribute('d', line + ` L600 200 L0 200 Z`);
      const pv = q.vortag != null ? Y(q.vortag) : -10; $('#mkPrev').setAttribute('y1', pv); $('#mkPrev').setAttribute('y2', pv);
      const last = pts[pts.length - 1]; $('#mkDot').setAttribute('cx', last[0]); $('#mkDot').setAttribute('cy', last[1]);
      $('#mkTime').textContent = q.zeit ? `${q.boerse ? q.boerse + ' · ' : ''}Stand ${new Date(q.zeit).toLocaleString('de-CH', { timeZone: ZTZ, weekday: 'short', hour: '2-digit', minute: '2-digit' })}` : '';
      // Linie zeichnet sich, Zahl zählt hoch
      const L = $('#mkLine'); const len = L.getTotalLength ? L.getTotalLength() : 2000;
      if (animate && !reduce) { L.style.transition = 'none'; L.style.strokeDasharray = len; L.style.strokeDashoffset = len; $('#mkArea').style.opacity = 0; void L.getBoundingClientRect();
        L.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(.2,.7,.2,1)'; L.style.strokeDashoffset = 0; $('#mkArea').style.transition = 'opacity 1.2s .5s'; $('#mkArea').style.opacity = 1; }
      cancelAnimationFrame(anim); const t0 = performance.now(), from = q.serie[0][1], to = q.kurs;
      const step = t => { const p = Math.min(1, (t - t0) / 1300), e = 1 - Math.pow(1 - p, 3); $('#mkVal').textContent = fmt(from + (to - from) * e, q.s) + (q.w && !/=X$/.test(q.s) ? ' ' + q.w : ''); if (p < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    }
    // Finger über die Kurve: Wert zu jeder Uhrzeit
    const svg = $('#mkChart');
    svg.addEventListener('pointermove', e => { const q = data[cur]; if (!q || !q.serie) return; const r = svg.getBoundingClientRect(); const j = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (q.serie.length - 1)); const p = q.serie[j];
      const ys = q.serie.map(x => x[1]).concat(q.vortag != null ? [q.vortag] : []), mn = Math.min(...ys), k = (Math.max(...ys) - mn) || 1;
      $('#mkDot').setAttribute('cx', j / (q.serie.length - 1) * 600); $('#mkDot').setAttribute('cy', 186 - (p[1] - mn) / k * 170);
      $('#mkVal').textContent = fmt(p[1], q.s); $('#mkTime').textContent = new Date(p[0]).toLocaleTimeString('de-CH', { timeZone: ZTZ, hour: '2-digit', minute: '2-digit' }) + ' Uhr'; });
    svg.addEventListener('pointerleave', () => chart(cur, false));
    $('#mkTiles').onclick = e => { const b = e.target.closest('.mk-t'); if (b) chart(+b.dataset.i); };
    async function load(first) {
      try { const r = await fetch(API + 'quotes'); if (!r.ok) throw 0; const d = await r.json(); data = d.kurse.filter(q => q.kurs != null);
        $('#mkSrc').textContent = 'Quelle: ' + d.quelle; tiles(); chart(Math.min(cur, data.length - 1), first);
      } catch (e) { $('#mkSrc').textContent = 'Kurse gerade nicht erreichbar.'; }
    }
    let loaded = false;
    const io = new MutationObserver(() => { if (port.classList.contains('on')) { if (!loaded) { loaded = true; load(true); } else chart(cur, true); } });
    io.observe(port, { attributes: true, attributeFilter: ['class'] });
    setInterval(() => { if (port.classList.contains('on') && !document.hidden) load(false); }, 60000);
    window.MARKETS = { load, get data() { return data; } };
  }
})();
