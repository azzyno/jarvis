// Kleiner Vermittler fuer den Saxo-Token-Abruf (Saxo erlaubt diesen Schritt nicht direkt aus dem Browser).
// Speichert nichts, leitet nur weiter. Nur fuer JARVIS auf azzyno.github.io.
const ALLOWED = ['https://azzyno.github.io'];
const AUTH = { sim: 'https://sim.logonvalidation.net/token', live: 'https://live.logonvalidation.net/token' };

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'nur POST' });
  if (!ALLOWED.includes(origin)) return res.status(403).json({ error: 'Herkunft nicht erlaubt' });

  const env = req.query.env === 'live' ? 'live' : 'sim';
  let body = req.body || {};
  if (typeof body === 'string') body = Object.fromEntries(new URLSearchParams(body));
  if (!['authorization_code', 'refresh_token'].includes(body.grant_type)) return res.status(400).json({ error: 'grant_type' });

  try {
    const r = await fetch(AUTH[env], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: 'Saxo nicht erreichbar' });
  }
}
