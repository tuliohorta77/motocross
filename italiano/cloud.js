/* Parla Italiano · nuvem: login do aluno (turma + nome + PIN), sincronização do progresso e telemetria.
   Só liga se config.js tiver url e key do Supabase. Sem isso o jogo segue 100% local, como antes. */
(() => {
  const C = window.PARLA_CFG || {};
  if (!C.url || !C.key || !window.supabase) return;
  const sb = window.supabase.createClient(C.url, C.key, { auth: { persistSession: true, storageKey: 'parla-auth', autoRefreshToken: true } });
  window.__parlaSB = sb;
  const $ = id => document.getElementById(id);
  const DOM = 'aluno.parla-italiano.app';
  const LESSONS = [...Array(24)].map((_, i) => i + 1);
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const emailOf = (code, name) => slug(name) + '.' + slug(code) + '@' + DOM;
  const passOf = (code, pin) => 'parla-' + pin + '-' + slug(code);
  const LS = {
    get(k) { try { return localStorage.getItem(k) } catch (e) { return null } },
    set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} },
    del(k) { try { localStorage.removeItem(k) } catch (e) {} },
    json(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v } catch (e) { return d } }
  };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => (Math.random() * 16 | 0).toString(16)));
  let user = null, profile = null, session = uuid(), screen = '', dirty = false;
  let box = LS.json('parla-outbox', { ev: [], g: [], t: [] });
  const save = () => LS.set('parla-outbox', JSON.stringify(box));

  /* ---------- estilos e telas ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .seg{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#efe2cb;border-radius:14px;padding:4px}
  .seg button{border:0;border-radius:11px;padding:9px 6px;font-family:var(--display);font-weight:600;font-size:15px;background:transparent;color:var(--muted);cursor:pointer}
  .seg button.on{background:var(--card);color:var(--ink);box-shadow:0 2px 0 var(--line)}
  .fld{display:flex;flex-direction:column;gap:5px;text-align:left;font-weight:800;font-size:14px;color:var(--ink)}
  .fld input{font-family:var(--display);font-weight:600;font-size:20px;padding:11px 13px;border:2px solid var(--line);border-radius:14px;background:#fff;color:var(--ink);min-width:0}
  .fld small{font-weight:700;color:var(--muted);min-height:1em}
  .fld small.ok{color:var(--verde)}.fld small.no{color:var(--rosso)}
  .lgmsg{margin:0;font-weight:800;font-size:14px;color:var(--rosso);min-height:1.2em}
  .who{margin:-4px 0 0;font-size:14px;font-weight:800;color:var(--muted);display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}
  .who button{font-family:var(--display);font-weight:600;font-size:13px;border:2px solid var(--line);background:var(--card);border-radius:10px;padding:3px 9px;color:var(--ink);cursor:pointer}
  .sync{font-size:12px;font-weight:700;color:var(--muted)}`;
  document.head.append(css);
  const panel = document.createElement('div');
  panel.className = 'panel'; panel.id = 'loginPanel'; panel.hidden = true;
  panel.innerHTML = `<div class="sheet">
    <h1>Parla <span>Italiano!</span></h1>
    <p class="how">Entre com o código da turma que o professor passou.</p>
    <div class="seg"><button type="button" data-m="in" class="on">Já tenho conta</button><button type="button" data-m="up">Primeira vez</button></div>
    <form id="lgForm" style="display:flex;flex-direction:column;gap:12px" autocomplete="off">
      <label class="fld">Código da turma<input id="lgCode" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="ITA-XXXX" required><small id="lgClass"></small></label>
      <label class="fld">Seu nome<input id="lgName" autocorrect="off" spellcheck="false" placeholder="Nome e sobrenome" required></label>
      <label class="fld">PIN de 4 números<input id="lgPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label>
      <label class="fld" id="lgPin2w" hidden>Repita o PIN<input id="lgPin2" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4"></label>
      <button class="go" id="lgGo" type="submit">Entrar</button>
    </form>
    <p class="lgmsg" id="lgMsg" role="alert"></p>
    <button class="alt" id="lgGuest" type="button" style="background:none;border:0;cursor:pointer">Jogar sem conta (o progresso fica só neste aparelho)</button>
  </div>`;
  document.body.append(panel);
  let mode = 'in';
  panel.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.m; panel.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
    $('lgPin2w').hidden = mode !== 'up'; $('lgPin2').required = mode === 'up'; $('lgGo').textContent = mode === 'up' ? 'Criar minha conta' : 'Entrar'; $('lgMsg').textContent = '';
  }));
  const code0 = new URLSearchParams(location.search).get('turma'); if (code0) $('lgCode').value = code0.toUpperCase();
  async function checkCode() {
    const c = $('lgCode').value.trim(), out = $('lgClass'); if (!c) { out.textContent = ''; return null }
    const { data, error } = await sb.rpc('class_name', { p_code: c });
    if (error) { out.className = 'no'; out.textContent = 'Sem conexão para conferir o código.'; return null }
    out.className = data ? 'ok' : 'no'; out.textContent = data ? '✓ Turma: ' + data : 'Código não encontrado'; return data
  }
  $('lgCode').addEventListener('change', checkCode); if (code0) checkCode();
  $('lgGuest').addEventListener('click', () => { try { sessionStorage.setItem('parla-guest', '1') } catch (e) {} panel.hidden = true; showWho() });

  $('lgForm').addEventListener('submit', async e => {
    e.preventDefault(); const msg = $('lgMsg'); msg.textContent = '';
    const code = $('lgCode').value.trim(), name = $('lgName').value.trim().replace(/\s+/g, ' '), pin = $('lgPin').value.trim();
    if (!/^\d{4}$/.test(pin)) { msg.textContent = 'O PIN tem 4 números.'; return }
    if (slug(name).length < 2) { msg.textContent = 'Escreva o seu nome.'; return }
    $('lgGo').disabled = true; $('lgGo').textContent = 'Aguarde…';
    try {
      const cls = await checkCode(); if (!cls) { msg.textContent = 'Confira o código da turma.'; return }
      const email = emailOf(code, name), password = passOf(code, pin);
      if (mode === 'up') {
        if (pin !== $('lgPin2').value.trim()) { msg.textContent = 'Os dois PINs não são iguais.'; return }
        const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
        if (error) { msg.textContent = /registered|exists/i.test(error.message) ? 'Já existe um aluno com esse nome nesta turma. Toque em “Já tenho conta” ou use também o sobrenome.' : 'Não deu certo: ' + error.message; return }
        if (!data.session) { msg.textContent = 'Conta criada, mas o Supabase pede confirmação de e-mail. O professor precisa desligar “Confirm email”.'; return }
        const r = await sb.rpc('register_student', { p_code: code, p_name: name }); if (r.error) { msg.textContent = 'Erro ao entrar na turma: ' + r.error.message; return }
        await afterLogin(data.session.user, true)   // conta nova leva junto o que já foi jogado neste aparelho
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { msg.textContent = 'Nome ou PIN não conferem. Se for o seu primeiro acesso, toque em “Primeira vez”.'; return }
        await afterLogin(data.user, false)
      }
    } finally { $('lgGo').disabled = false; $('lgGo').textContent = mode === 'up' ? 'Criar minha conta' : 'Entrar' }
  });

  /* ---------- progresso local ⇄ nuvem ---------- */
  const KEEP = /^italiano-(automic|migr)/;
  function clearLocal() { try { Object.keys(localStorage).filter(k => k.startsWith('italiano-') && !KEEP.test(k)).forEach(k => localStorage.removeItem(k)) } catch (e) {} }
  async function pull(keepLocal) {
    const [p, t, me] = await Promise.all([
      sb.from('progress').select('lesson,hist,best').eq('user_id', user.id),
      sb.from('tests').select('tot,sc,pass,taken_at').eq('user_id', user.id).order('taken_at', { ascending: false }).limit(50),
      sb.from('profiles').select('display_name,ouv_tot,ouv_ok,class_id,is_admin').eq('id', user.id).maybeSingle()]);
    if (!keepLocal) (p.data || []).forEach(r => { LS.set('italiano-f' + r.lesson + '-hist', JSON.stringify(r.hist || [])); if (r.best) LS.set('italiano-f' + r.lesson + '-best', r.best) });
    const ts = t.data || [];
    if (ts.length) { const l = ts[0]; LS.set('italiano-testA1', JSON.stringify({ tot: l.tot, sc: l.sc, pass: l.pass, d: String(l.taken_at).slice(0, 10), best: Math.max(...ts.map(x => x.tot || 0)) })); if (ts.some(x => x.pass)) LS.set('italiano-testA1-pass', '1') }
    if (me.data) { profile = me.data; if (me.data.ouv_tot > (+LS.get('italiano-ouv-tot') || 0)) { LS.set('italiano-ouv-tot', me.data.ouv_tot); LS.set('italiano-ouv-ok', me.data.ouv_ok) } }
  }
  function localProgress() {
    return LESSONS.map(l => { const h = LS.json('italiano-f' + l + '-hist', null), pct = +LS.get('italiano-f' + l + '-pct') || 0, best = +LS.get('italiano-f' + l + '-best') || 0;
      const hist = Array.isArray(h) ? h : pct ? [pct] : []; return hist.length || best ? { user_id: user.id, lesson: l, hist, best, updated_at: new Date().toISOString() } : null }).filter(Boolean)
  }
  async function afterLogin(u, isNew) {
    user = u; const prev = LS.get('parla-uid');
    if (!isNew && prev !== u.id) clearLocal();          // outro aluno neste aparelho: começa do progresso dele
    if (prev && prev !== u.id) box = { ev: [], g: [], t: [] };
    LS.set('parla-uid', u.id);
    const keep = (isNew || prev === u.id) && LS.get('parla-dirty') === '1';   // ainda há partidas deste aparelho para enviar
    try { await pull(keep) } catch (e) {}
    if (!profile) { const r = await sb.from('profiles').select('display_name,ouv_tot,ouv_ok,class_id,is_admin').eq('id', u.id).maybeSingle(); profile = r.data }
    dirty = true; if (isNew) LS.set('parla-dirty', '1'); panel.hidden = true; showWho();
    try { window.__ita && window.__ita.refresh() } catch (e) {}
    track('start', { standalone: matchMedia('(display-mode: standalone)').matches, w: innerWidth });
    flush()
  }
  function showWho() {
    let w = $('who'); const home = document.querySelector('#home .sheet h1'); if (!home) return;
    if (!w) { w = document.createElement('p'); w.className = 'who'; w.id = 'who'; home.after(w) }
    w.textContent = '';
    if (user) {
      const s = document.createElement('span'); s.textContent = '👤 ' + ((profile && profile.display_name) || (user.user_metadata && user.user_metadata.name) || 'Aluno');
      const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Trocar aluno'; b.addEventListener('click', logout);
      const y = document.createElement('span'); y.className = 'sync'; y.id = 'syncTxt'; w.append(s, b, y); syncTxt()
    } else {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = '👤 Entrar para salvar na turma'; b.addEventListener('click', () => { panel.hidden = false }); w.append(b)
    }
  }
  function syncTxt() { const y = $('syncTxt'); if (!y) return; const n = box.ev.length + box.g.length + box.t.length; y.textContent = n ? '⏳ ' + n + ' para enviar' : '☁️ salvo' }
  async function logout() {
    await flush(); track('end', {}); await flush();
    await sb.auth.signOut(); user = null; profile = null; clearLocal(); LS.del('parla-uid');
    try { sessionStorage.removeItem('parla-guest') } catch (e) {}
    try { window.__ita && window.__ita.refresh() } catch (e) {}
    ['menu', 'menuA2', 'levelPanel', 'over'].forEach(id => { const x = $(id); if (x) x.hidden = true }); $('home').hidden = false;
    $('lgPin').value = ''; $('lgPin2').value = ''; $('lgName').value = ''; $('lgMsg').textContent = ''; panel.querySelector('.seg button[data-m="in"]').click(); panel.hidden = false; showWho()
  }

  /* ---------- telemetria ---------- */
  function track(type, data, lesson) {
    if (!user) return;
    box.ev.push({ session_id: session, ts: new Date().toISOString(), type, screen, lesson: lesson == null ? null : lesson, data: data || null });
    if (box.ev.length > 3000) box.ev.splice(0, box.ev.length - 3000);
    save(); syncTxt()
  }
  function screenName() {
    const vis = id => { const x = $(id); return x && !x.hidden };
    if (vis('loginPanel')) return 'login';
    if (vis('learnPanel')) return 'Dicionário · ' + ($('lnTitle') ? $('lnTitle').textContent.replace('📖 ', '') : '');
    if (vis('lessonSheet')) return 'Escolha: aprender ou desafio';
    if (vis('levelPanel')) return 'Meu nível';
    if (vis('over')) return 'Resultado';
    if (vis('home')) return 'Capa';
    if (vis('menu')) return 'A1 · lições';
    if (vis('menuA2')) return 'A2 · lições';
    const chip = $('lvlChip'); return chip ? chip.textContent.trim() : 'jogo'
  }
  function onScreen() { const s = screenName(); if (s !== screen) { screen = s; track('screen', null) } }
  const mo = new MutationObserver(onScreen);
  ['home', 'menu', 'menuA2', 'levelPanel', 'over', 'loginPanel', 'learnPanel', 'lessonSheet'].forEach(id => { const x = $(id); if (x) mo.observe(x, { attributes: true, attributeFilter: ['hidden'] }) });
  const chip = $('lvlChip'); if (chip) mo.observe(chip, { childList: true, characterData: true, subtree: true });
  setInterval(() => { if (user && document.visibilityState === 'visible') track('hb', null) }, 30000);
  setInterval(() => flush(), 45000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else if (user) { session = uuid(); track('start', { resume: true }); flush() } });
  addEventListener('online', () => flush());
  addEventListener('parla', e => {
    const d = e.detail || {}; if (!user) return;
    if (d.type === 'ans') track('ans', { it: d.it, ok: !!d.ok, helped: !!d.helped, tried: !!d.tried, listen: !!d.listen, read: !!d.read, timeout: !!d.timeout, learn: !!d.learn }, d.level);
    else if (d.type === 'start') track('play', null, d.level);
    else if (d.type === 'game') {
      box.g.push({ lesson: d.level, score: d.score, pct: d.pct, hits: d.hits, total: d.total, helped: d.helped, retries: d.retries, duration_s: d.dur, missed: d.missed, played_at: new Date().toISOString() });
      if (d.level === 50) { const r = LS.json('italiano-testA1', null); if (r) box.t.push({ kind: 'A1', tot: r.tot, sc: r.sc, pass: !!r.pass, taken_at: new Date().toISOString() }) }
      track('done', { pct: d.pct }, d.level); dirty = true; LS.set('parla-dirty', '1'); save(); flush()
    }
  });

  /* ---------- envio (com fila para quando estiver sem internet) ---------- */
  let busy = false;
  async function flush() {
    if (!user || busy || !navigator.onLine) return; busy = true;
    try {
      if (box.ev.length) { const part = box.ev.slice(0, 500); const { error } = await sb.from('events').insert(part.map(x => ({ ...x, user_id: user.id }))); if (!error) { box.ev.splice(0, part.length); save() } }
      if (box.g.length) { const part = box.g.slice(); const { error } = await sb.from('games').insert(part.map(x => ({ ...x, user_id: user.id }))); if (!error) { box.g.splice(0, part.length); save() } }
      if (box.t.length) { const part = box.t.slice(); const { error } = await sb.from('tests').insert(part.map(x => ({ ...x, user_id: user.id }))); if (!error) { box.t.splice(0, part.length); save() } }
      if (dirty) { const rows = localProgress(); const { error } = rows.length ? await sb.from('progress').upsert(rows) : {}; if (!error) { dirty = false; LS.del('parla-dirty') }
        await sb.rpc('sync_stats', { p_tot: +LS.get('italiano-ouv-tot') || 0, p_ok: +LS.get('italiano-ouv-ok') || 0 }) }
    } catch (e) {} finally { busy = false; syncTxt() }
  }
  addEventListener('pagehide', () => { track('end', {}); flush() });

  /* ---------- início ---------- */
  (async () => {
    const { data } = await sb.auth.getSession();
    if (data && data.session) { await afterLogin(data.session.user, false) }
    else { let guest = false; try { guest = sessionStorage.getItem('parla-guest') === '1' } catch (e) {} panel.hidden = guest; showWho() }
    onScreen()
  })();
})();
