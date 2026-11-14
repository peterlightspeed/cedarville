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
