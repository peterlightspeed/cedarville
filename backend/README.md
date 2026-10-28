# Cedarville Schools — API

FastAPI service that backs the Cedarville Schools website and will grow into the
learning platform (accounts, quizzes, AI assistant, subscriptions).

**Phase 1 (what exists today):** serves the site's CMS content and the contact
form, so the frontend can switch from static JSON to a real backend with a
one-line change and no visual difference.

---

## Run it locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# optional: copy and edit
cp .env.example .env

uvicorn app.main:app --reload --port 8000
```

- API docs: <http://localhost:8000/api/docs>
- Health: <http://localhost:8000/api/health>

Then start the frontend in a second terminal:

```bash
cd site
npm install
npm start          # http://localhost:5000
```

`site/server.js` proxies `/api/*` to `http://127.0.0.1:8000`, so the browser only
ever talks to one origin and CORS never comes into play.

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness + content directory check |
| GET | `/api/{name}.json` | Content in its original file shape |
| GET | `/api/content/{name}` | Same, without the `.json` suffix |
| GET | `/api/content` | List available content documents |
| POST | `/api/contact` | Contact form submission (JSON) |
| GET | `/api/docs` | Interactive OpenAPI documentation |

Valid `{name}` values: `site`, `faq`, `blog-posts`, `gallery`, `events`,
`testimonials`, `chatbot-responses`.

### Example

```bash
curl http://localhost:8000/api/faq.json
curl -X POST http://localhost:8000/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","message":"Please send the fee schedule."}'
```

---

## How the frontend connects

`site/js/config.js` holds one line:

```js
window.CEDARVILLE_DATA_BASE = '/api';
```

`site/js/cms.js` reads that, tries the API first, and **falls back to the static
`site/data/` folder** if the API is unreachable. That means the site never breaks
when the backend is down or not yet deployed — it just serves the last committed
JSON instead.

To run entirely without a backend, set it to `''`.

---

## Configuration

All settings are environment variables (see `.env.example`). Nothing secret is
committed. Key ones:

| Variable | Default | Notes |
|---|---|---|
| `CONTENT_DIR` | `../site/data` | Where the JSON lives |
| `CORS_ORIGINS` | localhost origins | Exact origins, comma-separated |
| `CONTENT_CACHE_SECONDS` | `300` | Browser/CDN cache lifetime |
| `RATE_LIMIT_PER_MINUTE` | `30` | Contact form, per IP |
| `SUBMISSIONS_FILE` | `var/submissions.jsonl` | Append-only store |

---

## Docker

Build from the **repo root** (the Dockerfile needs `site/data`):

```bash
docker build -f backend/Dockerfile -t cedarville-api .
docker run -p 8000:8000 cedarville-api
```

Or with compose:

```bash
cd backend && docker compose up --build
```

---

## What comes next

The content endpoints are the seam. Everything else is additive and does not
change them:

1. **Postgres + Alembic** — move content from files into tables. Response shapes
   stay identical, so the frontend never notices.
2. **Auth** — student and parent accounts (JWT access + refresh, Argon2).
3. **Quizzes** — highest-value feature; needs no AI and no payments.
4. **Admin** — `sqladmin` over the same models, so the school self-serves content.
5. **Payments** — Paystack, webhook-driven entitlements.
6. **AI assistant** — `pgvector` retrieval over school content, behind an entitlement.

See `BACKEND-PLAN.md` at the repo root for the full architecture, hosting guide
and launch checklist.
