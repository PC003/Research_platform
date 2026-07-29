"""Pydantic schemas for student profiles.

These schemas define the API request/response shapes for student endpoints.
"""

from datetime import datetime

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field, EmailStr


class StudentBase(BaseModel):
    """Shared fields across student schemas."""

    student_id: str = Field(
        ...,
        max_length=10,
        description="University registration number, e.g. 24BCE1234",
    )
    student_name: str = Field(..., max_length=100)
    email: str | None = Field(default=None, max_length=150)
    department: str | None = Field(default=None, max_length=100)
    school: str | None = Field(default=None, max_length=100)
    batch: str | None = Field(default=None, max_length=20)
    profile_photo: str | None = Field(
        default=None,
        description="Cloudinary / S3 URL",
    )
    linkedin_url: str | None = None
    github_url: str | None = None


class StudentCreate(StudentBase):
    """Input schema for creating a new student profile."""

    pass


class StudentUpdate(BaseModel):
    """Input schema for updating a student profile.

    All fields are optional — only provided fields are updated.
    """

    student_name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=150)
    department: str | None = Field(default=None, max_length=100)
    school: str | None = Field(default=None, max_length=100)
    batch: str | None = Field(default=None, max_length=20)
    profile_photo: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None


class StudentResponse(StudentBase):
    """Response schema returned by student endpoints."""

    created_at: datetime | None = None
    papers_count: int = Field(
        default=0,
        description="Total number of papers by this student",
    )

    class Config:
        from_attributes = True
