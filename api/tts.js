// JARVIS · Stimme über Google Gemini (gratis-Stufe) → liefert WAV
import { cors } from './_geo.js';

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

let goodModel = null;

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const key = cleanKey(process.env.GEMINI_KEY);
  if (!key) return res.status(503).json({ error: 'kein GEMINI_KEY' });
  const q = req.query || {};
  if (q.models) {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    const d = await r.json().catch(() => ({}));
    return res.status(200).json({ tts: (d.models || []).map(m => m.name).filter(n => /tts|audio|speech/i.test(n)), status: r.status });
  }
  let body = req.body; if (typeof body === 'string') try { body = JSON.parse(body); } catch (e) { body = {}; }
  const text = String((body && body.text) || q.text || '').slice(0, 1200).trim();
  if (!text) return res.status(400).json({ error: 'kein Text' });
  const voice = VOICES.includes((body && body.voice) || q.voice) ? ((body && body.voice) || q.voice) : 'Charon';
  const prompt = 'Sprich auf Hochdeutsch als JARVIS: ruhig, tief, edel und selbstsicher wie ein eleganter britischer Butler, mit einem Hauch Ironie, flüssig und nicht zu langsam:\n' + text;
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
      if (!r.ok) { errs.push(model + ': ' + r.status + ' ' + ((d.error && d.error.message) || '').slice(0, 120)); continue; }
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
