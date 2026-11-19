// JARVIS MULTIVERSE — PROJECT OMEGA · core runtime (voice, market data, Saxo, hub)
// Real integrations only. Anything not connected says so.
const J = window.J;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ============ CONFIG ============ */
const CFG_KEY = 'omega-config';
const DEFAULT_AGENT = 'agent_7801m7r749fcfc2s7xe473y90x39';
const TOKEN_PROXY = 'https://jarvis-iota-weld.vercel.app/api/saxo-token'; // wird nach dem Vercel-Deploy gesetzt
const DEFAULT_SAXO = '0ffb385c5cdf4eb9aff2ec1391a9c999';
let cfg = { agentId: DEFAULT_AGENT, finnhubKey: '', saxoAppKey: DEFAULT_SAXO, saxoEnv: 'sim', volume: 1, transcript: true };
try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) {}
if (!cfg.saxoAppKey) cfg.saxoAppKey = DEFAULT_SAXO;
const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };
const redirectUri = () => location.origin + location.pathname;

/* ============ STATUS BUS ============ */
const status = { voice: 'off', saxo: 'off', market: cfg.finnhubKey ? 'ready' : 'off' };
function renderStatus() {
  const map = { off: ['nicht verbunden', 'r'], ready: ['bereit', 'g'], on: ['verbunden', 'g'], live: ['LIVE', 'g'], err: ['Fehler', 'r'], busy: ['verbinde …', 'o'] };
  for (const k of Object.keys(status)) {
    document.querySelectorAll(`[data-st="${k}"]`).forEach(e => { const [t, c] = map[status[k]] || [status[k], 'o']; e.textContent = t; e.className = 'pill ' + c; });
  }
}

/* ============ VOICE (ElevenLabs Agents, WebRTC) ============ */
let EL = null, conv = null, userEnded = false, retries = 0, muted = false, mode = 'idle';
async function loadEL() {
  if (EL) return EL;
  EL = await import('https://esm.sh/@elevenlabs/client');
  return EL;
}
function setVoiceUI(state) {
  status.voice = state; renderStatus();
  const orb = $('#vOrb'); if (!orb) return;
  orb.dataset.state = state === 'live' ? mode : state;
  $('#vLabel').textContent = state === 'live' ? (mode === 'speaking' ? 'JARVIS SPRICHT' : muted ? 'STUMM' : 'ICH HÖRE ZU') : state === 'busy' ? 'VERBINDE …' : state === 'err' ? 'FEHLER – NOCHMAL TIPPEN' : 'TIPPEN ZUM SPRECHEN';
  document.body.classList.toggle('miclive', state === 'live' && !muted);
  $('#vMute').disabled = $('#vEnd').disabled = state !== 'live';
  $('#vMute').textContent = muted ? '🎙 Mikro an' : '🔇 Stumm';
  window.__omegaLive = state === 'live' || state === 'busy';
}
function logLine(who, text) {
  if (!text) return;
  const box = $('#vLog'); if (!box) return;
  const d = document.createElement('div'); d.className = 'm ' + (who === 'user' ? 'u' : 'j'); d.textContent = text;
  box.appendChild(d); box.scrollTop = box.scrollHeight;
  const g = $('#greet'); if (g && who !== 'user') g.textContent = text.length > 160 ? text.slice(0, 157) + '…' : text;
}
async function startVoice() {
  if (conv || status.voice === 'busy') return;
  userEnded = false; setVoiceUI('busy');
  try {
    if (!window.isSecureContext) throw new Error('Mikrofon braucht eine sichere Verbindung (https).');
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const lib = await loadEL();
    const Conversation = lib.Conversation || lib.default?.Conversation;
    conv = await Conversation.startSession({
      agentId: cfg.agentId,
      connectionType: 'webrtc',
      clientTools,
      onConnect: () => { retries = 0; setVoiceUI('live'); J.holo.speaking = false; try { conv.setVolume({ volume: +cfg.volume }); } catch (e) {} },
      onDisconnect: () => { conv = null; J.holo.speaking = false; J.holo.listening = false; J.holo.levelFn = null; setVoiceUI('off');
        if (!userEnded && retries < 2) { retries++; J.toast('Verbindung unterbrochen – verbinde neu …'); setTimeout(startVoice, 1500); } },
      onModeChange: m => { mode = m.mode; J.holo.speaking = mode === 'speaking'; J.holo.listening = mode === 'listening'; setVoiceUI('live'); },
      onMessage: m => logLine(m.source === 'user' ? 'user' : 'ai', m.message),
      onError: e => { console.warn('voice error', e); J.toast('Sprachverbindung: ' + (e?.message || e)); },
    });
    J.holo.levelFn = () => { try { return mode === 'speaking' ? Math.min(1.2, conv.getOutputVolume() * 3) : Math.min(.5, conv.getInputVolume() * 1.5); } catch (e) { return 0; } };
  } catch (e) {
    conv = null; setVoiceUI('err');
    J.toast(e?.name === 'NotAllowedError' ? 'Mikrofon wurde nicht erlaubt.' : 'Live-Stimme: ' + (e?.message || e));
  }
}
async function endVoice() { userEnded = true; muted = false; try { await conv?.endSession(); } catch (e) {} conv = null; setVoiceUI('off'); }
function toggleMute() { if (!conv) return; muted = !muted; try { conv.setMicMuted(muted); } catch (e) {} setVoiceUI('live'); }
async function sendText(t) {
  t = String(t || '').trim(); if (!t) return;
  if (!conv) { await startVoice(); }
  if (!conv) return;
  logLine('user', t);
  try { conv.sendUserMessage(t); } catch (e) { J.toast('Senden fehlgeschlagen'); }
}

/* ============ CLIENT TOOLS (called by the agent) ============ */
const VIEWS = { core: 'cockpit', finance: 'port', market: 'invest', realestate: 'calc', world: 'welt', hub: 'hub' };
const clientTools = {
  jarvis_show_module: async ({ module }) => { const ok = J.go(VIEWS[module] || module); return ok ? `Modul ${module} geöffnet.` : `Unbekanntes Modul ${module}.`; },
  jarvis_set_avatar: async ({ mode }) => { J.holo.auto = false; J.holo.setDim(mode); return 'ok'; },
  jarvis_get_portfolio: async () => {
    const out = { app_portfolio: J.summary() };
    if (saxo.token) { try { out.saxo = await saxo.snapshot(); } catch (e) { out.saxo = { fehler: String(e.message || e) }; } }
    else out.saxo = 'Saxo ist nicht verbunden.';
    return JSON.stringify(out).slice(0, 6000);
  },
  jarvis_market_lookup: async ({ query }) => { J.go('invest'); const r = await market.lookup(query); return JSON.stringify(r).slice(0, 5000); },
  jarvis_prepare_order: async (p) => { J.go('port'); const r = await order.prepare(p); return JSON.stringify(r).slice(0, 4000); },
};

/* ============ MARKET INTELLIGENCE ============ */
const market = {
  async fh(path, params = {}) {
    if (!cfg.finnhubKey) throw new Error('Keine Marktdatenquelle verbunden (Finnhub-Schlüssel fehlt im Hub).');
    const u = new URL('https://finnhub.io/api/v1/' + path); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v)); u.searchParams.set('token', cfg.finnhubKey);
    const r = await fetch(u); if (r.status === 429) throw new Error('Datenlimit erreicht, bitte kurz warten.'); if (!r.ok) throw new Error('Finnhub ' + r.status);
    return r.json();
  },
  async resolve(q) {
    const s = await this.fh('search', { q });
    const list = (s.result || []).filter(x => !String(x.symbol).includes('.') || /\.SW$/.test(x.symbol));
    const up = q.trim().toUpperCase();
    return list.find(x => x.symbol === up) || list.find(x => x.type === 'Common Stock') || list[0] || null;
  },
  async lookup(query) {
    const card = $('#miOut'); if (card) card.innerHTML = '<div class="note">Analysiere „' + esc(query) + '“ …</div>';
    try {
      if (!cfg.finnhubKey && saxo.token) return await this.lookupSaxo(query);
      const hit = await this.resolve(query);
      if (!hit) { this.render({ fehler: 'Kein passendes Wertpapier gefunden.', query }); return { gefunden: false, query }; }
      const sym = hit.symbol;
      const today = new Date(), from = new Date(Date.now() - 7 * 864e5);
      const ymd = d => d.toISOString().slice(0, 10);
      const [q, prof, news] = await Promise.all([this.fh('quote', { symbol: sym }), this.fh('stock/profile2', { symbol: sym }).catch(() => ({})), this.fh('company-news', { symbol: sym, from: ymd(from), to: ymd(today) }).catch(() => [])]);
      const r = { quelle: 'Finnhub', symbol: sym, name: prof.name || hit.description, boerse: prof.exchange, waehrung: prof.currency, kurs: q.c, veraenderung: q.d, veraenderung_prozent: q.dp, tageshoch: q.h, tagestief: q.l, vortag: q.pc,
        zeitstempel: q.t ? new Date(q.t * 1000).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' }) : null, branche: prof.finnhubIndustry, marktkapitalisierung_mio: prof.marketCapitalization,
        news: (news || []).slice(0, 5).map(n => ({ titel: n.headline, quelle: n.source, datum: new Date(n.datetime * 1000).toLocaleDateString('de-CH'), url: n.url })) };
      if (!q.c) r.hinweis = 'Kein Kurs erhalten (evtl. ausserhalb des Datenumfangs des Gratis-Tarifs).';
      this.render(r); return r;
    } catch (e) { this.render({ fehler: e.message, query }); return { fehler: e.message }; }
  },
  async lookupSaxo(query) {
    const ins = await saxo.findInstrument(query); if (!ins) { this.render({ fehler: 'Nicht bei Saxo gefunden', query }); return { gefunden: false }; }
    const p = await saxo.infoPrice(ins.Identifier, ins.AssetType);
    const r = { quelle: 'Saxo ' + cfg.saxoEnv.toUpperCase(), symbol: ins.Symbol, name: ins.Description, waehrung: ins.CurrencyCode, kurs: p?.Quote?.Mid ?? p?.Quote?.Ask, verzoegerung_min: p?.Quote?.DelayedByMinutes, zeitstempel: p?.LastUpdated, news: [], hinweis: 'News benötigen einen Finnhub-Schlüssel.' };
    this.render(r); return r;
  },
  render(r) {
    const el = $('#miOut'); if (!el) return;
    if (r.fehler) { el.innerHTML = `<div class="warn r"><i>!</i><div>${esc(r.fehler)}</div></div>`; return; }
    const up = (r.veraenderung_prozent ?? 0) >= 0;
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px"><div><div class="mono" style="color:var(--c);font-size:11px;letter-spacing:.12em">${esc(r.symbol)} · ${esc(r.boerse || r.quelle)}</div><div style="font-size:16px;color:#fff;font-weight:600">${esc(r.name || '')}</div></div>
      <div style="text-align:right"><div class="big">${r.kurs != null ? Number(r.kurs).toLocaleString('de-CH', { maximumFractionDigits: 2 }) : '—'} <small style="font-size:12px">${esc(r.waehrung || '')}</small></div>${r.veraenderung_prozent != null ? `<div class="${up ? 'up' : 'dn'} mono">${up ? '+' : ''}${Number(r.veraenderung_prozent).toFixed(2)} %</div>` : ''}</div></div>
      <div class="note">Quelle: ${esc(r.quelle)}${r.zeitstempel ? ' · Stand ' + esc(r.zeitstempel) : ''}${r.verzoegerung_min ? ' · ' + r.verzoegerung_min + ' Min. verzögert' : ''}${r.hinweis ? ' · ' + esc(r.hinweis) : ''}</div>
      ${(r.news || []).length ? '<div class="ct" style="margin-top:12px">NEWS</div>' + r.news.map(n => `<a class="prov" href="${esc(n.url)}" target="_blank" rel="noopener" style="text-decoration:none"><div class="pi">📰</div><div><b>${esc(n.titel)}</b><span>${esc(n.quelle)} · ${esc(n.datum)}</span></div></a>`).join('') : ''}
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm o" id="miOrder">Order vorbereiten</button><button class="btn gh sm" id="miAsk">JARVIS fragen</button></div>`;
    $('#miOrder').onclick = () => { J.go('port'); $('#otSym').value = r.symbol; order.search(); };
    $('#miAsk').onclick = () => sendText(`Analysiere ${r.name || r.symbol} für mich: Chancen, Risiken und was im Kurs schon eingepreist sein könnte.`);
  },
};

/* ============ SAXO OPENAPI (PKCE, SIM first) ============ */
const SAXO = { sim: { auth: 'https://sim.logonvalidation.net', api: 'https://gateway.saxobank.com/sim/openapi' }, live: { auth: 'https://live.logonvalidation.net', api: 'https://gateway.saxobank.com/openapi' } };
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const saxo = {
  token: null, refresh: null, exp: 0, verifier: null, account: null,
  load() { try { const t = JSON.parse(localStorage.getItem('omega-saxo') || 'null'); if (t && t.env === cfg.saxoEnv) Object.assign(this, t); } catch (e) {} if (this.token) status.saxo = 'on'; },
  persist() { try { localStorage.setItem('omega-saxo', JSON.stringify({ env: cfg.saxoEnv, token: this.token, refresh: this.refresh, exp: this.exp, verifier: this.verifier })); } catch (e) {} },
  clear() { this.token = this.refresh = null; this.exp = 0; this.account = null; try { localStorage.removeItem('omega-saxo'); } catch (e) {} status.saxo = 'off'; renderStatus(); renderSaxo(); },
  async login() {
    if (!cfg.saxoAppKey) { J.toast('Bitte zuerst den Saxo AppKey im Hub eintragen.'); J.go('hub'); return; }
    const v = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const ch = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)));
    const st = b64url(crypto.getRandomValues(new Uint8Array(16)));
    sessionStorage.setItem('omega-pkce', JSON.stringify({ v, st, env: cfg.saxoEnv })); localStorage.setItem('omega-pkce', JSON.stringify({ v, st, env: cfg.saxoEnv }));
    const u = new URL(SAXO[cfg.saxoEnv].auth + '/authorize');
    Object.entries({ response_type: 'code', client_id: cfg.saxoAppKey, state: st, redirect_uri: redirectUri(), code_challenge: ch, code_challenge_method: 'S256' }).forEach(([k, x]) => u.searchParams.set(k, x));
    location.href = u.toString();
  },
  async handleRedirect() {
    const p = new URLSearchParams(location.search); const code = p.get('code'), st = p.get('state');
    const err = p.get('error'); if (err) { history.replaceState(null, '', redirectUri()); this.fail('Saxo meldet: ' + err + (p.get('error_description') ? ' – ' + p.get('error_description') : '')); return; }
    if (!code) return;
    history.replaceState(null, '', redirectUri());
    let pk = null; try { pk = JSON.parse(sessionStorage.getItem('omega-pkce') || localStorage.getItem('omega-pkce') || 'null'); } catch (e) {}
    if (!pk || pk.st !== st) { this.fail('Sicherheitsprüfung fehlgeschlagen (state). Bitte den Login in Safari starten, nicht über das Home-Symbol.'); return; }
    status.saxo = 'busy'; renderStatus();
    try {
      await this.tokenReq({ grant_type: 'authorization_code', code, redirect_uri: redirectUri(), client_id: cfg.saxoAppKey, code_verifier: pk.v }, pk.v);
      J.toast('Saxo verbunden (' + cfg.saxoEnv.toUpperCase() + ')'); J.go('port');
    } catch (e) { status.saxo = 'err'; renderStatus(); this.fail('Token-Abruf fehlgeschlagen: ' + e.message); }
    sessionStorage.removeItem('omega-pkce'); localStorage.removeItem('omega-pkce');
  },
  fail(msg) { try { localStorage.setItem('omega-saxo-err', new Date().toLocaleTimeString('de-CH') + ' · ' + msg); } catch (e) {} J.toast('Saxo: ' + msg); try { J.go('port'); } catch (e) {} renderSaxo(); },
  async tokenReq(body, verifier) {
    const r = await fetch(TOKEN_PROXY ? TOKEN_PROXY + '?env=' + cfg.saxoEnv : SAXO[cfg.saxoEnv].auth + '/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
    if (!r.ok) { let t = ''; try { t = (await r.text()).slice(0, 160); } catch (e) {} throw new Error('Token ' + r.status + (t ? ' ' + t : '')); }
    const j = await r.json(); this.token = j.access_token; this.refresh = j.refresh_token || this.refresh; this.exp = Date.now() + (j.expires_in || 1200) * 1000 - 30000; if (verifier) this.verifier = verifier;
    this.persist(); try { localStorage.removeItem('omega-saxo-err'); } catch (e) {} status.saxo = 'on'; renderStatus(); renderSaxo();
  },
  async ensure() {
    if (!this.token) throw new Error('Saxo ist nicht verbunden.');
    if (Date.now() > this.exp && this.refresh) await this.tokenReq({ grant_type: 'refresh_token', refresh_token: this.refresh, redirect_uri: redirectUri(), client_id: cfg.saxoAppKey, ...(this.verifier ? { code_verifier: this.verifier } : {}) });
  },
  async api(path, opt = {}) {
    await this.ensure();
    const r = await fetch(SAXO[cfg.saxoEnv].api + path, { ...opt, headers: { Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
    if (r.status === 401) { this.clear(); throw new Error('Saxo-Sitzung abgelaufen – bitte neu verbinden.'); }
    const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
    if (!r.ok) throw new Error((j && (j.Message || j.ErrorInfo?.Message)) || ('Saxo ' + r.status));
    return j;
  },
  async acct() { if (this.account) return this.account; const a = await this.api('/port/v1/accounts/me'); this.account = a?.Data?.[0] || null; return this.account; },
  async snapshot() {
    const [bal, pos] = await Promise.all([this.api('/port/v1/balances/me'), this.api('/port/v1/netpositions/me?FieldGroups=NetPositionBase,NetPositionView,DisplayAndFormat').catch(() => ({ Data: [] }))]);
    return { umgebung: cfg.saxoEnv.toUpperCase(), waehrung: bal?.Currency, gesamtwert: bal?.TotalValue, cash: bal?.CashBalance, positionen: (pos?.Data || []).map(p => ({ titel: p.DisplayAndFormat?.Description, symbol: p.DisplayAndFormat?.Symbol, menge: p.NetPositionBase?.Amount, marktwert: p.NetPositionView?.MarketValue, gv: p.NetPositionView?.ProfitLossOnTrade })) };
  },
  async findInstrument(q) { const r = await this.api('/ref/v1/instruments?Keywords=' + encodeURIComponent(q) + '&AssetTypes=Stock,Etf,Etc,CryptoFx&$top=10'); const d = r?.Data || []; const up = q.toUpperCase(); return d.find(x => String(x.Symbol).split(':')[0].toUpperCase() === up) || d[0] || null; },
  async infoPrice(uic, at) { return this.api(`/trade/v1/infoprices?Uic=${uic}&AssetType=${at}&FieldGroups=Quote,DisplayAndFormat,PriceInfoDetails`); },
  async fxToChf(ccy) { if (!ccy || ccy === 'CHF') return 1; try { const r = await this.api('/ref/v1/instruments?Keywords=' + ccy + 'CHF&AssetTypes=FxSpot'); const ins = (r?.Data || []).find(x => String(x.Symbol).toUpperCase().startsWith(ccy + 'CHF')) || r?.Data?.[0]; const p = ins && await this.infoPrice(ins.Identifier, 'FxSpot'); const m = p?.Quote?.Mid; return m && m > 0.05 && m < 20 ? m : null; } catch (e) { return null; } },
};
async function renderSaxo() {
  const el = $('#sxOut'); if (!el) return;
  if (!saxo.token) { let le = ''; try { le = localStorage.getItem('omega-saxo-err') || ''; } catch (e) {} el.innerHTML = (le ? `<div class="note" style="color:#ff8a8a;margin-bottom:8px">Letzter Fehler: ${le.replace(/</g,'&lt;')}</div>` : '') + `<div class="note">Nicht verbunden. ${cfg.saxoAppKey ? '' : 'Trage zuerst im Hub deinen Saxo AppKey ein. '}Zum Start empfiehlt sich das <b>Demo-Konto (SIM)</b>: Dort wird mit Spielgeld gehandelt.</div><button class="btn" id="sxLogin" style="width:100%;margin-top:10px">Mit Saxo verbinden (${cfg.saxoEnv.toUpperCase()})</button>`; $('#sxLogin').onclick = () => saxo.login(); return; }
  el.innerHTML = '<div class="note">Lade Saxo-Konto …</div>';
  try {
    const s = await saxo.snapshot();
    el.innerHTML = `<div class="two"><div class="bi"><span>Gesamtwert</span><b>${Number(s.gesamtwert || 0).toLocaleString('de-CH', { maximumFractionDigits: 0 })} ${esc(s.waehrung || '')}</b></div><div class="bi"><span>Cash</span><b>${Number(s.cash || 0).toLocaleString('de-CH', { maximumFractionDigits: 0 })} ${esc(s.waehrung || '')}</b></div></div>
      ${s.positionen.length ? s.positionen.map(p => `<div class="row"><span>${esc(p.titel || p.symbol)}<br><small class="mono" style="color:var(--mut)">${esc(p.symbol || '')} · ${p.menge}</small></span><b>${Number(p.marktwert || 0).toLocaleString('de-CH', { maximumFractionDigits: 0 })}</b></div>`).join('') : '<div class="note">Keine offenen Positionen.</div>'}
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn gh sm" id="sxRef">Aktualisieren</button><button class="btn gh sm" id="sxOff" style="color:var(--r)">Trennen</button></div><div class="note">Umgebung: <b>${esc(s.umgebung)}</b>${s.umgebung === 'SIM' ? ' (Demo, Spielgeld)' : ' (ECHTES GELD)'}</div>`;
    $('#sxRef').onclick = renderSaxo; $('#sxOff').onclick = () => saxo.clear();
  } catch (e) { el.innerHTML = `<div class="warn r"><i>!</i><div>${esc(e.message)}</div></div><button class="btn gh sm" id="sxRe">Neu verbinden</button>`; $('#sxRe').onclick = () => saxo.login(); }
}

/* ============ ORDER TICKET (explicit confirmation required) ============ */
const order = {
  ins: null, price: null, pre: null,
  async search() {
    const q = $('#otSym').value.trim(); if (!q) return;
    $('#otInfo').innerHTML = '<div class="note">Suche …</div>'; this.ins = null; this.pre = null; this.lock();
    try {
      if (!saxo.token) { $('#otInfo').innerHTML = '<div class="warn w"><i>!</i><div>Saxo ist nicht verbunden. Ohne Broker-Anbindung kann ich die Order nur beschreiben, nicht prüfen oder senden.</div></div>'; return null; }
      this.ins = await saxo.findInstrument(q); if (!this.ins) { $('#otInfo').innerHTML = '<div class="note">Nicht gefunden.</div>'; return null; }
      const p = await saxo.infoPrice(this.ins.Identifier, this.ins.AssetType); this.price = p?.Quote?.Ask || p?.Quote?.Mid || null;
      $('#otInfo').innerHTML = `<div class="row"><span><b style="color:#fff">${esc(this.ins.Description)}</b><br><small class="mono" style="color:var(--mut)">${esc(this.ins.Symbol)} · ${esc(this.ins.AssetType)} · ${esc(this.ins.CurrencyCode)}</small></span><b>${this.price ?? '—'} ${esc(this.ins.CurrencyCode)}</b></div><div class="note">Kurs von Saxo${p?.Quote?.DelayedByMinutes ? ', ' + p.Quote.DelayedByMinutes + ' Min. verzögert' : ''}.</div>`;
      return this.ins;
    } catch (e) { $('#otInfo').innerHTML = `<div class="warn r"><i>!</i><div>${esc(e.message)}</div></div>`; return null; }
  },
  body(extra = {}) {
    const qty = +$('#otQty').value; const type = $('#otType').value;
    const b = { AccountKey: saxo.account?.AccountKey, Uic: this.ins.Identifier, AssetType: this.ins.AssetType, BuySell: $('#otSide').value, Amount: qty, OrderType: type, ManualOrder: true, OrderDuration: { DurationType: 'DayOrder' }, ...extra };
    if (type === 'Limit') b.OrderPrice = +$('#otLimit').value;
    return b;
  },
  async precheck() {
    if (!this.ins) await this.search(); if (!this.ins) return null;
    if (!(+$('#otQty').value > 0)) { J.toast('Bitte Stückzahl angeben'); return null; }
    await saxo.acct();
    $('#otPre').innerHTML = '<div class="note">Saxo prüft die Order …</div>';
    try {
      const r = await saxo.api('/trade/v2/orders/precheck', { method: 'POST', body: JSON.stringify(this.body({ FieldGroups: ['Costs'] })) });
      this.pre = r;
      const ok = r?.PreCheckResult === 'Ok' || (!r?.ErrorInfo && r);
      const cost = r?.Cost?.TotalCost ?? r?.EstimatedCashRequired;
      $('#otPre').innerHTML = `<div class="ticket">${ok ? '✓ Vorabprüfung bestanden' : '✗ Vorabprüfung: ' + esc(r?.ErrorInfo?.Message || r?.PreCheckResult || 'nicht ok')}
Benötigtes Kapital: ${esc(r?.EstimatedCashRequired ?? '—')} ${esc(r?.EstimatedCashRequiredCurrency || '')}
Kosten (Saxo): ${esc(cost ?? '—')}
Umgebung: ${cfg.saxoEnv.toUpperCase()}${cfg.saxoEnv === 'live' ? ' – ECHTES GELD' : ' – Demo'}</div>`;
      this.unlock(ok); return { vorabpruefung_ok: !!ok, benoetigtes_kapital: r?.EstimatedCashRequired, waehrung: r?.EstimatedCashRequiredCurrency, kosten: cost, fehler: r?.ErrorInfo?.Message };
    } catch (e) { $('#otPre').innerHTML = `<div class="warn r"><i>!</i><div>${esc(e.message)}</div></div>`; return { fehler: e.message }; }
  },
  lock() { $('#otConfirm').checked = false; $('#otSend').disabled = true; $('#otConfirmBox').style.display = 'none'; $('#otPre').innerHTML = ''; },
  unlock(ok) { $('#otConfirmBox').style.display = ok ? 'block' : 'none'; $('#otLiveWord').style.display = cfg.saxoEnv === 'live' ? 'block' : 'none'; this.validate(); },
  validate() { const ok = $('#otConfirm').checked && (cfg.saxoEnv !== 'live' || $('#otWord').value.trim().toUpperCase() === ($('#otSide').value === 'Buy' ? 'KAUFEN' : 'VERKAUFEN')); $('#otSend').disabled = !ok || !this.pre; },
  async send() {
    if ($('#otSend').disabled) return;
    $('#otSend').disabled = true;
    try {
      const r = await saxo.api('/trade/v2/orders', { method: 'POST', body: JSON.stringify(this.body()) });
      const id = r?.OrderId; const entry = { t: new Date().toISOString(), env: cfg.saxoEnv, sym: this.ins.Symbol, side: $('#otSide').value, qty: +$('#otQty').value, type: $('#otType').value, orderId: id };
      try { const L = JSON.parse(localStorage.getItem('omega-orders') || '[]'); L.unshift(entry); localStorage.setItem('omega-orders', JSON.stringify(L.slice(0, 200))); } catch (e) {}
      $('#otPre').innerHTML = `<div class="ticket">✓ Order an Saxo übermittelt\nOrder-ID: ${esc(id || '—')}\nStatus siehst du unter „Offene Orders“.</div>`; J.toast('Order übermittelt'); this.lock(); renderOrders(); renderSaxo();
    } catch (e) { $('#otPre').innerHTML = `<div class="warn r"><i>!</i><div>Order nicht übermittelt: ${esc(e.message)}</div></div>`; }
  },
  async prepare(p) {
    $('#otSym').value = p.symbol || ''; $('#otSide').value = p.side === 'Sell' ? 'Sell' : 'Buy'; $('#otType').value = p.order_type === 'Limit' ? 'Limit' : 'Market'; if (p.limit_price) $('#otLimit').value = p.limit_price; syncType();
    const ins = await this.search();
    if (!ins) return { status: saxo.token ? 'nicht gefunden' : 'Saxo nicht verbunden – Ticket nur beschrieben, keine Prüfung möglich', symbol: p.symbol };
    let qty = p.quantity;
    if (!qty && p.amount_chf && this.price) { const fx = await saxo.fxToChf(ins.CurrencyCode); qty = fx ? Math.floor(p.amount_chf / (this.price * fx)) : null; }
    if (qty === 0) return { titel: ins.Description, symbol: ins.Symbol, kurs: this.price, waehrung: ins.CurrencyCode, hinweis: 'Der Betrag reicht nicht für ein ganzes Stück.' };
    if (qty) $('#otQty').value = qty;
    const pre = qty ? await this.precheck() : { hinweis: 'Stückzahl fehlt (Wechselkurs nicht verfügbar) – bitte Stückzahl nennen.' };
    return { titel: ins.Description, symbol: ins.Symbol, waehrung: ins.CurrencyCode, kurs: this.price, stueck: qty, vorabpruefung: pre, wichtig: 'Nicht ausgeführt. Der Boss muss in der App bestätigen und selbst auf Senden tippen.' };
  },
};
function syncType() { $('#otLimitBox').style.display = $('#otType').value === 'Limit' ? 'block' : 'none'; }
async function renderOrders() {
  const el = $('#otOrders'); if (!el) return;
  let L = []; try { L = JSON.parse(localStorage.getItem('omega-orders') || '[]'); } catch (e) {}
  let open = [];
  if (saxo.token) { try { const r = await saxo.api('/port/v1/orders/me?FieldGroups=DisplayAndFormat'); open = r?.Data || []; } catch (e) {} }
  el.innerHTML = (open.length ? '<div class="ct">OFFENE ORDERS (SAXO)</div>' + open.map(o => `<div class="row"><span>${esc(o.DisplayAndFormat?.Description || o.Uic)} · ${esc(o.BuySell)} ${o.Amount}</span><b>${esc(o.Status)}</b></div>`).join('') : '') +
    (L.length ? '<div class="ct" style="margin-top:10px">PROTOKOLL</div>' + L.slice(0, 15).map(o => `<div class="row"><span>${esc(o.side === 'Buy' ? 'Kauf' : 'Verkauf')} ${o.qty} ${esc(o.sym)} <small class="mono" style="color:var(--mut)">${esc(o.env.toUpperCase())}</small></span><b class="mono">${new Date(o.t).toLocaleString('de-CH')}</b></div>`).join('') : '<div class="note">Noch keine Orders.</div>');
}

/* ============ HUB ============ */
function renderHub() {
  $('#hbAgent').value = cfg.agentId; $('#hbFinn').value = cfg.finnhubKey; $('#hbSaxoKey').value = cfg.saxoAppKey; $('#hbEnv').value = cfg.saxoEnv; $('#hbRedirect').textContent = redirectUri();
  $('#hbVol').value = cfg.volume;
  renderStatus();
}
function bindHub() {
  $('#hbSave').onclick = () => {
    const envChanged = cfg.saxoEnv !== $('#hbEnv').value;
    cfg.agentId = $('#hbAgent').value.trim() || DEFAULT_AGENT; cfg.finnhubKey = $('#hbFinn').value.trim(); cfg.saxoAppKey = $('#hbSaxoKey').value.trim(); cfg.saxoEnv = $('#hbEnv').value;
    saveCfg(); status.market = cfg.finnhubKey ? 'ready' : 'off'; if (envChanged) saxo.clear(); renderStatus(); renderSaxo(); J.toast('Gespeichert');
  };
  $('#hbVol').oninput = e => { cfg.volume = +e.target.value; saveCfg(); try { conv?.setVolume({ volume: cfg.volume }); } catch (x) {} };
  $('#hbTest').onclick = async () => { cfg.finnhubKey = $('#hbFinn').value.trim(); const r = await market.lookup('AAPL'); J.toast(r.fehler ? 'Fehler: ' + r.fehler : 'Marktdaten OK: AAPL ' + r.kurs); };
}

/* ============ WIRE UP ============ */
function wire() {
  $('#vOrb').onclick = () => conv ? toggleMute() : startVoice();
  $('#vMute').onclick = toggleMute; $('#vEnd').onclick = endVoice;
  $('#vForm').onsubmit = e => { e.preventDefault(); const v = $('#vIn').value; $('#vIn').value = ''; sendText(v); };
  $('#vLogBtn').onclick = () => $('#vLogWrap').classList.toggle('open');
  $('#miForm').onsubmit = e => { e.preventDefault(); market.lookup($('#miQ').value.trim()); };
  document.querySelectorAll('#miQuick button').forEach(b => b.onclick = () => { $('#miQ').value = b.dataset.q; market.lookup(b.dataset.q); });
  $('#otFind').onclick = () => order.search(); $('#otCheck').onclick = () => order.precheck(); $('#otSend').onclick = () => order.send();
  $('#otType').onchange = () => { syncType(); order.lock(); }; ['#otQty', '#otSide', '#otLimit'].forEach(s => $(s).addEventListener('input', () => order.lock()));
  $('#otConfirm').onchange = () => order.validate(); $('#otWord').oninput = () => order.validate();
  bindHub();
  J.setTextHandler(sendText);
  J.onView(v => { if (v === 'hub') renderHub(); if (v === 'port') { renderSaxo(); renderOrders(); } });
}
saxo.load(); wire(); renderStatus(); renderSaxo(); renderOrders(); syncType(); setVoiceUI('off');
saxo.handleRedirect();
J.onBoot(() => startVoice());
window.omega = { startVoice, endVoice, sendText, market, saxo, order, cfg };
