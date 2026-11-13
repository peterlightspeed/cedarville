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

from app.models import AIUsage, Attempt, Child, Subscription, Transaction, User
from app.security import create_token, hash_password, password_problem, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
_DUMMY_HASH = hash_password("not-a-real-password")


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)

    @field_validator("display_name")
    @classmethod
    def clean(cls, v: str) -> str:
        return v.strip()


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


def _user_out(user: User, session: Session) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "is_admin": user.is_admin,
        "premium": is_premium(session, user.id),
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
    password: str = Field(max_length=128)


@router.post("/delete-account", dependencies=[Depends(rate_limit("delacct", 5))])
def delete_account(body: DeleteAccountIn, user: User = Depends(get_current_user),
                   session: Session = Depends(get_session)) -> dict:
    """Erase the family's data (right to erasure). Payment records are kept without personal details."""
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "That password is not right.")
    kids = session.exec(select(Child).where(Child.parent_id == user.id)).all()
    for k in kids:
        session.exec(delete(Attempt).where(Attempt.child_id == k.id))
        session.exec(delete(AIUsage).where(AIUsage.child_id == k.id))
        session.delete(k)
    session.exec(delete(Subscription).where(Subscription.user_id == user.id))
    user.email = f"deleted-{user.id}@deleted.invalid"
    user.display_name = "Deleted"
    user.password_hash = "!"  # can never verify
    user.is_admin = False
    user.password_changed_at = datetime.now(timezone.utc)
    session.add(user)
    session.commit()
    return {"deleted": True}
