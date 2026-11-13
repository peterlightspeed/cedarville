"""Cedarville Schools API — application entry point.

Run locally:
    uvicorn app.main:app --reload --port 8000

Interactive docs: http://localhost:8000/api/docs
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from sqlmodel import Session

from app.api import admin, ai, auth, children, contact, content, health, learn, payments
from app.config import settings
from app.database import engine, init_db
from app.seed import seed_if_empty

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("cedarville")

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Content, contact, accounts, quizzes, videos, payments and the AI helper for Cedarville Learning. "
        "Content endpoints mirror the static JSON files the frontend already consumes."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,  # we use Bearer tokens, never cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["ETag", "X-Content-Source"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
    if settings.env == "production":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    # Account, child and payment data must never sit in a shared cache.
    path = request.url.path
    if not path.startswith("/api/health") and not path.endswith(".json") and request.method != "OPTIONS":
        response.headers.setdefault("Cache-Control", "no-store")
    return response


app.include_router(health.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
for r in (auth.router, children.router, learn.router, payments.router, ai.router, admin.router):
    app.include_router(r, prefix="/api")
# Content goes last: its `/{name}.json` catch-all must not shadow anything above.
app.include_router(content.router, prefix="/api")


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {
        "name": settings.app_name,
        "version": settings.version,
        "docs": "/api/docs",
        "health": "/api/health",
    }


@app.exception_handler(404)
async def not_found(request: Request, exc) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"detail": "Not found", "path": request.url.path},
    )


@app.on_event("startup")
async def startup() -> None:
    log.info("Starting %s v%s (%s)", settings.app_name, settings.version, settings.env)
    init_db()
    with Session(engine) as session:
        seed_if_empty(session)
    if settings.env == "production" and settings.secret_key.startswith("dev-only"):
        raise RuntimeError("SECRET_KEY must be set in production (openssl rand -hex 32).")
    log.info("Content directory: %s", settings.content_dir)
    if not settings.content_dir.is_dir():
        log.warning("Content directory does not exist — content endpoints will 404")
    log.info("CORS origins: %s", ", ".join(settings.cors_origins))
