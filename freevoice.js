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
let state = 'off', muted = false, hist = [], greeted = false, lastAct = 0, busyTurn = false;
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
  if (state === 'listening') return .05 + Math.random() * .05;
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
  lastAct = Date.now();
  if (state !== 'off') { if (!muted && recOK) { setState('pause'); setTimeout(() => state === 'pause' && listen(), 700); } else setState('idle'); }
}
function hush() { speakId++; try { cur && cur.stop(); } catch (e) {} cur = null; try { speechSynthesis.cancel(); } catch (e) {} }

/* ---------- Ohr: Spracherkennung ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const recOK = !!SR;
let rec = null, recOn = false;
let tries = 0;
function listen(again) {
  if (!again) tries = 0;
  if (!recOK || muted || state === 'off') { setState('idle'); return; }
  try { rec && rec.abort(); } catch (e) {}
  rec = new SR(); rec.lang = 'de-CH'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  let finalT = '', lastT = '';
  rec.onresult = e => { let t = ''; for (const r of e.results) { t += r[0].transcript; if (r.isFinal) finalT = t; } lastT = t; lastAct = Date.now(); const s = document.getElementById('shSay'); if (s) s.textContent = '„' + t + '“'; };
  rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { J.toast && J.toast('Mikrofon nicht erlaubt – bitte in Safari erlauben oder schreiben.'); muted = true; } };
  rec.onend = () => { recOn = false; if (state === 'off') return;
    const said = (finalT || lastT).trim();
    if (said) think(said);
    else if (state === 'listening') { tries++; if (tries < 2 && !/iPhone|iPad|iPod/.test(navigator.userAgent)) setTimeout(() => state === 'listening' && listen(true), 150); else { end(); sayLine('Tippen Sie aufs Mikrofon, wenn Sie etwas brauchen, Master.'); } } };
  try { rec.start(); recOn = true; setState('listening'); state = 'listening'; } catch (e) { setState('idle'); }
}
function stopRec() { try { rec && rec.abort(); } catch (e) {} recOn = false; }

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
  try { if (window.speechSynthesis) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(' '); u.lang = 'de-DE'; const v = bestVoice(); if (v) { u.voice = v; u.lang = v.lang; } u.volume = 0; u.rate = 1.03; u.pitch = .92; speechSynthesis.speak(u); } } catch (e) {}
  unlocked = true;
}
async function start() {
  if (state !== 'off') return; unlock(true); muted = false; setState('busy');
  if (!greeted) { greeted = true; const f = window.__greetFacts ? await window.__greetFacts() : ''; think('[START] ' + f); }
  else if (recOK) listen(); else setState('idle');
}
function end() { hush(); stopRec(); busyTurn = false; state = 'off'; }

const FREE = {
  async say(context) { if (state !== 'listening' || busyTurn) return false; think('[APP-KLICK] ' + context); return true; },
  start, end, mute() { muted = !muted; if (muted) { stopRec(); setState('idle'); } else listen(); },
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
  const lbl = () => { b.textContent = engine === 'el' ? 'Stimme: ElevenLabs' : 'Stimme: Thorsten · gratis'; };
  lbl(); b.onclick = e => { e.stopPropagation(); window.JARVIS_VOICE.set(engine === 'el' ? 'free' : 'el'); lbl(); J.toast && J.toast(engine === 'el' ? 'ElevenLabs-Stimme aktiv (braucht Guthaben).' : 'Gratis-Stimme aktiv.'); };
})();
