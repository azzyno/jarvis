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
  if (ac.state === 'suspended') ac.resume();
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
function playBuf(ab) {
  return new Promise(res => { const src = audio().createBufferSource(); src.buffer = ab; src.playbackRate.value = 1; src.connect(an); cur = src;
    src.onended = () => { cur = null; res(); }; src.start(); });
}

/* ---------- Stimme: Google Gemini (Charon, gratis) ---------- */
const TTS = 'https://jarvis-iota-weld.vercel.app/api/tts';
let gemFail = 0;
async function gemSynth(text) {
  if (gemFail >= 3) return null;
  try {
    const r = await fetch(TTS, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ text, voice: LS('jarvis-voice') || 'Charon' }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const ab = await audio().decodeAudioData(await r.arrayBuffer());
    gemFail = 0; return ab;
  } catch (e) { console.warn('gemini-tts', e); gemFail++; if (gemFail === 1) J.toast && J.toast('Google-Stimme kurz ausgelastet – Ersatzstimme.'); setTimeout(() => { gemFail = 0; }, 60000); return null; }
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
    u.onend = u.onerror = () => { clearInterval(iv); fakeLvl = 0; res(); };
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
function afterSpeak() {
  lastAct = Date.now(); deafUntil = Date.now() + 600;
  if (state !== 'off') setState(earOn && !muted ? 'listening' : 'idle');
}
function hush() { speakId++; try { cur && cur.stop(); } catch (e) {} cur = null; try { speechSynthesis.cancel(); } catch (e) {} }

/* ---------- Ohr: eigenes Mikrofon (kein iPhone-Diktat, keine Pieptöne) ----------
   Ein einziger Mikrofon-Strom bleibt offen. JARVIS erkennt selbst, wann Sie sprechen
   und wann Ihr Satz fertig ist, und lässt ihn von Google (gratis) in Text umwandeln. */
const STT = 'https://jarvis-iota-weld.vercel.app/api/stt';
const recOK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let micStream = null, micSrc = null, proc = null, earOn = false, earStarting = null;
let deafUntil = 0, lastUser = 0, micRms = 0, sttBusy = false;
const vad = { on: false, floor: 0.008, chunks: [], pre: [], silence: 0, dur: 0, loud: 0 };
const gated = () => muted || state === 'speaking' || state === 'busy' || state === 'off' || sttBusy || Date.now() < deafUntil;

function earStart() {
  if (earOn) return Promise.resolve(true);
  if (earStarting) return earStarting;
  if (!recOK) return Promise.resolve(false);
  const c = audio();
  earStarting = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })
    .then(st => {
      micStream = st; if (c.state === 'suspended') c.resume();
      micSrc = c.createMediaStreamSource(st);
      proc = c.createScriptProcessor(4096, 1, 1);
      proc.onaudioprocess = e => { e.outputBuffer.getChannelData(0).fill(0); hear(e.inputBuffer.getChannelData(0), c.sampleRate); };
      micSrc.connect(proc); proc.connect(c.destination);
      st.getAudioTracks()[0].onended = () => { earOff(); if (state === 'listening') state = 'off'; };
      earOn = true; earStarting = null; return true;
    })
    .catch(err => {
      earStarting = null; earOn = false;
      const msg = 'Mikrofon blockiert: Einstellungen → Apps → Safari → Mikrofon „Erlauben“. Danach Seite neu laden. Oder unten schreiben.';
      J.toast && J.toast(msg); sayLine(msg); console.warn('mic', err); return false;
    });
  return earStarting;
}
function earOff() {
  earOn = false; vad.on = false; vad.chunks = []; vad.pre = [];
  try { proc && proc.disconnect(); micSrc && micSrc.disconnect(); } catch (e) {}
  try { micStream && micStream.getTracks().forEach(t => t.stop()); } catch (e) {}
  proc = micSrc = micStream = null;
}

function hear(d, sr) {
  let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
  const rms = Math.sqrt(s / d.length), dt = d.length / sr; micRms = rms;
  if (gated()) { vad.on = false; vad.chunks = []; vad.pre = []; vad.silence = 0; return; }
  if (!vad.on) vad.floor = Math.max(0.004, Math.min(0.05, vad.floor * 0.97 + rms * 0.03));
  const thr = Math.max(0.018, vad.floor * 3);
  const copy = new Float32Array(d);
  if (!vad.on) {
    vad.pre.push(copy); if (vad.pre.length > 4) vad.pre.shift();
    if (rms > thr) { vad.on = true; vad.chunks = vad.pre.slice(); vad.pre = []; vad.dur = 0; vad.silence = 0; vad.loud = 0; showHeard('…'); }
    return;
  }
  vad.chunks.push(copy); vad.dur += dt;
  if (rms > thr * 0.75) { vad.silence = 0; vad.loud += dt; } else vad.silence += dt;
  if (vad.silence > 0.85 || vad.dur > 14) {
    const chunks = vad.chunks, loud = vad.loud; vad.on = false; vad.chunks = [];
    if (loud >= 0.3) transcribe(chunks, sr);              // zu kurz = Geräusch, ignorieren
  }
}

function toWav16k(chunks, sr) {
  let n = 0; for (const c of chunks) n += c.length;
  const all = new Float32Array(n); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; }
  const ratio = sr / 16000, len = Math.floor(n / ratio), pcm = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const a = Math.floor(i * ratio), b = Math.min(n, Math.floor((i + 1) * ratio)); let v = 0;
    for (let j = a; j < b; j++) v += all[j]; v /= Math.max(1, b - a);
    pcm[i] = Math.max(-1, Math.min(1, v)) * 0x7fff;
  }
  const buf = new ArrayBuffer(44 + pcm.length * 2), dv = new DataView(buf);
  const w = (p, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(p + i, str.charCodeAt(i)); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 16000, true);
  dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
  new Int16Array(buf, 44).set(pcm);
  const bytes = new Uint8Array(buf); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function transcribe(chunks, sr) {
  sttBusy = true; showHeard('…');
  try {
    const r = await fetch(STT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ audio: toWav16k(chunks, sr) }) });
    const d = await r.json().catch(() => ({}));
    const t = (d.text || '').trim();
    sttBusy = false;
    if (t && state !== 'off') { lastUser = Date.now(); showHeard(t); think(t); }
    else if (state === 'listening') showHeard('Ich höre, Master …');
  } catch (e) { sttBusy = false; console.warn('stt', e); }
}

function showHeard(t) { const s = document.getElementById('shSay'); if (s) s.textContent = t === '…' || /^Ich höre/.test(t) ? t : '„' + t + '“'; }
function listen() { earStart(); if (state !== 'off') setState('listening'); }
function stopRec() {}

// Ruhe-Abschaltung nach 5 Minuten ohne Frage (Akku)
setInterval(() => { if (earOn && state === 'listening' && Date.now() - Math.max(lastUser, lastAct) > 5 * 60000) { earOff(); state = 'off'; sayLine('Mikrofon aus – ich ruhe, Master. Tippen Sie, wenn Sie mich brauchen.'); } }, 15000);

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
  try { const c = audio(); const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {}
  if (!sayHi) try { if (window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(' '); u.lang = 'de-DE'; const v = bestVoice(); if (v) { u.voice = v; u.lang = v.lang; } u.volume = 0; u.rate = 1.03; u.pitch = .92; speechSynthesis.speak(u); } } catch (e) {}
  unlocked = true;
}
async function start() {
  if (state !== 'off') return; unlock(false); muted = false; lastUser = Date.now();
  const micP = earStart();                                  // direkt im Antippen anfragen
  if (!greeted) { greeted = true; setState('busy'); const f = window.__greetFacts ? await window.__greetFacts() : ''; think('[START] ' + f); micP.then(ok => { if (ok && state === 'idle') setState('listening'); }); return; }
  setState('busy'); const ok = await micP;
  if (state === 'off') return;
  setState(ok ? 'listening' : 'idle'); sayLine(ok ? 'Ich höre, Master …' : 'Bitte unten schreiben, Master.');
}
function end() { hush(); earOff(); busyTurn = false; state = 'off'; }

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
