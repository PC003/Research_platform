"""
Keyword extraction for papers.json using KeyBERT.
Extracts keywords from each paper's title and writes them
back into the keywords field of papers.json.
"""

import json
import os
from keybert import KeyBERT

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PAPERS_PATH = os.path.join(os.path.dirname(__file__), "..", "papers.json")
TOP_N_KEYWORDS = 5
MIN_KEYWORD_SCORE = 0.2


def load_papers(path: str) -> list[dict]:
    """Load papers from JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_papers(papers: list[dict], path: str) -> None:
    """Save papers back to JSON file."""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(papers, f, indent=2, ensure_ascii=False)


def extract_keywords(kw_model: KeyBERT, text: str, top_n: int = TOP_N_KEYWORDS) -> list[str]:
    """Extract keywords from text using KeyBERT.
    
    Uses the title as input. Returns only keywords above the
    minimum confidence score.
    """
    if not text.strip():
        return []

    results = kw_model.extract_keywords(
        text,
        keyphrase_ngram_range=(1, 2),
        stop_words="english",
        top_n=top_n,
    )

    # results is a list of (keyword, score) tuples
    return [kw for kw, score in results if score >= MIN_KEYWORD_SCORE]


def main():
    print("Loading papers...")
    papers = load_papers(PAPERS_PATH)
    total = len(papers)

    print(f"Found {total} papers. Initializing KeyBERT model...")
    kw_model = KeyBERT()

    updated = 0
    for i, paper in enumerate(papers):
        # Skip papers that already have keywords
        if paper.get("keywords"):
            continue

        title = paper.get("title", "")
        keywords = extract_keywords(kw_model, title)
        paper["keywords"] = keywords
        updated += 1

        print(f"  [{i + 1}/{total}] {title[:60]}...")
        print(f"           → {keywords}")

    save_papers(papers, PAPERS_PATH)
    print(f"\n✅ Done. Updated {updated}/{total} papers with keywords.")
    print(f"   Saved to {PAPERS_PATH}")


if __name__ == "__main__":
    main()