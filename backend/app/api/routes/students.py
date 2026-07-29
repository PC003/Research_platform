"""Student endpoints — CRUD, search, and metadata.

All routes use dependency injection to access the database session.
"""

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.database import get_db
from app.models.paper import PaginatedResponse, Paper
from app.models.student_schema import (
    StudentCreate,
    StudentResponse,
    StudentUpdate,
)
from app.services.student_service import (
    create_student,
    delete_student,
    get_all_students,
    get_student_by_id,
    get_student_papers,
    get_unique_batches,
    get_unique_student_departments,
    search_students,
    update_student,
)

router = APIRouter()


# ── Search (before /{student_id} to avoid path conflict) ─────────────────────


@router.get("/search", response_model=PaginatedResponse[StudentResponse])
async def search_students_endpoint(
    q: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=None, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Search students by name, department, email, or student ID."""
    if limit is None:
        limit = settings.default_page_size
    return await search_students(db, q, page=page, limit=limit)


# ── Metadata endpoints ───────────────────────────────────────────────────────


@router.get("/meta/departments", response_model=list[str])
async def list_student_departments(db: AsyncSession = Depends(get_db)):
    """Return unique student departments for filter dropdowns."""
    return await get_unique_student_departments(db)


@router.get("/meta/batches", response_model=list[str])
async def list_batches(db: AsyncSession = Depends(get_db)):
    """Return unique batch values for filter dropdowns."""
    return await get_unique_batches(db)


# ── List students ────────────────────────────────────────────────────────────


@router.get("", response_model=PaginatedResponse[StudentResponse])
async def list_students(
    department: str | None = Query(default=None, description="Filter by department"),
    school: str | None = Query(default=None, description="Filter by school"),
    batch: str | None = Query(default=None, description="Filter by batch"),
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=None, ge=1, le=100, description="Students per page"),
    db: AsyncSession = Depends(get_db),
):
    """Return all students with optional filters and pagination."""
    if limit is None:
        limit = settings.default_page_size
    return await get_all_students(
        db, page=page, limit=limit,
        department=department, school=school, batch=batch,
    )


# ── Single student CRUD ──────────────────────────────────────────────────────


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: str, db: AsyncSession = Depends(get_db)):
    """Return a single student by ID, or 404."""
    student = await get_student_by_id(db, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
    return student


@router.get("/{student_id}/papers", response_model=PaginatedResponse[Paper])
async def get_papers_by_student(
    student_id: str,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=None, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Return papers by a specific student."""
    if limit is None:
        limit = settings.default_page_size

    # Verify student exists
    student = await get_student_by_id(db, student_id)
    if student is None:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")

    return await get_student_papers(db, student_id, page=page, limit=limit)


@router.post("", response_model=StudentResponse, status_code=201)
async def create_new_student(
    data: StudentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new student profile."""
    return await create_student(db, data)


@router.put("/{student_id}", response_model=StudentResponse)
async def update_existing_student(
    student_id: str,
    data: StudentUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a student profile. Returns 404 if not found."""
    student = await update_student(db, student_id, data)
    if student is None:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
    return student


@router.delete("/{student_id}", status_code=204)
async def delete_existing_student(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a student. Returns 204 on success, 404 if not found."""
    deleted = await delete_student(db, student_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
