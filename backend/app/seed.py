"""Insert the starter questions and videos on a fresh database."""
from __future__ import annotations

import logging

from sqlmodel import Session, select

from app.models import Question, Video
from app.seed_data import VIDEOS, all_questions

log = logging.getLogger("cedarville.seed")


def seed_if_empty(session: Session) -> None:
    if session.exec(select(Question).limit(1)).first() is None:
        rows = all_questions()
        session.add_all(Question(**r) for r in rows)
        log.info("Seeded %d questions", len(rows))
    if session.exec(select(Video).limit(1)).first() is None:
        session.add_all(Video(**v) for v in VIDEOS)
        log.info("Seeded %d videos", len(VIDEOS))
    session.commit()
