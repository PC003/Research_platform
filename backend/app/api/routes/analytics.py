"""Analytics endpoints — aggregation queries for dashboard views.

All data is computed from PostgreSQL aggregations.
"""

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.analytics_service import (
    get_citation_distribution,
    get_collaboration_breakdown,
    get_keyword_frequency,
    get_paper_type_breakdown,
    get_publication_trends,
    get_research_growth,
    get_students_per_department,
    get_top_departments,
    get_top_journals,
)

router = APIRouter()


@router.get("/top-departments")
async def top_departments(
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Top departments by paper count."""
    return await get_top_departments(db, limit=limit)


@router.get("/top-journals")
async def top_journals(
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Top journals by paper count."""
    return await get_top_journals(db, limit=limit)


@router.get("/publication-trends")
async def publication_trends(db: AsyncSession = Depends(get_db)):
    """Publications per year."""
    return await get_publication_trends(db)


@router.get("/citation-distribution")
async def citation_distribution(db: AsyncSession = Depends(get_db)):
    """Citation distribution in histogram buckets."""
    return await get_citation_distribution(db)


@router.get("/keyword-frequency")
async def keyword_frequency(
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Top keywords by frequency."""
    return await get_keyword_frequency(db, limit=limit)


@router.get("/paper-types")
async def paper_types(db: AsyncSession = Depends(get_db)):
    """Paper count by type."""
    return await get_paper_type_breakdown(db)


@router.get("/students-per-department")
async def students_per_department(db: AsyncSession = Depends(get_db)):
    """Student count by department."""
    return await get_students_per_department(db)


@router.get("/research-growth")
async def research_growth(db: AsyncSession = Depends(get_db)):
    """Year-over-year publication growth."""
    return await get_research_growth(db)


@router.get("/collaboration-breakdown")
async def collaboration_breakdown(db: AsyncSession = Depends(get_db)):
    """Paper count by collaboration type."""
    return await get_collaboration_breakdown(db)
