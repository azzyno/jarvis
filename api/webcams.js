// Öffentliche Live-Kameras für JARVIS (Windy Webcams API v3).
// Braucht den kostenlosen Schlüssel als Vercel-Umgebungsvariable WINDY_KEY.
// Bild-Links von Windy laufen nach kurzer Zeit ab, deshalb nur 10 Minuten Cache.
import { cors } from './_geo.js';

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const key = process.env.WINDY_KEY;
  if (!key) return res.status(503).json({ error: 'WINDY_KEY fehlt', code: 'no_key' });
  const lat = +req.query.lat, lon = +req.query.lon, r = Math.max(1, Math.min(250, +req.query.r || 50));
  const n = +req.query.n, s = +req.query.s, e = +req.query.e, w = +req.query.w, z = Math.max(1, Math.min(18, Math.round(+req.query.z || 5)));
  const box = [n, s, e, w].every(isFinite);
  if (!box && (!isFinite(lat) || !isFinite(lon))) return res.status(400).json({ error: 'lat/lon fehlen' });
  const url = box
    ? `https://api.windy.com/webcams/api/v3/map/clusters?lang=de&northLat=${n.toFixed(4)}&southLat=${s.toFixed(4)}&eastLon=${e.toFixed(4)}&westLon=${w.toFixed(4)}&zoom=${z}&include=location,images,player,urls`
    : `https://api.windy.com/webcams/api/v3/webcams?lang=de&limit=50&offset=0&sortKey=popularity&sortDirection=desc&nearby=${lat},${lon},${r}&include=location,images,player,urls`;
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 10000);
  try {
    const x = await fetch(url, { headers: { 'x-windy-api-key': key }, signal: ac.signal });
    const d = await x.json().catch(() => ({}));
    if (!x.ok) return res.status(x.status === 401 ? 503 : 502).json({ error: d.message || 'Windy ' + x.status, code: x.status === 401 ? 'bad_key' : 'upstream' });
    const kameras = (Array.isArray(d) ? d : (d.webcams || [])).filter(w => w.location && w.status !== 'inactive').map(w => {
      const p = w.player || {}, im = w.images || {}, cur = im.current || {}, loc = w.location || {};
      const pick = v => (typeof v === 'string' ? v : v && (v.embed || v.link)) || null;
      return {
        id: w.webcamId, titel: w.title, lat: loc.latitude, lon: loc.longitude,
        ort: [loc.city, loc.region, loc.country].filter(Boolean).join(', '),
        bild: cur.preview || cur.thumbnail || cur.icon || null,
        live: pick(p.live), tag: pick(p.day), player: pick(p.lifetime) || pick(p.month) || null,
        link: (w.urls && (w.urls.detail || w.urls.provider)) || null,
        aktualisiert: w.lastUpdatedOn || null,
      };
    }).filter(k => isFinite(k.lat) && isFinite(k.lon));
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=600');
    return res.status(200).json({ quelle: 'Windy Webcams', stand: new Date().toISOString(), radius_km: box ? null : r, total: (d && d.total) ?? kameras.length, kameras });
  } catch (e) { return res.status(502).json({ error: String(e.message || e), code: 'upstream' }); }
  finally { clearTimeout(to); }
}
