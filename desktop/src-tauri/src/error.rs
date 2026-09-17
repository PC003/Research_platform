//! Unified error handling for the desktop application.

use serde::Serialize;

/// All possible errors in the desktop application.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Image error: {0}")]
    Image(#[from] image::ImageError),

    #[error("Excel error: {0}")]
    Excel(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Poster generation error: {0}")]
    PosterGeneration(String),

    #[error("{0}")]
    Generic(String),
}

/// Serializable error response for the frontend.
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: String,
}

impl From<AppError> for ErrorResponse {
    fn from(err: AppError) -> Self {
        let code = match &err {
            AppError::Database(_) => "DB_ERROR",
            AppError::Io(_) => "IO_ERROR",
            AppError::Json(_) => "JSON_ERROR",
            AppError::Image(_) => "IMAGE_ERROR",
            AppError::Excel(_) => "EXCEL_ERROR",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Storage(_) => "STORAGE_ERROR",
            AppError::PosterGeneration(_) => "POSTER_ERROR",
            AppError::Generic(_) => "GENERIC_ERROR",
        };
        ErrorResponse {
            error: err.to_string(),
            code: code.to_string(),
        }
    }
}

// Make AppError serializable for Tauri command returns
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let response = ErrorResponse::from(AppError::Generic(self.to_string()));
        response.serialize(serializer)
    }
}
