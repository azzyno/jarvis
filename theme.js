/* =====================================================================
   JARVIS OMEGA · COMMAND-OBERFLÄCHE
   Live-Statusleiste (echte Zeit, Börsen, Wetter, Verbindungen, Nachrichten),
   Start-Prüfung mit echten Checks, Übergänge, Auftritt- und Zähl-Animationen.
   ===================================================================== */
(function () {
  const J = window.J; if (!J) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const NEWS = 'https://jarvis-iota-weld.vercel.app/api/news';

  /* ---------- Grundgerüst ---------- */
  const scan = document.createElement('div'); scan.id = 'cmdScan'; document.body.appendChild(scan);
  const wipe = document.createElement('div'); wipe.id = 'cmdWipe'; document.body.appendChild(wipe);
  const bar = document.createElement('div'); bar.id = 'cmdBar'; document.body.appendChild(bar);

  /* ---------- Live-Daten ---------- */
  const MK = [
    { n: 'SIX', tz: 'Europe/Zurich', o: 540, c: 1050 }, { n: 'XETRA', tz: 'Europe/Berlin', o: 540, c: 1050 },
    { n: 'LSE', tz: 'Europe/London', o: 480, c: 990 }, { n: 'NYSE', tz: 'America/New_York', o: 570, c: 960 },
    { n: 'TSE', tz: 'Asia/Tokyo', o: 540, c: 930 }, { n: 'HKEX', tz: 'Asia/Hong_Kong', o: 570, c: 960 },
  ];
  const parts = tz => { const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).forEach(p => o[p.type] = p.value); return o; };
  const open = m => { const p = parts(m.tz); if (p.weekday === 'Sat' || p.weekday === 'Sun') return false; const t = (+p.hour % 24) * 60 + +p.minute; return t >= m.o && t < m.c; };
  const live = { wx: null, news: null, ping: null };
  const hasSaxo = () => { try { return !!(JSON.parse(localStorage.getItem('omega-saxo') || 'null') || {}).token; } catch (e) { return false; } };
  const voiceOn = () => !!window.__omegaLive;

  async function loadWeather() {
    try { const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=46.9480&longitude=7.4474&current=temperature_2m,wind_speed_10m,weather_code&timezone=Europe%2FZurich'); const j = await r.json(); live.wx = j.current; } catch (e) { live.wx = null; }
  }
  async function loadNews() {
    const t0 = performance.now();
    try { const r = await fetch(NEWS); const j = await r.json(); live.ping = Math.round(performance.now() - t0); if (j && j.hotspots) { live.news = j; window.__lageData = window.__lageData || j; } } catch (e) { live.news = null; }
  }
  const WX = c => c == null ? '' : c === 0 ? 'KLAR' : c <= 3 ? 'BEWÖLKT' : c <= 48 ? 'NEBEL' : c <= 67 ? 'REGEN' : c <= 77 ? 'SCHNEE' : c <= 82 ? 'SCHAUER' : 'GEWITTER';

  function renderBar() {
    const now = new Date();
    const zrh = now.toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich' });
    const utc = now.toLocaleTimeString('de-CH', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
    const items = [
      `<span class="k">ZRH <b>${zrh}</b></span>`, `<span class="k">UTC <b>${utc}</b></span>`,
      ...MK.map(m => { const o = open(m); return `<span class="k"><i class="d ${o ? 'on' : 'off'}"></i>${m.n} <b>${o ? 'OFFEN' : 'ZU'}</b></span>`; }),
      live.wx ? `<span class="k">BERN <b>${Math.round(live.wx.temperature_2m)}°</b> ${WX(live.wx.weather_code)}</span>` : '',
      `<span class="k"><i class="d ${voiceOn() ? 'on' : ''}"></i>STIMME <b>${voiceOn() ? 'LIVE' : 'BEREIT'}</b></span>`,
      `<span class="k"><i class="d ${hasSaxo() ? 'on' : 'warn'}"></i>SAXO <b>${hasSaxo() ? 'VERBUNDEN' : 'AUS'}</b></span>`,
      live.news ? `<span class="k"><i class="d on"></i>NEWS <b>${live.news.total}</b> · ${live.news.hotspots.filter(h => !h.watch).map(h => h.n.toUpperCase()).join(' / ')}</span>` : `<span class="k"><i class="d warn"></i>NEWS <b>…</b></span>`,
      live.ping != null ? `<span class="k">LATENZ <b>${live.ping} ms</b></span>` : '',
    ].filter(Boolean);
    const row = items.join('<i class="sep"></i>');
    bar.innerHTML = `<div class="run">${row}<i class="sep"></i>${row}<i class="sep"></i></div>`;
  }
  // Uhr-Felder jede Sekunde direkt aktualisieren (ohne Lauftext neu zu starten)
  function tickClock() { const z = new Date().toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich' }); bar.querySelectorAll('.k').forEach(k => { if (k.textContent.startsWith('ZRH')) k.querySelector('b').textContent = z; }); }

  /* ---------- Start-Prüfung ---------- */
  const boot = $('#boot');
  if (boot) {
    const bx = boot.querySelector('.bx');
    const h0 = +new Date().toLocaleString('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', hour12: false });
    const gr = h0 < 5 ? 'Noch wach' : h0 < 11 ? 'Guten Morgen' : h0 < 17 ? 'Guten Tag' : h0 < 22 ? 'Guten Abend' : 'Gute Nacht';
    bx.innerHTML = `
      <div class="sn-orb"><i></i><i></i><i></i><b></b></div>
      <h1>JARVIS</h1>
      <div class="sn-t">${gr},<br><i>Master.</i></div>
      <p>Ihr persönliches System ist bereit.</p>
      <div id="tap" style="opacity:.35">Einen Moment …</div>
      <div class="cmd-prog"><i id="bootProg"></i></div>
      <div id="bootlog"></div>`;
    const log = (t, st, cls) => { $('#bootlog').insertAdjacentHTML('beforeend', `<div>› ${t} <span class="${cls}">${st}</span></div>`); };
    (async () => {
      const steps = [
        ['NETZWERK', async () => navigator.onLine ? ['ONLINE', 'ok'] : ['OFFLINE', 'wn']],
        ['SPRACHKERN', async () => ['BEREIT', 'ok']],
        ['BROKER SAXO', async () => hasSaxo() ? ['VERBUNDEN', 'ok'] : ['NICHT VERBUNDEN', 'wn']],
        ['NACHRICHTENDIENST', async () => { await loadNews(); return live.news ? [`${live.news.total} SCHLAGZEILEN`, 'ok'] : ['NICHT ERREICHBAR', 'wn']; }],
        ['BÖRSE ZÜRICH', async () => open(MK[0]) ? ['OFFEN', 'ok'] : ['GESCHLOSSEN', 'wn']],
        ['IDENTITÄT', async () => ['MASTER', 'ok']],
      ];
      for (let i = 0; i < steps.length; i++) { const [n, f] = steps[i]; let r; try { r = await f(); } catch (e) { r = ['FEHLER', 'wn']; } log(n, r[0], r[1]); $('#bootProg').style.width = ((i + 1) / steps.length * 100) + '%'; await new Promise(r => setTimeout(r, 120)); }
      const tap = $('#tap'); tap.textContent = 'Eintreten'; tap.style.opacity = 1;
      renderBar();
    })();
  }

  /* ---------- Übergänge & Auftritte ---------- */
  const IDX = {};
  function decorate(v) {
    const sec = document.getElementById('v-' + v); if (!sec) return;
    let n = 0;
    sec.querySelectorAll('.ct').forEach(ct => { if (!ct.dataset.idx) ct.dataset.idx = String(++n).padStart(2, '0') + ' / '; });
    sec.querySelectorAll('.card,.kpi,.vdock,.vform').forEach((el, i) => { el.classList.remove('cmd-in'); void el.offsetWidth; el.style.animationDelay = (i * 60) + 'ms'; el.classList.add('cmd-in'); });
    sec.querySelectorAll('.kpi b, .bi b').forEach(countUp);
  }
  function countUp(el) {
    const m = String(el.textContent).match(/^(\D*?)(-?[\d'’]{1,}(?:[.,]\d+)?)(.*)$/); if (!m) return;
    const raw = m[2].replace(/['’]/g, '').replace(',', '.'); const to = parseFloat(raw); if (!isFinite(to) || Math.abs(to) < 2) return;
    const dec = (m[2].split(/[.,]/)[1] || '').length; const t0 = performance.now(), D = 900;
    const step = now => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = m[1] + (to * e).toLocaleString('de-CH', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3]; if (k < 1) requestAnimationFrame(step); else el.textContent = m[1] + m[2] + m[3]; };
    requestAnimationFrame(step);
  }
  J.onView(v => { wipe.classList.remove('go'); void wipe.offsetWidth; wipe.classList.add('go'); setTimeout(() => decorate(v), 30); });
  setTimeout(() => decorate('cockpit'), 600);

  /* ---------- Taktgeber ---------- */
  loadWeather(); renderBar();
  setInterval(tickClock, 1000);
  setInterval(renderBar, 30000);
  setInterval(loadWeather, 15 * 60000);
  setInterval(loadNews, 10 * 60000);
})();
