"""Content endpoints.

These deliberately mirror the static JSON files the frontend already reads, so
switching the frontend to this API is a one-attribute change:

    <html data-api-base="/api">

Every response has the same shape as the file it replaces.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response

from app.config import settings

router = APIRouter(tags=["content"])

# Explicit allow-list. Never build a filesystem path from user input without one.
ALLOWED: dict[str, str] = {
    "site": "site.json",
    "faq": "faq.json",
    "blog-posts": "blog-posts.json",
    "gallery": "gallery.json",
    "events": "events.json",
    "testimonials": "testimonials.json",
    "chatbot-responses": "chatbot-responses.json",
}


def _read_content(name: str) -> tuple[bytes, str]:
    """Return (raw bytes, etag) for a whitelisted content file."""
    filename = ALLOWED.get(name)
    if filename is None:
        raise HTTPException(status_code=404, detail=f"Unknown content: {name}")

    path: Path = settings.content_dir / filename
    if not path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Content file missing on server: {filename}",
        )

    raw = path.read_bytes()
    etag = '"' + hashlib.sha256(raw).hexdigest()[:32] + '"'
    return raw, etag


def _respond(request: Request, name: str) -> Response:
    raw, etag = _read_content(name)

    # Cheap conditional GET: the browser revalidates instead of re-downloading.
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag})

    return Response(
        content=raw,
        media_type="application/json; charset=utf-8",
        headers={
            "ETag": etag,
            "Cache-Control": f"public, max-age={settings.content_cache_seconds}, "
            "stale-while-revalidate=600",
            "X-Content-Source": "api",
        },
    )


@router.get("/{name}.json", summary="Content in its original file shape")
async def content_json(name: str, request: Request) -> Response:
    """Serve `site.json`, `faq.json`, ... exactly as the static site did."""
    return _respond(request, name)


@router.get("/content/{name}", summary="Content by name")
async def content_by_name(name: str, request: Request) -> Response:
    """Cleaner alias without the `.json` suffix."""
    return _respond(request, name)


@router.get("/content", summary="List available content documents")
async def list_content() -> dict[str, Any]:
    available = []
    for name, filename in sorted(ALLOWED.items()):
        path = settings.content_dir / filename
        available.append(
            {
                "name": name,
                "file": filename,
                "url": f"/api/{name}.json",
                "available": path.is_file(),
                "bytes": path.stat().st_size if path.is_file() else 0,
            }
        )
    return {"content_dir": str(settings.content_dir), "documents": available}
