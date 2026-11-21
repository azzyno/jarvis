// Wetter für JARVIS: aktuell, nächste 12 Stunden, 7 Tage (Open-Meteo, frei, ohne Schlüssel).
import { cors, geocode, forecast } from './_geo.js';

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const ort = req.query.q ? await geocode(String(req.query.q)) : { name: req.query.label || 'Ihr Standort', lat: +(req.query.lat || 46.9480), lon: +(req.query.lon || 7.4474) };
    const f = await forecast(ort.lat, ort.lon);
    res.setHeader('Cache-Control', 's-maxage=300');
    return res.status(200).json({ stand: new Date().toISOString(), ort, ...f, quelle: 'Open-Meteo' });
  } catch (e) { return res.status(502).json({ error: String(e.message || e) }); }
}
