# Cedarville Learning — Launch Guide

What was built, how to run it, and how to put it online.

## What you now have

| Piece | Where | What it does |
|---|---|---|
| Kids' web app | `site/app/` | Parent sign-up/login → child profiles → daily quiz, practice by subject, videos, Cedar the Owl (AI), grown-ups area |
| Backend API | `backend/` | FastAPI: accounts, quizzes (215 starter questions), videos, Paystack payments, AI helper, admin tools |
| Mobile app wrapper | `mobile/` | Capacitor project that packages the web app for Google Play |
| Hosting config | `render.yaml`, `site/vercel.json` | One-click-ish deploy to Render and Vercel |

Your original school website is untouched except for a **🎈 Kids Zone** menu link on every page and a real
call-to-action on the Learning Hub page (it used to say "coming soon").

> **Which folder is the real website?** The zip has two copies of the site: the root (`index.html`, …) and
> `site/`. Only `site/` is current — it has `config.js` and the API proxy; the root copy is older. Everything new
> lives in `site/`. Deploy from `site/` and delete the root copies once you've confirmed (otherwise you'll
> edit the wrong one).

## 🆕 What's new in this version (v8)

**For children:** every question is now **read aloud automatically** (a 🗣 Voice button in each quiz turns it off, and 🔊 in the top bar mutes everything), and answers, results and the tour are spoken too.
Calmer, clearer screens: lettered answer buttons (A/B/C), a blinking mascot, smoother transitions, buddies to **unlock with stars** (never for sale, so nobody feels left out and nobody rushes for a prize).

**Questions:** the bank grew from 215 to **788**, with 30+ new topics (rhymes, patterns, community helpers, senses, time, money, safety, computers, health, geography, Nigerian history and civics, science and more). Ages 2–3 went from 28 to 94 questions.
Existing live databases receive the new questions automatically on the next deploy; teacher-edited and teacher-made questions are never touched.

**Classes, homework and leaderboards (teachers):**
1. A teacher signs up with the **"I'm a teacher"** box (or taps *Ask for teacher access* in Grown-ups). Add their email to `TEACHER_EMAILS` on Render to approve them instantly, or approve them in **Admin dashboard → People**.
2. In the **teacher area** they make a class (age group), get a 6-letter **class code**, and share it with parents (one tap to WhatsApp).
3. A **parent** enters the code under Grown-ups → *Join your child's class* (that is the consent). They can hide their child from the leaderboard or leave at any time.
4. The teacher sets **homework / exercise / quiz**: pick random questions from the question bank, write their own, or both, with an optional due date.
5. Children see a 📚 homework card on Home and a **Class** tab (with a red dot when something is due). Results (per child and per question, so teachers see what to re-teach) show in the teacher area.
6. The **class leaderboard** ranks stars earned this week or all time. Stars come from finishing quizzes, not speed. It shows first names and avatars of children in the same class only, never a school-wide or public board.

**Premium codes dashboard (you and people you add):** the **🛠 Admin dashboard** (Grown-ups → *For school staff*) has four tabs:
- **Overview:** the setup check and the ad performance numbers.
- **Codes:** make codes for 7 days up to a year (or any number of days), many at once, for one family or shareable by a class, with a label and an optional "use before" date. One tap sends a code on WhatsApp. Revoke any code. Parents enter it under *Upgrade → "Have a Premium code?"* and Premium starts at once; gifted time stacks with paid time so nothing is wasted.
- **People:** approve teachers, and **add "code staff"**: people (who must already have an account) who can make and revoke codes but see *only their own* codes and nothing else. Staff are limited to 50 codes at a time and 365 days; only you have no limit.
- **Content:** import and approve questions, review Cedar reports, and (when videos are on) add videos.
Codes are random, forgiving to type (`ced 6esz sp85` works), rate-limited against guessing, and every failure gives the same message so nobody can probe for real codes.

**School website:** a new **Learning app section** on the home page with a phone preview, a dismissible "New: free daily quiz app" bar on every page, footer links, hover polish and visible keyboard-focus outlines.

### Why Google sign-in doesn't show yet
The button is built into the sign-up and log-in screens (now placed **first**, right under the parent-consent tick), but Google only shows it once the server has your **Google Client ID**. Until you add `GOOGLE_CLIENT_ID` on Render (steps in the Google section above), the app hides it so visitors never see a button that can't work. After you add it and redeploy, it appears automatically.

### What I learned from other children's apps, and what I applied
Looking at Khan Academy Kids, ABCmouse, Duolingo ABC and similar apps and parent reviews: the ones parents trust are **ad-free, calm, and focused**, with a friendly character, short lessons, instant kind feedback, audio for pre-readers, and a parent dashboard. The common complaints are busy screens, reward loops that make children rush, and in-app "shops" that make non-paying children feel left out.
So I added what is proven and simple (voice, mascot, earned buddies, parent insights, class homework) and deliberately did **not** add a store, coins, timers, or pop-ups. Everything new reuses the same screens and the same data, so there is little extra to maintain.

### New things to set on Render (all optional)
- `TEACHER_EMAILS` = comma-separated emails of teachers to approve automatically.
- New tables and columns are created automatically on the next start; nothing to run by hand.

## 📣 Running ads: what to send people to, and what to fix first

**Send ad traffic to the landing page, not the app:**

`https://www.cedarvilleprivateschool.com/learn.html?utm_source=facebook&utm_medium=paid&utm_campaign=YOUR-AD-NAME`

Change `utm_source` (facebook, instagram, tiktok, google, whatsapp) and `utm_campaign` (a short name for each ad, letters/numbers/dashes) on every ad.
The page is fast and static, previews nicely when shared (it has a share image), and asks "How old is your child?". The parent plays a
free 5-question quiz with **no sign-up**, sees their score, and is then invited to create a free account. The ad tag follows them all the way
to sign-up, and the age they picked is pre-filled for their child.

**See what's working:** log in with your `ADMIN_EMAILS` account → 🔒 Grown-ups → *Teacher tools* → **📈 Ad performance**. It shows the funnel
(saw page → played the free quiz → signed up → added a child → played → started checkout → paid), money in, and a table per ad.
Type what you've spent and it works out **cost per sign-up** and **cost per paying family**. It counts only things that really
happened (from the database), uses no cookies and no third-party trackers, and the privacy policy already says so.

### Fix these BEFORE you spend money (they decide whether ads pay back)

1. **Upgrade the Render instance** (Starter, about $7/month). On the free plan the API sleeps and the first request can take ~50 seconds,
   which is exactly when a parent from an ad taps "Create account". (The landing page wakes the server while the parent reads, which helps, but it isn't enough.)
2. **Turn on Paystack and test a real payment** with your live key. Until then the upgrade page offers "Subscribe via WhatsApp" (still works, but is manual).
   Run a test payment yourself on a phone, over mobile data.
3. **Add videos.** Only one starter video is included, and the app has a *Watch & Learn* tab. Ad copy and landing page therefore do not promise videos.
   Add 10–20 teacher-approved ones (Teacher tools → Add a video) before you advertise them.
4. **Grow the question bank**, especially ages 2–3, which has only 28 questions, so a child sees repeats within days. Use the admin tool that asks the
   AI to *draft* questions (they stay hidden until a teacher approves them). Retention is what makes a paying customer, not just a signup.
5. **Do the full journey on a real phone** (mobile data, not Wi-Fi): ad link → quiz → sign-up → add child → daily quiz → pay.

### Ad rules to keep you safe
- **Target parents (18+), never children.** Ad platforms don't allow targeting under-13s, and the app is built so the parent is the customer.
- **Only claim what's true.** The landing page says: no ads, no chat with strangers, read aloud, parent-controlled, free to start. Don't add
  claims like "improves exam scores" or "Cambridge-approved" unless you can prove them.
- **Don't paste ad pixels into the app.** A Meta/TikTok/Google tag can go on `learn.html` (the parent page) with a cookie-consent notice,
  but never inside the children's area. If you want the ad platforms to optimise for *purchases*, the proper next step is server-side
  conversion reporting; ask me when you're ready.
- Use your own photos of children only with written parental consent.
- Start small: run 2–3 different ads for 3–5 days on a small daily budget, then compare **cost per sign-up** in Teacher tools and put more money behind the winner.

## ✅ Your Render environment: reviewed from your screenshot

What I can see is **correct**: `APP_ENV=production`, `APP_DEBUG=false`, `CONTENT_CACHE_SECONDS=300`, `RATE_LIMIT_PER_MINUTE=30`,
`CORS_ORIGINS` (both `https://www.cedarvilleprivateschool.com` and `https://cedarvilleprivateschool.com`, the code trims spaces) and
`APP_URL=https://www.cedarvilleprivateschool.com/app/`. Three values are hidden, so check them with the 👁 eye icon:
- `SECRET_KEY`: at least 32 random characters (not a word like "secret").
- `DATABASE_URL`: starts with `postgresql://` and ends with `?sslmode=require` (copied from Neon → Connect).
- `ADMIN_EMAILS`: exactly the email you sign up with, in lower case, no spaces.

**Not needed yet (leave them out):** `PAYSTACK_SECRET_KEY` (add when you test payments), `GOOGLE_CLIENT_ID` (add when Google sign-in is set up),
`ANTHROPIC_API_KEY` (Cedar stays hidden without it), `ENABLE_VIDEOS` (default is off, which is what you want).
Click **Save, rebuild and deploy**, then open `https://cedarville.onrender.com/api/health`. It should say `"status":"ok"` and `"database":true`.
After you sign up with your admin email: Grown-ups → Teacher tools → **Run setup check** shows what is and isn't connected.

## 🌐 Vercel and Namecheap DNS: you do not need Vercel

Your website stays on **GitHub Pages** and the API on **Render**. The app calls Render directly (`PROD_API` in `site/app/config.js`), so
**nothing changes in Namecheap and you don't need Vercel at all.** Skip it: attaching your domain to Vercel would mean replacing the
DNS records that point your school website at GitHub, which risks taking the site down for no benefit.

*Optional, later:* a nicer API address such as `api.cedarvilleprivateschool.com`. In Render → your service → **Settings → Custom Domains** add it;
Render shows the exact record. In Namecheap → Domain List → **Manage → Advanced DNS** add a **CNAME** record, Host `api`, Value `cedarville.onrender.com`
(leave every other record alone, especially the ones for email). Then change `PROD_API` in `site/app/config.js` to
`https://api.cedarvilleprivateschool.com/api`. The app's security policy already allows this address.

## 🎬 Videos: switched OFF (good call)

Videos are now off by default: the Watch tab, tile, tour step, prices table and landing page all hide it, and the server returns no videos.
It stays off until you set `ENABLE_VIDEOS=true` in Render. Why this is the right call: a video on YouTube belongs to its creator,
embedding doesn't give you the right to build a paid product around it, and YouTube's and Google Play's rules for children's apps add more
conditions. I'm not your lawyer, so have the school confirm before you turn it on. Safe ways to bring videos back:
1. **Videos the school makes** (teachers record short lessons) and uploads to the school's own YouTube channel, marked "made for kids".
2. **Written permission** from the creator to show their video in your app.
3. **Openly licensed** videos (check the licence and give credit).
Turn on `ENABLE_VIDEOS` only when every video in the list is one of these.

## 🤖 About AI: why not Gemini, and what to do instead

I checked Google's current terms. **Gemini API terms (effective March 23, 2026) say you must not use the Services in an app "directed towards or
likely to be accessed by individuals under the age of 18."** A children's learning app is exactly that, free tier or paid. The free tier also lets
Google use prompts and responses to improve its products, with human reviewers. So I did **not** connect Gemini to the app, even though a free key is
tempting: it could get your Google account suspended later, and it would send children's messages into Google's training pipeline.

**What the app does now:** Cedar is **hidden from children** until an AI key exists, so there is no "napping owl" and no cost. The quiz, stars,
streaks and parent tools work fully without AI.

**When you want Cedar:** Anthropic's API (Claude) is pay-as-you-go (no free plan to rely on) and *does* allow apps for minors if you
add safeguards. Their guidelines (updated March 16, 2026) ask for: age gating, content filtering, a monitoring and reporting channel, telling users it is an
AI, and stating child-privacy compliance publicly. The app already has all of these:
- **Parent-held accounts** (children never sign up).
- **A safety filter** that stops unsuitable or self-harm wording *before* it reaches the AI and answers kindly. Self-harm wording is marked URGENT for staff.
- **Reply checks:** links, emails and phone numbers are stripped; replies are capped at a few sentences; the AI is told to stay on learning topics.
- **A 🚩 report button** on every reply, and Teacher tools → **🚩 Cedar reports** where staff review and clear them. *Please check it regularly*, and act on URGENT items the same day.
- **A permanent "Cedar is a computer helper (AI)" notice** in the chat, and an updated privacy policy (`site/app/privacy.html`) that says so.
The filter is a basic safety net, not a guarantee. Get the privacy policy reviewed (Nigeria Data Protection Act) before you launch Cedar.
Cost stays small and capped: 3 free questions a day per child, 20 for Premium. Check Anthropic's pricing page for the current rate before you switch it on.
To switch on: console.anthropic.com → API keys → add credit → copy the key → Render → `ANTHROPIC_API_KEY` → deploy. Cedar then appears everywhere automatically.

**Free way to grow content without any API:** Teacher tools → *📝 Questions: import and review*. Use any AI chat on your own account (or your teachers' ideas),
paste the JSON, and approve the good drafts. Children never see a draft. That adds questions for ages 2–3, which need it most.

## 🔧 Render deploy shows "Failed"? Do this first

**Cause (reproduced):** the API refuses to start in production until it has a secret login key. Your service was created by
hand, so it has no environment variables yet. The log line to look for (Render → your service → **Logs**) is:
`STARTUP BLOCKED - fix these in Render > Environment ... SECRET_KEY is not set`. This is deliberate: it stops the live
site from ever running with a guessable key.

**Fix, in order (about 5 minutes):**
1. Render → your service `cedarville` → **Environment** → *Add Environment Variable*. Add at least:

| Key | Value |
|---|---|
| `SECRET_KEY` | a long random string. Make one with `openssl rand -hex 32` in your terminal, or use Render's *Generate* button |
| `DATABASE_URL` | Neon dashboard → your project → **Connect** → copy the `postgresql://…?sslmode=require` string |
| `ADMIN_EMAILS` | your own email address |
| `CORS_ORIGINS` | `https://www.cedarvilleprivateschool.com,https://cedarvilleprivateschool.com` |
| `APP_URL` | `https://www.cedarvilleprivateschool.com/app/` |

2. **Settings → Health Check Path** → `/api/health`.
3. **Manual Deploy → Deploy latest commit** (or "Clear build cache & deploy" if it still fails).
4. Open `https://cedarville.onrender.com/api/health`. You should see `"status":"ok"` and `"database":true`.
   (Free instances sleep when idle, so the first visit can take ~50 seconds.)

If it still fails, open **Logs** and send me the last 15 lines. The build step itself was checked: a clean install of
`requirements.txt` works on the same Python version Render uses.

## Google sign-in — what to set up (10 minutes, free)

The app already has the "Continue with Google" button. It appears automatically once the backend knows your Google Client ID.
1. Go to **console.cloud.google.com** → create a project (e.g. "Cedarville Learning").
2. **APIs & Services → OAuth consent screen** → *External* → app name `Cedarville Learning`, support email, your logo,
   privacy-policy link `https://www.cedarvilleprivateschool.com/app/privacy.html`, authorised domain
   `cedarvilleprivateschool.com`. Scopes: only the defaults (email, profile, openid), so no Google review is needed. Publish the app (*In production*).
3. **Credentials → Create credentials → OAuth client ID → Web application.**
   **Authorised JavaScript origins** (no redirect URIs needed):
   `https://www.cedarvilleprivateschool.com`, `https://cedarvilleprivateschool.com`, `http://localhost:5000`
4. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) → Render → Environment → `GOOGLE_CLIENT_ID` → save (it redeploys).
5. Check: Grown-ups → Teacher tools → **Run setup check** shows ✅ Google sign-in.

Good to know: Google sign-up still asks the parent to tick the "I'm a parent/guardian 18+" box. If someone already made a password
account with the same email, signing in with Google switches that account to Google-only and logs out its old sessions (this blocks
a stranger who registered someone else's email first). Google's button does **not** work inside the Android app wrapper (Google
blocks it in embedded web views); the Play Store version will need Google's native sign-in plugin. The website and the installed
home-screen app work normally.

## Free vs Premium — how the money side works

| | Free | Premium |
|---|---|---|
| Daily quiz, stars, streaks, stickers | ✅ always | ✅ |
| Practice | 1 round/day, 5 questions, Letters / Numbers / Colours / Maths | Unlimited, up to 10 questions, every subject |
| Videos | starter (non-Premium) videos | all |
| Cedar the Owl | 3 questions/day (a taste) | 20/day |
| Parent insights | stars this week | + strengths and "practise next" per subject |
| Children | 1 | up to 5 |

The daily quiz is deliberately never locked: it builds the daily habit, and the limits above are where families feel the difference.
Every number is a setting, so you can tune it without touching code: `FREE_PRACTICE_PER_DAY`, `FREE_SUBJECTS`,
`FREE_AI_PER_DAY`, `FREE_MAX_CHILDREN` (Render → Environment). Prices: `backend/app/plans.py` (placeholders: ₦2,000 / month,
₦5,000 / term, ₦15,000 / year). To make a video Premium-only, tick *Premium only* when you add it in Teacher tools.

**Turning on Paystack** (it is already built; it only needs keys):
1. paystack.com → create/verify your business → **Settings → API Keys** → copy the **test** secret key (`sk_test_…`).
2. Render → Environment → `PAYSTACK_SECRET_KEY`.
3. Paystack → Settings → **API Keys & Webhooks** → Webhook URL: `https://cedarville.onrender.com/api/payments/webhook`.
4. Test with Paystack's test card in the Grown-ups area (Premium switches on and shows an end date). Then swap in your **live** key.
Each payment adds time to Premium (renewing early never wastes days). It does **not** charge automatically; parents renew when it
ends, and a reminder shows in the Grown-ups area during the last 7 days. Automatic renewal would need Paystack "Plans" and is a good
next step once you see how many families pay.

## Guided tour

New children get a 9-step spotlight tour on first visit (quiz → practice → videos → Cedar → stars → grown-ups lock → Free vs
Premium). It runs once per child, and **🧭 Take the tour** on the home screen replays it. Parents and visitors can also open
**Free vs Premium** (`/app/#/plans`) before signing up; it is linked from the sign-in page. For classroom tablets that should never
show the tour, run `localStorage.setItem('cedar_tour_off','1')` once in that browser.

## Connect everything — checklist (what to add, and how to confirm it works)

> **Database = Neon, not Supabase.** This project talks to Neon (plain Postgres). You do **not** need Supabase,
> and nothing here uses a Supabase key.

| # | Add this | Where | How to get it |
|---|---|---|---|
| 1 | `DATABASE_URL` | Render → your service → Environment | Neon dashboard → *Connection details* → copy the `postgresql://…?sslmode=require` string |
| 2 | `SECRET_KEY` | Render (the Blueprint generates it) | or run `openssl rand -hex 32` |
| 3 | `ADMIN_EMAILS` | Render | your own email — that account sees *Teacher tools* |
| 4 | `CORS_ORIGINS` | Render | `https://www.cedarvilleprivateschool.com,https://cedarvilleprivateschool.com` |
| 5 | `APP_URL` | Render | `https://www.cedarvilleprivateschool.com/app/` |
| 6 | `PAYSTACK_SECRET_KEY` | Render | Paystack → Settings → API Keys (start with the **test** key `sk_test_…`) |
| 7 | Paystack webhook URL | Paystack dashboard | `https://<your-render-address>/api/payments/webhook` |
| 8 | `ANTHROPIC_API_KEY` | Render | console.anthropic.com → API keys (powers Cedar the Owl) |
| 9 | `GOOGLE_CLIENT_ID` | Render | Google Cloud Console (see the Google section above) |
| 10 | `PROD_API` | `site/app/config.js` (top of file) | your Render address + `/api` — already set to `https://cedarville.onrender.com/api` |

**Confirm each link works**
1. **API is alive:** open `https://cedarville.onrender.com/api/health` — it should say `"status":"ok"` and `"database":true`.
2. **Everything else:** sign up on the website's Learning Portal with the `ADMIN_EMAILS` address, add a child, open
   🔒 *Grown-ups area* → *Teacher tools* → **✅ Run setup check**. It shows a green tick or a red cross with the fix for:
   database (is it really Neon?), secret key, admin email, CORS, payment return address, Paystack key, AI key.
3. **Neon itself:** Neon dashboard → *SQL Editor* → `select count(*) from question;` should return **215**.
4. **Website → API:** on the live site open the Learning Portal; if sign-up says "No internet right now", `PROD_API`
   in `config.js` is wrong or `CORS_ORIGINS` is missing your website address.

**Navigation (what the website now has)**
- A yellow **🎓 Learning Portal** button in the navbar of every page.
- A **More ▾** menu holding Gallery, Blog, FAQ, Contact, Learning Hub and **📲 Install the app**.
- An install page at `/app/#/install` with Android and iPhone steps (and an Install button when the browser allows it).

**Your site is served from the repo ROOT (GitHub Pages), not from `site/`.** `site/` is the copy we edit; the root is the copy
visitors see. After any change inside `site/`, run this once from the repo folder, then commit and push:

```bash
bash sync-site.sh
```

It copies the pages, `css/`, `js/`, `images/`, `data/` and `app/` from `site/` to the root. (Version 4 of the zip already
includes the synced root, so you only need `sync-site.sh` for future edits.) After the push, GitHub Pages takes 1–2
minutes to update; do a hard refresh (Ctrl+Shift+R). The app is then at `https://www.cedarvilleprivateschool.com/app/`
(the older `/site/app/` address keeps working too).

## Updating an existing `cedarville-main` folder (merge commands)

Run these on your Linux machine. They keep a backup, show you what would change first, then merge. Nothing in
your folder is deleted — files are only added or overwritten. (Tested on a fresh copy of your original zip: 0 files lost, 20 updated.)

```bash
# 0. go to the folder that CONTAINS cedarville-main, e.g.
cd ~/projects

# 1. back it up (skip if the folder is already in git: use `git status` / `git diff` instead)
cp -a cedarville-main "cedarville-main.backup-$(date +%F)"

# 2. unzip the new version into a temporary folder
rm -rf /tmp/cedar-new && mkdir /tmp/cedar-new
unzip -q ~/Downloads/cedarville-learning-v8.zip -d /tmp/cedar-new

# 3. PREVIEW — lists files that differ or are new; changes nothing
diff -rq /tmp/cedar-new/cedarville-main cedarville-main | less

# 4. merge for real (adds new files, overwrites changed ones, deletes nothing)
cp -a /tmp/cedar-new/cedarville-main/. cedarville-main/

# 5. first run
cd cedarville-main/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q                                   # expect: 83 passed
cp -n .env.example .env                     # never overwrites an .env you already have
uvicorn app.main:app --reload --port 8000   # leave running

# in a second terminal:
cd ~/projects/cedarville-main/site && npm install && npm start
# open http://localhost:5000/app/
```

Notes:
- Existing site pages are overwritten by the merge (they only gained the 🎈 Kids Zone menu link). If you edited
  `site/*.html` yourself since you sent me the zip, use the dry run (step 3) and merge those by hand, or compare
  with `diff -ru cedarville-main.backup-*/site cedarville-main/site`.
- If you already ran version 1 and have a local database, delete it once (`rm backend/var/app.db`) — v2 adds one
  column. For a fresh Neon database there is nothing to do.
- `mobile/`, `render.yaml` and `LAUNCH-GUIDE.md` are new files at the top level.

## What changed in v2

**Security**
- Login lockout: 5 wrong passwords on one email locks it for 15 minutes (works even when many families share one network).
- Wrong-email and wrong-password logins take the same time, so attackers can't discover which emails exist.
- Weak-password check (too short, common passwords, same as email) with friendly messages.
- Change password (logs out every other device) and **Delete my account** (erases children, progress and subscription; payment records stay without personal details) — in the Grown-ups area.
- Strict Content-Security-Policy on the app (no inline scripts; only your own code, Google Fonts and the YouTube privacy player may load), plus `no-store` caching and `Permissions-Policy` / HSTS headers on the API.
- Child names/avatars are validated on the server (avatar from a fixed list, no HTML characters).
- The API now trusts the proxy's real-visitor-IP header on Render so rate limits count each visitor, not Render.
- Tokens are strictly verified (must contain expiry, subject and issue time); tampered tokens are rejected.

**UI**
- Sticker board (8 collectable stickers for stars and daily streaks).
- Gentle "wiggle break" card after 15 minutes of play.
- Show/hide password, "Add to home screen" button, forgot-password contact line.
- Star pop on correct answers, better small-phone layout, screen-reader focus handling.

**Tests:** 83 backend tests (7 new for security) and a full browser walk-through including password change, account deletion and the break card, with zero CSP violations.

**Still to do (not in this release):** self-service password reset by email (needs an email service such as Resend or
Brevo), Alembic migrations, and a live Neon/Paystack/AI test with your real keys. If you change your API domain,
also update `connect-src` in the `<meta http-equiv="Content-Security-Policy">` line of `site/app/index.html`.

## Your questions, answered

**"Neon or Supabase?" → Neon.** You already have a Python backend that does its own login, so you only need a
database, and Neon is exactly that: plain PostgreSQL, free tier, no extra auth system to fight. Supabase would
add a second login system you don't need. Paste Neon's connection string into `DATABASE_URL` — nothing else changes.

**"Render and Vercel?" → Yes.** Render runs the Python backend; Vercel serves the website and the kids' app.
(The Vercel config proxies `/api` to the backend, so the browser only ever talks to one address.)

**Domain:** the config assumes `repurposekey.com` serves the site and app, and `api.repurposekey.com` is the
API. If you instead keep `cedarvilleprivateschool.com` for the site, change the three places listed in step 5.

**Does it need a "full stack" rewrite?** No. The existing site stays plain HTML/JS; the new app is plain JS
too, so nothing needs a build step. That is also what makes the Android wrapper easy.

## Run it on your computer

```bash
# 1. backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # optional: fill in keys later
uvicorn app.main:app --reload --port 8000

# 2. website + app (new terminal)
cd site && npm install && npm start
# open http://localhost:5000/app/
```

Or run both with `./dev.sh`. API docs: http://localhost:8000/api/docs. Tests: `cd backend && pytest` (83 tests).
With no `DATABASE_URL` it uses a local SQLite file, so you can try everything immediately.

Free-plan limits (1 child, 1 practice round a day) and Premium unlocks work locally too. To test Premium
without paying, set `PAYSTACK_SECRET_KEY` to a Paystack **test** key and use Paystack's test cards.

## Go live — in this order

1. **Neon** (neon.tech): create a project, copy the connection string.
2. **GitHub**: push this repo (the `.gitignore` already keeps secrets out).
3. **Render**: *New → Blueprint* → pick the repo (it reads `render.yaml`). Paste `DATABASE_URL`,
   `ADMIN_EMAILS` (your email) and, later, the Paystack and Anthropic keys. `SECRET_KEY` is generated for you.
   Check `https://<service>.onrender.com/api/health` shows `"database": true`.
   The free Render plan sleeps when idle (first request after a pause takes ~30–50 s); the $7 Starter plan doesn't.
4. ~~**Vercel**~~ Not needed (see the Vercel section above).
5. **Domain**: add `repurposekey.com` to Vercel and `api.repurposekey.com` to Render (each shows the DNS records
   to add). Then make these match your real addresses:
   - `site/vercel.json` → the `destination` of the `/api` rewrite
   - `site/app/config.js` → `NATIVE_API_BASE`
   - `render.yaml` → `CORS_ORIGINS` and `APP_URL`
6. **Paystack**: create an account, put the **secret key** in Render, and set the webhook URL in the Paystack
   dashboard to `https://api.repurposekey.com/api/payments/webhook`. Prices are placeholders in
   `backend/app/plans.py` — set what the school wants.
7. **AI (Cedar)**: add `ANTHROPIC_API_KEY` in Render. Without it, Cedar replies with a friendly "napping"
   message instead of failing.
8. **Videos**: log in with your admin email → 🔒 Grown-ups → *Teacher tools* → paste a YouTube link. Watch each
   video first; some creators block embedding, in which case the player shows a "Grown-ups: open on YouTube" link.

## Safety choices built in

- Only **parents** have accounts; children are profiles (first name, age, avatar). No child email, no chat between users, no ads.
- Quiz answers never reach the browser before the child answers; scoring is checked on the server.
- Cedar (AI): Premium-only, short answers, learning topics only, 20 messages/child/day, phone numbers and emails are stripped, and the child's name is never sent. If the AI is down it falls back gracefully.
- AI-drafted quiz questions (admin only) stay hidden until a teacher approves them.
- Payments: the Paystack webhook is signature-checked, amount-checked and safe to receive twice. Card details never touch your server.
- The grown-ups area sits behind a maths question so a child can't wander into payments.

## Honest limits — things to know before launch

- **Videos:** only one starter video is included. I couldn't verify other YouTube IDs from here, and wrong IDs
  would show broken players to children. Add your own through the admin form (step 8).
- **Prices, privacy policy and legal text are drafts.** `site/app/privacy.html` needs review against the Nigeria
  Data Protection Act and Google Play's Families Policy before publishing. Nothing here is legal advice.
- **Database migrations:** tables are created automatically on startup. That is fine now; before you change the
  schema on a live database, add **Alembic** (as BACKEND-PLAN.md recommends) so you never lose data.
- **Tested here:** 83 backend tests (accounts, quizzes, anti-cheating, limits, webhook security, AI privacy,
  admin) and a full browser walk-through on a phone-sized screen. **Not tested here:** a live Neon database
  (the connection code is standard SQLAlchemy/psycopg, but run `/api/health` after deploying), real Paystack
  payments, real AI replies, and the Android build (needs Android Studio on your machine).
- **Google Play and payments:** Play generally requires Google Play Billing for in-app subscriptions. See
  `mobile/README.md` — the safest first launch is a free Android app with subscriptions taken on the website.
- **Content growth:** 215 questions is a starter set (fewest for ages 2–3). Teachers can add more with
  `POST /api/admin/questions`, or have the AI draft some (`/api/admin/questions/generate`) and approve the good ones.
- **Android icon:** the school logo is 150×150 px; Play Store needs a crisp 512×512 version.
