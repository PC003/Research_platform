"""
Scraper for VIT SCORE Publications — 2026 data only.
Source: https://vit.ac.in/school/research-publications/score/publications
Output: ../data/papers.json
"""

import json
import os
import re
import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
URL = "https://vit.ac.in/school/research-publications/score/publications"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "papers.json")
DEPARTMENT = "School of Computer Science Engineering and Information Systems (SCORE)"
TARGET_YEAR = 2026

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def fetch_page(url: str) -> BeautifulSoup:
    """Fetch the page and return a BeautifulSoup object."""
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def clean_text(text: str) -> str:
    """Normalize whitespace and strip surrounding spaces."""
    return re.sub(r"\s+", " ", text).strip()


def parse_authors(raw: str) -> list[str]:
    """Split semicolon-separated author string into a list."""
    authors = [clean_text(a) for a in raw.split(";")]
    return [a for a in authors if a]


def scrape_2026(soup: BeautifulSoup) -> list[dict]:
    """Extract all papers from the 2026 tab.
    
    2026 column order: Sl.No | Authors | Title | Journal
    """
    tab = soup.find("div", id=f"{TARGET_YEAR}-tab")
    if not tab:
        print("❌ 2026 tab not found")
        return []

    table = tab.find("table")
    if not table:
        print("❌ No table found in 2026 tab")
        return []

    papers = []
    rows = table.find_all("tr")[1:]  # skip header

    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 4:
            continue

        title = clean_text(cells[2].get_text())
        if not title:
            continue

        papers.append({
            "id": str(len(papers) + 1),
            "title": title,
            "authors": parse_authors(cells[1].get_text()),
            "abstract": "",
            "keywords": [],
            "department": DEPARTMENT,
            "year": TARGET_YEAR,
            "journal": clean_text(cells[3].get_text()),
            "pdf_url": "",
        })

    return papers


def main():
    print("Scraping VIT SCORE 2026 publications...")
    soup = fetch_page(URL)
    papers = scrape_2026(soup)

    if not papers:
        print("❌ No papers found.")
        return

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(papers, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved {len(papers)} papers to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
