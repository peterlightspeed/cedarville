"""Parent sign-up and login."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.deps import clear_login_failures, get_current_user, is_premium, login_locked, rate_limit, record_login_failure
from datetime import datetime, timezone

from sqlmodel import delete

import logging

from google.auth.transport import requests as g_requests
from google.oauth2 import id_token as g_id_token

from app.models import (AIUsage, Assignment, AssignmentResult, Attempt, Child, ClassMember, Classroom, Question,
                        Subscription, Transaction, User)
from app.security import create_token, hash_password, password_problem, verify_password

log = logging.getLogger("cedarville.auth")
router = APIRouter(prefix="/auth", tags=["auth"])
_DUMMY_HASH = hash_password("not-a-real-password")
NO_PASSWORD = "!"  # stored for Google-only accounts; can never verify


def clean_utm(utm: dict | None) -> dict:
    """Keep only short, plain campaign tags (letters, digits, - _ . space) so nothing odd gets stored."""
    out = {}
    for k in ("utm_source", "utm_medium", "utm_campaign"):
        v = str((utm or {}).get(k, ""))[:60].strip()
        if v and all(c.isalnum() or c in "-_. " for c in v):
            out[k] = v
    return out


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)
    utm: dict[str, str] | None = None
    as_teacher: bool = False

    @field_validator("display_name")
    @classmethod
    def clean(cls, v: str) -> str:
        return v.strip()


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


def teacher_status_for(email: str, wants: bool, current: str | None = None) -> str | None:
    """Allow-listed emails are approved at once; anyone else who asks waits for an admin."""
    if email in settings.teacher_emails:
        return "approved"
    if current in ("approved", "pending", "rejected"):
        return current
    # Admins are trusted, but only become teachers when they ask (so they still land on the normal parent screens).
    return ("approved" if email in settings.admin_emails else "pending") if wants else None


def _user_out(user: User, session: Session) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "is_admin": user.is_admin,
        "premium": is_premium(session, user.id),
        "teacher_status": user.teacher_status,
        "staff_role": user.staff_role,
        "has_password": user.password_hash != NO_PASSWORD,
        "google": bool(user.google_sub),
    }


@router.post("/signup", dependencies=[Depends(rate_limit("signup", 10))], status_code=201)
def signup(body: SignupIn, session: Session = Depends(get_session)) -> dict:
    email = body.email.lower()
    problem = password_problem(body.password, email)
    if problem:
        raise HTTPException(422, problem)
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(409, "There is already an account with this email. Try logging in.")
    user = User(
        email=email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        is_admin=email in settings.admin_emails,
        teacher_status=teacher_status_for(email, body.as_teacher),
        **clean_utm(body.utm),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"token": create_token(user.id), "user": _user_out(user, session)}


@router.post("/login", dependencies=[Depends(rate_limit("login", 10))])
def login(body: LoginIn, session: Session = Depends(get_session)) -> dict:
    email = body.email.lower()
    if login_locked(email):
        raise HTTPException(429, "Too many wrong tries. Please wait 15 minutes, then try again.")
    user = session.exec(select(User).where(User.email == email)).first()
    # Always run one hash check so "no such email" and "wrong password" take the same time.
    ok = verify_password(body.password, user.password_hash if user else _DUMMY_HASH)
    if user is None or not ok:
        record_login_failure(email)
        raise HTTPException(401, "That email or password is not right.")
    clear_login_failures(email)
    if email in settings.teacher_emails and user.teacher_status != "approved":
        user.teacher_status = "approved"
        session.add(user)
        session.commit()
    if user.email in settings.admin_emails and not user.is_admin:
        user.is_admin = True
        session.add(user)
        session.commit()
    return {"token": create_token(user.id), "user": _user_out(user, session)}


@router.get("/me")
def me(user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    return _user_out(user, session)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


@router.post("/change-password", dependencies=[Depends(rate_limit("chpw", 10))])
def change_password(body: ChangePasswordIn, user: User = Depends(get_current_user),
                    session: Session = Depends(get_session)) -> dict:
    if user.password_hash == NO_PASSWORD:
        raise HTTPException(400, "Your account signs in with Google, so there is no password to change.")
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(401, "Your current password is not right.")
    problem = password_problem(body.new_password, user.email)
    if problem:
        raise HTTPException(422, problem)
    user.password_hash = hash_password(body.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    # Every older token (other phones, a stolen one) stops working; hand back a fresh one.
    return {"token": create_token(user.id)}


class DeleteAccountIn(BaseModel):
    password: str = Field(default="", max_length=128)
    confirm: str = Field(default="", max_length=20)  # Google-only accounts type DELETE instead


@router.post("/delete-account", dependencies=[Depends(rate_limit("delacct", 5))])
def delete_account(body: DeleteAccountIn, user: User = Depends(get_current_user),
                   session: Session = Depends(get_session)) -> dict:
    """Erase the family's data (right to erasure). Payment records are kept without personal details."""
    if user.password_hash == NO_PASSWORD:
        if body.confirm.strip() != "DELETE":
            raise HTTPException(400, "Please type DELETE (in capital letters) to confirm.")
    elif not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "That password is not right.")
    kids = session.exec(select(Child).where(Child.parent_id == user.id)).all()
    for k in kids:
        session.exec(delete(ClassMember).where(ClassMember.child_id == k.id))
        session.exec(delete(AssignmentResult).where(AssignmentResult.child_id == k.id))
        session.exec(delete(Attempt).where(Attempt.child_id == k.id))
        session.exec(delete(AIUsage).where(AIUsage.child_id == k.id))
        session.delete(k)
    session.exec(delete(Subscription).where(Subscription.user_id == user.id))
    # a teacher's classes, assignments, results and own questions go too
    for c in session.exec(select(Classroom).where(Classroom.teacher_id == user.id)).all():
        for a in session.exec(select(Assignment).where(Assignment.class_id == c.id)).all():
            session.exec(delete(AssignmentResult).where(AssignmentResult.assignment_id == a.id))
            session.delete(a)
        session.exec(delete(ClassMember).where(ClassMember.class_id == c.id))
        session.delete(c)
    session.exec(delete(Question).where(Question.owner_id == user.id))
    user.teacher_status = None
    user.email = f"deleted-{user.id}@deleted.invalid"
    user.display_name = "Deleted"
    user.password_hash = NO_PASSWORD
    user.google_sub = None
    user.is_admin = False
    user.password_changed_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    return {"deleted": True}


# ----------------------------------------------------------------- Google sign-in
@router.get("/providers")
def providers() -> dict:
    """Tells the app which sign-in options are switched on (the Google client ID is public by design)."""
    return {"google_client_id": settings.google_client_id or None,
            "features": {"videos": settings.enable_videos, "cedar": bool(settings.anthropic_api_key)}}


def verify_google_token(credential: str) -> dict:
    """Checks Google's signature, expiry and that the token was issued for OUR client ID."""
    info = g_id_token.verify_oauth2_token(credential, g_requests.Request(), settings.google_client_id)
    if info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("wrong issuer")
    if not info.get("email") or not info.get("email_verified"):
        raise ValueError("email not verified by Google")
    return info


class GoogleIn(BaseModel):
    credential: str = Field(min_length=20, max_length=4096)
    accepted_terms: bool = False
    utm: dict[str, str] | None = None
    as_teacher: bool = False


@router.post("/google", dependencies=[Depends(rate_limit("google", 20))])
def google_login(body: GoogleIn, session: Session = Depends(get_session)) -> dict:
    if not settings.google_client_id:
        raise HTTPException(503, "Google sign-in is not switched on yet.")
    try:
        info = verify_google_token(body.credential)
    except Exception as exc:  # bad signature, expired, wrong audience, unverified email...
        log.warning("Google token rejected: %s", exc)
        raise HTTPException(401, "Google could not confirm your sign-in. Please try again.")

    email, sub = info["email"].lower(), info["sub"]
    user = session.exec(select(User).where(User.google_sub == sub)).first()
    note = None
    if user is None:
        user = session.exec(select(User).where(User.email == email)).first()
        if user is not None:
            # Same verified email as an existing account. We never verified that email at password sign-up, so
            # someone else could have registered it first. Linking therefore REPLACES the password and logs out
            # every older session: whoever controls the Google account now owns the account.
            if user.password_hash != NO_PASSWORD:
                note = "Your account now signs in with Google. The old password has been switched off."
            user.google_sub = sub
            user.password_hash = NO_PASSWORD
            user.password_changed_at = datetime.now(timezone.utc)
        else:
            if not body.accepted_terms:
                raise HTTPException(409, "No account for this Google email yet. Open the 'New here? Sign up' tab, "
                                         "tick the parent/guardian box, then tap the Google button again.")
            user = User(email=email, password_hash=NO_PASSWORD, google_sub=sub,
                        display_name=(info.get("name") or email.split("@")[0]).strip()[:80] or "Parent",
                        teacher_status=teacher_status_for(email, body.as_teacher),
                        **clean_utm(body.utm))
    if email in settings.admin_emails:
        user.is_admin = True
    user.teacher_status = teacher_status_for(email, body.as_teacher, user.teacher_status)
    session.add(user)
    session.commit()
    session.refresh(user)
    out = {"token": create_token(user.id), "user": _user_out(user, session)}
    if note:
        out["note"] = note
    return out


@router.post("/request-teacher", dependencies=[Depends(rate_limit("reqteach", 5))])
def request_teacher(user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    """An existing parent account asks for teacher tools. An admin (the school) approves."""
    user.teacher_status = teacher_status_for(user.email, True, user.teacher_status)
    session.add(user)
    session.commit()
    return {"teacher_status": user.teacher_status}
