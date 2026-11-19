/* Cedarville Learning — kids' app (vanilla JS, no build step).
   Parents sign up; children are profiles under the parent. */
(() => {
'use strict';

// ---------------------------------------------------------------- setup
const CFG = window.CEDAR_APP || {};
const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const API = (native ? CFG.NATIVE_API_BASE : CFG.API_BASE) || '/api';
const $app = document.getElementById('app');
const SITE = native ? 'https://www.cedarvilleprivateschool.com/' : '../';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const S = {
  token: store.get('cedar_token'),
  user: null,
  children: [], maxChildren: 1,
  childId: Number(store.get('cedar_child')) || null,
  sound: store.get('cedar_sound') !== 'off',
  voice: store.get('cedar_voice') !== 'off',
  classes: [], assignments: [], todo: 0, classesFor: null,
  features: (() => { try { return JSON.parse(store.get('cedar_features') || '{}'); } catch { return {}; } })(),
  gateUntil: 0, started: Date.now(), lastBreak: 0, installEvt: null,
  quiz: null,
};
const feat = (k) => !!(S.features && S.features[k]);
async function refreshFeatures() {
  try { const p = await api('/auth/providers'); S.features = p.features || {}; store.set('cedar_features', JSON.stringify(S.features)); return p; } catch { return null; }
}
const loadedScripts = {};
function loadScript(src) {
  return loadedScripts[src] || (loadedScripts[src] = new Promise((resolve, reject) => {
    const el = document.createElement('script'); el.src = src; el.onload = resolve;
    el.onerror = () => { delete loadedScripts[src]; reject(new Error('Could not load this page. Please check your internet and try again.')); };
    document.head.appendChild(el);
  }));
}
const land = () => (S.user && S.user.teacher_status === 'approved' && !S.children.length) ? '#/teacher' : (S.children.length ? '#/who' : '#/addchild');
async function ensureClasses(force = false) {
  const c = child();
  if (!c) { S.classes = []; S.assignments = []; S.todo = 0; return; }
  if (!force && S.classesFor === c.id) return;
  try { const r = await api('/learn/assignments?child_id=' + c.id); S.classes = r.classes; S.assignments = r.assignments; S.todo = r.todo; }
  catch { S.classes = []; S.assignments = []; S.todo = 0; }
  S.classesFor = c.id;
}
const child = () => S.children.find((c) => c.id === S.childId) || null;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------------------------------------------------------------- api
class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No internet right now. Check your connection and try again.', 0);
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    if (res.status === 401 && S.token && !path.startsWith('/auth/')) { logout(true); }
    let msg = data && data.detail;
    if (Array.isArray(msg)) msg = 'Please check what you typed and try again.';
    throw new ApiError(msg || 'Something went wrong. Please try again.', res.status);
  }
  return data;
}

// ---------------------------------------------------------------- campaign tag + anonymous funnel counters
// A visitor from an ad arrives with ?utm_source=...&utm_campaign=... . We remember the FIRST tag and send it with
// sign-up so you can see which ads bring parents who actually pay. No cookies, no IDs, no third-party trackers.
(function captureUtm() {
  try {
    const q = new URLSearchParams(location.search), t = {};
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach((k) => { const v = q.get(k); if (v) t[k] = v.slice(0, 60); });
    if (Object.keys(t).length && !store.get('cedar_utm')) store.set('cedar_utm', JSON.stringify(t));
  } catch { /* ignore */ }
})();
const utm = () => { try { return JSON.parse(store.get('cedar_utm') || '{}'); } catch { return {}; } };
const seen = new Set();
function track(name, once = false) {
  if (once && seen.has(name)) return;
  seen.add(name);
  try { fetch(API + '/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, utm: utm() }), keepalive: true }).catch(() => {}); } catch { /* ignore */ }
}
const DEMO_AGE = { tiny: 3, nursery: 5, lower: 7, upper: 10 };

// ---------------------------------------------------------------- sound & voice
let actx;
function tone(freqs, dur = 0.14) {
  if (!S.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    freqs.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, actx.currentTime + i * dur);
      g.gain.exponentialRampToValueAtTime(0.18, actx.currentTime + i * dur + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + i * dur + dur);
      o.connect(g).connect(actx.destination);
      o.start(actx.currentTime + i * dur); o.stop(actx.currentTime + i * dur + dur + 0.02);
    });
  } catch { /* audio blocked */ }
}
const sfx = { good: () => tone([523, 659, 784]), bad: () => tone([300, 240], 0.18), win: () => tone([523, 659, 784, 1047], 0.15), tap: () => tone([440], 0.06) };

let cachedVoice = null;
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    const rank = (v) => (/en[-_](NG|GB|ZA|IN)/i.test(v.lang) ? 3 : 2) + (/female|samantha|serena|moira|karen|natural|neural|google uk english female/i.test(v.name) ? 2 : 0);
    return vs.sort((a, b) => rank(b) - rank(a))[0] || null;
  } catch { return null; }
}
if ('speechSynthesis' in window) { try { speechSynthesis.onvoiceschanged = () => { cachedVoice = pickVoice(); }; } catch { /* ignore */ } }
// Reads text aloud. Emoji are removed (otherwise the voice says "star" and "party popper").
function speak(text, { force = false } = {}) {
  if (!('speechSynthesis' in window) || !S.sound || (!S.voice && !force)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim());
    cachedVoice = cachedVoice || pickVoice();
    if (cachedVoice) u.voice = cachedVoice;
    u.rate = 0.88; u.pitch = 1.12; u.lang = (cachedVoice && cachedVoice.lang) || 'en-GB';
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}
function stopSpeaking() { try { 'speechSynthesis' in window && speechSynthesis.cancel(); } catch { /* ignore */ } }

function confetti() {
  const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
  const bits = ['⭐', '🎉', '🎈', '✨', '💛', '🌟'];
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span');
    s.textContent = bits[i % bits.length];
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDuration = 2 + Math.random() * 2.2 + 's';
    s.style.animationDelay = Math.random() * 0.6 + 's';
    box.appendChild(s);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 5200);
}

// ---------------------------------------------------------------- mascot
function owl(mood = 'happy') {
  const mouth = mood === 'sad'
    ? '<path d="M44 66 q6 -5 12 0" stroke="#e07b00" stroke-width="3" fill="none" stroke-linecap="round"/>'
    : '<path d="M46 60 l4 8 l4 -8 z" fill="#ff9f1a"/>';
  const brow = mood === 'sad' ? '<path d="M30 34 l12 4 M70 34 l-12 4" stroke="#6b4a2b" stroke-width="3" stroke-linecap="round"/>' : '';
  return `<svg class="owl" viewBox="0 0 100 100" role="img" aria-label="Cedar the owl">
    <ellipse cx="50" cy="60" rx="32" ry="34" fill="#a9743f"/><ellipse cx="50" cy="68" rx="20" ry="22" fill="#f6dcae"/>
    <path d="M22 34 l-6 -18 l20 10 z M78 34 l6 -18 l-20 10 z" fill="#8a5b2e"/>
    <circle class="eye" cx="36" cy="42" r="14" fill="#fff"/><circle class="eye" cx="64" cy="42" r="14" fill="#fff"/>
    <circle class="eye" cx="37" cy="43" r="7" fill="#23314d"/><circle class="eye" cx="63" cy="43" r="7" fill="#23314d"/>
    <circle cx="39.5" cy="40.5" r="2.4" fill="#fff"/><circle cx="65.5" cy="40.5" r="2.4" fill="#fff"/>
    ${brow}${mouth}
    <path d="M30 78 q-8 -10 -4 -26 q10 8 10 22 z M70 78 q8 -10 4 -26 q-10 8 -10 22 z" fill="#8a5b2e"/>
    <path d="M42 92 l-3 6 M58 92 l3 6" stroke="#ff9f1a" stroke-width="4" stroke-linecap="round"/>
    <path d="M36 14 q14 -10 28 0" stroke="#1a56db" stroke-width="6" fill="none" stroke-linecap="round" opacity="0"/>
  </svg>`;
}

// ---------------------------------------------------------------- rendering helpers
function render(html, { nav = null, bar = true } = {}) {
  stopSpeaking();
  const c = child();
  const top = (bar && S.user && c) ? `
    <header class="topbar">
      <button class="who" data-act="switch" aria-label="Change who is playing"><span class="av">${esc(c.avatar)}</span><span>${esc(c.name)}</span></button>
      <span class="grow"></span>
      <span class="pill" title="Stars">⭐ ${c.stars}</span>
      <span class="pill" title="Days in a row">🔥 ${c.streak}</span>
      <button class="iconbtn" data-act="sound" aria-label="${S.sound ? 'Turn sound off' : 'Turn sound on'}">${S.sound ? '🔊' : '🔇'}</button>
      <button class="iconbtn" data-act="grownups" aria-label="Grown-ups area">🔒</button>
    </header>` : '';
  const tabs = nav ? `
    <nav class="tabs" aria-label="Main"><div class="inner">
      ${[['home', '🏠', 'Home'], ['play', '🎮', 'Play'], feat('videos') && ['watch', '📺', 'Watch'], S.classes.length && ['class', '🏫', 'Class'], feat('cedar') && ['cedar', '🦉', 'Cedar']].filter(Boolean)
        .map(([k, e, l]) => `<a class="tab ${nav === k ? 'on' : ''}" href="#/${k}" ${nav === k ? 'aria-current="page"' : ''}><span class="e">${e}${k === 'class' && S.todo ? `<i class="dot" aria-label="${S.todo} homework to do">${S.todo}</i>` : ''}</span>${l}</a>`).join('')}
    </div></nav>` : '';
  $app.innerHTML = `${top}<main class="screen" id="screen">${html}</main>${tabs}`;
  window.scrollTo(0, 0);
  const m = $('#screen'); if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
}
const loading = () => render('<div class="spinner" role="status" aria-label="Loading"></div>', { bar: false });
const toast = (cls, msg) => `<div class="${cls}" role="alert">${esc(msg)}</div>`;

document.addEventListener('click', (e) => {
  const jump = e.target.closest('[data-jump]');
  if (jump) { e.preventDefault(); const t = $('#plans'); if (t) t.scrollIntoView({ behavior: 'smooth' }); return; }
  // Links to the page we're already "on" (e.g. Home after a quiz) don't fire hashchange: re-render ourselves.
  const link = e.target.closest('a[href^="#/"]');
  if (link && link.getAttribute('href') === location.hash) { e.preventDefault(); route(); return; }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'switch') { location.hash = '#/who'; }
  else if (act === 'grownups') { location.hash = '#/grownups'; }
  else if (act === 'reload') { location.reload(); }
  else if (act === 'install') { installApp(); }
  else if (act === 'pwtoggle') { const i = $('#pw'); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; el.textContent = show ? '🙈 Hide password' : '👁 Show password'; }
  else if (act === 'sound') { S.sound = !S.sound; store.set('cedar_sound', S.sound ? 'on' : 'off'); if (!S.sound) stopSpeaking(); route(); }
  else if (act === 'voice') { S.voice = !S.voice; store.set('cedar_voice', S.voice ? 'on' : 'off'); if (!S.voice) stopSpeaking(); el.innerHTML = S.voice ? '🗣 Voice on' : '🤐 Voice off'; el.setAttribute('aria-pressed', S.voice); }
});

// broken thumbnails just fall back to the emoji (error events don't bubble, so use capture)
document.addEventListener('error', (e) => { const t = e.target; if (t && t.matches && t.matches('.vthumb img')) t.remove(); }, true);

// "Add to home screen" (Android Chrome)
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; const b = $('#installbtn'); if (b) b.hidden = false; });
async function installApp() { if (!S.installEvt) return; S.installEvt.prompt(); try { await S.installEvt.userChoice; } catch { /* ignore */ } S.installEvt = null; const b = $('#installbtn'); if (b) b.hidden = true; }
const installBtn = () => (S.installEvt && !native ? '<button class="btn ghost small" id="installbtn" data-act="install">📲 Add to home screen</button>' : '<button class="btn ghost small" id="installbtn" data-act="install" hidden>📲 Add to home screen</button>');

// ---------------------------------------------------------------- session
function logout(expired = false) {
  S.token = null; S.user = null; S.children = []; S.childId = null;
  store.del('cedar_token'); store.del('cedar_child');
  location.hash = '#/welcome';
  if (expired) setTimeout(() => { const m = $('#msg'); if (m) m.innerHTML = toast('err', 'Please log in again.'); }, 50);
}

async function loadUser() {
  if (!S.token) return false;
  try {
    S.user = await api('/auth/me');
    await loadChildren();
    await refreshFeatures();
    return true;
  } catch (e) {
    if (e.status === 0) { throw e; }
    return false;
  }
}
async function loadChildren() {
  const r = await api('/children');
  S.children = r.children; S.maxChildren = r.max_children;
  if (!S.children.some((c) => c.id === S.childId)) S.childId = null;
}
function pickChild(id) { S.childId = id; store.set('cedar_child', String(id)); }

// ---------------------------------------------------------------- Google sign-in
let gisPromise = null;
function loadGoogle() {
  if (window.google && window.google.accounts) return Promise.resolve();
  if (!gisPromise) gisPromise = new Promise((resolve, reject) => {
    const sc = document.createElement('script');
    sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true; sc.defer = true;
    sc.onload = resolve; sc.onerror = () => { gisPromise = null; reject(new Error('Google script blocked')); };
    document.head.appendChild(sc);
  });
  return gisPromise;
}
async function setupGoogle(mode) {
  const slot = $('#gbtn');
  if (!slot || native) return;  // Google blocks sign-in inside app web-views; the Android app needs its own plugin later
  try {
    const { google_client_id } = await api('/auth/providers');
    if (!google_client_id) return;
    await loadGoogle();
    if (!$('#gbtn')) return;  // user navigated away
    window.google.accounts.id.initialize({
      client_id: google_client_id, ux_mode: 'popup', auto_select: false, itp_support: true,
      callback: (resp) => googleDone(resp.credential, mode),
    });
    window.google.accounts.id.renderButton(slot, {
      theme: 'outline', size: 'large', shape: 'pill', width: Math.min(320, slot.clientWidth || 320),
      text: mode === 'signup' ? 'signup_with' : 'signin_with', logo_alignment: 'left',
    });
    $('#gwrap').hidden = false;
  } catch { /* offline or blocked: the email form still works */ }
}
async function googleDone(credential, mode) {
  const msg = $('#msg');
  const agree = $('#agree');
  if (mode === 'signup' && agree && !agree.checked) { msg.innerHTML = toast('err', 'Please tick the parent/guardian box first, then tap the Google button again.'); return; }
  try {
    const r = await api('/auth/google', { method: 'POST', body: { credential, accepted_terms: mode === 'signup' && !!(agree && agree.checked), utm: utm(), as_teacher: false } });
    S.token = r.token; store.set('cedar_token', r.token);
    await loadUser();
    if (r.note) alert(r.note);
    location.hash = land();
    route();
  } catch (e) { if (msg) msg.innerHTML = toast('err', e.message); }
}

const weekStrip = (week) => !week ? '' : `<div class="week" aria-label="Your week"><b>Your week</b><div class="wk">${week.map((w) => `<div class="wd ${w.done ? 'on' : ''}" aria-label="${w.done ? 'quiz done' : 'not yet'}"><span>${w.done ? '🔥' : '·'}</span><small>${'SMTWTFS'[new Date(w.day + 'T12:00:00').getDay()]}</small></div>`).join('')}</div></div>`;

const brand = (big = false) => `<div class="brand ${big ? 'big' : ''}"><img src="icons/school-logo.png" alt="Cedarville Private Schools logo" width="${big ? 84 : 48}" height="${big ? 84 : 48}"><span>Cedarville Private Schools</span></div>`;

// ---------------------------------------------------------------- screens
function welcome(mode = 'signup') {
  const signup = mode === 'signup';
  render(`
    <div class="center welcome-hero">
      ${brand()}
      <div class="wh-row">${owl('happy')}<div style="text-align:left"><h1>Learning that feels like play 🎈</h1></div></div>
      <p class="muted" style="margin:4px 0 10px">A fun new quiz every day for ages 2–11. Free to start.</p>
      <div class="trustchips"><span>🚫 No ads</span><span>🔒 No chat</span><span>🔊 Read aloud</span></div>
      <a class="btn sun block" href="#/try" style="margin-top:12px">🎮 Try a free quiz, no sign-up</a>
    </div>
    <div class="card authcard">
      <div class="seg" role="tablist">
        <button role="tab" class="${signup ? 'on' : ''}" data-mode="signup">New here? Sign up</button>
        <button role="tab" class="${!signup ? 'on' : ''}" data-mode="login">Log in</button>
      </div>
      <p class="muted" style="font-size:.95rem;margin-top:0">👨‍👩‍👧 This is for <b>parents and guardians</b>. You'll make a safe profile for your child next.</p>
      <div id="msg"></div>
      ${signup ? `<label class="check consent"><input id="agree" type="checkbox"><span>I am a parent or guardian aged 18+, and I agree to the <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>` : ''}
      <div id="gwrap" hidden><div id="gbtn" class="gbtn"></div><div class="or"><span>or use your email</span></div></div>
      <form id="authform" novalidate>
        ${signup ? '<label for="name">Your name</label><input id="name" type="text" autocomplete="name" maxlength="80" required>' : ''}
        <label for="email">Email</label><input id="email" type="email" autocomplete="email" inputmode="email" required>
        <label for="pw">Password ${signup ? '<span class="muted" style="font-weight:400">(8+ characters)</span>' : ''}</label>
        <input id="pw" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required>
        <button type="button" class="link" data-act="pwtoggle" style="padding-left:0">👁 Show password</button>
        ${signup ? '<label class="check"><input id="asteacher" type="checkbox"><span>👩‍🏫 I am a teacher (the school approves teacher accounts)</span></label>' : ''}
        <button class="btn block ${signup ? 'sun' : ''}" type="submit">${signup ? 'Create my account 🎉' : 'Log in'}</button>
      </form>
      <p class="center" style="margin:14px 0 0"><a href="#/plans">What's included? Free vs Premium →</a></p>
      ${!signup ? '<p class="muted center" style="font-size:.9rem;margin:14px 0 0">Forgot your password? Email <a href="mailto:cedarvilleprivate@gmail.com">cedarvilleprivate@gmail.com</a> and we will help.</p>' : ''}
    </div>
    <p class="center">${installBtn()} <a class="btn ghost small" href="#/install">How to install</a></p>
    <p class="center"><a href="${SITE}index.html"${native ? ' target="_blank" rel="noopener"' : ''}>← Cedarville Schools website</a></p>`, { bar: false });

  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => welcome(b.dataset.mode)));
  setupGoogle(mode);
  if (mode === 'signup') track('signup_view', true);
  $('#authform').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const msg = $('#msg'), btn = $('button[type=submit]');
    const email = $('#email').value.trim(), password = $('#pw').value;
    if (!email || !password) { msg.innerHTML = toast('err', 'Please fill in your email and password.'); return; }
    let body = { email, password };
    if (mode === 'signup') {
      const display_name = $('#name').value.trim();
      if (!display_name) { msg.innerHTML = toast('err', 'Please tell us your name.'); return; }
      if (password.length < 8) { msg.innerHTML = toast('err', 'Your password needs at least 8 characters. A few random words work well!'); return; }
      if (!$('#agree').checked) { msg.innerHTML = toast('err', 'Please tick the box to confirm you are a parent or guardian.'); return; }
      body.display_name = display_name; body.utm = utm(); body.as_teacher = !!($('#asteacher') && $('#asteacher').checked);
    }
    btn.disabled = true;
    try {
      const r = await api(mode === 'signup' ? '/auth/signup' : '/auth/login', { method: 'POST', body });
      S.token = r.token; store.set('cedar_token', r.token);
      await loadUser();
      location.hash = land();
      route();
    } catch (e) { msg.innerHTML = toast('err', e.message); btn.disabled = false; }
  });
}

// ---------------------------------------------------------------- try a free quiz (no sign-up)
let sampleData = null;
async function loadSample() { if (!sampleData) { const r = await fetch('sample.json'); if (!r.ok) throw new Error('sample'); sampleData = await r.json(); } return sampleData; }

function tryPage(query) {
  const level = new URLSearchParams(query || '').get('level');
  if (!DEMO_AGE[level]) {
    render(`${brand()}<div class="center"><h1>How old is your child? 🎈</h1><p class="muted">Pick an age and play a free 5-question quiz. No sign-up needed.</p></div>
      <div class="kidpick">${[['tiny', '🧸', '2–3 years'], ['nursery', '🎨', '4–5 years'], ['lower', '📚', '6–8 years'], ['upper', '🎒', '9–11 years']]
        .map(([k, e, t]) => `<a class="kp" href="#/try?level=${k}"><span class="av">${e}</span>${t}</a>`).join('')}</div>
      <p class="center" style="margin-top:20px"><a href="#/welcome">← Back</a></p>`, { bar: false });
    return;
  }
  loading();
  loadSample().then((data) => {
    const rng = () => Math.random() - 0.5;
    S.demo = { level, qs: data[level].map((q) => ({ ...q, options: [...q.options].sort(rng) })), i: 0, correct: 0 };
    track('demo_start');
    store.set('cedar_demo_level', level);
    demoQuestion();
  }).catch(() => render(`<div class="card center">${owl('sad')}<h2>No connection</h2><p>Please check your internet and try again.</p><a class="btn" href="#/try">Try again</a></div>`, { bar: false }));
}
function demoQuestion() {
  const D = S.demo, q = D.qs[D.i];
  render(`
    <div class="qtop"><a class="iconbtn" href="#/welcome" aria-label="Leave the quiz" style="text-decoration:none;display:grid;place-items:center">✖</a>
      <div class="dots" aria-label="Question ${D.i + 1} of ${D.qs.length}">${D.qs.map((_, i) => `<i class="${i < D.i ? 'ok' : i === D.i ? 'now' : ''}"></i>`).join('')}</div></div>
    <div class="card qcard"><div class="visual ${[...q.visual].length > 6 ? 'small' : ''}" aria-hidden="true">${esc(q.visual)}</div>
      <div class="qtext">${esc(q.prompt)}</div><button class="btn ghost small speak" id="say">🔊 Read to me</button></div>
    <div class="opts">${q.options.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><div id="fb"></div>`, { bar: false });
  const readQ = () => speak(`${q.prompt}. ${q.options.join('. ')}`);
  $('#say').addEventListener('click', readQ);
  setTimeout(readQ, 350);
  $$('.opt').forEach((b) => b.addEventListener('click', () => {
    stopSpeaking();
    const ok = b.dataset.o === q.answer; D.correct += ok;
    $$('.opt').forEach((x) => { x.disabled = true; if (x.dataset.o === q.answer && !ok) x.classList.add('reveal'); });
    b.classList.add(ok ? 'right' : 'wrong'); (ok ? sfx.good : sfx.bad)();
    const last = D.i === D.qs.length - 1;
    $('#fb').innerHTML = `<div class="feedback ${ok ? 'good' : 'try'}" role="status">${owl(ok ? 'happy' : 'sad')}<div><b>${ok ? pick(['Hooray! 🎉', 'Super! ⭐', 'Brilliant! 🌟']) : 'Good try! 💪'}</b><br>${esc(q.explanation)}</div></div>
      <button class="btn block ${last ? 'sun' : ''}" id="dnext" style="margin-top:14px">${last ? 'See my score ⭐' : 'Next ➜'}</button>`;
    $('#dnext').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#dnext').addEventListener('click', () => { if (last) demoDone(); else { D.i++; demoQuestion(); } });
  }));
}
function demoDone() {
  const D = S.demo; track('demo_done'); sfx.win(); if (D.correct >= 3) confetti();
  render(`<div class="card center">${owl('happy').replace('class="owl"', 'class="owl big"')}
    <h1>${D.correct === D.qs.length ? 'PERFECT! 🏆' : D.correct >= 3 ? 'Well done! 🎉' : 'Nice try! 💪'}</h1>
    <p>You got <b>${D.correct}</b> out of <b>${D.qs.length}</b>.</p>
    <div class="stars-big" aria-hidden="true">${'⭐'.repeat(Math.max(1, D.correct))}</div>
    <div class="promo" style="text-align:left;margin:14px 0 10px">🎁 <b>Grown-ups:</b> create a free account to save stars, build a daily streak and get a brand-new quiz every day.</div>
    <a class="btn sun block" href="#/welcome" id="dsignup">Create my free account 🎉</a><p></p>
    <a class="btn ghost block" href="#/try">Try another age</a></div>`, { bar: false });
  $('#dsignup').addEventListener('click', () => track('cta_click'));
}

function who() {
  render(`
    ${brand()}
    <div class="center"><h1>Who is playing? 🎈</h1></div>
    <div class="kidpick">
      ${S.children.map((c) => `<button data-id="${c.id}"><span class="av">${esc(c.avatar)}</span>${esc(c.name)}</button>`).join('')}
      <button data-add><span class="av">➕</span>Add a child</button>
    </div>
    <p class="center" style="margin-top:24px"><button class="link" data-act="grownups">🔒 Grown-ups area</button></p>`, { bar: false });
  $$('[data-id]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); pickChild(Number(b.dataset.id)); location.hash = '#/home'; }));
  $('[data-add]').addEventListener('click', () => { location.hash = '#/addchild'; });
}

const AVATARS = ['🦁', '🐯', '🐼', '🐸', '🐵', '🦄', '🐧', '🐙', '🦊', '🐰', '🐶', '🐱'];
function addChild() {
  if (S.children.length >= S.maxChildren) {
    render(`<div class="card center"><h2>All profiles are in use</h2><p>Your plan has ${S.maxChildren} child profile${S.maxChildren > 1 ? 's' : ''}. A grown-up can upgrade to add more.</p><a class="btn" href="#/who">Back</a></div>`, { bar: false });
    return;
  }
  let age = DEMO_AGE[store.get('cedar_demo_level')] || null, avatar = AVATARS[0];
  render(`
    <div class="center"><h1>Let's meet your child! 🌟</h1></div>
    <div class="card">
      <div id="msg"></div>
      <label for="cname">First name or nickname</label>
      <input id="cname" type="text" maxlength="40" autocomplete="off" placeholder="e.g. Ada">
      <p class="muted" style="font-size:.9rem;margin:6px 0 0">Please don't use a full name.</p>
      <label>How old is your child?</label>
      <div class="chips" id="ages">${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((a) => `<button class="chip" data-age="${a}">${a}</button>`).join('')}</div>
      <label>Pick a buddy</label>
      <div class="avatars" id="avs">${AVATARS.map((a, i) => `<button type="button" class="${i === 0 ? 'on' : ''}" data-av="${a}" aria-label="Avatar ${a}">${a}</button>`).join('')}</div>
      <button class="btn block sun" id="save" style="margin-top:20px">Start learning! 🚀</button>
      ${S.children.length ? '<p class="center"><a href="#/who">Cancel</a></p>' : ''}
    </div>`, { bar: false });
  if (age) $$('[data-age]').forEach((x) => x.classList.toggle('on', Number(x.dataset.age) === age));
  $$('[data-age]').forEach((b) => b.addEventListener('click', () => { age = Number(b.dataset.age); $$('[data-age]').forEach((x) => x.classList.toggle('on', x === b)); }));
  $$('[data-av]').forEach((b) => b.addEventListener('click', () => { avatar = b.dataset.av; $$('[data-av]').forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#save').addEventListener('click', async () => {
    const name = $('#cname').value.trim();
    const msg = $('#msg');
    if (!name) { msg.innerHTML = toast('err', 'Please type a name.'); return; }
    if (!age) { msg.innerHTML = toast('err', 'Please pick an age.'); return; }
    try {
      const c = await api('/children', { method: 'POST', body: { name, age, avatar } });
      await loadChildren(); pickChild(c.id); sfx.win(); location.hash = '#/home';
    } catch (e) { msg.innerHTML = toast('err', e.message); }
  });
}

async function home() {
  const c = child();
  let d;
  try { [d] = await Promise.all([api('/learn/daily?child_id=' + c.id), ensureClasses(true)]); }
  catch (e) { return fail(e); }
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const line = d.already_done
    ? `Great job today, ${esc(c.name)}! Come back tomorrow for a new quiz. 🌙`
    : c.streak > 1 ? `${greet}, ${esc(c.name)}! You're on a ${c.streak}-day streak! 🔥` : `${greet}, ${esc(c.name)}! Ready for today's quiz? 🎉`;
  render(`
    <div class="hello">${owl('happy')}<div class="bubble">${line}</div></div>
    <button class="big-cta ${d.already_done ? 'done' : ''}" id="daily">
      <div class="t">${d.already_done ? 'Today\'s quiz is done! ✅' : 'Today\'s Quiz'}</div>
      <div class="s">${d.already_done ? `You got ${d.result.correct} out of ${d.result.total} and earned ${d.result.stars} ⭐` : '5 quick questions · earn stars ⭐'}</div>
      <div class="e">${d.already_done ? '🏆' : '🎯'}</div>
    </button>
    ${S.todo ? `<a class="hwcard" href="#/class"><span class="e">📚</span><span class="grow"><b>${S.todo} homework to do</b><br><small>${esc(S.assignments.find((x) => !x.done).title)} · ${esc(S.assignments.find((x) => !x.done).class_name)}</small></span><span class="go">Open ➜</span></a>` : ''}
    ${weekStrip(d.week)}
    <div class="tiles">
      <button class="tile c0 ${feat('videos') || feat('cedar') ? '' : 'wide'}" data-go="play"><span class="e">🎮</span>Play & Practise<small>Pick a subject</small></button>
      ${feat('videos') ? '<button class="tile c2" data-go="watch"><span class="e">📺</span>Watch & Learn<small>Songs and videos</small></button>' : ''}
      ${feat('cedar') ? '<button class="tile c4" data-go="cedar"><span class="e">🦉</span>Ask Cedar<small>Your owl friend</small></button>' : ''}
      <button class="tile c3 ${(feat('videos') ? 1 : 0) + (feat('cedar') ? 1 : 0) === 1 ? 'wide' : ''}" data-go="stars"><span class="e">🏅</span>My Stars<small>${c.stars} ⭐ · best streak ${c.best_streak} 🔥</small></button>
    </div>
    <p class="center" style="margin-top:18px"><button class="btn ghost small" id="tour">🧭 Take the tour</button></p>`, { nav: 'home' });
  if (store.get('cedar_tour_off') !== '1' && !store.get('cedar_tour_' + c.id)) setTimeout(() => { if (location.hash === '#/home' || location.hash === '' || location.hash === '#/') startTour(); }, 900);
  $('#tour').addEventListener('click', startTour);
  $('#daily').addEventListener('click', () => {
    if (d.already_done) { sfx.good(); confetti(); return; }
    startQuiz({ kind: 'daily', subject: 'mixed', questions: d.questions, title: 'Today\'s Quiz' });
  });
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => { sfx.tap(); location.hash = '#/' + b.dataset.go; }));
}

function fail(e) {
  if (e.status === 402) { return upsell(e.message); }
  render(`<div class="card center">${owl('sad')}<h2>Oh no!</h2><p>${esc(e.message)}</p><button class="btn" data-act="reload">Try again</button></div>`, { nav: child() ? 'home' : null });
}

const compareTable = (rows) => `<div class="cmp" role="table" aria-label="Free versus Premium">
  <div class="cmp-h" role="row"><span></span><b>Free</b><b class="pm">Premium ⭐</b></div>
  ${rows.map((r) => `<div class="cmp-r" role="row"><span role="cell">${esc(r.feature)}</span><span role="cell">${esc(r.free)}</span><span class="pm" role="cell">${esc(r.premium)}</span></div>`).join('')}</div>`;

function upsell(message) {
  render(`<div class="card center">${owl('happy')}<h2>That's a Premium treat! ⭐</h2><p>${esc(message || 'Ask a grown-up to unlock this.')}</p>
    <a class="btn grape block" href="#/upgrade">Ask a grown-up 🔒</a><p></p><a class="btn ghost block" href="#/plans">What does Premium include?</a><p></p><a class="btn ghost block" href="#/home">Back home</a></div>`, { nav: 'home' });
}

async function play() {
  const c = child();
  let r;
  try { r = await api('/learn/subjects?child_id=' + c.id); } catch (e) { return fail(e); }
  render(`
    <h2>Pick something to play! 🎮</h2>
    ${r.premium ? '' : `<p class="muted">Free practice rounds left today: <b>${r.practice_left}</b> ${r.practice_left ? '' : '— come back tomorrow!'}</p>`}
    ${r.subjects.some((x) => x.locked) ? '<a class="promo" href="#/plans">⭐ Premium unlocks every subject and unlimited practice →</a>' : ''}
    <div class="tiles">
      <button class="tile c1" data-sub=""><span class="e">🎲</span>Surprise Me<small>Mixed questions</small></button>
      ${r.subjects.map((s, i) => `<button class="tile c${(i + 2) % 6} ${s.locked ? 'locked' : ''}" data-sub="${esc(s.key)}" data-locked="${s.locked ? 1 : 0}" aria-label="${esc(s.label)}${s.locked ? ' (Premium)' : ''}">${s.locked ? '<span class="lockbadge">🔒 Premium</span>' : ''}<span class="e">${s.emoji}</span>${esc(s.label)}<small>${s.count} questions</small></button>`).join('')}
    </div>`, { nav: 'play' });
  $$('[data-sub]').forEach((b) => b.addEventListener('click', async () => {
    sfx.tap();
    const sub = b.dataset.sub;
    if (b.dataset.locked === '1') { upsell('This subject is part of Premium. Ask a grown-up to unlock every subject!'); return; }
    try {
      const q = await api(`/learn/practice?child_id=${c.id}${sub ? '&subject=' + encodeURIComponent(sub) : ''}`);
      startQuiz({ kind: 'practice', subject: q.subject, questions: q.questions, title: sub ? (r.subjects.find((s) => s.key === sub) || {}).label : 'Surprise Me' });
    } catch (e) { fail(e); }
  }));
}

// ---------------------------------------------------------------- quiz
function startQuiz(q) {
  S.quiz = { ...q, i: 0, answers: [], marks: [], locked: false };
  showQuestion();
}

function showQuestion() {
  const Q = S.quiz, q = Q.questions[Q.i];
  const c = child();
  const long = [...q.visual].length > 6;
  render(`
    <div class="qtop">
      <button class="iconbtn" id="quit" aria-label="Stop quiz">✖</button>
      <div class="dots" aria-label="Question ${Q.i + 1} of ${Q.questions.length}">
        ${Q.questions.map((_, i) => `<i class="${Q.marks[i] || (i === Q.i ? 'now' : '')}"></i>`).join('')}
      </div>
      <button class="vpill" data-act="voice" aria-pressed="${S.voice}">${S.voice ? '🗣 Voice on' : '🤐 Voice off'}</button>
    </div>
    ${Q.kind === 'assignment' ? `<div class="hwbanner">📚 <b>${esc(Q.title)}</b>${Q.instructions && Q.i === 0 ? `<br><span>${esc(Q.instructions)}</span>` : ''}</div>` : ''}
    <div class="qcount">Question ${Q.i + 1} of ${Q.questions.length}</div>
    <div class="card qcard slide">
      ${q.visual ? `<div class="visual ${long ? 'small' : ''}" aria-hidden="true">${esc(q.visual)}</div>` : ''}
      <div class="qtext">${esc(q.prompt)}</div>
      <button class="btn ghost small speak" id="say" aria-label="Read the question aloud">🔊 Read to me</button>
    </div>
    <div class="opts" id="opts">
      ${q.options.map((o, i) => `<button class="opt" data-o="${esc(o)}"><span class="ltr" aria-hidden="true">${'ABCD'[i]}</span><span class="ot">${esc(o)}</span></button>`).join('')}
    </div>
    <div id="fb"></div>`, { bar: true });
  $('#quit').addEventListener('click', () => { if (confirm('Stop this quiz?')) location.hash = '#/home'; });
  const readQ = () => speak(`${q.prompt}. ${q.options.join('. ')}`);
  $('#say').addEventListener('click', readQ);
  setTimeout(readQ, 350);  // reads every question aloud by itself (the Voice button turns it off)

  $$('.opt').forEach((b) => b.addEventListener('click', async () => {
    if (Q.locked) return;
    Q.locked = true; stopSpeaking();
    const answer = b.dataset.o;
    $$('.opt').forEach((x) => (x.disabled = true));
    let r;
    try { r = await api('/learn/check', { method: 'POST', body: { child_id: c.id, question_id: q.id, answer, ...(Q.assignment_id ? { assignment_id: Q.assignment_id } : {}) } }); }
    catch (e) { Q.locked = false; $$('.opt').forEach((x) => (x.disabled = false)); $('#fb').innerHTML = toast('err', e.message); return; }
    Q.answers.push({ question_id: q.id, answer });
    Q.marks.push(r.correct ? 'ok' : 'no');
    b.classList.add(r.correct ? 'right' : 'wrong');
    if (!r.correct) $$('.opt').forEach((x) => { if (x.dataset.o === r.answer) x.classList.add('reveal'); });
    (r.correct ? sfx.good : sfx.bad)();
    const last = Q.i === Q.questions.length - 1;
    const cheer = r.correct ? pick(['Hooray! 🎉', 'Super! ⭐', 'Brilliant! 🌟', 'You got it! 👏']) : 'Good try! 💪';
    setTimeout(() => speak(r.correct ? `${cheer} ${r.explanation}` : `${cheer} The answer is ${r.answer}. ${r.explanation}`), 450);
    $('#fb').innerHTML = `
      <div class="feedback ${r.correct ? 'good' : 'try'}" role="status">${owl(r.correct ? 'happy' : 'sad')}
        <div><b>${cheer}</b><br>${esc(r.explanation)}</div></div>
      <button class="btn block ${last ? 'sun' : ''}" id="next" style="margin-top:14px">${last ? 'See my stars! ⭐' : 'Next ➜'}</button>`;
    $('#next').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#next').addEventListener('click', () => {
      Q.locked = false;
      if (last) return finishQuiz();
      const go = () => { Q.i++; showQuestion(); };
      if (Date.now() - (S.lastBreak || S.started) > BREAK_AFTER_MS) breakCard(go); else go();
    });
  }));
}
const BREAK_AFTER_MS = 15 * 60 * 1000;
function breakCard(cont) {
  S.lastBreak = Date.now();
  render(`<div class="card center">${owl('happy').replace('class="owl"', 'class="owl big"')}<h2>Time for a wiggle break! 🤸</h2>
    <p>You've been learning for a while. Stand up, stretch up high and take a big sip of water. 💧</p>
    <button class="btn sun block" id="goon">I'm ready! Let's go ➜</button><p></p><a class="btn ghost block" href="#/home">Finish for now 🏠</a></div>`, { bar: false });
  $('#goon').addEventListener('click', cont);
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

async function finishQuiz() {
  const Q = S.quiz, c = child();
  loading();
  try {
    const r = await api('/learn/submit', { method: 'POST', body: { child_id: c.id, kind: Q.kind, subject: Q.subject, answers: Q.answers, ...(Q.assignment_id ? { assignment_id: Q.assignment_id } : {}) } });
    await loadChildren();
    if (Q.kind === 'assignment') await ensureClasses(true);
    const hw = Q.kind === 'assignment';
    const all = r.correct === r.total;
    sfx.win(); if (r.correct >= Math.ceil(r.total / 2)) confetti();
    render(`
      <div class="card center">
        ${owl('happy').replace('class="owl"', 'class="owl big"')}
        <h1>${all ? 'PERFECT! 🏆' : r.correct >= r.total / 2 ? 'Well done! 🎉' : 'Nice try! 💪'}</h1>
        <p>You got <b>${r.correct}</b> out of <b>${r.total}</b> right.</p>
        <div class="stars-big" aria-hidden="true">${'⭐'.repeat(Math.min(5, Math.max(1, Math.round((r.correct / r.total) * 5))))}</div>
        <p><b>+${r.stars_earned} stars</b> earned! You have ${r.stars} ⭐ in total.</p>
        ${hw ? '<div class="ok">📚 Homework handed in! Your teacher can see your score.</div>' : ''}
        ${Q.kind === 'daily' ? `<p>🔥 ${r.streak}-day streak! Come back tomorrow for a new quiz.</p><div id="wkslot"></div>` : ''}
        <button class="btn sun block" id="again">${hw ? 'Back to my class 🏫' : Q.kind === 'daily' ? 'Play more games 🎮' : 'Play again 🎮'}</button><p></p>
        <a class="btn ghost block" href="#/home">Home 🏠</a>
      </div>`, { nav: 'home' });
    setTimeout(() => speak(`${all ? 'Perfect!' : r.correct >= r.total / 2 ? 'Well done!' : 'Nice try!'} You got ${r.correct} out of ${r.total}. You earned ${r.stars_earned} stars.`), 500);
    $('#again').addEventListener('click', () => { const to = hw ? '#/class' : '#/play'; if (location.hash === to) route(); else location.hash = to; });
    if (Q.kind === 'daily') api('/learn/daily?child_id=' + c.id).then((d) => { const sl = $('#wkslot'); if (sl) sl.innerHTML = weekStrip(d.week); }).catch(() => {});
  } catch (e) { fail(e); }
  S.quiz = null;
}

// ---------------------------------------------------------------- videos
async function watch() {
  const c = child();
  let r;
  try { r = await api('/learn/videos?child_id=' + c.id); } catch (e) { return fail(e); }
  render(`
    <h2>Watch & Learn 📺</h2>
    <p class="muted">Videos picked by grown-ups, just for you.</p>
    ${r.videos.length ? `<div class="vgrid">${r.videos.map((v) => `
      <button class="vcard ${v.locked ? 'locked' : ''}" data-v="${v.id}" aria-label="${esc(v.title)}${v.locked ? ' (Premium)' : ''}">
        <div class="vthumb">${esc(v.emoji)}${v.youtube_id ? `<img loading="lazy" alt="" src="https://i.ytimg.com/vi/${encodeURIComponent(v.youtube_id)}/hqdefault.jpg">` : ''}
          <span class="play">${v.locked ? '🔒' : '▶'}</span></div>
        <div class="vt">${esc(v.title)} ${v.locked ? '<span class="badge">Premium</span>' : ''}</div>
      </button>`).join('')}</div>`
      : `<div class="card center">${owl('happy')}<p>New videos are coming soon! 🎬</p></div>`}`, { nav: 'watch' });
  $$('[data-v]').forEach((b) => b.addEventListener('click', () => {
    const v = r.videos.find((x) => x.id === Number(b.dataset.v));
    if (v.locked) { upsell('This video is part of Premium.'); return; }
    sfx.tap(); openPlayer(v);
  }));
}

function openPlayer(v) {
  const m = document.createElement('div');
  m.className = 'modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', v.title);
  const id = encodeURIComponent(v.youtube_id);
  m.innerHTML = `<div class="box">
    <iframe class="player" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"
      src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1"></iframe>
    <h3 style="margin-top:12px">${esc(v.title)}</h3>
    <p class="muted" style="font-size:.9rem">Video not playing? <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">Grown-ups: open on YouTube</a></p>
    <button class="btn block" id="closev">Close ✖</button></div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  $('#closev', m).addEventListener('click', close);
  m.addEventListener('click', (e) => { if (e.target === m) close(); });
  $('#closev', m).focus();
}

// ---------------------------------------------------------------- guided tour
let tourPlans = null;
function tourSteps() {
  const row = (name) => (tourPlans && tourPlans.comparison.find((r) => r.feature.startsWith(name))) || { free: '', premium: '' };
  const pr = row('Practice rounds'), sub = row('Practice subjects'), ai = row('Cedar');
  return [
    { sel: null, t: 'Welcome to Cedarville Learning! 🦉', x: "I'm Cedar the owl. Let me show you around. It takes less than a minute!" },
    { sel: '#daily', t: "Today's Quiz 🎯", x: 'A brand-new 5-question quiz every day. It is always free. Finish it to earn stars and grow your streak!' },
    { sel: '[data-go=play]', t: 'Play & Practise 🎮', x: `Pick a subject and practise. Free: ${pr.free || '1 round a day'} in ${sub.free || 'a few subjects'}. Premium: ${(pr.premium || 'unlimited').toLowerCase()} practice in every subject.` },
    feat('videos') && { sel: '[data-go=watch]', t: 'Watch & Learn 📺', x: 'Songs and videos chosen by teachers, in a safe player with no ads or comments. A few are Premium.' },
    feat('cedar') && { sel: '[data-go=cedar]', t: 'Ask Cedar 🦉', x: `I answer kids' questions in simple words. Free: ${ai.free || 'a few questions'}. Premium: ${ai.premium || 'many more'}.` },
    { sel: '[data-go=stars]', t: 'Stars & stickers 🏅', x: 'Every right answer earns stars. Collect stickers for star milestones and day streaks!' },
    { sel: '.topbar .pill', t: 'Your stars and streak', x: 'Your total ⭐ stars and 🔥 day streak live up here. Play every day to keep the fire going!' },
    { sel: '[data-act=grownups]', t: 'Grown-ups only 🔒', x: 'Parents: tap the lock and solve the quick maths question. You can see progress, add children and upgrade to Premium.' },
    { sel: null, t: 'Free or Premium? ⭐', x: 'The daily quiz is free forever. Premium unlocks every subject, unlimited practice and progress insights for parents.' + (feat('cedar') ? ' You also get more chats with Cedar.' : ''), cta: 'See Free vs Premium' },
  ].filter(Boolean);
}
async function startTour() {
  if ($('.tour')) return;
  if (!tourPlans) { try { tourPlans = await api('/payments/plans'); } catch { /* generic text is used */ } }
  const wrap = document.createElement('div');
  wrap.className = 'tour';
  wrap.innerHTML = '<div class="tour-block"></div><div class="tour-spot" hidden></div><div class="tour-sheet" role="dialog" aria-modal="true" aria-label="App tour"></div>';
  document.body.appendChild(wrap);
  S.tour = { i: 0, steps: tourSteps(), wrap };
  window.addEventListener('hashchange', endTour, { once: true });
  window.addEventListener('resize', placeTour);
  setTimeout(showTourStep, 150);
}
function endTour(markSeen = true) {
  const t = S.tour; if (!t) return;
  t.wrap.remove(); S.tour = null; window.removeEventListener('resize', placeTour);
  if (markSeen === true || markSeen instanceof Event) { const c = child(); if (c) store.set('cedar_tour_' + c.id, '1'); }
}
function showTourStep() {
  const t = S.tour; if (!t) return;
  const st = t.steps[t.i], last = t.i === t.steps.length - 1;
  const sheet = $('.tour-sheet', t.wrap);
  sheet.innerHTML = `<div class="tour-head">${owl('happy')}<div><b>${esc(st.t)}</b><div class="tour-dots" aria-hidden="true">${t.steps.map((_, i) => `<i class="${i === t.i ? 'on' : ''}"></i>`).join('')}</div></div></div>
    <p>${esc(st.x)}</p>
    <div class="row">${t.i > 0 ? '<button class="btn ghost small" id="tback">Back</button>' : '<button class="link tour-skip" id="tskip">Skip tour</button>'}<span class="grow"></span>
    ${st.cta ? '<button class="btn grape small" id="tcta">' + esc(st.cta) + '</button>' : ''}<button class="btn sun small" id="tnext">${last ? 'Done 🎉' : 'Next ➜'}</button></div>`;
  $('#tnext').addEventListener('click', () => { if (last) { sfx.win(); confetti(); endTour(); } else { t.i++; sfx.tap(); showTourStep(); } });
  const b = $('#tback'); if (b) b.addEventListener('click', () => { t.i--; showTourStep(); });
  const k = $('#tskip'); if (k) k.addEventListener('click', () => endTour());
  const cta = $('#tcta'); if (cta) cta.addEventListener('click', () => { endTour(); location.hash = '#/plans'; });
  const el = st.sel ? $(st.sel) : null;
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(placeTour, el ? 380 : 0);
  $('#tnext').focus({ preventScroll: true });
}
function placeTour() {
  const t = S.tour; if (!t) return;
  const st = t.steps[t.i], spot = $('.tour-spot', t.wrap), sheet = $('.tour-sheet', t.wrap), block = $('.tour-block', t.wrap);
  const el = st.sel ? $(st.sel) : null;
  if (!el) { spot.hidden = true; block.classList.add('dim'); sheet.classList.remove('top'); return; }
  const r = el.getBoundingClientRect(), pad = 6;
  block.classList.remove('dim'); spot.hidden = false;
  Object.assign(spot.style, { top: r.top - pad + 'px', left: r.left - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
  sheet.classList.toggle('top', r.top + r.height / 2 > innerHeight * 0.5);  // keep the text away from what it is pointing at
}

// ---------------------------------------------------------------- Cedar (AI)
async function cedar() {
  const c = child();
  let st = { premium: false, left: 0, limit: 0 };
  try { st = await api('/ai/status?child_id=' + c.id); } catch (e) { return fail(e); }
  let left = st.left;
  const wall = () => `<div class="card center" id="wall">${owl('happy')}<h3>That was fun! 🦉</h3>
    <p>${st.premium ? "I've talked a lot today. Let's chat again tomorrow!" : 'My free chats for today are used up. Cedar chats are part of <b>Premium</b>.'}</p>
    ${st.premium ? '' : '<a class="btn grape block" href="#/upgrade">Ask a grown-up 🔒</a><p></p><a class="btn ghost block" href="#/plans">See what Premium includes</a>'}</div>`;
  render(`
    <div class="hello">${owl('happy')}<div class="bubble">Hoo-hoo, ${esc(c.name)}! What would you like to know? 🦉</div></div>
    <div class="aibanner" role="note">🤖 <b>Cedar is a computer helper (AI)</b>, not a real person. Tell a grown-up if anything feels odd.</div>
    <p class="center"><span class="pill" id="left">${st.premium ? '⭐ Premium chat' : `🎁 Free questions left today: <b>${left}</b>`}</span></p>
    <div id="chatui" ${left <= 0 ? 'hidden' : ''}>
    <div class="chips" id="chips">${['Tell me about elephants 🐘', 'Why is the sky blue? 🌤️', 'Help me count to 10 🔢', 'Tell me a fun fact ✨'].map((t) => `<button class="chip">${esc(t)}</button>`).join('')}</div>
    <div class="chat" id="chat" aria-live="polite"></div>
    <div class="row"><input id="ask" type="text" maxlength="300" placeholder="Type your question…" aria-label="Ask Cedar"><button class="btn small" id="send">Send</button></div>
    <p class="muted center" style="font-size:.8rem;margin-top:10px">Cedar is an AI helper. Always tell a grown-up if something worries you.</p></div>
    <div id="wallslot">${left <= 0 ? wall() : ''}</div>`, { nav: 'cedar' });
  const chat = $('#chat');
  async function send(text) {
    text = text.trim(); if (!text) return;
    $('#ask').value = '';
    chat.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(text)}</div><div class="msg bot" id="typing">…</div>`);
    $('#typing').scrollIntoView({ block: 'center', behavior: 'smooth' });
    try {
      const r = await api('/ai/buddy', { method: 'POST', body: { child_id: c.id, message: text } });
      $('#typing').outerHTML = `<div class="msg bot">${esc(r.reply)} <button class="link" data-say aria-label="Read aloud">🔊</button> <button class="link rep" data-rep aria-label="Report this answer to a grown-up">🚩</button></div>`;
      const last = $$('[data-say]').pop(); last.addEventListener('click', () => speak(r.reply));
      const rb = $$('[data-rep]').pop();
      rb.addEventListener('click', async () => { rb.disabled = true; try { await api('/ai/report', { method: 'POST', body: { child_id: c.id, prompt: text, reply: r.reply } }); rb.outerHTML = '<small class="muted">Thanks! A grown-up at school will check.</small>'; } catch { rb.disabled = false; } });
      if (S.sound) speak(r.reply);
      left = Math.max(0, left - 1);
      if (!st.premium) $('#left').innerHTML = `🎁 Free questions left today: <b>${left}</b>`;
      if (left <= 0 || r.limited) { $('#chatui').hidden = true; $('#wallslot').innerHTML = wall(); }
    } catch (e) {
      $('#typing').outerHTML = `<div class="msg bot">${esc(e.message)}</div>`;
      if (e.status === 402) { $('#chatui').hidden = true; $('#wallslot').innerHTML = wall(); }
    }
  }
  $('#send').addEventListener('click', () => send($('#ask').value));
  $('#ask').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(e.target.value); });
  $$('#chips .chip').forEach((b) => b.addEventListener('click', () => send(b.textContent.replace(/\s*\p{Extended_Pictographic}\s*$/u, ''))));
}

const STICKERS = [
  { e: '⭐', t: 'First star', ok: (c) => c.stars >= 1 },
  { e: '🌟', t: '25 stars', ok: (c) => c.stars >= 25 },
  { e: '🏅', t: '100 stars', ok: (c) => c.stars >= 100 },
  { e: '🏆', t: '300 stars', ok: (c) => c.stars >= 300 },
  { e: '🔥', t: '3 days in a row', ok: (c) => c.best_streak >= 3 },
  { e: '🚀', t: '7 days in a row', ok: (c) => c.best_streak >= 7 },
  { e: '🦄', t: '14 days in a row', ok: (c) => c.best_streak >= 14 },
  { e: '👑', t: '30 days in a row', ok: (c) => c.best_streak >= 30 },
];
async function stars() {
  const c = child();
  const got = STICKERS.filter((s) => s.ok(c)).length;
  let av = [];
  try { av = (await api('/children/avatars')).avatars; } catch { /* picker is optional */ }
  render(`<div class="card center">${owl('happy').replace('class="owl"', 'class="owl big"')}<h1>${c.stars} ⭐</h1>
    <p>Total stars</p><div class="row" style="justify-content:center"><span class="pill">🔥 Streak: ${c.streak}</span><span class="pill">🏆 Best: ${c.best_streak}</span></div></div>
    <div class="card"><h2>My stickers (${got}/${STICKERS.length})</h2>
      <div class="stickers">${STICKERS.map((s) => `<div class="sticker ${s.ok(c) ? 'on' : ''}" aria-label="${esc(s.t)}${s.ok(c) ? '' : ' (not yet)'}"><span class="se">${s.ok(c) ? s.e : '❔'}</span><small>${esc(s.t)}</small></div>`).join('')}</div>
      <p class="muted center" style="margin:12px 0 0">Do the daily quiz every day to collect them all!</p></div>
    ${av.length ? `<div class="card"><h2>Choose your buddy 🐾</h2><p class="muted" style="margin-top:0">New buddies unlock as you earn stars. They are never for sale!</p>
      <div class="avatars big" id="avpick">${av.map((a) => { const open = c.stars >= a.stars; return `<button class="${a.emoji === c.avatar ? 'on' : ''} ${open ? '' : 'locked'}" data-av="${esc(a.emoji)}" data-need="${a.stars}" aria-label="${esc(a.emoji)}${open ? '' : ' locked, needs ' + a.stars + ' stars'}"><span>${esc(a.emoji)}</span>${open ? '' : `<small>🔒 ${a.stars}⭐</small>`}</button>`; }).join('')}</div><div id="avmsg"></div></div>` : ''}
    <a class="btn block" href="#/home">Back home</a>`, { nav: 'home' });
  if (got) { sfx.good(); }
  $$('#avpick [data-av]').forEach((b) => b.addEventListener('click', async () => {
    if (b.classList.contains('locked')) { $('#avmsg').innerHTML = toast('err', `Keep earning! You need ${b.dataset.need} stars for this buddy. You have ${c.stars}.`); sfx.bad(); return; }
    try { await api(`/children/${c.id}/avatar`, { method: 'PATCH', body: { avatar: b.dataset.av } }); await loadChildren(); sfx.win(); stars(); } catch (e) { $('#avmsg').innerHTML = toast('err', e.message); }
  }));
}

// ---------------------------------------------------------------- class: homework + leaderboard
async function classPage() {
  const c = child();
  await ensureClasses(true);
  if (!S.classes.length) {
    render(`<div class="card center">${owl('happy')}<h2>No class yet 🏫</h2><p>When your teacher gives your grown-up a class code, they can add you in the Grown-ups area. Then homework and the class leaderboard show up here!</p><a class="btn" href="#/home">Back home</a></div>`, { nav: 'home' });
    return;
  }
  let classId = S.classes[0].id, period = 'week';
  const draw = async () => {
    let lb = null;
    try { lb = await api(`/learn/leaderboard?child_id=${c.id}&class_id=${classId}&period=${period}`); } catch { /* shown below */ }
    const cls = S.classes.find((x) => x.id === classId);
    const hws = S.assignments.filter((a) => a.class_id === classId);
    const due = (a) => !a.due_date ? '' : a.overdue ? '<b class="late">Overdue</b>' : 'Due ' + new Date(a.due_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const icon = { homework: '📚', exercise: '✏️', quiz: '🎯' };
    const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);
    render(`
      <div class="center"><h1>${esc(cls.name)} 🏫</h1><p class="muted" style="margin:0">Teacher: ${esc(cls.teacher)}</p></div>
      ${S.classes.length > 1 ? `<div class="chips">${S.classes.map((x) => `<button class="chip ${x.id === classId ? 'on' : ''}" data-cls="${x.id}">${esc(x.name)}</button>`).join('')}</div>` : ''}
      <div class="card"><h2>📚 Homework</h2>
        ${hws.length ? hws.map((a) => `<div class="hwrow ${a.done ? 'done' : ''}"><span class="e">${icon[a.kind] || '📚'}</span><span class="grow"><b>${esc(a.title)}</b><br><small class="muted">${a.done ? `✅ Done: ${a.score.correct}/${a.score.total}` : `${a.questions} questions · ${due(a)}`}</small>${a.instructions && !a.done ? `<br><small>${esc(a.instructions)}</small>` : ''}</span>
          ${a.done ? '' : `<button class="btn small sun" data-hw="${a.id}">Start</button>`}</div>`).join('') : '<p class="muted">No homework right now. Enjoy! 🎉</p>'}</div>
      <div class="card"><h2>🏆 Class stars</h2>
        <div class="seg"><button class="${period === 'week' ? 'on' : ''}" data-per="week">This week</button><button class="${period === 'all' ? 'on' : ''}" data-per="all">All time</button></div>
        ${!lb ? '<p class="muted">Could not load the board.</p>' : lb.hidden ? '<p class="muted">Your grown-up chose to keep you off the leaderboard. You can still do homework! 😊</p>' : lb.board.length ? `<ol class="board">${lb.board.map((r) => `<li class="${r.child_id === c.id ? 'me' : ''}"><span class="rk">${medal(r.rank)}</span><span class="av">${esc(r.avatar)}</span><span class="grow">${esc(r.name)}${r.child_id === c.id ? ' (you)' : ''}</span><b>${r.stars} ⭐</b></li>`).join('')}</ol>
          ${lb.me && lb.me.rank > 10 ? `<p class="center muted">You are #${lb.me.rank} of ${lb.members}. Keep going! ⭐</p>` : ''}
          <p class="muted center" style="font-size:.85rem;margin-bottom:0">Stars come from effort: every quiz you finish counts. 💛</p>` : '<p class="muted">Play a quiz to get on the board!</p>'}</div>`, { nav: 'class' });
    $$('[data-cls]').forEach((b) => b.addEventListener('click', () => { classId = Number(b.dataset.cls); draw(); }));
    $$('[data-per]').forEach((b) => b.addEventListener('click', () => { period = b.dataset.per; draw(); }));
    $$('[data-hw]').forEach((b) => b.addEventListener('click', async () => {
      sfx.tap();
      try {
        const r = await api(`/learn/assignments/${b.dataset.hw}?child_id=${c.id}`);
        startQuiz({ kind: 'assignment', assignment_id: r.assignment.id, subject: 'homework', questions: r.questions, title: r.assignment.title, instructions: r.assignment.instructions });
      } catch (e) { fail(e); }
    }));
  };
  draw();
}

async function plansPage() {
  track('plans_view', true);
  let p = null;
  try { p = await api('/payments/plans'); } catch { /* shown below */ }
  render(`<div class="center">${brand()}<h1>Free & Premium ⭐</h1><p class="muted">Every child gets the daily quiz free, forever. Premium is for families who want more.</p></div>
    ${p ? `<div class="card">${compareTable(p.comparison)}</div>
    <div class="card"><h2>Premium prices</h2>${p.plans.map((x) => `<div class="plan ${x.code === 'premium_yearly' ? 'best' : ''}"><div class="grow"><b>${esc(x.name)}</b> ${x.code === 'premium_yearly' ? '<span class="badge">Best value</span>' : ''}<br><span class="muted">${esc(x.blurb)}</span></div></div>`).join('')}
      <p class="muted" style="font-size:.9rem">Pay securely with Paystack: card, bank transfer or USSD. Cancel any time by simply not renewing.</p></div>`
      : '<div class="card center"><p>Could not load the plans. Please check your internet and try again.</p></div>'}
    <a class="btn ${S.token ? 'sun' : ''} block" href="#/${S.token ? 'upgrade' : 'welcome'}">${S.token ? 'Upgrade in the Grown-ups area 🔒' : 'Create a free account'}</a><p></p>
    <a class="btn ghost block" href="#/${S.token ? 'home' : 'welcome'}">Back</a>`, { bar: false });
}

async function upgradePage() {
  let plans, st;
  try { [plans, st] = await Promise.all([api('/payments/plans'), api('/payments/status').catch(() => null)]); S.user = await api('/auth/me'); }
  catch (e) { return fail(e); }
  const naira = (k) => '₦' + Math.round(k / 100).toLocaleString('en-NG');
  let sel = (plans.plans.find((p) => p.code === 'premium_yearly') || plans.plans[0]).code;
  const premium = S.user.premium;
  const waText = encodeURIComponent('Hello Cedarville, I would like to subscribe to Cedarville Learning Premium.');
  render(`
    ${brand()}
    <div class="center"><h1>Unlock everything ⭐</h1>
      <p class="muted">${premium ? `Premium is active${st && st.valid_until ? ' until <b>' + new Date(st.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '</b>' : ''}. Extend any time.` : 'Everything your child needs to keep learning, every day.'}</p></div>
    <div class="card"><ul class="ticks">${plans.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>
    <div id="msg"></div>
    <div id="planlist" role="radiogroup" aria-label="Choose a plan">${plans.plans.map((p) => `
      <button class="planpick ${p.code === sel ? 'on' : ''} ${p.code === 'premium_yearly' ? 'best' : ''}" role="radio" aria-checked="${p.code === sel}" data-code="${esc(p.code)}">
        <span class="radio"></span>
        <span class="grow"><b>${esc(p.name)}</b>${p.saving_pct ? `<span class="badge">Save ${p.saving_pct}%</span>` : ''}<br>
          <span class="muted">${esc(p.blurb)}${p.saving_pct ? ` · about ${naira(p.per_month_kobo)} a month` : ''}</span></span>
        <b class="pr">${naira(p.amount_kobo)}</b></button>`).join('')}</div>
    <div class="card" id="redeemcard"><h3>🎟 Have a Premium code?</h3><p class="muted" style="margin-top:0">If the school gave you a code, enter it here to unlock Premium.</p><div id="rmsg"></div>
      <div class="row"><input id="rcode" type="text" autocapitalize="characters" autocomplete="off" placeholder="CED-XXXX-XXXX" style="text-transform:uppercase"><button class="btn small" id="rgo">Redeem</button></div></div>
    <div class="card trustbox">
      <div>🔒 Secure payment by <b>Paystack</b>: card, bank transfer or USSD</div>
      <div>🙈 We never see or store your card details</div>
      <div>↩️ It does <b>not</b> renew by itself. Stop any time by simply not renewing</div>
      <div>💬 Questions? <a href="https://wa.me/2348137451764?text=${waText}" target="_blank" rel="noopener">Message the school on WhatsApp</a></div></div>
    <div class="paybar"><button class="btn sun block" id="pay">${plans.payments_enabled ? '' : '💬 '}</button></div>`, { bar: false });
  const label = () => { const p = plans.plans.find((x) => x.code === sel); $('#pay').innerHTML = plans.payments_enabled ? `Pay ${naira(p.amount_kobo)} securely 🔒` : '💬 Subscribe via WhatsApp'; };
  label();
  $('#rgo').addEventListener('click', async () => {
    const m = $('#rmsg'), code = $('#rcode').value.trim();
    if (!code) { m.innerHTML = toast('err', 'Please type your code.'); return; }
    try {
      const r = await api('/premium/redeem', { method: 'POST', body: { code } });
      S.user = await api('/auth/me'); sfx.win(); confetti();
      m.innerHTML = toast('ok', `🎉 Premium unlocked for ${r.days} days!`); setTimeout(() => upgradePage(), 1600);
    } catch (e) { m.innerHTML = toast('err', e.message); }
  });
  $$('.planpick').forEach((b) => b.addEventListener('click', () => { sel = b.dataset.code; $$('.planpick').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); label(); sfx.tap(); }));
  $('#pay').addEventListener('click', async () => {
    if (!plans.payments_enabled) { window.open(`https://wa.me/2348137451764?text=${waText}%20Plan:%20${encodeURIComponent(sel)}`, '_blank', 'noopener'); return; }
    const btn = $('#pay'); btn.disabled = true;
    try { const r = await api('/payments/checkout', { method: 'POST', body: { plan_code: sel } }); location.href = r.authorization_url; }
    catch (e) { $('#msg').innerHTML = toast('err', e.message); btn.disabled = false; }
  });
}

function installPage() {
  const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  render(`
    <div class="center">${brand()}${owl('happy').replace('class="owl"', 'class="owl big"')}<h1>Install Cedarville Learning 📲</h1>
      <p class="muted">Put the app on your phone's home screen. It opens full-screen, just like any other app.</p></div>
    ${standalone ? '<div class="ok">✅ You are already using the installed app.</div>' : ''}
    <div class="card"><h3>🤖 Android (Chrome)</h3>
      ${S.installEvt ? '<button class="btn sun block" data-act="install">📲 Install now</button><p></p>' : ''}
      <ol style="padding-left:20px;margin:0"><li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>⋮ menu</b> (top right).</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li></ol></div>
    <div class="card"><h3>🍎 iPhone / iPad (Safari)</h3>
      <ol style="padding-left:20px;margin:0"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (square with an arrow).</li><li>Scroll and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol></div>
    <div class="card"><h3>🛒 Google Play Store</h3><p class="muted" style="margin:0">The Play Store version is coming soon. Until then, the steps above give you the same app.</p></div>
    <a class="btn block" href="#/${S.token ? 'home' : 'welcome'}">${S.token ? 'Back to learning' : 'Back to sign in'}</a>`, { bar: false });
}


// ---------------------------------------------------------------- grown-ups area
function gate(next) {
  if (Date.now() < S.gateUntil) return next();
  const a = 6 + Math.floor(Math.random() * 6), b = 6 + Math.floor(Math.random() * 6);
  render(`<div class="card center"><div style="font-size:56px">🔒</div><h2>Grown-ups only</h2>
    <p>To continue, please solve: <b style="font-size:1.4em">${a} × ${b} = ?</b></p><div id="msg"></div>
    <input id="gate" type="number" inputmode="numeric" aria-label="Answer" style="text-align:center;max-width:160px"><p></p>
    <button class="btn block" id="go">Continue</button><p></p><a class="btn ghost block" href="#/home">Back</a></div>`, { bar: false });
  const check = () => {
    if (Number($('#gate').value) === a * b) { S.gateUntil = Date.now() + 5 * 60 * 1000; next(); }
    else { $('#msg').innerHTML = toast('err', 'Not quite. This area is for grown-ups.'); $('#gate').value = ''; }
  };
  $('#go').addEventListener('click', check);
  $('#gate').addEventListener('keydown', (e) => e.key === 'Enter' && check());
  $('#gate').focus();
}

const classCard = () => `<div class="card"><h2>🏫 Join your child's class</h2>
  <p class="muted" style="margin-top:0">Your child's teacher gives you a 6-letter class code. Joining lets the teacher set homework and see your child's <b>first name and results for that class only</b>. You can leave any time.</p>
  <div id="cmsg"></div>
  ${S.children.length ? `<label for="jchild">Which child?</label><select id="jchild">${S.children.map((c) => `<option value="${c.id}">${esc(c.avatar)} ${esc(c.name)}</option>`).join('')}</select>
  <label for="jcode">Class code</label><input id="jcode" type="text" maxlength="8" autocapitalize="characters" autocomplete="off" placeholder="e.g. K7M2QX" style="text-transform:uppercase">
  <label class="check"><input id="jboard" type="checkbox" checked><span>Show my child's first name on the class leaderboard</span></label>
  <button class="btn small" id="jgo">Join class</button>` : '<p class="muted">Add a child first, then join their class here.</p>'}
  <div id="jlist" style="margin-top:12px"></div></div>`;

async function wireClassCard() {
  const list = async () => {
    const box = $('#jlist'); if (!box) return;
    const rows = [];
    for (const c of S.children) { try { (await api(`/children/${c.id}/classes`)).classes.forEach((k) => rows.push({ ...k, child: c })); } catch { /* skip */ } }
    box.innerHTML = rows.length ? rows.map((r) => `<div class="hwrow"><span class="e">${esc(r.child.avatar)}</span><span class="grow"><b>${esc(r.child.name)}</b> in ${esc(r.name)}<br><small class="muted">Teacher: ${esc(r.teacher)} · ${r.show_on_board ? 'on the leaderboard' : 'hidden from the leaderboard'}</small></span>
      <button class="link" data-board="${r.class_id}:${r.child.id}:${r.show_on_board ? 0 : 1}">${r.show_on_board ? 'Hide' : 'Show'}</button><button class="link" data-leave="${r.class_id}:${r.child.id}">Leave</button></div>`).join('') : '';
    $$('[data-board]', box).forEach((b) => b.addEventListener('click', async () => { const [cl, ch, on] = b.dataset.board.split(':'); await api(`/classes/${cl}/children/${ch}?show_on_board=${on === '1'}`, { method: 'PATCH' }); list(); }));
    $$('[data-leave]', box).forEach((b) => b.addEventListener('click', async () => { if (!confirm('Take your child out of this class? Their homework results in it will no longer be visible to the teacher.')) return; const [cl, ch] = b.dataset.leave.split(':'); await api(`/classes/${cl}/children/${ch}`, { method: 'DELETE' }); S.classesFor = null; list(); }));
  };
  list();
  if ($('#jgo')) $('#jgo').addEventListener('click', async () => {
    const m = $('#cmsg'); const code = $('#jcode').value.trim();
    if (!code) { m.innerHTML = toast('err', 'Please type the class code from the teacher.'); return; }
    try {
      const r = await api('/classes/join', { method: 'POST', body: { child_id: Number($('#jchild').value), code, show_on_board: $('#jboard').checked } });
      m.innerHTML = toast('ok', `Joined ${r.name}! 🎉`); $('#jcode').value = ''; S.classesFor = null; sfx.win(); list();
    } catch (e) { m.innerHTML = toast('err', e.message); }
  });
}

const roleCard = () => {
  const ts = S.user.teacher_status, staff = S.user.is_admin || S.user.staff_role === 'codes';
  return `<div class="card"><h2>👩‍🏫 For school staff</h2><div id="rmsg"></div>
    ${ts === 'approved' ? '<a class="btn small" href="#/teacher">Open the teacher area</a>' : ts === 'pending' ? '<p class="muted">Your request for teacher access is waiting for the school to approve it.</p>'
      : ts === 'rejected' ? '<p class="muted">Teacher access was not approved. Please contact the school.</p>' : '<p class="muted" style="margin-top:0">Are you a teacher at Cedarville? Ask for teacher access to set homework and see your class results.</p><button class="btn ghost small" id="reqteach">Ask for teacher access</button>'}
    ${staff ? ' <a class="btn sun small" href="#/admin">🛠 Admin dashboard</a>' : ''}</div>`;
};
function wireRoleCard() {
  if ($('#reqteach')) $('#reqteach').addEventListener('click', async () => {
    try { const r = await api('/auth/request-teacher', { method: 'POST' }); S.user = await api('/auth/me'); $('#rmsg').innerHTML = toast('ok', r.teacher_status === 'approved' ? 'You are approved! ✅' : 'Request sent. The school will approve it soon.'); setTimeout(() => grownups(), 900); }
    catch (e) { $('#rmsg').innerHTML = toast('err', e.message); }
  });
}

async function grownups(query = '') {
  const params = new URLSearchParams(query);
  let flash = '';
  if (params.get('reference') || params.get('trxref')) {
    const ref = params.get('reference') || params.get('trxref');
    try {
      const v = await api('/payments/verify?reference=' + encodeURIComponent(ref));
      flash = v.status === 'success' ? toast('ok', '🎉 Thank you! Premium is now on.') : toast('err', 'We have not received the payment yet. If you paid, it may take a minute — refresh this page.');
      S.user = await api('/auth/me');
    } catch (e) { flash = toast('err', e.message); }
    history.replaceState(null, '', location.pathname + '#/grownups');
  }
  const [plans, prog, pstat] = await Promise.all([
    api('/payments/plans').catch(() => ({ plans: [], features: [], payments_enabled: false })),
    Promise.all(S.children.map((c) => api(`/children/${c.id}/progress`).catch(() => null))),
    api('/payments/status').catch(() => null),
  ]);
  S.user = await api('/auth/me').catch(() => S.user);
  const premium = S.user.premium;
  const naira = (k) => '₦' + (k / 100).toLocaleString('en-NG');
  render(`
    ${brand()}
    <h1>Grown-ups area 🔒</h1>
    ${flash}<div id="msg"></div>
    <div class="card">
      <h2>Hello, ${esc(S.user.display_name)}</h2>
      <p>${premium ? `⭐ <b>Premium</b> is active${pstat && pstat.valid_until ? ' until <b>' + new Date(pstat.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '</b>' : ''}.` : 'You are on the <b>Free</b> plan.'}</p>
      ${premium && pstat && pstat.valid_until && (new Date(pstat.valid_until) - Date.now()) < 7 * 864e5 ? '<div class="err" style="background:#fff4d6;color:#7a5a00">⏰ Premium ends soon. Renew below so learning never pauses.</div>' : ''}
      ${premium ? '' : '<p class="muted" style="margin:0 0 10px">Premium unlocks every subject, unlimited practice, all videos, more Cedar chats and progress insights.</p><a class="btn sun small" href="#/upgrade">⭐ See Premium</a> '}
      <a class="btn ghost small" href="#/home">← Back to the fun</a>
    </div>
    <div class="card"><h2>Progress this week</h2>
      ${S.children.length ? S.children.map((c, i) => progressCard(c, prog[i])).join('') : '<p class="muted">No children yet.</p>'}
      <div class="row wrap" style="margin-top:10px">
        <button class="btn small" id="addc">➕ Add child</button>
      </div>
    </div>
    <div class="card" id="plans"><h2>${premium ? 'Premium plan' : 'Go Premium ⭐'}</h2>
      ${plans.comparison ? compareTable(plans.comparison) : `<ul class="ticks">${plans.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`}
      <a class="btn sun block" href="#/upgrade">${premium ? 'Extend Premium' : '⭐ Choose a plan'}</a><p></p>
      <p class="muted" style="font-size:.85rem">Secure payment by Paystack (card, bank transfer, USSD). We never see your card details. Each payment adds time to Premium; renew whenever you like. It does not renew by itself.</p>
    </div>
    ${classCard()}${roleCard()}
    <div class="card"><h2>Account & safety</h2><div id="amsg2"></div>
      <button class="btn mint small" id="sharebtn">💬 Tell another parent</button> ${installBtn()} <a class="btn ghost small" href="#/install">How to install</a>
      ${S.user.has_password ? `<details style="margin-top:12px"><summary><b>Change password</b></summary>
        <label for="cp1">Current password</label><input id="cp1" type="password" autocomplete="current-password">
        <label for="cp2">New password</label><input id="cp2" type="password" autocomplete="new-password" minlength="8">
        <p></p><button class="btn small" id="cpgo">Change password</button></details>` : '<p class="muted" style="margin-top:12px">🔐 You sign in with Google, so there is no password to manage here.</p>'}
      <details style="margin-top:12px"><summary><b>Delete my account</b></summary>
        <p class="muted">This erases your account, all child profiles and all progress. It cannot be undone.</p>
        <label for="dp">${S.user.has_password ? 'Type your password to confirm' : 'Type DELETE (capital letters) to confirm'}</label><input id="dp" type="${S.user.has_password ? 'password' : 'text'}" autocomplete="off">
        <p></p><button class="btn coral small" id="delgo">Delete everything</button></details>
    </div>
    <div class="card"><a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a> · <a href="${SITE}contact.html"${native ? ' target="_blank" rel="noopener"' : ''}>Contact the school</a>
      <p></p><button class="btn coral small" id="logout">Log out</button></div>`, { bar: false });

  $('#addc').addEventListener('click', () => { location.hash = '#/addchild'; });
  $('#sharebtn').addEventListener('click', async () => {
    const url = native ? 'https://www.cedarvilleprivateschool.com/learn.html?utm_source=parent_share' : new URL('../learn.html', location.href.split('#')[0].split('?')[0]).href + '?utm_source=parent_share&utm_medium=share';
    const text = 'My child loves this free daily learning quiz from Cedarville Private Schools 🦉 Try it: ';
    if (navigator.share) { try { await navigator.share({ title: 'Cedarville Learning', text, url }); return; } catch { /* cancelled */ } }
    window.open('https://wa.me/?text=' + encodeURIComponent(text + url), '_blank', 'noopener');
  });
  if ($('#cpgo')) $('#cpgo').addEventListener('click', async () => {
    const m = $('#amsg2');
    try {
      const r = await api('/auth/change-password', { method: 'POST', body: { current_password: $('#cp1').value, new_password: $('#cp2').value } });
      S.token = r.token; store.set('cedar_token', r.token);
      $('#cp1').value = ''; $('#cp2').value = ''; m.innerHTML = toast('ok', 'Password changed. Other devices have been logged out. ✅');
    } catch (e) { m.innerHTML = toast('err', e.message); }
  });
  $('#delgo').addEventListener('click', async () => {
    const m = $('#amsg2');
    if (!$('#dp').value) { m.innerHTML = toast('err', S.user.has_password ? 'Please type your password first.' : 'Please type DELETE first.'); return; }
    if (!confirm('Really delete your account and every child profile? This cannot be undone.')) return;
    try { await api('/auth/delete-account', { method: 'POST', body: S.user.has_password ? { password: $('#dp').value } : { confirm: $('#dp').value } }); logout(); }
    catch (e) { m.innerHTML = toast('err', e.message); }
  });
  $('#logout').addEventListener('click', () => logout());
  $$('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Remove this profile and all its progress? This cannot be undone.')) return;
    await api('/children/' + b.dataset.del, { method: 'DELETE' }); await loadChildren(); grownups();
  }));
  $$('[data-plan]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try { const r = await api('/payments/checkout', { method: 'POST', body: { plan_code: b.dataset.plan } }); location.href = r.authorization_url; }
    catch (e) { $('#msg').innerHTML = toast('err', e.message); b.disabled = false; }
  }));
  wireClassCard(); wireRoleCard();
  if (params.get('go') === 'upgrade') { location.hash = '#/upgrade'; return; }
}

function progressCard(c, p) {
  if (!p) return `<p>${esc(c.name)} — could not load progress.</p>`;
  const max = Math.max(1, ...p.days.map((d) => d.stars));
  const dn = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return `<div style="border-top:2px solid #eef3fc;padding-top:12px;margin-top:12px">
    <div class="row"><span style="font-size:34px">${esc(c.avatar)}</span><div class="grow"><b>${esc(c.name)}</b> <span class="muted">· ${esc(c.level_label)}</span><br>
    <span class="muted">⭐ ${c.stars} · 🔥 ${c.streak} · ${p.total_rounds} rounds · ${p.accuracy}% correct</span></div>
    <button class="link" data-del="${c.id}" aria-label="Remove ${esc(c.name)}">🗑</button></div>
    <div class="bars" aria-label="Stars per day">${p.days.map((d) => `<div class="${d.stars ? '' : 'z'}" style="height:${Math.max(4, (d.stars / max) * 100)}%" title="${d.stars} stars"></div>`).join('')}</div>
    <div class="barlbl">${p.days.map((d) => `<span>${dn[new Date(d.day + 'T12:00:00').getDay()]}</span>`).join('')}</div>
    ${p.insights_locked
      ? `<a class="locked-insight" href="#/upgrade">🔒 <b>Premium:</b> see what ${esc(c.name)} is great at and what to practise next →</a>`
      : (p.strengths.length || p.practise.length)
        ? `<div class="insight">${p.strengths.length ? `<p>💪 <b>Strong at:</b> ${p.strengths.map(esc).join(', ')}</p>` : ''}${p.practise.length ? `<p>🎯 <b>Practise next:</b> ${p.practise.map(esc).join(', ')}</p>` : ''}</div>`
        : '<p class="muted" style="font-size:.85rem;margin-top:8px">Play a few practice rounds and strengths will show up here.</p>'}
  </div>`;
}

async function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, query] = raw.split('?');
  const segs = (name || '').split('/');
  const page = segs[0];

  if (page === 'install') return installPage();
  if (page === 'plans') return plansPage();
  if (page === 'try') return tryPage(query);
  if (!S.token) { if (page !== 'welcome') { location.hash = '#/welcome'; return; } return welcome(); }
  if (!S.user) {
    loading();
    try { if (!(await loadUser())) { return logout(); } }
    catch (e) { return render(`<div class="card center">${owl('sad')}<h2>No connection</h2><p>${esc(e.message)}</p><button class="btn" data-act="reload">Try again</button></div>`, { bar: false }); }
  }
  if (new URLSearchParams(location.search).get('reference') && page !== 'grownups') { location.hash = '#/grownups'; return; }

  switch (page) {
    case 'welcome': location.hash = land(); return;
    case 'addchild': return addChild();
    case 'who': return who();
    case 'grownups': return gate(() => grownups(query || location.search));
    case 'upgrade': return gate(() => upgradePage());
    case 'teacher': return gate(async () => { try { await loadScript('teacher.js'); window.__cedarTeacher.show(segs.slice(1)); } catch (e) { fail(e); } });
    case 'admin': return gate(async () => { try { await loadScript('admin.js'); window.__cedarAdmin.show(segs.slice(1)); } catch (e) { fail(e); } });
    default: break;
  }
  if (!child()) {
    if (!S.children.length) { location.hash = '#/addchild'; return; }
    return who();
  }
  await ensureClasses();
  if ((page === 'watch' && !feat('videos')) || (page === 'cedar' && !feat('cedar'))) { location.hash = '#/home'; return; }
  switch (page) {
    case 'play': return play();
    case 'watch': return watch();
    case 'cedar': return cedar();
    case 'stars': return stars();
    case 'class': return classPage();
    default: return home();
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('offline', () => { const b = document.createElement('div'); b.className = 'offline'; b.id = 'offb'; b.textContent = 'You are offline. Some things may not work.'; document.body.prepend(b); });
window.addEventListener('online', () => { const b = $('#offb'); if (b) b.remove(); });

if ('serviceWorker' in navigator && !native && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
window.__cedar = { api, render, loading, fail, esc, $, $$, toast, S, brand, owl, feat, confetti, sfx, speak, store, track, native, SITE, refreshFeatures, gate };
route();
})();
