"""Paper endpoints — full CRUD, keyword search, filters, and pagination.

All routes use dependency injection to access the database session.
No JSON file is read — everything comes from PostgreSQL.
"""

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.models.paper import (
    PaginatedResponse,
    Paper,
    PaperCreate,
    PaperUpdate,
    SearchResponse,
)
from app.services.paper_service import (
    create_paper,
    delete_paper,
    get_all_papers,
    get_paper_by_id,
    get_unique_departments,
    get_unique_schools,
    get_year_range,
    search_papers_keyword,
    update_paper,
)

router = APIRouter()


# ── Keyword search (must be before /{paper_id} to avoid path conflict) ───────


@router.get("/search", response_model=SearchResponse)
async def search_papers(
    q: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(
        default=None,
        ge=1,
        le=100,
        description="Results per page",
    ),
    db: AsyncSession = Depends(get_db),
):
    """Search papers by keyword across title, authors, journal, department, and keywords.

    Uses PostgreSQL ILIKE for case-insensitive pattern matching.
    Results are ranked by how many fields match the query.
    """
    if limit is None:
        limit = settings.default_page_size

    return await search_papers_keyword(db, q, page=page, limit=limit)


# ── Metadata endpoints ───────────────────────────────────────────────────────


@router.get("/meta/departments", response_model=list[str])
async def list_departments(db: AsyncSession = Depends(get_db)):
    """Return a sorted list of unique department names for filter dropdowns."""
    return await get_unique_departments(db)


@router.get("/meta/schools", response_model=list[str])
async def list_schools(db: AsyncSession = Depends(get_db)):
    """Return a sorted list of unique school names for filter dropdowns."""
    return await get_unique_schools(db)


@router.get("/meta/years")
async def list_year_range(db: AsyncSession = Depends(get_db)):
    """Return the min and max publication years in the dataset."""
    return await get_year_range(db)


# ── List papers ──────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedResponse[Paper])
async def list_papers(
    department: str | None = Query(default=None, description="Filter by department"),
    school: str | None = Query(default=None, description="Filter by school"),
    year: int | None = Query(default=None, description="Filter by publication year"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(
        default=None,
        ge=1,
        le=100,
        description="Papers per page",
    ),
    db: AsyncSession = Depends(get_db),
):
    """Return all papers with optional filters and pagination."""
    if limit is None:
        limit = settings.default_page_size

    return await get_all_papers(
        db,
        page=page,
        limit=limit,
        department=department,
        school=school,
        year=year,
    )


# ── Single paper CRUD ────────────────────────────────────────────────────────


@router.get("/{paper_id}", response_model=Paper)
async def get_paper(paper_id: int, db: AsyncSession = Depends(get_db)):
    """Return a single paper by ID, or 404 if not found."""
    paper = await get_paper_by_id(db, paper_id)

    if paper is None:
        raise HTTPException(
            status_code=404,
            detail=f"Paper with id {paper_id} not found",
        )

    return paper


@router.post("", response_model=Paper, status_code=201)
async def create_new_paper(
    data: PaperCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new paper and return the created record."""
    return await create_paper(db, data)


@router.put("/{paper_id}", response_model=Paper)
async def update_existing_paper(
    paper_id: int,
    data: PaperUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing paper. Returns 404 if not found."""
    paper = await update_paper(db, paper_id, data)

    if paper is None:
        raise HTTPException(
            status_code=404,
            detail=f"Paper with id {paper_id} not found",
        )

    return paper


@router.delete("/{paper_id}", status_code=204)
async def delete_existing_paper(
    paper_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a paper by ID. Returns 204 on success, 404 if not found."""
    deleted = await delete_paper(db, paper_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Paper with id {paper_id} not found",
        )
