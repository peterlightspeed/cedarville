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
  gateUntil: 0, started: Date.now(), lastBreak: 0, installEvt: null,
  quiz: null,
};
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

function speak(text) {
  if (!S.sound || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85; u.pitch = 1.15; u.lang = 'en-GB';
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
    <circle cx="36" cy="42" r="14" fill="#fff"/><circle cx="64" cy="42" r="14" fill="#fff"/>
    <circle cx="37" cy="43" r="7" fill="#23314d"/><circle cx="63" cy="43" r="7" fill="#23314d"/>
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
      ${[['home', '🏠', 'Home'], ['play', '🎮', 'Play'], ['watch', '📺', 'Watch'], ['cedar', '🦉', 'Cedar']]
        .map(([k, e, l]) => `<a class="tab ${nav === k ? 'on' : ''}" href="#/${k}" ${nav === k ? 'aria-current="page"' : ''}><span class="e">${e}</span>${l}</a>`).join('')}
    </div></nav>` : '';
  $app.innerHTML = `${top}<main class="screen" id="screen">${html}</main>${tabs}`;
  window.scrollTo(0, 0);
  const m = $('#screen'); if (m) { m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); }
}
const loading = () => render('<div class="spinner" role="status" aria-label="Loading"></div>', { bar: false });
const toast = (cls, msg) => `<div class="${cls}" role="alert">${esc(msg)}</div>`;

document.addEventListener('click', (e) => {
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

const brand = (big = false) => `<div class="brand ${big ? 'big' : ''}"><img src="icons/school-logo.png" alt="Cedarville Private Schools logo" width="${big ? 84 : 48}" height="${big ? 84 : 48}"><span>Cedarville Private Schools</span></div>`;

// ---------------------------------------------------------------- screens
function welcome(mode = 'signup') {
  render(`
    <div class="center">
      ${brand(true)}
      <div style="display:flex;justify-content:center">${owl('happy').replace('class="owl"', 'class="owl big"')}</div>
      <h1>Cedarville Learning</h1>
      <p class="muted">Fun quizzes, videos and a friendly owl for little learners. 🌈</p>
    </div>
    <div class="card">
      <div class="seg" role="tablist">
        <button role="tab" class="${mode === 'signup' ? 'on' : ''}" data-mode="signup">New here? Sign up</button>
        <button role="tab" class="${mode === 'login' ? 'on' : ''}" data-mode="login">Log in</button>
      </div>
      <p class="muted" style="font-size:.95rem">👨‍👩‍👧 This is for <b>parents and guardians</b>. You'll make a safe profile for your child next.</p>
      <div id="msg"></div>
      <form id="authform" novalidate>
        ${mode === 'signup' ? '<label for="name">Your name</label><input id="name" type="text" autocomplete="name" maxlength="80" required>' : ''}
        <label for="email">Email</label><input id="email" type="email" autocomplete="email" inputmode="email" required>
        <label for="pw">Password ${mode === 'signup' ? '<span class="muted" style="font-weight:400">(8+ characters)</span>' : ''}</label>
        <input id="pw" type="password" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" minlength="8" required>
        <button type="button" class="link" data-act="pwtoggle" style="padding-left:0">👁 Show password</button>
        ${mode === 'signup' ? `<label class="check"><input id="agree" type="checkbox"><span>I am a parent or guardian aged 18+, and I agree to the <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>` : ''}
        <button class="btn block ${mode === 'signup' ? 'sun' : ''}" type="submit">${mode === 'signup' ? 'Create my account 🎉' : 'Log in'}</button>
      </form>
      ${mode === 'login' ? '<p class="muted center" style="font-size:.9rem;margin:14px 0 0">Forgot your password? Email <a href="mailto:cedarvilleprivate@gmail.com">cedarvilleprivate@gmail.com</a> and we will help.</p>' : ''}
    </div>
    <p class="center">${installBtn()} <a class="btn ghost small" href="#/install">How to install</a></p>
    <p class="center"><a href="${SITE}index.html"${native ? ' target="_blank" rel="noopener"' : ''}>← Cedarville Schools website</a></p>`, { bar: false });

  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => welcome(b.dataset.mode)));
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
      body.display_name = display_name;
    }
    btn.disabled = true;
    try {
      const r = await api(mode === 'signup' ? '/auth/signup' : '/auth/login', { method: 'POST', body });
      S.token = r.token; store.set('cedar_token', r.token);
      await loadUser();
      location.hash = S.children.length ? '#/who' : '#/addchild';
      route();
    } catch (e) { msg.innerHTML = toast('err', e.message); btn.disabled = false; }
  });
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
  let age = null, avatar = AVATARS[0];
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
  try { d = await api('/learn/daily?child_id=' + c.id); }
  catch (e) { return fail(e); }
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const line = d.already_done
    ? `Great job today, ${esc(c.name)}! Come back tomorrow for a new quiz. 🌙`
    : c.streak > 1 ? `${greet}, ${esc(c.name)}! You're on a ${c.streak}-day streak! 🔥` : `${greet}, ${esc(c.name)}! Ready for today's quiz? 🎉`;
  render(`
    ${brand()}
    <div class="hello">${owl('happy')}<div class="bubble">${line}</div></div>
    <button class="big-cta ${d.already_done ? 'done' : ''}" id="daily">
      <div class="t">${d.already_done ? 'Today\'s quiz is done! ✅' : 'Today\'s Quiz'}</div>
      <div class="s">${d.already_done ? `You got ${d.result.correct} out of ${d.result.total} and earned ${d.result.stars} ⭐` : '5 quick questions · earn stars ⭐'}</div>
      <div class="e">${d.already_done ? '🏆' : '🎯'}</div>
    </button>
    <div class="tiles">
      <button class="tile c0" data-go="play"><span class="e">🎮</span>Play & Practise<small>Pick a subject</small></button>
      <button class="tile c2" data-go="watch"><span class="e">📺</span>Watch & Learn<small>Songs and videos</small></button>
      <button class="tile c4" data-go="cedar"><span class="e">🦉</span>Ask Cedar<small>Your owl friend</small></button>
      <button class="tile c3" data-go="stars"><span class="e">🏅</span>My Stars<small>${c.stars} ⭐ · best streak ${c.best_streak} 🔥</small></button>
    </div>`, { nav: 'home' });
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

function upsell(message) {
  render(`<div class="card center">${owl('happy')}<h2>That's a Premium treat! ⭐</h2><p>${esc(message || 'Ask a grown-up to unlock this.')}</p>
    <a class="btn grape block" href="#/grownups?go=upgrade">Ask a grown-up 🔒</a><p></p><a class="btn ghost block" href="#/home">Back home</a></div>`, { nav: 'home' });
}

async function play() {
  const c = child();
  let r;
  try { r = await api('/learn/subjects?child_id=' + c.id); } catch (e) { return fail(e); }
  render(`
    <h2>Pick something to play! 🎮</h2>
    ${r.premium ? '' : `<p class="muted">Free practice rounds left today: <b>${r.practice_left}</b> ${r.practice_left ? '' : '— come back tomorrow!'}</p>`}
    <div class="tiles">
      <button class="tile c1" data-sub=""><span class="e">🎲</span>Surprise Me<small>Mixed questions</small></button>
      ${r.subjects.map((s, i) => `<button class="tile c${(i + 2) % 6}" data-sub="${esc(s.key)}"><span class="e">${s.emoji}</span>${esc(s.label)}<small>${s.count} questions</small></button>`).join('')}
    </div>`, { nav: 'play' });
  $$('[data-sub]').forEach((b) => b.addEventListener('click', async () => {
    sfx.tap();
    const sub = b.dataset.sub;
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
    </div>
    <div class="card qcard">
      ${q.visual ? `<div class="visual ${long ? 'small' : ''}" aria-hidden="true">${esc(q.visual)}</div>` : ''}
      <div class="qtext">${esc(q.prompt)}</div>
      <button class="btn ghost small speak" id="say" aria-label="Read the question aloud">🔊 Read to me</button>
    </div>
    <div class="opts" id="opts">
      ${q.options.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join('')}
    </div>
    <div id="fb"></div>`, { bar: true });
  $('#quit').addEventListener('click', () => { if (confirm('Stop this quiz?')) location.hash = '#/home'; });
  const readQ = () => speak(`${q.prompt}. ${q.options.join('. ')}`);
  $('#say').addEventListener('click', readQ);
  if (c.level === 'tiny' || c.level === 'nursery') setTimeout(readQ, 350);

  $$('.opt').forEach((b) => b.addEventListener('click', async () => {
    if (Q.locked) return;
    Q.locked = true; stopSpeaking();
    const answer = b.dataset.o;
    $$('.opt').forEach((x) => (x.disabled = true));
    let r;
    try { r = await api('/learn/check', { method: 'POST', body: { child_id: c.id, question_id: q.id, answer } }); }
    catch (e) { Q.locked = false; $$('.opt').forEach((x) => (x.disabled = false)); $('#fb').innerHTML = toast('err', e.message); return; }
    Q.answers.push({ question_id: q.id, answer });
    Q.marks.push(r.correct ? 'ok' : 'no');
    b.classList.add(r.correct ? 'right' : 'wrong');
    if (!r.correct) $$('.opt').forEach((x) => { if (x.dataset.o === r.answer) x.classList.add('reveal'); });
    (r.correct ? sfx.good : sfx.bad)();
    const last = Q.i === Q.questions.length - 1;
    $('#fb').innerHTML = `
      <div class="feedback ${r.correct ? 'good' : 'try'}" role="status">${owl(r.correct ? 'happy' : 'sad')}
        <div><b>${r.correct ? pick(['Hooray! 🎉', 'Super! ⭐', 'Brilliant! 🌟', 'You got it! 👏']) : 'Good try! 💪'}</b><br>${esc(r.explanation)}</div></div>
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
    const r = await api('/learn/submit', { method: 'POST', body: { child_id: c.id, kind: Q.kind, subject: Q.subject, answers: Q.answers } });
    await loadChildren();
    const all = r.correct === r.total;
    sfx.win(); if (r.correct >= Math.ceil(r.total / 2)) confetti();
    render(`
      <div class="card center">
        ${owl('happy').replace('class="owl"', 'class="owl big"')}
        <h1>${all ? 'PERFECT! 🏆' : r.correct >= r.total / 2 ? 'Well done! 🎉' : 'Nice try! 💪'}</h1>
        <p>You got <b>${r.correct}</b> out of <b>${r.total}</b> right.</p>
        <div class="stars-big" aria-hidden="true">${'⭐'.repeat(Math.min(5, Math.max(1, Math.round((r.correct / r.total) * 5))))}</div>
        <p><b>+${r.stars_earned} stars</b> earned! You have ${r.stars} ⭐ in total.</p>
        ${Q.kind === 'daily' ? `<p>🔥 ${r.streak}-day streak!</p>` : ''}
        <button class="btn sun block" id="again">${Q.kind === 'daily' ? 'Play more games 🎮' : 'Play again 🎮'}</button><p></p>
        <a class="btn ghost block" href="#/home">Home 🏠</a>
      </div>`, { nav: 'home' });
    $('#again').addEventListener('click', () => { location.hash = '#/play'; });
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

// ---------------------------------------------------------------- Cedar (AI)
async function cedar() {
  const c = child();
  let premium = !!(S.user && S.user.premium);
  try { S.user = await api('/auth/me'); premium = S.user.premium; } catch { /* keep cached */ }
  if (!premium) {
    render(`<div class="card center">${owl('happy').replace('class="owl"', 'class="owl big"')}<h2>Hoo-hoo! I'm Cedar! 🦉</h2>
      <p>I love answering questions about animals, numbers, space and more. Chatting with me is part of <b>Premium</b>.</p>
      <a class="btn grape block" href="#/grownups?go=upgrade">Ask a grown-up 🔒</a></div>`, { nav: 'cedar' });
    return;
  }
  render(`
    <div class="hello">${owl('happy')}<div class="bubble">Hoo-hoo, ${esc(c.name)}! What would you like to know? 🦉</div></div>
    <div class="chips" id="chips">${['Tell me about elephants 🐘', 'Why is the sky blue? 🌤️', 'Help me count to 10 🔢', 'Tell me a fun fact ✨'].map((t) => `<button class="chip">${esc(t)}</button>`).join('')}</div>
    <div class="chat" id="chat" aria-live="polite"></div>
    <div class="row"><input id="ask" type="text" maxlength="300" placeholder="Type your question…" aria-label="Ask Cedar"><button class="btn small" id="send">Send</button></div>
    <p class="muted center" style="font-size:.8rem;margin-top:10px">Cedar is an AI helper. Always tell a grown-up if something worries you.</p>`, { nav: 'cedar' });
  const chat = $('#chat');
  async function send(text) {
    text = text.trim(); if (!text) return;
    $('#ask').value = '';
    chat.insertAdjacentHTML('beforeend', `<div class="msg me">${esc(text)}</div><div class="msg bot" id="typing">…</div>`);
    $('#typing').scrollIntoView({ block: 'center', behavior: 'smooth' });
    try {
      const r = await api('/ai/buddy', { method: 'POST', body: { child_id: c.id, message: text } });
      $('#typing').outerHTML = `<div class="msg bot">${esc(r.reply)} <button class="link" data-say aria-label="Read aloud">🔊</button></div>`;
      const last = $$('[data-say]').pop(); last.addEventListener('click', () => speak(r.reply));
      if (S.sound) speak(r.reply);
    } catch (e) { $('#typing').outerHTML = `<div class="msg bot">${esc(e.status === 402 ? 'This is part of Premium.' : e.message)}</div>`; }
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
function stars() {
  const c = child();
  const got = STICKERS.filter((s) => s.ok(c)).length;
  render(`<div class="card center">${owl('happy').replace('class="owl"', 'class="owl big"')}<h1>${c.stars} ⭐</h1>
    <p>Total stars</p><div class="row" style="justify-content:center"><span class="pill">🔥 Streak: ${c.streak}</span><span class="pill">🏆 Best: ${c.best_streak}</span></div></div>
    <div class="card"><h2>My stickers (${got}/${STICKERS.length})</h2>
      <div class="stickers">${STICKERS.map((s) => `<div class="sticker ${s.ok(c) ? 'on' : ''}" aria-label="${esc(s.t)}${s.ok(c) ? '' : ' (not yet)'}"><span class="se">${s.ok(c) ? s.e : '❔'}</span><small>${esc(s.t)}</small></div>`).join('')}</div>
      <p class="muted center" style="margin:12px 0 0">Do the daily quiz every day to collect them all!</p></div>
    <a class="btn block" href="#/home">Back home</a>`, { nav: 'home' });
  if (got) { sfx.good(); }
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
  const [plans, prog] = await Promise.all([
    api('/payments/plans').catch(() => ({ plans: [], features: [], payments_enabled: false })),
    Promise.all(S.children.map((c) => api(`/children/${c.id}/progress`).catch(() => null))),
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
      <p>${premium ? '⭐ <b>Premium</b> is active.' : 'You are on the <b>Free</b> plan.'}</p>
      <a class="btn ghost small" href="#/home">← Back to the fun</a>
    </div>
    <div class="card"><h2>Progress this week</h2>
      ${S.children.length ? S.children.map((c, i) => progressCard(c, prog[i])).join('') : '<p class="muted">No children yet.</p>'}
      <div class="row wrap" style="margin-top:10px">
        <button class="btn small" id="addc">➕ Add child</button>
      </div>
    </div>
    <div class="card" id="plans"><h2>${premium ? 'Premium plan' : 'Go Premium ⭐'}</h2>
      <ul class="ticks">${plans.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      ${plans.payments_enabled ? plans.plans.map((p) => `
        <div class="plan ${p.code === 'premium_yearly' ? 'best' : ''}"><div class="grow"><b>${esc(p.name)}</b> ${p.code === 'premium_yearly' ? '<span class="badge">Best value</span>' : ''}<br><span class="muted">${esc(p.blurb)}</span></div>
        <button class="btn small sun" data-plan="${esc(p.code)}">${premium ? 'Extend' : 'Choose'}</button></div>`).join('')
        : '<p class="muted">Online payments will be available very soon.</p>'}
      <p class="muted" style="font-size:.85rem">Secure payment by Paystack (card, bank transfer, USSD). We never see your card details.</p>
    </div>
    ${S.user.is_admin ? adminCard() : ''}
    <div class="card"><h2>Account & safety</h2><div id="amsg2"></div>
      ${installBtn()} <a class="btn ghost small" href="#/install">How to install</a>
      <details style="margin-top:12px"><summary><b>Change password</b></summary>
        <label for="cp1">Current password</label><input id="cp1" type="password" autocomplete="current-password">
        <label for="cp2">New password</label><input id="cp2" type="password" autocomplete="new-password" minlength="8">
        <p></p><button class="btn small" id="cpgo">Change password</button></details>
      <details style="margin-top:12px"><summary><b>Delete my account</b></summary>
        <p class="muted">This erases your account, all child profiles and all progress. It cannot be undone.</p>
        <label for="dp">Type your password to confirm</label><input id="dp" type="password" autocomplete="current-password">
        <p></p><button class="btn coral small" id="delgo">Delete everything</button></details>
    </div>
    <div class="card"><a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a> · <a href="${SITE}contact.html"${native ? ' target="_blank" rel="noopener"' : ''}>Contact the school</a>
      <p></p><button class="btn coral small" id="logout">Log out</button></div>`, { bar: false });

  $('#addc').addEventListener('click', () => { location.hash = '#/addchild'; });
  $('#cpgo').addEventListener('click', async () => {
    const m = $('#amsg2');
    try {
      const r = await api('/auth/change-password', { method: 'POST', body: { current_password: $('#cp1').value, new_password: $('#cp2').value } });
      S.token = r.token; store.set('cedar_token', r.token);
      $('#cp1').value = ''; $('#cp2').value = ''; m.innerHTML = toast('ok', 'Password changed. Other devices have been logged out. ✅');
    } catch (e) { m.innerHTML = toast('err', e.message); }
  });
  $('#delgo').addEventListener('click', async () => {
    const m = $('#amsg2');
    if (!$('#dp').value) { m.innerHTML = toast('err', 'Please type your password first.'); return; }
    if (!confirm('Really delete your account and every child profile? This cannot be undone.')) return;
    try { await api('/auth/delete-account', { method: 'POST', body: { password: $('#dp').value } }); logout(); }
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
  if (S.user.is_admin) wireAdmin();
  if (params.get('go') === 'upgrade') $('#plans').scrollIntoView({ behavior: 'smooth' });
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
    ${p.subjects.length ? `<p class="muted" style="font-size:.85rem;margin-top:8px">${p.subjects.filter((s) => s.subject !== 'mixed').map((s) => `${esc(s.subject)}: ${Math.round(100 * s.correct / Math.max(1, s.total))}%`).join(' · ')}</p>` : ''}
  </div>`;
}

function adminCard() {
  return `<div class="card"><h2>🛠 Teacher tools</h2>
    <h3>Setup check</h3>
    <p class="muted">Confirms the database, payments and AI helper are connected.</p>
    <button class="btn small mint" id="diag">✅ Run setup check</button><div id="diagout" style="margin-top:10px"></div>
    <hr style="border:0;border-top:2px solid #eef3fc;margin:18px 0">
    <h3>Add a video</h3>
    <p class="muted">Add a video you have watched and checked is suitable. Paste a YouTube link.</p>
    <div id="amsg"></div>
    <label for="vurl">YouTube link</label><input id="vurl" type="url" placeholder="https://www.youtube.com/watch?v=…">
    <label for="vtitle">Title</label><input id="vtitle" type="text" maxlength="150">
    <label for="vcat">Type</label><select id="vcat"><option value="songs">Songs</option><option value="letters">Letters</option><option value="numbers">Numbers</option><option value="stories">Stories</option><option value="science">Science</option><option value="nigeria">Nigeria</option></select>
    <label class="check"><input id="vprem" type="checkbox"><span>Premium only</span></label>
    <button class="btn small" id="vadd">Add video</button></div>`;
}
function wireAdmin() {
  $('#diag').addEventListener('click', async () => {
    const out = $('#diagout'); out.innerHTML = '<div class="spinner" style="margin:10px auto;width:34px;height:34px;border-width:5px"></div>';
    try {
      const r = await api('/admin/diagnostics');
      out.innerHTML = (r.all_ok ? toast('ok', 'Everything is connected! 🎉') : toast('err', 'Some things still need setting up:')) +
        r.checks.map((c) => `<div style="padding:8px 0;border-top:1px solid #eef3fc"><b>${c.ok ? '✅' : '❌'} ${esc(c.name)}</b><br><span class="muted">${esc(c.detail)}</span>${c.ok || !c.fix ? '' : `<br><span style="font-size:.9rem">👉 ${esc(c.fix)}</span>`}</div>`).join('') +
        `<p class="muted" style="font-size:.85rem;margin-top:10px">${esc(r.webhook_reminder)}</p>`;
    } catch (e) { out.innerHTML = toast('err', e.message); }
  });
  $('#vadd').addEventListener('click', async () => {
    const m = $('#amsg');
    try {
      await api('/admin/videos', { method: 'POST', body: { url: $('#vurl').value, title: $('#vtitle').value, category: $('#vcat').value, premium: $('#vprem').checked } });
      m.innerHTML = toast('ok', 'Video added! 🎬'); $('#vurl').value = ''; $('#vtitle').value = '';
    } catch (e) { m.innerHTML = toast('err', e.message); }
  });
}

// ---------------------------------------------------------------- router
async function route() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [name, query] = raw.split('?');
  const page = name || '';

  if (page === 'install') return installPage();
  if (!S.token) { if (page !== 'welcome') { location.hash = '#/welcome'; return; } return welcome(); }
  if (!S.user) {
    loading();
    try { if (!(await loadUser())) { return logout(); } }
    catch (e) { return render(`<div class="card center">${owl('sad')}<h2>No connection</h2><p>${esc(e.message)}</p><button class="btn" data-act="reload">Try again</button></div>`, { bar: false }); }
  }
  if (new URLSearchParams(location.search).get('reference') && page !== 'grownups') { location.hash = '#/grownups'; return; }

  switch (page) {
    case 'welcome': location.hash = S.children.length ? '#/who' : '#/addchild'; return;
    case 'addchild': return addChild();
    case 'who': return who();
    case 'grownups': return gate(() => grownups(query || location.search));
    default: break;
  }
  if (!child()) {
    if (!S.children.length) { location.hash = '#/addchild'; return; }
    return who();
  }
  switch (page) {
    case 'play': return play();
    case 'watch': return watch();
    case 'cedar': return cedar();
    case 'stars': return stars();
    default: return home();
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('offline', () => { const b = document.createElement('div'); b.className = 'offline'; b.id = 'offb'; b.textContent = 'You are offline. Some things may not work.'; document.body.prepend(b); });
window.addEventListener('online', () => { const b = $('#offb'); if (b) b.remove(); });

if ('serviceWorker' in navigator && !native && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
route();
})();
