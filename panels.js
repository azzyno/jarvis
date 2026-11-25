/* =====================================================================
   JARVIS · BEDIENBARE FENSTER
   Jedes Fenster (Kameras, Flug, Satelliten, Dossier, Suche) bekommt
   einen Griff: nach unten ziehen = verkleinern, weiter ziehen = schliessen,
   antippen = wieder gross. Dazu ein Pfeil zum Ein-/Ausklappen.
   Die rechte Leiste lässt sich mit einem Pfeil an den Rand schieben.
   ===================================================================== */
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const CHEV = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';

  function closeOf(p) { const x = p.querySelector('.sd-x'); x ? x.click() : p.classList.remove('on'); p.classList.remove('min'); }
  function setMin(p, on) { p.classList.toggle('min', on); p.style.transform = ''; document.body.classList.toggle('pan-min', !!$('.sh-pan.on.min')); }

  function enhance(p) {
    if (p.dataset.grip) return; p.dataset.grip = 1;
    p.insertAdjacentHTML('afterbegin', `<div class="pn-grip" role="button" aria-label="Fenster verkleinern oder vergrössern"><i></i></div><button class="pn-min" aria-label="Fenster einklappen">${CHEV}</button>`);
    const grip = p.querySelector('.pn-grip');
    p.querySelector('.pn-min').onclick = e => { e.stopPropagation(); setMin(p, !p.classList.contains('min')); };
    let y0 = null, dy = 0, t0 = 0;
    const start = e => { if (innerWidth >= 900) return; y0 = (e.touches ? e.touches[0] : e).clientY; dy = 0; t0 = Date.now(); p.style.transition = 'none'; };
    const move = e => { if (y0 == null) return; dy = (e.touches ? e.touches[0] : e).clientY - y0; if (p.classList.contains('min') && dy > 0) dy *= .3; p.style.transform = `translateY(${Math.max(-40, dy)}px)`; if (e.cancelable) e.preventDefault(); };
    const end = () => { if (y0 == null) return; y0 = null; p.style.transition = ''; p.style.transform = '';
      const fast = Date.now() - t0 < 250;
      if (Math.abs(dy) < 6) return setMin(p, !p.classList.contains('min'));      // antippen
      if (p.classList.contains('min')) { if (dy < -30) setMin(p, false); else if (dy > 60) closeOf(p); return; }
      if (dy > 220 || (fast && dy > 120)) closeOf(p); else if (dy > 70) setMin(p, true); };
    // auch den Kopf des Fensters (Titel) zum Ziehen nutzen
    [grip, p.querySelector('.sd-k'), p.querySelector('h2')].forEach(el => { if (!el) return;
      el.addEventListener('touchstart', start, { passive: true }); el.addEventListener('touchmove', move, { passive: false }); el.addEventListener('touchend', end);
      el.addEventListener('mousedown', start); });
    addEventListener('mousemove', move); addEventListener('mouseup', end);
    // beim Schliessen den Zustand zurücksetzen
    new MutationObserver(() => { if (!p.classList.contains('on') && p.classList.contains('min')) setMin(p, false); document.body.classList.toggle('pan-min', !!$('.sh-pan.on.min')); })
      .observe(p, { attributes: true, attributeFilter: ['class'] });
  }

  // Rechte Leiste einklappbar
  function barToggle() {
    const bar = $('#atlasBar'); if (!bar) return setTimeout(barToggle, 400);
    if ($('#barTog')) return;
    document.body.insertAdjacentHTML('beforeend', `<button id="barTog" aria-label="Leiste ein- oder ausblenden"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>`);
    let hid = false; try { hid = localStorage.getItem('bar-hidden') === '1'; } catch (e) {}
    const set = h => { hid = h; document.body.classList.toggle('bar-hid', h); try { localStorage.setItem('bar-hidden', h ? '1' : '0'); } catch (e) {} };
    set(hid); $('#barTog').onclick = () => { if (document.body.classList.contains('pan') && innerWidth < 900) { document.body.classList.toggle('bar-force'); return; } set(!hid); };
    // nach rechts wischen auf der Leiste = wegschieben
    let x0 = null; bar.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    bar.addEventListener('touchend', e => { if (x0 != null && e.changedTouches[0].clientX - x0 > 40) set(true); x0 = null; });
  }

  (function wait() { const ps = $$('.sh-pan'); if (!ps.length) return setTimeout(wait, 300); ps.forEach(enhance); barToggle(); })();
})();
