"""Quizzes and videos for children."""
from __future__ import annotations

import random
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.deps import get_current_user, get_own_child, is_premium
from app.models import Attempt, Child, Question, User, Video

router = APIRouter(prefix="/learn", tags=["learn"])

DAILY_COUNT = 5
SUBJECT_EMOJI = {
    "letters": "🔤", "numbers": "🔢", "maths": "➕", "colours": "🎨", "shapes": "🔷", "animals": "🐾",
    "nature": "🌳", "body": "🖐️", "english": "📖", "science": "🔬", "nigeria": "🇳🇬", "world": "🌍",
}
SUBJECT_LABEL = {"maths": "Maths", "nigeria": "Nigeria", "world": "Our World"}


def _pool(session: Session, level: str, subject: str | None = None) -> list[Question]:
    stmt = select(Question).where(Question.level == level, Question.approved == True)  # noqa: E712
    if subject:
        stmt = stmt.where(Question.subject == subject)
    return list(session.exec(stmt.order_by(Question.id)).all())


def _public(q: Question, rng: random.Random) -> dict:
    opts = list(q.options)
    rng.shuffle(opts)
    return {"id": q.id, "subject": q.subject, "visual": q.visual, "prompt": q.prompt, "options": opts}


def _daily_questions(session: Session, child: Child, day: date) -> list[Question]:
    pool = _pool(session, child.level)
    rng = random.Random(f"{child.id}:{day.isoformat()}")
    return rng.sample(pool, min(DAILY_COUNT, len(pool)))


def _practice_used_today(session: Session, child: Child) -> int:
    return len(session.exec(select(Attempt).where(
        Attempt.child_id == child.id, Attempt.kind == "practice", Attempt.day == date.today())).all())


def _daily_attempt(session: Session, child: Child, day: date) -> Attempt | None:
    return session.exec(select(Attempt).where(
        Attempt.child_id == child.id, Attempt.kind == "daily", Attempt.day == day)).first()


@router.get("/daily")
def daily(child_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    today = date.today()
    done = _daily_attempt(session, child, today)
    qs = _daily_questions(session, child, today)
    rng = random.Random(f"shuffle:{child.id}:{today.isoformat()}")
    done_days = {a.day for a in session.exec(select(Attempt).where(
        Attempt.child_id == child.id, Attempt.kind == "daily", Attempt.day >= today - timedelta(days=6))).all()}
    week = [{"day": (today - timedelta(days=6 - i)).isoformat(), "done": (today - timedelta(days=6 - i)) in done_days}
            for i in range(7)]
    return {
        "date": today.isoformat(),
        "week": week,
        "already_done": done is not None,
        "result": {"correct": done.correct, "total": done.total, "stars": done.stars_earned} if done else None,
        "questions": [_public(q, rng) for q in qs],
    }


@router.get("/subjects")
def subjects(child_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    counts: dict[str, int] = {}
    for q in _pool(session, child.level):
        counts[q.subject] = counts.get(q.subject, 0) + 1
    premium = is_premium(session, user.id)
    used = _practice_used_today(session, child)
    return {
        "subjects": [
            {"key": k, "label": SUBJECT_LABEL.get(k, k.capitalize()), "emoji": SUBJECT_EMOJI.get(k, "⭐"), "count": n,
             "locked": (not premium) and k not in settings.free_subjects}
            for k, n in sorted(counts.items(), key=lambda kv: (kv[0] not in settings.free_subjects, kv[0]))
        ],
        "premium": premium,
        "practice_left": None if premium else max(0, settings.free_practice_per_day - used),
    }


@router.get("/practice")
def practice(child_id: int, subject: str | None = None, count: int = Query(5, ge=3, le=10),
             user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    if not is_premium(session, user.id) and _practice_used_today(session, child) >= settings.free_practice_per_day:
        raise HTTPException(402, "You've finished today's free practice! Come back tomorrow, or ask a grown-up about Premium.")
    premium = is_premium(session, user.id)
    if subject and not premium and subject not in settings.free_subjects:
        raise HTTPException(402, "This subject is part of Premium. Ask a grown-up to unlock every subject!")
    pool = _pool(session, child.level, subject)
    if not subject and not premium:  # "Surprise Me" for free families draws from the free subjects only
        pool = [q for q in pool if q.subject in settings.free_subjects] or pool
    if not pool:
        raise HTTPException(404, "No questions here yet.")
    if not premium:
        count = min(count, 5)
    rng = random.Random()
    picked = rng.sample(pool, min(count, len(pool)))
    return {"subject": subject or "mixed", "questions": [_public(q, rng) for q in picked]}


class AnswerIn(BaseModel):
    question_id: int
    answer: str = Field(max_length=200)


class CheckIn(BaseModel):
    child_id: int
    question_id: int
    answer: str = Field(max_length=200)


@router.post("/check")
def check(body: CheckIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    """Instant feedback after each tap. Records nothing; scoring happens in /submit."""
    child = get_own_child(body.child_id, user, session)
    q = session.get(Question, body.question_id)
    if q is None or q.level != child.level or not q.approved:
        raise HTTPException(404, "Unknown question.")
    return {"correct": body.answer.strip() == q.answer, "answer": q.answer, "explanation": q.explanation}


class SubmitIn(BaseModel):
    child_id: int
    kind: str = Field(pattern="^(daily|practice)$")
    subject: str = "mixed"
    answers: list[AnswerIn] = Field(min_length=1, max_length=10)


@router.post("/submit")
def submit(body: SubmitIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(body.child_id, user, session)
    today = date.today()
    ids = [a.question_id for a in body.answers]
    if len(set(ids)) != len(ids):
        raise HTTPException(400, "Duplicate questions.")

    if body.kind == "daily":
        if _daily_attempt(session, child, today):
            raise HTTPException(409, "Today's quiz is already done. Come back tomorrow!")
        expected = {q.id for q in _daily_questions(session, child, today)}
        if set(ids) != expected:
            raise HTTPException(400, "These are not today's questions.")
    else:
        if not is_premium(session, user.id) and _practice_used_today(session, child) >= settings.free_practice_per_day:
            raise HTTPException(402, "Free practice for today is finished.")

    questions = {q.id: q for q in session.exec(select(Question).where(Question.id.in_(ids))).all()}
    if len(questions) != len(ids) or any(q.level != child.level for q in questions.values()):
        raise HTTPException(400, "Unknown question.")

    review, correct = [], 0
    for a in body.answers:
        q = questions[a.question_id]
        ok = a.answer.strip() == q.answer
        correct += ok
        review.append({"question_id": q.id, "correct": ok, "answer": q.answer, "explanation": q.explanation})

    total = len(body.answers)
    stars = correct + (2 if correct == total else 0) + (3 if body.kind == "daily" else 0)
    session.add(Attempt(child_id=child.id, kind=body.kind, subject=body.subject, day=today,
                        total=total, correct=correct, stars_earned=stars))
    child.stars += stars
    if body.kind == "daily":
        child.streak = child.streak + 1 if child.last_daily == today - timedelta(days=1) else 1
        child.best_streak = max(child.best_streak, child.streak)
        child.last_daily = today
    session.add(child)
    session.commit()
    return {"correct": correct, "total": total, "stars_earned": stars, "stars": child.stars,
            "streak": child.streak, "review": review}


@router.get("/videos")
def videos(child_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)) -> dict:
    child = get_own_child(child_id, user, session)
    premium = is_premium(session, user.id)
    out = []
    for v in session.exec(select(Video).where(Video.active == True).order_by(Video.id)).all():  # noqa: E712
        if v.levels and child.level not in v.levels:
            continue
        locked = v.premium and not premium
        out.append({"id": v.id, "title": v.title, "category": v.category, "emoji": v.emoji,
                    "premium": v.premium, "locked": locked,
                    "youtube_id": None if locked else v.youtube_id})
    return {"videos": out}
