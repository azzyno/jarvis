// Live-Kurse ohne Schlüssel für das Finanz-Dashboard (Yahoo Finance Chart-API, verzögert je nach Börse).
//   /api/quotes                → Standardliste (SMI, S&P 500, Nasdaq, DAX, Gold, Bitcoin, USD/CHF, EUR/CHF)
//   /api/quotes?s=NVDA,UBSG.SW → eigene Symbole
import { cors } from './_geo.js';

const DEF = [
  ['^SSMI', 'SMI'], ['^GSPC', 'S&P 500'], ['^IXIC', 'Nasdaq'], ['^GDAXI', 'DAX'],
  ['GC=F', 'Gold'], ['BTC-USD', 'Bitcoin'], ['CHF=X', 'USD/CHF'], ['EURCHF=X', 'EUR/CHF'],
];

async function one(sym, name) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=5m&includePrePost=false`;
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (JARVIS private dashboard)', Accept: 'application/json' }, signal: ac.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(); const res = d.chart && d.chart.result && d.chart.result[0]; if (!res) throw new Error('leer');
    const m = res.meta || {}, q = (res.indicators && res.indicators.quote && res.indicators.quote[0]) || {};
    const pts = (res.timestamp || []).map((t, i) => [t * 1000, q.close && q.close[i]]).filter(p => p[1] != null).map(p => [p[0], +p[1].toFixed(4)]);
    const last = m.regularMarketPrice ?? (pts.length ? pts[pts.length - 1][1] : null), prev = m.chartPreviousClose ?? m.previousClose ?? null;
    return { s: sym, n: name || m.shortName || sym, w: m.currency || '', kurs: last, vortag: prev, pct: last != null && prev ? +((last / prev - 1) * 100).toFixed(2) : null, zeit: m.regularMarketTime ? m.regularMarketTime * 1000 : null, boerse: m.exchangeName || '', serie: pts };
  } catch (e) { return { s: sym, n: name || sym, fehler: String(e.message || e) }; }
  finally { clearTimeout(to); }
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const list = req.query.s ? String(req.query.s).split(',').slice(0, 12).map(x => [x.trim().toUpperCase(), '']).filter(x => /^[\^A-Z0-9.=\-]{1,15}$/.test(x[0])) : DEF;
  const out = await Promise.all(list.map(([s, n]) => one(s, n)));
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.status(out.some(x => x.kurs != null) ? 200 : 502).json({ quelle: 'Yahoo Finance (je nach Börse bis 15 Min. verzögert)', stand: new Date().toISOString(), kurse: out });
}
