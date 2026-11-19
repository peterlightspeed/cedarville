/* Teacher area (lazy-loaded): classes, homework builder, results, class leaderboard. */
(() => {
'use strict';
const { api, render, esc, $, $$, toast, S, brand, sfx, confetti } = window.__cedar;

const LEVELS = [['tiny', '2–3 years · Little Explorers'], ['nursery', '4–5 years · Nursery'], ['lower', '6–8 years · Primary 1–3'], ['upper', '9–11 years · Primary 4–6']];
const levelName = (k) => (LEVELS.find((l) => l[0] === k) || [0, k])[1];
const ICON = { homework: '📚', exercise: '✏️', quiz: '🎯' };
const back = (href, label = '← Back') => `<p><a class="btn ghost small" href="${href}">${label}</a></p>`;
const fmt = (iso) => new Date(iso.length > 10 ? iso : iso + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

function show(segs) {
  const [p, id] = segs;
  if (p === 'class') return classPage(Number(id));
  if (p === 'new') return builder(Number(id));
  if (p === 'a') return results(Number(id));
  return dashboard();
}

// ---------------------------------------------------------------- dashboard
async function dashboard() {
  const ts = S.user.teacher_status;
  if (ts !== 'approved') {
    render(`${brand()}<div class="card center">${window.__cedar.owl('happy')}<h2>Teacher area 👩‍🏫</h2>
      <p>${ts === 'pending' ? 'Your request is waiting for the school to approve it. This is usually quick.' : ts === 'rejected' ? 'Teacher access was not approved. Please contact the school.' : 'Ask for teacher access to set homework and see your class results.'}</p>
      ${!ts ? '<button class="btn sun" id="ask">Ask for teacher access</button>' : ''}<p></p><a class="btn ghost" href="#/grownups">← Back</a></div>`, { bar: false });
    if ($('#ask')) $('#ask').addEventListener('click', async () => { await api('/auth/request-teacher', { method: 'POST' }); S.user = await api('/auth/me'); dashboard(); });
    return;
  }
  let classes;
  try { classes = (await api('/teacher/classes')).classes; } catch (e) { return render(toast('err', e.message), { bar: false }); }
  render(`${brand()}<div class="center"><h1>👩‍🏫 My classes</h1><p class="muted">Hello, ${esc(S.user.display_name)}!</p></div>
    ${classes.map((c) => `<a class="card clscard" href="#/teacher/class/${c.id}"><div class="row"><span class="e">🏫</span><span class="grow"><b>${esc(c.name)}</b><br><small class="muted">${esc(levelName(c.level))}</small></span><span class="codechip sm">${esc(c.code)}</span></div>
      <div class="muted" style="margin-top:6px">👧 ${c.students} student${c.students === 1 ? '' : 's'} · 📚 ${c.assignments} homework</div></a>`).join('') || '<div class="card center"><p class="muted">No classes yet. Make your first one below.</p></div>'}
    <div class="card"><h2>➕ New class</h2><div id="cm"></div>
      <label for="cn">Class name</label><input id="cn" type="text" maxlength="60" placeholder="e.g. Primary 2 Gold">
      <label for="cl">Age group</label><select id="cl">${LEVELS.map((l) => `<option value="${l[0]}" ${l[0] === 'lower' ? 'selected' : ''}>${esc(l[1])}</option>`).join('')}</select>
      <p></p><button class="btn sun" id="cmk">Create class</button></div>
    <p class="center"><a class="btn ghost small" href="#/grownups">← Back to Grown-ups</a></p>`, { bar: false });
  $('#cmk').addEventListener('click', async () => {
    try { const c = await api('/teacher/classes', { method: 'POST', body: { name: $('#cn').value, level: $('#cl').value } }); sfx.win(); location.hash = '#/teacher/class/' + c.id; }
    catch (e) { $('#cm').innerHTML = toast('err', e.message); }
  });
}

// ---------------------------------------------------------------- one class
async function classPage(id) {
  let d;
  try { d = await api('/teacher/classes/' + id); } catch (e) { return render(`${toast('err', e.message)}${back('#/teacher')}`, { bar: false }); }
  const c = d.class;
  const msg = `Join "${c.name}" on Cedarville Learning! Open the app, tap the 🔒 Grown-ups area, choose "Join your child's class" and enter the code ${c.code}.`;
  render(`${brand()}<div class="center"><h1>🏫 ${esc(c.name)}</h1><p class="muted" style="margin:0">${esc(levelName(c.level))}</p></div>
    <div class="card center"><div class="muted">Class code. Give this to parents:</div><div class="codechip">${esc(c.code)}</div>
      <div class="row" style="justify-content:center;margin-top:8px"><button class="btn small" id="cp">📋 Copy</button><a class="btn small mint" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">💬 WhatsApp</a></div></div>
    <div class="tabs2"><button class="on" data-t="hw">📚 Homework</button><button data-t="st">👧 Students (${d.students.length})</button><button data-t="lb">🏆 Leaderboard</button></div>
    <section data-p="hw"><a class="btn sun block" href="#/teacher/new/${id}">➕ New homework</a><div style="height:10px"></div>
      ${d.assignments.length ? d.assignments.map((a) => `<a class="card clscard" href="#/teacher/a/${a.id}"><div class="row"><span class="e">${ICON[a.kind] || '📚'}</span><span class="grow"><b>${esc(a.title)}</b><br><small class="muted">${a.questions} questions${a.due_date ? ' · due ' + fmt(a.due_date) : ''}</small></span><b>${a.done}/${a.of}</b></div></a>`).join('') : '<div class="card center"><p class="muted">No homework yet. Tap “New homework” to set some.</p></div>'}</section>
    <section data-p="st" hidden>${d.students.length ? `<div class="card">${d.students.map((s) => `<div class="hwrow"><span class="e">${esc(s.avatar)}</span><span class="grow"><b>${esc(s.name)}</b> <small class="muted">age ${s.age}</small><br><small class="muted">⭐ ${s.stars_week} this week · ${s.stars_total} total · 🔥 ${s.streak} · homework ${s.homework_done}/${s.homework_total}</small></span><button class="link" data-rm="${s.child_id}" aria-label="Remove ${esc(s.name)}">Remove</button></div>`).join('')}</div>` : '<div class="card center"><p class="muted">No students yet. Share the class code with parents. They add their child from the Grown-ups area.</p></div>'}</section>
    <section data-p="lb" hidden><div class="card"><div class="seg"><button class="on" data-per="week">This week</button><button data-per="all">All time</button></div><div id="lbbox"></div></div></section>
    ${back('#/teacher', '← All classes')}<p class="center"><button class="link" id="arch">Archive this class</button></p>`, { bar: false });
  $('#cp').addEventListener('click', async () => { try { await navigator.clipboard.writeText(c.code); $('#cp').textContent = '✅ Copied'; } catch { $('#cp').textContent = c.code; } });
  $$('[data-t]').forEach((b) => b.addEventListener('click', () => { $$('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); $$('[data-p]').forEach((p) => { p.hidden = p.dataset.p !== b.dataset.t; }); if (b.dataset.t === 'lb') board('week'); }));
  const board = async (per) => {
    $$('[data-per]').forEach((x) => x.classList.toggle('on', x.dataset.per === per));
    try {
      const r = await api(`/teacher/classes/${id}/leaderboard?period=${per}`);
      $('#lbbox').innerHTML = r.board.length ? `<ol class="board">${r.board.map((x) => `<li><span class="rk">${x.rank <= 3 ? ['🥇', '🥈', '🥉'][x.rank - 1] : x.rank}</span><span class="av">${esc(x.avatar)}</span><span class="grow">${esc(x.name)}</span><b>${x.stars} ⭐</b></li>`).join('')}</ol>` : '<p class="muted">No students yet.</p>';
    } catch (e) { $('#lbbox').innerHTML = toast('err', e.message); }
  };
  $$('[data-per]').forEach((b) => b.addEventListener('click', () => board(b.dataset.per)));
  $$('[data-rm]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Remove this student from the class?')) return; await api(`/teacher/classes/${id}/students/${b.dataset.rm}`, { method: 'DELETE' }); classPage(id); }));
  $('#arch').addEventListener('click', async () => { if (!confirm('Archive this class? Parents will no longer see it.')) return; await api('/teacher/classes/' + id, { method: 'DELETE' }); location.hash = '#/teacher'; });
}

// ---------------------------------------------------------------- homework builder
async function builder(classId) {
  let d;
  try { d = await api('/teacher/classes/' + classId); } catch (e) { return render(`${toast('err', e.message)}${back('#/teacher')}`, { bar: false }); }
  const level = d.class.level;
  let subjects = [];
  try { subjects = (await api('/teacher/bank/subjects?level=' + level)).subjects; } catch { /* optional */ }
  const items = []; let kind = 'homework';
  const draw = () => {
    $('#qlist').innerHTML = items.length ? items.map((q, i) => `<div class="qitem"><div class="grow"><b>${i + 1}. ${esc(q.visual || '')} ${esc(q.prompt)}</b><br>${q.options.map((o) => `<span class="opt-s ${o === q.answer ? 'ok' : ''}">${o === q.answer ? '✓ ' : ''}${esc(o)}</span>`).join('')}</div><button class="link" data-del="${i}" aria-label="Remove question ${i + 1}">✖</button></div>`).join('') : '<p class="muted">No questions yet. Add some from the bank or write your own.</p>';
    $('#qcount').textContent = items.length;
    $$('[data-del]').forEach((b) => b.addEventListener('click', () => { items.splice(Number(b.dataset.del), 1); draw(); }));
  };
  render(`${brand()}<div class="center"><h1>New homework</h1><p class="muted" style="margin:0">${esc(d.class.name)} · ${esc(levelName(level))}</p></div>
    <div class="card"><div id="bm"></div>
      <label for="ht">Title</label><input id="ht" type="text" maxlength="120" placeholder="e.g. Week 3: Adding up to 20">
      <label>Type</label><div class="chips" id="hk">${[['homework', '📚 Homework'], ['exercise', '✏️ Exercise'], ['quiz', '🎯 Quiz']].map(([k, l]) => `<button class="chip ${k === kind ? 'on' : ''}" data-k="${k}">${l}</button>`).join('')}</div>
      <label for="hi">Instructions for the children (optional)</label><input id="hi" type="text" maxlength="500" placeholder="e.g. Take your time and do your best!">
      <label for="hd">Due date (optional)</label><input id="hd" type="date"></div>
    <div class="card"><h2>Questions (<span id="qcount">0</span>)</h2><div id="qlist"></div></div>
    <div class="card"><h3>➕ Add from the question bank</h3>
      <div class="row wrap"><select id="bs" aria-label="Subject">${subjects.length ? subjects.map((s) => `<option value="${esc(s.subject)}">${esc(s.subject)} (${s.count})</option>`).join('') : '<option value="">No questions for this age</option>'}</select>
      <select id="bc" aria-label="How many">${[3, 5, 8, 10].map((n) => `<option ${n === 5 ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="btn small" id="badd">Add random</button></div>
      <p class="muted" style="font-size:.85rem;margin-bottom:0">Don't like a question? Remove it with ✖ and add more.</p></div>
    <div class="card"><h3>✍️ Write your own question</h3><div id="cm"></div>
      <label for="cq">Question</label><input id="cq" type="text" maxlength="300">
      ${['A', 'B', 'C', 'D'].map((L, i) => `<div class="row" style="margin-top:6px"><input type="radio" name="cor" value="${i}" ${i === 0 ? 'checked' : ''} aria-label="Option ${L} is correct" style="width:26px;height:26px"><input class="co" type="text" maxlength="80" placeholder="Option ${L}${i < 2 ? '' : ' (optional)'}"></div>`).join('')}
      <p class="muted" style="font-size:.85rem;margin:4px 0">Tick the circle next to the correct answer.</p>
      <label for="ce">Explanation shown after answering (optional)</label><input id="ce" type="text" maxlength="300">
      <p></p><button class="btn small" id="cadd">Add my question</button></div>
    <button class="btn sun block" id="hsave">Give to the class 🚀</button>${back('#/teacher/class/' + classId, '← Cancel')}`, { bar: false });
  draw();
  $$('#hk .chip').forEach((b) => b.addEventListener('click', () => { kind = b.dataset.k; $$('#hk .chip').forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#badd').addEventListener('click', async () => {
    const sub = $('#bs').value; if (!sub) return;
    try {
      const ex = items.filter((q) => q.id).map((q) => q.id).join(',');
      const r = await api(`/teacher/bank/pick?level=${level}&subject=${encodeURIComponent(sub)}&count=${$('#bc').value}&exclude=${ex}`);
      r.questions.forEach((q) => items.push(q)); draw();
      if (!r.questions.length) $('#bm').innerHTML = toast('err', 'No more questions in that subject. Try another.');
    } catch (e) { $('#bm').innerHTML = toast('err', e.message); }
  });
  $('#cadd').addEventListener('click', () => {
    const opts = $$('.co').map((i) => i.value.trim()), idx = Number((document.querySelector('input[name=cor]:checked') || {}).value || 0);
    const filled = opts.filter(Boolean), answer = opts[idx];
    const m = $('#cm');
    if ($('#cq').value.trim().length < 3) { m.innerHTML = toast('err', 'Please type the question.'); return; }
    if (filled.length < 2) { m.innerHTML = toast('err', 'Please give at least two options.'); return; }
    if (!answer) { m.innerHTML = toast('err', 'The circle you ticked has no answer typed next to it.'); return; }
    if (new Set(filled).size !== filled.length) { m.innerHTML = toast('err', 'Each option must be different.'); return; }
    items.push({ custom: true, prompt: $('#cq').value.trim(), options: filled, answer, explanation: $('#ce').value.trim(), visual: '' });
    $('#cq').value = ''; $('#ce').value = ''; $$('.co').forEach((i) => (i.value = '')); m.innerHTML = ''; draw();
  });
  $('#hsave').addEventListener('click', async () => {
    const m = $('#bm'); if (!items.length) { m.innerHTML = toast('err', 'Please add at least one question.'); window.scrollTo(0, 0); return; }
    if ($('#ht').value.trim().length < 2) { m.innerHTML = toast('err', 'Please give the homework a title.'); window.scrollTo(0, 0); return; }
    const btn = $('#hsave'); btn.disabled = true;
    try {
      await api(`/teacher/classes/${classId}/assignments`, { method: 'POST', body: {
        title: $('#ht').value.trim(), instructions: $('#hi').value.trim(), kind, due_date: $('#hd').value || null,
        question_ids: items.filter((q) => q.id).map((q) => q.id),
        custom: items.filter((q) => q.custom).map((q) => ({ prompt: q.prompt, options: q.options, answer: q.answer, explanation: q.explanation })) } });
      sfx.win(); confetti(); location.hash = '#/teacher/class/' + classId;
    } catch (e) { m.innerHTML = toast('err', e.message); window.scrollTo(0, 0); btn.disabled = false; }
  });
}

// ---------------------------------------------------------------- results
async function results(id) {
  let r;
  try { r = await api('/teacher/assignments/' + id); } catch (e) { return render(`${toast('err', e.message)}${back('#/teacher')}`, { bar: false }); }
  const a = r.assignment, sm = r.summary;
  render(`${brand()}<div class="center"><h1>${ICON[a.kind] || '📚'} ${esc(a.title)}</h1><p class="muted" style="margin:0">${a.due_date ? 'Due ' + fmt(a.due_date) : 'No due date'}${a.instructions ? ' · ' + esc(a.instructions) : ''}</p></div>
    <div class="card"><div class="stats3"><div><b>${sm.done}/${sm.students}</b><small>handed in</small></div><div><b>${sm.average_pct === null ? '–' : sm.average_pct + '%'}</b><small>class average</small></div><div><b>${r.questions.length}</b><small>questions</small></div></div></div>
    <div class="card"><h2>Students</h2>${r.students.length ? r.students.map((s) => `<div class="hwrow ${s.done ? '' : 'pending'}"><span class="e">${esc(s.avatar)}</span><span class="grow"><b>${esc(s.name)}</b></span>${s.done ? `<span><b>${s.correct}/${s.total}</b> ${s.late ? '<small class="late">late</small>' : ''}</span>` : '<small class="muted">not yet</small>'}</div>`).join('') : '<p class="muted">No students in this class yet.</p>'}</div>
    <div class="card"><h2>Question by question</h2><p class="muted" style="margin-top:0">Questions many children got wrong may need re-teaching.</p>
      ${r.questions.map((q, i) => `<div class="qres"><div><b>${i + 1}. ${esc(q.prompt)}</b><br><small class="muted">Answer: ${esc(q.answer)}</small></div>${q.pct === null ? '<small class="muted">no answers yet</small>' : `<div class="bar"><i style="width:${q.pct}%" class="${q.pct < 50 ? 'low' : ''}"></i></div><small>${q.pct}% correct${q.pct < 50 ? ' · <b class="late">needs review</b>' : ''}</small>`}</div>`).join('')}</div>
    ${back('#/teacher/class/' + a.class_id, '← Back to class')}<p class="center"><button class="link" id="adel">Delete this homework</button></p>`, { bar: false });
  $('#adel').addEventListener('click', async () => { if (!confirm('Delete this homework and everyone\'s results for it?')) return; await api('/teacher/assignments/' + id, { method: 'DELETE' }); location.hash = '#/teacher/class/' + a.class_id; });
}

window.__cedarTeacher = { show };
})();
