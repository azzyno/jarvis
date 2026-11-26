/* JARVIS · Stimme (gratis, über Google Gemini)
   Mikrofon antippen → sprechen → nach kurzer Pause hört er auf → Antwort mit Stimme.
   Genau der Ablauf, der im Selbsttest auf dem iPhone funktioniert hat. */
(() => {
  const API = 'https://jarvis-iota-weld.vercel.app/api/';
  const $ = s => document.querySelector(s);
  const B = document.body;
  let state = 'idle', hist = [], level = 0, turn = 0;
  const set = (s, label) => { state = s; B.dataset.v = s; $('#capS').textContent = label || ({ idle: 'Bereit', listening: 'JARVIS hört zu', thinking: 'JARVIS denkt', speaking: 'JARVIS spricht' })[s]; };
  const say = t => { $('#capT').textContent = t; };
  set('idle', 'Tippen Sie aufs Mikrofon');

  /* ---------- Ton ausgeben: ein einziges <audio>, beim ersten Tippen freigeschaltet ---------- */
  const player = new Audio(); player.playsInline = true; player.setAttribute('playsinline', '');
  const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
  let unlocked = false;
  const unlock = () => { if (unlocked) return; unlocked = true; try { player.src = SILENT; player.play().catch(() => {}); } catch (e) {} };
  let stopPlay = null;
  function play(blob) {
    return new Promise(res => {
      const url = URL.createObjectURL(blob); let done = false, iv;
      const fin = () => { if (done) return; done = true; clearInterval(iv); clearTimeout(g); level = 0; stopPlay = null; URL.revokeObjectURL(url); res(); };
      let g = setTimeout(fin, 40000);
      player.onended = fin; player.onerror = fin;
      player.onloadedmetadata = () => { if (isFinite(player.duration)) { clearTimeout(g); g = setTimeout(fin, player.duration * 1000 + 2000); } };
      iv = setInterval(() => { level = .25 + Math.random() * .5; }, 90);
      stopPlay = () => { try { player.pause(); } catch (e) {} fin(); };
      player.src = url;
      player.play().catch(() => { window.APP && APP.toast('Ton blockiert – bitte einmal aufs Mikrofon tippen.'); fin(); });
    });
  }
  async function speak(text, id) {
    say(text);
    try {
      const r = await fetch(API + 'tts', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ text: text.slice(0, 900) }) });
      if (!r.ok) throw new Error('Stimme ' + r.status);
      const b = await r.blob(); if (id !== turn) return;
      set('speaking'); await play(new Blob([b], { type: 'audio/wav' }));
    } catch (e) { window.APP && APP.toast('Stimme gerade ausgelastet – Antwort steht unten.'); }
    if (id === turn) set('idle', 'Tippen zum Sprechen');
  }

  /* ---------- Gehirn ---------- */
  const clean = t => String(t || '').replace(/[*_#`>]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  async function think(text) {
    const id = ++turn; set('thinking'); if (!/^\[/.test(text)) say('„' + text + '“');
    hist.push({ role: 'user', content: text });
    try {
      for (let round = 0; round < 5; round++) {
        const r = await fetch(API + 'chat', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ messages: hist.slice(-20) }) });
        const d = await r.json(); if (!r.ok || !d.message) throw new Error(d.error || 'keine Antwort');
        if (id !== turn) return;
        const m = d.message; hist.push(m);
        if (m.tool_calls && m.tool_calls.length) {
          for (const tc of m.tool_calls) {
            let a = {}; try { a = JSON.parse(tc.function.arguments || '{}'); } catch (e) {}
            const f = window.APP && APP.tools[tc.function.name];
            let out; try { out = f ? await f(a) : 'Werkzeug nicht verfügbar.'; } catch (e) { out = 'Fehler: ' + e.message; }
            hist.push({ role: 'tool', tool_call_id: tc.id, content: String(out).slice(0, 6000) });
          }
          continue;
        }
        return speak(clean(m.content) || 'Erledigt, Master.', id);
      }
      return speak('Das war mir zu verschachtelt, Master. Bitte kürzer.', id);
    } catch (e) {
      hist.pop(); if (id === turn) { say('Mein Gehirn ist kurz nicht erreichbar, Master. Bitte nochmals.'); set('idle', 'Fehler – nochmals tippen'); }
    } finally { if (hist.length > 40) hist = hist.slice(-30); }
  }

  /* ---------- Ohr: Mikrofon nur solange Sie sprechen ---------- */
  let ctx = null, stream = null, rec = null, vadT = null;
  function wav16(ab) {
    const src = ab.getChannelData(0), ratio = ab.sampleRate / 16000, len = Math.floor(src.length / ratio), pcm = new Int16Array(len);
    for (let i = 0; i < len; i++) { const a = Math.floor(i * ratio), b = Math.min(src.length, Math.floor((i + 1) * ratio)); let v = 0; for (let j = a; j < b; j++) v += src[j]; v /= Math.max(1, b - a); pcm[i] = Math.max(-1, Math.min(1, v)) * 32767; }
    const buf = new ArrayBuffer(44 + len * 2), dv = new DataView(buf), w = (p, t) => { for (let i = 0; i < t.length; i++) dv.setUint8(p + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 16000, true); dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, len * 2, true);
    new Int16Array(buf, 44).set(pcm); const by = new Uint8Array(buf); let bin = ''; for (let i = 0; i < by.length; i += 32768) bin += String.fromCharCode.apply(null, by.subarray(i, i + 32768)); return btoa(bin);
  }
  async function listen() {
    if (!navigator.mediaDevices || !window.MediaRecorder) { say('Dieses Gerät kann hier nicht aufnehmen – bitte schreiben.'); return; }
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume().catch(() => {});
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) { say('Mikrofon blockiert: Einstellungen → Apps → Safari → Mikrofon „Erlauben“.'); set('idle', 'Mikrofon gesperrt'); return; }
    const an = ctx.createAnalyser(); an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
    const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(m => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';
    const chunks = []; rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
    let spoke = 0, silent = 0, total = 0, floor = .01; const d = new Float32Array(1024);
    rec.onstop = async () => {
      clearInterval(vadT); level = 0; try { stream.getTracks().forEach(t => t.stop()); } catch (e) {} stream = null;
      if (state !== 'listening') return;
      if (spoke < .25) { set('idle', 'Nichts gehört'); say('Ich habe nichts gehört, Master. Tippen Sie und sprechen Sie.'); return; }
      set('thinking', 'Verstehe …');
      try {
        const blob = new Blob(chunks, { type: rec.mimeType || mime }); let audio, m = 'audio/wav';
        try { audio = wav16(await ctx.decodeAudioData(await blob.arrayBuffer())); }
        catch (e) { m = blob.type; audio = await new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); }); }
        const r = await fetch(API + 'tts', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ audio, mime: m }) });
        const j = await r.json().catch(() => ({}));
        if (j.text) think(j.text); else { set('idle', 'Nicht verstanden'); say('Ich habe Sie nicht verstanden, Master. Bitte nochmals.'); }
      } catch (e) { set('idle', 'Verbindung gestört'); say('Verbindung gestört, Master. Bitte nochmals tippen.'); }
    };
    rec.start(); set('listening'); say('Ich höre, Master …');
    vadT = setInterval(() => {
      an.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; const rms = Math.sqrt(s / d.length);
      level = Math.min(1, rms * 9); total += .1;
      if (!spoke) floor = Math.min(.03, floor * .9 + rms * .1);
      if (rms > Math.max(.006, floor * 2.2)) { spoke += .1; silent = 0; } else if (spoke) silent += .1;
      if ((spoke > .25 && silent > 1.1) || total > 15 || (!spoke && total > 7)) { clearInterval(vadT); try { rec.stop(); } catch (e) {} }
    }, 100);
  }
  function stopAll() { turn++; if (stopPlay) stopPlay(); if (rec && rec.state !== 'inactive') { state = 'idle'; try { rec.stop(); } catch (e) {} } set('idle', 'Tippen zum Sprechen'); }

  $('#mic').addEventListener('click', () => {
    unlock(); window.APP && APP.open();
    if (state === 'listening') { clearInterval(vadT); try { rec.stop(); } catch (e) {} return; }   // fertig gesprochen
    if (state === 'speaking' || state === 'thinking') { stopAll(); return; }
    listen();
  });
  $('#ask').addEventListener('submit', e => { e.preventDefault(); const q = $('#q'); const t = q.value.trim(); if (!t) return; unlock(); q.value = ''; q.blur(); if (state === 'speaking') stopAll(); think(t); });

  /* ---------- Welle um das Mikrofon ---------- */
  const cv = $('#wave'), g = cv.getContext('2d'); let ph = 0, sm = 0;
  (function draw() {
    sm += (level - sm) * .2; ph += .06; g.clearRect(0, 0, 120, 120);
    if (state !== 'idle') {
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        for (let a = 0; a <= Math.PI * 2 + .01; a += .08) { const r = 34 + 4 * k + sm * 12 * Math.sin(a * (3 + k) + ph * (1 + k * .3)) + (state === 'thinking' ? 2 * Math.sin(ph * 2 + a * 6) : 0); const x = 60 + r * Math.cos(a), y = 60 + r * Math.sin(a); a ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokeStyle = `rgba(168,134,74,${.5 - k * .14})`; g.lineWidth = 1.2; g.stroke();
      }
    }
    requestAnimationFrame(draw);
  })();
})();
