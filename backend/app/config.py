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
        self.version: str = os.getenv("APP_VERSION", "0.4.0")
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
                "http://localhost:8000,http://127.0.0.1:8000,"
                # Capacitor (Android/iOS) webviews
                "https://localhost,capacitor://localhost",
            )
        )

        # Cache lifetime for content responses, in seconds.
        self.content_cache_seconds: int = int(os.getenv("CONTENT_CACHE_SECONDS", "300"))

        self.rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))

        # ---- Database -------------------------------------------------
        # Neon gives "postgresql://user:pass@host/db?sslmode=require".
        # We accept that as-is and fix the driver prefix in database.py.
        # Unset = a local SQLite file, handy for development and tests.
        self.database_url: str = os.getenv(
            "DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'var' / 'app.db'}"
        )

        # ---- Auth -----------------------------------------------------
        self.secret_key: str = os.getenv("SECRET_KEY", "dev-only-change-me-please-32-chars-min")
        self.access_token_days: int = int(os.getenv("ACCESS_TOKEN_DAYS", "14"))
        # Teachers with these emails are approved automatically (everyone else asks and an admin approves).
        self.teacher_emails: list[str] = [e.lower() for e in _split_csv(os.getenv("TEACHER_EMAILS", ""))]
        # Parents with these emails get admin rights (add videos/questions).
        self.admin_emails: list[str] = [e.lower() for e in _split_csv(os.getenv("ADMIN_EMAILS", ""))]

        # ---- Public URLs ----------------------------------------------
        # Where Paystack sends the parent back after paying.
        self.app_url: str = os.getenv("APP_URL", "http://localhost:5000/app/").rstrip("/") + "/"

        # ---- Paystack -------------------------------------------------
        self.paystack_secret_key: str = os.getenv("PAYSTACK_SECRET_KEY", "")

        # ---- Google sign-in (public "Web client ID" from Google Cloud Console) --
        self.google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()

        # ---- Features that stay OFF until you are ready ------------------------
        # Videos are off by default: only publish videos you own or have written permission to show.
        self.enable_videos: bool = os.getenv("ENABLE_VIDEOS", "false").strip().lower() in ("1", "true", "yes")

        # ---- AI buddy -------------------------------------------------
        self.anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
        self.ai_model: str = os.getenv("AI_MODEL", "claude-haiku-5-5")
        self.ai_daily_limit: int = int(os.getenv("AI_DAILY_LIMIT_PER_CHILD", "20"))

        # ---- Free-plan limits -----------------------------------------
        self.free_max_children: int = int(os.getenv("FREE_MAX_CHILDREN", "1"))
        self.premium_max_children: int = int(os.getenv("PREMIUM_MAX_CHILDREN", "5"))
        self.free_practice_per_day: int = int(os.getenv("FREE_PRACTICE_PER_DAY", "1"))
        # Subjects free families can practise. Everything else is Premium. Daily quiz always mixes ALL subjects.
        self.free_subjects: list[str] = [x.lower() for x in _split_csv(os.getenv("FREE_SUBJECTS", "letters,numbers,colours,maths"))]
        self.free_ai_per_day: int = int(os.getenv("FREE_AI_PER_DAY", "3"))  # free "taster" questions for Cedar


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
