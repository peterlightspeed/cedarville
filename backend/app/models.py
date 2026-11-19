"""Database tables."""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# Learning levels, youngest first. Ages map to a level in LEVEL_BY_AGE.
LEVELS = ["tiny", "nursery", "lower", "upper"]
LEVEL_LABELS = {
    "tiny": "Little Explorers (2-3)",
    "nursery": "Nursery (4-5)",
    "lower": "Primary 1-3 (6-8)",
    "upper": "Primary 4-6 (9-11)",
}


def level_for_age(age: int) -> str:
    if age <= 3:
        return "tiny"
    if age <= 5:
        return "nursery"
    if age <= 8:
        return "lower"
    return "upper"


class User(SQLModel, table=True):
    """A parent/guardian account. Children never get their own login."""

    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True, max_length=200)
    password_hash: str
    display_name: str = Field(max_length=80)
    is_admin: bool = False
    password_changed_at: datetime | None = None
    google_sub: str | None = Field(default=None, index=True)
    utm_source: str | None = Field(default=None, max_length=60)
    utm_medium: str | None = Field(default=None, max_length=60)
    utm_campaign: str | None = Field(default=None, max_length=60)
    teacher_status: str | None = Field(default=None, max_length=12, index=True)  # None | pending | approved | rejected
    staff_role: str | None = Field(default=None, max_length=12)  # None | codes  (can issue Premium codes, nothing else)
    created_at: datetime = Field(default_factory=utcnow)


class Child(SQLModel, table=True):
    """A child profile. Only a first name, age and avatar are stored."""

    id: int | None = Field(default=None, primary_key=True)
    parent_id: int = Field(foreign_key="user.id", index=True)
    name: str = Field(max_length=40)
    age: int
    level: str = "nursery"
    avatar: str = "🦁"
    stars: int = 0
    streak: int = 0
    best_streak: int = 0
    last_daily: date | None = None
    created_at: datetime = Field(default_factory=utcnow)


class Question(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    level: str = Field(index=True)
    subject: str = Field(index=True)  # letters, numbers, colours, shapes, animals, nature, english, maths, nigeria, body
    prompt: str
    visual: str = ""  # big emoji shown above the prompt
    options: list = Field(default_factory=list, sa_column=Column(JSON))
    answer: str  # must equal one of options
    explanation: str = ""
    approved: bool = True  # AI-drafted questions start False until a teacher approves
    owner_id: int | None = Field(default=None, index=True)  # set = a teacher's private class question (never in the public bank)


class Video(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    youtube_id: str = Field(unique=True)
    title: str
    category: str = Field(index=True)  # songs, letters, numbers, stories, science, nigeria
    levels: list = Field(default_factory=list, sa_column=Column(JSON))
    emoji: str = "🎬"
    premium: bool = False
    active: bool = True


class Attempt(SQLModel, table=True):
    """One finished quiz round."""

    id: int | None = Field(default=None, primary_key=True)
    child_id: int = Field(foreign_key="child.id", index=True)
    kind: str  # daily | practice
    subject: str = "mixed"
    day: date = Field(index=True)
    total: int
    correct: int
    stars_earned: int = 0
    created_at: datetime = Field(default_factory=utcnow)


class Subscription(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    plan_code: str
    current_period_end: datetime
    created_at: datetime = Field(default_factory=utcnow)


class Transaction(SQLModel, table=True):
    """A Paystack payment. `reference` doubles as the idempotency key."""

    id: int | None = Field(default=None, primary_key=True)
    reference: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    plan_code: str
    amount_kobo: int
    status: str = "pending"  # pending | success | failed
    created_at: datetime = Field(default_factory=utcnow)


class AIUsage(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    child_id: int = Field(index=True)
    day: date = Field(index=True)
    count: int = 0


class Event(SQLModel, table=True):
    """Anonymous pre-signup funnel counter (landing visit, demo quiz...). No IP, no user id, no cookies."""

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, max_length=30)
    utm_source: str | None = Field(default=None, max_length=60)
    utm_campaign: str | None = Field(default=None, max_length=60)
    created_at: datetime = Field(default_factory=utcnow, index=True)


class AIReport(SQLModel, table=True):
    """A Cedar reply a parent flagged, or one our safety filter stopped. Reviewed by school staff."""

    id: int | None = Field(default=None, primary_key=True)
    child_id: int = Field(index=True)
    source: str = Field(max_length=20)  # parent_report | auto_filter
    prompt: str = Field(default="", max_length=400)   # already scrubbed of phone numbers / emails
    reply: str = Field(default="", max_length=1200)
    resolved: bool = False
    created_at: datetime = Field(default_factory=utcnow, index=True)


class Classroom(SQLModel, table=True):
    """A teacher's class. Parents join their child with the code."""

    id: int | None = Field(default=None, primary_key=True)
    teacher_id: int = Field(index=True)
    name: str = Field(max_length=60)
    level: str = "nursery"
    code: str = Field(unique=True, index=True, max_length=8)
    archived: bool = False
    created_at: datetime = Field(default_factory=utcnow)


class ClassMember(SQLModel, table=True):
    """A child joined to a class BY THEIR PARENT (consent). show_on_board lets a parent opt out of the leaderboard."""

    id: int | None = Field(default=None, primary_key=True)
    class_id: int = Field(index=True)
    child_id: int = Field(index=True)
    show_on_board: bool = True
    joined_at: datetime = Field(default_factory=utcnow)


class Assignment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    class_id: int = Field(index=True)
    teacher_id: int = Field(index=True)
    title: str = Field(max_length=120)
    instructions: str = Field(default="", max_length=500)
    kind: str = Field(default="homework", max_length=12)  # homework | exercise | quiz
    due_date: date | None = None
    question_ids: list = Field(default_factory=list, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow)


class AssignmentResult(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    assignment_id: int = Field(index=True)
    child_id: int = Field(index=True)
    correct: int
    total: int
    stars: int = 0
    answers: list = Field(default_factory=list, sa_column=Column(JSON))  # [{question_id, correct}]
    late: bool = False
    submitted_at: datetime = Field(default_factory=utcnow)


class PremiumCode(SQLModel, table=True):
    """A voucher that gives a family Premium for a number of days. Made only by admins / code staff."""

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True, max_length=20)
    days: int
    label: str = Field(default="", max_length=60)      # e.g. "Scholarship 2026", "Term 1 staff kids"
    max_uses: int = 1
    uses: int = 0
    redeem_by: date | None = None                      # the code stops working after this date
    revoked: bool = False
    created_by: int = Field(index=True)
    created_at: datetime = Field(default_factory=utcnow)


class CodeRedemption(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    code_id: int = Field(index=True)
    user_id: int = Field(index=True)
    days: int
    redeemed_at: datetime = Field(default_factory=utcnow)
