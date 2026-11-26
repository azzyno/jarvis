/* =====================================================================
   JARVIS · FREIE STIMME  (kostenlos, ohne ElevenLabs)
   Ohr:    Spracherkennung des Browsers (Deutsch/Schweiz)
   Gehirn: /api/chat  → Groq (gratis) oder Pollinations (gratis)
   Stimme: „Thorsten“ – neuronale Piper-Stimme, läuft direkt auf dem Gerät
           (einmalig ~60 MB, danach gespeichert). Bis sie geladen ist,
           spricht die beste Systemstimme des Geräts.
   ===================================================================== */
const J = window.J;
const API = 'https://jarvis-iota-weld.vercel.app/api/chat';
const PIPER = 'https://esm.sh/@mintplex-labs/piper-tts-web@1.0.4';
const VOICE_ID = 'de_DE-thorsten-medium';
const EL = window.JARVIS;                         // ElevenLabs-Variante (bleibt wählbar)
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
let engine = LS('voice-engine') || 'free';         // 'free' | 'el'
let piperOff = LS('piper-off') === '1';

/* ---------- Zustand ---------- */
let micErr = '', state = 'off', muted = false, hist = [], greeted = false, lastAct = 0, busyTurn = false;
const setState = s => { state = s; lastAct = Date.now(); };
const sayLine = t => { const g = document.getElementById('greet'); if (g) g.textContent = t; const s = document.getElementById('shSay'); if (s) s.textContent = t; };

/* ---------- Audio ---------- */
let ac = null, an = null, buf = null, cur = null;
function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); an = ac.createAnalyser(); an.fftSize = 512; an.connect(ac.destination); buf = new Uint8Array(an.fftSize); }
  if (ac.state !== 'running') ac.resume().catch(() => {});   // iPhone: auch Zustand „interrupted“
  return ac;
}
let fakeLvl = 0;
function level() {
  if (state !== 'speaking' && state !== 'listening') return 0;
  if (state === 'listening') return Math.min(.6, .04 + micRms * 6);
  if (cur && an) { an.getByteTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v; } return Math.min(1, Math.sqrt(s / buf.length) * 3); }
  return fakeLvl;
}

/* ---------- Stimme: Piper (Thorsten) ---------- */
let piper = null, piperLoading = null, piperSlow = LS('piper-slow') === '1';
function loadPiper() {
  if (piperOff || piperSlow) return Promise.resolve(null);
  if (piper) return Promise.resolve(piper);
  if (piperLoading) return piperLoading;
  piperLoading = (async () => {
    try {
      const tts = await import(PIPER);
      const have = await tts.stored().catch(() => []);
      if (!have.includes(VOICE_ID)) {
        J.toast && J.toast('Lade JARVIS-Stimme (einmalig ca. 60 MB) …');
        let last = 0;
        await tts.download(VOICE_ID, p => { const pc = p.total ? Math.round(p.loaded * 100 / p.total) : 0; if (pc - last >= 25) { last = pc; J.toast && J.toast('JARVIS-Stimme ' + pc + ' %'); } });
      }
      piper = tts; J.toast && J.toast('JARVIS-Stimme bereit.'); return tts;
    } catch (e) { console.warn('piper', e); piperLoading = null; return null; }
  })();
  return piperLoading;
}
async function synth(text) {                       // → AudioBuffer oder null
  const tts = piper; if (!tts) return null;
  const t0 = performance.now();
  try {
    const wav = await tts.predict({ text, voiceId: VOICE_ID });
    const ab = await audio().decodeAudioData(await wav.arrayBuffer());
    const took = (performance.now() - t0) / 1000;
    if (took > ab.duration * 1.6 && took > 3) { piperSlow = true; LS('piper-slow', '1'); }   // Gerät zu langsam → Systemstimme
    return ab;
  } catch (e) { console.warn('synth', e); return null; }
}
/* iPhone: Ausgabe über ein einmal freigeschaltetes <audio>-Element (robuster als WebAudio,
   solange das Mikrofon offen ist) */
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
let player = null;
function getPlayer() { if (!player) { player = new Audio(); player.playsInline = true; player.setAttribute('playsinline', ''); player.preload = 'auto'; } return player; }
function playBlob(blob) {
  return new Promise(res => {
    const a = getPlayer(), url = URL.createObjectURL(blob); let done = false;
    const fin = () => { if (done) return; done = true; clearInterval(iv); clearTimeout(guard); fakeLvl = 0; cur = null; URL.revokeObjectURL(url); res(true); };
    const iv = setInterval(() => { fakeLvl = .25 + Math.random() * .45; }, 90);
    let guard = setTimeout(fin, 30000);
    cur = { stop() { try { a.pause(); } catch (e) {} fin(); } };
    a.onended = fin; a.onerror = fin;
    a.onloadedmetadata = () => { if (isFinite(a.duration)) { clearTimeout(guard); guard = setTimeout(fin, a.duration * 1000 + 2500); } };
    a.src = url;
    diag('Ton läuft'); const p = a.play(); if (p && p.catch) p.catch(e => { diag('Ton blockiert: ' + (e && e.name)); console.warn('play', e); J.toast && J.toast('Ton blockiert – bitte einmal aufs Mikrofon tippen.'); fin(); });
  });
}
function playBuf(ab) {
  if (ab instanceof Blob) return playBlob(ab);
  return new Promise(res => { const src = audio().createBufferSource(); src.buffer = ab; src.playbackRate.value = 1; src.connect(an); cur = src;
    const guard = setTimeout(() => { try { src.stop(); } catch (e) {} cur = null; res(); }, ab.duration * 1000 + 2500);   // nie hängen bleiben
    src.onended = () => { clearTimeout(guard); cur = null; res(); }; src.start(); });
}

/* ---------- Stimme: Google Gemini (Charon, gratis) ---------- */
const TTS = 'https://jarvis-iota-weld.vercel.app/api/tts';
let gemFail = 0;
async function gemSynth(text) {
  if (gemFail >= 3) return null;
  try {
    const r = await fetch(TTS, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ text, voice: LS('jarvis-voice') || 'Charon' }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const blob = await r.blob(); if (blob.size < 1000) throw new Error('leer');
    gemFail = 0; return new Blob([blob], { type: 'audio/wav' });
  } catch (e) { console.warn('gemini-tts', e); diag('Stimme-Fehler ' + e.message); gemFail++; if (gemFail === 1) J.toast && J.toast('Google-Stimme kurz ausgelastet – Ersatzstimme.'); setTimeout(() => { gemFail = 0; }, 60000); return null; }
}

/* ---------- Stimme: beste Systemstimme ---------- */
function bestVoice() {
  const vs = speechSynthesis.getVoices().filter(v => /^de/i.test(v.lang)); if (!vs.length) return null;
  const score = v => (/natural|online|neural|premium|enhanced|erweitert/i.test(v.name) ? 50 : 0) + (/de-CH/i.test(v.lang) ? 8 : 0) + (/conrad|jan|florian|killian|markus|yannick|martin|helena|anna|google/i.test(v.name) ? 10 : 0) + (v.localService ? 0 : 3);
  return vs.sort((a, b) => score(b) - score(a))[0];
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};
function sysSay(text) {
  return new Promise(res => {
    if (!window.speechSynthesis) return res();
    const u = new SpeechSynthesisUtterance(text); const v = bestVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'de-DE';
    u.rate = 1.03; u.pitch = .92;
    let iv = setInterval(() => { fakeLvl = .2 + Math.random() * .5; }, 90);
    let ok = false; const fin = () => { if (ok) return; ok = true; clearInterval(iv); clearTimeout(g); fakeLvl = 0; res(); };
    const g = setTimeout(fin, 2500 + text.length * 90);
    u.onend = u.onerror = fin;
    speechSynthesis.speak(u);
  });
}

/* ---------- Sprechen (Satz für Satz, nächster wird vorbereitet) ---------- */
let speakId = 0;
function clean(t) { return String(t || '').replace(/[*_#`>]/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim(); }
function sentences(t) { return (t.match(/[^.!?…]+[.!?…]+["“”»]?|[^.!?…]+$/g) || [t]).map(s => s.trim()).filter(Boolean); }
async function speak(text) {
  text = clean(text); if (!text) return;
  const id = ++speakId; stopRec(); setState('speaking'); sayLine(text);
  if (earOn) earOff();
  diag('spricht');
  const parts = sentences(text);
  // Gemini: erster Satz sofort, Rest parallel vorbereiten
  if (gemFail < 3) {
    const chunks = parts.length > 1 && text.length > 240 ? [parts[0], parts.slice(1).join(' ')] : [text];
    const jobs = chunks.map(gemSynth);
    let ok = true;
    for (let i = 0; i < chunks.length; i++) {
      const ab = await jobs[i]; if (id !== speakId) return;
      if (ab) await playBuf(ab); else { ok = false; for (const p of (i === 0 ? parts : sentences(chunks[i]))) { if (id !== speakId) return; await sysSay(p); } break; }
    }
    if (id !== speakId) return;
    return afterSpeak(ok);
  }
  if (gemFail >= 3) loadPiper();
  let next = piper ? synth(parts[0]) : null;
  for (let i = 0; i < parts.length; i++) {
    if (id !== speakId) return;
    const ab = next ? await next : null;
    next = piper && !piperSlow && i + 1 < parts.length ? synth(parts[i + 1]) : null;
    if (id !== speakId) return;
    if (ab) await playBuf(ab); else await sysSay(parts[i]);
  }
  if (id !== speakId) return;
  afterSpeak(true);
}
let reopen = false;
function afterSpeak() { lastAct = Date.now(); if (state !== 'off') state = 'off'; diag('bereit – tippen zum Sprechen'); }
function diag(t) { try { let d = document.getElementById('jvDiag'); if (!d) { d = document.createElement('div'); d.id = 'jvDiag'; d.style.cssText = 'position:fixed;left:8px;bottom:4px;font:10px/1.2 Inter,system-ui;color:#8a93a6;z-index:99999;pointer-events:none;opacity:.8'; document.body.appendChild(d); } d.textContent = 'JARVIS · ' + t + ' · ' + new Date().toLocaleTimeString('de-CH'); } catch (e) {} }
function hush() { speakId++; try { cur && cur.stop(); } catch (e) {} cur = null; try { speechSynthesis.cancel(); } catch (e) {} }

/* ---------- Ohr: Funkgerät-Prinzip (stabil auf dem iPhone) ----------
   Antippen → Mikrofon an → Sie sprechen → nach kurzer Pause geht es von selbst aus.
   Das Mikrofon ist NUR offen, während Sie sprechen. Dadurch bleibt der Lautsprecher frei,
   es gibt kein Echo und keine Störgeräusche. Erkennung gratis über Google Gemini. */
const STT = 'https://jarvis-iota-weld.vercel.app/api/tts';
const recOK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let micCtx = null, micStream = null, mrec = null, anal = null, vadT = null, earOn = false, micRms = 0, sttBusy = false, lastUser = 0, deafUntil = 0;
let earStarting = null;
function pickMime() { for (const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac']) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {} } return ''; }

function earStart() {                                       // muss direkt aus dem Antippen kommen
  if (earOn) return Promise.resolve(true);
  if (!recOK) { J.toast && J.toast('Dieses Gerät kann hier nicht aufnehmen – bitte unten schreiben.'); return Promise.resolve(false); }
  if (!micCtx) micCtx = new (window.AudioContext || window.webkitAudioContext)();
  micCtx.resume().catch(() => {});
  earOn = true;
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(st => {
    micStream = st;
    const src = micCtx.createMediaStreamSource(st); anal = micCtx.createAnalyser(); anal.fftSize = 1024; src.connect(anal);
    const mime = pickMime(); const chunks = [];
    mrec = new MediaRecorder(st, mime ? { mimeType: mime } : undefined);
    mrec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    let spoke = 0, silent = 0, total = 0, floor = 0.01;
    mrec.onstop = () => { const blob = new Blob(chunks, { type: mrec.mimeType || mime || 'audio/mp4' }); closeMic(); if (spoke >= 0.25) transcribe(blob); else { setState('idle'); state = 'off'; sayLine('Ich habe nichts gehört, Master. Tippen Sie und sprechen Sie.'); diag('nichts gehört'); } };
    mrec.start();
    setState('listening'); sayLine('Ich höre, Master …'); diag('Mikro an – sprechen Sie');
    const data = new Float32Array(anal.fftSize);
    vadT = setInterval(() => {
      if (!anal) return;
      anal.getFloatTimeDomainData(data); let s = 0; for (let i = 0; i < data.length; i++) s += data[i] * data[i];
      const rms = Math.sqrt(s / data.length); micRms = rms; total += 0.1;
      if (!spoke) floor = Math.min(0.03, floor * 0.9 + rms * 0.1);
      const thr = Math.max(0.006, floor * 2.2);
      if (rms > thr) { spoke += 0.1; silent = 0; } else if (spoke) silent += 0.1;
      diag('Mikro an · Pegel ' + Math.round(rms * 1000));
      if ((spoke > 0.25 && silent > 1.0) || total > 15 || (!spoke && total > 7)) stopMic();
    }, 100);
    return true;
  }).catch(err => {
    earOn = false; closeMic();
    const msg = 'Mikrofon blockiert: Einstellungen → Apps → Safari → Mikrofon „Erlauben“. Oder unten schreiben.';
    J.toast && J.toast(msg); sayLine(msg); diag('Mikro-Fehler ' + (err && err.name)); state = 'off'; return false;
  });
}
function stopMic() { clearInterval(vadT); vadT = null; try { if (mrec && mrec.state !== 'inactive') mrec.stop(); else closeMic(); } catch (e) { closeMic(); } }
function closeMic() { clearInterval(vadT); vadT = null; earOn = false; micRms = 0; try { micStream && micStream.getTracks().forEach(t => t.stop()); } catch (e) {} micStream = null; anal = null; mrec = null; }
function earOff() { if (mrec && mrec.state !== 'inactive') { mrec.onstop = () => closeMic(); try { mrec.stop(); } catch (e) { closeMic(); } } else closeMic(); }

async function transcribe(blob) {
  sttBusy = true; setState('busy'); showHeard('…'); diag('verstehe …');
  try {
    let b64 = '', mime = 'audio/wav';
    try { const ab = await micCtx.decodeAudioData(await blob.arrayBuffer()); b64 = wav16k(ab); }      // in WAV umwandeln (sicherster Weg)
    catch (e) { mime = blob.type; b64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(blob); }); }
    const r = await fetch(STT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ audio: b64, mime }) });
    const d = await r.json().catch(() => ({}));
    sttBusy = false;
    const t = (d.text || '').trim();
    if (t) { lastUser = Date.now(); showHeard(t); diag('verstanden'); state = 'idle'; think(t); }
    else { state = 'off'; sayLine(d.error ? 'Ich konnte Sie gerade nicht verstehen, Master. Bitte nochmals tippen.' : 'Ich habe nichts verstanden, Master. Tippen Sie und sprechen Sie nochmals.'); diag(d.error ? 'Erkennung-Fehler ' + r.status : 'nichts verstanden'); }
  } catch (e) { sttBusy = false; state = 'off'; diag('Netz-Fehler'); sayLine('Verbindung gestört, Master. Bitte nochmals tippen.'); }
}

function wav16k(ab) {
  const src = ab.getChannelData(0), sr = ab.sampleRate, ratio = sr / 16000, len = Math.floor(src.length / ratio), pcm = new Int16Array(len);
  for (let i = 0; i < len; i++) { const a = Math.floor(i * ratio), b = Math.min(src.length, Math.floor((i + 1) * ratio)); let v = 0; for (let j = a; j < b; j++) v += src[j]; v /= Math.max(1, b - a); pcm[i] = Math.max(-1, Math.min(1, v)) * 0x7fff; }
  const buf = new ArrayBuffer(44 + len * 2), dv = new DataView(buf), w = (p, t) => { for (let i = 0; i < t.length; i++) dv.setUint8(p + i, t.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + len * 2, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 16000, true); dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, len * 2, true);
  new Int16Array(buf, 44).set(pcm);
  const by = new Uint8Array(buf); let bin = ''; for (let i = 0; i < by.length; i += 0x8000) bin += String.fromCharCode.apply(null, by.subarray(i, i + 0x8000));
  return btoa(bin);
}
function showHeard(t) { const s = document.getElementById('shSay'); if (s) s.textContent = t === '…' ? t : '„' + t + '“'; }
function listen() {}
function stopRec() {}

/* ---------- Gehirn ---------- */
const extraTools = {
  async jarvis_flights({ ort } = {}) {
    J.go('cockpit'); let lat = null, lon = null;
    if (ort) { try { const w = await (await fetch('https://jarvis-iota-weld.vercel.app/api/weather?q=' + encodeURIComponent(ort))).json(); if (w.ort) { lat = w.ort.lat; lon = w.ort.lon; } } catch (e) {} }
    return JSON.stringify(window.ATLAS ? await window.ATLAS.flights(lat, lon) : { fehler: 'Atlas nicht geladen' }).slice(0, 4000);
  },
  async jarvis_vision({ modus }) { J.go('cockpit'); window.VISION && window.VISION.set(modus, true); return 'Sichtmodus ' + modus + ' aktiv.'; },
};
async function runTool(name, args) {
  const f = extraTools[name] || (window.__jarvisTools || {})[name];
  if (!f) return 'Werkzeug ' + name + ' nicht verfügbar.';
  try { const r = await f(args || {}); return typeof r === 'string' ? r : JSON.stringify(r); } catch (e) { return 'Fehler: ' + e.message; }
}
async function think(text) {
  if (busyTurn) return; busyTurn = true; stopRec(); speakId++; try { cur && cur.stop(); } catch (e) {} cur = null; setState('busy');
  hist.push({ role: 'user', content: text });
  if (!/^\[/.test(text)) sayLine('Einen Moment, Master …');
  try {
    for (let round = 0; round < 5; round++) {
      const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ messages: hist.slice(-24) }) });
      const d = await r.json(); if (!r.ok || !d.message) throw new Error(d.error || 'keine Antwort');
      const m = d.message; hist.push(m);
      if (m.tool_calls && m.tool_calls.length) {
        for (const tc of m.tool_calls) { let a = {}; try { a = JSON.parse(tc.function.arguments || '{}'); } catch (e) {}
          hist.push({ role: 'tool', tool_call_id: tc.id, content: (await runTool(tc.function.name, a)).slice(0, 6000) }); }
        continue;
      }
      busyTurn = false; await speak(m.content || 'Erledigt, Master.'); return;
    }
    busyTurn = false; await speak('Das war mir zu verschachtelt, Master. Fragen Sie mich bitte noch einmal kürzer.');
  } catch (e) { console.warn(e); J.toast && J.toast('Gehirn: ' + String(e.message || e).slice(0, 80)); busyTurn = false; hist.pop(); await speak('Mein Gehirn ist gerade nicht erreichbar, Master. Versuchen Sie es gleich nochmals.'); }
  if (hist.length > 40) hist = hist.slice(-30);
}

/* ---------- Steuerung ---------- */
/* iPhone: Ton und Sprachausgabe müssen direkt beim Antippen freigeschaltet werden */
let unlocked = false;
function unlock(sayHi) {
  try { const a = getPlayer(); a.src = SILENT; const p = a.play(); p && p.catch && p.catch(() => {}); } catch (e) {}
  try { const c = audio(); const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}
  if (!sayHi) try { if (window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(' '); u.lang = 'de-DE'; const v = bestVoice(); if (v) { u.voice = v; u.lang = v.lang; } u.volume = 0; u.rate = 1.03; u.pitch = .92; speechSynthesis.speak(u); } } catch (e) {}
  unlocked = true;
}
async function start() {
  if (earOn) { stopMic(); return; }                         // nochmals tippen = fertig gesprochen
  hush(); unlock(false); muted = false;
  if (!greeted) greeted = true;
  await earStart();
}
function end() { if (earOn) { stopMic(); return; } hush(); busyTurn = false; state = 'off'; }

const FREE = {
  async say(context) { if (state !== 'listening' || busyTurn) return false; think('[APP-KLICK] ' + context); return true; },
  start, end, mute() { muted = !muted; setState(muted ? 'idle' : 'listening'); },
  send(t) { if (!unlocked) unlock(false); if (state === 'off') { state = 'idle'; greeted = true; } think(t); },
  get state() { return state === 'idle' ? (muted ? 'muted' : 'listening') : state === 'pause' ? 'speaking' : state; },
  level,
};
window.JARVIS = new Proxy({}, { get: (_, k) => (engine === 'el' && EL ? EL : FREE)[k] });
window.JARVIS_VOICE = {
  get engine() { return engine; },
  set(e) { if (state !== 'off') end(); try { EL && EL.end(); } catch (x) {} engine = e; LS('voice-engine', e); },
  piper(on) { piperOff = !on; LS('piper-off', on ? '0' : '1'); if (on) { piperSlow = false; LS('piper-slow', '0'); loadPiper(); } },
  get piperReady() { return !!piper; },
};

/* ---------- Auswahl im Menü ---------- */
(function ui() {
  const mf = document.querySelector('#osMenu .mf'); if (!mf) return setTimeout(ui, 400);
  const b = document.createElement('button'); b.id = 'voiceSel'; mf.prepend(b);
  const lbl = () => { b.textContent = engine === 'el' ? 'Stimme: ElevenLabs' : 'Stimme: JARVIS · gratis'; };
  lbl(); b.onclick = e => { e.stopPropagation(); window.JARVIS_VOICE.set(engine === 'el' ? 'free' : 'el'); lbl(); J.toast && J.toast(engine === 'el' ? 'ElevenLabs-Stimme aktiv (braucht Guthaben).' : 'Gratis-Stimme aktiv.'); };
})();
