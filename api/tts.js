// JARVIS · Stimme über Google Gemini (gratis-Stufe) → liefert WAV
import { cors, guard } from './_geo.js';

function cleanKey(v) {
  v = String(v || '');
  const m = v.match(/AIza[0-9A-Za-z_\-]{20,}|AQ\.[A-Za-z0-9_\-.]{20,}/);
  return m ? m[0] : v.replace(/[\s"'`]/g, '');
}
const MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
const VOICES = ['Charon', 'Orus', 'Iapetus', 'Algenib', 'Fenrir', 'Rasalgethi', 'Sadaltager', 'Alnilam'];

function wav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const STT_MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.8-flash'];
const STT_PROMPT = 'Transkribiere diese Sprachaufnahme wörtlich (Deutsch oder Schweizerdeutsch → schreibe Hochdeutsch). ' +
  'Gib NUR den gesprochenen Text zurück, ohne Anführungszeichen oder Kommentar. ' +
  'Wenn nichts Verständliches gesagt wird (nur Geräusche, Atmen, Stille, Musik), gib genau "-" zurück.';


async function stt(req, res, key, audio, mime) {
  mime = String(mime || 'audio/wav').split(';')[0];
  const mimes = [...new Set([mime, ...(/mp4|m4a|aac/.test(mime) ? ['audio/aac', 'audio/mp4', 'video/mp4'] : /webm/.test(mime) ? ['audio/webm', 'video/webm', 'audio/ogg'] : [])])];
  if (!audio || audio.length < 2000) return res.status(200).json({ text: '' });
  const errs = [];
  for (const mt of mimes) for (const model of STT_MODELS.slice(0, mt === mimes[0] ? 3 : 1)) {
    try {
      const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 15000);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: STT_PROMPT }, { inlineData: { mimeType: mt, data: audio } }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 200 } }),
      });
      clearTimeout(to);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { errs.push(mt + ' ' + model + ': ' + r.status + ' ' + ((d.error && d.error.message) || '').slice(0, 100)); continue; }
      let t = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim();
      t = t.replace(/^["„“']+|["“”']+$/g, '').trim();
      if (t === '-' || /^[-–.\s]*$/.test(t)) t = '';
      return res.status(200).json({ text: t, quelle: model });
    } catch (e) { errs.push(model + ': ' + e.message); }
  }
  return res.status(502).json({ error: 'Ohr nicht verfügbar', details: errs });
}

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

let goodModel = null;

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!guard(req, res, { perMin: 60 })) return;
  const key = cleanKey(process.env.GEMINI_KEY);
  if (!key) return res.status(503).json({ error: 'kein GEMINI_KEY' });
  const q = req.query || {};
  let body = req.body; if (typeof body === 'string') try { body = JSON.parse(body); } catch (e) { body = {}; }
  if (body && body.audio) return stt(req, res, key, body.audio, body.mime);
  const text = String((body && body.text) || q.text || '').slice(0, 1200).trim();
  if (!text) return res.status(400).json({ error: 'kein Text' });
  const voice = VOICES.includes((body && body.voice) || q.voice) ? ((body && body.voice) || q.voice) : 'Charon';
  const prompt = text;   // Stilanweisungen würden mitgesprochen – die Stimme Charon ist von Natur aus tief und ruhig
  const errs = [];
  for (const model of goodModel ? [goodModel, ...MODELS.filter(m => m !== goodModel)] : MODELS) {
    try {
      const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 25000);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
      });
      clearTimeout(to);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { errs.push(mt + ' ' + model + ': ' + r.status + ' ' + ((d.error && d.error.message) || '').slice(0, 120)); continue; }
      const part = d.candidates && d.candidates[0] && d.candidates[0].content && (d.candidates[0].content.parts || []).find(p => p.inlineData);
      if (!part) { errs.push(model + ': kein Audio'); continue; }
      const rate = +((part.inlineData.mimeType || '').match(/rate=(\d+)/) || [])[1] || 24000;
      goodModel = model;
      res.setHeader('Content-Type', 'audio/wav'); res.setHeader('X-Model', model); res.setHeader('Access-Control-Expose-Headers', 'X-Model');
      return res.status(200).send(wav(Buffer.from(part.inlineData.data, 'base64'), rate));
    } catch (e) { errs.push(model + ': ' + e.message); }
  }
  return res.status(502).json({ error: 'Stimme nicht verfügbar', details: errs });
}
