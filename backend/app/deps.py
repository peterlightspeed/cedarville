"""Shared FastAPI dependencies."""
from __future__ import annotations

import time
from collections import defaultdict, deque
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.database import get_session
from app.models import Child, Subscription, User
from app.security import decode_token

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: Session = Depends(get_session),
) -> User:
    if creds is None:
        raise HTTPException(401, "Please log in.")
    decoded = decode_token(creds.credentials)
    user = session.get(User, decoded[0]) if decoded else None
    if user is None:
        raise HTTPException(401, "Your session has ended. Please log in again.")
    if user.email.endswith("@deleted.invalid"):
        raise HTTPException(401, "This account has been deleted.")
    changed = user.password_changed_at
    if changed is not None:
        if changed.tzinfo is None:
            changed = changed.replace(tzinfo=timezone.utc)
        # Tokens issued before a password change are dead (second of slack for clock rounding).
        if decoded[1] < changed.replace(microsecond=0):
            raise HTTPException(401, "Your password was changed. Please log in again.")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Admins only.")
    return user


def require_code_issuer(user: User = Depends(get_current_user)) -> User:
    """Admins, plus people an admin has added as code staff. Nobody else."""
    if not (user.is_admin or user.staff_role == "codes"):
        raise HTTPException(403, "Only the school admin or approved staff can do this.")
    return user


def require_teacher(user: User = Depends(get_current_user)) -> User:
    if user.teacher_status != "approved":
        raise HTTPException(403, "Teacher access has not been approved yet.")
    return user


def is_premium(session: Session, user_id: int) -> bool:
    now = datetime.now(timezone.utc)
    subs = session.exec(select(Subscription).where(Subscription.user_id == user_id)).all()
    for sub in subs:
        end = sub.current_period_end
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        if end > now:
            return True
    return False


def get_own_child(child_id: int, user: User, session: Session) -> Child:
    child = session.get(Child, child_id)
    if child is None or child.parent_id != user.id:
        raise HTTPException(404, "Child not found.")
    return child


# ---- failed-login lockout, per email (works even when many people share one IP) ----
_fails: dict[str, deque[float]] = defaultdict(deque)
LOCK_AFTER, LOCK_WINDOW = 5, 15 * 60


def login_locked(email: str) -> bool:
    q, now = _fails[email], time.time()
    while q and now - q[0] > LOCK_WINDOW:
        q.popleft()
    return len(q) >= LOCK_AFTER


def record_login_failure(email: str) -> None:
    _fails[email].append(time.time())


def clear_login_failures(email: str) -> None:
    _fails.pop(email, None)


# ---- tiny in-memory rate limiter (single process; use Redis if you scale out) ----
_buckets: dict[str, deque[float]] = defaultdict(deque)


def rate_limit(key_prefix: str, limit: int, window: int = 60):
    def checker(request: Request) -> None:
        ip = (request.client.host if request.client else "unknown") or "unknown"
        key = f"{key_prefix}:{ip}"
        now = time.time()
        bucket = _buckets[key]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= limit:
            raise HTTPException(429, "Too many tries. Please wait a minute and try again.")
        bucket.append(now)

    return checker
