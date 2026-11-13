"""Health and readiness endpoints.

The uptime monitor pings /api/health. It must check something real, otherwise
it reports "up" while the app is broken.
"""
from __future__ import annotations

import time

from fastapi import APIRouter
from sqlalchemy import text

from app.database import engine

from app.config import settings

router = APIRouter(tags=["health"])

STARTED_AT = time.time()


@router.get("/health", summary="Liveness and readiness")
async def health() -> dict:
    content_ok = settings.content_dir.is_dir()
    documents = 0
    if content_ok:
        documents = len(list(settings.content_dir.glob("*.json")))

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ok" if (content_ok and db_ok) else "degraded",
        "version": settings.version,
        "environment": settings.env,
        "uptime_seconds": round(time.time() - STARTED_AT, 1),
        "checks": {
            "content_dir": str(settings.content_dir),
            "content_readable": content_ok,
            "database": db_ok,
            "documents_found": documents,
        },
    }
