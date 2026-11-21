// Nachrichten-Suche für JARVIS: jedes Thema, weltweit, live.
// Quellen: GDELT (über 100 Sprachen, letzte 72 Std.), Google News (CH/DE/US), Bing News. Kein Schlüssel nötig.
import { cors } from './_geo.js';
import { parseRss, gdelt } from './news.js';

const UA = 'Mozilla/5.0 (compatible; JARVIS-Omega/1.0)';
async function rss(u) {
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 6000);
  try { const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: ac.signal }); if (!r.ok) return []; return parseRss(await r.text()); } catch (e) { return []; } finally { clearTimeout(to); }
}
const ts = d => { if (!d) return 0; const m = String(d).match(/^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/); const t = m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : Date.parse(d); return isNaN(t) ? 0 : t; };

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (!q) return res.status(400).json({ error: 'Parameter q fehlt' });
  const e = encodeURIComponent(q);
  const gq = 'https://api.gdeltproject.org/api/v2/doc/doc?query=' + encodeURIComponent(/\s/.test(q) && !/["()]/.test(q) ? `"${q}"` : q) + '&mode=ArtList&maxrecords=75&timespan=72h&sort=DateDesc&format=json';
  const [g, chde, dede, usen, bing] = await Promise.all([
    gdelt(gq, 8000),
    rss(`https://news.google.com/rss/search?q=${e}&hl=de&gl=CH&ceid=CH:de`),
    rss(`https://news.google.com/rss/search?q=${e}&hl=de&gl=DE&ceid=DE:de`),
    rss(`https://news.google.com/rss/search?q=${e}&hl=en-US&gl=US&ceid=US:en`),
    rss(`https://www.bing.com/news/search?q=${e}&format=rss&setlang=de-CH&cc=CH`),
  ]);
  const seen = new Set(), out = [];
  const add = (arr, via) => arr.forEach(x => { const k = String(x.t).toLowerCase().replace(/\W+/g, ' ').slice(0, 70); if (!x.t || seen.has(k)) return; seen.add(k); out.push({ t: x.t, s: x.s || '', u: x.u, d: x.d || '', zeit: ts(x.d) ? new Date(ts(x.d)).toISOString() : null, sprache: x.lang || null, via }); });
  add(chde, 'Google News CH'); add(dede, 'Google News DE'); add(usen, 'Google News US'); add(bing, 'Bing News'); add(g, 'GDELT');
  out.sort((a, b) => ts(b.d) - ts(a.d));
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  return res.status(200).json({
    q, stand: new Date().toISOString(), total: out.length,
    quellen: { gdelt: g.length, google_ch: chde.length, google_de: dede.length, google_us: usen.length, bing: bing.length },
    artikel: out.slice(0, 60),
  });
}
