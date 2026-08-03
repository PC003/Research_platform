"""FastAPI application entry point.

Connects to PostgreSQL on startup and disposes the connection pool
on shutdown. All data is served from the database — no JSON files.
"""

from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.api.routes import analytics, health, papers, students, images, admin_students
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
        students.router,
        prefix=f"{settings.api_prefix}/students",
        tags=["students"],
    )
    application.include_router(
        analytics.router,
        prefix=f"{settings.api_prefix}/analytics",
        tags=["analytics"],
    )
    application.include_router(
        health.router,
        prefix="/health",
        tags=["health"],
    )
    application.include_router(
        images.router,
        prefix=f"{settings.api_prefix}/admin",
    )
    application.include_router(
        admin_students.router,
        prefix=f"{settings.api_prefix}/admin",
    )

    # Mount static files for generated images
    base_dir = Path(__file__).resolve().parent.parent
    public_dir = base_dir / "public"
    public_dir.mkdir(exist_ok=True)
    application.mount("/public", StaticFiles(directory=str(public_dir)), name="public")

    return application


app = create_app()
