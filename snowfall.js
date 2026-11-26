/* JARVIS · Schneefall – sanft, sparsam (30 fps, pausiert im Hintergrund) */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.id = 'snowFx'; document.body.appendChild(c);
  const g = c.getContext('2d'); let W, H, d = Math.min(2, devicePixelRatio || 1);
  const N = innerWidth < 900 ? 46 : 90, F = [];
  const size = () => { W = innerWidth; H = innerHeight; c.width = W * d; c.height = H * d; };
  size(); addEventListener('resize', size);
  for (let i = 0; i < N; i++) F.push({ x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 2.2, s: .25 + Math.random() * .7, w: Math.random() * 6.28, o: .35 + Math.random() * .55 });
  let last = 0;
  (function f(t) {
    requestAnimationFrame(f);
    if (document.hidden || t - last < 33) return; last = t;
    const on = document.body.classList.contains('v-cockpit') && !document.body.className.match(/vis-(thermal|night|scope)/);
    g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H); if (!on) return;
    for (const p of F) {
      p.y += p.s; p.w += .012; p.x += Math.sin(p.w) * .35;
      if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; }
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fillStyle = `rgba(255,255,255,${p.o})`; g.shadowColor = 'rgba(160,175,205,.6)'; g.shadowBlur = 3; g.fill();
    }
  })(0);
})();
