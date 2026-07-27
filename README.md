# UG Research Discovery Platform

An AI-powered Undergraduate Research Discovery Platform that enables semantic search over research papers.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | FastAPI, Pydantic |
| Search | Sentence Transformers, FAISS |
| Data | Local JSON |

## Project Structure

```
Research_platform/
├── backend/          # FastAPI application
│   └── app/
│       ├── api/      # Route handlers
│       ├── models/   # Pydantic schemas
│       ├── services/ # Business logic
│       └── utils/    # Embedding utilities
├── frontend/         # React + Vite application
│   └── src/
│       ├── api/        # API service layer
│       ├── components/ # Reusable UI components
│       └── pages/      # Page-level components
├── scraper/          # Data scraping scripts (future)
└── data/             # Dataset and vector indexes
    ├── papers.json
    └── faiss_index/
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/papers` | List all papers |
| `GET` | `/api/v1/papers/{id}` | Get paper by ID |
| `POST` | `/api/v1/search` | Semantic search (stub) |

## Roadmap

| Phase | Goal | Status |
|---|---|---|
| Phase 1 | Semantic search over a small dataset | 🚧 Current |
| Phase 2 | Advanced filters (author, department, year, keywords) | Planned |
| Phase 3 | Paper details page + PDF viewer + bookmarking | Planned |
| Phase 4 | AI-powered summarization and RAG-based Q&A | Planned |
| Phase 5 | Personalized recommendations and collaboration | Planned |
| Phase 6 | Production deployment (PostgreSQL, Docker, cloud) | Planned |

## License

MIT
