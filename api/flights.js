// Live-Flugzeuge für JARVIS (ADS-B von adsb.lol, frei, ohne Schlüssel) und Flugroute (adsbdb).
//   /api/flights?lat=46.9&lon=7.4&nm=150   → Flugzeuge im Umkreis (max. 250 Seemeilen)
//   /api/flights?cs=SWR72                  → Route und Airline zu einem Rufzeichen
import { cors } from './_geo.js';

async function get(url, ms = 9000) {
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { headers: { 'User-Agent': 'JARVIS-private-dashboard/1.0' }, signal: ac.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(to); }
}
const ap = a => a && ({ iata: a.iata_code, icao: a.icao_code, name: a.name, stadt: a.municipality, land: a.country_name, lat: a.latitude, lon: a.longitude });

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const cs = String(req.query.cs || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cs) {
      const d = await get('https://api.adsbdb.com/v0/callsign/' + cs).catch(() => null);
      const f = d && d.response && d.response.flightroute;
      res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
      if (!f) return res.status(200).json({ cs, route: null });
      return res.status(200).json({ cs, airline: f.airline && f.airline.name, von: ap(f.origin), nach: ap(f.destination), iata: f.callsign_iata });
    }
    const lat = +req.query.lat, lon = +req.query.lon, nm = Math.max(5, Math.min(250, Math.round(+req.query.nm || 150)));
    if (!isFinite(lat) || !isFinite(lon)) return res.status(400).json({ error: 'lat/lon fehlen' });
    const d = await get(`https://api.adsb.lol/v2/lat/${lat.toFixed(3)}/lon/${lon.toFixed(3)}/dist/${nm}`);
    const ac = (d.ac || []).filter(a => a.lat != null && a.lon != null && (a.seen_pos == null || a.seen_pos < 60)).slice(0, 1500).map(a => ({
      h: a.hex, c: (a.flight || '').trim(), r: a.r || '', t: a.t || '', la: +a.lat.toFixed(4), lo: +a.lon.toFixed(4),
      al: a.alt_baro === 'ground' ? 0 : (a.alt_baro ?? a.alt_geom ?? null), g: a.alt_baro === 'ground' ? 1 : 0,
      gs: a.gs != null ? Math.round(a.gs) : null, tr: a.track != null ? Math.round(a.track) : (a.true_heading != null ? Math.round(a.true_heading) : 0),
      vr: a.baro_rate ?? a.geom_rate ?? 0, sq: a.squawk || '', em: a.emergency && a.emergency !== 'none' ? a.emergency : (['7700', '7600', '7500'].includes(a.squawk) ? 'squawk ' + a.squawk : ''), cat: a.category || '',
    }));
    res.setHeader('Cache-Control', 's-maxage=8, stale-while-revalidate=20');
    return res.status(200).json({ quelle: 'adsb.lol (ADS-B, Community-Empfänger)', stand: new Date().toISOString(), radius_nm: nm, total: ac.length, ac });
  } catch (e) { return res.status(502).json({ error: String(e.message || e) }); }
}
