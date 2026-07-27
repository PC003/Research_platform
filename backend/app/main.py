"""FastAPI application entry point.

Connects to PostgreSQL on startup and disposes the connection pool
on shutdown. All data is served from the database — no JSON files.
"""

from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, papers
from app.config import settings
from app.core.database import close_engine, init_db


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Startup/shutdown lifecycle hook.

    On startup: verify database tables exist (creates them if needed).
    On shutdown: close the database connection pool.
    """
    print("🚀 Starting up — connecting to PostgreSQL...")
    await init_db()
    print("✅ Database ready.")
    yield
    await close_engine()


def create_app() -> FastAPI:
    """Application factory — creates and configures the FastAPI instance."""

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────
    application.include_router(
        papers.router,
        prefix=f"{settings.api_prefix}/papers",
        tags=["papers"],
    )
    application.include_router(
        health.router,
        prefix="/health",
        tags=["health"],
    )

    return application


app = create_app()
