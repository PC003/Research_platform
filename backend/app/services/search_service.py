"""Search service — semantic, keyword, and hybrid search.

Provides three search modes:
1. Keyword: PostgreSQL ILIKE across multiple fields
2. Semantic: pgvector cosine similarity on embeddings
3. Hybrid: weighted combination of both (default)

All functions accept an AsyncSession and return Pydantic models.
"""

import math
from enum import Enum

from sqlalchemy import func, or_, select, text, case, literal_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.paper import (
    PaperSummary,
    SearchResponse,
    SearchResult,
)
from app.models.paper_orm import PaperORM
from app.models.paper_embedding import PaperEmbedding
from app.utils.embeddings import get_embedding, build_search_text


# ── Enums ─────────────────────────────────────────────────────────────────────


class SearchMode(str, Enum):
    HYBRID = "hybrid"
    SEMANTIC = "semantic"
    KEYWORD = "keyword"


class SortOrder(str, Enum):
    RELEVANCE = "relevance"
    NEWEST = "newest"
    OLDEST = "oldest"
    CITATIONS_DESC = "citations_desc"
    IMPACT_DESC = "impact_desc"
    ALPHABETICAL = "alphabetical"


# ── ORM → Pydantic mapping ───────────────────────────────────────────────────


def _orm_to_summary(row: PaperORM, abstract_limit: int = 200) -> PaperSummary:
    """Convert a PaperORM instance to a lightweight PaperSummary."""
    abstract_text = row.abstract or ""
    abstract_preview = (
        abstract_text[:abstract_limit] + "..."
        if len(abstract_text) > abstract_limit
        else abstract_text
    )
    return PaperSummary(
        id=row.id,
        title=row.paper_title,
        authors=row.authors or [],
        department=row.department or "",
        year=row.publication_year or 0,
        journal=row.journal_name or "",
        keywords=row.keywords or [],
        abstract=abstract_preview,
        school=row.school,
        paper_type=row.paper_type,
        citation_count=row.citation_count or 0,
    )


# ── Filter builder ────────────────────────────────────────────────────────────


def _apply_filters(stmt, **kwargs):
    """Apply optional filters to a SQLAlchemy select statement."""
    if kwargs.get("department"):
        stmt = stmt.where(func.lower(PaperORM.department) == kwargs["department"].lower())
    if kwargs.get("school"):
        stmt = stmt.where(func.lower(PaperORM.school) == kwargs["school"].lower())
    if kwargs.get("year"):
        stmt = stmt.where(PaperORM.publication_year == kwargs["year"])
    if kwargs.get("year_from"):
        stmt = stmt.where(PaperORM.publication_year >= kwargs["year_from"])
    if kwargs.get("year_to"):
        stmt = stmt.where(PaperORM.publication_year <= kwargs["year_to"])
    if kwargs.get("author"):
        stmt = stmt.where(
            func.array_to_string(PaperORM.authors, " ").ilike(f"%{kwargs['author']}%")
        )
    if kwargs.get("journal"):
        stmt = stmt.where(PaperORM.journal_name.ilike(f"%{kwargs['journal']}%"))
    if kwargs.get("conference"):
        stmt = stmt.where(PaperORM.conference_name.ilike(f"%{kwargs['conference']}%"))
    if kwargs.get("paper_type"):
        stmt = stmt.where(func.lower(PaperORM.paper_type) == kwargs["paper_type"].lower())
    if kwargs.get("status"):
        stmt = stmt.where(func.lower(PaperORM.status) == kwargs["status"].lower())
    if kwargs.get("citation_min") is not None:
        stmt = stmt.where(PaperORM.citation_count >= kwargs["citation_min"])
    if kwargs.get("citation_max") is not None:
        stmt = stmt.where(PaperORM.citation_count <= kwargs["citation_max"])
    if kwargs.get("impact_factor_min") is not None:
        stmt = stmt.where(PaperORM.impact_factor >= kwargs["impact_factor_min"])

    return stmt


# ── Keyword Search ────────────────────────────────────────────────────────────


async def keyword_search(
    db: AsyncSession,
    query: str,
    *,
    page: int = 1,
    limit: int = 20,
    **filters,
) -> dict[int, float]:
    """Search papers using ILIKE across multiple fields.

    Returns a dict of {paper_id: relevance_score}.
    """
    search_term = f"%{query}%"

    conditions = [
        PaperORM.paper_title.ilike(search_term),
        PaperORM.abstract.ilike(search_term),
        PaperORM.department.ilike(search_term),
        PaperORM.journal_name.ilike(search_term),
        func.array_to_string(PaperORM.authors, " ").ilike(search_term),
        func.array_to_string(PaperORM.keywords, " ").ilike(search_term),
    ]

    stmt = select(PaperORM).where(or_(*conditions))
    stmt = _apply_filters(stmt, **filters)

    result = await db.execute(stmt)
    rows = result.scalars().all()

    # Score based on field matches
    scores = {}
    for row in rows:
        score = _count_field_matches(row, query)
        scores[row.id] = min(1.0, score / 4.0)

    return scores


def _count_field_matches(row: PaperORM, query: str) -> int:
    """Count how many searchable fields contain the query string."""
    query_lower = query.lower()
    count = 0

    if row.paper_title and query_lower in row.paper_title.lower():
        count += 2  # Title match weighted higher
    if row.abstract and query_lower in row.abstract.lower():
        count += 1
    if row.department and query_lower in row.department.lower():
        count += 1
    if row.journal_name and query_lower in row.journal_name.lower():
        count += 1
    if row.authors:
        if query_lower in " ".join(row.authors).lower():
            count += 1
    if row.keywords:
        if query_lower in " ".join(row.keywords).lower():
            count += 1

    return count


# ── Semantic Search ───────────────────────────────────────────────────────────


async def semantic_search(
    db: AsyncSession,
    query: str,
    *,
    limit: int = 100,
    **filters,
) -> dict[int, float]:
    """Search papers using pgvector cosine similarity.

    Returns a dict of {paper_id: similarity_score}.
    """
    # Generate query embedding
    query_embedding = get_embedding(query)

    # Build query: 1 - cosine_distance = cosine_similarity
    similarity = (
        1 - PaperEmbedding.embedding.cosine_distance(query_embedding)
    ).label("similarity")

    stmt = (
        select(PaperORM.id, similarity)
        .join(PaperEmbedding, PaperORM.id == PaperEmbedding.paper_id)
    )
    stmt = _apply_filters(stmt, **filters)
    stmt = stmt.order_by(similarity.desc()).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()

    return {row.id: float(row.similarity) for row in rows}


# ── Hybrid Search ─────────────────────────────────────────────────────────────


async def hybrid_search(
    db: AsyncSession,
    query: str,
    *,
    mode: SearchMode = SearchMode.HYBRID,
    page: int = 1,
    limit: int = 20,
    sort: SortOrder = SortOrder.RELEVANCE,
    **filters,
) -> SearchResponse:
    """Combined keyword + semantic search with configurable weights.

    Args:
        db: Database session
        query: Search query string
        mode: Search mode (hybrid, semantic, keyword)
        page: Page number (1-indexed)
        limit: Results per page
        sort: Sort order
        **filters: Optional filters (department, school, year, etc.)

    Returns:
        SearchResponse with ranked results
    """
    semantic_scores: dict[int, float] = {}
    keyword_scores: dict[int, float] = {}

    # Run searches based on mode
    if mode in (SearchMode.HYBRID, SearchMode.SEMANTIC):
        try:
            semantic_scores = await semantic_search(
                db, query, limit=limit * 5, **filters
            )
        except Exception:
            # If semantic search fails (no embeddings), fall back to keyword
            if mode == SearchMode.SEMANTIC:
                pass  # Return empty results

    if mode in (SearchMode.HYBRID, SearchMode.KEYWORD):
        keyword_scores = await keyword_search(
            db, query, page=1, limit=limit * 5, **filters
        )

    # Combine scores
    all_paper_ids = set(semantic_scores.keys()) | set(keyword_scores.keys())

    if not all_paper_ids:
        return SearchResponse(
            query=query,
            total=0,
            results=[],
            search_mode=mode.value,
        )

    combined_scores: dict[int, float] = {}
    sem_weight = settings.semantic_weight
    kw_weight = settings.keyword_weight

    for pid in all_paper_ids:
        sem_score = semantic_scores.get(pid, 0.0)
        kw_score = keyword_scores.get(pid, 0.0)

        if mode == SearchMode.SEMANTIC:
            combined_scores[pid] = sem_score
        elif mode == SearchMode.KEYWORD:
            combined_scores[pid] = kw_score
        else:
            combined_scores[pid] = (sem_weight * sem_score) + (kw_weight * kw_score)

    # Sort by combined score descending, then apply custom sorting
    sorted_ids = sorted(combined_scores.keys(), key=lambda x: combined_scores[x], reverse=True)

    total = len(sorted_ids)

    # Paginate
    offset = (page - 1) * limit
    page_ids = sorted_ids[offset : offset + limit]

    if not page_ids:
        return SearchResponse(
            query=query,
            total=total,
            results=[],
            search_mode=mode.value,
        )

    # Fetch full paper data for the page
    stmt = select(PaperORM).where(PaperORM.id.in_(page_ids))
    result = await db.execute(stmt)
    papers_by_id = {p.id: p for p in result.scalars().all()}

    # Build search results maintaining score order
    search_results = []
    for pid in page_ids:
        paper = papers_by_id.get(pid)
        if paper is None:
            continue

        search_results.append(
            SearchResult(
                paper=_orm_to_summary(paper),
                score=round(combined_scores[pid], 4),
            )
        )

    # Apply secondary sorting if not relevance
    if sort == SortOrder.NEWEST:
        search_results.sort(key=lambda r: r.paper.year, reverse=True)
    elif sort == SortOrder.OLDEST:
        search_results.sort(key=lambda r: r.paper.year)
    elif sort == SortOrder.CITATIONS_DESC:
        search_results.sort(key=lambda r: r.paper.citation_count, reverse=True)
    elif sort == SortOrder.IMPACT_DESC:
        # Need to fetch impact factor from papers_by_id
        def get_impact(r):
            p = papers_by_id.get(r.paper.id)
            return float(p.impact_factor) if p and p.impact_factor else 0.0
        search_results.sort(key=get_impact, reverse=True)
    elif sort == SortOrder.ALPHABETICAL:
        search_results.sort(key=lambda r: r.paper.title.lower())

    return SearchResponse(
        query=query,
        total=total,
        results=search_results,
        search_mode=mode.value,
    )
