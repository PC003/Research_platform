"""Service for querying and mutating paper data via PostgreSQL.

All functions accept an AsyncSession and return Pydantic models.
The ORM-to-Pydantic mapping handles the field name differences
(e.g. paper_title → title, publication_year → year).

Search functionality has been moved to search_service.py.
"""

import math

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paper import (
    PaginatedResponse,
    Paper,
    PaperCreate,
    PaperSummary,
    PaperUpdate,
)
from app.models.paper_orm import PaperORM


# ── ORM → Pydantic mapping ───────────────────────────────────────────────────


def _orm_to_paper(row: PaperORM) -> Paper:
    """Convert a PaperORM instance to a full Paper Pydantic model.

    Maps database column names to the frontend-facing field names:
    - paper_title → title
    - publication_year → year
    - journal_name → journal
    """
    return Paper(
        id=row.id,
        title=row.paper_title,
        authors=row.authors or [],
        abstract=row.abstract or "",
        keywords=row.keywords or [],
        department=row.department or "",
        year=row.publication_year or 0,
        journal=row.journal_name or "",
        pdf_url=row.pdf_url or "",
        student_id=row.student_id,
        school=row.school,
        publication_date=row.publication_date,
        conference_name=row.conference_name,
        paper_type=row.paper_type,
        doi=row.doi,
        paper_link=row.paper_link,
        photo_url=row.photo_url,
        citation_count=row.citation_count or 0,
        impact_factor=row.impact_factor,
        collaboration_type=row.collaboration_type,
        status=row.status or "Published",
        search_text=row.search_text,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _pydantic_to_orm_fields(data: PaperCreate) -> dict:
    """Map PaperCreate fields to PaperORM column names for INSERT."""
    return {
        "paper_title": data.title,
        "authors": data.authors,
        "abstract": data.abstract,
        "keywords": data.keywords,
        "department": data.department,
        "school": data.school,
        "publication_year": data.year,
        "publication_date": data.publication_date,
        "journal_name": data.journal,
        "conference_name": data.conference_name,
        "paper_type": data.paper_type,
        "doi": data.doi,
        "paper_link": data.paper_link,
        "pdf_url": data.pdf_url,
        "photo_url": data.photo_url,
        "citation_count": data.citation_count,
        "impact_factor": data.impact_factor,
        "collaboration_type": data.collaboration_type,
        "status": data.status,
        "student_id": data.student_id,
    }


def _pydantic_update_to_orm_fields(data: PaperUpdate) -> dict:
    """Map PaperUpdate fields to PaperORM column names.

    Only includes fields that were explicitly set (not None).
    """
    field_map = {
        "title": "paper_title",
        "authors": "authors",
        "abstract": "abstract",
        "keywords": "keywords",
        "department": "department",
        "school": "school",
        "year": "publication_year",
        "publication_date": "publication_date",
        "journal": "journal_name",
        "conference_name": "conference_name",
        "paper_type": "paper_type",
        "doi": "doi",
        "paper_link": "paper_link",
        "pdf_url": "pdf_url",
        "photo_url": "photo_url",
        "citation_count": "citation_count",
        "impact_factor": "impact_factor",
        "collaboration_type": "collaboration_type",
        "status": "status",
        "student_id": "student_id",
    }

    # Only include fields that were explicitly provided
    updates = {}
    provided = data.model_dump(exclude_unset=True)
    for pydantic_field, orm_field in field_map.items():
        if pydantic_field in provided:
            updates[orm_field] = provided[pydantic_field]

    return updates


# ── Pagination helper ─────────────────────────────────────────────────────────


def _paginate(
    items: list,
    total: int,
    page: int,
    limit: int,
) -> PaginatedResponse:
    """Build a paginated response envelope."""
    pages = math.ceil(total / limit) if limit > 0 else 0
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        pages=pages,
    )


# ── CRUD operations ──────────────────────────────────────────────────────────


async def get_all_papers(
    db: AsyncSession,
    *,
    page: int = 1,
    limit: int = 20,
    department: str | None = None,
    school: str | None = None,
    year: int | None = None,
    sort: str = "newest",
) -> PaginatedResponse[Paper]:
    """Return papers with optional filters, sorting, and pagination."""
    stmt = select(PaperORM)

    # Apply filters
    if department:
        stmt = stmt.where(
            func.lower(PaperORM.department) == department.lower()
        )
    if school:
        stmt = stmt.where(
            func.lower(PaperORM.school) == school.lower()
        )
    if year:
        stmt = stmt.where(PaperORM.publication_year == year)

    # Count total before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Apply sorting
    if sort == "newest":
        stmt = stmt.order_by(PaperORM.publication_year.desc().nullslast(), PaperORM.id.desc())
    elif sort == "oldest":
        stmt = stmt.order_by(PaperORM.publication_year.asc().nullsfirst(), PaperORM.id.asc())
    elif sort == "citations_desc":
        stmt = stmt.order_by(PaperORM.citation_count.desc().nullslast(), PaperORM.id.desc())
    elif sort == "impact_desc":
        stmt = stmt.order_by(PaperORM.impact_factor.desc().nullslast(), PaperORM.id.desc())
    elif sort == "alphabetical":
        stmt = stmt.order_by(PaperORM.paper_title.asc())
    else:
        stmt = stmt.order_by(PaperORM.id.desc())

    # Apply pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    papers = [_orm_to_paper(row) for row in rows]
    return _paginate(papers, total, page, limit)


async def get_paper_by_id(db: AsyncSession, paper_id: int) -> Paper | None:
    """Look up a single paper by its primary key."""
    stmt = select(PaperORM).where(PaperORM.id == paper_id)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    if row is None:
        return None

    return _orm_to_paper(row)


async def create_paper(db: AsyncSession, data: PaperCreate) -> Paper:
    """Insert a new paper and return the created record."""
    orm_fields = _pydantic_to_orm_fields(data)
    paper = PaperORM(**orm_fields)
    db.add(paper)
    await db.flush()
    await db.refresh(paper)
    return _orm_to_paper(paper)


async def update_paper(
    db: AsyncSession,
    paper_id: int,
    data: PaperUpdate,
) -> Paper | None:
    """Update an existing paper. Returns None if not found."""
    stmt = select(PaperORM).where(PaperORM.id == paper_id)
    result = await db.execute(stmt)
    paper = result.scalar_one_or_none()

    if paper is None:
        return None

    updates = _pydantic_update_to_orm_fields(data)
    for field, value in updates.items():
        setattr(paper, field, value)

    await db.flush()
    await db.refresh(paper)
    return _orm_to_paper(paper)


async def delete_paper(db: AsyncSession, paper_id: int) -> bool:
    """Delete a paper by ID. Returns True if deleted, False if not found."""
    stmt = select(PaperORM).where(PaperORM.id == paper_id)
    result = await db.execute(stmt)
    paper = result.scalar_one_or_none()

    if paper is None:
        return False

    await db.delete(paper)
    await db.flush()
    return True


# ── Metadata queries ──────────────────────────────────────────────────────────


async def get_unique_departments(db: AsyncSession) -> list[str]:
    """Return a sorted list of unique department names."""
    stmt = (
        select(PaperORM.department)
        .where(PaperORM.department.isnot(None))
        .where(PaperORM.department != "")
        .distinct()
        .order_by(PaperORM.department)
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def get_unique_schools(db: AsyncSession) -> list[str]:
    """Return a sorted list of unique school names."""
    stmt = (
        select(PaperORM.school)
        .where(PaperORM.school.isnot(None))
        .where(PaperORM.school != "")
        .distinct()
        .order_by(PaperORM.school)
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def get_unique_journals(db: AsyncSession) -> list[str]:
    """Return a sorted list of unique journal names."""
    stmt = (
        select(PaperORM.journal_name)
        .where(PaperORM.journal_name.isnot(None))
        .where(PaperORM.journal_name != "")
        .distinct()
        .order_by(PaperORM.journal_name)
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def get_unique_paper_types(db: AsyncSession) -> list[str]:
    """Return a sorted list of unique paper types."""
    stmt = (
        select(PaperORM.paper_type)
        .where(PaperORM.paper_type.isnot(None))
        .where(PaperORM.paper_type != "")
        .distinct()
        .order_by(PaperORM.paper_type)
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def get_year_range(db: AsyncSession) -> dict[str, int]:
    """Return the min and max publication years."""
    stmt = select(
        func.min(PaperORM.publication_year),
        func.max(PaperORM.publication_year),
    ).where(PaperORM.publication_year.isnot(None))

    result = await db.execute(stmt)
    row = result.one()

    return {
        "min_year": row[0] or 0,
        "max_year": row[1] or 0,
    }


async def check_db_connection(db: AsyncSession) -> bool:
    """Verify the database is reachable with a simple SELECT 1."""
    try:
        await db.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
