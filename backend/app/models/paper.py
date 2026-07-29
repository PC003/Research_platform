"""Pydantic models for research papers.

Provides request/response schemas for the paper API endpoints.
Field names match the frontend contract (title, year, journal)
while the ORM uses database-style names (paper_title, publication_year, journal_name).
The service layer handles the mapping between the two.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Generic, TypeVar

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field, field_validator


# ── Enums ─────────────────────────────────────────────────────────────────────


class PaperType(str, Enum):
    JOURNAL = "Journal"
    CONFERENCE = "Conference"
    PATENT = "Patent"
    BOOK_CHAPTER = "Book Chapter"


class CollaborationType(str, Enum):
    INDIVIDUAL = "Individual"
    NATIONAL = "National"
    INTERNATIONAL = "International"


class PaperStatus(str, Enum):
    PUBLISHED = "Published"
    UNDER_REVIEW = "Under Review"
    ACCEPTED = "Accepted"
    PREPRINT = "Preprint"


# ── Generic pagination wrapper ────────────────────────────────────────────────

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper used by list endpoints."""

    items: list[T]
    total: int = Field(description="Total number of records matching the query")
    page: int = Field(description="Current page number (1-indexed)")
    pages: int = Field(description="Total number of pages")


# ── Response schemas ──────────────────────────────────────────────────────────


class Paper(BaseModel):
    """Full paper schema returned by detail endpoints.

    Field names match the original frontend contract.
    """

    id: int
    title: str
    authors: list[str] = []
    abstract: str = ""
    keywords: list[str] = []
    department: str = ""
    year: int = 0
    journal: str = ""
    pdf_url: str = ""

    # Extended fields from the PostgreSQL schema
    student_id: str | None = None
    school: str | None = None
    publication_date: date | None = None
    conference_name: str | None = None
    paper_type: str | None = None
    doi: str | None = None
    paper_link: str | None = None
    photo_url: str | None = None
    citation_count: int = 0
    impact_factor: Decimal | None = None
    collaboration_type: str | None = None
    status: str = "Published"
    search_text: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class PaperSummary(BaseModel):
    """Lightweight schema used in list views and search result cards."""

    id: int
    title: str
    authors: list[str] = []
    department: str = ""
    year: int = 0
    journal: str = ""
    keywords: list[str] = []
    abstract: str = Field(
        default="",
        description="Truncated abstract for preview cards",
    )
    school: str | None = None
    paper_type: str | None = None
    citation_count: int = 0


# ── Request schemas ───────────────────────────────────────────────────────────


class PaperCreate(BaseModel):
    """Input schema for creating a new paper (POST /papers)."""

    title: str = Field(..., min_length=1, description="Paper title")
    authors: list[str] = Field(default_factory=list)
    abstract: str = ""
    keywords: list[str] = Field(default_factory=list)
    department: str = ""
    school: str | None = None
    year: int | None = Field(default=None, description="Publication year")
    publication_date: date | None = None
    journal: str = ""
    conference_name: str | None = None
    paper_type: str | None = Field(
        default=None,
        description="Journal, Conference, Patent, or Book Chapter",
    )
    doi: str | None = None
    paper_link: str | None = None
    pdf_url: str = ""
    photo_url: str | None = None
    citation_count: int = 0
    impact_factor: Decimal | None = None
    collaboration_type: str | None = Field(
        default=None,
        description="Individual, National, or International",
    )
    status: str = "Published"
    student_id: str | None = None

    @field_validator("paper_type")
    @classmethod
    def validate_paper_type(cls, v):
        if v is not None:
            valid = [e.value for e in PaperType]
            if v not in valid:
                raise ValueError(f"paper_type must be one of {valid}")
        return v

    @field_validator("collaboration_type")
    @classmethod
    def validate_collaboration_type(cls, v):
        if v is not None:
            valid = [e.value for e in CollaborationType]
            if v not in valid:
                raise ValueError(f"collaboration_type must be one of {valid}")
        return v

    @field_validator("doi")
    @classmethod
    def validate_doi(cls, v):
        if v is not None and v != "":
            if not v.startswith("10."):
                raise ValueError("DOI must start with '10.'")
        return v


class PaperUpdate(BaseModel):
    """Input schema for updating a paper (PUT /papers/{id}).

    All fields are optional — only provided fields are updated.
    """

    title: str | None = None
    authors: list[str] | None = None
    abstract: str | None = None
    keywords: list[str] | None = None
    department: str | None = None
    school: str | None = None
    year: int | None = None
    publication_date: date | None = None
    journal: str | None = None
    conference_name: str | None = None
    paper_type: str | None = None
    doi: str | None = None
    paper_link: str | None = None
    pdf_url: str | None = None
    photo_url: str | None = None
    citation_count: int | None = None
    impact_factor: Decimal | None = None
    collaboration_type: str | None = None
    status: str | None = None
    student_id: str | None = None


# ── Search schemas ────────────────────────────────────────────────────────────


class SearchResult(BaseModel):
    """A single search hit with its relevance score."""

    paper: PaperSummary
    score: float = Field(
        ge=0.0,
        le=1.0,
        description="Relevance score (0–1)",
    )


class SearchResponse(BaseModel):
    """Wrapper for the list of search results."""

    query: str
    total: int
    results: list[SearchResult]
    search_mode: str = "hybrid"
