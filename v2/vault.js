/* JARVIS OMEGA · Tresor: Anmeldung, verschlüsseltes Gedächtnis, Verbindungen, Protokoll */
(() => {
  const OS = 'https://jarvis-iota-weld.vercel.app/api/os';
  const SK = 'jv-tok';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let tok = null, kats = [], tab = 'mem', filt = '';
  try { tok = localStorage.getItem(SK); } catch (e) {}
  const setTok = t => { tok = t; try { t ? localStorage.setItem(SK, t) : localStorage.removeItem(SK); } catch (e) {} };
  const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
  async function post(a, body, auth) {
    const r = await fetch(`${OS}?a=${a}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth && tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: JSON.stringify(body || {}) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(d.error || 'Fehler ' + r.status), { code: r.status, d }); return d;
  }
  async function passkeyRegister() {
    const o = await post('reg-start', {}, true);
    const c = await navigator.credentials.create({ publicKey: { ...o, challenge: unb64u(o.challenge), user: { ...o.user, id: unb64u(o.user.id) }, excludeCredentials: o.excludeCredentials.map(x => ({ ...x, id: unb64u(x.id) })) } });
    const geraet = /iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad/.test(navigator.userAgent) ? 'iPad' : /Mac/.test(navigator.userAgent) ? 'Mac' : /Windows/.test(navigator.userAgent) ? 'Windows' : 'Gerät';
    const d = await post('reg-finish', { clientDataJSON: b64u(c.response.clientDataJSON), attestationObject: b64u(c.response.attestationObject), geraet }, true);
    setTok(d.token);
  }
  async function passkeyLogin() {
    const o = await post('login-start');
    const c = await navigator.credentials.get({ publicKey: { ...o, challenge: unb64u(o.challenge), allowCredentials: o.allowCredentials.map(x => ({ ...x, id: unb64u(x.id) })) } });
    const d = await post('login-finish', { id: b64u(c.rawId), clientDataJSON: b64u(c.response.clientDataJSON), authenticatorData: b64u(c.response.authenticatorData), signature: b64u(c.response.signature) });
    setTok(d.token);
  }
  async function call(a, body, q = '') {
    if (!tok) throw Object.assign(new Error('Bitte anmelden.'), { code: 401 });
    const r = await fetch(`${OS}?a=${a}${q}`, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + tok, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401) setTok(null);
    if (!r.ok && r.status !== 409) throw Object.assign(new Error(d.error || 'Fehler ' + r.status), { code: r.status });
    return Object.assign(d, { _status: r.status });
  }

  /* ---------- Oberfläche ---------- */
  const el = document.createElement('div'); el.id = 'vault';
  el.innerHTML = `<div class="vx"><button class="vclose" aria-label="Schliessen">✕</button><div class="vk">Mond · Privater Tresor</div><h2>Gedächtnis</h2>
    <div class="vtabs"><button data-t="mem" class="on">Gedächtnis</button><button data-t="con">Verbindungen</button><button data-t="log">Protokoll</button></div><div id="vbody"></div><div id="vmsg"></div></div>`;
  document.body.appendChild(el);
  const body = () => el.querySelector('#vbody');
  const msg = t => { const m = el.querySelector('#vmsg'); m.textContent = t || ''; if (t) setTimeout(() => { if (m.textContent === t) m.textContent = ''; }, 6000); };
  el.querySelector('.vclose').onclick = close;
  el.querySelectorAll('.vtabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; el.querySelectorAll('.vtabs button').forEach(x => x.classList.toggle('on', x === b)); render(); });
  function open() { el.classList.add('on'); render(); }
  function close() { el.classList.remove('on'); }

  async function render() {
    const B = body(); B.innerHTML = '<p class="vs">Lade …</p>';
    let h; try { h = await (await fetch(OS + '?a=health&t=' + Date.now())).json(); } catch (e) { B.innerHTML = '<p class="vs">Server nicht erreichbar.</p>'; return; }
    if (!(h.datenbank && h.tabellen && h.vault)) {
      B.innerHTML = `<p>Der Tresor braucht noch eine Datenbank.</p><div class="vbadge" style="--c:#e7cb92">VERBINDUNG ERFORDERLICH</div>${h.fehler ? `<p class="vs">Fehler: ${esc(h.fehler)}</p>` : ''}<a class="vbtn" href="setup.html">Einrichtung (1 Schritt) →</a>`;
      return;
    }
    if (!tok) return loginView(h.eigner);
    try {
      if (tab === 'mem') return await memView();
      if (tab === 'con') return await conView();
      if (tab === 'log') return await logView();
    } catch (e) { if (e.code === 401) return loginView(true); B.innerHTML = `<p class="vs">${esc(e.message)}</p>`; }
  }

  function loginView(eigner) {
    const B = body();
    if (!window.PublicKeyCredential) { B.innerHTML = '<p>Dieser Browser kann keine Passkeys. Bitte Safari auf dem iPhone verwenden.</p>'; return; }
    B.innerHTML = eigner
      ? `<p>Nur Sie haben Zugang – mit Face ID.</p><button class="vbtn" id="vpk">Mit Face ID anmelden</button>`
      : `<p>Richten Sie jetzt Ihren persönlichen Zugang ein. Ab dann öffnet nur <b>Ihr Face ID</b> diesen Tresor – kein Passwort, nichts zu merken.</p><button class="vbtn" id="vpk">Face ID einrichten</button><p class="vs">Der Schlüssel liegt sicher in Ihrem iCloud-Schlüsselbund und funktioniert dadurch auch auf Ihrem Mac.</p>`;
    B.querySelector('#vpk').onclick = async () => {
      try { if (eigner) await passkeyLogin(); else await passkeyRegister(); msg(eigner ? 'Willkommen zurück, Boss.' : 'Eingerichtet. Willkommen, Boss.'); render(); }
      catch (e) { msg(e.name === 'NotAllowedError' ? 'Abgebrochen.' : (e.message || 'Fehlgeschlagen.')); }
    };
  }

  async function memView() {
    const me = await call('me'); kats = me.kategorien;
    const B = body();
    B.innerHTML = `<div class="vrow"><span class="vs">Angemeldet mit Face ID · ${me.geraete.map(g => esc(g.geraet || 'Gerät')).join(', ')}</span><button class="vlink" id="vout">Abmelden</button></div>
      <div class="vbadge" style="--c:#5fcf8f">LIVE · VERSCHLÜSSELT</div>
      <details class="vadd"><summary>+ Neuer Eintrag</summary>
        <select id="vkat">${kats.map(k => `<option>${k}</option>`).join('')}</select>
        <input id="vth" placeholder="Thema, z. B. „Wohnort“ oder „Audi S3 Service“">
        <textarea id="vin" rows="3" placeholder="Was soll JARVIS wissen?"></textarea>
        <button class="vbtn" id="vsave">Speichern</button></details>
      <details class="vadd"><summary>↥ Import (Notizen, exportierte KI-Erinnerungen)</summary>
        <p class="vs">Text einfügen – jeder Absatz wird ein Eintrag. Oder eine JARVIS-Export-Datei (JSON).</p>
        <select id="vikat">${kats.map(k => `<option>${k}</option>`).join('')}</select>
        <textarea id="vimp" rows="5" placeholder="Hier einfügen …"></textarea><input type="file" id="vfile" accept=".txt,.md,.json">
        <button class="vbtn" id="vimpb">Importieren</button></details>
      <div class="vrow"><input id="vq" placeholder="Suchen …" value="${esc(filt)}"><select id="vfk"><option value="">Alle</option>${kats.map(k => `<option>${k}</option>`).join('')}</select></div>
      <div id="vlist"><p class="vs">Lade …</p></div>
      <button class="vbtn alt" id="vexp">Alles exportieren (JSON)</button><button class="vbtn alt" id="vdev">Weiteres Gerät hinzufügen (Passkey)</button>`;
    B.querySelector('#vdev').onclick = async () => { try { await passkeyRegister(); msg('Gerät hinzugefügt.'); render(); } catch (e) { msg(e.name === 'NotAllowedError' ? 'Abgebrochen.' : e.message); } };
    B.querySelector('#vout').onclick = async () => { try { await call('logout', {}); } catch (e) {} setTok(null); render(); };
    const list = async () => {
      const q = B.querySelector('#vq').value.trim(), k = B.querySelector('#vfk').value; filt = q;
      const d = await call('list', null, (q ? '&q=' + encodeURIComponent(q) : '') + (k ? '&kat=' + encodeURIComponent(k) : ''));
      B.querySelector('#vlist').innerHTML = d.eintraege.length ? d.eintraege.map(m => `<div class="vitem"><div class="vih"><span class="vcat">${esc(m.kategorie)}</span><span class="vs">${new Date(m.aktualisiert).toLocaleDateString('de-CH')} · ${esc(m.quelle)}</span></div><b>${esc(m.thema)}</b><p>${esc(m.inhalt)}</p><div class="vact"><button data-inv="${m.id}">als ungültig markieren</button><button data-del="${m.id}">löschen</button></div></div>`).join('') : '<p class="vs">Noch keine Einträge.</p>';
      B.querySelectorAll('[data-inv]').forEach(b => b.onclick = async () => { await call('invalidate', { id: b.dataset.inv }); msg('Als ungültig markiert.'); list(); });
      B.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!confirm('Diesen Eintrag endgültig löschen? Das kann nicht rückgängig gemacht werden.')) return; await call('delete', { id: b.dataset.del, bestaetigt: true }); msg('Gelöscht.'); list(); });
    };
    let qt; B.querySelector('#vq').oninput = () => { clearTimeout(qt); qt = setTimeout(list, 350); }; B.querySelector('#vfk').onchange = list;
    B.querySelector('#vsave').onclick = async () => {
      const e = { kategorie: B.querySelector('#vkat').value, thema: B.querySelector('#vth').value.trim(), inhalt: B.querySelector('#vin').value.trim(), quelle: 'manuell' };
      const d = await save(e); if (d) { B.querySelector('#vth').value = B.querySelector('#vin').value = ''; list(); }
    };
    B.querySelector('#vfile').onchange = async ev => { const f = ev.target.files[0]; if (f) B.querySelector('#vimp').value = await f.text(); };
    B.querySelector('#vimpb').onclick = async () => {
      const t = B.querySelector('#vimp').value.trim(); if (!t) return;
      let items; try { const j = JSON.parse(t); items = (j.eintraege || j).map(x => ({ kategorie: x.kategorie, thema: x.thema || String(x.inhalt || x.text || x.content || '').slice(0, 60), inhalt: x.inhalt || x.text || x.content })); }
      catch (e) { const k = B.querySelector('#vikat').value; items = t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => ({ kategorie: k, thema: p.split('\n')[0].slice(0, 80), inhalt: p })); }
      const d = await call('import', { eintraege: items, quelle: 'Import ' + new Date().toLocaleDateString('de-CH') }); msg(d.importiert + ' Einträge importiert.'); B.querySelector('#vimp').value = ''; list();
    };
    B.querySelector('#vexp').onclick = async () => { const d = await call('export'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })); a.download = 'jarvis-gedaechtnis-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); };
    list();
  }
  async function save(e, ersetzen) {
    const d = await call('save', Object.assign({}, e, ersetzen ? { ersetzen: true } : {}));
    if (d._status === 409) {
      const ok = confirm(`Widerspruch erkannt.\n\nBisher: ${d.bisher.inhalt}\nNeu: ${e.inhalt}\n\nAlten Eintrag als veraltet markieren und den neuen übernehmen?`);
      return ok ? save(e, true) : null;
    }
    msg(d.unveraendert ? 'War schon so gespeichert.' : d.ersetzt ? 'Gespeichert – alter Eintrag als veraltet markiert.' : 'Gespeichert.'); return d;
  }
  async function conView() {
    const d = await call('connectors'); const B = body();
    B.innerHTML = `<p class="vs">Echt geprüft – keine Schein-Verbindungen. Schlüssel liegen nur in Vercel; widerrufen = Variable dort löschen.</p>` + d.verbindungen.map(c => `<div class="vitem"><div class="vih"><b>${esc(c.name)}</b><span class="vbadge" style="--c:${c.status === 'verbunden' ? '#5fcf8f' : '#e7cb92'}">${c.status === 'verbunden' ? 'VERBUNDEN' : 'NICHT VERBUNDEN'}</span></div><p class="vs">${esc(c.bereich)} · ${esc(c.art)} · Rechte: ${esc(c.rechte)}${c.hinweis ? ' · ' + esc(c.hinweis) : ''}</p></div>`).join('');
  }
  async function logView() {
    const d = await call('audit'); const B = body();
    B.innerHTML = `<p class="vs">Die letzten 50 Zugriffe auf Ihren Tresor.</p>` + (d.eintraege.map(x => `<div class="vrow vlog"><span>${new Date(x.zeit).toLocaleString('de-CH')}</span><span>${esc(x.aktion)}</span><span class="vs">${esc(x.detail || '')}</span></div>`).join('') || '<p class="vs">Noch keine Einträge.</p>');
  }

  /* ---------- Werkzeuge für die Stimme ---------- */
  const T = window.APP && APP.tools;
  if (T) {
    T.jarvis_memory_search = async ({ frage }) => { try { const d = await call('list', null, '&q=' + encodeURIComponent(frage || '')); return JSON.stringify({ treffer: d.anzahl, eintraege: d.eintraege.slice(0, 12).map(m => ({ kategorie: m.kategorie, thema: m.thema, inhalt: m.inhalt, stand: m.aktualisiert })) }); } catch (e) { return e.code === 401 ? 'Nicht angemeldet – der Boss muss den Tresor (Mond) mit Face ID öffnen.' : e.code === 503 ? 'Gedächtnis ist noch nicht eingerichtet.' : 'Fehler: ' + e.message; } };
    T.jarvis_memory_save = async ({ kategorie, thema, inhalt }) => { try { const d = await call('save', { kategorie, thema, inhalt, quelle: 'Gespräch' }); if (d._status === 409) return JSON.stringify({ widerspruch: true, bisher: d.bisher.inhalt, hinweis: 'Nicht gespeichert. Frag den Boss, ob der alte Eintrag ersetzt werden soll; wenn ja, sag ihm, er soll es im Tresor bestätigen.' }); return d.unveraendert ? 'War schon gespeichert.' : 'Gespeichert.'; } catch (e) { return e.code === 401 ? 'Nicht angemeldet – Tresor (Mond) mit Face ID öffnen.' : 'Fehler: ' + e.message; } };
    T.jarvis_open_vault = async () => { open(); return 'Tresor geöffnet.'; };
  }
  window.VAULT = { open, close };
})();
