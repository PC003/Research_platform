"""Declarative base for all SQLAlchemy ORM models."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class that all ORM models inherit from.

    Provides a shared metadata object so Alembic (or manual migrations)
    can discover every table from a single import.
    """

    pass
