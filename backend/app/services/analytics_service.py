"""Analytics service — aggregation queries for the dashboard.

All functions run pure PostgreSQL aggregations and return
simple dicts suitable for JSON serialization.
"""

from sqlalchemy import func, select, text, case, literal_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.paper_orm import PaperORM
from app.models.student import Student


async def get_top_departments(db: AsyncSession, limit: int = 10) -> list[dict]:
    """Top departments by paper count."""
    stmt = (
        select(
            PaperORM.department,
            func.count().label("count"),
        )
        .where(PaperORM.department.isnot(None))
        .where(PaperORM.department != "")
        .group_by(PaperORM.department)
        .order_by(func.count().desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [{"department": row[0], "count": row[1]} for row in result.all()]


async def get_top_journals(db: AsyncSession, limit: int = 10) -> list[dict]:
    """Top journals by paper count."""
    stmt = (
        select(
            PaperORM.journal_name,
            func.count().label("count"),
        )
        .where(PaperORM.journal_name.isnot(None))
        .where(PaperORM.journal_name != "")
        .group_by(PaperORM.journal_name)
        .order_by(func.count().desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [{"journal": row[0], "count": row[1]} for row in result.all()]


async def get_publication_trends(db: AsyncSession) -> list[dict]:
    """Publications per year."""
    stmt = (
        select(
            PaperORM.publication_year,
            func.count().label("count"),
        )
        .where(PaperORM.publication_year.isnot(None))
        .group_by(PaperORM.publication_year)
        .order_by(PaperORM.publication_year)
    )
    result = await db.execute(stmt)
    return [{"year": row[0], "count": row[1]} for row in result.all()]


async def get_citation_distribution(db: AsyncSession) -> list[dict]:
    """Citation distribution in histogram buckets."""
    buckets = [
        (0, 0, "0"),
        (1, 5, "1-5"),
        (6, 20, "6-20"),
        (21, 50, "21-50"),
        (51, 100, "51-100"),
        (101, None, "100+"),
    ]

    results = []
    for low, high, label in buckets:
        stmt = select(func.count())
        if high is not None:
            stmt = stmt.where(
                PaperORM.citation_count.between(low, high)
            )
        else:
            stmt = stmt.where(PaperORM.citation_count >= low)

        count = (await db.execute(stmt)).scalar_one()
        results.append({"range": label, "count": count})

    return results


async def get_keyword_frequency(db: AsyncSession, limit: int = 50) -> list[dict]:
    """Top keywords by frequency (unnests the keywords array)."""
    stmt = text("""
        SELECT keyword, COUNT(*) as count
        FROM papers, unnest(keywords) AS keyword
        WHERE keyword IS NOT NULL AND keyword != ''
        GROUP BY keyword
        ORDER BY count DESC
        LIMIT :limit
    """)
    result = await db.execute(stmt, {"limit": limit})
    return [{"keyword": row[0], "count": row[1]} for row in result.all()]


async def get_paper_type_breakdown(db: AsyncSession) -> list[dict]:
    """Paper count by type."""
    stmt = (
        select(
            PaperORM.paper_type,
            func.count().label("count"),
        )
        .where(PaperORM.paper_type.isnot(None))
        .where(PaperORM.paper_type != "")
        .group_by(PaperORM.paper_type)
        .order_by(func.count().desc())
    )
    result = await db.execute(stmt)
    return [{"type": row[0], "count": row[1]} for row in result.all()]


async def get_students_per_department(db: AsyncSession) -> list[dict]:
    """Student count by department."""
    stmt = (
        select(
            Student.department,
            func.count().label("count"),
        )
        .where(Student.department.isnot(None))
        .where(Student.department != "")
        .group_by(Student.department)
        .order_by(func.count().desc())
    )
    result = await db.execute(stmt)
    return [{"department": row[0], "count": row[1]} for row in result.all()]


async def get_research_growth(db: AsyncSession) -> list[dict]:
    """Year-over-year publication growth with delta."""
    trends = await get_publication_trends(db)

    growth = []
    for i, entry in enumerate(trends):
        prev_count = trends[i - 1]["count"] if i > 0 else 0
        delta = entry["count"] - prev_count
        growth_pct = round((delta / prev_count * 100), 1) if prev_count > 0 else 0.0
        growth.append({
            "year": entry["year"],
            "count": entry["count"],
            "delta": delta,
            "growth_percent": growth_pct,
        })

    return growth


async def get_collaboration_breakdown(db: AsyncSession) -> list[dict]:
    """Paper count by collaboration type."""
    stmt = (
        select(
            PaperORM.collaboration_type,
            func.count().label("count"),
        )
        .where(PaperORM.collaboration_type.isnot(None))
        .where(PaperORM.collaboration_type != "")
        .group_by(PaperORM.collaboration_type)
        .order_by(func.count().desc())
    )
    result = await db.execute(stmt)
    return [{"type": row[0], "count": row[1]} for row in result.all()]
