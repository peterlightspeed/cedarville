"""One place that adds Premium time to a family, so paying and redeeming a code behave the same."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

from app.models import Subscription


def grant_premium(session: Session, user_id: int, days: int, plan_code: str) -> datetime:
    """Adds `days` after any Premium they already have, so nobody loses paid or gifted time."""
    now = datetime.now(timezone.utc)
    start = now
    for sub in session.exec(select(Subscription).where(Subscription.user_id == user_id)).all():
        end = sub.current_period_end if sub.current_period_end.tzinfo else sub.current_period_end.replace(tzinfo=timezone.utc)
        if end > start:
            start = end
    end = start + timedelta(days=days)
    session.add(Subscription(user_id=user_id, plan_code=plan_code, current_period_end=end))
    return end
