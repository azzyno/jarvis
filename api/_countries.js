// Länder für die Weltlage: Stichwörter (de/en), Hauptstadt, Zeitzone, Kartenausschnitt, ECharts-Name.
export const COUNTRIES = [
  { c: 'US', n: 'USA', en: 'United States', cap: 'Washington', lat: 38.9, lon: -77.04, tz: 'America/New_York', box: [[-125, 24], [-66, 50]], k: ['usa', 'us-', 'trump', 'washington', 'weisses haus', 'weißes haus', 'white house', 'amerika', 'united states', 'pentagon', 'kongress', 'congress', 'senat', 'senate', 'vance'] },
  { c: 'DE', n: 'Deutschland', en: 'Germany', cap: 'Berlin', lat: 52.52, lon: 13.4, tz: 'Europe/Berlin', box: [[5.5, 47], [15.5, 55.2]], k: ['deutschland', 'berlin', 'bundesregierung', 'merz', 'kanzler', 'bundestag', 'germany', 'german', 'deutsche'] },
  { c: 'CH', n: 'Schweiz', en: 'Switzerland', cap: 'Bern', lat: 46.95, lon: 7.45, tz: 'Europe/Zurich', box: [[5.8, 45.7], [10.6, 47.9]], k: ['schweiz', 'bundesrat', 'zürich', 'zuerich', 'swiss', 'switzerland', 'eidgen'] },
  { c: 'IL', n: 'Israel', en: 'Israel', cap: 'Jerusalem', lat: 31.77, lon: 35.21, tz: 'Asia/Jerusalem', box: [[33.3, 29.3], [36.4, 33.5]], k: ['israel', 'netanjahu', 'netanyahu', 'tel aviv', 'jerusalem', 'idf'] },
  { c: 'PS', n: 'Gaza / Palästina', en: 'Palestine', cap: 'Gaza', lat: 31.5, lon: 34.47, tz: 'Asia/Gaza', box: [[33.3, 29.3], [36.4, 33.5]], k: ['gaza', 'hamas', 'westjordanland', 'west bank', 'palästin', 'palestin'] },
  { c: 'UA', n: 'Ukraine', en: 'Ukraine', cap: 'Kiew', lat: 50.45, lon: 30.52, tz: 'Europe/Kyiv', box: [[22, 44], [40.5, 52.5]], k: ['ukraine', 'ukrain', 'kiew', 'kyiv', 'selenskyj', 'zelensky', 'charkiw', 'kharkiv', 'odessa'] },
  { c: 'RU', n: 'Russland', en: 'Russia', cap: 'Moskau', lat: 55.75, lon: 37.62, tz: 'Europe/Moscow', box: [[26, 42], [62, 66]], k: ['russland', 'russisch', 'moskau', 'putin', 'kreml', 'kremlin', 'russia', 'moscow'] },
  { c: 'CN', n: 'China', en: 'China', cap: 'Peking', lat: 39.9, lon: 116.4, tz: 'Asia/Shanghai', box: [[73, 18], [135, 54]], k: ['china', 'chinesisch', 'chinese', 'peking', 'beijing', 'xi jinping'] },
  { c: 'TW', n: 'Taiwan', en: 'Taiwan', cap: 'Taipeh', lat: 25.03, lon: 121.56, tz: 'Asia/Taipei', box: [[116, 20], [126, 27.5]], k: ['taiwan', 'taipeh', 'taipei'] },
  { c: 'IR', n: 'Iran', en: 'Iran', cap: 'Teheran', lat: 35.69, lon: 51.39, tz: 'Asia/Tehran', box: [[44, 25], [63.5, 40]], k: ['iran', 'teheran', 'tehran', 'chamenei', 'khamenei'] },
  { c: 'GB', n: 'Grossbritannien', en: 'United Kingdom', cap: 'London', lat: 51.5, lon: -0.13, tz: 'Europe/London', box: [[-8.5, 49.8], [2, 59]], k: ['grossbritannien', 'großbritannien', 'britisch', 'british', 'london', 'starmer', 'vereinigtes königreich'] },
  { c: 'FR', n: 'Frankreich', en: 'France', cap: 'Paris', lat: 48.86, lon: 2.35, tz: 'Europe/Paris', box: [[-5, 42], [8.5, 51.2]], k: ['frankreich', 'französisch', 'paris', 'macron', 'france', 'french'] },
  { c: 'IT', n: 'Italien', en: 'Italy', cap: 'Rom', lat: 41.9, lon: 12.5, tz: 'Europe/Rome', box: [[6.5, 36.5], [18.6, 47.1]], k: ['italien', 'meloni', 'italy', 'italian', 'vatikan', 'vatican', 'papst', 'pope'] },
  { c: 'TR', n: 'Türkei', en: 'Turkey', cap: 'Ankara', lat: 39.93, lon: 32.86, tz: 'Europe/Istanbul', box: [[26, 35.8], [45, 42.2]], k: ['türkei', 'tuerkei', 'türkisch', 'erdogan', 'erdoğan', 'ankara', 'istanbul', 'turkey', 'turkish'] },
  { c: 'SY', n: 'Syrien', en: 'Syria', cap: 'Damaskus', lat: 33.51, lon: 36.29, tz: 'Asia/Damascus', box: [[35.5, 32.2], [42.5, 37.4]], k: ['syrien', 'syrisch', 'damaskus', 'syria', 'damascus'] },
  { c: 'LB', n: 'Libanon', en: 'Lebanon', cap: 'Beirut', lat: 33.89, lon: 35.5, tz: 'Asia/Beirut', box: [[34.8, 32.8], [36.9, 34.8]], k: ['libanon', 'beirut', 'hisbollah', 'hezbollah', 'lebanon'] },
  { c: 'IN', n: 'Indien', en: 'India', cap: 'Neu-Delhi', lat: 28.61, lon: 77.21, tz: 'Asia/Kolkata', box: [[68, 6.5], [97.5, 35.5]], k: ['indien', 'indisch', 'delhi', 'modi', 'india', 'indian'] },
  { c: 'JP', n: 'Japan', en: 'Japan', cap: 'Tokio', lat: 35.68, lon: 139.69, tz: 'Asia/Tokyo', box: [[129, 30], [146, 45.6]], k: ['japan', 'tokio', 'tokyo'] },
  { c: 'KP', n: 'Nordkorea', en: 'Dem. Rep. Korea', cap: 'Pjöngjang', lat: 39.03, lon: 125.75, tz: 'Asia/Pyongyang', box: [[123.5, 37], [131, 43.2]], k: ['nordkorea', 'north korea', 'kim jong', 'pjöngjang', 'pyongyang'] },
  { c: 'VE', n: 'Venezuela', en: 'Venezuela', cap: 'Caracas', lat: 10.48, lon: -66.9, tz: 'America/Caracas', box: [[-73.5, 0.6], [-59.8, 12.3]], k: ['venezuela', 'caracas', 'maduro'] },
  { c: 'BR', n: 'Brasilien', en: 'Brazil', cap: 'Brasília', lat: -15.79, lon: -47.88, tz: 'America/Sao_Paulo', box: [[-74, -34], [-34.8, 5.3]], k: ['brasilien', 'brazil', 'lula', 'brasília', 'brasilia'] },
  { c: 'SA', n: 'Saudi-Arabien', en: 'Saudi Arabia', cap: 'Riad', lat: 24.71, lon: 46.68, tz: 'Asia/Riyadh', box: [[34.5, 16], [55.7, 32.2]], k: ['saudi', 'riad', 'riyadh'] },
  { c: 'EG', n: 'Ägypten', en: 'Egypt', cap: 'Kairo', lat: 30.04, lon: 31.24, tz: 'Africa/Cairo', box: [[24.7, 22], [36.9, 31.7]], k: ['ägypten', 'aegypten', 'kairo', 'egypt', 'cairo'] },
  { c: 'PL', n: 'Polen', en: 'Poland', cap: 'Warschau', lat: 52.23, lon: 21.01, tz: 'Europe/Warsaw', box: [[14, 49], [24.2, 54.9]], k: ['polen', 'polnisch', 'warschau', 'poland', 'polish', 'warsaw'] },
  { c: 'MX', n: 'Mexiko', en: 'Mexico', cap: 'Mexiko-Stadt', lat: 19.43, lon: -99.13, tz: 'America/Mexico_City', box: [[-118, 14], [-86, 33]], k: ['mexiko', 'mexico', 'sheinbaum'] },
  { c: 'CA', n: 'Kanada', en: 'Canada', cap: 'Ottawa', lat: 45.42, lon: -75.7, tz: 'America/Toronto', box: [[-141, 41], [-52, 70]], k: ['kanada', 'canada', 'carney', 'ottawa'] },
];

const RX = COUNTRIES.map(x => ({ x, r: x.k.map(k => new RegExp('(^|[^\\p{L}])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu')) }));
export function countriesIn(text) {
  const out = []; const t = ' ' + String(text || '') + ' ';
  for (const { x, r } of RX) if (r.some(re => re.test(t))) out.push(x.c);
  return out;
}
export const byCode = Object.fromEntries(COUNTRIES.map(x => [x.c, x]));
