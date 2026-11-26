// JARVIS · Ohr: Sprache → Text über Google Gemini (gratis-Stufe)
import { cors } from './_geo.js';

function cleanKey(v) {
  v = String(v || '');
  const m = v.match(/AIza[0-9A-Za-z_\-]{20,}|AQ\.[A-Za-z0-9_\-.]{20,}/);
  return m ? m[0] : v.replace(/[\s"'`]/g, '');
}
const MODELS = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.8-flash'];
const PROMPT = 'Transkribiere diese Sprachaufnahme wörtlich (Deutsch oder Schweizerdeutsch → schreibe Hochdeutsch). ' +
  'Gib NUR den gesprochenen Text zurück, ohne Anführungszeichen oder Kommentar. ' +
  'Wenn nichts Verständliches gesagt wird (nur Geräusche, Atmen, Stille, Musik), gib genau "-" zurück.';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const key = cleanKey(process.env.GEMINI_KEY);
  if (!key) return res.status(503).json({ error: 'kein GEMINI_KEY' });
  if (req.method === 'GET' && req.query && req.query.selftest) {
    const a = await fetch('https://jarvis-iota-weld.vercel.app/api/tts?text=' + encodeURIComponent('Wie ist das Wetter morgen in Bern?'));
    req.body = { audio: Buffer.from(await a.arrayBuffer()).toString('base64') };
  }
  let body = req.body; if (typeof body === 'string') try { body = JSON.parse(body); } catch (e) { body = {}; }
  const audio = body && body.audio;
  if (!audio || audio.length < 2000) return res.status(200).json({ text: '' });
  const errs = [];
  for (const model of MODELS) {
    try {
      const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 15000);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: 'audio/wav', data: audio } }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 200 } }),
      });
      clearTimeout(to);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { errs.push(model + ': ' + r.status + ' ' + ((d.error && d.error.message) || '').slice(0, 100)); continue; }
      let t = ((d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim();
      t = t.replace(/^["„“']+|["“”']+$/g, '').trim();
      if (t === '-' || /^[-–.\s]*$/.test(t)) t = '';
      return res.status(200).json({ text: t, quelle: model });
    } catch (e) { errs.push(model + ': ' + e.message); }
  }
  return res.status(502).json({ error: 'Ohr nicht verfügbar', details: errs });
}
