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
unzip -q ~/Downloads/cedarville-learning-v2.zip -d /tmp/cedar-new

# 3. PREVIEW — lists files that differ or are new; changes nothing
diff -rq /tmp/cedar-new/cedarville-main cedarville-main | less

# 4. merge for real (adds new files, overwrites changed ones, deletes nothing)
cp -a /tmp/cedar-new/cedarville-main/. cedarville-main/

# 5. first run
cd cedarville-main/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q                                   # expect: 32 passed
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

**Tests:** 32 backend tests (7 new for security) and a full browser walk-through including password change, account deletion and the break card, with zero CSP violations.

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

Or run both with `./dev.sh`. API docs: http://localhost:8000/api/docs. Tests: `cd backend && pytest` (32 tests).
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
4. **Vercel**: import the repo, set **Root Directory = `site`**. Deploy.
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
- **Tested here:** 32 backend tests (accounts, quizzes, anti-cheating, limits, webhook security, AI privacy,
  admin) and a full browser walk-through on a phone-sized screen. **Not tested here:** a live Neon database
  (the connection code is standard SQLAlchemy/psycopg, but run `/api/health` after deploying), real Paystack
  payments, real AI replies, and the Android build (needs Android Studio on your machine).
- **Google Play and payments:** Play generally requires Google Play Billing for in-app subscriptions. See
  `mobile/README.md` — the safest first launch is a free Android app with subscriptions taken on the website.
- **Content growth:** 215 questions is a starter set (fewest for ages 2–3). Teachers can add more with
  `POST /api/admin/questions`, or have the AI draft some (`/api/admin/questions/generate`) and approve the good ones.
- **Android icon:** the school logo is 150×150 px; Play Store needs a crisp 512×512 version.
