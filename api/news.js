// Weltlage für JARVIS: echte Schlagzeilen (Google News RSS), Brennpunkte, Bilder (Bing News RSS) und Wetter (Open-Meteo).
// Antwort wird 10 Minuten im Vercel-Cache gehalten.
import { COUNTRIES, countriesIn, byCode, WATCH } from './_countries.js';

const ALLOWED = ['https://azzyno.github.io'];
const UA = 'Mozilla/5.0 (compatible; JARVIS-Omega/1.0)';
const FEEDS = [
  { u: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=de&gl=CH&ceid=CH:de', world: true },
  { u: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en', world: true },
  { u: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=de&gl=DE&ceid=DE:de', world: true },
  { u: 'https://news.google.com/rss?hl=de&gl=CH&ceid=CH:de', world: false },
  { u: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=de&gl=CH&ceid=CH:de', world: false },
];

const dec = s => String(s || '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').trim();
const tag = (xml, t) => { const m = xml.match(new RegExp('<' + t + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + t + '>', 'i')); return m ? dec(m[1]) : ''; };

export function parseRss(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const it = m[1];
    let title = tag(it, 'title'); const source = tag(it, 'source');
    if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
    const img = tag(it, 'News:Image') || (it.match(/<media:content[^>]*url="([^"]+)"/i) || [])[1] || '';
    out.push({ t: title, s: source || tag(it, 'News:Source'), u: tag(it, 'link'), d: tag(it, 'pubDate'), img: dec(img) });
  }
  return out;
}

async function get(u, ms = 6000) {
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml,application/xml,text/xml,*/*' }, signal: ac.signal }); if (!r.ok) throw new Error(String(r.status)); return await r.text(); }
  finally { clearTimeout(to); }
}

async function images(country) {
  try {
    const q = encodeURIComponent(country.n.split(' / ')[0]);
    const xml = await get(`https://www.bing.com/news/search?q=${q}&format=rss&setlang=de-CH&cc=CH`, 5000);
    return parseRss(xml).filter(x => x.img).slice(0, 9).map(x => ({ u: x.u, img: x.img.replace(/&amp;/g, '&').replace(/^http:/, 'https:') + (x.img.includes('?') ? '&' : '?') + 'w=480&h=320&c=7', t: x.t, s: x.s }));
  } catch (e) { return []; }
}
async function weather(c) {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,wind_speed_10m,weather_code&timezone=auto`);
    const j = await r.json(); return { temp: j.current?.temperature_2m, wind: j.current?.wind_speed_10m, code: j.current?.weather_code };
  } catch (e) { return null; }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET'); return res.status(204).end(); }

  const results = await Promise.allSettled(FEEDS.map(f => get(f.u).then(x => ({ f, items: parseRss(x) }))));
  const seen = new Set(); const all = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const it of r.value.items) {
      const key = it.t.toLowerCase().slice(0, 60); if (!it.t || seen.has(key)) continue; seen.add(key);
      all.push({ ...it, world: r.value.f.world, c: countriesIn(it.t) });
    }
  }
  if (!all.length) return res.status(502).json({ error: 'Keine Nachrichtenquelle erreichbar' });

  // Brennpunkte: wie oft ein Land in den Welt-Schlagzeilen vorkommt (Schweiz zählt nur halb, da Heimat-Feeds).
  const score = {};
  for (const it of all) for (const c of it.c) score[c] = (score[c] || 0) + (it.world ? 1 : 0.5) * (c === 'CH' ? 0.5 : 1);
  // Gaza/Israel nicht doppelt: wenn beide vorkommen, zusammenlegen auf das stärkere.
  if (score.PS && score.IL) { const k = score.IL >= score.PS ? 'IL' : 'PS', o = k === 'IL' ? 'PS' : 'IL'; score[k] += score[o] * 0.5; delete score[o]; }
  const top = Object.entries(score).filter(([c]) => byCode[c]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => byCode[c]);
  const topCodes = new Set(top.map(c => c.c));
  const list = [...top.map(c => ({ c, watch: false })), ...WATCH.filter(w => !topCodes.has(w)).map(w => ({ c: byCode[w], watch: true }))];

  const used = new Set();
  const hotspots = await Promise.all(list.map(async ({ c, watch }) => {
    const items = all.filter(it => it.c.includes(c.c) || (c.c === 'IL' && it.c.includes('PS')) || (c.c === 'PS' && it.c.includes('IL')))
      .map((it, i) => ({ it, i, k: it.c.length + (it.world ? 0 : 0.5) })).sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.it);
    const lead = items.find(it => !used.has(it.t)) || items[0]; if (lead) used.add(lead.t);
    if (lead) { items.splice(items.indexOf(lead), 1); items.unshift(lead); }
    const [imgs, wx] = await Promise.all([images(c), weather(c)]);
    const count = items.length;
    if (!items.length) imgs.forEach(im => items.push({ t: im.t, s: im.s, u: im.u || '', d: '' }));
    return { watch, c: c.c, n: c.n, en: c.en, cap: c.cap, lat: c.lat, lon: c.lon, tz: c.tz, box: c.box, count, headline: items[0]?.t || '', items: items.slice(0, 6).map(({ t, s, u, d }) => ({ t, s, u, d })), images: imgs, weather: wx };
  }));

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  return res.status(200).json({
    stand: new Date().toISOString(), quelle: 'Google News (RSS), Bilder: Bing News, Wetter: Open-Meteo',
    total: all.length, headlines: all.slice(0, 220).map(({ t, s }) => ({ t, s })), hotspots,
  });
}
