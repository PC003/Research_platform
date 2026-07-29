"""Paper endpoints — full CRUD, hybrid search, filters, sorting, and pagination.

All routes use dependency injection to access the database session.
Everything comes from PostgreSQL — no JSON files.
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
    get_unique_journals,
    get_unique_paper_types,
    get_unique_schools,
    get_year_range,
    update_paper,
)
from app.services.search_service import (
    SearchMode,
    SortOrder,
    hybrid_search,
)

router = APIRouter()


# ── Search (must be before /{paper_id} to avoid path conflict) ───────────────


@router.get("/search", response_model=SearchResponse)
async def search_papers(
    q: str = Query(..., min_length=1, description="Search query"),
    mode: str = Query(
        default="hybrid",
        description="Search mode: hybrid, semantic, keyword",
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(
        default=None,
        ge=1,
        le=100,
        description="Results per page",
    ),
    sort: str = Query(
        default="relevance",
        description="Sort: relevance, newest, oldest, citations_desc, impact_desc, alphabetical",
    ),
    department: str | None = Query(default=None, description="Filter by department"),
    school: str | None = Query(default=None, description="Filter by school"),
    year: int | None = Query(default=None, description="Filter by exact year"),
    year_from: int | None = Query(default=None, description="Filter by year (from)"),
    year_to: int | None = Query(default=None, description="Filter by year (to)"),
    author: str | None = Query(default=None, description="Filter by author name"),
    journal: str | None = Query(default=None, description="Filter by journal"),
    conference: str | None = Query(default=None, description="Filter by conference"),
    paper_type: str | None = Query(default=None, description="Filter by paper type"),
    status: str | None = Query(default=None, description="Filter by status"),
    citation_min: int | None = Query(default=None, description="Min citations"),
    citation_max: int | None = Query(default=None, description="Max citations"),
    impact_factor_min: float | None = Query(default=None, description="Min impact factor"),
    db: AsyncSession = Depends(get_db),
):
    """Search papers using hybrid (keyword + semantic), semantic-only, or keyword-only.

    Default mode is hybrid: 60% semantic + 40% keyword relevance score.
    Supports all filters, sorting, and pagination.
    """
    if limit is None:
        limit = settings.default_search_limit

    # Parse enums
    try:
        search_mode = SearchMode(mode)
    except ValueError:
        search_mode = SearchMode.HYBRID

    try:
        sort_order = SortOrder(sort)
    except ValueError:
        sort_order = SortOrder.RELEVANCE

    return await hybrid_search(
        db,
        q,
        mode=search_mode,
        page=page,
        limit=limit,
        sort=sort_order,
        department=department,
        school=school,
        year=year,
        year_from=year_from,
        year_to=year_to,
        author=author,
        journal=journal,
        conference=conference,
        paper_type=paper_type,
        status=status,
        citation_min=citation_min,
        citation_max=citation_max,
        impact_factor_min=impact_factor_min,
    )


# ── Metadata endpoints ───────────────────────────────────────────────────────


@router.get("/meta/departments", response_model=list[str])
async def list_departments(db: AsyncSession = Depends(get_db)):
    """Return a sorted list of unique department names for filter dropdowns."""
    return await get_unique_departments(db)


@router.get("/meta/schools", response_model=list[str])
async def list_schools(db: AsyncSession = Depends(get_db)):
    """Return a sorted list of unique school names for filter dropdowns."""
    return await get_unique_schools(db)


@router.get("/meta/journals", response_model=list[str])
async def list_journals(db: AsyncSession = Depends(get_db)):
    """Return a sorted list of unique journal names for filter dropdowns."""
    return await get_unique_journals(db)


@router.get("/meta/paper-types", response_model=list[str])
async def list_paper_types(db: AsyncSession = Depends(get_db)):
    """Return a sorted list of unique paper types."""
    return await get_unique_paper_types(db)


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
    sort: str = Query(
        default="newest",
        description="Sort: newest, oldest, citations_desc, impact_desc, alphabetical",
    ),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(
        default=None,
        ge=1,
        le=100,
        description="Papers per page",
    ),
    db: AsyncSession = Depends(get_db),
):
    """Return all papers with optional filters, sorting, and pagination."""
    if limit is None:
        limit = settings.default_page_size

    return await get_all_papers(
        db,
        page=page,
        limit=limit,
        department=department,
        school=school,
        year=year,
        sort=sort,
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
