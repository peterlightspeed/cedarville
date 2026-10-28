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

from app.api import contact, content, health
from app.config import settings

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger("cedarville")

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Content, contact and (soon) learning endpoints for Cedarville Private Schools. "
        "Content endpoints mirror the static JSON files the frontend already consumes."
    ),
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
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
    return response


app.include_router(health.router, prefix="/api")
app.include_router(content.router, prefix="/api")
app.include_router(contact.router, prefix="/api")


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
    log.info("Content directory: %s", settings.content_dir)
    if not settings.content_dir.is_dir():
        log.warning("Content directory does not exist — content endpoints will 404")
    log.info("CORS origins: %s", ", ".join(settings.cors_origins))
