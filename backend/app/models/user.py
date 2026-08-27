"""SQLAlchemy ORM model for the users table."""

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    """Application user with role-based access control."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(150), nullable=False,
    )
    role: Mapped[str] = mapped_column(
        SAEnum("user", "admin", name="user_role"),
        default="user",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow,
    )

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"
