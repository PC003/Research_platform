//! Filesystem storage manager.
//! Creates and manages the application data directory structure.

use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppError;

/// Application data directory structure:
/// ```text
/// {app_data}/UGResearch/
/// ├── database/
/// │   └── research.db
/// ├── students/
/// │   └── {student_id}/
/// │       ├── photo.*
/// │       └── poster.png
/// ├── imports/
/// ├── exports/
/// └── logs/
/// ```
pub struct StorageManager {
    base_dir: PathBuf,
}

impl StorageManager {
    /// Create a new StorageManager, initializing all required directories.
    pub fn new() -> Result<Self, AppError> {
        let base_dir = Self::resolve_base_dir()?;
        let manager = Self { base_dir };
        manager.ensure_directories()?;
        Ok(manager)
    }

    /// Resolve the OS-appropriate application data directory.
    fn resolve_base_dir() -> Result<PathBuf, AppError> {
        let data_dir = dirs::data_dir().ok_or_else(|| {
            AppError::Storage("Could not determine application data directory".into())
        })?;
        Ok(data_dir.join("UGResearch"))
    }

    /// Create all required directories if they don't exist.
    fn ensure_directories(&self) -> Result<(), AppError> {
        let dirs_to_create = [
            self.database_dir(),
            self.students_dir(),
            self.imports_dir(),
            self.exports_dir(),
            self.logs_dir(),
        ];
        for dir in &dirs_to_create {
            fs::create_dir_all(dir)?;
        }
        Ok(())
    }

    // ── Directory accessors ──────────────────────────────────────────────

    pub fn base_dir(&self) -> &Path {
        &self.base_dir
    }

    pub fn database_dir(&self) -> PathBuf {
        self.base_dir.join("database")
    }

    pub fn database_path(&self) -> PathBuf {
        self.database_dir().join("research.db")
    }

    pub fn students_dir(&self) -> PathBuf {
        self.base_dir.join("students")
    }

    pub fn imports_dir(&self) -> PathBuf {
        self.base_dir.join("imports")
    }

    pub fn exports_dir(&self) -> PathBuf {
        self.base_dir.join("exports")
    }

    pub fn logs_dir(&self) -> PathBuf {
        self.base_dir.join("logs")
    }

    // ── Student file operations ─────────────────────────────────────────

    /// Get or create the directory for a specific student.
    pub fn student_dir(&self, student_id: &str) -> PathBuf {
        self.students_dir().join(sanitize_filename(student_id))
    }

    /// Ensure student directory exists and return its path.
    pub fn ensure_student_dir(&self, student_id: &str) -> Result<PathBuf, AppError> {
        let dir = self.student_dir(student_id);
        fs::create_dir_all(&dir)?;
        Ok(dir)
    }

    /// Copy a source image into the student's managed directory.
    /// Returns the relative path from base_dir for database storage.
    pub fn copy_student_photo(
        &self,
        student_id: &str,
        source_path: &Path,
    ) -> Result<String, AppError> {
        let student_dir = self.ensure_student_dir(student_id)?;
        let extension = source_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png");
        let dest_filename = format!("photo.{}", extension);
        let dest_path = student_dir.join(&dest_filename);
        fs::copy(source_path, &dest_path)?;
        // Return relative path for DB storage
        let relative = format!(
            "students/{}/{}",
            sanitize_filename(student_id),
            dest_filename
        );
        Ok(relative)
    }

    /// Save image bytes to a student's directory.
    /// Returns the relative path from base_dir.
    pub fn save_student_photo_bytes(
        &self,
        student_id: &str,
        image_data: &[u8],
        extension: &str,
    ) -> Result<String, AppError> {
        let student_dir = self.ensure_student_dir(student_id)?;
        let dest_filename = format!("photo.{}", extension);
        let dest_path = student_dir.join(&dest_filename);
        fs::write(&dest_path, image_data)?;
        let relative = format!(
            "students/{}/{}",
            sanitize_filename(student_id),
            dest_filename
        );
        Ok(relative)
    }

    /// Save a generated poster to the student's directory.
    /// Returns the relative path from base_dir.
    pub fn save_student_poster(
        &self,
        student_id: &str,
        png_data: &[u8],
    ) -> Result<String, AppError> {
        let student_dir = self.ensure_student_dir(student_id)?;
        let dest_path = student_dir.join("poster.png");
        fs::write(&dest_path, png_data)?;
        let relative = format!("students/{}/poster.png", sanitize_filename(student_id));
        Ok(relative)
    }

    /// Resolve a relative path to an absolute path within app storage.
    pub fn resolve_path(&self, relative: &str) -> PathBuf {
        self.base_dir.join(relative)
    }

    /// Delete a student's entire directory.
    pub fn delete_student_files(&self, student_id: &str) -> Result<(), AppError> {
        let dir = self.student_dir(student_id);
        if dir.exists() {
            fs::remove_dir_all(&dir)?;
        }
        Ok(())
    }
}

/// Sanitize a filename/directory name to prevent path traversal and invalid characters.
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect::<String>()
}

