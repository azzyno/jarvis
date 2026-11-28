// Kostenloses Gehirn für JARVIS, wenn ElevenLabs nicht verfügbar ist.
// 1. Groq (gratis, sehr schnell) – braucht GROQ_KEY in Vercel
// 2. Fallback: Pollinations (gratis, ohne Schlüssel)
// Erwartet { messages: [...] } im OpenAI-Format, gibt { message, quelle } zurück.
import { cors, guard } from './_geo.js';

const SYSTEM = `Du bist JARVIS OMEGA – das persönliche Betriebssystem INFINITY OS deines Eigentümers. Du sprichst ihn mit "Boss" an (natürlich, nicht in jedem Satz) und SIEZT ihn immer (Sie, Ihr, Ihnen) – niemals "du/dein". Er lebt in Bern (Schweiz) und rechnet in CHF. "Hier", "bei mir", "zu Hause" = Bern.
Charakter: hochintelligent, vorausschauend, ruhig und souverän, loyal und diskret, gelegentlich trockener intelligenter Humor. Keine Floskeln, keine Wiederholungen, direkt und verständlich. Erkenne Zusammenhänge und schlage Sinnvolles vor. Behaupte nie, etwas getan oder geprüft zu haben, das du nicht wirklich mit einem Werkzeug getan hast. Hast du keinen Zugang zu etwas (z. B. E-Mails, Kalender, Onlyhair-Daten, Spotify-Statistik, Fahrzeugdaten, Rechnungen), sag ehrlich, dass dafür erst eine Verbindung eingerichtet werden muss.
Bei "[START]": Begrüsse passend zur Uhrzeit in Bern (Guten Morgen 5–11, Guten Tag 11–17, Guten Abend 17–22, danach "Noch wach, Boss?"), ein trockener Satz mit Bezug auf die mitgelieferten Fakten, frag was er wünscht. Max. drei kurze Sätze.
Du SPRICHST alles laut: antworte kurz (1–3 Sätze, bei komplexen Themen bis 6), gesprochen-natürlich, KEIN Markdown, keine Listen, keine Emojis, keine URLs. Zahlen so schreiben, wie man sie sagt. Deutsch als Standard, Schweizerdeutsch verstehen; antworte in der Sprache, in der er spricht (auch Englisch oder Kurmancî).
Werkzeuge – alles live, nie raten, nie Zahlen erfinden. Nutze sie aktiv: Nachrichten zu einem Thema → jarvis_news_search; Weltlage → jarvis_world_briefing; Persönliches (was weisst du über mich, meine Autos, Verträge …) → zuerst jarvis_memory_search; "merk dir …" → jarvis_memory_save (nie Passwörter, PINs oder Kartennummern speichern); Planeten (Entfernung jetzt) → jarvis_planet; Satelliten/ISS → jarvis_satellites (öffentlicher Katalog, geheime fehlen); Flugzeuge → jarvis_flights; Kameras/"wie sieht es in X aus" → jarvis_cameras (nur öffentliche Webcams); Route/Verkehr/Zug → jarvis_route; Wetter → jarvis_weather (ohne Ort: Bern); Kurse/Aktien → jarvis_market_lookup; Portfolio/Saxo → jarvis_get_portfolio (nur wenn er Saxo selbst verbunden hat, sonst sag, dass die Verbindung fehlt); Bereiche öffnen → jarvis_show_module; Sichtmodus (Wärmebild, Nachtsicht, Zielfernrohr, normal) → jarvis_vision.
Liefert ein Werkzeug nichts, sag es ehrlich. Kein Finanzberater: keine Kauf-/Verkaufsempfehlungen, keine Kursprognosen. Frage nie nach Passwörtern. Du führst nie selbst Orders aus.`;

const fn = (name, description, props = {}, req = []) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties: props, required: req } } });
const s = d => ({ type: 'string', description: d });
const TOOLS = [
  fn('jarvis_news_search', 'Weltweite Live-Nachrichtensuche zu einem Thema, einer Person, Firma, Aktie oder einem Land.', { thema: s('Suchbegriff') }, ['thema']),
  fn('jarvis_world_briefing', 'Aktuelle Weltlage mit Brennpunkten aus über 25 Nachrichtenquellen.'),
  fn('jarvis_memory_search', 'Persönliches Gedächtnis des Boss durchsuchen (verschlüsselt). Nutze es, bevor du sagst, dass du etwas über ihn nicht weisst.', { frage: { type: 'string', description: 'Suchbegriffe' } }, ['frage']),
  fn('jarvis_memory_save', 'Etwas Wichtiges, das der Boss über sich erzählt, dauerhaft merken. Nur auf seinen Wunsch oder bei klar persönlichen, dauerhaften Fakten.', { kategorie: { type: 'string', enum: ['Beruf', 'Onlyhair', 'Musik', 'Fahrzeuge', 'Wohnung', 'Finanzen', 'Verträge', 'Projekte', 'Kurdistan', 'Einkauf', 'Geräte', 'Termine', 'Gesundheit', 'Personen', 'Ziele', 'Sonstiges'] }, thema: { type: 'string', description: 'kurzer Titel, z. B. Wohnort' }, inhalt: { type: 'string' } }, ['kategorie', 'thema', 'inhalt']),
  fn('jarvis_open_vault', 'Den Tresor (Gedächtnis, Verbindungen, Protokoll) öffnen.'),
  fn('jarvis_planet', 'Live-Position eines Planeten: aktuelle Entfernung zur Sonne und zur Erde, Funk-Laufzeit.', { planet: { type: 'string', description: 'z. B. Mars, Jupiter' } }, ['planet']),
  fn('jarvis_satellites', 'Live-Satelliten: wie viele verfolgt, welche gerade über Bern, wo die ISS ist.'),
  fn('jarvis_flights', 'Live-Flugzeuge in der Nähe eines Ortes (ADS-B).', { ort: s('Ort, leer = aktuelle Kartenansicht') }),
  fn('jarvis_cameras', 'Öffentliche Live-Webcams an einem Ort zeigen.', { ort: s('Ort oder Stadt, leer = Bern') }),
  fn('jarvis_route', 'Route mit Live-Verkehr, nächster Zugverbindung und Wetter am Ziel.', { ziel: s('Zielort'), start: s('Startort, leer = Bern') }, ['ziel']),
  fn('jarvis_weather', 'Detailliertes Wetter jetzt, stündlich und für die Woche.', { ort: s('Ort, leer = Bern') }),
  fn('jarvis_market_lookup', 'Aktueller Kurs und Infos zu Aktie, Index, Krypto oder Firma.', { query: s('Name oder Ticker') }, ['query']),
  fn('jarvis_get_portfolio', 'Saxo-Konto: Vermögen, Positionen, Gewinn/Verlust.'),
  fn('jarvis_show_module', 'Bereich der App öffnen.', { module: { type: 'string', enum: ['core', 'office', 'finance', 'market', 'realestate', 'hub'] } }, ['module']),
  fn('jarvis_vision', 'Sichtmodus der Erde umschalten.', { modus: { type: 'string', enum: ['normal', 'thermal', 'night', 'scope'] } }, ['modus']),
];

function cleanKey(v) {
  v = String(v || '');
  const m = v.match(/AIza[0-9A-Za-z_\-]{20,}|AQ\.[A-Za-z0-9_\-.]{20,}/);
  return m ? m[0] : v.replace(/[\s"'`]/g, '');
}

async function call(url, key, model, messages) {
  key = cleanKey(key);
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 25000);
  try {
    const r = await fetch(url, { method: 'POST', signal: ac.signal, headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: 'Bearer ' + key } : {}) },
      body: JSON.stringify({ model, messages, tools: TOOLS, tool_choice: 'auto', temperature: 0.7, max_tokens: 600 }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e0 = Array.isArray(d) ? d[0] && d[0].error : d.error; throw new Error('HTTP ' + r.status + ' ' + ((e0 && (e0.message || JSON.stringify(e0))) || '')); }
    const m = d.choices && d.choices[0] && d.choices[0].message; if (!m) throw new Error('leere Antwort');
    return { role: 'assistant', content: m.content || '', tool_calls: m.tool_calls && m.tool_calls.length ? m.tool_calls : undefined };
  } finally { clearTimeout(to); }
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && !guard(req, res, { perMin: 40 })) return;
  if (req.method === 'GET') {
    const st = { groq: !!process.env.GROQ_KEY, gemini: !!process.env.GEMINI_KEY };
    return res.status(200).json(st);
  }
  let body = req.body; if (typeof body === 'string') try { body = JSON.parse(body); } catch (e) { body = {}; }
  const hist = (body && Array.isArray(body.messages) ? body.messages : []).slice(-24);
  const zeit = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const messages = [{ role: 'system', content: SYSTEM + `\nJetzt in Bern: ${zeit}.` }, ...hist];
  const errs = [];
  if (process.env.GROQ_KEY) {
    for (const model of ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']) {
      try { return res.status(200).json({ message: await call('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_KEY, model, messages), quelle: 'groq:' + model }); }
      catch (e) { errs.push('groq ' + model + ': ' + e.message); }
    }
  }
  if (process.env.GEMINI_KEY) {
    for (const model of ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.8-flash']) {
      try { return res.status(200).json({ message: await call('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', process.env.GEMINI_KEY, model, messages), quelle: 'gemini:' + model }); }
      catch (e) { errs.push('gemini ' + model + ': ' + e.message); }
    }
  }
  try { return res.status(200).json({ message: await call('https://text.pollinations.ai/openai', '', 'openai', messages), quelle: 'pollinations' }); }
  catch (e) { errs.push('pollinations: ' + e.message); }
  return res.status(502).json({ error: 'Kein Sprachmodell erreichbar', details: errs });
}
