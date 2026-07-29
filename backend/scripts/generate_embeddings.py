"""Generate embeddings for all papers and insert into paper_embeddings.

Loads papers from PostgreSQL, generates embeddings using
sentence-transformers/all-MiniLM-L6-v2, and inserts into
the paper_embeddings table via UPSERT.

Usage:
    cd backend
    python -m scripts.generate_embeddings
"""

import asyncio
import sys
from pathlib import Path

from tqdm import tqdm

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.models.base import Base
from app.models.paper_orm import PaperORM
from app.models.paper_embedding import PaperEmbedding, EMBEDDING_DIM
from app.utils.embeddings import build_search_text, get_embeddings_batch

# Import all ORM models
import app.models.student  # noqa: F401

BATCH_SIZE = 64


async def main() -> None:
    """Generate and insert embeddings for all papers."""

    print("🧠 Embedding generation starting...")
    print(f"   Model: {settings.embedding_model}")
    print(f"   Dimension: {EMBEDDING_DIM}")
    print()

    # Connect to database
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False,
    )

    async with session_factory() as session:
        # Get all papers that don't have embeddings yet
        stmt = (
            select(PaperORM)
            .outerjoin(PaperEmbedding, PaperORM.id == PaperEmbedding.paper_id)
            .where(PaperEmbedding.paper_id.is_(None))
            .order_by(PaperORM.id)
        )
        result = await session.execute(stmt)
        papers = result.scalars().all()

        if not papers:
            print("✅ All papers already have embeddings. Nothing to do.")
            await engine.dispose()
            return

        print(f"   📄 Found {len(papers)} papers without embeddings")
        print()

        # Process in batches
        total_inserted = 0

        for i in tqdm(range(0, len(papers), BATCH_SIZE), desc="Generating embeddings"):
            batch_papers = papers[i : i + BATCH_SIZE]

            # Build search texts
            texts = [
                build_search_text(
                    title=p.paper_title or "",
                    abstract=p.abstract or "",
                    keywords=p.keywords,
                    authors=p.authors,
                )
                for p in batch_papers
            ]

            # Generate embeddings
            embeddings = get_embeddings_batch(texts, batch_size=BATCH_SIZE)

            # Insert into paper_embeddings
            for paper, embedding in zip(batch_papers, embeddings):
                stmt = pg_insert(PaperEmbedding).values(
                    paper_id=paper.id,
                    embedding=embedding,
                )
                stmt = stmt.on_conflict_do_nothing(index_elements=["paper_id"])
                await session.execute(stmt)
                total_inserted += 1

            await session.flush()

        await session.commit()

    # Summary
    print()
    print("─" * 50)
    print(f"   🧠 Embeddings generated : {total_inserted}")
    print(f"   📐 Dimension            : {EMBEDDING_DIM}")
    print("─" * 50)
    print()
    print("✅ Embedding generation complete!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
