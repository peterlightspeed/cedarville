"""Database engine and session helper.

Works with Neon (or any Postgres) in production and SQLite locally. The only
thing that changes between the two is the DATABASE_URL environment variable.
"""
from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings


def normalise_url(url: str) -> str:
    """Turn Neon's plain `postgresql://` URL into one SQLAlchemy+psycopg3 accepts."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _build_engine():
    url = normalise_url(settings.database_url)
    parsed = make_url(url)
    if parsed.get_backend_name() == "sqlite":
        if parsed.database:
            Path(parsed.database).parent.mkdir(parents=True, exist_ok=True)
        return create_engine(url, connect_args={"check_same_thread": False})
    # Neon suspends idle databases; pre_ping + recycle stops "connection closed"
    # errors on the first request after a quiet period.
    return create_engine(url, pool_pre_ping=True, pool_recycle=300, pool_size=5, max_overflow=5)


engine = _build_engine()


def init_db() -> None:
    from app import models  # noqa: F401  (registers tables)

    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
