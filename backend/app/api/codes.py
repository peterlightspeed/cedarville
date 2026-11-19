"""Premium codes (vouchers) and the people allowed to make them.

Admins (ADMIN_EMAILS) can do everything here. They can also add "code staff": people who may generate and
revoke codes, and see ONLY the codes they made. Nobody else can create a code, and a code only works for a
parent who is logged in, once per family, until it is used up or expires.
"""
from __future__ import annotations

import secrets
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_current_user, rate_limit, require_admin, require_code_issuer
from app.models import CodeRedemption, PremiumCode, User
from app.premium import grant_premium

router = APIRouter(tags=["codes"])
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I: easy to read out or type from a message


def _new_code(session: Session) -> str:
    for _ in range(30):
        raw = "".join(secrets.choice(ALPHABET) for _ in range(8))
        code = f"CED-{raw[:4]}-{raw[4:]}"
        if not session.exec(select(PremiumCode).where(PremiumCode.code == code)).first():
            return code
    raise HTTPException(500, "Could not make a code. Please try again.")


def _norm(code: str) -> str:
    c = "".join(ch for ch in code.upper() if ch.isalnum())
    c = c[3:] if c.startswith("CED") else c
    return f"CED-{c[:4]}-{c[4:]}" if len(c) == 8 else ""


def _status(c: PremiumCode) -> str:
    if c.revoked:
        return "revoked"
    if c.redeem_by and date.today() > c.redeem_by:
        return "expired"
    if c.uses >= c.max_uses:
        return "used up"
    return "active"


def _out(c: PremiumCode) -> dict:
    return {"id": c.id, "code": c.code, "days": c.days, "label": c.label, "max_uses": c.max_uses, "uses": c.uses,
            "redeem_by": c.redeem_by.isoformat() if c.redeem_by else None, "status": _status(c), "created_at": c.created_at.isoformat()}


# ------------------------------------------------------------------ parents redeem
class RedeemIn(BaseModel):
    code: str = Field(min_length=6, max_length=24)


@router.post("/premium/redeem", dependencies=[Depends(rate_limit("redeem", 10))])
def redeem(body: RedeemIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    code = _norm(body.code)
    c = session.exec(select(PremiumCode).where(PremiumCode.code == code)).first() if code else None
    # One friendly message for every failure, so nobody can probe which codes exist.
    nope = HTTPException(400, "That code didn't work. Please check it and try again, or ask the school.")
    if c is None or _status(c) != "active":
        raise nope
    if session.exec(select(CodeRedemption).where(CodeRedemption.code_id == c.id, CodeRedemption.user_id == user.id)).first():
        raise HTTPException(400, "You have already used this code.")
    end = grant_premium(session, user.id, c.days, f"code:{c.label or c.code}"[:30])
    c.uses += 1
    session.add(c)
    session.add(CodeRedemption(code_id=c.id, user_id=user.id, days=c.days))
    session.commit()
    return {"days": c.days, "premium_until": end.isoformat()}


# ------------------------------------------------------------------ admin / staff: make and manage codes
class MakeCodes(BaseModel):
    days: int = Field(ge=1, le=730)
    count: int = Field(default=1, ge=1, le=100)
    max_uses: int = Field(default=1, ge=1, le=500)
    label: str = Field(default="", max_length=60)
    redeem_by: date | None = None


@router.post("/admin/codes", status_code=201)
def make_codes(body: MakeCodes, who: User = Depends(require_code_issuer), session: Session = Depends(get_session)) -> dict:
    if not who.is_admin and (body.days > 365 or body.count > 50):
        raise HTTPException(403, "Staff can make up to 50 codes at a time, for up to 365 days. Ask the admin for more.")
    if body.redeem_by and body.redeem_by < date.today():
        raise HTTPException(400, "The 'use before' date is in the past.")
    label = " ".join(body.label.split())
    made = []
    for _ in range(body.count):
        c = PremiumCode(code=_new_code(session), days=body.days, max_uses=body.max_uses, label=label, redeem_by=body.redeem_by,
                        created_by=who.id)
        session.add(c)
        session.flush()
        made.append(c)
    session.commit()
    return {"codes": [_out(c) for c in made]}


@router.get("/admin/codes")
def list_codes(who: User = Depends(require_code_issuer), session: Session = Depends(get_session)) -> dict:
    stmt = select(PremiumCode).order_by(PremiumCode.id.desc()).limit(300)
    if not who.is_admin:  # staff only ever see their own codes
        stmt = select(PremiumCode).where(PremiumCode.created_by == who.id).order_by(PremiumCode.id.desc()).limit(300)
    rows = session.exec(stmt).all()
    names = {u.id: u.display_name for u in session.exec(select(User).where(User.id.in_({r.created_by for r in rows}))).all()} if rows else {}
    return {"codes": [{**_out(c), "made_by": names.get(c.created_by, "")} for c in rows]}


@router.post("/admin/codes/{code_id}/revoke")
def revoke(code_id: int, who: User = Depends(require_code_issuer), session: Session = Depends(get_session)) -> dict:
    c = session.get(PremiumCode, code_id)
    if c is None or (not who.is_admin and c.created_by != who.id):
        raise HTTPException(404, "Code not found.")
    c.revoked = True  # already-given Premium time stays; the code just can't be used any more
    session.add(c)
    session.commit()
    return _out(c)


# ------------------------------------------------------------------ admin only: code staff
class StaffIn(BaseModel):
    email: EmailStr


@router.get("/admin/staff", dependencies=[Depends(require_admin)])
def staff(session: Session = Depends(get_session)) -> dict:
    rows = session.exec(select(User).where(User.staff_role == "codes")).all()
    return {"staff": [{"id": u.id, "name": u.display_name, "email": u.email} for u in rows]}


@router.post("/admin/staff", status_code=201, dependencies=[Depends(require_admin)])
def add_staff(body: StaffIn, session: Session = Depends(get_session)) -> dict:
    u = session.exec(select(User).where(User.email == body.email.lower())).first()
    if u is None:
        raise HTTPException(404, "No account with that email yet. Ask them to sign up first, then add them.")
    u.staff_role = "codes"
    session.add(u)
    session.commit()
    return {"id": u.id, "name": u.display_name, "email": u.email}


@router.delete("/admin/staff/{user_id}", dependencies=[Depends(require_admin)])
def remove_staff(user_id: int, session: Session = Depends(get_session)) -> dict:
    u = session.get(User, user_id)
    if u is None:
        raise HTTPException(404, "Not found.")
    u.staff_role = None
    session.add(u)
    session.commit()
    return {"ok": True}
