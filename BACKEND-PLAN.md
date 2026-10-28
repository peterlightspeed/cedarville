# Cedarville Schools — Python Backend & Hosting Plan

A practical path from the current static site to a real learning platform, built in phases so you are never blocked waiting for the whole thing to be finished.

---

## The one thing that makes this easy

Your frontend was already built for this. `js/cms.js` reads every piece of content through a single configurable base:

```js
const DATA_BASE = (window.CEDARVILLE_DATA_BASE
  || document.documentElement.getAttribute('data-api-base')
  || 'data');
```

Today that resolves to `data/`, so the browser fetches `data/site.json`, `data/faq.json`, `data/blog-posts.json` and so on. Change one attribute on the `<html>` tag to `data-api-base="/api"` and the exact same frontend starts talking to a Python server instead — with no other code changes, because the backend simply returns the same JSON shapes.

That is your migration strategy. Not a rewrite. A swap of the content source, then a gradual replacement of each endpoint behind it.

---

## 1) Recommended backend stack

### Framework: FastAPI

Use **FastAPI**. Not Django, not Flask.

The reasoning is specific to your situation. Your frontend is already a JavaScript app that consumes JSON over HTTP — it does not want server-rendered HTML. FastAPI is built for exactly that: you declare a function, annotate the types, and you get a validated JSON endpoint plus interactive documentation at `/docs` for free. Pydantic validates every request body before your code runs, so malformed quiz submissions or bad payment payloads get rejected with a clear error instead of crashing something deeper in.

It is also async by default, which matters more than it sounds. When a student asks the AI assistant a question, your server spends two to eight seconds waiting on an external model. In a synchronous framework that thread is blocked and cannot serve anyone else. With FastAPI, waiting is free — the server handles other requests while the model thinks. For a school where thirty students might hit the assistant during exam week, that difference is the whole ballgame.

And it is Python, so the AI libraries you will inevitably want — the OpenAI and Anthropic SDKs, `pgvector`, `tiktoken`, embedding utilities — are all first-class citizens rather than awkward guests.

**The honest counter-argument for Django:** Django ships with an admin panel. You get a working content management interface for free, which is genuinely attractive when the requirement is "the school should update content without touching code." If your priority were a heavy back-office and you did not want to build any admin UI, Django would be the pragmatic pick.

I still recommend FastAPI, because you can recover that advantage cheaply. `sqladmin` gives you a Django-style admin on top of SQLAlchemy in about thirty lines, and you keep the async API and the clean AI integration. You are not giving anything up that you cannot add back in an afternoon.

### Database: PostgreSQL

PostgreSQL, from day one. Use SQLite only on your own laptop for quick experiments.

The reason is not scale — you will not outgrow SQLite on traffic alone. The reason is that PostgreSQL has `pgvector`, a native extension for storing and searching embeddings. Your AI features need exactly that: semantic search over school documents. Starting on SQLite means a migration later at the worst possible time. Starting on Postgres means the AI feature is a `CREATE EXTENSION` away.

PostgreSQL also gives you real JSON columns (`JSONB`) with indexing, which is genuinely useful for CMS content where different page sections have different shapes. And every managed host offers it, so you are never locked in.

**ORM:** SQLModel — it is SQLAlchemy and Pydantic combined, written by the FastAPI author, so your database models and your API schemas are the same class. If you prefer the more established route, plain SQLAlchemy 2.0 with separate Pydantic schemas is equally fine and has more tutorials.

**Migrations:** Alembic. Non-negotiable. You will change your schema dozens of times; without migrations you will eventually lose data.

### Authentication: JWT with refresh tokens

Access tokens (short-lived, 15–30 minutes) plus refresh tokens (long-lived, stored in an `HttpOnly` cookie). Passwords hashed with **Argon2** via `passlib` or `pwdlib`.

Three roles: `student`, `parent`, `admin`. A parent is linked to one or more students. Teachers can be added later as a fourth role without restructuring anything, because roles live in the database, not in code.

If you want to skip writing auth yourself, **`fastapi-users`** is a mature library that handles registration, login, password reset, email verification and JWT in one package. For a school platform with real children's accounts, using a battle-tested library is the safer choice than hand-rolling.

### Storage: Cloudflare R2

School platforms accumulate images fast — gallery photos, blog headers, student avatars, worksheets, generated certificates. Do not store these on the application server's disk; that disk disappears when the container restarts and does not exist at all on most modern hosts.

Use **Cloudflare R2**. It speaks the S3 API, so the standard `boto3` client works unchanged, and critically it charges **nothing for egress** — bandwidth out is free. For a site serving photos to parents on Nigerian mobile data, that is the single most important line item. AWS S3 is the fallback if you need it, but you will pay for every gigabyte served.

In local development, write to a `./media` folder and serve it with `StaticFiles`. Keep the storage layer behind a small interface so switching is a config change.

### Deployment: Docker on Render or Railway

Containerise the app with a `Dockerfile`, then deploy to **Render** or **Railway**. Both give you a managed PostgreSQL instance, automatic HTTPS, environment variable management, and deploys triggered by `git push`. Both have free or near-free tiers to start.

This is the right level of abstraction for you. You get production-grade hosting without learning Kubernetes, and you can move the identical Docker image to AWS, GCP or a Nigerian VPS later without rewriting anything.

### What to deliberately skip for now

Do not add these until you feel the pain:

- **Redis** — only when you need rate limiting across multiple server instances, or caching AI responses.
- **Celery** — start with FastAPI's built-in `BackgroundTasks` for things like sending emails. Move to Celery or ARQ with Redis when you have jobs that must survive a restart.
- **Kubernetes** — you will not need it. A single container plus a managed database will carry you a very long way.
- **Microservices** — one application, one database, one deploy. Split later if ever.

---

## 2) Project structure

One repository, one deployable application, organised by feature. This layout keeps each concern in its own folder so a bug in payments never means reading quiz code.

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, middleware, router registration
│   ├── config.py                # Settings loaded from environment variables
│   ├── database.py              # Engine, session factory, base model
│   │
│   ├── core/
│   │   ├── security.py          # Password hashing, JWT create/verify
│   │   ├── deps.py              # get_db, get_current_user, require_admin
│   │   ├── permissions.py       # Role and entitlement checks
│   │   └── exceptions.py        # Consistent error responses
│   │
│   ├── models/                  # SQLModel / SQLAlchemy tables
│   │   ├── user.py              # User, Parent, Student
│   │   ├── content.py           # Page, Section, BlogPost, Faq, GalleryItem
│   │   ├── quiz.py              # Quiz, Question, Option, Attempt, Answer
│   │   ├── payment.py           # Plan, Subscription, Transaction, Entitlement
│   │   └── ai.py                # Conversation, Message, Document, Embedding
│   │
│   ├── schemas/                 # Pydantic request/response shapes
│   │   ├── auth.py
│   │   ├── content.py
│   │   ├── quiz.py
│   │   ├── payment.py
│   │   └── ai.py
│   │
│   ├── api/                     # HTTP layer — thin, delegates to services
│   │   ├── router.py            # Mounts every sub-router under /api
│   │   ├── auth.py              # /api/auth/*
│   │   ├── content.py           # /api/content/*  (CMS reads)
│   │   ├── legacy.py            # /api/site.json etc. — see section 4
│   │   ├── quizzes.py           # /api/quizzes/*
│   │   ├── ai.py                # /api/ai/*
│   │   ├── payments.py          # /api/payments/*
│   │   ├── students.py          # /api/students/*
│   │   └── admin.py             # /api/admin/*
│   │
│   ├── services/                # Business logic, framework-agnostic
│   │   ├── content_service.py
│   │   ├── quiz_service.py      # Grading, scoring, attempt rules
│   │   ├── ai_service.py        # Provider calls, prompts, RAG
│   │   ├── payment_service.py   # Paystack/Flutterwave, entitlements
│   │   ├── storage_service.py   # R2/S3 upload, signed URLs
│   │   └── email_service.py
│   │
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── base.py          # Abstract provider interface
│   │   │   ├── openai_provider.py
│   │   │   └── anthropic_provider.py
│   │   ├── prompts/             # Versioned prompt templates
│   │   ├── rag.py               # Chunking, embedding, retrieval
│   │   └── moderation.py        # Safety filters
│   │
│   └── admin_ui/                # SQLAdmin setup (see section 5)
│       └── views.py
│
├── alembic/                     # Migration scripts
│   └── versions/
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_quizzes.py
│   └── test_payments.py
├── scripts/
│   ├── seed_content.py          # Import existing data/*.json into the DB
│   └── create_admin.py
├── Dockerfile
├── docker-compose.yml           # Local: app + postgres
├── requirements.txt
├── .env.example
└── README.md
```

**Why this shape.** `api/` contains only HTTP concerns — parse the request, call a service, return a response. `services/` contains the actual logic and knows nothing about HTTP, which means you can test it directly and reuse it from a background job or a CLI script. `models/` and `schemas/` are separated because database shape and API shape genuinely differ — you never want to expose a hashed password column just because it exists on the table.

---

## 3) Hosting guide

### Step 1 — Get the database first

Provision managed PostgreSQL on Render or Railway. Never run Postgres inside your app container in production; you will lose data on redeploy.

Copy the connection string. It looks like:

```
postgresql://user:password@host:5432/dbname
```

Note that SQLAlchemy wants `postgresql+psycopg://` — add the driver prefix.

### Step 2 — Set environment variables

Never commit secrets. Every host has a dashboard for these, and locally they live in `.env` (gitignored).

```bash
# .env.example — commit this, commit nothing else
APP_ENV=production
SECRET_KEY=generate-with-openssl-rand-hex-32
DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
CORS_ORIGINS=https://cedarvilleschools.com,https://www.cedarvilleschools.com

# Storage
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_BUCKET=cedarville-media
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_PUBLIC_URL=https://media.cedarvilleschools.com

# AI
AI_PROVIDER=openai
AI_API_KEY=
AI_MODEL=gpt-4o-mini
AI_MONTHLY_TOKEN_BUDGET=2000000

# Payments
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
```

Generate the secret key properly:

```bash
openssl rand -hex 32
```

### Step 3 — Dockerise

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

That `alembic upgrade head` before starting is important — migrations run automatically on every deploy, so the database is never out of sync with the code.

### Step 4 — Deploy

On Render: create a **Web Service**, point it at your GitHub repo, choose Docker, add the environment variables, attach the Postgres instance. Every push to `main` redeploys.

On Railway: same idea, and it detects the `Dockerfile` automatically.

**Region matters for you.** Your users are in Lagos. Render offers Frankfurt; Railway offers EU West. Either gives roughly 100–150 ms latency to Nigeria, which is fine for API calls. Pick the closest region available and put Cloudflare in front of your domain — Cloudflare has points of presence in Lagos, so TLS termination and static caching happen locally.

### Step 5 — Domain and SSL

Point your domain at the host:

```
A     @              → <host-provided-IP>
CNAME www            → <your-service>.onrender.com
CNAME api            → <your-service>.onrender.com
CNAME media          → <r2-public-bucket-host>
```

Or use `api.cedarvilleschools.com` for the backend and keep the apex for the frontend. Either works; a subdomain keeps things tidy because you can point it elsewhere later.

**SSL is automatic** on Render, Railway, Cloudflare and Fly — they issue and renew Let's Encrypt certificates for you. Do not manage certificates by hand. If you terminate TLS at Cloudflare, set SSL mode to **Full (strict)**, never "Flexible" — Flexible sends traffic to your origin unencrypted and is a real security hole.

### Step 6 — Static and media files

Three categories, three different homes:

| Type | Where | Why |
|---|---|---|
| Frontend HTML/CSS/JS | Cloudflare Pages, Netlify, or your existing host | Free, global CDN, no server involved |
| Uploaded media (photos, worksheets) | Cloudflare R2 | Cheap, no egress fees, survives redeploys |
| Generated files (certificates, exports) | R2 with signed URLs | Access-controlled, expiring links |

Serve media from a subdomain like `media.cedarvilleschools.com` so browser caching and CDN rules apply cleanly and are independent of your API.

### Step 7 — Logs and monitoring

**Minimum viable, day one:**

- **Sentry** — free tier, catches exceptions with full stack traces and tells you which endpoint broke. Add it before launch; debugging production blind is miserable.
- **Host logs** — Render and Railway both stream stdout. Log structured JSON, not print statements.
- **UptimeRobot or Better Stack** — free, pings `/health` every minute and emails you when it fails.
- **`/health` endpoint** — must check the database, not just return 200.

```python
@app.get("/health")
async def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "version": settings.VERSION}
```

**Add later:** Prometheus metrics, Grafana dashboards, slow-query logging. Only when you have real traffic to interpret.

---

## 4) Frontend connection

### Phase 1 — Same JSON, new source (do this first)

The fastest, safest migration is to have FastAPI serve the *existing* JSON files unchanged. The frontend does not know the difference.

```python
# app/api/legacy.py
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter()
DATA_DIR = Path(__file__).resolve().parents[3] / "site" / "data"

ALLOWED = {"site", "faq", "blog-posts", "gallery", "events",
           "testimonials", "chatbot-responses"}

@router.get("/{name}.json")
async def legacy_json(name: str):
    if name not in ALLOWED:
        raise HTTPException(404)
    path = DATA_DIR / f"{name}.json"
    if not path.exists():
        raise HTTPException(404)
    return json.loads(path.read_text(encoding="utf-8"))
```

Then in each HTML file, change one attribute:

```html
<html lang="en" data-api-base="/api">
```

Or, if the API lives on a different origin:

```html
<script>window.CEDARVILLE_DATA_BASE = "https://api.cedarvilleschools.com/api";</script>
```

That is the entire frontend change. Every page now reads from Python. You can deploy this, confirm nothing broke, and then improve the backend at your own pace while the site stays up.

### Phase 2 — Move content into the database

Once the backend is serving, replace the file-reading handler with a database query, one endpoint at a time. The response shape stays identical, so the frontend never notices:

```python
@router.get("/faq.json")
async def faq_json(db: Session = Depends(get_db)):
    faqs = db.exec(
        select(Faq).where(Faq.published == True).order_by(Faq.sort_order)
    ).all()
    return {"faqs": [{"category": f.category,
                      "question": f.question,
                      "answer": f.answer} for f in faqs]}
```

Run `scripts/seed_content.py` once to import the existing JSON into Postgres, and you have migrated with zero downtime and zero frontend edits.

### Phase 3 — New endpoints for new features

Quizzes, accounts and AI get proper REST endpoints. The frontend calls them with `fetch`:

```js
// Login
const res = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',           // sends the refresh cookie
  body: JSON.stringify({ email, password })
});
const { access_token } = await res.json();

// Authenticated call
const quizzes = await fetch(`${API}/quizzes`, {
  headers: { Authorization: `Bearer ${access_token}` }
}).then(r => r.json());
```

### CORS — the one thing that will bite you

The frontend and API are on different origins, so the browser blocks cross-origin calls unless the API explicitly allows them.

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,   # exact origins, never "*" with credentials
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Two rules that save hours of confusion: `allow_origins=["*"]` and `allow_credentials=True` cannot be combined — browsers reject it. And list origins exactly, including `https://` and any `www` variant.

### API versioning

Mount everything under `/api/v1` from the start. It costs nothing now and means you can change response shapes later without breaking the mobile app you have not written yet.

---

## 5) CMS and admin plan

### Phase 1 — What you have now (keep it)

The JSON files in `data/` are already a legitimate CMS. Editing `data/faq.json` and pushing to git updates the site. For a school with a handful of content changes per term, this is genuinely sufficient, and it has real advantages: every change is versioned, reviewable, and revertible.

Do not rush past this. It works.

### Phase 2 — Database-backed content with an admin UI

When the school wants to edit without a developer, add `sqladmin`. It gives you a full CRUD interface at `/admin` over your SQLModel tables:

```python
from sqladmin import Admin, ModelView
from app.models.content import Faq, BlogPost, GalleryItem

class FaqAdmin(ModelView, model=Faq):
    column_list = [Faq.category, Faq.question, Faq.published]
    column_searchable_list = [Faq.question]

class BlogPostAdmin(ModelView, model=BlogPost):
    column_list = [BlogPost.title, BlogPost.published_at, BlogPost.published]

admin = Admin(app, engine)
admin.add_view(FaqAdmin)
admin.add_view(BlogPostAdmin)
admin.add_view(GalleryItemAdmin)
```

Protect it with the admin role, and it is done — a working back office in an afternoon.

### Phase 3 — A purpose-built admin, if needed

If the school finds `sqladmin` too technical, build a small admin page in your existing frontend style that calls `/api/admin/*`. The backend endpoints are the same either way; only the interface changes. This is where a rich text editor for blog posts and drag-to-reorder for gallery photos earns its keep.

### Content model that survives growth

```python
class Page(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True)      # "about", "admissions"
    title: str
    meta_description: str | None = None
    published: bool = False
    updated_at: datetime

class Section(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    page_id: int = Field(foreign_key="page.id")
    key: str                    # "hero", "story", "stats"
    content: dict = Field(sa_column=Column(JSONB))   # flexible per-section shape
    sort_order: int = 0
```

The `JSONB` content column is the key decision. Different sections genuinely hold different data — a hero has a heading and a background image, a stats block has an array of numbers. Forcing them into one rigid table would be a mistake. Postgres indexes JSONB efficiently, so you get flexibility without giving up query speed.

Add `published` and `updated_at` to everything, and you get draft/publish for free. Add a `revisions` table later if the school wants an undo history.

### Media handling

Uploads go to R2, never to the app server:

```python
@router.post("/admin/media")
async def upload(file: UploadFile, user=Depends(require_admin)):
    key = f"{uuid4()}.{file.filename.rsplit('.', 1)[-1]}"
    storage.put_object(Bucket=settings.S3_BUCKET, Key=key,
                       Body=await file.read(), ContentType=file.content_type)
    return {"url": f"{settings.S3_PUBLIC_URL}/{key}"}
```

Validate file type and size on the server. A 40 MB "photo" uploaded by mistake will otherwise sit in your bucket forever.

---

## 6) AI feature plan

### Build a provider abstraction on day one

Model providers change, prices change, and you will want to switch. Put every call behind one interface:

```python
# app/ai/providers/base.py
class AIProvider(Protocol):
    async def complete(self, messages: list[dict], *, json_schema: dict | None = None,
                       max_tokens: int = 1000) -> str: ...
    async def embed(self, texts: list[str]) -> list[list[float]]: ...
```

Then `OpenAIProvider` and `AnthropicProvider` implement it, and `AI_PROVIDER` in the environment selects one. Swapping models becomes a config change, not a refactor.

### Retrieval-augmented generation — the core pattern

Every AI feature you listed is the same architecture with a different prompt. Build it once.

1. **Ingest.** Take your school's real content — the FAQ JSON, blog posts, admissions policy, curriculum notes — split into chunks of a few hundred words, embed each chunk, and store the vectors in Postgres with `pgvector`.
2. **Retrieve.** When a question arrives, embed it, find the nearest chunks by cosine distance, and pull the top handful.
3. **Generate.** Send those chunks as context with a system prompt that says *answer only from this context; if the answer is not here, say so and point to the school office.*

This is what makes the assistant trustworthy. A general model will confidently invent a fee schedule. A RAG assistant grounded in your actual documents will say "I don't have that information, please call +234 813 745 1764."

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunk (
    id          BIGSERIAL PRIMARY KEY,
    source      TEXT,          -- 'faq.json', 'admissions-policy.pdf'
    content     TEXT,
    embedding   vector(1536)
);

CREATE INDEX ON document_chunk
    USING hnsw (embedding vector_cosine_ops);
```

### The five features, mapped

**Quiz generation.** Give the model a topic and a JSON schema, and require structured output. Validate the response with Pydantic before saving — models occasionally return malformed JSON, and you do not want that reaching a student.

```python
schema = {
  "type": "object",
  "properties": {
    "questions": {"type": "array", "items": {
      "type": "object",
      "properties": {
        "question": {"type": "string"},
        "options": {"type": "array", "items": {"type": "string"}},
        "correct_index": {"type": "integer"},
        "explanation": {"type": "string"}
      },
      "required": ["question", "options", "correct_index"]
    }}
  },
  "required": ["questions"]
}
```

Generate into a `draft` state and let a teacher approve before students see it. AI-generated questions are usually decent and occasionally wrong; a human review step costs little and protects the school's credibility.

**Question answering.** RAG over school content, as above. This is your existing rule-based chatbot upgraded — keep the rule-based one as a fallback when the AI is unavailable or over budget.

**Study assistance.** Same retrieval, different prompt: explain a concept at the student's level, using their grade. Store the conversation so a parent can review it.

**Content suggestions.** Admin-side only. "Draft a blog post about our sports day" or "suggest FAQ entries parents keep asking about." Low risk because a human edits before publishing.

**Future expansion.** Because retrieval and generation are separate layers, new features are mostly new prompts. Personalised revision plans, parent progress summaries, worksheet generation — all reuse the same pipeline.

### Cost and safety controls

- **Cache aggressively.** Identical questions should hit a cache, not the model. School questions repeat heavily.
- **Set a monthly token budget per user and globally.** Check it before every call and degrade gracefully to the rule-based chatbot when exceeded.
- **Rate limit** AI endpoints specifically — they are the expensive ones.
- **Never send student PII** to a provider. Strip names and identifiers; send only the academic content.
- **Moderate inputs and outputs.** A platform used by children needs this.
- **Run generation in the background** where possible. Quiz generation for a whole topic should not hold an HTTP connection open.

---

## 7) Payment plan

### Provider: Paystack, with Flutterwave as backup

You are in Nigeria. **Paystack** is the right primary choice — it handles cards, bank transfer, USSD and mobile money, settles in NGN, and has clean documentation. Flutterwave is a reasonable alternative and worth adding later for redundancy.

Add **Stripe** only if you expect significant diaspora payments in USD/GBP. Running two providers doubles your webhook surface, so do not do it until there is demand.

### The critical architectural rule

**The webhook is the source of truth. Never the redirect.**

When a parent pays, Paystack sends them back to your `callback_url`. That redirect can be faked, interrupted, or never arrive. The only trustworthy signal is the signed webhook from Paystack's servers to yours.

```python
@router.post("/payments/webhook")
async def paystack_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()

    # Verify the signature — reject anything unsigned
    expected = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode(), body, hashlib.sha512
    ).hexdigest()
    if not hmac.compare_digest(expected, request.headers.get("x-paystack-signature", "")):
        raise HTTPException(401)

    event = json.loads(body)
    if event["event"] == "charge.success":
        ref = event["data"]["reference"]
        # Idempotent: safe to receive twice
        activate_subscription(db, ref, event["data"])

    return {"status": "ok"}   # always 200, or Paystack retries
```

Three details that matter: verify the signature, make the handler **idempotent** (Paystack retries, so the same event may arrive more than once), and always return 200 quickly — do heavy work in a background task.

### Data model

```python
class Plan(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    code: str                   # "free", "premium_monthly", "premium_termly"
    name: str
    price_kobo: int             # store money in kobo, never floats
    interval: str               # "month", "term", "year"
    features: dict              # JSONB: {"quizzes": true, "ai": 50}
    active: bool = True

class Subscription(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    plan_id: int = Field(foreign_key="plan.id")
    status: str                 # active, past_due, cancelled, expired
    current_period_end: datetime
    provider: str = "paystack"
    provider_ref: str

class Transaction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    reference: str = Field(unique=True, index=True)   # idempotency key
    user_id: int
    amount_kobo: int
    status: str
    raw_payload: dict
```

**Store money as integers in kobo.** Floating point will eventually produce a ₦19,999.999999 and you will spend a day on it.

### Gating features

Express access as a dependency, so protecting an endpoint is one line:

```python
def require_entitlement(feature: str):
    async def checker(user=Depends(get_current_user), db=Depends(get_db)):
        if not has_entitlement(db, user.id, feature):
            raise HTTPException(402, "Upgrade required")
        return user
    return checker

@router.post("/ai/ask")
async def ask(body: AskRequest, user=Depends(require_entitlement("ai"))):
    ...
```

`has_entitlement` checks the user's active subscription and its `features` JSONB. Because entitlements are data, you can change what premium includes without touching code.

### Free versus premium

A sensible starting split: free accounts get the blog, gallery, and a small number of quiz attempts. Premium unlocks unlimited quizzes, the AI study assistant, and progress reports. Keep something genuinely useful free — parents evaluating a school should be able to see value before paying.

**Never store card details.** Paystack hosts the payment page; you only ever see a reference token. This keeps you out of PCI compliance scope entirely.

---

## 8) Deployment checklist

### Before you deploy

- [ ] `SECRET_KEY` generated with `openssl rand -hex 32`, stored in the host's env vars, never in git
- [ ] `.env` in `.gitignore`; `.env.example` committed with placeholder values only
- [ ] `APP_ENV=production` and debug mode off
- [ ] `CORS_ORIGINS` lists exact production origins — no wildcards
- [ ] Database is managed Postgres, not a container, with automated backups enabled
- [ ] `alembic upgrade head` runs on deploy
- [ ] `/health` endpoint checks the database, not just returns 200
- [ ] Sentry configured and a test error confirmed to appear

### Security

- [ ] Passwords hashed with Argon2 or bcrypt — verify by inspecting the database, not the code
- [ ] JWT access tokens short-lived; refresh tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies
- [ ] Rate limiting on `/auth/login` and all AI endpoints
- [ ] Every admin route behind `require_admin`
- [ ] Upload validation: file type, file size, and generated filenames (never trust `file.filename`)
- [ ] Payment webhook signature verified; handler idempotent
- [ ] No student PII sent to AI providers
- [ ] HTTPS enforced, HSTS on, Cloudflare SSL mode **Full (strict)**
- [ ] Dependency audit: `pip-audit` clean

### Data

- [ ] `scripts/seed_content.py` run to import existing `data/*.json`
- [ ] Admin user created via `scripts/create_admin.py` — not by inserting a row by hand
- [ ] Backups tested by actually restoring one
- [ ] `pgvector` extension enabled if AI features are live

### Frontend

- [ ] `data-api-base="/api/v1"` set on every HTML page
- [ ] All 10 pages load with content rendering (not fallback text)
- [ ] Login, logout and token refresh work end to end
- [ ] Tested on a real phone, not just a desktop browser resize
- [ ] 404 and error states handled gracefully when the API is down

### Operations

- [ ] Uptime monitor pinging `/health` every minute
- [ ] Logs structured and searchable
- [ ] Error alerting routed to an email someone actually reads
- [ ] Rollback plan: know how to redeploy the previous image
- [ ] Documented: where the domain is registered, who holds the Paystack account, where the database lives

---

## Summary

**Recommended stack**

| Layer | Choice |
|---|---|
| Framework | FastAPI |
| Database | PostgreSQL (managed) |
| ORM | SQLModel + Alembic |
| Auth | JWT access + refresh, Argon2, `fastapi-users` |
| Storage | Cloudflare R2 |
| Hosting | Docker on Render or Railway |
| AI | Provider abstraction + `pgvector` RAG |
| Payments | Paystack (Stripe later for diaspora) |
| Monitoring | Sentry + UptimeRobot |

**The fastest safe path to launch**

1. Deploy a FastAPI skeleton that serves your existing `data/*.json` unchanged at `/api`. Change `data-api-base` on the frontend. **The site is now backed by Python with no feature changes and no risk.**
2. Add Postgres, Alembic, and `scripts/seed_content.py`. Move content from files to tables one endpoint at a time. Shapes stay identical, so nothing breaks.
3. Add authentication and student accounts.
4. Add quizzes — the highest-value feature that needs no AI and no payments.
5. Add `sqladmin` so the school can edit content themselves.
6. Add Paystack and entitlement checks.
7. Add the AI assistant last, behind an entitlement, with the rule-based chatbot as fallback.

Each step is independently deployable and independently useful. If you stop after step 2, you still have a better system than you started with. If a step goes wrong, roll back one deploy and nothing else is affected.

The mistake to avoid is trying to launch all seven at once. Ship the seam first — it takes an afternoon and de-risks everything that follows.
