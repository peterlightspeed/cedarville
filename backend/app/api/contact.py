"""Contact form endpoint.

Replaces the third-party form service with something the school owns. Writes
append-only JSONL so nothing is ever overwritten, and rate-limits by IP so a
bot cannot flood the file.
"""
from __future__ import annotations

import json
import re
import time
from collections import defaultdict, deque
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from app.config import settings

router = APIRouter(tags=["contact"])

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$")

# In-memory rate limiter. Fine for a single process; move to Redis when you run
# more than one instance.
_hits: dict[str, deque[float]] = defaultdict(deque)
WINDOW_SECONDS = 60


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    bucket = _hits[ip]
    while bucket and now - bucket[0] > WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= settings.rate_limit_per_minute:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again shortly.")
    bucket.append(now)


class ContactMessage(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(max_length=200)
    phone: str | None = Field(default=None, max_length=40)
    subject: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=10, max_length=4000)

    @field_validator("email")
    @classmethod
    def valid_email(cls, v: str) -> str:
        v = v.strip()
        if not EMAIL_RE.match(v):
            raise ValueError("Please enter a valid email address.")
        return v.lower()

    @field_validator("name", "message")
    @classmethod
    def strip_text(cls, v: str) -> str:
        return v.strip()


@router.post("/contact", summary="Submit a contact or enquiry form")
async def submit_contact(payload: ContactMessage, request: Request) -> dict:
    client_ip = (request.client.host if request.client else "unknown") or "unknown"
    _check_rate_limit(client_ip)

    record = {
        "received_at": datetime.now(timezone.utc).isoformat(),
        "ip": client_ip,
        "user_agent": request.headers.get("user-agent", "")[:300],
        **payload.model_dump(),
    }

    path = settings.submissions_file
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")

    return {
        "status": "received",
        "message": "Thank you — we have received your message and will reply shortly.",
    }
