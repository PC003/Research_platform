"""SQLAlchemy ORM model for the papers table.

Named PaperORM to avoid collision with the existing Pydantic Paper model.
"""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    ARRAY,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class PaperORM(Base):
    """Represents a published research paper."""

    __tablename__ = "papers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[str | None] = mapped_column(
        String(10),
        ForeignKey("students.student_id", ondelete="SET NULL"),
    )

    # ── Core metadata ─────────────────────────────────────────────────────
    paper_title: Mapped[str] = mapped_column(Text, nullable=False)
    authors: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    abstract: Mapped[str | None] = mapped_column(Text)
    keywords: Mapped[list[str] | None] = mapped_column(ARRAY(Text))
    department: Mapped[str | None] = mapped_column(String(100))
    school: Mapped[str | None] = mapped_column(String(100))

    # ── Publication details ───────────────────────────────────────────────
    publication_date: Mapped[date | None] = mapped_column(Date)
    publication_year: Mapped[int | None] = mapped_column(Integer)
    journal_name: Mapped[str | None] = mapped_column(String(200))
    conference_name: Mapped[str | None] = mapped_column(String(200))
    paper_type: Mapped[str | None] = mapped_column(
        String(50), comment="Journal, Conference, Patent, Book Chapter",
    )
    doi: Mapped[str | None] = mapped_column(String(200))
    paper_link: Mapped[str | None] = mapped_column(Text)

    # ── File URLs (Cloudinary / S3) ───────────────────────────────────────
    pdf_url: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(
        Text, comment="Research image / thumbnail URL",
    )

    # ── Metrics ───────────────────────────────────────────────────────────
    citation_count: Mapped[int] = mapped_column(Integer, default=0)
    impact_factor: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    collaboration_type: Mapped[str | None] = mapped_column(
        String(100), comment="Individual, National, International",
    )
    status: Mapped[str] = mapped_column(String(30), default="Published")

    # ── Search & timestamps ───────────────────────────────────────────────
    search_text: Mapped[str | None] = mapped_column(
        Text, comment="Auto-populated by trigger",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow,
    )

    # ── Relationships ─────────────────────────────────────────────────────
    student: Mapped["Student | None"] = relationship(
        "Student", back_populates="papers",
    )
    embedding: Mapped["PaperEmbedding | None"] = relationship(
        "PaperEmbedding", back_populates="paper", uselist=False,
    )

    def __repr__(self) -> str:
        return f"<PaperORM id={self.id} title={self.paper_title[:40]}>"
