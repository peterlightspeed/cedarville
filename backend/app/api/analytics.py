"""First-party, privacy-friendly funnel measurement for ad campaigns.

Anonymous events (no IP, no cookies, no user id) cover the steps BEFORE sign-up. Everything after sign-up is
counted from the real tables, so the numbers can't be faked or double-counted.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.auth import clean_utm
from app.database import get_session
from app.deps import rate_limit, require_admin
from app.models import Attempt, Child, Event, Transaction, User

router = APIRouter(tags=["analytics"])
ALLOWED = {"landing_view", "cta_click", "demo_start", "demo_done", "plans_view", "signup_view"}


class EventIn(BaseModel):
    name: str = Field(max_length=30)
    utm: dict[str, str] | None = None


@router.post("/events", status_code=204, response_model=None, dependencies=[Depends(rate_limit("events", 60))])
def track(body: EventIn, session: Session = Depends(get_session)) -> None:
    if body.name not in ALLOWED:
        raise HTTPException(400, "Unknown event.")
    u = clean_utm(body.utm)
    session.add(Event(name=body.name, utm_source=u.get("utm_source"), utm_campaign=u.get("utm_campaign")))
    session.commit()


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@router.get("/admin/stats", dependencies=[Depends(require_admin)])
def stats(days: int = 30, session: Session = Depends(get_session)) -> dict:
    """Funnel + per-campaign table for the last N days. Powers Teacher tools > Ad performance."""
    days = max(1, min(days, 365))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    users = [u for u in session.exec(select(User)).all()
             if _aware(u.created_at) >= since and not u.email.endswith("@deleted.invalid")]
    ids = {u.id for u in users}
    kids = [c for c in session.exec(select(Child)).all() if c.parent_id in ids]
    kid_parent = {c.id: c.parent_id for c in kids}
    daily_parents = {kid_parent[a.child_id] for a in session.exec(select(Attempt).where(Attempt.kind == "daily")).all()
                     if a.child_id in kid_parent}
    txs = [t for t in session.exec(select(Transaction)).all() if t.user_id in ids]
    started = {t.user_id for t in txs}
    paid = {t.user_id for t in txs if t.status == "success"}
    revenue = sum(t.amount_kobo for t in txs if t.status == "success")
    events: dict[str, int] = {}
    for e in session.exec(select(Event)).all():
        if _aware(e.created_at) >= since:
            events[e.name] = events.get(e.name, 0) + 1

    def row(label: str, group: list[User]) -> dict:
        g = {u.id for u in group}
        return {"campaign": label, "signups": len(group),
                "added_child": len({c.parent_id for c in kids if c.parent_id in g}),
                "played_daily": len(g & daily_parents), "started_checkout": len(g & started),
                "paid": len(g & paid), "revenue_kobo": sum(t.amount_kobo for t in txs if t.status == "success" and t.user_id in g)}

    groups: dict[str, list[User]] = {}
    for u in users:
        key = " / ".join(x for x in (u.utm_source, u.utm_campaign) if x) or "(direct / no tag)"
        groups.setdefault(key, []).append(u)
    return {
        "days": days,
        "funnel": {
            "landing_views": events.get("landing_view", 0), "demo_started": events.get("demo_start", 0),
            "demo_finished": events.get("demo_done", 0), "signup_screen_views": events.get("signup_view", 0),
            "signups": len(users), "added_child": len({c.parent_id for c in kids}), "played_daily": len(daily_parents),
            "started_checkout": len(started), "paid": len(paid), "revenue_kobo": revenue,
        },
        "campaigns": sorted((row(k, v) for k, v in groups.items()), key=lambda r: -r["signups"]),
    }
