"""Application settings, loaded from environment variables.

Nothing here is secret by default; secrets come from the environment only.
See .env.example for the full list.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    """Plain environment-backed settings.

    Deliberately not pydantic-settings so the app has one less dependency
    and starts even if the package is missing.
    """

    def __init__(self) -> None:
        self.app_name: str = os.getenv("APP_NAME", "Cedarville Schools API")
        self.version: str = os.getenv("APP_VERSION", "0.1.0")
        self.env: str = os.getenv("APP_ENV", "development")
        self.debug: bool = os.getenv("APP_DEBUG", "true").lower() == "true"

        # Where the JSON content lives. Defaults to the frontend's data folder
        # so a single repo checkout works with no configuration.
        default_content = REPO_ROOT / "site" / "data"
        self.content_dir: Path = Path(
            os.getenv("CONTENT_DIR", str(default_content))
        ).resolve()

        # Where contact form submissions are appended.
        self.submissions_file: Path = Path(
            os.getenv("SUBMISSIONS_FILE", str(BACKEND_DIR / "var" / "submissions.jsonl"))
        ).resolve()

        # CORS: exact origins only. "*" is never used with credentials.
        self.cors_origins: list[str] = _split_csv(
            os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5000,http://127.0.0.1:5000,"
                "http://localhost:8000,http://127.0.0.1:8000",
            )
        )

        # Cache lifetime for content responses, in seconds.
        self.content_cache_seconds: int = int(os.getenv("CONTENT_CACHE_SECONDS", "300"))

        self.rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
