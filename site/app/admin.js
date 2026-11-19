/* Admin dashboard (lazy-loaded). Only the school admin sees every tab; "code staff" an admin added see only Codes. */
(() => {
'use strict';
const { api, render, esc, $, $$, toast, S, brand, feat, sfx, confetti } = window.__cedar;
const isAdmin = () => !!(S.user && S.user.is_admin);

const setupHtml = `    <h3>Setup check</h3>
    <p class="muted">Confirms the database, payments and AI helper are connected.</p>
    <button class="btn small mint" id="diag">✅ Run setup check</button><div id="diagout" style="margin-top:10px"></div>`;
const adsHtml = `    <h3>📈 Ad performance</h3>
    <p class="muted">See which ads bring parents who sign up and pay. Last 30 days.</p>
    <label for="spend">Ad money spent so far, in ₦ (optional)</label><input id="spend" type="number" inputmode="numeric" min="0" placeholder="e.g. 50000">
    <p></p><button class="btn small" id="statsbtn">Show results</button><div id="statsout" style="margin-top:10px"></div>`;
const questionsHtml = `    <h3>📝 Questions: import and review</h3>
    <p class="muted">Draft questions anywhere (by hand, in a spreadsheet, or in any AI chat on your own account), paste them here as JSON, and approve the good ones. Children never see a draft.</p>
    <details><summary><b>Prompt to copy into an AI chat</b></summary><p class="muted" style="font-size:.85rem;user-select:all">Write 10 multiple-choice quiz questions for Nigerian children aged 6 to 8 about [TOPIC]. Return ONLY a JSON array. Each item: {"level":"lower","subject":"maths","visual":"one emoji","prompt":"...","options":["a","b","c"],"answer":"must equal one option","explanation":"one friendly sentence"}. Levels: tiny (2-3), nursery (4-5), lower (6-8), upper (9-11). Facts must be correct and simple.</p></details>
    <label for="qjson">Paste the JSON here</label><textarea id="qjson" rows="4" style="width:100%;font:inherit;border-radius:14px;border:3px solid #d7e4fa;padding:10px"></textarea>
    <p></p><button class="btn small" id="qimport">Import as drafts</button> <button class="btn ghost small" id="qdrafts">Review drafts</button><div id="qout" style="margin-top:10px"></div>`;
const reportsHtml = `    <h3>🚩 Cedar reports</h3><p class="muted">Replies a parent flagged, and messages our safety filter stopped. Please check these regularly.</p>
    <button class="btn ghost small" id="reps">Show reports</button><div id="repout" style="margin-top:10px"></div>
    `;
const videoHtml = feat('videos') ? `    <h3>Add a video</h3>
    <p class="muted">Add a video you have watched and checked is suitable. Paste a YouTube link.</p>
    <div id="amsg"></div>
    <label for="vurl">YouTube link</label><input id="vurl" type="url" placeholder="https://www.youtube.com/watch?v=…">
    <label for="vtitle">Title</label><input id="vtitle" type="text" maxlength="150">
    <label for="vcat">Type</label><select id="vcat"><option value="songs">Songs</option><option value="letters">Letters</option><option value="numbers">Numbers</option><option value="stories">Stories</option><option value="science">Science</option><option value="nigeria">Nigeria</option></select>
    <label class="check"><input id="vprem" type="checkbox"><span>Premium only</span></label>
    <button class="btn small" id="vadd">Add video</button>` : '<h3>Videos</h3><p class="muted">The Watch &amp; Learn section is switched off (set <b>ENABLE_VIDEOS=true</b> on Render when every video is owned or licensed).</p>';

function wireLegacy() {
  $('#statsbtn').addEventListener('click', async () => {
    const out = $('#statsout'); out.innerHTML = '<div class="spinner" style="margin:10px auto;width:34px;height:34px;border-width:5px"></div>';
    try {
      const r = await api('/admin/stats?days=30'), f = r.funnel, spend = Number($('#spend').value) || 0;
      const n = (k) => '₦' + Math.round(k / 100).toLocaleString('en-NG');
      const steps = [['👀 Saw the landing page', f.landing_views], ['🎮 Started the free quiz', f.demo_started], ['🏁 Finished the free quiz', f.demo_finished], ['📝 Created an account', f.signups],
        ['🧒 Added a child', f.added_child], ['🎯 Played the daily quiz', f.played_daily], ['🛒 Started checkout', f.started_checkout], ['⭐ Paid', f.paid]];
      let prev = null;
      out.innerHTML = steps.map(([l, v]) => { if (l.includes('Created an account')) prev = null; /* visitors and accounts are different groups */ const pct = prev && prev > 0 ? ` <span class="muted">(${Math.round(100 * v / prev)}% of the step before)</span>` : ''; prev = v; return `<div class="fn"><span>${l}</span><b>${v}</b>${pct}</div>`; }).join('') +
        `<p style="margin:10px 0 0"><b>Money in:</b> ${n(f.revenue_kobo)}${spend ? ` · <b>Cost per sign-up:</b> ${f.signups ? '₦' + Math.round(spend / f.signups).toLocaleString('en-NG') : '–'}${f.paid ? ` · <b>Cost per paying family:</b> ₦${Math.round(spend / f.paid).toLocaleString('en-NG')}` : ''}` : ''}</p>
        <h3 style="margin-top:14px">By ad / source</h3><div class="tbl"><div class="tr th"><span>Source / campaign</span><span>Sign-ups</span><span>Played</span><span>Paid</span></div>
        ${r.campaigns.length ? r.campaigns.map((c) => `<div class="tr"><span>${esc(c.campaign)}</span><span>${c.signups}</span><span>${c.played_daily}</span><span>${c.paid}</span></div>`).join('') : '<div class="tr"><span>No sign-ups yet</span></div>'}</div>
        <p class="muted" style="font-size:.85rem">Tip: put <b>?utm_source=facebook&amp;utm_campaign=your-ad-name</b> on every ad link so each ad shows up here.</p>`;
    } catch (e) { out.innerHTML = toast('err', e.message); }
  });
  $('#diag').addEventListener('click', async () => {
    const out = $('#diagout'); out.innerHTML = '<div class="spinner" style="margin:10px auto;width:34px;height:34px;border-width:5px"></div>';
    try {
      const r = await api('/admin/diagnostics');
      out.innerHTML = (r.all_ok ? toast('ok', 'Everything is connected! 🎉') : toast('err', 'Some things still need setting up:')) +
        r.checks.map((c) => `<div style="padding:8px 0;border-top:1px solid #eef3fc"><b>${c.ok ? '✅' : '❌'} ${esc(c.name)}</b><br><span class="muted">${esc(c.detail)}</span>${c.ok || !c.fix ? '' : `<br><span style="font-size:.9rem">👉 ${esc(c.fix)}</span>`}</div>`).join('') +
        `<p class="muted" style="font-size:.85rem;margin-top:10px">${esc(r.webhook_reminder)}</p>`;
    } catch (e) { out.innerHTML = toast('err', e.message); }
  });
  $('#qimport').addEventListener('click', async () => {
    const o = $('#qout');
    try {
      const data = JSON.parse($('#qjson').value);
      const r = await api('/admin/questions/import', { method: 'POST', body: { questions: Array.isArray(data) ? data : [data] } });
      o.innerHTML = toast('ok', `${r.drafted} draft(s) saved.` + (r.skipped_rows.length ? ` Skipped rows: ${r.skipped_rows.join(', ')} (check level, options and answer).` : '')); $('#qjson').value = '';
    } catch (e) { o.innerHTML = toast('err', e instanceof SyntaxError ? 'That is not valid JSON. Paste only the [ ... ] list.' : e.message); }
  });
  $('#qdrafts').addEventListener('click', async () => {
    const o = $('#qout');
    try {
      const d = await api('/admin/questions/drafts');
      o.innerHTML = d.length ? d.map((q) => `<div class="draft" data-q="${q.id}"><b>${esc(q.visual)} ${esc(q.prompt)}</b><br><span class="muted">${esc(q.level)} · ${esc(q.subject)} · answer: <b>${esc(q.answer)}</b> · options: ${q.options.map(esc).join(' / ')}</span><br><small>${esc(q.explanation)}</small>
        <div class="row" style="margin-top:6px"><button class="btn small mint" data-ok="${q.id}">✅ Approve</button><button class="btn small coral" data-no="${q.id}">🗑 Delete</button></div></div>`).join('') : toast('ok', 'No drafts waiting.');
      $$('[data-ok]', o).forEach((b) => b.addEventListener('click', async () => { await api(`/admin/questions/${b.dataset.ok}/approve`, { method: 'POST' }); b.closest('.draft').remove(); }));
      $$('[data-no]', o).forEach((b) => b.addEventListener('click', async () => { await api(`/admin/questions/${b.dataset.no}`, { method: 'DELETE' }); b.closest('.draft').remove(); }));
    } catch (e) { o.innerHTML = toast('err', e.message); }
  });
  $('#reps').addEventListener('click', async () => {
    const o = $('#repout');
    try {
      const d = await api('/admin/ai-reports');
      o.innerHTML = d.length ? d.map((x) => `<div class="draft" data-r="${x.id}"><b>${x.source === 'auto_filter' ? '🛡 Filter stopped a message' : '🚩 Parent report'}</b> ${/urgent/.test(x.reply) ? '<span class="badge" style="background:#ffb4b4">URGENT: child may need help</span>' : ''}<br>
        <span class="muted">Child said:</span> ${esc(x.prompt)}<br><span class="muted">Cedar said:</span> ${esc(x.reply)}<br><button class="btn small mint" data-done="${x.id}" style="margin-top:6px">Mark as handled</button></div>`).join('') : toast('ok', 'No open reports. 🎉');
      $$('[data-done]', o).forEach((b) => b.addEventListener('click', async () => { await api(`/admin/ai-reports/${b.dataset.done}/resolve`, { method: 'POST' }); b.closest('.draft').remove(); }));
    } catch (e) { o.innerHTML = toast('err', e.message); }
  });
  if ($('#vadd')) $('#vadd').addEventListener('click', async () => {
    const m = $('#amsg');
    try {
      await api('/admin/videos', { method: 'POST', body: { url: $('#vurl').value, title: $('#vtitle').value, category: $('#vcat').value, premium: $('#vprem').checked } });
      m.innerHTML = toast('ok', 'Video added! 🎬'); $('#vurl').value = ''; $('#vtitle').value = '';
    } catch (e) { m.innerHTML = toast('err', e.message); }
  });
}

// ---------------------------------------------------------------- router

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const badge = (st) => `<span class="st st-${st.replace(' ', '')}">${esc(st)}</span>`;

// ---------------------------------------------------------------- Premium codes
const codesHtml = () => `<div class="card"><h2>🎟 Make Premium codes</h2>
  <p class="muted" style="margin-top:0">A code gives a family Premium for a set time. Give it to a parent (WhatsApp, print, in person). They enter it under <b>Grown-ups → Premium → "Have a Premium code?"</b>.</p>
  <div id="cmsg2"></div>
  <label>How long should Premium last?</label>
  <div class="chips" id="dchips">${[7, 14, 30, 90, 180, 365].map((d) => `<button class="chip ${d === 30 ? 'on' : ''}" data-d="${d}">${d >= 365 ? '1 year' : d >= 90 ? d / 30 + ' months' : d + ' days'}</button>`).join('')}</div>
  <label for="cdays">…or a number of days</label><input id="cdays" type="number" min="1" max="${isAdmin() ? 730 : 365}" value="30">
  <label for="ccount">How many codes?</label><input id="ccount" type="number" min="1" max="${isAdmin() ? 100 : 50}" value="1">
  <label for="cuses">Families per code</label><input id="cuses" type="number" min="1" max="500" value="1">
  <p class="muted" style="margin:4px 0 0;font-size:.85rem">1 = a personal gift for one family. A bigger number makes one code you can share with a whole class.</p>
  <label for="clabel">Label (only you see this)</label><input id="clabel" type="text" maxlength="60" placeholder="e.g. Scholarship, Nov 2026">
  <label for="cby">Code must be used before (optional)</label><input id="cby" type="date">
  <p></p><button class="btn sun" id="cgen">✨ Generate</button><div id="cresult" style="margin-top:12px"></div></div>
  <div class="card"><h2>${isAdmin() ? 'All codes' : 'Codes you made'}</h2><button class="btn ghost small" id="crefresh">↻ Refresh</button><div id="clist" style="margin-top:10px"></div></div>`;

function waLink(code, days) {
  const t = `Your Cedarville Learning Premium code (${days} days): ${code}\nTo use it: open the Cedarville Learning app, tap the 🔒 Grown-ups area, then Premium, then "Have a Premium code?" and type it in. Thank you!`;
  return 'https://wa.me/?text=' + encodeURIComponent(t);
}
async function loadCodes() {
  const box = $('#clist'); if (!box) return;
  try {
    const { codes } = await api('/admin/codes');
    box.innerHTML = codes.length ? codes.map((c) => `<div class="coderow"><div class="grow"><span class="codechip sm">${esc(c.code)}</span> ${badge(c.status)}<br>
      <small class="muted">${c.days} days · used ${c.uses}/${c.max_uses}${c.label ? ' · ' + esc(c.label) : ''}${c.redeem_by ? ' · use before ' + fmtDate(c.redeem_by) : ''}${c.made_by && isAdmin() ? ' · by ' + esc(c.made_by) : ''}</small></div>
      ${c.status === 'active' ? `<a class="link" href="${waLink(c.code, c.days)}" target="_blank" rel="noopener">💬</a><button class="link" data-revoke="${c.id}">Revoke</button>` : ''}</div>`).join('') : '<p class="muted">No codes yet. Make your first one above.</p>';
    $$('[data-revoke]', box).forEach((b) => b.addEventListener('click', async () => { if (!confirm('Stop this code from being used? Premium already given stays.')) return; await api(`/admin/codes/${b.dataset.revoke}/revoke`, { method: 'POST' }); loadCodes(); }));
  } catch (e) { box.innerHTML = toast('err', e.message); }
}
function wireCodes() {
  $$('#dchips .chip').forEach((b) => b.addEventListener('click', () => { $$('#dchips .chip').forEach((x) => x.classList.toggle('on', x === b)); $('#cdays').value = b.dataset.d; }));
  $('#cdays').addEventListener('input', () => $$('#dchips .chip').forEach((x) => x.classList.toggle('on', x.dataset.d === $('#cdays').value)));
  $('#crefresh').addEventListener('click', loadCodes);
  $('#cgen').addEventListener('click', async () => {
    const m = $('#cmsg2'), btn = $('#cgen'); btn.disabled = true;
    try {
      const body = { days: Number($('#cdays').value), count: Number($('#ccount').value), max_uses: Number($('#cuses').value), label: $('#clabel').value };
      if ($('#cby').value) body.redeem_by = $('#cby').value;
      const { codes } = await api('/admin/codes', { method: 'POST', body });
      sfx.win(); m.innerHTML = '';
      $('#cresult').innerHTML = `<div class="ok">✅ ${codes.length} code${codes.length > 1 ? 's' : ''} ready!</div>
        ${codes.map((c) => `<div class="coderow"><span class="codechip">${esc(c.code)}</span><a class="btn small mint" href="${waLink(c.code, c.days)}" target="_blank" rel="noopener">💬 WhatsApp</a></div>`).join('')}
        <button class="btn small" id="ccopy" style="margin-top:8px">📋 Copy all codes</button>`;
      $('#ccopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(codes.map((c) => c.code).join('\n')); $('#ccopy').textContent = '✅ Copied!'; } catch { $('#ccopy').textContent = 'Select and copy them by hand'; } });
      loadCodes();
    } catch (e) { m.innerHTML = toast('err', e.message); } finally { btn.disabled = false; }
  });
  loadCodes();
}

// ---------------------------------------------------------------- People: teacher approvals + code staff
const peopleHtml = () => `<div class="card"><h2>👩‍🏫 Teacher requests</h2><p class="muted" style="margin-top:0">Teachers ask for access when they sign up. Approve only people who really work at the school.</p><div id="tlist"></div></div>
  <div class="card"><h2>🎟 Code staff</h2><p class="muted" style="margin-top:0">People who may make and revoke Premium codes (and see only the codes they made). They must already have an account.</p>
  <div id="smsg"></div><div class="row"><input id="semail" type="email" placeholder="their@email.com" autocomplete="off"><button class="btn small" id="sadd">Add</button></div><div id="slist" style="margin-top:10px"></div></div>`;
async function loadPeople() {
  try {
    const t = await api('/admin/teachers');
    $('#tlist').innerHTML = (t.pending.length ? t.pending.map((u) => `<div class="coderow"><div class="grow"><b>${esc(u.name)}</b><br><small class="muted">${esc(u.email)}</small></div><button class="btn small mint" data-ok="${u.id}">Approve</button><button class="link" data-no="${u.id}">Reject</button></div>`).join('') : '<p class="muted">No requests waiting. 🎉</p>')
      + (t.approved.length ? `<p class="muted" style="margin-bottom:0"><b>Approved teachers:</b> ${t.approved.map((u) => esc(u.name)).join(', ')}</p>` : '');
    $$('[data-ok]', $('#tlist')).forEach((b) => b.addEventListener('click', async () => { await api(`/admin/teachers/${b.dataset.ok}/approve`, { method: 'POST' }); loadPeople(); }));
    $$('[data-no]', $('#tlist')).forEach((b) => b.addEventListener('click', async () => { await api(`/admin/teachers/${b.dataset.no}/reject`, { method: 'POST' }); loadPeople(); }));
    const st = await api('/admin/staff');
    $('#slist').innerHTML = st.staff.length ? st.staff.map((u) => `<div class="coderow"><div class="grow"><b>${esc(u.name)}</b><br><small class="muted">${esc(u.email)}</small></div><button class="link" data-rm="${u.id}">Remove</button></div>`).join('') : '<p class="muted">No code staff yet. Only you can make codes.</p>';
    $$('[data-rm]', $('#slist')).forEach((b) => b.addEventListener('click', async () => { await api(`/admin/staff/${b.dataset.rm}`, { method: 'DELETE' }); loadPeople(); }));
  } catch (e) { const t = $('#tlist'); if (t) t.innerHTML = toast('err', e.message); }
}
function wirePeople() {
  $('#sadd').addEventListener('click', async () => {
    const m = $('#smsg');
    try { await api('/admin/staff', { method: 'POST', body: { email: $('#semail').value.trim() } }); $('#semail').value = ''; m.innerHTML = toast('ok', 'Added! They can now open this dashboard from their Grown-ups area.'); loadPeople(); }
    catch (e) { m.innerHTML = toast('err', e.message); }
  });
  loadPeople();
}

// ---------------------------------------------------------------- the page
const TABS = [['overview', '📊 Overview'], ['codes', '🎟 Codes'], ['people', '👥 People'], ['content', '📝 Content']];
function show(segs) {
  const admin = isAdmin();
  const tabs = admin ? TABS : TABS.filter((t) => t[0] === 'codes');
  let tab = segs[0] && tabs.some((t) => t[0] === segs[0]) ? segs[0] : tabs[0][0];
  render(`${brand()}<div class="center"><h1>🛠 ${admin ? 'Admin dashboard' : 'Premium codes'}</h1></div>
    <div class="tabs2" role="tablist">${tabs.map((t) => `<button role="tab" data-tab="${t[0]}" class="${t[0] === tab ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
    ${admin ? `<section data-panel="overview" ${tab === 'overview' ? '' : 'hidden'}><div class="card">${setupHtml}<hr class="hr">${adsHtml}</div></section>` : ''}
    <section data-panel="codes" ${tab === 'codes' ? '' : 'hidden'}>${codesHtml()}</section>
    ${admin ? `<section data-panel="people" ${tab === 'people' ? '' : 'hidden'}>${peopleHtml()}</section>
    <section data-panel="content" ${tab === 'content' ? '' : 'hidden'}><div class="card">${questionsHtml}<hr class="hr">${reportsHtml}<hr class="hr">${videoHtml}</div></section>` : ''}
    <p class="center" style="margin-top:16px"><a class="btn ghost small" href="#/grownups">← Back to Grown-ups</a></p>`, { bar: false });
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    $$('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
    $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab; });
    history.replaceState(null, '', '#/admin/' + tab);
  }));
  wireCodes();
  if (admin) { wireLegacy(); wirePeople(); }
}

window.__cedarAdmin = { show };
})();
