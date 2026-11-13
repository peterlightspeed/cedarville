"""Password hashing and JWT helpers."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.config import settings

_hasher = PasswordHasher()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "iat": now, "exp": now + timedelta(days=settings.access_token_days)}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> tuple[int, datetime] | None:
    """Returns (user_id, issued_at) or None if the token is invalid/expired."""
    try:
        data = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM], options={"require": ["exp", "sub", "iat"]})
        return int(data["sub"]), datetime.fromtimestamp(int(data["iat"]), tz=timezone.utc)
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


COMMON_PASSWORDS = {
    "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop",
    "iloveyou", "11111111", "00000000", "abcd1234", "welcome1", "admin123", "letmein123", "cedarville",
    "cedarville1", "lagos1234", "nigeria123", "passw0rd",
}


def password_problem(password: str, email: str = "") -> str | None:
    """Friendly reason a password is too weak, or None if it's fine."""
    p = password.lower()
    if len(password) < 8:
        return "Your password needs at least 8 characters."
    if p in COMMON_PASSWORDS or len(set(p)) < 4:
        return "That password is too easy to guess. Try a few random words together."
    if email and p == email.lower().split("@")[0]:
        return "Your password shouldn't be the same as your email."
    return None
