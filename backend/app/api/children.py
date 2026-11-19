"""Child profiles (created and managed by the parent)."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.deps import get_current_user, get_own_child, is_premium
from sqlmodel import delete

from app.models import LEVEL_LABELS, AssignmentResult, Attempt, Child, ClassMember, User, level_for_age

router = APIRouter(prefix="/children", tags=["children"])
STARTER_AVATARS = ["🦁", "🐯", "🐼", "🐸", "🐵", "🦄", "🐧", "🐙", "🦊", "🐰", "🐶", "🐱"]
# Buddies that are EARNED with stars, never bought: nobody gets left out and nobody rushes for a prize.
UNLOCKS = {"🦖": 40, "🐬": 80, "🦚": 140, "🐲": 220, "🦋": 320, "🚀": 450, "🌈": 600}
AVATARS = set(STARTER_AVATARS) | set(UNLOCKS)


class ChildIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    age: int = Field(ge=2, le=11)
    avatar: str = Field(default="🦁", max_length=8)

    @field_validator("avatar")
    @classmethod
    def known_avatar(cls, v: str) -> str:
        if v not in AVATARS:
            raise ValueError("Pick one of the buddies.")
        return v

    @field_validator("name")
    @classmethod
    def tidy_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if not v or any(ch in v for ch in "<>&\"'`"):
            raise ValueError("Please use letters only for the name.")
        return v


def child_out(c: Child) -> dict:
    return {
        "id": c.id, "name": c.name, "age": c.age, "level": c.level,
        "level_label": LEVEL_LABELS[c.level], "avatar": c.avatar,
        "stars": c.stars, "streak": c.streak, "best_streak": c.best_streak,
        "last_daily": c.last_daily.isoformat() if c.last_daily else None,
    }


@router.get("/avatars")
def avatars() -> dict:
    return {"avatars": [{"emoji": e, "stars": 0} for e in STARTER_AVATARS] + [{"emoji": e, "stars": n} for e, n in UNLOCKS.items()]}


class AvatarIn(BaseModel):
    avatar: str = Field(max_length=8)


@router.patch("/{child_id}/avatar")
def set_avatar(child_id: int, body: AvatarIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    if body.avatar not in AVATARS:
        raise HTTPException(400, "Pick one of the buddies.")
    if child.stars < UNLOCKS.get(body.avatar, 0):
        raise HTTPException(403, f"Earn {UNLOCKS[body.avatar]} stars to unlock this buddy!")
    child.avatar = body.avatar
    session.add(child)
    session.commit()
    return child_out(child)


@router.get("")
def list_children(user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    kids = session.exec(select(Child).where(Child.parent_id == user.id).order_by(Child.id)).all()
    premium = is_premium(session, user.id)
    return {
        "children": [child_out(c) for c in kids],
        "max_children": settings.premium_max_children if premium else settings.free_max_children,
    }


@router.post("", status_code=201)
def add_child(body: ChildIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    count = len(session.exec(select(Child).where(Child.parent_id == user.id)).all())
    limit = settings.premium_max_children if is_premium(session, user.id) else settings.free_max_children
    if count >= limit:
        raise HTTPException(402, f"Your plan allows {limit} child profile{'s' if limit != 1 else ''}. Upgrade to add more.")
    child = Child(parent_id=user.id, name=body.name.strip(), age=body.age,
                  level=level_for_age(body.age), avatar=body.avatar if body.avatar in STARTER_AVATARS else STARTER_AVATARS[0])
    session.add(child)
    session.commit()
    session.refresh(child)
    return child_out(child)


@router.patch("/{child_id}")
def update_child(child_id: int, body: ChildIn, user: User = Depends(get_current_user),
                 session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    child.name, child.age, child.avatar = body.name.strip(), body.age, body.avatar
    child.level = level_for_age(body.age)
    session.add(child)
    session.commit()
    return child_out(child)


@router.delete("/{child_id}", status_code=204, response_class=Response, response_model=None)
def delete_child(child_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> None:
    child = get_own_child(child_id, user, session)
    for a in session.exec(select(Attempt).where(Attempt.child_id == child.id)).all():
        session.delete(a)
    session.exec(delete(ClassMember).where(ClassMember.child_id == child.id))
    session.exec(delete(AssignmentResult).where(AssignmentResult.child_id == child.id))
    session.delete(child)
    session.commit()


@router.get("/{child_id}/progress")
def progress(child_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    today = date.today()
    since = today - timedelta(days=6)
    attempts = session.exec(select(Attempt).where(Attempt.child_id == child.id, Attempt.day >= since)).all()
    days = []
    for i in range(7):
        d = since + timedelta(days=i)
        day_attempts = [a for a in attempts if a.day == d]
        total = sum(a.total for a in day_attempts)
        correct = sum(a.correct for a in day_attempts)
        days.append({"day": d.isoformat(), "rounds": len(day_attempts), "questions": total,
                     "correct": correct, "stars": sum(a.stars_earned for a in day_attempts)})
    all_att = session.exec(select(Attempt).where(Attempt.child_id == child.id)).all()
    by_subject: dict[str, list[int]] = {}
    for a in all_att:
        s = by_subject.setdefault(a.subject, [0, 0])
        s[0] += a.correct
        s[1] += a.total
    premium = is_premium(session, user.id)
    subjects = [{"subject": k, "correct": v[0], "total": v[1], "pct": round(100 * v[0] / max(1, v[1]))}
                for k, v in sorted(by_subject.items()) if k != "mixed"]
    return {
        "child": child_out(child),
        "days": days,
        "total_rounds": len(all_att),
        "accuracy": round(100 * sum(a.correct for a in all_att) / max(1, sum(a.total for a in all_att))),
        # Premium parents see where the child is strong and what to practise next.
        "insights_locked": not premium,
        "subjects": subjects if premium else [],
        "strengths": [x["subject"] for x in subjects if x["total"] >= 5 and x["pct"] >= 80] if premium else [],
        "practise": [x["subject"] for x in subjects if x["total"] >= 5 and x["pct"] < 60] if premium else [],
    }
