// Öffentliche Verkehrskameras mit Live-Bild für JARVIS (ohne Schlüssel):
//   New York City DOT (Bild alle paar Sekunden neu) und Transport for London JamCams (kurze Live-Videos).
import { cors } from './_geo.js';

async function get(url, ms = 12000) {
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { headers: { 'User-Agent': 'JARVIS-private-dashboard/1.0' }, signal: ac.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(to); }
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const [nyc, tfl] = await Promise.all([
    get('https://webcams.nyctmc.org/api/cameras').catch(() => []),
    get('https://api.tfl.gov.uk/Place/Type/JamCam').catch(() => []),
  ]);
  const out = [];
  (Array.isArray(nyc) ? nyc : []).forEach(c => { if (c.isOnline === 'true' && isFinite(c.latitude)) out.push({ id: 'ny:' + c.id, n: c.name, la: +(+c.latitude).toFixed(5), lo: +(+c.longitude).toFixed(5), ort: (c.area || '') + ', New York', img: c.imageUrl, src: 'NYC DOT' }); });
  (Array.isArray(tfl) ? tfl : []).forEach(c => {
    const p = {}; (c.additionalProperties || []).forEach(a => p[a.key] = a.value);
    if (p.available === 'false' || !isFinite(c.lat)) return;
    out.push({ id: 'ld:' + c.id, n: c.commonName, la: +c.lat.toFixed(5), lo: +c.lon.toFixed(5), ort: (p.view ? p.view + ' · ' : '') + 'London', img: p.imageUrl, vid: p.videoUrl, src: 'TfL' });
  });
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=7200');
  return res.status(out.length ? 200 : 502).json({ quelle: 'NYC DOT, Transport for London', stand: new Date().toISOString(), total: out.length, kameras: out });
}
