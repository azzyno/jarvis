/* =====================================================================
   JARVIS · SICHT  (inspiriert von „God's Eye View")
   Sichtmodi über den echten Satellitenbildern:
   Normal · Wärmebild · Nachtsicht · Zielfernrohr (Linse mit Fadenkreuz)
   dazu echte 3D-Gebäude (OpenStreetMap über OpenFreeMap, kostenlos).
   ===================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const MODES = [['normal', 'Normal'], ['thermal', 'Wärmebild'], ['night', 'Nachtsicht'], ['scope', 'Zielfernrohr']];
  let mode = 'normal';
  try { mode = localStorage.getItem('vision-mode') || 'normal'; } catch (e) {}

  // Farbfilter: Graustufen → Wärmepalette (schwarz-violett-rot-orange-gelb-weiss) bzw. Restlichtverstärker-Grün
  document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <filter id="vThermal" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".3 .59 .11 0 0  .3 .59 .11 0 0  .3 .59 .11 0 0  0 0 0 1 0"/>
      <feComponentTransfer><feFuncR type="table" tableValues="0.02 0.25 0.55 0.85 0.98 1 1 1"/><feFuncG type="table" tableValues="0 0 0.05 0.2 0.45 0.7 0.9 1"/><feFuncB type="table" tableValues="0.08 0.45 0.55 0.35 0.08 0.05 0.35 0.95"/></feComponentTransfer></filter>
    <filter id="vNight" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".3 .59 .11 0 0  .3 .59 .11 0 0  .3 .59 .11 0 0  0 0 0 1 0"/>
      <feComponentTransfer><feFuncR type="gamma" amplitude=".25" exponent=".7"/><feFuncG type="gamma" amplitude="1.5" exponent=".7"/><feFuncB type="gamma" amplitude=".3" exponent=".7"/></feComponentTransfer></filter></svg>`);

  // Overlay: Scanlinien, Rauschen, Linse, Fadenkreuz, Messwerte
  const ov = document.createElement('div'); ov.id = 'visionOv';
  ov.innerHTML = `<i class="vo-noise"></i><i class="vo-lines"></i><div class="vo-lens"><svg viewBox="-100 -100 200 200"><circle r="98" fill="none" stroke="currentColor" stroke-width=".6"/>
      <circle r="60" fill="none" stroke="currentColor" stroke-width=".3" stroke-dasharray="1 3"/><path d="M-98 0H-14M14 0H98M0-98V-14M0 14V98" stroke="currentColor" stroke-width=".5"/>
      <path d="M-6 0H6M0-6V6" stroke="currentColor" stroke-width=".4"/>${Array.from({ length: 72 }, (_, i) => { const a = i * 5 * Math.PI / 180, r1 = i % 6 ? 94 : 89; return `<line x1="${(Math.cos(a) * r1).toFixed(1)}" y1="${(Math.sin(a) * r1).toFixed(1)}" x2="${(Math.cos(a) * 98).toFixed(1)}" y2="${(Math.sin(a) * 98).toFixed(1)}" stroke="currentColor" stroke-width=".35"/>`; }).join('')}</svg></div>
    <div class="vo-hud"><span id="voMode">—</span><b id="voPos">—</b><em id="voAlt">—</em></div>`;
  document.body.appendChild(ov);

  // Umschalter in der Atlas-Leiste
  function addBtn() {
    const bar = $('#atlasBar'); if (!bar) return setTimeout(addBtn, 400);
    if ($('#visionBtn')) return;
    bar.insertAdjacentHTML('afterbegin', `<button id="visionBtn" aria-label="Sichtmodus"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5"/></svg><b id="visionLbl"></b><span>Sichtmodus</span></button>`);
    $('#visionBtn').onclick = () => { const i = MODES.findIndex(m => m[0] === mode); set(MODES[(i + 1) % MODES.length][0], true); };
    set(mode, false);
  }
  function set(m, announce) {
    mode = m; try { localStorage.setItem('vision-mode', m); } catch (e) {}
    MODES.forEach(([k]) => document.body.classList.toggle('vis-' + k, k === m));
    const n = MODES.find(x => x[0] === m)[1];
    $('#voMode').textContent = n.toUpperCase(); const l = $('#visionLbl'); if (l) l.textContent = m === 'normal' ? '' : n[0];
    $('#visionBtn') && $('#visionBtn').classList.toggle('on', m !== 'normal');
    if (announce && window.SIT && window.SIT.funk) window.SIT.funk('Sichtmodus: ' + n);
    hud();
  }

  // Messwerte im Zielfernrohr
  function hud() {
    const map = window.SIT && window.SIT.getMap && window.SIT.getMap(); if (!map || mode === 'normal') return;
    const c = map.getCenter(), z = map.getZoom();
    const alt = 40075016 * Math.cos(c.lat * Math.PI / 180) / Math.pow(2, z) * innerHeight / 512 / 2 / Math.tan(Math.PI / 12);
    const f = (v, p, n) => Math.abs(v).toFixed(4) + '°' + (v >= 0 ? p : n);
    $('#voPos').textContent = `${f(c.lat, 'N', 'S')}  ${f(c.lng, 'E', 'W')}`;
    $('#voAlt').textContent = `HÖHE ${alt > 10000 ? Math.round(alt / 1000).toLocaleString('de-CH') + ' km' : Math.round(alt).toLocaleString('de-CH') + ' m'} · ZOOM ${z.toFixed(1)} · NEIGUNG ${Math.round(map.getPitch())}°`;
  }

  // Echte 3D-Gebäude
  function buildings(map) {
    if (map.getSource('ofm')) return;
    try {
      map.addSource('ofm', { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: 'Gebäude: © OpenStreetMap, OpenFreeMap' });
      const before = map.getLayer('links') ? 'links' : undefined;
      map.addLayer({ id: 'bld3d', type: 'fill-extrusion', source: 'ofm', 'source-layer': 'building', minzoom: 14, filter: ['!=', ['get', 'hide_3d'], true],
        paint: { 'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6], 0, '#e9e6df', 40, '#f6f4ef', 150, '#ffffff'],
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.2, ['coalesce', ['get', 'render_height'], 6]],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': .82, 'fill-extrusion-vertical-gradient': true } }, before);
    } catch (e) {}
  }
  (function wait() {
    const map = window.SIT && window.SIT.getMap && window.SIT.getMap(); if (!map) return setTimeout(wait, 500);
    buildings(map); map.on('move', hud); addBtn();
  })();
  window.VISION = { set, get mode() { return mode; } };
})();
