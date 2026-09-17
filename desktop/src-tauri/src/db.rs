//! SQLite database initialization, migrations, and CRUD operations.
//!
//! Schema versions:
//!   V1 — students + import_history (original)
//!   V2 — faculty, publications, publication_authors, student_publications

use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;

use crate::error::AppError;

/// Current schema version. Increment when adding new migrations.
const CURRENT_SCHEMA_VERSION: i32 = 2;

// ── Data Structures ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Student {
    pub id: Option<i64>,
    pub student_id: String,
    pub student_name: String,
    pub department: Option<String>,
    pub school: Option<String>,
    pub batch: Option<String>,
    pub photo_path: Option<String>,
    pub poster_path: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentCreate {
    pub student_id: String,
    pub student_name: String,
    pub department: Option<String>,
    pub school: Option<String>,
    pub batch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentUpdate {
    pub student_name: Option<String>,
    pub department: Option<String>,
    pub school: Option<String>,
    pub batch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Faculty {
    pub id: Option<i64>,
    pub name: String,
    pub department: Option<String>,
    pub school: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FacultyCreate {
    pub name: String,
    pub department: Option<String>,
    pub school: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Publication {
    pub id: Option<i64>,
    pub title: String,
    pub journal: Option<String>,
    pub doi: Option<String>,
    pub publication_date: Option<String>,
    pub publication_month: Option<i32>,
    pub publication_year: Option<i32>,
    pub publication_type: Option<String>,
    pub citations: Option<i32>,
    pub first_author: Option<String>,
    pub corresponding_author: Option<String>,
    pub is_student_first_author: bool,
    pub foreign_collab: Option<String>,
    pub impact_factor: Option<f64>,
    pub q_rank: Option<String>,
    pub open_access: bool,
    pub tagged_date: Option<String>,
    pub source_file: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicationCreate {
    pub title: String,
    pub journal: Option<String>,
    pub doi: Option<String>,
    pub publication_date: Option<String>,
    pub publication_month: Option<i32>,
    pub publication_year: Option<i32>,
    pub publication_type: Option<String>,
    pub citations: Option<i32>,
    pub first_author: Option<String>,
    pub corresponding_author: Option<String>,
    pub is_student_first_author: bool,
    pub foreign_collab: Option<String>,
    pub impact_factor: Option<f64>,
    pub q_rank: Option<String>,
    pub open_access: bool,
    pub tagged_date: Option<String>,
    pub source_file: Option<String>,
    pub students: Option<Vec<PublicationStudentCreate>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicationStudentCreate {
    pub student_id: String,
    pub student_name: String,
    pub school: Option<String>,
    pub batch: Option<String>,
    pub author_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicationUpdate {
    pub title: Option<String>,
    pub journal: Option<String>,
    pub doi: Option<String>,
    pub publication_date: Option<String>,
    pub publication_month: Option<i32>,
    pub publication_year: Option<i32>,
    pub publication_type: Option<String>,
    pub citations: Option<i32>,
    pub first_author: Option<String>,
    pub corresponding_author: Option<String>,
    pub is_student_first_author: Option<bool>,
    pub foreign_collab: Option<String>,
    pub impact_factor: Option<f64>,
    pub q_rank: Option<String>,
    pub open_access: Option<bool>,
    pub tagged_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicationAuthor {
    pub id: Option<i64>,
    pub publication_id: i64,
    pub author_order: i32,
    pub author_name: String,
    pub author_type: String, // "student", "faculty", "external"
    pub student_id: Option<i64>,
    pub faculty_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicationWithAuthors {
    pub publication: Publication,
    pub authors: Vec<PublicationAuthor>,
    pub student_count: i64,
}

/// Filters for listing publications.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PublicationFilter {
    pub search: Option<String>,
    pub journal: Option<String>,
    pub publication_type: Option<String>,
    pub publication_month: Option<i32>,
    pub publication_year: Option<i32>,
    pub student_id: Option<String>, // register number
    pub faculty_id: Option<i64>,
    pub q_rank: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Student's publication in the student-based view.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentPublicationEntry {
    pub publication: Publication,
    pub author_order: i32,
    pub authors: Vec<PublicationAuthor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportRecord {
    pub id: Option<i64>,
    pub filename: String,
    pub total_rows: i32,
    pub imported_count: i32,
    pub skipped_count: i32,
    pub error_count: i32,
    pub publications_count: Option<i32>,
    pub warnings: Option<i32>,
    pub imported_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_students: i64,
    pub total_publications: i64,
    pub total_faculty: i64,
    pub total_posters: i64,
    pub schools: Vec<SchoolCount>,
    pub recent_students: Vec<Student>,
    pub recent_imports: Vec<ImportRecord>,
    pub publications_by_type: Vec<TypeCount>,
    pub publications_by_month: Vec<MonthCount>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchoolCount {
    pub school: String,
    pub count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypeCount {
    pub publication_type: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthCount {
    pub month: i32,
    pub year: i32,
    pub label: String,
    pub count: i64,
}

/// Thread-safe database handle managed by Tauri state.
pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Open (or create) the database at the given path and run migrations.
    pub fn new(db_path: &Path) -> Result<Self, AppError> {
        let conn = Connection::open(db_path)?;

        // Enable WAL mode for better concurrent read performance
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")?;

        let db = Database {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    // ── Migrations ──────────────────────────────────────────────────────
    
    pub fn reset_all_data(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Database(
            rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                e.to_string(),
            )))
        ))?;
        
        // Clear all data instead of dropping tables to avoid schema locks
        // Order is important: children first to avoid foreign key constraint errors
        let tables = vec![
            "student_publications",
            "publication_authors",
            "publications",
            "students",
            "faculty",
            "import_history",
        ];
        
        for table in tables {
            conn.execute(&format!("DELETE FROM {}", table), [])
                .map_err(|e| AppError::Database(e))?;
        }
        
        Ok(())
    }

    fn run_migrations(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Database(
            rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                e.to_string(),
            )))
        ))?;
        self.run_migrations_with_conn(&conn)
    }

    fn run_migrations_with_conn(&self, conn: &Connection) -> Result<(), AppError> {
        // Create schema_version table if it doesn't exist
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_version (
                version     INTEGER NOT NULL,
                applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
            );"
        )?;

        let current_version: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_version",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if current_version < 1 {
            self.migration_v1(&conn)?;
        }
        if current_version < 2 {
            self.migration_v2(&conn)?;
        }

        Ok(())
    }

    fn migration_v1(&self, conn: &Connection) -> Result<(), AppError> {
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS students (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id      TEXT NOT NULL UNIQUE,
                student_name    TEXT NOT NULL,
                department      TEXT,
                school          TEXT,
                batch           TEXT,
                photo_path      TEXT,
                poster_path     TEXT,
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);
            CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);

            CREATE TABLE IF NOT EXISTS import_history (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                filename        TEXT NOT NULL,
                total_rows      INTEGER NOT NULL DEFAULT 0,
                imported_count  INTEGER NOT NULL DEFAULT 0,
                skipped_count   INTEGER NOT NULL DEFAULT 0,
                error_count     INTEGER NOT NULL DEFAULT 0,
                imported_at     TEXT NOT NULL DEFAULT (datetime('now'))
            );

            INSERT INTO schema_version (version) VALUES (1);
            "
        )?;
        log::info!("Applied migration V1: students + import_history tables");
        Ok(())
    }

    fn migration_v2(&self, conn: &Connection) -> Result<(), AppError> {
        conn.execute_batch(
            "
            -- Faculty members
            CREATE TABLE IF NOT EXISTS faculty (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT NOT NULL,
                department      TEXT,
                school          TEXT,
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_faculty_name_dept
                ON faculty(name, COALESCE(department, ''));

            -- Publications (deduplicated by DOI or normalized title+year)
            CREATE TABLE IF NOT EXISTS publications (
                id                      INTEGER PRIMARY KEY AUTOINCREMENT,
                title                   TEXT NOT NULL,
                journal                 TEXT,
                doi                     TEXT,
                publication_date        TEXT,
                publication_month       INTEGER,
                publication_year        INTEGER,
                publication_type        TEXT,
                citations               INTEGER DEFAULT 0,
                first_author            TEXT,
                corresponding_author    TEXT,
                is_student_first_author INTEGER DEFAULT 0,
                foreign_collab          TEXT,
                impact_factor           REAL,
                q_rank                  TEXT,
                open_access             INTEGER DEFAULT 0,
                tagged_date             TEXT,
                source_file             TEXT,
                created_at              TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_publications_doi
                ON publications(doi) WHERE doi IS NOT NULL AND doi != '';
            CREATE INDEX IF NOT EXISTS idx_publications_month_year
                ON publications(publication_year, publication_month);
            CREATE INDEX IF NOT EXISTS idx_publications_journal
                ON publications(journal);
            CREATE INDEX IF NOT EXISTS idx_publications_type
                ON publications(publication_type);

            -- Publication authors (ordered)
            CREATE TABLE IF NOT EXISTS publication_authors (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                publication_id  INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
                author_order    INTEGER NOT NULL,
                author_name     TEXT NOT NULL,
                author_type     TEXT NOT NULL DEFAULT 'external',
                student_id      INTEGER REFERENCES students(id) ON DELETE SET NULL,
                faculty_id      INTEGER REFERENCES faculty(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_pub_authors_pub
                ON publication_authors(publication_id);
            CREATE INDEX IF NOT EXISTS idx_pub_authors_student
                ON publication_authors(student_id);

            -- Student-publication association (many-to-many)
            CREATE TABLE IF NOT EXISTS student_publications (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id      INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                publication_id  INTEGER NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                UNIQUE(student_id, publication_id)
            );
            CREATE INDEX IF NOT EXISTS idx_student_pubs_student
                ON student_publications(student_id);
            CREATE INDEX IF NOT EXISTS idx_student_pubs_pub
                ON student_publications(publication_id);

            -- Extend import_history with publication-related columns
            -- SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we use a
            -- safe approach: attempt each ADD COLUMN individually.
            "
        )?;

        // Add new columns to import_history (ignore errors if columns already exist)
        let _ = conn.execute_batch(
            "ALTER TABLE import_history ADD COLUMN publications_count INTEGER DEFAULT 0;"
        );
        let _ = conn.execute_batch(
            "ALTER TABLE import_history ADD COLUMN warnings INTEGER DEFAULT 0;"
        );

        conn.execute_batch("INSERT INTO schema_version (version) VALUES (2);")?;

        log::info!("Applied migration V2: faculty, publications, publication_authors, student_publications tables");
        Ok(())
    }

    // ── Student CRUD ────────────────────────────────────────────────────

    pub fn create_student(
        &self,
        data: &StudentCreate,
        photo_path: Option<&str>,
    ) -> Result<Student, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;

        let batch = data.batch.clone().or_else(|| calculate_batch_from_reg(&data.student_id));

        conn.execute(
            "INSERT INTO students (student_id, student_name, department, school, batch, photo_path)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                data.student_id,
                data.student_name,
                data.department,
                data.school,
                batch,
                photo_path,
            ],
        )?;

        let id = conn.last_insert_rowid();
        self.get_student_by_rowid(&conn, id)
    }

    fn get_student_by_rowid(&self, conn: &Connection, rowid: i64) -> Result<Student, AppError> {
        let student = conn.query_row(
            "SELECT id, student_id, student_name, department, school, batch,
                    photo_path, poster_path, created_at, updated_at
             FROM students WHERE id = ?1",
            params![rowid],
            |row| {
                Ok(Student {
                    id: Some(row.get(0)?),
                    student_id: row.get(1)?,
                    student_name: row.get(2)?,
                    department: row.get(3)?,
                    school: row.get(4)?,
                    batch: row.get(5)?,
                    photo_path: row.get(6)?,
                    poster_path: row.get(7)?,
                    created_at: Some(row.get(8)?),
                    updated_at: Some(row.get(9)?),
                })
            },
        )?;
        Ok(student)
    }

    pub fn get_student(&self, student_id: &str) -> Result<Student, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let student = conn.query_row(
            "SELECT id, student_id, student_name, department, school, batch,
                    photo_path, poster_path, created_at, updated_at
             FROM students WHERE student_id = ?1",
            params![student_id],
            |row| {
                Ok(Student {
                    id: Some(row.get(0)?),
                    student_id: row.get(1)?,
                    student_name: row.get(2)?,
                    department: row.get(3)?,
                    school: row.get(4)?,
                    batch: row.get(5)?,
                    photo_path: row.get(6)?,
                    poster_path: row.get(7)?,
                    created_at: Some(row.get(8)?),
                    updated_at: Some(row.get(9)?),
                })
            },
        ).map_err(|_| AppError::NotFound(format!("Student {} not found", student_id)))?;
        Ok(student)
    }

    pub fn list_students(
        &self,
        search: Option<&str>,
        department: Option<&str>,
        school: Option<&str>,
        batch: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Student>, i64), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;

        let mut where_clauses: Vec<String> = Vec::new();
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(s) = search {
            if !s.is_empty() {
                where_clauses.push("(student_id LIKE ?1 OR student_name LIKE ?1)".to_string());
                param_values.push(Box::new(format!("%{}%", s)));
            }
        }
        if let Some(d) = department {
            if !d.is_empty() {
                let idx = param_values.len() + 1;
                where_clauses.push(format!("department = ?{}", idx));
                param_values.push(Box::new(d.to_string()));
            }
        }
        if let Some(sch) = school {
            if !sch.is_empty() {
                let idx = param_values.len() + 1;
                where_clauses.push(format!("school = ?{}", idx));
                param_values.push(Box::new(sch.to_string()));
            }
        }
        if let Some(b) = batch {
            if !b.is_empty() {
                let idx = param_values.len() + 1;
                where_clauses.push(format!("batch = ?{}", idx));
                param_values.push(Box::new(b.to_string()));
            }
        }

        let where_sql = if where_clauses.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", where_clauses.join(" AND "))
        };

        // Get total count
        let count_sql = format!("SELECT COUNT(*) FROM students {}", where_sql);
        let total: i64 = conn.query_row(
            &count_sql,
            rusqlite::params_from_iter(param_values.iter().map(|p| p.as_ref())),
            |row| row.get(0),
        )?;

        // Get paginated results
        let query_sql = format!(
            "SELECT id, student_id, student_name, department, school, batch,
                    photo_path, poster_path, created_at, updated_at
             FROM students {} ORDER BY created_at DESC LIMIT {} OFFSET {}",
            where_sql, limit, offset
        );

        let mut stmt = conn.prepare(&query_sql)?;
        let students = stmt
            .query_map(
                rusqlite::params_from_iter(param_values.iter().map(|p| p.as_ref())),
                |row| {
                    Ok(Student {
                        id: Some(row.get(0)?),
                        student_id: row.get(1)?,
                        student_name: row.get(2)?,
                        department: row.get(3)?,
                        school: row.get(4)?,
                        batch: row.get(5)?,
                        photo_path: row.get(6)?,
                        poster_path: row.get(7)?,
                        created_at: Some(row.get(8)?),
                        updated_at: Some(row.get(9)?),
                    })
                },
            )?
            .collect::<SqlResult<Vec<Student>>>()?;

        Ok((students, total))
    }

    pub fn update_student(
        &self,
        student_id: &str,
        data: &StudentUpdate,
    ) -> Result<Student, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;

        let mut sets = Vec::new();
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref name) = data.student_name {
            param_values.push(Box::new(name.clone()));
            sets.push(format!("student_name = ?{}", param_values.len()));
        }
        if let Some(ref dept) = data.department {
            param_values.push(Box::new(dept.clone()));
            sets.push(format!("department = ?{}", param_values.len()));
        }
        if let Some(ref school) = data.school {
            param_values.push(Box::new(school.clone()));
            sets.push(format!("school = ?{}", param_values.len()));
        }
        if let Some(ref batch) = data.batch {
            param_values.push(Box::new(batch.clone()));
            sets.push(format!("batch = ?{}", param_values.len()));
        }

        if sets.is_empty() {
            return self.get_student(student_id);
        }

        sets.push("updated_at = datetime('now')".to_string());
        param_values.push(Box::new(student_id.to_string()));

        let sql = format!(
            "UPDATE students SET {} WHERE student_id = ?{}",
            sets.join(", "),
            param_values.len()
        );

        conn.execute(
            &sql,
            rusqlite::params_from_iter(param_values.iter().map(|p| p.as_ref())),
        )?;

        drop(conn);
        self.get_student(student_id)
    }

    pub fn update_student_photo(
        &self,
        student_id: &str,
        photo_path: &str,
    ) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        conn.execute(
            "UPDATE students SET photo_path = ?1, updated_at = datetime('now') WHERE student_id = ?2",
            params![photo_path, student_id],
        )?;
        Ok(())
    }

    pub fn update_student_poster(
        &self,
        student_id: &str,
        poster_path: &str,
    ) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        conn.execute(
            "UPDATE students SET poster_path = ?1, updated_at = datetime('now') WHERE student_id = ?2",
            params![poster_path, student_id],
        )?;
        Ok(())
    }

    pub fn delete_student(&self, student_id: &str) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let affected = conn.execute(
            "DELETE FROM students WHERE student_id = ?1",
            params![student_id],
        )?;
        if affected == 0 {
            return Err(AppError::NotFound(format!("Student {} not found", student_id)));
        }
        Ok(())
    }

    pub fn student_exists(&self, student_id: &str) -> Result<bool, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM students WHERE student_id = ?1",
            params![student_id],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }

    /// Get internal id for a student by register number.
    pub fn get_student_internal_id(&self, student_id: &str) -> Result<Option<i64>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        Self::get_student_internal_id_with_conn(&conn, student_id)
    }

    fn get_student_internal_id_with_conn(conn: &Connection, student_id: &str) -> Result<Option<i64>, AppError> {
        match conn.query_row(
            "SELECT id FROM students WHERE student_id = ?1",
            params![student_id],
            |row| row.get::<_, i64>(0),
        ) {
            Ok(id) => Ok(Some(id)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(AppError::Database(e)),
        }
    }

    pub fn upsert_student_with_conn(
        conn: &Connection,
        student_id: &str,
        name: &str,
        department: Option<&str>,
        school: Option<&str>,
        batch: Option<&str>,
        photo_path: Option<&str>,
    ) -> Result<i64, AppError> {
        let existing = Self::get_student_internal_id_with_conn(conn, student_id)?;
        if let Some(id) = existing {
            // Optional: could update fields if needed, but for now just return id
            Ok(id)
        } else {
            let final_batch = batch.map(|b| b.to_string()).or_else(|| calculate_batch_from_reg(student_id));
            conn.execute(
                "INSERT INTO students (student_id, student_name, department, school, batch, photo_path)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![student_id, name, department, school, final_batch, photo_path],
            )?;
            Ok(conn.last_insert_rowid())
        }
    }

    // ── Bulk import (students) ──────────────────────────────────────────

    pub fn bulk_insert_students(
        &self,
        students: &[(StudentCreate, Option<String>)],
        skip_existing: bool,
    ) -> Result<(i32, i32), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let tx = conn.unchecked_transaction()?;

        let mut imported = 0;
        let mut skipped = 0;

        for (data, photo_path) in students {
            let exists: bool = tx.query_row(
                "SELECT COUNT(*) > 0 FROM students WHERE student_id = ?1",
                params![data.student_id],
                |row| row.get(0),
            )?;

            if exists {
                if skip_existing {
                    skipped += 1;
                    continue;
                }
                // Update existing
                tx.execute(
                    "UPDATE students SET student_name = ?1, department = ?2, school = ?3, batch = ?4,
                     photo_path = COALESCE(?5, photo_path), updated_at = datetime('now')
                     WHERE student_id = ?6",
                    params![
                        data.student_name,
                        data.department,
                        data.school,
                        data.batch,
                        photo_path,
                        data.student_id,
                    ],
                )?;
                imported += 1;
            } else {
                tx.execute(
                    "INSERT INTO students (student_id, student_name, department, school, batch, photo_path)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        data.student_id,
                        data.student_name,
                        data.department,
                        data.school,
                        data.batch,
                        photo_path,
                    ],
                )?;
                imported += 1;
            }
        }

        tx.commit()?;
        Ok((imported, skipped))
    }

    // ── Faculty CRUD ────────────────────────────────────────────────────

    pub fn create_faculty(&self, data: &FacultyCreate) -> Result<Faculty, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        Self::create_faculty_with_conn(&conn, data)
    }

    fn create_faculty_with_conn(conn: &Connection, data: &FacultyCreate) -> Result<Faculty, AppError> {
        conn.execute(
            "INSERT INTO faculty (name, department, school) VALUES (?1, ?2, ?3)",
            params![data.name, data.department, data.school],
        )?;
        let id = conn.last_insert_rowid();
        Self::get_faculty_by_rowid(conn, id)
    }

    fn get_faculty_by_rowid(conn: &Connection, rowid: i64) -> Result<Faculty, AppError> {
        let faculty = conn.query_row(
            "SELECT id, name, department, school, created_at, updated_at
             FROM faculty WHERE id = ?1",
            params![rowid],
            |row| {
                Ok(Faculty {
                    id: Some(row.get(0)?),
                    name: row.get(1)?,
                    department: row.get(2)?,
                    school: row.get(3)?,
                    created_at: Some(row.get(4)?),
                    updated_at: Some(row.get(5)?),
                })
            },
        )?;
        Ok(faculty)
    }

    pub fn get_faculty_by_id(&self, id: i64) -> Result<Faculty, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        Self::get_faculty_by_rowid(&conn, id)
    }

    pub fn list_faculty(
        &self,
        search: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<(Vec<Faculty>, i64), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;

        let (where_sql, param_values) = if let Some(s) = search {
            if !s.is_empty() {
                (
                    "WHERE name LIKE ?1 OR department LIKE ?1".to_string(),
                    vec![Box::new(format!("%{}%", s)) as Box<dyn rusqlite::types::ToSql>],
                )
            } else {
                (String::new(), Vec::new())
            }
        } else {
            (String::new(), Vec::new())
        };

        let total: i64 = conn.query_row(
            &format!("SELECT COUNT(*) FROM faculty {}", where_sql),
            rusqlite::params_from_iter(param_values.iter().map(|p| p.as_ref())),
            |row| row.get(0),
        )?;

        let sql = format!(
            "SELECT id, name, department, school, created_at, updated_at
             FROM faculty {} ORDER BY name ASC LIMIT {} OFFSET {}",
            where_sql, limit, offset
        );

        let mut stmt = conn.prepare(&sql)?;
        let faculty = stmt
            .query_map(
                rusqlite::params_from_iter(param_values.iter().map(|p| p.as_ref())),
                |row| {
                    Ok(Faculty {
                        id: Some(row.get(0)?),
                        name: row.get(1)?,
                        department: row.get(2)?,
                        school: row.get(3)?,
                        created_at: Some(row.get(4)?),
                        updated_at: Some(row.get(5)?),
                    })
                },
            )?
            .collect::<SqlResult<Vec<Faculty>>>()?;

        Ok((faculty, total))
    }

    pub fn update_faculty(&self, id: i64, data: &FacultyCreate) -> Result<Faculty, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        conn.execute(
            "UPDATE faculty SET name = ?1, department = ?2, school = ?3, updated_at = datetime('now') WHERE id = ?4",
            params![data.name, data.department, data.school, id],
        )?;
        Self::get_faculty_by_rowid(&conn, id)
    }

    pub fn delete_faculty(&self, id: i64) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let affected = conn.execute("DELETE FROM faculty WHERE id = ?1", params![id])?;
        if affected == 0 {
            return Err(AppError::NotFound(format!("Faculty {} not found", id)));
        }
        Ok(())
    }

    /// Upsert faculty by name + department. Returns internal id.
    pub fn upsert_faculty_with_conn(conn: &Connection, name: &str, department: Option<&str>, school: Option<&str>) -> Result<i64, AppError> {
        let dept_coalesced = department.unwrap_or("");
        let existing: Option<i64> = conn.query_row(
            "SELECT id FROM faculty WHERE name = ?1 AND COALESCE(department, '') = ?2",
            params![name, dept_coalesced],
            |row| row.get(0),
        ).ok();

        if let Some(id) = existing {
            Ok(id)
        } else {
            conn.execute(
                "INSERT INTO faculty (name, department, school) VALUES (?1, ?2, ?3)",
                params![name, department, school],
            )?;
            Ok(conn.last_insert_rowid())
        }
    }

    // ── Publication CRUD ────────────────────────────────────────────────

    pub fn create_publication(&self, data: &PublicationCreate) -> Result<Publication, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        Self::create_publication_with_conn(&conn, data)
    }

    fn create_publication_with_conn(conn: &Connection, data: &PublicationCreate) -> Result<Publication, AppError> {
        conn.execute(
            "INSERT INTO publications (title, journal, doi, publication_date, publication_month,
             publication_year, publication_type, citations, first_author, corresponding_author,
             is_student_first_author, foreign_collab, impact_factor, q_rank, open_access,
             tagged_date, source_file)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                data.title,
                data.journal,
                data.doi,
                data.publication_date,
                data.publication_month,
                data.publication_year,
                data.publication_type,
                data.citations.unwrap_or(0),
                data.first_author,
                data.corresponding_author,
                data.is_student_first_author as i32,
                data.foreign_collab,
                data.impact_factor,
                data.q_rank,
                data.open_access as i32,
                data.tagged_date,
                data.source_file,
            ],
        )?;
        let pub_id = conn.last_insert_rowid();

        // Handle inline students
        if let Some(students) = &data.students {
            for s in students {
                let internal_id = Self::upsert_student_with_conn(
                    conn,
                    &s.student_id,
                    &s.student_name,
                    None,
                    s.school.as_deref(),
                    s.batch.as_deref(),
                    None,
                )?;

                // Link to student_publications
                conn.execute(
                    "INSERT INTO student_publications (student_id, publication_id) VALUES (?1, ?2)",
                    params![internal_id, pub_id],
                )?;

                // Add to publication_authors
                conn.execute(
                    "INSERT INTO publication_authors (publication_id, author_order, author_name, author_type, student_id)
                     VALUES (?1, ?2, ?3, 'student', ?4)",
                    params![pub_id, s.author_order, s.student_name, internal_id],
                )?;
            }
        }

        Self::get_publication_by_rowid(conn, pub_id)
    }

    fn get_publication_by_rowid(conn: &Connection, rowid: i64) -> Result<Publication, AppError> {
        Self::read_publication(conn, "id = ?1", params![rowid])
    }

    fn read_publication(conn: &Connection, where_clause: &str, params: impl rusqlite::Params) -> Result<Publication, AppError> {
        let sql = format!(
            "SELECT id, title, journal, doi, publication_date, publication_month,
                    publication_year, publication_type, citations, first_author,
                    corresponding_author, is_student_first_author, foreign_collab,
                    impact_factor, q_rank, open_access, tagged_date, source_file,
                    created_at, updated_at
             FROM publications WHERE {}",
            where_clause
        );
        let pub_record = conn.query_row(&sql, params, |row| {
            Ok(Publication {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                journal: row.get(2)?,
                doi: row.get(3)?,
                publication_date: row.get(4)?,
                publication_month: row.get(5)?,
                publication_year: row.get(6)?,
                publication_type: row.get(7)?,
                citations: row.get(8)?,
                first_author: row.get(9)?,
                corresponding_author: row.get(10)?,
                is_student_first_author: row.get::<_, i32>(11).map(|v| v != 0).unwrap_or(false),
                foreign_collab: row.get(12)?,
                impact_factor: row.get(13)?,
                q_rank: row.get(14)?,
                open_access: row.get::<_, i32>(15).map(|v| v != 0).unwrap_or(false),
                tagged_date: row.get(16)?,
                source_file: row.get(17)?,
                created_at: Some(row.get(18)?),
                updated_at: Some(row.get(19)?),
            })
        })?;
        Ok(pub_record)
    }

    pub fn get_publication(&self, id: i64) -> Result<Publication, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        Self::get_publication_by_rowid(&conn, id)
    }

    pub fn get_publication_with_authors(&self, id: i64) -> Result<PublicationWithAuthors, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let publication = Self::get_publication_by_rowid(&conn, id)?;
        let authors = Self::get_authors_for_publication(&conn, id)?;
        let student_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM student_publications WHERE publication_id = ?1",
            params![id],
            |row| row.get(0),
        )?;
        Ok(PublicationWithAuthors { publication, authors, student_count })
    }

    fn get_authors_for_publication(conn: &Connection, pub_id: i64) -> Result<Vec<PublicationAuthor>, AppError> {
        let mut stmt = conn.prepare(
            "SELECT id, publication_id, author_order, author_name, author_type, student_id, faculty_id
             FROM publication_authors WHERE publication_id = ?1 ORDER BY author_order ASC"
        )?;
        let authors = stmt.query_map(params![pub_id], |row| {
            Ok(PublicationAuthor {
                id: Some(row.get(0)?),
                publication_id: row.get(1)?,
                author_order: row.get(2)?,
                author_name: row.get(3)?,
                author_type: row.get(4)?,
                student_id: row.get(5)?,
                faculty_id: row.get(6)?,
            })
        })?.collect::<SqlResult<Vec<PublicationAuthor>>>()?;
        Ok(authors)
    }

    pub fn list_publications(
        &self,
        filter: &PublicationFilter,
    ) -> Result<(Vec<PublicationWithAuthors>, i64), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;

        let mut where_clauses: Vec<String> = Vec::new();
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(ref s) = filter.search {
            if !s.is_empty() {
                let idx = param_values.len() + 1;
                where_clauses.push(format!("(p.title LIKE ?{idx} OR p.journal LIKE ?{idx} OR p.doi LIKE ?{idx})"));
                param_values.push(Box::new(format!("%{}%", s)));
            }
        }
        if let Some(ref j) = filter.journal {
            if !j.is_empty() {
                let idx = param_values.len() + 1;
                where_clauses.push(format!("p.journal = ?{}", idx));
                param_values.push(Box::new(j.clone()));
            }
        }
        if let Some(ref t) = filter.publication_type {
            if !t.is_empty() {
                let idx = param_values.len() + 1;
                where_clauses.push(format!("p.publication_type = ?{}", idx));
                param_values.push(Box::new(t.clone()));
            }
        }
        if let Some(m) = filter.publication_month {
            let idx = param_values.len() + 1;
            where_clauses.push(format!("p.publication_month = ?{}", idx));
            param_values.push(Box::new(m));
        }
        if let Some(y) = filter.publication_year {
            let idx = param_values.len() + 1;
            where_clauses.push(format!("p.publication_year = ?{}", idx));
            param_values.push(Box::new(y));
        }
        if let Some(ref qr) = filter.q_rank {
            if !qr.is_empty() {
                let idx = param_values.len() + 1;
                where_clauses.push(format!("p.q_rank = ?{}", idx));
                param_values.push(Box::new(qr.clone()));
            }
        }
        if let Some(ref sid) = filter.student_id {
            if !sid.is_empty() {
                let idx = param_values.len() + 1;
                where_clauses.push(format!(
                    "p.id IN (SELECT sp.publication_id FROM student_publications sp JOIN students s ON s.id = sp.student_id WHERE s.student_id = ?{})",
                    idx
                ));
                param_values.push(Box::new(sid.clone()));
            }
        }
        if let Some(fid) = filter.faculty_id {
            let idx = param_values.len() + 1;
            where_clauses.push(format!(
                "p.id IN (SELECT pa.publication_id FROM publication_authors pa WHERE pa.faculty_id = ?{})",
                idx
            ));
            param_values.push(Box::new(fid));
        }

        let where_sql = if where_clauses.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", where_clauses.join(" AND "))
        };

        let total: i64 = conn.query_row(
            &format!("SELECT COUNT(*) FROM publications p {}", where_sql),
            rusqlite::params_from_iter(param_values.iter().map(|p| p.as_ref())),
            |row| row.get(0),
        )?;

        let limit = filter.limit.unwrap_or(50);
        let offset = filter.offset.unwrap_or(0);

        let sql = format!(
            "SELECT p.id, p.title, p.journal, p.doi, p.publication_date, p.publication_month,
                    p.publication_year, p.publication_type, p.citations, p.first_author,
                    p.corresponding_author, p.is_student_first_author, p.foreign_collab,
                    p.impact_factor, p.q_rank, p.open_access, p.tagged_date, p.source_file,
                    p.created_at, p.updated_at
             FROM publications p {} ORDER BY p.publication_year DESC, p.publication_month DESC, p.title ASC LIMIT {} OFFSET {}",
            where_sql, limit, offset
        );

        let mut stmt = conn.prepare(&sql)?;
        let pubs = stmt.query_map(
            rusqlite::params_from_iter(param_values.iter().map(|p| p.as_ref())),
            |row| {
                Ok(Publication {
                    id: Some(row.get(0)?),
                    title: row.get(1)?,
                    journal: row.get(2)?,
                    doi: row.get(3)?,
                    publication_date: row.get(4)?,
                    publication_month: row.get(5)?,
                    publication_year: row.get(6)?,
                    publication_type: row.get(7)?,
                    citations: row.get(8)?,
                    first_author: row.get(9)?,
                    corresponding_author: row.get(10)?,
                    is_student_first_author: row.get::<_, i32>(11).map(|v| v != 0).unwrap_or(false),
                    foreign_collab: row.get(12)?,
                    impact_factor: row.get(13)?,
                    q_rank: row.get(14)?,
                    open_access: row.get::<_, i32>(15).map(|v| v != 0).unwrap_or(false),
                    tagged_date: row.get(16)?,
                    source_file: row.get(17)?,
                    created_at: Some(row.get(18)?),
                    updated_at: Some(row.get(19)?),
                })
            },
        )?.collect::<SqlResult<Vec<Publication>>>()?;

        // Fetch authors for each publication
        let mut results = Vec::new();
        for p in pubs {
            let pid = p.id.unwrap();
            let authors = Self::get_authors_for_publication(&conn, pid)?;
            let student_count: i64 = conn.query_row(
                "SELECT COUNT(*) FROM student_publications WHERE publication_id = ?1",
                params![pid],
                |row| row.get(0),
            )?;
            results.push(PublicationWithAuthors { publication: p, authors, student_count });
        }

        Ok((results, total))
    }

    pub fn update_publication(&self, id: i64, data: &PublicationUpdate) -> Result<Publication, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;

        let mut sets = Vec::new();
        let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        macro_rules! maybe_set {
            ($field:ident, $col:expr) => {
                if let Some(ref val) = data.$field {
                    param_values.push(Box::new(val.clone()));
                    sets.push(format!("{} = ?{}", $col, param_values.len()));
                }
            };
        }

        maybe_set!(title, "title");
        maybe_set!(journal, "journal");
        maybe_set!(doi, "doi");
        maybe_set!(publication_date, "publication_date");
        maybe_set!(publication_type, "publication_type");
        maybe_set!(first_author, "first_author");
        maybe_set!(corresponding_author, "corresponding_author");
        maybe_set!(foreign_collab, "foreign_collab");
        maybe_set!(q_rank, "q_rank");
        maybe_set!(tagged_date, "tagged_date");

        if let Some(m) = data.publication_month {
            param_values.push(Box::new(m));
            sets.push(format!("publication_month = ?{}", param_values.len()));
        }
        if let Some(y) = data.publication_year {
            param_values.push(Box::new(y));
            sets.push(format!("publication_year = ?{}", param_values.len()));
        }
        if let Some(c) = data.citations {
            param_values.push(Box::new(c));
            sets.push(format!("citations = ?{}", param_values.len()));
        }
        if let Some(b) = data.is_student_first_author {
            param_values.push(Box::new(b as i32));
            sets.push(format!("is_student_first_author = ?{}", param_values.len()));
        }
        if let Some(f) = data.impact_factor {
            param_values.push(Box::new(f));
            sets.push(format!("impact_factor = ?{}", param_values.len()));
        }
        if let Some(b) = data.open_access {
            param_values.push(Box::new(b as i32));
            sets.push(format!("open_access = ?{}", param_values.len()));
        }

        if sets.is_empty() {
            return Self::get_publication_by_rowid(&conn, id);
        }

        sets.push("updated_at = datetime('now')".to_string());
        param_values.push(Box::new(id));

        let sql = format!(
            "UPDATE publications SET {} WHERE id = ?{}",
            sets.join(", "),
            param_values.len()
        );

        conn.execute(
            &sql,
            rusqlite::params_from_iter(param_values.iter().map(|p| p.as_ref())),
        )?;

        Self::get_publication_by_rowid(&conn, id)
    }

    pub fn delete_publication(&self, id: i64) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let affected = conn.execute("DELETE FROM publications WHERE id = ?1", params![id])?;
        if affected == 0 {
            return Err(AppError::NotFound(format!("Publication {} not found", id)));
        }
        Ok(())
    }

    /// Upsert a publication by DOI (if present) or normalized title+year.
    /// Returns (publication_id, is_new).
    pub fn upsert_publication_with_conn(conn: &Connection, data: &PublicationCreate) -> Result<(i64, bool), AppError> {
        // Try to find existing by DOI
        if let Some(ref doi) = data.doi {
            if !doi.is_empty() {
                if let Ok(id) = conn.query_row(
                    "SELECT id FROM publications WHERE doi = ?1",
                    params![doi],
                    |row| row.get::<_, i64>(0),
                ) {
                    // Update existing publication
                    conn.execute(
                        "UPDATE publications SET
                         title = ?1, journal = ?2, publication_date = ?3, publication_month = ?4,
                         publication_year = ?5, publication_type = ?6, citations = ?7,
                         first_author = ?8, corresponding_author = ?9, is_student_first_author = ?10,
                         foreign_collab = ?11, impact_factor = ?12, q_rank = ?13, open_access = ?14,
                         tagged_date = ?15, source_file = COALESCE(?16, source_file),
                         updated_at = datetime('now')
                         WHERE id = ?17",
                        params![
                            data.title, data.journal, data.publication_date, data.publication_month,
                            data.publication_year, data.publication_type, data.citations.unwrap_or(0),
                            data.first_author, data.corresponding_author,
                            data.is_student_first_author as i32,
                            data.foreign_collab, data.impact_factor, data.q_rank,
                            data.open_access as i32, data.tagged_date, data.source_file,
                            id,
                        ],
                    )?;
                    return Ok((id, false));
                }
            }
        }

        // Fallback: try normalized title + year
        if let Some(year) = data.publication_year {
            let norm_title = data.title.trim().to_lowercase();
            if let Ok(id) = conn.query_row(
                "SELECT id FROM publications WHERE LOWER(TRIM(title)) = ?1 AND publication_year = ?2",
                params![norm_title, year],
                |row| row.get::<_, i64>(0),
            ) {
                // Update existing
                conn.execute(
                    "UPDATE publications SET
                     journal = COALESCE(?1, journal), doi = COALESCE(?2, doi),
                     publication_date = COALESCE(?3, publication_date),
                     publication_month = COALESCE(?4, publication_month),
                     publication_type = COALESCE(?5, publication_type),
                     citations = ?6, first_author = COALESCE(?7, first_author),
                     corresponding_author = COALESCE(?8, corresponding_author),
                     is_student_first_author = ?9, foreign_collab = COALESCE(?10, foreign_collab),
                     impact_factor = COALESCE(?11, impact_factor),
                     q_rank = COALESCE(?12, q_rank), open_access = ?13,
                     tagged_date = COALESCE(?14, tagged_date),
                     source_file = COALESCE(?15, source_file),
                     updated_at = datetime('now')
                     WHERE id = ?16",
                    params![
                        data.journal, data.doi, data.publication_date, data.publication_month,
                        data.publication_type, data.citations.unwrap_or(0),
                        data.first_author, data.corresponding_author,
                        data.is_student_first_author as i32,
                        data.foreign_collab, data.impact_factor, data.q_rank,
                        data.open_access as i32, data.tagged_date, data.source_file,
                        id,
                    ],
                )?;
                return Ok((id, false));
            }
        }

        // Create new
        let pub_record = Self::create_publication_with_conn(conn, data)?;
        Ok((pub_record.id.unwrap(), true))
    }

    // ── Publication Authors ─────────────────────────────────────────────

    /// Insert ordered author list for a publication. Clears existing authors first.
    pub fn set_publication_authors_with_conn(
        conn: &Connection,
        publication_id: i64,
        authors: &[(i32, String, String, Option<i64>, Option<i64>)], // (order, name, type, student_id, faculty_id)
    ) -> Result<(), AppError> {
        // Clear existing authors
        conn.execute(
            "DELETE FROM publication_authors WHERE publication_id = ?1",
            params![publication_id],
        )?;

        let mut stmt = conn.prepare(
            "INSERT INTO publication_authors (publication_id, author_order, author_name, author_type, student_id, faculty_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
        )?;

        for (order, name, atype, sid, fid) in authors {
            stmt.execute(params![publication_id, order, name, atype, sid, fid])?;
        }

        Ok(())
    }

    // ── Student-Publication Association ──────────────────────────────────

    /// Link a student to a publication (idempotent).
    pub fn link_student_publication_with_conn(
        conn: &Connection,
        student_internal_id: i64,
        publication_id: i64,
    ) -> Result<(), AppError> {
        conn.execute(
            "INSERT OR IGNORE INTO student_publications (student_id, publication_id) VALUES (?1, ?2)",
            params![student_internal_id, publication_id],
        )?;
        Ok(())
    }

    /// Get all publications for a student (by register number), grouped by year/month.
    pub fn get_student_publications(&self, student_id: &str) -> Result<Vec<StudentPublicationEntry>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;

        // Get student internal ID
        let internal_id = Self::get_student_internal_id_with_conn(&conn, student_id)?
            .ok_or_else(|| AppError::NotFound(format!("Student {} not found", student_id)))?;

        let mut stmt = conn.prepare(
            "SELECT p.id, p.title, p.journal, p.doi, p.publication_date, p.publication_month,
                    p.publication_year, p.publication_type, p.citations, p.first_author,
                    p.corresponding_author, p.is_student_first_author, p.foreign_collab,
                    p.impact_factor, p.q_rank, p.open_access, p.tagged_date, p.source_file,
                    p.created_at, p.updated_at,
                    COALESCE(pa.author_order, 0) as author_order
             FROM publications p
             JOIN student_publications sp ON sp.publication_id = p.id
             LEFT JOIN publication_authors pa ON pa.publication_id = p.id AND pa.student_id = ?1
             WHERE sp.student_id = ?1
             ORDER BY p.publication_year DESC, p.publication_month DESC, p.title ASC"
        )?;

        let entries = stmt.query_map(params![internal_id], |row| {
            Ok((
                Publication {
                    id: Some(row.get(0)?),
                    title: row.get(1)?,
                    journal: row.get(2)?,
                    doi: row.get(3)?,
                    publication_date: row.get(4)?,
                    publication_month: row.get(5)?,
                    publication_year: row.get(6)?,
                    publication_type: row.get(7)?,
                    citations: row.get(8)?,
                    first_author: row.get(9)?,
                    corresponding_author: row.get(10)?,
                    is_student_first_author: row.get::<_, i32>(11).map(|v| v != 0).unwrap_or(false),
                    foreign_collab: row.get(12)?,
                    impact_factor: row.get(13)?,
                    q_rank: row.get(14)?,
                    open_access: row.get::<_, i32>(15).map(|v| v != 0).unwrap_or(false),
                    tagged_date: row.get(16)?,
                    source_file: row.get(17)?,
                    created_at: Some(row.get(18)?),
                    updated_at: Some(row.get(19)?),
                },
                row.get::<_, i32>(20)?,
            ))
        })?.collect::<SqlResult<Vec<(Publication, i32)>>>()?;

        let mut results = Vec::new();
        for (pub_record, author_order) in entries {
            let pid = pub_record.id.unwrap();
            let authors = Self::get_authors_for_publication(&conn, pid)?;
            results.push(StudentPublicationEntry {
                publication: pub_record,
                author_order,
                authors,
            });
        }

        Ok(results)
    }

    /// Get all publications for a given faculty ID.
    pub fn get_faculty_publications(&self, faculty_id: i64) -> Result<Vec<StudentPublicationEntry>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;

        let mut stmt = conn.prepare(
            "SELECT p.id, p.title, p.journal, p.doi, p.publication_date, p.publication_month,
                    p.publication_year, p.publication_type, p.citations, p.first_author,
                    p.corresponding_author, p.is_student_first_author, p.foreign_collab,
                    p.impact_factor, p.q_rank, p.open_access, p.tagged_date, p.source_file,
                    p.created_at, p.updated_at,
                    COALESCE(pa.author_order, 0) as author_order
             FROM publications p
             JOIN publication_authors pa ON pa.publication_id = p.id
             WHERE pa.faculty_id = ?1
             ORDER BY p.publication_year DESC, p.publication_month DESC, p.title ASC"
        )?;

        let entries = stmt.query_map(params![faculty_id], |row| {
            Ok((
                Publication {
                    id: Some(row.get(0)?),
                    title: row.get(1)?,
                    journal: row.get(2)?,
                    doi: row.get(3)?,
                    publication_date: row.get(4)?,
                    publication_month: row.get(5)?,
                    publication_year: row.get(6)?,
                    publication_type: row.get(7)?,
                    citations: row.get(8)?,
                    first_author: row.get(9)?,
                    corresponding_author: row.get(10)?,
                    is_student_first_author: row.get::<_, i32>(11).map(|v| v != 0).unwrap_or(false),
                    foreign_collab: row.get(12)?,
                    impact_factor: row.get(13)?,
                    q_rank: row.get(14)?,
                    open_access: row.get::<_, i32>(15).map(|v| v != 0).unwrap_or(false),
                    tagged_date: row.get(16)?,
                    source_file: row.get(17)?,
                    created_at: Some(row.get(18)?),
                    updated_at: Some(row.get(19)?),
                },
                row.get::<_, i32>(20)?,
            ))
        })?.collect::<SqlResult<Vec<(Publication, i32)>>>()?;

        let mut results = Vec::new();
        for (pub_record, author_order) in entries {
            let pid = pub_record.id.unwrap();
            let authors = Self::get_authors_for_publication(&conn, pid)?;
            results.push(StudentPublicationEntry {
                publication: pub_record,
                author_order,
                authors,
            });
        }

        Ok(results)
    }

    // ── Metadata Queries ────────────────────────────────────────────────

    pub fn get_departments(&self) -> Result<Vec<String>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT DISTINCT department FROM students WHERE department IS NOT NULL ORDER BY department"
        )?;
        let depts = stmt.query_map([], |row| row.get(0))?
            .collect::<SqlResult<Vec<String>>>()?;
        Ok(depts)
    }

    pub fn get_batches(&self) -> Result<Vec<String>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT DISTINCT batch FROM students WHERE batch IS NOT NULL ORDER BY batch DESC"
        )?;
        let batches = stmt.query_map([], |row| row.get(0))?
            .collect::<SqlResult<Vec<String>>>()?;
        Ok(batches)
    }

    pub fn list_journals(&self) -> Result<Vec<String>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT DISTINCT journal FROM publications WHERE journal IS NOT NULL AND journal != '' ORDER BY journal"
        )?;
        let journals = stmt.query_map([], |row| row.get(0))?
            .collect::<SqlResult<Vec<String>>>()?;
        Ok(journals)
    }

    pub fn list_publication_types(&self) -> Result<Vec<String>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT DISTINCT publication_type FROM publications WHERE publication_type IS NOT NULL AND publication_type != '' ORDER BY publication_type"
        )?;
        let types = stmt.query_map([], |row| row.get(0))?
            .collect::<SqlResult<Vec<String>>>()?;
        Ok(types)
    }

    pub fn list_publication_months(&self) -> Result<Vec<MonthCount>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT publication_month, publication_year, COUNT(*) as cnt
             FROM publications
             WHERE publication_month IS NOT NULL AND publication_year IS NOT NULL
             GROUP BY publication_year, publication_month
             ORDER BY publication_year DESC, publication_month DESC"
        )?;
        let months = stmt.query_map([], |row| {
            let m: i32 = row.get(0)?;
            let y: i32 = row.get(1)?;
            let month_names = ["", "January", "February", "March", "April", "May",
                "June", "July", "August", "September", "October", "November", "December"];
            let label = if (1..=12).contains(&m) {
                format!("{} {}", month_names[m as usize], y)
            } else {
                format!("{}/{}", m, y)
            };
            Ok(MonthCount {
                month: m,
                year: y,
                label,
                count: row.get(2)?,
            })
        })?.collect::<SqlResult<Vec<MonthCount>>>()?;
        Ok(months)
    }

    pub fn get_publication_stats_for_month(&self, month: i32, year: i32) -> Result<(i64, i64, i64, i64), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        
        let mut journals: i64 = 0;
        let mut conferences: i64 = 0;
        let mut patents_filed: i64 = 0;
        let mut patents_published: i64 = 0;

        let query = "SELECT publication_type, COUNT(*) FROM publications WHERE 
            (publication_month = ?1 OR ?1 = 0) AND (publication_year = ?2 OR ?2 = 0)
            GROUP BY publication_type";
            
        let mut stmt = conn.prepare(query)?;
        let mut rows = stmt.query(params![month, year])?;
        
        while let Some(row) = rows.next()? {
            let pub_type: String = row.get(0).unwrap_or_default();
            let count: i64 = row.get(1).unwrap_or(0);
            match pub_type.as_str() {
                "journal_publications" => journals += count,
                "conference_presentations" => conferences += count,
                "patents_filed" => patents_filed += count,
                "patents_published" => patents_published += count,
                _ => {}
            }
        }
        
        Ok((journals, conferences, patents_filed, patents_published))
    }

    pub fn list_schools(&self) -> Result<Vec<String>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT DISTINCT school FROM students WHERE school IS NOT NULL AND school != ''
             UNION
             SELECT DISTINCT school FROM faculty WHERE school IS NOT NULL AND school != ''
             ORDER BY 1"
        )?;
        let schools = stmt.query_map([], |row| row.get(0))?
            .collect::<SqlResult<Vec<String>>>()?;
        Ok(schools)
    }

    // ── Import History ──────────────────────────────────────────────────

    pub fn record_import(
        &self,
        filename: &str,
        total_rows: i32,
        imported_count: i32,
        skipped_count: i32,
        error_count: i32,
    ) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        conn.execute(
            "INSERT INTO import_history (filename, total_rows, imported_count, skipped_count, error_count)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![filename, total_rows, imported_count, skipped_count, error_count],
        )?;
        Ok(())
    }

    pub fn record_publication_import(
        &self,
        filename: &str,
        total_rows: i32,
        imported_count: i32,
        skipped_count: i32,
        error_count: i32,
        publications_count: i32,
        warnings: i32,
    ) -> Result<(), AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        conn.execute(
            "INSERT INTO import_history (filename, total_rows, imported_count, skipped_count, error_count, publications_count, warnings)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![filename, total_rows, imported_count, skipped_count, error_count, publications_count, warnings],
        )?;
        Ok(())
    }

    // ── Dashboard Stats ─────────────────────────────────────────────────

    pub fn get_dashboard_stats(&self) -> Result<DashboardStats, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;

        let total_students: i64 = conn.query_row(
            "SELECT COUNT(*) FROM students", [], |row| row.get(0),
        )?;

        let total_publications: i64 = conn.query_row(
            "SELECT COUNT(*) FROM publications", [], |row| row.get(0),
        ).unwrap_or(0);

        let total_faculty: i64 = conn.query_row(
            "SELECT COUNT(*) FROM faculty", [], |row| row.get(0),
        ).unwrap_or(0);

        let total_posters: i64 = conn.query_row(
            "SELECT COUNT(*) FROM students WHERE poster_path IS NOT NULL", [], |row| row.get(0),
        )?;

        // Schools
        let mut school_stmt = conn.prepare(
            "SELECT COALESCE(school, 'Unknown'), COUNT(*) FROM students GROUP BY school ORDER BY COUNT(*) DESC"
        )?;
        let schools = school_stmt.query_map([], |row| {
            Ok(SchoolCount {
                school: row.get(0)?,
                count: row.get(1)?,
            })
        })?.collect::<SqlResult<Vec<_>>>()?;

        // Recent students
        let mut recent_stmt = conn.prepare(
            "SELECT id, student_id, student_name, department, school, batch,
                    photo_path, poster_path, created_at, updated_at
             FROM students ORDER BY created_at DESC LIMIT 5"
        )?;
        let recent_students = recent_stmt.query_map([], |row| {
            Ok(Student {
                id: Some(row.get(0)?),
                student_id: row.get(1)?,
                student_name: row.get(2)?,
                department: row.get(3)?,
                school: row.get(4)?,
                batch: row.get(5)?,
                photo_path: row.get(6)?,
                poster_path: row.get(7)?,
                created_at: Some(row.get(8)?),
                updated_at: Some(row.get(9)?),
            })
        })?.collect::<SqlResult<Vec<_>>>()?;

        // Recent imports
        let mut import_stmt = conn.prepare(
            "SELECT id, filename, total_rows, imported_count, skipped_count, error_count,
                    publications_count, warnings, imported_at
             FROM import_history ORDER BY imported_at DESC LIMIT 5"
        )?;
        let recent_imports = import_stmt.query_map([], |row| {
            Ok(ImportRecord {
                id: Some(row.get(0)?),
                filename: row.get(1)?,
                total_rows: row.get(2)?,
                imported_count: row.get(3)?,
                skipped_count: row.get(4)?,
                error_count: row.get(5)?,
                publications_count: row.get(6).ok(),
                warnings: row.get(7).ok(),
                imported_at: Some(row.get(8)?),
            })
        })?.collect::<SqlResult<Vec<_>>>()?;

        // Publications by type
        let mut type_stmt = conn.prepare(
            "SELECT COALESCE(publication_type, 'Unknown'), COUNT(*) FROM publications GROUP BY publication_type ORDER BY COUNT(*) DESC"
        )?;
        let publications_by_type = type_stmt.query_map([], |row| {
            Ok(TypeCount {
                publication_type: row.get(0)?,
                count: row.get(1)?,
            })
        })?.collect::<SqlResult<Vec<_>>>().unwrap_or_default();

        // Publications by month
        let month_names = ["", "January", "February", "March", "April", "May",
            "June", "July", "August", "September", "October", "November", "December"];
        let mut month_stmt = conn.prepare(
            "SELECT publication_month, publication_year, COUNT(*)
             FROM publications
             WHERE publication_month IS NOT NULL AND publication_year IS NOT NULL
             GROUP BY publication_year, publication_month
             ORDER BY publication_year DESC, publication_month DESC
             LIMIT 12"
        )?;
        let publications_by_month = month_stmt.query_map([], |row| {
            let m: i32 = row.get(0)?;
            let y: i32 = row.get(1)?;
            let label = if (1..=12).contains(&m) {
                format!("{} {}", month_names[m as usize], y)
            } else {
                format!("{}/{}", m, y)
            };
            Ok(MonthCount { month: m, year: y, label, count: row.get(2)? })
        })?.collect::<SqlResult<Vec<_>>>().unwrap_or_default();

        Ok(DashboardStats {
            total_students,
            total_publications,
            total_faculty,
            total_posters,
            schools,
            recent_students,
            recent_imports,
            publications_by_type,
            publications_by_month,
        })
    }

    /// Get all students with poster_path set (for generated posters gallery).
    pub fn get_students_with_posters(&self) -> Result<Vec<Student>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT id, student_id, student_name, department, school, batch,
                    photo_path, poster_path, created_at, updated_at
             FROM students WHERE poster_path IS NOT NULL ORDER BY updated_at DESC"
        )?;
        let students = stmt.query_map([], |row| {
            Ok(Student {
                id: Some(row.get(0)?),
                student_id: row.get(1)?,
                student_name: row.get(2)?,
                department: row.get(3)?,
                school: row.get(4)?,
                batch: row.get(5)?,
                photo_path: row.get(6)?,
                poster_path: row.get(7)?,
                created_at: Some(row.get(8)?),
                updated_at: Some(row.get(9)?),
            })
        })?.collect::<SqlResult<Vec<_>>>()?;
        Ok(students)
    }

    /// Auto-select students based on recent publications and achievements
    pub fn get_auto_select_candidates(&self, month: &str, year: &str, achievement_type: &str) -> Result<Vec<String>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        
        let month_num = match month {
            "January" => Some(1), "February" => Some(2), "March" => Some(3), "April" => Some(4),
            "May" => Some(5), "June" => Some(6), "July" => Some(7), "August" => Some(8),
            "September" => Some(9), "October" => Some(10), "November" => Some(11), "December" => Some(12),
            "All" | "" => None,
            _ => None,
        };
        
        let year_num = year.parse::<i32>().map_err(|_| AppError::Validation("Invalid year".into()))?;

        let pub_types = match achievement_type {
            "journal_publications" => vec!["Article", "Review", "Note"],
            "conference_presentations" => vec!["Conference Paper"],
            "patents_filed" | "research_awards" => vec![], // Might need separate tables if these aren't in publications
            "book_chapters" => vec!["Book Chapter"],
            _ => vec!["Article", "Review", "Note", "Conference Paper", "Book Chapter"],
        };

        let type_placeholders = pub_types.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let mut query = format!(
            "SELECT DISTINCT s.student_id
             FROM students s
             JOIN student_publications sp ON sp.student_id = s.id
             JOIN publications p ON p.id = sp.publication_id
             WHERE p.publication_year = {} AND p.publication_type IN ({})",
             year_num,
             type_placeholders
        );

        if let Some(m) = month_num {
            // Because publication_month is NULL from Excel import, we extract the month from tagged_date (format DD-MM-YYYY HH:MM:SS)
            let m_str = format!("{:02}", m);
            query.push_str(&format!(" AND (p.publication_month = {} OR SUBSTR(p.tagged_date, 4, 2) = '{}')", m, m_str));
        }

        query.push_str(" ORDER BY p.impact_factor DESC, p.q_rank ASC");

        let mut stmt = conn.prepare(&query)?;
        
        let params_iter = pub_types.iter().map(|t| t as &dyn rusqlite::types::ToSql);
        let student_ids = stmt.query_map(rusqlite::params_from_iter(params_iter), |row| row.get(0))?
            .collect::<SqlResult<Vec<String>>>()?;
            
        Ok(student_ids)
    }

    /// Get top publications sorted by impact factor
    pub fn get_top_publications(&self, month: &str, year: &str) -> Result<Vec<PublicationWithAuthors>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        
        let month_num = match month {
            "January" => Some(1), "February" => Some(2), "March" => Some(3), "April" => Some(4),
            "May" => Some(5), "June" => Some(6), "July" => Some(7), "August" => Some(8),
            "September" => Some(9), "October" => Some(10), "November" => Some(11), "December" => Some(12),
            "All" | "" => None,
            _ => None,
        };
        let year_num = year.parse::<i32>().unwrap_or(0);

        let mut query = format!(
            "SELECT p.id, p.title, p.journal, p.doi, p.publication_date, p.publication_month,
                    p.publication_year, p.publication_type, p.citations, p.first_author,
                    p.corresponding_author, p.is_student_first_author, p.foreign_collab,
                    p.impact_factor, p.q_rank, p.open_access, p.tagged_date, p.source_file,
                    p.created_at, p.updated_at
             FROM publications p
             WHERE p.publication_year = {}", year_num
        );

        if let Some(m) = month_num {
            let m_str = format!("{:02}", m);
            query.push_str(&format!(" AND (p.publication_month = {} OR SUBSTR(p.tagged_date, 4, 2) = '{}')", m, m_str));
        }

        query.push_str(" ORDER BY p.impact_factor DESC, p.q_rank ASC LIMIT 50");

        let mut stmt = conn.prepare(&query)?;
        let pubs = stmt.query_map([], |row| {
            Ok(Publication {
                id: Some(row.get(0)?),
                title: row.get(1)?,
                journal: row.get(2)?,
                doi: row.get(3)?,
                publication_date: row.get(4)?,
                publication_month: row.get(5)?,
                publication_year: row.get(6)?,
                publication_type: row.get(7)?,
                citations: row.get(8)?,
                first_author: row.get(9)?,
                corresponding_author: row.get(10)?,
                is_student_first_author: row.get::<_, i32>(11)? != 0,
                foreign_collab: row.get(12)?,
                impact_factor: row.get(13)?,
                q_rank: row.get(14)?,
                open_access: row.get::<_, i32>(15)? != 0,
                tagged_date: row.get(16)?,
                source_file: row.get(17)?,
                created_at: Some(row.get(18)?),
                updated_at: Some(row.get(19)?),
            })
        })?.collect::<SqlResult<Vec<Publication>>>()?;

        let mut results = Vec::new();
        for p in pubs {
            let p_id = p.id.unwrap();
            let authors = Self::get_authors_for_publication(&conn, p_id)?;
            let student_count = conn.query_row(
                "SELECT COUNT(*) FROM student_publications WHERE publication_id = ?1",
                params![p_id],
                |row| row.get(0),
            ).unwrap_or(0);
            
            results.push(PublicationWithAuthors {
                publication: p,
                authors,
                student_count,
            });
        }
        Ok(results)
    }

    /// Get students for a specific publication
    pub fn get_publication_students(&self, publication_id: i64) -> Result<Vec<Student>, AppError> {
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let mut stmt = conn.prepare(
            "SELECT s.id, s.student_id, s.student_name, s.department, s.school, s.batch,
                    s.photo_path, s.poster_path, s.created_at, s.updated_at
             FROM students s
             JOIN student_publications sp ON sp.student_id = s.id
             WHERE sp.publication_id = ?1"
        )?;
        
        let students = stmt.query_map(params![publication_id], |row| {
            Ok(Student {
                id: Some(row.get(0)?),
                student_id: row.get(1)?,
                student_name: row.get(2)?,
                department: row.get(3)?,
                school: row.get(4)?,
                batch: row.get(5)?,
                photo_path: row.get(6)?,
                poster_path: row.get(7)?,
                created_at: Some(row.get(8)?),
                updated_at: Some(row.get(9)?),
            })
        })?.collect::<SqlResult<Vec<Student>>>()?;
        
        Ok(students)
    }

    // ── Publication-Aware Bulk Import ────────────────────────────────────

    /// Execute a full publication-aware import within a single transaction.
    /// This is the core import engine called from commands.rs.
    ///
    /// `grouped_publications` is a list of (PublicationCreate, Vec<(reg_number, author_name, school)>).
    /// The author list from the Excel Authors column is also provided to build the full author ordering.
    pub fn bulk_import_publications(
        &self,
        grouped_publications: &[(
            PublicationCreate,
            Vec<(String, String)>,  // (author_name, author_type) in order
            Vec<(String, String, Option<String>, Option<String>)>, // (reg_number, student_name, school, image) student entries
        )],
        _source_filename: &str,
    ) -> Result<(i32, i32, i32, i32), AppError> {
        // Returns (publications_created, publications_updated, students_created, students_linked)
        let conn = self.conn.lock().map_err(|e| AppError::Generic(e.to_string()))?;
        let tx = conn.unchecked_transaction()?;

        let mut pubs_created = 0i32;
        let mut pubs_updated = 0i32;
        let mut students_created = 0i32;
        let mut students_linked = 0i32;

        for (pub_data, author_list, student_entries) in grouped_publications {
            // 1. Upsert publication
            let (pub_id, is_new) = Self::upsert_publication_with_conn(&tx, pub_data)?;
            if is_new { pubs_created += 1; } else { pubs_updated += 1; }

            // 2. Upsert students from the reg-number list
            let mut student_id_map: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

            for (reg, name, school, image) in student_entries {
                // Check if student exists
                let existing = Self::get_student_internal_id_with_conn(&tx, reg)?;
                let internal_id = if let Some(id) = existing {
                    // Update school if not set
                    if school.is_some() || image.is_some() {
                        let _ = tx.execute(
                            "UPDATE students SET school = COALESCE(school, ?1), photo_path = COALESCE(photo_path, ?2), updated_at = datetime('now') WHERE id = ?3",
                            params![school, image, id],
                        );
                    }
                    id
                } else {
                    // Create student with register number as both ID and name placeholder
                    let batch = calculate_batch_from_reg(reg);
                    tx.execute(
                        "INSERT INTO students (student_id, student_name, school, batch, photo_path) VALUES (?1, ?2, ?3, ?4, ?5)",
                        params![reg, name, school, batch, image],
                    )?;
                    students_created += 1;
                    tx.last_insert_rowid()
                };

                student_id_map.insert(reg.clone(), internal_id);

                // 3. Link student to publication
                Self::link_student_publication_with_conn(&tx, internal_id, pub_id)?;
                students_linked += 1;
            }

            // 4. Build and set publication authors
            let mut author_records: Vec<(i32, String, String, Option<i64>, Option<i64>)> = Vec::new();

            for (order_idx, (aname, atype)) in author_list.iter().enumerate() {
                let (sid, fid) = match atype.as_str() {
                    "student" => {
                        // Find matching student by checking if any student_entries have this author
                        // We match by position — the confirmed sequence rule
                        let _sid = student_entries.iter()
                            .find_map(|(reg, _name, _school, _image)| student_id_map.get(reg).copied());
                        // Actually, we need to match by order. Students are mapped by their
                        // position in the author list, not by name matching.
                        // This is handled in excel.rs — the author_type is already correctly assigned.
                        (None, None) // student_id set below
                    }
                    "faculty" => {
                        // Upsert faculty
                        let fid = Self::upsert_faculty_with_conn(&tx, aname, None, None)?;
                        (None, Some(fid))
                    }
                    _ => (None, None),
                };

                author_records.push((
                    (order_idx + 1) as i32,
                    aname.clone(),
                    atype.clone(),
                    sid,
                    fid,
                ));
            }

            // Now set student_ids on author records by matching position
            // The excel parser ensures student authors map to reg numbers in sequence
            let mut student_author_idx = 0;
            let student_regs: Vec<&String> = student_entries.iter().map(|(reg, _, _, _)| reg).collect();

            for record in author_records.iter_mut() {
                if record.2 == "student" && student_author_idx < student_regs.len() {
                    let reg = student_regs[student_author_idx];
                    record.3 = student_id_map.get(reg).copied();
                    student_author_idx += 1;
                }
            }

            Self::set_publication_authors_with_conn(&tx, pub_id, &author_records)?;
        }

        tx.commit()?;

        Ok((pubs_created, pubs_updated, students_created, students_linked))
    }
}
// ── Helper ────────────────────────────────────────────────────────────────

fn calculate_batch_from_reg(reg: &str) -> Option<String> {
    if reg.len() >= 2 {
        let prefix = &reg[0..2];
        if let Ok(year_short) = prefix.parse::<u32>() {
            // Assume 20xx for batch start year
            let start_year = 2000 + year_short;
            let end_year = start_year + 4;
            return Some(end_year.to_string());
        }
    }
    None
}
