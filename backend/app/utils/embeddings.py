"""Embedding utilities — wraps the sentence-transformers model."""

import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import settings


# ── Module-level cache ────────────────────────────────────────────────────────
_model: SentenceTransformer | None = None


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


def get_embedding(text: str) -> np.ndarray:
    """Generate a normalized embedding vector for a single text string.

    Args:
        text: The input text to embed.

    Returns:
        A 1-D numpy array (float32) of shape (dim,).
    """
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.astype(np.float32)


def get_embeddings_batch(texts: list[str]) -> np.ndarray:
    """Generate normalized embeddings for a batch of texts.

    Args:
        texts: A list of input strings.

    Returns:
        A 2-D numpy array (float32) of shape (len(texts), dim).
    """
    model = get_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=True)
    return embeddings.astype(np.float32)
