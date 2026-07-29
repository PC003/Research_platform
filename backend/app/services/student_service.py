"""Service for querying and mutating student data via PostgreSQL.

All functions accept an AsyncSession and return Pydantic models.
"""

import math

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paper import PaginatedResponse, Paper
from app.models.paper_orm import PaperORM
from app.models.student import Student
from app.models.student_schema import (
    StudentCreate,
    StudentResponse,
    StudentUpdate,
)


# ── ORM → Pydantic mapping ───────────────────────────────────────────────────


def _orm_to_response(row: Student, papers_count: int = 0) -> StudentResponse:
    """Convert a Student ORM instance to a StudentResponse."""
    return StudentResponse(
        student_id=row.student_id,
        student_name=row.student_name,
        email=row.email,
        department=row.department,
        school=row.school,
        batch=row.batch,
        profile_photo=row.profile_photo,
        linkedin_url=row.linkedin_url,
        github_url=row.github_url,
        created_at=row.created_at,
        papers_count=papers_count,
    )


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


async def get_all_students(
    db: AsyncSession,
    *,
    page: int = 1,
    limit: int = 20,
    department: str | None = None,
    school: str | None = None,
    batch: str | None = None,
) -> PaginatedResponse[StudentResponse]:
    """Return students with optional filters and pagination."""
    stmt = select(Student)

    if department:
        stmt = stmt.where(func.lower(Student.department) == department.lower())
    if school:
        stmt = stmt.where(func.lower(Student.school) == school.lower())
    if batch:
        stmt = stmt.where(Student.batch == batch)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginate
    offset = (page - 1) * limit
    stmt = stmt.order_by(Student.student_name).offset(offset).limit(limit)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    # Get paper counts for each student
    students = []
    for row in rows:
        count_q = select(func.count()).where(PaperORM.student_id == row.student_id)
        pc = (await db.execute(count_q)).scalar_one()
        students.append(_orm_to_response(row, papers_count=pc))

    return _paginate(students, total, page, limit)


async def get_student_by_id(db: AsyncSession, student_id: str) -> StudentResponse | None:
    """Look up a single student by their ID."""
    stmt = select(Student).where(Student.student_id == student_id)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    if row is None:
        return None

    # Get paper count
    count_q = select(func.count()).where(PaperORM.student_id == student_id)
    pc = (await db.execute(count_q)).scalar_one()

    return _orm_to_response(row, papers_count=pc)


async def get_student_papers(
    db: AsyncSession,
    student_id: str,
    *,
    page: int = 1,
    limit: int = 20,
) -> PaginatedResponse[Paper]:
    """Return papers belonging to a specific student."""
    from app.services.paper_service import _orm_to_paper

    stmt = select(PaperORM).where(PaperORM.student_id == student_id)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginate
    offset = (page - 1) * limit
    stmt = stmt.order_by(PaperORM.publication_year.desc().nullslast(), PaperORM.id.desc())
    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    papers = [_orm_to_paper(row) for row in rows]
    pages = math.ceil(total / limit) if limit > 0 else 0

    return PaginatedResponse(
        items=papers,
        total=total,
        page=page,
        pages=pages,
    )


async def create_student(db: AsyncSession, data: StudentCreate) -> StudentResponse:
    """Insert a new student and return the created record."""
    student = Student(
        student_id=data.student_id,
        student_name=data.student_name,
        email=data.email,
        department=data.department,
        school=data.school,
        batch=data.batch,
        profile_photo=data.profile_photo,
        linkedin_url=data.linkedin_url,
        github_url=data.github_url,
    )
    db.add(student)
    await db.flush()
    await db.refresh(student)
    return _orm_to_response(student, papers_count=0)


async def update_student(
    db: AsyncSession,
    student_id: str,
    data: StudentUpdate,
) -> StudentResponse | None:
    """Update an existing student. Returns None if not found."""
    stmt = select(Student).where(Student.student_id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if student is None:
        return None

    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(student, field, value)

    await db.flush()
    await db.refresh(student)

    count_q = select(func.count()).where(PaperORM.student_id == student_id)
    pc = (await db.execute(count_q)).scalar_one()

    return _orm_to_response(student, papers_count=pc)


async def delete_student(db: AsyncSession, student_id: str) -> bool:
    """Delete a student by ID. Returns True if deleted, False if not found."""
    stmt = select(Student).where(Student.student_id == student_id)
    result = await db.execute(stmt)
    student = result.scalar_one_or_none()

    if student is None:
        return False

    await db.delete(student)
    await db.flush()
    return True


async def search_students(
    db: AsyncSession,
    query: str,
    *,
    page: int = 1,
    limit: int = 20,
) -> PaginatedResponse[StudentResponse]:
    """Search students by name, department, or email using ILIKE."""
    search_term = f"%{query}%"

    conditions = [
        Student.student_name.ilike(search_term),
        Student.department.ilike(search_term),
        Student.email.ilike(search_term),
        Student.student_id.ilike(search_term),
    ]

    stmt = select(Student).where(or_(*conditions))

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginate
    offset = (page - 1) * limit
    stmt = stmt.order_by(Student.student_name).offset(offset).limit(limit)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    students = []
    for row in rows:
        count_q = select(func.count()).where(PaperORM.student_id == row.student_id)
        pc = (await db.execute(count_q)).scalar_one()
        students.append(_orm_to_response(row, papers_count=pc))

    return _paginate(students, total, page, limit)


# ── Metadata queries ──────────────────────────────────────────────────────────


async def get_unique_student_departments(db: AsyncSession) -> list[str]:
    """Return a sorted list of unique student department names."""
    stmt = (
        select(Student.department)
        .where(Student.department.isnot(None))
        .where(Student.department != "")
        .distinct()
        .order_by(Student.department)
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]


async def get_unique_batches(db: AsyncSession) -> list[str]:
    """Return a sorted list of unique batch values."""
    stmt = (
        select(Student.batch)
        .where(Student.batch.isnot(None))
        .where(Student.batch != "")
        .distinct()
        .order_by(Student.batch)
    )
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]
