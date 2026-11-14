"""Paystack subscriptions.

The signed webhook is the source of truth. `/payments/verify` exists so the app
can confirm instantly when the parent returns from Paystack, but it asks
Paystack directly — it never trusts the redirect.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.deps import get_current_user, is_premium
from app.models import Subscription, Transaction, User
from app.plans import PLANS, PREMIUM_FEATURES, comparison, plan_cards

log = logging.getLogger("cedarville.payments")
router = APIRouter(prefix="/payments", tags=["payments"])
PAYSTACK = "https://api.paystack.co"


@router.get("/plans")
def plans() -> dict:
    return {
        "plans": plan_cards(),
        "features": PREMIUM_FEATURES,
        "comparison": comparison(settings),
        "payments_enabled": bool(settings.paystack_secret_key),
    }


class CheckoutIn(BaseModel):
    plan_code: str


@router.post("/checkout")
async def checkout(body: CheckoutIn, user: User = Depends(get_current_user),
                   session: Session = Depends(get_session)) -> dict:
    plan = PLANS.get(body.plan_code)
    if plan is None:
        raise HTTPException(404, "Unknown plan.")
    if not settings.paystack_secret_key:
        raise HTTPException(503, "Payments are not switched on yet. Please check back soon.")

    reference = "cv_" + secrets.token_urlsafe(14)
    session.add(Transaction(reference=reference, user_id=user.id, plan_code=body.plan_code,
                            amount_kobo=plan["amount_kobo"]))
    session.commit()
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            res = await client.post(
                f"{PAYSTACK}/transaction/initialize",
                headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
                json={"email": user.email, "amount": plan["amount_kobo"], "currency": "NGN",
                      "reference": reference, "callback_url": settings.app_url,
                      "metadata": {"user_id": user.id, "plan_code": body.plan_code}},
            )
        res.raise_for_status()
        data = res.json()["data"]
    except Exception as exc:
        log.warning("Paystack initialize failed: %s", exc)
        raise HTTPException(502, "We couldn't reach the payment service. Please try again.")
    return {"authorization_url": data["authorization_url"], "reference": reference}


def _activate(session: Session, reference: str, paid_kobo: int, currency: str) -> bool:
    """Mark a transaction paid and extend the subscription. Safe to call twice."""
    tx = session.exec(select(Transaction).where(Transaction.reference == reference)).first()
    if tx is None:
        log.warning("Payment for unknown reference %s", reference)
        return False
    if tx.status == "success":
        return True  # already handled (Paystack retries webhooks)
    if paid_kobo != tx.amount_kobo or currency != "NGN":
        tx.status = "failed"
        session.add(tx)
        session.commit()
        log.error("Amount mismatch for %s: paid %s expected %s", reference, paid_kobo, tx.amount_kobo)
        return False

    now = datetime.now(timezone.utc)
    start = now
    for sub in session.exec(select(Subscription).where(Subscription.user_id == tx.user_id)).all():
        end = sub.current_period_end if sub.current_period_end.tzinfo else sub.current_period_end.replace(tzinfo=timezone.utc)
        if end > start:
            start = end  # renewing early never wastes paid days
    session.add(Subscription(user_id=tx.user_id, plan_code=tx.plan_code,
                             current_period_end=start + timedelta(days=PLANS[tx.plan_code]["days"])))
    tx.status = "success"
    session.add(tx)
    session.commit()
    return True


@router.post("/webhook", include_in_schema=False)
async def webhook(request: Request, session: Session = Depends(get_session)) -> dict:
    body = await request.body()
    expected = hmac.new(settings.paystack_secret_key.encode(), body, hashlib.sha512).hexdigest()
    if not settings.paystack_secret_key or not hmac.compare_digest(
            expected, request.headers.get("x-paystack-signature", "")):
        raise HTTPException(401, "Bad signature.")
    event = json.loads(body)
    if event.get("event") == "charge.success":
        d = event["data"]
        _activate(session, d["reference"], int(d["amount"]), d.get("currency", "NGN"))
    return {"status": "ok"}


@router.get("/verify")
async def verify(reference: str, user: User = Depends(get_current_user),
                 session: Session = Depends(get_session)) -> dict:
    tx = session.exec(select(Transaction).where(Transaction.reference == reference,
                                                Transaction.user_id == user.id)).first()
    if tx is None:
        raise HTTPException(404, "Payment not found.")
    if tx.status != "success" and settings.paystack_secret_key:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                res = await client.get(f"{PAYSTACK}/transaction/verify/{reference}",
                                       headers={"Authorization": f"Bearer {settings.paystack_secret_key}"})
            res.raise_for_status()
            d = res.json()["data"]
            if d.get("status") == "success":
                _activate(session, reference, int(d["amount"]), d.get("currency", "NGN"))
        except Exception as exc:
            log.warning("Paystack verify failed: %s", exc)
    session.refresh(tx)
    return {"status": tx.status, "premium": is_premium(session, user.id)}


@router.get("/status")
def status(user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    subs = session.exec(select(Subscription).where(Subscription.user_id == user.id)
                        .order_by(Subscription.current_period_end.desc())).first()
    return {"premium": is_premium(session, user.id),
            "valid_until": subs.current_period_end.isoformat() if subs else None}
