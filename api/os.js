// JARVIS OMEGA · INFINITY OS – privater Kern
// Anmeldung mit Passkey (Face ID / Touch ID), verschlüsseltes Gedächtnis, Verbindungen, Zugriffsprotokoll.
// Datenbank: jede Postgres-Datenbank (Vercel Storage → Neon oder Supabase setzt POSTGRES_URL automatisch).
// Tabellen werden beim ersten Aufruf selbst angelegt.
import crypto from 'node:crypto';
import pg from 'pg';
import { cors, guard } from './_geo.js';

const E = process.env;
const DBURL = E.POSTGRES_URL || E.DATABASE_URL || E.POSTGRES_URL_NON_POOLING || E.POSTGRES_PRISMA_URL || '';
const RP_ID = E.RP_ID || 'azzyno.github.io';
const ORIGIN = E.RP_ORIGIN || 'https://azzyno.github.io';
const KATEGORIEN = ['Beruf', 'Onlyhair', 'Musik', 'Fahrzeuge', 'Wohnung', 'Finanzen', 'Verträge', 'Projekte', 'Kurdistan', 'Einkauf', 'Geräte', 'Termine', 'Gesundheit', 'Personen', 'Ziele', 'Sonstiges'];

/* ---------- Datenbank ---------- */
let pool = null, ready = null;
function db() {
  if (!pool) pool = new pg.Pool({ connectionString: DBURL.replace(/[?&]sslmode=[^&]*/, ''), ssl: /localhost|127\.0\.0\.1/.test(DBURL) ? false : { rejectUnauthorized: false }, max: 3, idleTimeoutMillis: 10000 });
  return pool;
}
const q = async (sql, args = []) => (await db().query(sql, args)).rows;
function schema() {
  if (!ready) ready = q(`
    create table if not exists jv_memories (id bigserial primary key, kategorie text not null default 'Sonstiges', thema text not null, thema_tag text not null, inhalt text not null, quelle text default 'manuell', status text not null default 'gueltig', ersetzt_durch bigint, erstellt timestamptz not null default now(), aktualisiert timestamptz not null default now());
    create index if not exists jv_mem_tag on jv_memories (thema_tag, status);
    create table if not exists jv_audit (id bigserial primary key, zeit timestamptz not null default now(), aktion text not null, detail text, ip text);
    create table if not exists jv_keys (id text primary key, jwk jsonb not null, alg int not null, zaehler bigint not null default 0, geraet text, erstellt timestamptz not null default now());
    create table if not exists jv_sessions (hash text primary key, ablauf timestamptz not null, erstellt timestamptz not null default now());
    create table if not exists jv_challenges (c text primary key, art text not null, ablauf timestamptz not null);
    do $$ begin
      if exists (select 1 from pg_roles where rolname='anon') then
        execute 'alter table jv_memories enable row level security; alter table jv_audit enable row level security; alter table jv_keys enable row level security; alter table jv_sessions enable row level security; alter table jv_challenges enable row level security';
        execute 'revoke all on jv_memories, jv_audit, jv_keys, jv_sessions, jv_challenges from anon';
      end if;
      if exists (select 1 from pg_roles where rolname='authenticated') then
        execute 'revoke all on jv_memories, jv_audit, jv_keys, jv_sessions, jv_challenges from authenticated';
      end if;
    end $$;`).catch(e => { ready = null; throw e; });
  return ready;
}

/* ---------- Verschlüsselung (AES-256-GCM) ---------- */
function vaultKey() {
  const raw = String(E.VAULT_KEY || '').trim();
  if (raw.length >= 32) return crypto.createHash('sha256').update(Buffer.from(raw, /^[A-Za-z0-9+/=]{40,}$/.test(raw) ? 'base64' : 'utf8')).digest();
  // Ohne VAULT_KEY: aus dem Datenbank-Passwort ableiten (schützt gegen gestohlene Datenbank-Kopien ohne Passwort)
  const pw = (() => { try { return decodeURIComponent(new URL(DBURL).password); } catch (e) { return ''; } })();
  if (!pw) throw new Error('kein Schlüssel');
  return crypto.scryptSync(pw, 'jarvis-omega-tresor-v1', 32);
}
const enc = t => { const k = vaultKey(), iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', k, iv); const x = Buffer.concat([c.update(String(t), 'utf8'), c.final()]); return 'v1.' + Buffer.concat([iv, c.getAuthTag(), x]).toString('base64'); };
const dec = s => { if (!s || !String(s).startsWith('v1.')) return s; const b = Buffer.from(String(s).slice(3), 'base64'); const d = crypto.createDecipheriv('aes-256-gcm', vaultKey(), b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'); };
const tag = t => crypto.createHmac('sha256', vaultKey()).update(String(t).trim().toLowerCase()).digest('hex').slice(0, 40);
const sha = b => crypto.createHash('sha256').update(b).digest();
const b64u = b => Buffer.from(b).toString('base64url');
const unb64u = s => Buffer.from(String(s || ''), 'base64url');

/* ---------- Passkey (WebAuthn) ---------- */
function cbor(buf, o = 0) {
  const ib = buf[o++], mt = ib >> 5, ai = ib & 31;
  let len = ai;
  if (ai === 24) len = buf[o++]; else if (ai === 25) { len = buf.readUInt16BE(o); o += 2; } else if (ai === 26) { len = buf.readUInt32BE(o); o += 4; } else if (ai > 26) throw new Error('CBOR');
  if (mt === 0) return [len, o];
  if (mt === 1) return [-1 - len, o];
  if (mt === 2) return [buf.subarray(o, o + len), o + len];
  if (mt === 3) return [buf.subarray(o, o + len).toString('utf8'), o + len];
  if (mt === 4) { const a = []; for (let i = 0; i < len; i++) { const [v, n] = cbor(buf, o); a.push(v); o = n; } return [a, o]; }
  if (mt === 5) { const m = new Map(); for (let i = 0; i < len; i++) { const [k, n] = cbor(buf, o); const [v, n2] = cbor(buf, n); m.set(k, v); o = n2; } return [m, o]; }
  if (mt === 7) return [ai === 21 ? true : ai === 20 ? false : null, o];
  throw new Error('CBOR-Typ');
}
function coseToJwk(m) {
  const alg = m.get(3);
  if (m.get(1) === 2) return { alg, jwk: { kty: 'EC', crv: 'P-256', x: b64u(m.get(-2)), y: b64u(m.get(-3)) } };
  if (m.get(1) === 3) return { alg, jwk: { kty: 'RSA', n: b64u(m.get(-1)), e: b64u(m.get(-2)) } };
  throw new Error('Schlüsseltyp nicht unterstützt');
}
function authData(b) {
  const r = { rpIdHash: b.subarray(0, 32), flags: b[32], count: b.readUInt32BE(33) };
  if (r.flags & 0x40) { const l = b.readUInt16BE(53); r.credId = b.subarray(55, 55 + l); r.cose = cbor(b, 55 + l)[0]; }
  return r;
}
async function challenge(art) { const c = b64u(crypto.randomBytes(32)); await q('delete from jv_challenges where ablauf < now()'); await q("insert into jv_challenges (c, art, ablauf) values ($1, $2, now() + interval '5 minutes')", [c, art]); return c; }
async function useChallenge(clientData, art, type) {
  const cd = JSON.parse(unb64u(clientData).toString('utf8'));
  if (cd.type !== type) throw new Error('falscher Typ');
  if (cd.origin !== ORIGIN) throw new Error('falsche Herkunft');
  const r = await q('delete from jv_challenges where c = $1 and art = $2 and ablauf > now() returning c', [cd.challenge, art]);
  if (!r.length) throw new Error('Anfrage abgelaufen – bitte nochmals');
}
async function newSession() { const t = b64u(crypto.randomBytes(32)); await q("insert into jv_sessions (hash, ablauf) values ($1, now() + interval '30 days')", [sha(t).toString('hex')]); await q('delete from jv_sessions where ablauf < now()'); return t; }
async function session(req) {
  const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); if (!t) return false;
  return (await q('select 1 from jv_sessions where hash = $1 and ablauf > now()', [sha(t).toString('hex')])).length > 0;
}

const ipHash = req => crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || '').split(',')[0] + DBURL.slice(-12)).digest('hex').slice(0, 16);
async function audit(req, aktion, detail = '') { try { await q('insert into jv_audit (aktion, detail, ip) values ($1, $2, $3)', [aktion, String(detail).slice(0, 200), ipHash(req)]); } catch (e) {} }
const row = m => ({ id: +m.id, kategorie: m.kategorie, thema: dec(m.thema), inhalt: dec(m.inhalt), quelle: m.quelle, status: m.status, erstellt: m.erstellt, aktualisiert: m.aktualisiert, ersetzt_durch: m.ersetzt_durch && +m.ersetzt_durch });

function connectors() {
  const s = (name, bereich, ok, art, rechte, hinweis) => ({ name, bereich, status: ok ? 'verbunden' : 'nicht verbunden', art, rechte, hinweis });
  return [
    s('Google Gemini', 'Gehirn, Stimme, Ohr', !!E.GEMINI_KEY, 'Schlüssel (Server)', 'lesen', 'Gratis-Stufe mit Tageslimit'),
    s('Groq', 'Gehirn (Reserve)', !!E.GROQ_KEY, 'Schlüssel (Server)', 'lesen', ''),
    s('Datenbank (Postgres)', 'Gedächtnis & Anmeldung', !!DBURL, 'Vercel Storage', 'lesen + schreiben', E.VAULT_KEY ? 'eigener Tresor-Schlüssel' : 'Tresor-Schlüssel aus Datenbank-Passwort abgeleitet'),
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const a = String((req.query && req.query.a) || '');

  if (a === 'health') {
    const out = { datenbank: !!DBURL, tabellen: false, vault: false, eigner: false, vault_eigen: !!E.VAULT_KEY };
    if (DBURL) { try { await schema(); out.tabellen = true; out.eigner = (await q('select count(*)::int n from jv_keys'))[0].n > 0; } catch (e) { out.fehler = String(e.message).replace(/postgres(ql)?:\/\/\S+/g, '…').slice(0, 120); } }
    try { out.vault = dec(enc('ok')) === 'ok'; } catch (e) {}
    return res.status(200).json(out);
  }

  if (!guard(req, res, { perMin: 60 })) return;
  if (!DBURL) return res.status(503).json({ error: 'Gedächtnis ist noch nicht eingerichtet.' });
  let b = req.body; if (typeof b === 'string') try { b = JSON.parse(b); } catch (e) { b = {}; } b = b || {};

  try {
    await schema();
    const claimed = (await q('select count(*)::int n from jv_keys'))[0].n > 0;
    const authed = await session(req);

    if (a === 'reg-start') {
      if (claimed && !authed) return res.status(403).json({ error: 'Es ist bereits ein Eigentümer eingerichtet. Melden Sie sich zuerst an.' });
      const c = await challenge('reg');
      const ex = await q('select id from jv_keys');
      return res.status(200).json({ challenge: c, rp: { id: RP_ID, name: 'JARVIS OMEGA' }, user: { id: b64u(Buffer.from('boss')), name: 'Boss', displayName: 'Boss' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], timeout: 60000, attestation: 'none',
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' }, excludeCredentials: ex.map(k => ({ type: 'public-key', id: k.id })) });
    }
    if (a === 'reg-finish') {
      if (claimed && !authed) return res.status(403).json({ error: 'Nicht erlaubt.' });
      await useChallenge(b.clientDataJSON, 'reg', 'webauthn.create');
      const att = cbor(unb64u(b.attestationObject))[0];
      const ad = authData(att.get('authData'));
      if (!ad.rpIdHash.equals(sha(RP_ID))) throw new Error('falsche Seite');
      if (!(ad.flags & 1) || !(ad.flags & 4)) throw new Error('Face ID / Touch ID nötig');
      const { alg, jwk } = coseToJwk(ad.cose);
      await q('insert into jv_keys (id, jwk, alg, zaehler, geraet) values ($1, $2, $3, $4, $5)', [b64u(ad.credId), jwk, alg, ad.count, String(b.geraet || '').slice(0, 60)]);
      await audit(req, claimed ? 'passkey hinzugefügt' : 'eigentümer eingerichtet', b.geraet || '');
      return res.status(200).json({ ok: true, token: await newSession() });
    }
    if (a === 'login-start') {
      if (!claimed) return res.status(409).json({ error: 'Noch kein Eigentümer eingerichtet.', einrichten: true });
      const ex = await q('select id from jv_keys');
      return res.status(200).json({ challenge: await challenge('login'), rpId: RP_ID, timeout: 60000, userVerification: 'required', allowCredentials: ex.map(k => ({ type: 'public-key', id: k.id })) });
    }
    if (a === 'login-finish') {
      await useChallenge(b.clientDataJSON, 'login', 'webauthn.get');
      const k = (await q('select * from jv_keys where id = $1', [b.id]))[0];
      if (!k) { await audit(req, 'unbekannter passkey'); return res.status(403).json({ error: 'Unbekannter Passkey.' }); }
      const ad = unb64u(b.authenticatorData), A = authData(ad);
      if (!A.rpIdHash.equals(sha(RP_ID)) || !(A.flags & 1) || !(A.flags & 4)) throw new Error('Prüfung fehlgeschlagen');
      const data = Buffer.concat([ad, sha(unb64u(b.clientDataJSON))]);
      const key = crypto.createPublicKey({ key: k.jwk, format: 'jwk' });
      const ok = k.alg === -7 ? crypto.verify('sha256', data, { key, dsaEncoding: 'der' }, unb64u(b.signature)) : crypto.verify('sha256', data, key, unb64u(b.signature));
      if (!ok) { await audit(req, 'anmeldung abgewiesen'); return res.status(403).json({ error: 'Unterschrift ungültig.' }); }
      if (A.count && +k.zaehler && A.count <= +k.zaehler) { await audit(req, 'passkey-zähler verdächtig'); return res.status(403).json({ error: 'Passkey-Zähler verdächtig.' }); }
      await q('update jv_keys set zaehler = $1 where id = $2', [A.count, k.id]);
      await audit(req, 'angemeldet');
      return res.status(200).json({ ok: true, token: await newSession() });
    }

    if (!authed) return res.status(401).json({ error: 'Bitte anmelden.', einrichten: !claimed });

    if (a === 'logout') { const t = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); await q('delete from jv_sessions where hash = $1', [sha(t).toString('hex')]); return res.status(200).json({ ok: true }); }
    if (a === 'me') return res.status(200).json({ kategorien: KATEGORIEN, geraete: await q('select geraet, erstellt from jv_keys order by erstellt') });

    if (a === 'list') {
      let l = (await q('select * from jv_memories order by aktualisiert desc limit 2000')).map(row);
      const s = String((req.query && req.query.q) || b.q || '').trim().toLowerCase();
      if (s) { const w = s.split(/\s+/).filter(x => x.length > 1); l = l.filter(m => w.every(x => (m.thema + ' ' + m.inhalt + ' ' + m.kategorie).toLowerCase().includes(x))); }
      if (req.query.kat) l = l.filter(m => m.kategorie === req.query.kat);
      if (!req.query.alle) l = l.filter(m => m.status === 'gueltig');
      return res.status(200).json({ anzahl: l.length, eintraege: l.slice(0, 200) });
    }
    if (a === 'save') {
      const thema = String(b.thema || '').trim().slice(0, 160), inhalt = String(b.inhalt || '').trim().slice(0, 8000);
      const kategorie = KATEGORIEN.includes(b.kategorie) ? b.kategorie : 'Sonstiges';
      if (!thema || !inhalt) return res.status(400).json({ error: 'Thema und Inhalt nötig.' });
      const alt = await q("select * from jv_memories where thema_tag = $1 and status = 'gueltig'", [tag(thema)]);
      if (alt.length && !b.ersetzen) {
        const a0 = row(alt[0]);
        if (a0.inhalt.trim().toLowerCase() === inhalt.toLowerCase()) return res.status(200).json({ ok: true, unveraendert: true, eintrag: a0 });
        return res.status(409).json({ widerspruch: true, bisher: a0, neu: { thema, inhalt, kategorie } });
      }
      const [neu] = await q('insert into jv_memories (kategorie, thema, thema_tag, inhalt, quelle) values ($1, $2, $3, $4, $5) returning *', [kategorie, enc(thema), tag(thema), enc(inhalt), String(b.quelle || 'manuell').slice(0, 80)]);
      if (alt.length) await q("update jv_memories set status = 'veraltet', ersetzt_durch = $1, aktualisiert = now() where id = any($2)", [neu.id, alt.map(x => x.id)]);
      await audit(req, alt.length ? 'ersetzt' : 'gespeichert', kategorie);
      return res.status(200).json({ ok: true, eintrag: row(neu), ersetzt: alt.length });
    }
    if (a === 'invalidate' || a === 'delete') {
      const id = parseInt(b.id, 10); if (!id) return res.status(400).json({ error: 'id fehlt' });
      if (a === 'delete') { if (b.bestaetigt !== true) return res.status(400).json({ error: 'Löschen braucht Bestätigung.' }); await q('delete from jv_memories where id = $1', [id]); }
      else await q("update jv_memories set status = 'ungueltig', aktualisiert = now() where id = $1", [id]);
      await audit(req, a === 'delete' ? 'gelöscht' : 'ungültig', String(id));
      return res.status(200).json({ ok: true });
    }
    if (a === 'import') {
      const items = (Array.isArray(b.eintraege) ? b.eintraege.slice(0, 300) : []).map(x => ({ thema: String(x.thema || x.inhalt || '').trim().slice(0, 160), inhalt: String(x.inhalt || '').trim().slice(0, 8000), kategorie: KATEGORIEN.includes(x.kategorie) ? x.kategorie : 'Sonstiges' })).filter(x => x.thema && x.inhalt);
      const quelle = String(b.quelle || 'Import').slice(0, 80);
      for (const x of items) await q('insert into jv_memories (kategorie, thema, thema_tag, inhalt, quelle) values ($1, $2, $3, $4, $5)', [x.kategorie, enc(x.thema), tag(x.thema), enc(x.inhalt), quelle]);
      await audit(req, 'import', items.length + ' Einträge');
      return res.status(200).json({ ok: true, importiert: items.length });
    }
    if (a === 'export') {
      const d = (await q('select * from jv_memories order by erstellt')).map(row);
      await audit(req, 'export', d.length + ' Einträge');
      return res.status(200).json({ exportiert: new Date().toISOString(), eintraege: d });
    }
    if (a === 'audit') return res.status(200).json({ eintraege: await q('select zeit, aktion, detail from jv_audit order by zeit desc limit 50') });
    if (a === 'connectors') return res.status(200).json({ verbindungen: connectors() });
    return res.status(400).json({ error: 'unbekannte Aktion' });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e).replace(/postgres(ql)?:\/\/\S+/g, '…').slice(0, 200) });
  }
}
