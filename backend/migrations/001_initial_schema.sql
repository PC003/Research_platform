-- =============================================================================
-- Migration 001: Initial PostgreSQL Schema
-- UG Research Discovery Platform
--
-- Creates the foundational tables for students, papers, and paper embeddings.
-- Requires: PostgreSQL 14+ with pgvector extension.
-- =============================================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Students ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    student_id      VARCHAR(10)     PRIMARY KEY,        -- e.g. 24BCE1234
    student_name    VARCHAR(100)    NOT NULL,
    email           VARCHAR(150),
    department      VARCHAR(100),
    school          VARCHAR(100),
    batch           VARCHAR(20),
    profile_photo   TEXT,                               -- Cloudinary / S3 URL
    linkedin_url    TEXT,
    github_url      TEXT,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- ── Papers ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS papers (
    id                  SERIAL          PRIMARY KEY,
    student_id          VARCHAR(10)     REFERENCES students(student_id)
                                        ON DELETE SET NULL,
    paper_title         TEXT            NOT NULL,
    authors             TEXT[],
    abstract            TEXT,
    keywords            TEXT[],
    department          VARCHAR(100),
    school              VARCHAR(100),
    publication_date    DATE,
    publication_year    INT,
    journal_name        VARCHAR(200),
    conference_name     VARCHAR(200),
    paper_type          VARCHAR(50),                    -- Journal, Conference, Patent, Book Chapter
    doi                 VARCHAR(200),
    paper_link          TEXT,
    pdf_url             TEXT,                           -- Cloudinary / S3 URL
    photo_url           TEXT,                           -- Research image / thumbnail URL
    citation_count      INT             DEFAULT 0,
    impact_factor       DECIMAL(5,2),
    collaboration_type  VARCHAR(100),                   -- Individual, National, International
    status              VARCHAR(30)     DEFAULT 'Published',
    search_text         TEXT,                           -- Concatenated searchable text
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- ── Paper Embeddings ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paper_embeddings (
    paper_id    INT             PRIMARY KEY
                                REFERENCES papers(id) ON DELETE CASCADE,
    embedding   VECTOR(384)                             -- all-MiniLM-L6-v2 = 384 dims
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_papers_student_id
    ON papers(student_id);

CREATE INDEX IF NOT EXISTS idx_papers_department
    ON papers(department);

CREATE INDEX IF NOT EXISTS idx_papers_publication_year
    ON papers(publication_year);

CREATE INDEX IF NOT EXISTS idx_papers_journal_name
    ON papers(journal_name);

CREATE INDEX IF NOT EXISTS idx_papers_paper_title
    ON papers USING gin(to_tsvector('english', paper_title));

-- =============================================================================
-- Trigger: Auto-populate search_text on INSERT or UPDATE
--
-- Concatenates paper_title, abstract, keywords, authors, and journal_name
-- into a single text field for keyword search and hybrid search.
-- =============================================================================

CREATE OR REPLACE FUNCTION populate_search_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_text := COALESCE(NEW.paper_title, '')
        || ' '
        || COALESCE(NEW.abstract, '')
        || ' '
        || COALESCE(array_to_string(NEW.keywords, ' '), '')
        || ' '
        || COALESCE(array_to_string(NEW.authors, ' '), '')
        || ' '
        || COALESCE(NEW.journal_name, '');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_papers_search_text
    BEFORE INSERT OR UPDATE ON papers
    FOR EACH ROW
    EXECUTE FUNCTION populate_search_text();

-- =============================================================================
-- Trigger: Auto-update updated_at on row modification
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_papers_updated_at
    BEFORE UPDATE ON papers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
