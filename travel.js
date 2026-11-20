/* =====================================================================
   JARVIS OMEGA · REISE & WETTER
   Route (Strecke, Live-Verkehr, ÖV live, Wetter am Ziel) und Wetterprognose
   als Lagekarte. Wird von JARVIS (Stimme) und von Hand aufgerufen.
   ===================================================================== */
(function () {
  const BASE = 'https://jarvis-iota-weld.vercel.app/api/';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = document.createElement('div'); el.id = 'travel'; el.innerHTML = '<div class="tv-sheet"><button class="tv-x" aria-label="Schliessen">✕</button><div class="tv-body"></div></div>';
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('.tv-x')) el.classList.remove('on'); });
  const body = el.querySelector('.tv-body');

  let pos = null;
  function locate() {
    if (pos && Date.now() - pos.t < 5 * 60000) return Promise.resolve(pos);
    return new Promise(res => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(p => { pos = { lat: p.coords.latitude, lon: p.coords.longitude, t: Date.now() }; res(pos); }, () => res(null), { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 });
    });
  }
  const hm = iso => iso ? new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '–';
  const dur = m => m == null ? '–' : m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m} min`;

  function wxBlock(w, ort) {
    if (!w) return '<div class="tv-note">Wetter nicht verfügbar.</div>';
    const j = w.jetzt;
    return `<div class="tv-h">WETTER · ${esc(ort)}</div>
      <div class="tv-wx"><b>${Math.round(j.temp)}°</b><div><span>${esc(j.wetter)}</span><small>gefühlt ${Math.round(j.gefuehlt)}° · Wind ${Math.round(j.wind)} km/h · Böen ${Math.round(j.boeen)} km/h · Feuchte ${j.feuchte}%</small></div></div>
      <div class="tv-hours">${w.stunden.slice(0, 12).map(h => `<div><small>${h.zeit}</small><b>${Math.round(h.temp)}°</b><i style="--p:${h.regen_prozent || 0}%"></i><small>${h.regen_prozent ?? 0}%</small></div>`).join('')}</div>
      <div class="tv-days">${w.tage.slice(0, 7).map(d => `<div><small>${new Date(d.datum).toLocaleDateString('de-CH', { weekday: 'short' })}</small><span>${esc(d.wetter)}</span><b>${Math.round(d.max)}° / ${Math.round(d.min)}°</b><small>${d.regen_mm} mm · ${d.regen_prozent ?? 0}%</small></div>`).join('')}</div>`;
  }

  async function route(ziel, start) {
    open(`<div class="tv-load">BERECHNE ROUTE NACH ${esc(String(ziel).toUpperCase())} …</div>`);
    const p = start ? null : await locate();
    const q = new URLSearchParams({ to: ziel }); if (start) q.set('from', start); else if (p) { q.set('lat', p.lat); q.set('lon', p.lon); q.set('label', 'Ihr Standort'); }
    const r = await fetch(BASE + 'route?' + q); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Route nicht verfügbar');
    const v = d.verkehr, a = d.auto;
    body.innerHTML = `
      <div class="tv-k">ROUTE · LIVE · ${hm(d.stand)}</div>
      <h2>${esc(d.start.name)} → ${esc(d.ziel.name)}</h2><div class="tv-sub">${esc(d.ziel.region)}${d.ziel.region ? ', ' : ''}${esc(d.ziel.land)}</div>
      <div class="tv-grid">
        <div><span>AUTO ${v ? 'MIT VERKEHR' : 'OHNE VERKEHR'}</span><b>${dur(v ? v.minuten_mit_verkehr : a?.minuten_ohne_verkehr)}</b></div>
        <div><span>STRECKE</span><b>${v?.km ?? a?.km ?? '–'} km</b></div>
        <div class="${v && v.stau_minuten > 5 ? 'warn' : ''}"><span>STAU</span><b>${v ? (v.stau_minuten ? '+' + v.stau_minuten + ' min' : 'frei') : 'n. verb.'}</b></div>
        <div><span>ANKUNFT</span><b>${v ? hm(v.ankunft) : a ? hm(new Date(Date.now() + a.minuten_ohne_verkehr * 60000).toISOString()) : '–'}</b></div>
      </div>
      ${d.live_verkehr_verbunden ? '' : '<div class="tv-note">Live-Stau braucht einen kostenlosen TomTom-Schlüssel. Bis dahin: Fahrzeit ohne Verkehr. Live-Verkehr sehen Sie sofort in Apple Karten oder Google Maps.</div>'}
      <div class="tv-btns"><a href="${d.links.apple}" target="_blank" rel="noopener">APPLE KARTEN</a><a href="${d.links.google}" target="_blank" rel="noopener">GOOGLE MAPS</a></div>
      ${d.oev && d.oev.length ? `<div class="tv-h">ZUG / ÖV · LIVE</div><div class="tv-oev">${d.oev.map(c => `<div><b>${hm(c.ab)} → ${hm(c.an)}</b><span>${esc(c.dauer)} h · ${c.umstiege} Umst. · ${esc(c.produkte)}</span>${c.verspaetung_min ? `<em>+${c.verspaetung_min} min</em>` : '<em class="ok">pünktlich</em>'}${c.gleis ? `<small>Gleis ${esc(c.gleis)}</small>` : ''}</div>`).join('')}</div><div class="tv-btns"><a href="${d.links.sbb}" target="_blank" rel="noopener">SBB FAHRPLAN</a></div>` : ''}
      ${wxBlock(d.wetter, d.ziel.name)}
      <div class="tv-src">${esc(d.quellen)}</div>`;
    return d;
  }
  async function weather(ort) {
    open(`<div class="tv-load">LADE WETTER ${ort ? esc(String(ort).toUpperCase()) : ''} …</div>`);
    const q = new URLSearchParams(); if (ort) q.set('q', ort); else { const p = await locate(); if (p) { q.set('lat', p.lat); q.set('lon', p.lon); q.set('label', 'Ihr Standort'); } }
    const r = await fetch(BASE + 'weather?' + q); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Wetter nicht verfügbar');
    body.innerHTML = `<div class="tv-k">WETTER · LIVE · ${hm(d.stand)}</div><h2>${esc(d.ort.name)}</h2><div class="tv-sub">${esc(d.ort.region || '')}${d.ort.land ? ', ' + esc(d.ort.land) : ''}</div>${wxBlock(d, d.ort.name)}<div class="tv-src">Quelle: Open-Meteo</div>`;
    return d;
  }
  function open(html) { body.innerHTML = html; el.classList.add('on'); }

  // Kurzfassung für die Stimme (kleine Antwort, nur Fakten)
  const short = {
    route: d => ({ von: d.start.name, nach: `${d.ziel.name}, ${d.ziel.land}`, auto: d.verkehr ? { fahrzeit_min: d.verkehr.minuten_mit_verkehr, stau_min: d.verkehr.stau_minuten, km: d.verkehr.km, quelle: 'TomTom live' } : { fahrzeit_min_ohne_verkehr: d.auto?.minuten_ohne_verkehr, km: d.auto?.km, hinweis: 'Live-Stau nicht verbunden; Apple Karten / Google Maps-Link in der App' }, oev_naechste: (d.oev || []).slice(0, 3).map(c => ({ ab: hm(c.ab), an: hm(c.an), dauer: c.dauer, umstiege: c.umstiege, verspaetung_min: c.verspaetung_min })), wetter_ziel: d.wetter ? { jetzt: `${Math.round(d.wetter.jetzt.temp)} Grad, ${d.wetter.jetzt.wetter}`, heute: d.wetter.tage[0], morgen: d.wetter.tage[1] } : null }),
    weather: d => ({ ort: d.ort.name, jetzt: d.jetzt, naechste_stunden: d.stunden.slice(0, 6), tage: d.tage.slice(0, 4) }),
  };
  window.TRAVEL = { route, weather, short, locate };
})();
