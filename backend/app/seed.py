"""Insert the starter questions and videos on a fresh database."""
from __future__ import annotations

import logging

from sqlmodel import Session, select

from app.models import Question, Video
from app.seed_data import VIDEOS, all_questions

log = logging.getLogger("cedarville.seed")


def seed_if_empty(session: Session) -> None:
    """Adds any starter question the database doesn't have yet. Safe to run on every start: existing, edited or
    teacher-made questions are never touched, so new releases bring new questions to live databases too."""
    have = {(q.level, q.prompt, q.visual, q.answer) for q in session.exec(select(Question).where(Question.owner_id == None)).all()}  # noqa: E711
    new = [r for r in all_questions() if (r["level"], r["prompt"], r["visual"], r["answer"]) not in have]
    if new:
        session.add_all(Question(**r) for r in new)
        log.info("Added %d new starter questions", len(new))
    if session.exec(select(Video).limit(1)).first() is None:
        session.add_all(Video(**v) for v in VIDEOS)
        log.info("Seeded %d videos", len(VIDEOS))
    session.commit()
