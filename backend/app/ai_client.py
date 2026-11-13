"""Thin Anthropic Messages API client (httpx). No SDK needed.

Everything that can fail returns None so callers can fall back gracefully.
"""
from __future__ import annotations

import logging

import httpx

from app.config import settings

log = logging.getLogger("cedarville.ai")
API_URL = "https://api.anthropic.com/v1/messages"


def ai_enabled() -> bool:
    return bool(settings.anthropic_api_key)


async def complete(system: str, user: str, max_tokens: int = 300) -> str | None:
    if not ai_enabled():
        return None
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            res = await client.post(
                API_URL,
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": settings.ai_model,
                    "max_tokens": max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": user}],
                },
            )
        res.raise_for_status()
        blocks = res.json().get("content", [])
        return "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip() or None
    except Exception as exc:  # network, 4xx/5xx, bad JSON — never crash a child's screen
        log.warning("AI call failed: %s", exc)
        return None
