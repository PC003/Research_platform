"""SQLAlchemy ORM model for the students table."""

from datetime import datetime

from sqlalchemy import String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Student(Base):
    """Represents an undergraduate student who has published research."""

    __tablename__ = "students"

    student_id: Mapped[str] = mapped_column(
        String(10), primary_key=True, comment="e.g. 24BCE1234",
    )
    student_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(String(150))
    department: Mapped[str | None] = mapped_column(String(100))
    school: Mapped[str | None] = mapped_column(String(100))
    batch: Mapped[str | None] = mapped_column(String(20))
    profile_photo: Mapped[str | None] = mapped_column(
        Text, comment="Cloudinary / S3 URL",
    )
    photo_url: Mapped[str | None] = mapped_column(Text)
    photo_public_id: Mapped[str | None] = mapped_column(Text)
    linkedin_url: Mapped[str | None] = mapped_column(Text)
    github_url: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow,
    )

    # ── Relationships ─────────────────────────────────────────────────────
    papers: Mapped[list["PaperORM"]] = relationship(
        "PaperORM", back_populates="student", lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Student {self.student_id} — {self.student_name}>"
