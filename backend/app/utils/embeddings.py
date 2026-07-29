"""Embedding utilities — wraps the sentence-transformers model.

Provides functions to generate embeddings for text using the configured
model. The model is loaded lazily and cached for the process lifetime.
"""

import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import settings


# ── Module-level cache ────────────────────────────────────────────────────────
_model: SentenceTransformer | None = None

# Embedding dimension for all-MiniLM-L6-v2
EMBEDDING_DIM = 384


def get_model() -> SentenceTransformer:
    """Load and cache the sentence-transformer model.

    Uses the model identifier from settings (default: all-MiniLM-L6-v2).
    The model is loaded once and cached for the lifetime of the process.
    """
    global _model

    if _model is not None:
        return _model

    _model = SentenceTransformer(settings.embedding_model)
    return _model


def build_search_text(
    title: str = "",
    abstract: str = "",
    keywords: list[str] | None = None,
    authors: list[str] | None = None,
) -> str:
    """Combine paper fields into a single text for embedding.

    Weights title more heavily by repeating it.
    """
    parts = []
    if title:
        parts.append(title)
        parts.append(title)  # Double-weight title
    if abstract:
        parts.append(abstract)
    if keywords:
        parts.append(" ".join(keywords))
    if authors:
        parts.append(" ".join(authors))
    return " ".join(parts)


def get_embedding(text: str) -> list[float]:
    """Generate a normalized embedding vector for a single text string.

    Args:
        text: The input text to embed.

    Returns:
        A list of floats of length EMBEDDING_DIM.
    """
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.astype(np.float32).tolist()


def get_embeddings_batch(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Generate normalized embeddings for a batch of texts.

    Args:
        texts: A list of input strings.
        batch_size: Number of texts to encode at once.

    Returns:
        A list of lists of floats, each of length EMBEDDING_DIM.
    """
    model = get_model()
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=True,
        batch_size=batch_size,
    )
    return embeddings.astype(np.float32).tolist()
