# Cedarville Private Schools — Website + API

Monorepo for the Cedarville Private Schools platform.

| Folder | What it is | Runs on |
|---|---|---|
| [`site/`](site/) | The public website — static HTML/CSS/JS, content in JSON | Node + Express, port 5000 |
| [`backend/`](backend/) | FastAPI service — CMS content, contact form, and the base for accounts, quizzes, AI and payments | Python 3.11+, port 8000 |

The website works on its own. The API is optional, and the frontend falls back to
the static `site/data/*.json` files whenever the API is unreachable — so you can
deploy either half first without breaking anything.

---

## Run both locally

**Terminal 1 — API**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — website**

```bash
cd site
npm install
npm start
```

Open <http://localhost:5000>. The site's Express server proxies `/api/*` to the
API, so there is one origin and no CORS to configure.

Or use the helper script:

```bash
./dev.sh
```

---

## How the two halves connect

```
browser ──► :5000  Express (static files + /api proxy) ──► :8000  FastAPI
                        │                                      │
                        └── site/data/*.json (fallback) ◄──────┘
```

`site/js/config.js` holds a single line:

```js
window.CEDARVILLE_DATA_BASE = '/api';
```

Set it to `''` and the site ignores the API entirely. Set it to a full URL
(`https://api.cedarvilleschools.com/api`) when the API lives on its own host.

The API returns **the same JSON shapes as the static files**, which is why the
switch is invisible to the rest of the frontend.

---

## Deploying

**Website** — any static host (Cloudflare Pages, Netlify, Vercel). Upload the
contents of `site/`. Keep `server.js` only if your host runs Node; otherwise the
clean URLs need rewriting at the host level (each route maps to its `.html` file,
listed in `site/server.js`).

**API** — Docker on Render or Railway:

```bash
docker build -f backend/Dockerfile -t cedarville-api .
```

Build from the repo root, because the image bakes in `site/data` as its content
directory. Set `CORS_ORIGINS` to your real frontend origin.

Full architecture, hosting steps and launch checklist: [`BACKEND-PLAN.md`](BACKEND-PLAN.md).

---

## Roadmap

- [x] Static site with JSON-driven content
- [x] FastAPI content API + contact endpoint, with frontend fallback
- [ ] PostgreSQL + Alembic; move content into tables
- [ ] Student and parent accounts
- [ ] Quizzes
- [ ] Admin UI (`sqladmin`)
- [ ] Paystack subscriptions and entitlements
- [ ] AI study assistant (`pgvector` retrieval)

---

## Licence

Private project for Cedarville Private Schools, Aguda, Surulere, Lagos.
