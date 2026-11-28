// JARVIS OMEGA · INFINITY OS – privater Kern
// Gedächtnis (verschlüsselt), Verbindungszentrale, Zugriffsprotokoll.
// Zugang nur für den Eigentümer (OWNER_EMAIL) mit gültiger Supabase-Anmeldung.
// Benötigte Vercel-Variablen: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, OWNER_EMAIL, VAULT_KEY
import crypto from 'node:crypto';
import { cors, guard } from './_geo.js';

const E = process.env;
const URL_ = (E.SUPABASE_URL || '').replace(/\/+$/, '');
const KATEGORIEN = ['Beruf', 'Onlyhair', 'Musik', 'Fahrzeuge', 'Wohnung', 'Finanzen', 'Verträge', 'Projekte', 'Kurdistan', 'Einkauf', 'Geräte', 'Termine', 'Gesundheit', 'Personen', 'Ziele', 'Sonstiges'];

/* ---------- Verschlüsselung (AES-256-GCM) ---------- */
function vaultKey() {
  const raw = String(E.VAULT_KEY || '').trim();
  const b = Buffer.from(raw, /^[A-Za-z0-9+/=]{40,}$/.test(raw) ? 'base64' : 'utf8');
  if (b.length < 32) throw new Error('VAULT_KEY zu kurz');
  return crypto.createHash('sha256').update(b).digest();
}
const enc = t => { const k = vaultKey(), iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', k, iv); const x = Buffer.concat([c.update(String(t), 'utf8'), c.final()]); return 'v1.' + Buffer.concat([iv, c.getAuthTag(), x]).toString('base64'); };
const dec = s => { if (!s || !String(s).startsWith('v1.')) return s; const b = Buffer.from(String(s).slice(3), 'base64'); const d = crypto.createDecipheriv('aes-256-gcm', vaultKey(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); };
const tag = t => crypto.createHmac('sha256', vaultKey()).update(String(t).trim().toLowerCase()).digest('hex').slice(0, 40);

/* ---------- Supabase (Server-Schlüssel, nur hier) ---------- */
async function db(path, opt = {}) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...opt, headers: { apikey: E.SUPABASE_SERVICE_KEY, ...(String(E.SUPABASE_SERVICE_KEY).startsWith('eyJ') ? { Authorization: 'Bearer ' + E.SUPABASE_SERVICE_KEY } : {}), 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opt.headers || {}) } });
  const t = await r.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
  if (!r.ok) throw new Error('Datenbank ' + r.status + ': ' + (d && (d.message || d.hint) || t).toString().slice(0, 160));
  return d;
}
async function owner(req) {
  const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!tok) return null;
  const r = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: E.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + tok } });
  if (!r.ok) return null;
  const u = await r.json();
  if (!u || !u.email || u.email.toLowerCase() !== String(E.OWNER_EMAIL || '').trim().toLowerCase()) return { fremd: true, email: u && u.email };
  return u;
}
const ipHash = req => crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || '').split(',')[0] + (E.VAULT_KEY || '')).digest('hex').slice(0, 16);
async function audit(req, aktion, detail = '') { try { await db('audit', { method: 'POST', body: JSON.stringify({ aktion, detail: String(detail).slice(0, 200), ip: ipHash(req) }), headers: { Prefer: 'return=minimal' } }); } catch (e) {} }

const row = m => ({ id: m.id, kategorie: m.kategorie, thema: dec(m.thema), inhalt: dec(m.inhalt), quelle: m.quelle, status: m.status, erstellt: m.erstellt, aktualisiert: m.aktualisiert, ersetzt_durch: m.ersetzt_durch });

/* ---------- Verbindungszentrale: echte Prüfung, keine Fake-Verbindungen ---------- */
function connectors() {
  const s = (name, bereich, ok, art, rechte, hinweis) => ({ name, bereich, status: ok ? 'verbunden' : 'nicht verbunden', art, rechte, hinweis });
  return [
    s('Google Gemini', 'Gehirn, Stimme, Ohr', !!E.GEMINI_KEY, 'Schlüssel (Server)', 'lesen', 'Gratis-Stufe mit Tageslimit'),
    s('Groq', 'Gehirn (Reserve)', !!E.GROQ_KEY, 'Schlüssel (Server)', 'lesen', ''),
    s('Supabase', 'Gedächtnis & Anmeldung', !!(URL_ && E.SUPABASE_SERVICE_KEY), 'Schlüssel (Server)', 'lesen + schreiben', 'Gratis bis 500 MB'),
    s('Windy Webcams', 'Weltlage', !!E.WINDY_KEY, 'Schlüssel (Server)', 'lesen', ''),
    s('TomTom', 'Route & Verkehr', !!E.TOMTOM_KEY, 'Schlüssel (Server)', 'lesen', ''),
    s('Open-Meteo, USGS, GDELT, CelesTrak, adsb.lol, Yahoo', 'Weltdaten', true, 'öffentlich', 'lesen', 'ohne Konto'),
    s('Saxo Bank', 'Depot (Simulation)', false, 'OAuth im Browser', 'lesen', 'Verbindung in der klassischen Ansicht → Finanzen'),
    s('Gmail / Kalender', 'Kommunikation', false, 'OAuth', '–', 'Phase 3'),
    s('Salonkee', 'Onlyhair', false, 'Export / API', '–', 'braucht Datenexport oder offiziellen Zugang'),
    s('Spotify for Artists', 'AZZYNO', false, 'Export', '–', 'keine öffentliche API, CSV-Import geplant'),
    s('myAudi / BMW ConnectedDrive', 'Fahrzeuge', false, '–', '–', 'keine offene API für Private'),
  ];
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); return res.status(204).end(); }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  const a = String((req.query && req.query.a) || '');

  // Öffentlich: nur Ja/Nein, welche Einstellungen vorhanden sind (nie Werte)
  if (a === 'health') {
    let vault = false; try { vault = dec(enc('ok')) === 'ok'; } catch (e) {}
    let tabellen = false; if (URL_ && E.SUPABASE_SERVICE_KEY) { try { await db('memories?select=id&limit=1'); await db('audit?select=id&limit=1'); tabellen = true; } catch (e) {} }
    return res.status(200).json({ supabase_url: !!URL_, anon: !!E.SUPABASE_ANON_KEY, service: !!E.SUPABASE_SERVICE_KEY, owner: !!E.OWNER_EMAIL, vault, tabellen });
  }
  if (a === 'config') return res.status(200).json({ url: URL_ || null, anon: E.SUPABASE_ANON_KEY || null });   // beides öffentlich gedacht (Anmeldung)

  if (!guard(req, res, { perMin: 60 })) return;
  if (!URL_ || !E.SUPABASE_SERVICE_KEY || !E.VAULT_KEY || !E.OWNER_EMAIL) return res.status(503).json({ error: 'Gedächtnis ist noch nicht eingerichtet.' });
  const u = await owner(req);
  if (!u) return res.status(401).json({ error: 'Bitte anmelden.' });
  if (u.fremd) { await audit(req, 'abgewiesen', u.email || ''); return res.status(403).json({ error: 'Dieses Konto ist nicht der Eigentümer.' }); }

  let b = req.body; if (typeof b === 'string') try { b = JSON.parse(b); } catch (e) { b = {}; } b = b || {};
  try {
    if (a === 'me') return res.status(200).json({ email: u.email, kategorien: KATEGORIEN });

    if (a === 'list') {
      const d = await db('memories?select=*&order=aktualisiert.desc&limit=1000');
      let l = d.map(row);
      const q = String(req.query.q || b.q || '').trim().toLowerCase();
      if (q) { const w = q.split(/\s+/).filter(x => x.length > 1); l = l.filter(m => w.every(x => (m.thema + ' ' + m.inhalt + ' ' + m.kategorie).toLowerCase().includes(x))); }
      if (req.query.kat) l = l.filter(m => m.kategorie === req.query.kat);
      if (!req.query.alle) l = l.filter(m => m.status === 'gueltig');
      return res.status(200).json({ anzahl: l.length, eintraege: l.slice(0, 200) });
    }

    if (a === 'save') {
      const thema = String(b.thema || '').trim().slice(0, 160), inhalt = String(b.inhalt || '').trim().slice(0, 8000);
      const kategorie = KATEGORIEN.includes(b.kategorie) ? b.kategorie : 'Sonstiges';
      if (!thema || !inhalt) return res.status(400).json({ error: 'Thema und Inhalt nötig.' });
      const quelle = String(b.quelle || 'manuell').slice(0, 80);
      // Widerspruch: gibt es schon einen gültigen Eintrag zum selben Thema?
      const alt = await db(`memories?select=*&thema_tag=eq.${tag(thema)}&status=eq.gueltig`);
      if (alt.length && !b.ersetzen) {
        const a0 = row(alt[0]);
        if (a0.inhalt.trim().toLowerCase() === inhalt.toLowerCase()) return res.status(200).json({ ok: true, unveraendert: true, eintrag: a0 });
        return res.status(409).json({ widerspruch: true, bisher: a0, neu: { thema, inhalt, kategorie }, hinweis: 'Zu diesem Thema ist schon etwas anderes gespeichert. Mit „ersetzen“ wird der alte Eintrag als veraltet markiert.' });
      }
      const [neu] = await db('memories', { method: 'POST', body: JSON.stringify({ kategorie, thema: enc(thema), thema_tag: tag(thema), inhalt: enc(inhalt), quelle, status: 'gueltig' }) });
      for (const o of alt) await db(`memories?id=eq.${o.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'veraltet', ersetzt_durch: neu.id, aktualisiert: new Date().toISOString() }) });
      await audit(req, alt.length ? 'ersetzt' : 'gespeichert', kategorie);
      return res.status(200).json({ ok: true, eintrag: row(neu), ersetzt: alt.length });
    }

    if (a === 'invalidate' || a === 'delete') {
      const id = parseInt(b.id, 10); if (!id) return res.status(400).json({ error: 'id fehlt' });
      if (a === 'delete') { if (b.bestaetigt !== true) return res.status(400).json({ error: 'Löschen braucht Bestätigung.' }); await db(`memories?id=eq.${id}`, { method: 'DELETE' }); }
      else await db(`memories?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ungueltig', aktualisiert: new Date().toISOString() }) });
      await audit(req, a === 'delete' ? 'geloescht' : 'ungueltig', String(id));
      return res.status(200).json({ ok: true });
    }

    if (a === 'import') {
      const items = Array.isArray(b.eintraege) ? b.eintraege.slice(0, 300) : [];
      const quelle = String(b.quelle || 'Import').slice(0, 80);
      const rows = items.map(x => ({ thema: String(x.thema || x.inhalt || '').trim().slice(0, 160), inhalt: String(x.inhalt || '').trim().slice(0, 8000), kategorie: KATEGORIEN.includes(x.kategorie) ? x.kategorie : 'Sonstiges' })).filter(x => x.thema && x.inhalt)
        .map(x => ({ kategorie: x.kategorie, thema: enc(x.thema), thema_tag: tag(x.thema), inhalt: enc(x.inhalt), quelle, status: 'gueltig' }));
      if (rows.length) await db('memories', { method: 'POST', body: JSON.stringify(rows), headers: { Prefer: 'return=minimal' } });
      await audit(req, 'import', rows.length + ' Einträge');
      return res.status(200).json({ ok: true, importiert: rows.length });
    }

    if (a === 'export') {
      const d = await db('memories?select=*&order=erstellt.asc');
      await audit(req, 'export', d.length + ' Einträge');
      return res.status(200).json({ exportiert: new Date().toISOString(), eintraege: d.map(row) });
    }

    if (a === 'audit') return res.status(200).json({ eintraege: await db('audit?select=zeit,aktion,detail&order=zeit.desc&limit=50') });
    if (a === 'connectors') return res.status(200).json({ verbindungen: connectors() });

    return res.status(400).json({ error: 'unbekannte Aktion' });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e).slice(0, 200) });
  }
}
