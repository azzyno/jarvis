/* =====================================================================
   JARVIS · AKTION
   Kino-Intro mit Sound, Radar über Bern, Live-Zielerfassungen auf der
   Erde (aus echten Schlagzeilen), Tag-Nacht-Grenze in Echtzeit,
   Datenströme, Glitch, Telemetrie. Sounds werden live synthetisiert.
   ===================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const V = () => window.JARVIS || {};
  const HOME = [7.4474, 46.9480];

  /* ---------- Sound ---------- */
  let ctx = null, master = null, soundOn = (() => { try { return localStorage.getItem('fx-sound') !== 'off'; } catch (e) { return true; } })();
  function audio() { if (ctx) return ctx; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination); } catch (e) { ctx = null; } return ctx; }
  const quiet = () => !soundOn || !ctx || ['speaking', 'listening'].includes(V().state);
  function tone(f, d, { type = 'sine', v = .15, to = null, at = 0 } = {}) {
    if (!ctx) return; const t = ctx.currentTime + at; const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05);
  }
  function noise(d, { v = .2, f0 = 800, f1 = 3000, q = 1, at = 0, type = 'bandpass' } = {}) {
    if (!ctx) return; const t = ctx.currentTime + at; const n = ctx.createBufferSource(); const b = ctx.createBuffer(1, ctx.sampleRate * d, ctx.sampleRate);
    const a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; n.buffer = b;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
    const g = ctx.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    n.connect(fl); fl.connect(g); g.connect(master); n.start(t);
  }
  const SFX = {
    blip() { if (quiet()) return; tone(2200, .05, { type: 'square', v: .04 }); tone(3300, .04, { type: 'square', v: .03, at: .06 }); },
    lock() { if (quiet()) return; [880, 1320, 1760].forEach((f, i) => tone(f, .08, { type: 'triangle', v: .07, at: i * .07 })); },
    whoosh() { if (quiet()) return; noise(.9, { v: .18, f0: 300, f1: 4000, q: .8 }); },
    boom() { if (!soundOn || !ctx) return; tone(70, 1.6, { v: .55, to: 28 }); noise(1.2, { v: .35, f0: 1200, f1: 60, type: 'lowpass' }); tone(140, .5, { type: 'sawtooth', v: .06, to: 40 }); },
    type() { if (quiet()) return; tone(1200 + Math.random() * 600, .02, { type: 'square', v: .02 }); },
    granted() { if (!soundOn || !ctx) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, { type: 'triangle', v: .09, at: i * .09 })); },
  };
  window.SFX = SFX;

  /* ---------- Sound-Schalter ---------- */
  const sb = document.createElement('button'); sb.id = 'fxSound'; sb.setAttribute('aria-label', 'Ton an/aus');
  const setSb = () => { sb.textContent = soundOn ? '◉ TON' : '○ TON'; sb.classList.toggle('off', !soundOn); };
  sb.onclick = () => { soundOn = !soundOn; try { localStorage.setItem('fx-sound', soundOn ? 'on' : 'off'); } catch (e) {} audio(); setSb(); if (soundOn) SFX.blip(); };
  setSb(); document.body.appendChild(sb);

  /* ---------- Kino-Intro ---------- */
  const intro = document.createElement('div'); intro.id = 'fxIntro';
  intro.innerHTML = `<div class="fi-grid"></div><div class="fi-ring"><i></i><i></i><i></i><i></i><svg viewBox="-50 -50 100 100"><circle r="46"/><path d="M0 -50V-38M0 38V50M-50 0H-38M38 0H50"/></svg><b class="fi-face"></b></div>
    <div class="fi-scan"></div><div class="fi-log" id="fiLog"></div><div class="fi-big" id="fiBig">IDENTIFIZIERE</div><div class="fi-flash"></div>`;
  document.body.appendChild(intro);
  const STEPS = [['BIOMETRISCHER ABGLEICH', 'OK'], ['STIMMPROFIL MASTER', 'OK'], ['SATELLITENVERBINDUNG', 'STEHT'], ['VERSCHLÜSSELUNG AES-256', 'AKTIV'], ['NACHRICHTENDIENSTE', 'ONLINE']];
  function playIntro() {
    audio(); try { ctx && ctx.resume(); } catch (e) {}
    intro.classList.add('on'); SFX.whoosh();
    const log = $('#fiLog'); log.innerHTML = '';
    STEPS.forEach(([a, b], i) => setTimeout(() => { const d = document.createElement('div'); d.innerHTML = `<span>› ${a}</span><b>${b}</b>`; log.appendChild(d); SFX.blip(); }, 300 + i * 360));
    setTimeout(() => { $('#fiBig').textContent = 'ZUGRIFF GEWÄHRT'; intro.classList.add('ok'); SFX.granted(); }, 2300);
    setTimeout(() => { intro.classList.add('flash'); SFX.boom(); }, 3000);
    setTimeout(() => { intro.classList.add('out'); }, 3300);
    setTimeout(() => { intro.classList.remove('on', 'ok', 'flash', 'out'); startOrbitAuto(); }, 4300);
  }
  const boot = $('#boot'); if (boot) boot.addEventListener('click', playIntro, { once: true });

  /* ---------- Satelliten von Anfang an in Bewegung ---------- */
  function startOrbitAuto() {
    setTimeout(() => { try { if (window.ORBIT && !document.body.classList.contains('orbit')) { window.ORBIT.start().then(() => { const p = $('#shOrbit'); if (p && innerWidth < 900) { p.classList.remove('on'); document.body.classList.remove('orbit'); document.body.classList.add('orbit-bg'); } }); } } catch (e) {} }, 6500);
  }

  /* ---------- Overlay: Radar + Datenströme ---------- */
  const cv = document.createElement('canvas'); cv.id = 'fxCanvas'; document.body.appendChild(cv);
  const g = cv.getContext('2d');
  const streams = Array.from({ length: 2 }, () => ({ rows: Array.from({ length: 60 }, () => rnd()), off: 0 }));
  function rnd() { const r = Math.random(); return r < .4 ? (Math.random() * 0xffffff | 0).toString(16).toUpperCase().padStart(6, '0') : r < .7 ? (Math.random() * 360 - 180).toFixed(4) : ['LOCK', 'SYNC', 'ACK', 'TX', 'RX', 'SAT', 'GEO', 'ENC'][Math.random() * 8 | 0] + '-' + (Math.random() * 999 | 0); }

  /* ---------- Live-Zielerfassungen (echte Schlagzeilen) ---------- */
  const locks = [];
  function newLock() {
    const L = window.SIT && window.SIT.lage, map = window.SIT && window.SIT.getMap(); if (!L || !map || !L.geo) return;
    const hl = (L.headlines || []).filter(h => h.c && h.c.length && L.geo[h.c[0]]); if (!hl.length) return;
    const h = hl[Math.random() * Math.min(hl.length, 120) | 0]; const geo = L.geo[h.c[0]];
    const jitter = () => (Math.random() - .5) * 3;
    locks.push({ lat: geo[0] + jitter(), lon: geo[1] + jitter(), land: geo[2], t: String(h.t), s: h.s, born: performance.now(), id: Math.random().toString(36).slice(2, 7).toUpperCase() });
    if (locks.length > 3) locks.shift();
    SFX.lock();
    window.SIT.funk(`ZIELERFASSUNG ${locks[locks.length - 1].id} · ${geo[2].toUpperCase()} · ${String(h.t).toUpperCase().slice(0, 70)}`, 'warn');
  }
  setInterval(() => { if (window.SIT && window.SIT.view === 'cockpit' && !document.hidden && !document.body.classList.contains('dossier') && !document.body.classList.contains('menu')) newLock(); }, 9000);

  function wrapText(t, max) { const w = t.split(' '), out = []; let l = ''; for (const x of w) { if ((l + ' ' + x).trim().length > max) { out.push(l.trim()); l = x; } else l += ' ' + x; } if (l.trim()) out.push(l.trim()); return out.slice(0, 3); }

  /* ---------- Tag-Nacht-Grenze ---------- */
  function sunPos(d) { const rad = Math.PI / 180, n = (d - Date.UTC(2000, 0, 1, 12)) / 864e5; const L = (280.46 + .9856474 * n) % 360, gA = (357.528 + .9856003 * n) * rad; const lam = (L + 1.915 * Math.sin(gA) + .02 * Math.sin(2 * gA)) * rad, eps = (23.439 - 4e-7 * n) * rad;
    const dec = Math.asin(Math.sin(eps) * Math.sin(lam)); const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)); const gmst = (18.697374558 + 24.06570982441908 * n) % 24 * 15 * rad; let lon = (ra - gmst) / rad; lon = ((lon + 540) % 360) - 180; return { lat: dec / rad, lon }; }
  function nightPoly() {
    const s = sunPos(Date.now()), rad = Math.PI / 180, pts = [];
    for (let lo = -180; lo <= 180; lo += 2) { const la = Math.atan(-Math.cos((lo - s.lon) * rad) / Math.tan(s.lat * rad)) / rad; pts.push([lo, la]); }
    const pole = s.lat > 0 ? -90 : 90; return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-180, pole], ...pts, [180, pole], [-180, pole]]] } };
  }
  let nightAdded = false;
  function ensureNight() {
    const map = window.SIT && window.SIT.getMap(); if (!map) return;
    try {
      if (!nightAdded) {
        map.addSource('night-side', { type: 'geojson', data: nightPoly() });
        map.addLayer({ id: 'night-side', type: 'fill', source: 'night-side', paint: { 'fill-color': '#000814', 'fill-opacity': .42 } }, 'lab');
        map.addSource('sun', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: [sunPos(Date.now()).lon, sunPos(Date.now()).lat] } } });
        map.addLayer({ id: 'sun', type: 'circle', source: 'sun', paint: { 'circle-radius': 7, 'circle-color': '#ffd27a', 'circle-blur': .6, 'circle-opacity': .9 } });
        nightAdded = true;
      } else { map.getSource('night-side').setData(nightPoly()); const s = sunPos(Date.now()); map.getSource('sun').setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] } }); }
    } catch (e) {}
  }
  setInterval(ensureNight, 60000); const ni = setInterval(() => { ensureNight(); if (nightAdded) clearInterval(ni); }, 1500);

  /* ---------- Glitch auf dem Titel ---------- */
  setInterval(() => { const b = document.querySelector('.sh-greet b'); if (!b || document.hidden) return; b.classList.add('glitch'); setTimeout(() => b.classList.remove('glitch'), 520); }, 7000);
  const gb = document.querySelector('.sh-greet b'); if (gb) gb.setAttribute('data-t', gb.textContent);

  /* ---------- Bildaufbau pro Frame ---------- */
  function frame(t) {
    requestAnimationFrame(frame); if (document.hidden) return;
    const dpr = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = innerHeight;
    if (cv.width !== w * dpr || cv.height !== h * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const S = window.SIT; if (!S || S.view !== 'cockpit' || document.body.classList.contains('menu')) return;
    const T = t / 1000, map = S.getMap();
    // Radar über Bern
    if (map) {
      const p = map.project(HOME), R = Math.min(w, h) * .22;
      if (p.x > -R && p.x < w + R && p.y > -R && p.y < h + R) {
        g.save(); g.translate(p.x, p.y);
        g.strokeStyle = 'rgba(79,216,255,.16)'; g.lineWidth = 1; [1, .66, .33].forEach(k => { g.beginPath(); g.arc(0, 0, R * k, 0, 7); g.stroke(); });
        g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0); g.moveTo(0, -R); g.lineTo(0, R); g.stroke();
        const a = (T * 1.4) % (Math.PI * 2);
        const grd = g.createConicGradient ? g.createConicGradient(a - .9, 0, 0) : null;
        if (grd) { grd.addColorStop(0, 'rgba(79,216,255,0)'); grd.addColorStop(.14, 'rgba(79,216,255,.28)'); grd.addColorStop(.145, 'rgba(79,216,255,0)'); g.fillStyle = grd; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); }
        g.strokeStyle = 'rgba(79,216,255,.85)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke();
        g.restore();
      }
      // Zielerfassungen
      const now = performance.now();
      for (const L of locks) {
        const age = (now - L.born) / 1000; if (age > 8) continue;
        const q = map.project([L.lon, L.lat]); if (q.x < -50 || q.x > w + 50 || q.y < -50 || q.y > h + 50) continue;
        const k = Math.min(1, age / .5), sz = 46 - 26 * k, fade = age > 7 ? 1 - (age - 7) : 1, blink = age < .6 ? (Math.sin(age * 40) > 0 ? 1 : .2) : 1;
        g.save(); g.translate(q.x, q.y); g.globalAlpha = fade * blink; g.strokeStyle = '#ff3d3d'; g.lineWidth = 1.6; g.shadowColor = '#ff3d3d'; g.shadowBlur = 10;
        const c = sz * .4; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { g.beginPath(); g.moveTo(sx * sz, sy * (sz - c)); g.lineTo(sx * sz, sy * sz); g.lineTo(sx * (sz - c), sy * sz); g.stroke(); });
        g.beginPath(); g.arc(0, 0, 3, 0, 7); g.fillStyle = '#ff3d3d'; g.fill();
        g.rotate(T * 2); g.setLineDash([3, 5]); g.beginPath(); g.arc(0, 0, sz * 1.5, 0, 7); g.stroke(); g.setLineDash([]); g.rotate(-T * 2);
        g.shadowBlur = 0;
        if (age > .5) {
          const lines = wrapText(L.t, 34), chars = Math.floor((age - .5) * 60); let used = 0;
          const bx = q.x > w * .6 ? -sz - 16 - 210 : sz + 16, by = -sz;
          g.fillStyle = 'rgba(2,8,14,.82)'; g.fillRect(bx - 6, by - 4, 216, 30 + lines.length * 14);
          g.strokeStyle = 'rgba(255,61,61,.7)'; g.strokeRect(bx - 6, by - 4, 216, 30 + lines.length * 14);
          g.font = '600 9px "IBM Plex Mono", monospace'; g.fillStyle = '#ff3d3d'; g.fillText(`ZIEL ${L.id} · ${L.land.toUpperCase()}`, bx, by + 8);
          g.font = '500 10.5px Barlow, sans-serif'; g.fillStyle = '#e8f4fb';
          lines.forEach((ln, i) => { const show = Math.max(0, Math.min(ln.length, chars - used)); used += ln.length; g.fillText(ln.slice(0, show), bx, by + 24 + i * 14); });
          g.font = '500 8px "IBM Plex Mono", monospace'; g.fillStyle = '#7f98a8'; g.fillText(`${L.lat.toFixed(2)}N ${L.lon.toFixed(2)}E · ${String(L.s || '').toUpperCase().slice(0, 22)}`, bx, by + 22 + lines.length * 14 + 4);
        }
        g.restore();
      }
    }
    // Datenströme am Rand
    if (w >= 700) {
      g.font = '500 9px "IBM Plex Mono", monospace';
      streams.forEach((st, i) => { st.off += .35; if (st.off > 14) { st.off = 0; st.rows.pop(); st.rows.unshift(rnd()); }
        const x = i ? w - 70 : 12; st.rows.forEach((r, k) => { const y = 200 + k * 14 + st.off; if (y > h - 260) return; g.fillStyle = `rgba(79,216,255,${Math.max(0, .35 - k * .006)})`; g.fillText(r, x, y); }); });
    }
    // Horizontaler Scanbalken
    const sy = ((T * 70) % (h + 200)) - 100; const sg = g.createLinearGradient(0, sy - 40, 0, sy); sg.addColorStop(0, 'rgba(79,216,255,0)'); sg.addColorStop(1, 'rgba(79,216,255,.06)'); g.fillStyle = sg; g.fillRect(0, sy - 40, w, 40);
  }
  requestAnimationFrame(frame);

  /* Klick-Sounds für alle HUD-Knöpfe */
  document.addEventListener('click', e => { if (e.target.closest('#sitHud button, #osMenu a, #osMenuBtn, .sm-pin')) { audio(); SFX.blip(); } }, true);
})();
