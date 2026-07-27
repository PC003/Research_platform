/**
 * @file types.js
 * JSDoc type definitions for the UG Research Platform API.
 *
 * These mirror the backend Pydantic schemas so the frontend has
 * documented, consistent interfaces to code against.
 */

// ─── Student ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Student
 * @property {string}  student_id    - University registration number (e.g. 24BCE1234)
 * @property {string}  student_name
 * @property {string}  [email]
 * @property {string}  [department]
 * @property {string}  [school]
 * @property {string}  [batch]
 * @property {string}  [profile_photo] - Cloudinary / S3 URL
 * @property {string}  [linkedin_url]
 * @property {string}  [github_url]
 * @property {string}  [created_at]
 * @property {number}  [papers_count]
 */

// ─── Paper ───────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Paper
 * @property {string|number} id
 * @property {string}  title
 * @property {string[]} authors
 * @property {string}  abstract
 * @property {string[]} keywords
 * @property {string}  department
 * @property {number}  year
 * @property {string}  journal
 * @property {string}  [pdf_url]
 *
 * -- Extended fields (PostgreSQL schema) --
 * @property {string}  [student_id]
 * @property {string}  [school]
 * @property {string}  [publication_date]   - ISO date string
 * @property {string}  [conference_name]
 * @property {string}  [paper_type]         - Journal | Conference | Patent | Book Chapter
 * @property {string}  [doi]
 * @property {string}  [paper_link]
 * @property {string}  [photo_url]          - Research image / thumbnail URL
 * @property {number}  [citation_count]
 * @property {number}  [impact_factor]
 * @property {string}  [collaboration_type] - Individual | National | International
 * @property {string}  [status]
 * @property {string}  [created_at]
 * @property {string}  [updated_at]
 */

// ─── Paper Summary ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} PaperSummary
 * @property {string|number} id
 * @property {string}  title
 * @property {string[]} authors
 * @property {string}  department
 * @property {number}  year
 * @property {string}  [journal]
 * @property {string[]} [keywords]
 * @property {string}  [abstract]
 * @property {string}  [school]
 * @property {string}  [paper_type]
 * @property {number}  [citation_count]
 */

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SearchRequest
 * @property {string}  query
 * @property {string}  [department]
 * @property {string}  [school]
 * @property {number}  [year_from]
 * @property {number}  [year_to]
 * @property {string}  [journal]
 * @property {string}  [paper_type]
 */

/**
 * @typedef {Object} SearchResult
 * @property {PaperSummary} paper
 * @property {number}       score - Cosine similarity (0–1)
 */

/**
 * @typedef {Object} SearchResponse
 * @property {string}         query
 * @property {number}         total
 * @property {SearchResult[]} results
 */

export {};
