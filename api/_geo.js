// Gemeinsame Helfer: Ortssuche (Open-Meteo Geocoding) und Wetter (Open-Meteo Forecast).
export const ALLOWED = ['https://azzyno.github.io', ...(process.env.EXTRA_ORIGIN ? [process.env.EXTRA_ORIGIN] : [])];
export function cors(req, res) {
  const o = req.headers.origin || '';
  if (ALLOWED.includes(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
}
/* Schutz für kostenpflichtige/kontingentierte Endpunkte (Gemini):
   nur Aufrufe aus JARVIS selbst, Mengenbegrenzung pro IP (pro Server-Instanz). */
const HITS = new Map();
export function guard(req, res, { perMin = 30 } = {}) {
  const o = req.headers.origin || '', ref = req.headers.referer || '';
  const own = ALLOWED.includes(o) || ALLOWED.some(a => ref.startsWith(a + '/'));
  if (!own) { res.status(403).json({ error: 'Nur aus JARVIS erlaubt.' }); return false; }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const now = Date.now(), win = HITS.get(ip) || [];
  const recent = win.filter(t => now - t < 60000); recent.push(now); HITS.set(ip, recent);
  if (HITS.size > 5000) HITS.clear();
  if (recent.length > perMin) { res.status(429).json({ error: 'Zu viele Anfragen – kurz warten.' }); return false; }
  return true;
}
export async function getJson(u, ms = 7000, headers = {}) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(u, { signal: ac.signal, headers: { 'User-Agent': 'JARVIS-Omega/1.0', ...headers } }); if (!r.ok) throw new Error(u.split('/')[2] + ' ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
export async function geocode(q) {
  const j = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=de&format=json`);
  const r = j.results && j.results[0]; if (!r) throw new Error(`Ort „${q}“ nicht gefunden`);
  return { name: r.name, land: r.country, region: r.admin1 || '', lat: r.latitude, lon: r.longitude, tz: r.timezone, einwohner: r.population || null };
}
export const WMO = c => c == null ? '' : c === 0 ? 'klar' : c <= 2 ? 'leicht bewölkt' : c === 3 ? 'bedeckt' : c <= 48 ? 'Nebel' : c <= 57 ? 'Nieselregen' : c <= 67 ? 'Regen' : c <= 77 ? 'Schnee' : c <= 82 ? 'Regenschauer' : c <= 86 ? 'Schneeschauer' : 'Gewitter';
export async function forecast(lat, lon) {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=auto&forecast_days=7`
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m'
    + '&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,sunrise,sunset,uv_index_max';
  const j = await getJson(u);
  const c = j.current || {}; const H = j.hourly || {}; const D = j.daily || {};
  const nowIdx = Math.max(0, (H.time || []).findIndex(t => t >= (c.time || '')));
  const stunden = (H.time || []).slice(nowIdx, nowIdx + 12).map((t, i) => ({ zeit: t.slice(11, 16), temp: H.temperature_2m[nowIdx + i], regen_prozent: H.precipitation_probability?.[nowIdx + i], regen_mm: H.precipitation?.[nowIdx + i], wetter: WMO(H.weather_code[nowIdx + i]), wind: H.wind_speed_10m?.[nowIdx + i] }));
  const tage = (D.time || []).map((t, i) => ({ datum: t, wetter: WMO(D.weather_code[i]), max: D.temperature_2m_max[i], min: D.temperature_2m_min[i], regen_mm: D.precipitation_sum[i], regen_prozent: D.precipitation_probability_max?.[i], boeen: D.wind_gusts_10m_max?.[i], uv: D.uv_index_max?.[i], sonnenaufgang: D.sunrise?.[i]?.slice(11), sonnenuntergang: D.sunset?.[i]?.slice(11) }));
  return { jetzt: { zeit: c.time, temp: c.temperature_2m, gefuehlt: c.apparent_temperature, feuchte: c.relative_humidity_2m, niederschlag: c.precipitation, wetter: WMO(c.weather_code), code: c.weather_code, wind: c.wind_speed_10m, boeen: c.wind_gusts_10m }, stunden, tage, zeitzone: j.timezone };
}
