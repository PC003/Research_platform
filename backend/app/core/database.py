"""Async SQLAlchemy engine, session factory, and FastAPI dependency.

Provides the database connection layer for the application.
DATABASE_URL must be configured in the environment.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.models.base import Base


# ── Engine & Session Factory ──────────────────────────────────────────────────

_engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

_async_session_factory = async_sessionmaker(
    bind=_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields a database session.

    Handles commit on success and rollback on failure automatically.

    Usage::

        @router.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables from ORM metadata (dev convenience).

    In production, use Alembic migrations instead.
    Imports all ORM models so their tables are registered
    on Base.metadata before create_all runs.
    """
    # Import ORM models to register them on Base.metadata
    import app.models.student  # noqa: F401
    import app.models.paper_orm  # noqa: F401
    import app.models.paper_embedding  # noqa: F401

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Database tables verified / created.")


async def close_engine() -> None:
    """Dispose the engine connection pool (call on app shutdown)."""
    await _engine.dispose()
    print("👋 Database connection pool closed.")
