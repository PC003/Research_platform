# Project Memory & Context

> **Last updated**: 2026-09-09  
> This file is the single source of truth for AI assistants and developers.  
> Read it before making any architectural changes.

---

## 1 · Identity

| Field | Value |
|---|---|
| **Name** | UG Research Discovery Platform |
| **Purpose** | AI-powered platform for discovering, searching, and showcasing undergraduate research publications |
| **Target Users** | Students, faculty, and administrators at VIT |

---

## 2 · Current Phase & Roadmap

| Phase | Goal | Status |
|---|---|---|
| Phase 1 | Semantic search over dataset | ✅ **Done** |
| Phase 2 | Advanced filters (author, department, year, keywords, paper type, journal) | ✅ **Done** |
| Phase 3 | Paper details page + Student directory + Image generation | ✅ **Done** |
| Phase 4 | AI-powered summarization and RAG-based Q&A | 🔲 Planned |
| Phase 5 | Personalized recommendations and collaboration | 🔲 Planned |
| Phase 6 | Production deployment (Docker, cloud, CI/CD) | 🔲 Planned |

---

## 3 · Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI 0.115 |
| ORM / DB | SQLAlchemy 2 (async) + PostgreSQL (asyncpg) |
| Vector Search | pgvector — cosine similarity on `paper_embeddings` table |
| Embedding Model | `sentence-transformers/all-MiniLM-L6-v2` |
| Migrations | Alembic |
| Auth | JWT (PyJWT) + bcrypt, role-based (`user` / `admin`) |
| Image Upload | Cloudinary SDK (✅ verified working) |
| Image Generation | Playwright (HTML template → screenshot → Cloudinary upload) |
| Validation | Pydantic v2, pydantic-settings |
| Testing | pytest, pytest-asyncio, httpx |
| Demo Data | Faker + tqdm |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS 3 |
| Routing | react-router-dom v7 |
| HTTP Client | Axios |
| Linting | oxlint |

### External Services
| Service | Purpose |
|---|---|
| Cloudinary | Image/asset storage (student photos, generated posters) |
| PostgreSQL | Primary datastore |

---

## 4 · Project Structure

```
Research_platform/
├── backend/
│   ├── alembic/               # Alembic migrations config
│   │   └── versions/          # 0001_baseline, photo_fields migration
│   ├── app/
│   │   ├── api/routes/        # Route handlers
│   │   │   ├── admin_students.py   # POST /{id}/photo (admin)
│   │   │   ├── analytics.py        # Dashboard aggregations
│   │   │   ├── auth.py             # Register / Login / Me
│   │   │   ├── health.py           # Health check
│   │   │   ├── images.py           # Poster generation (admin)
│   │   │   ├── papers.py           # CRUD + hybrid search
│   │   │   └── students.py         # CRUD + search + metadata
│   │   ├── core/
│   │   │   ├── auth.py             # get_current_user / require_admin deps
│   │   │   └── database.py         # Async engine, session factory, init_db
│   │   ├── models/
│   │   │   ├── base.py             # DeclarativeBase
│   │   │   ├── generated_images.py # GeneratedImage ORM
│   │   │   ├── paper.py            # Pydantic schemas (Paper, Search, etc.)
│   │   │   ├── paper_embedding.py  # PaperEmbedding ORM (pgvector)
│   │   │   ├── paper_orm.py        # PaperORM — full paper table
│   │   │   ├── student.py          # Student ORM
│   │   │   ├── student_schema.py   # Pydantic schemas for students
│   │   │   ├── user.py             # User ORM (roles, auth)
│   │   │   └── user_schema.py      # Pydantic schemas for users/tokens
│   │   ├── services/
│   │   │   ├── analytics_service.py    # Aggregation queries
│   │   │   ├── auth_service.py         # JWT encode/decode, register, login
│   │   │   ├── cloudinary_service.py   # Upload image to Cloudinary
│   │   │   ├── image_service.py        # HTML → PNG poster generation
│   │   │   ├── paper_service.py        # Paper CRUD + filter helpers
│   │   │   ├── search_service.py       # Keyword / Semantic / Hybrid search
│   │   │   ├── storage_service.py      # Abstract file storage (Cloudinary)
│   │   │   └── student_service.py      # Student CRUD + search
│   │   ├── templates/
│   │   │   ├── analytics-poster.html   # Analytics poster template
│   │   │   └── student-poster.html     # Student recognition template
│   │   ├── utils/
│   │   │   └── embeddings.py       # Embedding generation helpers
│   │   └── scripts/
│   │       ├── generate_demo_data.py   # Faker-based seed script
│   │       └── generate_embeddings.py  # Batch embed papers
│   ├── public/                 # Static files (generated images)
│   ├── requirements.txt
│   ├── .env / .env.example
│   └── alembic.ini
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── analyticsApi.js
│       │   ├── authApi.js
│       │   ├── paperApi.js
│       │   ├── studentApi.js
│       │   └── types.js
│       ├── components/
│       │   ├── EmptyState.jsx
│       │   ├── FilterPanel.jsx
│       │   ├── LoadingSkeleton.jsx
│       │   ├── Navbar.jsx
│       │   ├── Pagination.jsx
│       │   ├── PaperCard.jsx
│       │   ├── ProtectedRoute.jsx
│       │   └── SearchBar.jsx
│       ├── contexts/
│       │   └── AuthContext.jsx
│       ├── pages/
│       │   ├── AdminImageGeneratorPage.jsx
│       │   ├── HomePage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── PaperDetailsPage.jsx
│       │   ├── StudentDetailsPage.jsx
│       │   └── StudentsPage.jsx
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
├── scraper/
│   └── scraper.py          # VIT SCORE 2026 publications scraper
├── data/
│   └── _legacy/            # Legacy JSON data (pre-Postgres migration)
├── memory.md               # ← You are here
├── README.md
└── run.txt                 # Quick-start commands + admin credentials
```

---

## 5 · Database Schema (PostgreSQL)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (string) | Primary key |
| email | varchar(255) | Unique, indexed |
| hashed_password | varchar(255) | bcrypt |
| full_name | varchar(150) | |
| role | enum(`user`, `admin`) | Default: `user` |
| is_active | boolean | Default: `true` |
| created_at | datetime | |

### `students`
| Column | Type | Notes |
|---|---|---|
| student_id | varchar(10) | PK (e.g. `24BCE1234`) |
| student_name | varchar(100) | |
| department | varchar(100) | |
| school | varchar(100) | |
| batch | varchar(20) | |
| photo_url | text | Cloudinary / S3 URL |
| photo_public_id | text | Cloudinary public ID |
| created_at | datetime | |

### `papers`
| Column | Type | Notes |
|---|---|---|
| id | int | PK, autoincrement |
| student_id | varchar(10) | FK → students |
| paper_title | text | |
| authors | text[] | PostgreSQL array |
| abstract | text | |
| keywords | text[] | PostgreSQL array |
| department / school | varchar | |
| publication_date / year | date / int | |
| journal_name / conference_name | varchar | |
| paper_type | varchar(50) | Journal, Conference, Patent, Book Chapter |
| doi / paper_link | varchar / text | |
| pdf_url / photo_url | text | Cloudinary URLs |
| citation_count | int | Default: 0 |
| impact_factor | numeric(5,2) | |
| collaboration_type | varchar(100) | Individual, National, International |
| status | varchar(30) | Default: Published |
| search_text | text | Auto-populated composite field |
| created_at / updated_at | datetime | |

### `paper_embeddings`
| Column | Type | Notes |
|---|---|---|
| id | int | PK |
| paper_id | int | FK → papers (unique) |
| embedding | vector(384) | pgvector, MiniLM-L6-v2 output |

### `generated_images`
Stores metadata for admin-generated poster images.

---

## 6 · API Endpoints (prefix: `/api/v1`)

### Auth (`/auth`)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Create account, return JWT |
| POST | `/login` | Public | Authenticate, return JWT |
| GET | `/me` | Authenticated | Current user profile |

### Papers (`/papers`)
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Public | List all (paginated, filtered, sorted) |
| GET | `/{id}` | Public | Single paper by ID |
| POST | `/` | Public | Create paper |
| PATCH | `/{id}` | Public | Update paper |
| DELETE | `/{id}` | Public | Delete paper |
| POST | `/search` | Public | Hybrid search (keyword + semantic + filters) |
| GET | `/departments` | Public | Unique department list |
| GET | `/schools` | Public | Unique school list |
| GET | `/paper-types` | Public | Unique paper types |
| GET | `/journals` | Public | Unique journals |
| GET | `/year-range` | Public | Min–max publication year |

### Students (`/students`)
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/` | Admin | List all (paginated) |
| GET | `/search` | Admin | Search students |
| GET | `/{id}` | Admin | Single student + papers |
| POST | `/` | Admin | Create student |
| PATCH | `/{id}` | Admin | Update student |
| DELETE | `/{id}` | Admin | Delete student |
| GET | `/departments` | Admin | Unique departments |
| GET | `/batches` | Admin | Unique batches |
| GET | `/{id}/papers` | Admin | Student's papers |

### Admin (`/admin`)
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/images/analytics-summary` | Admin | Generate analytics poster |
| POST | `/images/student-recognition` | Admin | Generate student poster |
| GET | `/images/generated` | Admin | List generated images |
| POST | `/students/{id}/photo` | Admin | Upload student photo |

### Analytics (`/analytics`)
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/top-departments` | Public | Departments by paper count |
| GET | `/top-journals` | Public | Journals by paper count |
| GET | `/publication-trends` | Public | Publications per year |
| GET | `/citation-distribution` | Public | Citation histogram |
| GET | `/keyword-frequency` | Public | Top keywords |
| GET | `/paper-types` | Public | Papers by type |
| GET | `/students-per-department` | Public | Students by department |
| GET | `/research-growth` | Public | Year-over-year growth |
| GET | `/collaboration-breakdown` | Public | Collaboration types |

### Health (`/health`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check |

---

## 7 · Frontend Routes

| Path | Component | Access |
|---|---|---|
| `/` | HomePage | Public |
| `/papers/:id` | PaperDetailsPage | Public |
| `/login` | LoginPage | Public |
| `/students` | StudentsPage | Admin only |
| `/students/:id` | StudentDetailsPage | Admin only |
| `/admin/images` | AdminImageGeneratorPage | Admin only |

---

## 8 · Search Architecture

The platform implements **three search modes** in `search_service.py`:

1. **Keyword** — PostgreSQL `ILIKE` across title, abstract, authors, keywords, department, journal
2. **Semantic** — pgvector cosine similarity on 384-dim MiniLM-L6-v2 embeddings
3. **Hybrid** (default) — weighted combination: `semantic_weight=0.6`, `keyword_weight=0.4`

Filters can be layered on top: department, school, year range, paper type, journal, collaboration type.

---

## 9 · Key Integrations

### Cloudinary (✅ Verified)
- **Config**: `cloudinary_cloud_name`, `cloudinary_api_key`, `cloudinary_api_secret` in `.env`
- **Service**: `cloudinary_service.py` — upload via FastAPI `UploadFile`
- **Usage**: Student profile photos, generated poster images
- **Folder**: `research_platform/`

### Playwright (Image Generation)
- HTML templates (`analytics-poster.html`, `student-poster.html`) rendered to PNG
- Uploaded to Cloudinary via `storage_service.py`
- Triggered by admin from `AdminImageGeneratorPage`

---

## 10 · Data Pipeline

| Step | Script | Purpose |
|---|---|---|
| 1. Scrape | `scraper/scraper.py` | Pull VIT SCORE publications → `data/papers.json` |
| 2. Seed DB | `backend/scripts/generate_demo_data.py` | Faker-based demo data → PostgreSQL |
| 3. Embed | `backend/scripts/generate_embeddings.py` | Batch-embed papers → `paper_embeddings` table |

---

## 11 · Running the Project

```bash
source ../.venv/bin/activate && python -m uvicorn app.main:app --reload

# Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload
# → http://localhost:8000  (docs: /docs, /redoc)

# Frontend
cd frontend && npm run dev
# → http://localhost:5173
```

**Admin credentials**: `admin@research.edu` / `admin123`

---

## 12 · AI Assistant Rules

1. **Read this file first** before making architectural changes.
2. **Update this file** when completing phases, adding services, or changing the schema.
3. **Follow established patterns**: async SQLAlchemy sessions, Pydantic schemas, service-layer separation.
4. **Never commit `.env`** — only update `.env.example` with placeholder values.
5. **Alembic for schema changes** — don't rely on `create_all` in production.
