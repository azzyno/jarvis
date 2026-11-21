// Satelliten-Bahndaten für JARVIS (öffentlicher Katalog von CelesTrak, NORAD-Bahnelemente, kein Schlüssel).
// Antwort 2 Stunden im Vercel-Cache, damit CelesTrak nicht unnötig belastet wird.
import { cors } from './_geo.js';

const GROUPS = {
  stations: 'Raumstationen', visual: 'Hell sichtbar', military: 'Militär', 'gps-ops': 'GPS', galileo: 'Galileo', 'glo-ops': 'GLONASS', beidou: 'BeiDou',
  weather: 'Wetter', resource: 'Erdbeobachtung', 'sarsat': 'Rettung', geo: 'Geostationär', science: 'Wissenschaft', amateur: 'Amateurfunk',
  starlink: 'Starlink', oneweb: 'OneWeb', active: 'Alle aktiven',
};
async function group(g) {
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 12000);
  try {
    const r = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(g)}&FORMAT=tle`, { headers: { 'User-Agent': 'JARVIS-Omega/1.0 (private dashboard)' }, signal: ac.signal });
    if (!r.ok) return [];
    const lines = (await r.text()).split(/\r?\n/).map(l => l.trimEnd()).filter(Boolean); const out = [];
    for (let i = 0; i + 2 < lines.length + 1; i += 3) { const [n, l1, l2] = [lines[i], lines[i + 1], lines[i + 2]]; if (l1 && l2 && l1[0] === '1' && l2[0] === '2') out.push({ n: n.trim(), id: l1.slice(2, 7).trim(), l1, l2, g }); }
    return out;
  } catch (e) { return []; } finally { clearTimeout(to); }
}
export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const want = String(req.query.g || 'stations,visual,military,gps-ops,galileo,glo-ops,beidou,weather').split(',').map(s => s.trim()).filter(g => GROUPS[g]).slice(0, 8);
  if (!want.length) return res.status(400).json({ error: 'Unbekannte Gruppe', gruppen: GROUPS });
  const parts = await Promise.all(want.map(group));
  const seen = new Map();
  parts.flat().forEach(s => { if (!seen.has(s.id)) seen.set(s.id, s); });
  const sats = [...seen.values()];
  if (!sats.length) return res.status(502).json({ error: 'CelesTrak gerade nicht erreichbar' });
  res.setHeader('Cache-Control', 's-maxage=7200, stale-while-revalidate=21600');
  return res.status(200).json({ stand: new Date().toISOString(), quelle: 'CelesTrak (NORAD-Bahnelemente, öffentlicher Katalog)', gruppen: Object.fromEntries(want.map((g, i) => [g, { name: GROUPS[g], anzahl: parts[i].length }])), total: sats.length, sats });
}
