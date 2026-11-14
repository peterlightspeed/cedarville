"""Database engine and session helper.

Works with Neon (or any Postgres) in production and SQLite locally. The only
thing that changes between the two is the DATABASE_URL environment variable.
"""
from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import logging

from sqlalchemy import inspect, text
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


log = logging.getLogger("cedarville.db")


def add_missing_columns(eng) -> None:
    """Tiny additive migration: create_all() never alters existing tables, so when a new release adds an
    optional column, add it here instead of making you wipe the database. (Renames/removals still need Alembic.)"""
    insp = inspect(eng)
    with eng.begin() as conn:
        for table in SQLModel.metadata.sorted_tables:
            if not insp.has_table(table.name):
                continue
            have = {c["name"] for c in insp.get_columns(table.name)}
            for col in table.columns:
                if col.name in have:
                    continue
                if not col.nullable and col.server_default is None:
                    log.warning("Cannot auto-add required column %s.%s - needs a real migration", table.name, col.name)
                    continue
                ddl = col.type.compile(dialect=eng.dialect)
                conn.execute(text(f'ALTER TABLE "{table.name}" ADD COLUMN "{col.name}" {ddl}'))
                if col.index:
                    conn.execute(text(f'CREATE INDEX IF NOT EXISTS "ix_{table.name}_{col.name}" ON "{table.name}" ("{col.name}")'))
                log.info("Added column %s.%s", table.name, col.name)


def init_db() -> None:
    from app import models  # noqa: F401  (registers tables)

    SQLModel.metadata.create_all(engine)
    add_missing_columns(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
