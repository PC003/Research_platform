"""Authentication service — password hashing, JWT tokens, user management."""

from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User
from app.models.user_schema import UserCreate


# ── Password Hashing ─────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ── JWT Tokens ────────────────────────────────────────────────────────────────


def create_access_token(user_id: str, role: str) -> str:
    """Create a JWT token with user_id and role in the payload."""
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate a JWT token. Returns the payload or None."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ── User Operations ───────────────────────────────────────────────────────────


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Look up a user by email address."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    """Look up a user by their UUID."""
    return await db.get(User, user_id)


async def register_user(db: AsyncSession, data: UserCreate) -> User:
    """Create a new user account. Raises ValueError if email is taken."""
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise ValueError("A user with this email already exists")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role="user",
    )
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> User | None:
    """Validate credentials. Returns the User on success, None on failure."""
    user = await get_user_by_email(db, email)
    if user is None:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
