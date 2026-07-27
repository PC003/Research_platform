"""Import demo data from papers.json into PostgreSQL.

Reads the existing JSON dataset, maps fields to the ORM schema,
and inserts records into the papers table. Skips duplicates by
checking for existing papers with the same title.

Usage:
    cd backend
    python -m scripts.import_demo_data

The script is idempotent — safe to run multiple times.
"""

import asyncio
import json
import sys
from pathlib import Path

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.base import Base
from app.models.paper_orm import PaperORM

# Import ORM models so metadata is populated
import app.models.student  # noqa: F401


async def main() -> None:
    """Load papers.json and insert into PostgreSQL."""

    # ── Locate the JSON file ──────────────────────────────────────────────
    papers_path = Path(settings.data_dir) / "papers.json"

    if not papers_path.exists():
        print(f"❌ papers.json not found at {papers_path}")
        sys.exit(1)

    with open(papers_path, "r", encoding="utf-8") as f:
        raw_papers = json.load(f)

    print(f"📄 Found {len(raw_papers)} papers in {papers_path.name}")

    # ── Connect to the database ───────────────────────────────────────────
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False,
    )

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Database tables verified.")

    # ── Import papers ─────────────────────────────────────────────────────
    imported = 0
    skipped = 0
    failed = 0

    async with session_factory() as session:
        for idx, paper_data in enumerate(raw_papers, start=1):
            title = paper_data.get("title", "").strip()
            if not title:
                print(f"   ⚠ Row {idx}: skipped — empty title")
                skipped += 1
                continue

            try:
                # Check for duplicate by title
                existing = await session.execute(
                    select(PaperORM.id).where(PaperORM.paper_title == title).limit(1)
                )
                if existing.scalar_one_or_none() is not None:
                    skipped += 1
                    continue

                # Map JSON fields → ORM columns
                paper = PaperORM(
                    paper_title=title,
                    authors=paper_data.get("authors", []),
                    abstract=paper_data.get("abstract", ""),
                    keywords=paper_data.get("keywords", []),
                    department=paper_data.get("department", ""),
                    school=paper_data.get("school"),
                    publication_year=paper_data.get("year"),
                    journal_name=paper_data.get("journal", ""),
                    pdf_url=paper_data.get("pdf_url", ""),
                    paper_type=paper_data.get("paper_type", "Journal"),
                    status="Published",
                )

                session.add(paper)
                imported += 1

            except Exception as e:
                print(f"   ❌ Row {idx} ({title[:40]}): {e}")
                failed += 1

        # Commit all inserts in a single transaction
        await session.commit()

    # ── Summary ───────────────────────────────────────────────────────────
    print()
    print("─" * 50)
    print(f"   ✅ Imported : {imported}")
    print(f"   ⏭  Skipped  : {skipped}")
    print(f"   ❌ Failed   : {failed}")
    print(f"   📊 Total    : {imported + skipped + failed}")
    print("─" * 50)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
