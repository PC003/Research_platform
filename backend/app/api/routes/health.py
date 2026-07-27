"""Health check endpoints — application and database connectivity."""

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.services.paper_service import check_db_connection

router = APIRouter()


@router.get("")
async def health_check():
    """Basic application health check."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/database")
async def database_health(db: AsyncSession = Depends(get_db)):
    """Verify PostgreSQL connection by executing SELECT 1."""
    connected = await check_db_connection(db)

    if connected:
        return {
            "status": "healthy",
            "database": "connected",
        }

    return {
        "status": "unhealthy",
        "database": "disconnected",
    }
