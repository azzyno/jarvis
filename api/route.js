// Route für JARVIS: Strecke + Fahrzeit (OSRM), Live-Verkehr (TomTom, falls Schlüssel gesetzt),
// nächste Zug-/ÖV-Verbindungen live (transport.opendata.ch), Wetter am Ziel (Open-Meteo),
// Links für Apple Karten und Google Maps (dort mit Live-Verkehr).
import { cors, getJson, geocode, forecast } from './_geo.js';

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const to = String(req.query.to || '').trim(); if (!to) return res.status(400).json({ error: 'Ziel fehlt' });
  try {
    const ziel = await geocode(to);
    let start;
    if (req.query.from) start = await geocode(String(req.query.from));
    else if (req.query.lat && req.query.lon) start = { name: req.query.label || 'Ihr Standort', lat: +req.query.lat, lon: +req.query.lon };
    else start = { name: 'Zürich (Standard)', lat: 47.3769, lon: 8.5417 };

    const tasks = {
      auto: getJson(`https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${ziel.lon},${ziel.lat}?overview=false&alternatives=false`, 8000)
        .then(j => j.routes && j.routes[0] ? { km: Math.round(j.routes[0].distance / 100) / 10, minuten_ohne_verkehr: Math.round(j.routes[0].duration / 60) } : null).catch(() => null),
      verkehr: process.env.TOMTOM_KEY
        ? getJson(`https://api.tomtom.com/routing/1/calculateRoute/${start.lat},${start.lon}:${ziel.lat},${ziel.lon}/json?traffic=true&travelMode=car&key=${process.env.TOMTOM_KEY}`, 8000)
          .then(j => { const s = j.routes?.[0]?.summary; return s ? { minuten_mit_verkehr: Math.round(s.travelTimeInSeconds / 60), stau_minuten: Math.round((s.trafficDelayInSeconds || 0) / 60), km: Math.round(s.lengthInMeters / 100) / 10, ankunft: s.arrivalTime, quelle: 'TomTom Live-Verkehr' } : null; }).catch(() => null)
        : Promise.resolve(null),
      oev: (async () => {
        const st = async (lat, lon) => { const j = await getJson(`https://transport.opendata.ch/v1/locations?x=${lat}&y=${lon}&type=station`, 6000); const L = (j.stations || []).filter(x => x.id); return (L.find(x => x.icon === 'train') || L[0] || {}).name; };
        const [a, b] = await Promise.all([st(start.lat, start.lon), st(ziel.lat, ziel.lon)]);
        if (!a || !b || a === b) return [];
        const j = await getJson(`https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(a)}&to=${encodeURIComponent(b)}&limit=4`, 8000);
        return (j.connections || []).map(c => ({ ab: c.from?.departure, an: c.to?.arrival, dauer: c.duration?.replace(/^00d/, '').slice(0, 5), umstiege: c.transfers, verspaetung_min: c.from?.delay || 0, gleis: c.from?.platform || '', produkte: (c.products || []).join(' · '), von: c.from?.station?.name, nach: c.to?.station?.name }));
      })().catch(() => []),
      wetter: forecast(ziel.lat, ziel.lon).catch(() => null),
    };
    const out = {}; await Promise.all(Object.entries(tasks).map(async ([k, p]) => { out[k] = await p; }));
    const s = `${start.lat},${start.lon}`, z = `${ziel.lat},${ziel.lon}`;
    res.setHeader('Cache-Control', 's-maxage=60');
    return res.status(200).json({
      stand: new Date().toISOString(), start, ziel, ...out,
      live_verkehr_verbunden: !!process.env.TOMTOM_KEY,
      links: {
        apple: `https://maps.apple.com/?saddr=${s}&daddr=${z}&dirflg=d`,
        google: `https://www.google.com/maps/dir/?api=1&origin=${s}&destination=${z}&travelmode=driving`,
        sbb: `https://www.sbb.ch/de?von=${encodeURIComponent(start.name)}&nach=${encodeURIComponent(ziel.name)}`,
      },
      quellen: 'OSRM (Strecke), ' + (process.env.TOMTOM_KEY ? 'TomTom (Live-Verkehr), ' : '') + 'transport.opendata.ch (ÖV live), Open-Meteo (Wetter)',
    });
  } catch (e) { return res.status(502).json({ error: String(e.message || e) }); }
}
