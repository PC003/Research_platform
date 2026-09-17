//! Tauri commands — the IPC bridge between React frontend and Rust backend.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::State;
use base64::Engine;

use crate::db::{
    Database, DashboardStats, Student, StudentCreate, StudentUpdate,
    Faculty, FacultyCreate, Publication, PublicationCreate, PublicationUpdate,
    PublicationWithAuthors, PublicationFilter, StudentPublicationEntry
};
use crate::error::AppError;
use crate::excel;
use crate::poster;
use crate::storage::StorageManager;

// ── App Info ────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct AppInfo {
    pub data_dir: String,
    pub version: String,
}

#[tauri::command]
pub fn get_app_info(storage: State<StorageManager>) -> Result<AppInfo, AppError> {
    Ok(AppInfo {
        data_dir: storage.base_dir().to_string_lossy().to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

#[tauri::command]
pub fn open_data_folder(storage: State<StorageManager>) -> Result<String, AppError> {
    let path = storage.base_dir().to_string_lossy().to_string();
    Ok(path)
}

// ── Student Commands ────────────────────────────────────────────────────────

#[tauri::command]
pub fn create_student(
    db: State<Database>,
    storage: State<StorageManager>,
    student_id: String,
    student_name: String,
    department: Option<String>,
    school: Option<String>,
    batch: Option<String>,
    photo_path: Option<String>,
) -> Result<Student, AppError> {
    let student_id = student_id.trim().to_string();
    let student_name = student_name.trim().to_string();

    if student_id.is_empty() { return Err(AppError::Validation("Student ID is required".into())); }
    if student_name.is_empty() { return Err(AppError::Validation("Student Name is required".into())); }
    if db.student_exists(&student_id)? {
        return Err(AppError::Validation(format!("Student ID '{}' already exists", student_id)));
    }

    let stored_photo = if let Some(ref path) = photo_path {
        let source = PathBuf::from(path);
        if source.exists() { Some(storage.copy_student_photo(&student_id, &source)?) } else { None }
    } else { None };

    let data = StudentCreate { student_id, student_name, department, school, batch };
    db.create_student(&data, stored_photo.as_deref())
}

#[tauri::command]
pub fn get_student(db: State<Database>, student_id: String) -> Result<Student, AppError> {
    db.get_student(&student_id)
}

#[derive(Serialize)]
pub struct StudentListResponse {
    pub students: Vec<Student>,
    pub total: i64,
}

#[tauri::command]
pub fn list_students(
    db: State<Database>,
    search: Option<String>,
    department: Option<String>,
    school: Option<String>,
    batch: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<StudentListResponse, AppError> {
    let (students, total) = db.list_students(
        search.as_deref(), department.as_deref(), school.as_deref(), batch.as_deref(),
        limit.unwrap_or(50), offset.unwrap_or(0),
    )?;
    Ok(StudentListResponse { students, total })
}

#[tauri::command]
pub fn update_student(
    db: State<Database>,
    student_id: String,
    student_name: Option<String>,
    department: Option<String>,
    school: Option<String>,
    batch: Option<String>,
) -> Result<Student, AppError> {
    let data = StudentUpdate { student_name, department, school, batch };
    db.update_student(&student_id, &data)
}

#[tauri::command]
pub fn update_student_photo(
    db: State<Database>,
    storage: State<StorageManager>,
    student_id: String,
    photo_path: String,
) -> Result<Student, AppError> {
    let source = PathBuf::from(&photo_path);
    if !source.exists() { return Err(AppError::Validation("Photo file does not exist".into())); }
    let stored = storage.copy_student_photo(&student_id, &source)?;
    db.update_student_photo(&student_id, &stored)?;
    db.get_student(&student_id)
}

#[tauri::command]
pub fn delete_student(
    db: State<Database>,
    storage: State<StorageManager>,
    student_id: String,
) -> Result<(), AppError> {
    db.delete_student(&student_id)?;
    storage.delete_student_files(&student_id)?;
    Ok(())
}

// ── Faculty Commands ────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct FacultyListResponse {
    pub faculty: Vec<Faculty>,
    pub total: i64,
}

#[tauri::command]
pub fn create_faculty(db: State<Database>, data: FacultyCreate) -> Result<Faculty, AppError> {
    db.create_faculty(&data)
}

#[tauri::command]
pub fn get_faculty(db: State<Database>, id: i64) -> Result<Faculty, AppError> {
    db.get_faculty_by_id(id)
}

#[tauri::command]
pub fn list_faculty(
    db: State<Database>,
    search: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<FacultyListResponse, AppError> {
    let (faculty, total) = db.list_faculty(search.as_deref(), limit.unwrap_or(50), offset.unwrap_or(0))?;
    Ok(FacultyListResponse { faculty, total })
}

#[tauri::command]
pub fn update_faculty(db: State<Database>, id: i64, data: FacultyCreate) -> Result<Faculty, AppError> {
    db.update_faculty(id, &data)
}

#[tauri::command]
pub fn delete_faculty(db: State<Database>, id: i64) -> Result<(), AppError> {
    db.delete_faculty(id)
}

// ── Publication Commands ────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct PublicationListResponse {
    pub publications: Vec<PublicationWithAuthors>,
    pub total: i64,
}

#[tauri::command]
pub fn create_publication(db: State<Database>, data: PublicationCreate) -> Result<Publication, AppError> {
    db.create_publication(&data)
}

#[tauri::command]
pub fn get_publication(db: State<Database>, id: i64) -> Result<PublicationWithAuthors, AppError> {
    db.get_publication_with_authors(id)
}

#[tauri::command]
pub fn list_publications(
    db: State<Database>,
    filter: PublicationFilter,
) -> Result<PublicationListResponse, AppError> {
    let (publications, total) = db.list_publications(&filter)?;
    Ok(PublicationListResponse { publications, total })
}

#[tauri::command]
pub fn update_publication(db: State<Database>, id: i64, data: PublicationUpdate) -> Result<Publication, AppError> {
    db.update_publication(id, &data)
}

#[tauri::command]
pub fn delete_publication(db: State<Database>, id: i64) -> Result<(), AppError> {
    db.delete_publication(id)
}

#[tauri::command]
pub fn get_student_publications(db: State<Database>, student_id: String) -> Result<Vec<StudentPublicationEntry>, AppError> {
    db.get_student_publications(&student_id)
}

#[tauri::command]
pub fn get_faculty_publications(db: State<Database>, faculty_id: i64) -> Result<Vec<StudentPublicationEntry>, AppError> {
    db.get_faculty_publications(faculty_id)
}

// ── Metadata ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_departments(db: State<Database>) -> Result<Vec<String>, AppError> { db.get_departments() }

#[tauri::command]
pub fn get_batches(db: State<Database>) -> Result<Vec<String>, AppError> { db.get_batches() }

#[tauri::command]
pub fn list_journals(db: State<Database>) -> Result<Vec<String>, AppError> { db.list_journals() }

#[tauri::command]
pub fn list_publication_types(db: State<Database>) -> Result<Vec<String>, AppError> { db.list_publication_types() }

#[tauri::command]
pub fn list_publication_months(db: State<Database>) -> Result<Vec<crate::db::MonthCount>, AppError> { db.list_publication_months() }

#[tauri::command]
pub fn list_schools(db: State<Database>) -> Result<Vec<String>, AppError> { db.list_schools() }

// ── Dashboard ───────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_dashboard_stats(db: State<Database>) -> Result<DashboardStats, AppError> {
    db.get_dashboard_stats()
}

// ── Excel Import ────────────────────────────────────────────────────────────

#[tauri::command]
pub fn preview_excel_import(
    file_path: String,
) -> Result<excel::PublicationImportPreview, AppError> {
    let path = PathBuf::from(&file_path);
    if !path.exists() { return Err(AppError::Validation("File does not exist".into())); }
    excel::parse_publication_excel_for_preview(&path)
}

#[derive(Deserialize)]
pub struct ImportOptions {
    pub skip_errors: bool,
    pub import_warnings: bool,
}

#[derive(Serialize)]
pub struct PublicationImportResult {
    pub publications_created: i32,
    pub publications_updated: i32,
    pub students_created: i32,
    pub students_linked: i32,
    pub error_count: i32,
    pub errors: Vec<String>,
}

#[tauri::command]
pub fn execute_excel_import(
    db: State<Database>,
    storage: State<StorageManager>,
    file_path: String,
    options: ImportOptions,
) -> Result<PublicationImportResult, AppError> {
    let path = PathBuf::from(&file_path);
    let parent_dir = path.parent().unwrap_or(Path::new(""));
    
    // Parse again to get the exact data payload
    let preview = excel::parse_publication_excel_for_preview(&path)?;
    let embedded_images = crate::excel_image_extractor::extract_cell_images(&path).unwrap_or_default();
    
    let mut grouped_pubs = Vec::new();
    let mut errors = Vec::new();
    let mut error_count = 0;

    for p in &preview.publications {
        if p.status == excel::RowStatus::Error {
            error_count += 1;
            for err in &p.errors {
                errors.push(format!("Publication '{}': {}", p.title, err));
            }
            continue;
        }

        if p.status == excel::RowStatus::Warning && !options.import_warnings {
            continue;
        }

        let pub_create = PublicationCreate {
            title: p.title.clone(),
            journal: p.journal.clone(),
            doi: p.doi.clone(),
            publication_date: None,
            publication_month: None, 
            publication_year: p.publication_year,
            publication_type: p.publication_type.clone(),
            citations: p.citations,
            first_author: p.first_author.clone(),
            corresponding_author: p.corresponding_author.clone(),
            is_student_first_author: p.is_student_first_author,
            foreign_collab: p.foreign_collab.clone(),
            impact_factor: p.impact_factor,
            q_rank: p.q_rank.clone(),
            open_access: p.open_access,
            tagged_date: p.tagged_date.clone(),
            source_file: Some(path.file_name().unwrap_or_default().to_string_lossy().to_string()),
            students: None,
        };

        let author_list: Vec<(String, String)> = p.authors.iter()
            .map(|a| (a.name.clone(), a.author_type.clone()))
            .collect();
            
        let student_entries: Vec<(String, String, Option<String>, Option<String>)> = p.authors.iter()
            .filter(|a| a.author_type == "student" && a.reg_number.is_some())
            .map(|a| {
                let reg = a.reg_number.clone().unwrap();
                let school = p.student_schools.get(&reg).cloned();
                
                let mut image_relative_path = None;
                if let Some(img_filename) = p.student_images.get(&reg) {
                    if img_filename.starts_with("embed://") {
                        if let Ok(abs_row) = img_filename.trim_start_matches("embed://").parse::<usize>() {
                            if let Some(bytes) = embedded_images.get(&abs_row) {
                                if let Ok(rel_path) = storage.save_student_photo_bytes(&reg, bytes, "jpeg") {
                                    image_relative_path = Some(rel_path);
                                }
                            }
                        }
                    } else {
                        let full_img_path = parent_dir.join(img_filename);
                        if let Ok(bytes) = std::fs::read(&full_img_path) {
                            let ext = full_img_path.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
                            if let Ok(rel_path) = storage.save_student_photo_bytes(&reg, &bytes, ext) {
                                image_relative_path = Some(rel_path);
                            }
                        }
                    }
                }
                
                (reg, a.name.clone(), school, image_relative_path)
            })
            .collect();

        grouped_pubs.push((pub_create, author_list, student_entries));
    }

    let (pubs_c, pubs_u, studs_c, studs_l) = db.bulk_import_publications(&grouped_pubs, &preview.filename)?;

    // Record import
    db.record_publication_import(
        &preview.filename,
        preview.total_rows as i32,
        pubs_c + pubs_u, // total imported (we'll count pubs for this)
        0, // skipped
        preview.error_count as i32,
        pubs_c + pubs_u, // publications count
        preview.warning_count as i32,
    )?;

    Ok(PublicationImportResult {
        publications_created: pubs_c,
        publications_updated: pubs_u,
        students_created: studs_c,
        students_linked: studs_l,
        error_count,
        errors,
    })
}

// ── Poster Generation ───────────────────────────────────────────────────────

#[tauri::command]
pub fn prepare_poster(
    db: State<Database>,
    storage: State<StorageManager>,
    student_ids: Vec<String>,
    month: String,
    year: String,
    achievement_type: String,
) -> Result<Vec<poster::PosterPage>, AppError> {
    let mut students = Vec::new();
    for sid in &student_ids {
        if let Ok(s) = db.get_student(sid) { students.push(s); }
    }
    if students.is_empty() {
        return Err(AppError::PosterGeneration("No valid students found".into()));
    }
    let month_idx = match month.as_str() {
        "January" => 1, "February" => 2, "March" => 3, "April" => 4,
        "May" => 5, "June" => 6, "July" => 7, "August" => 8,
        "September" => 9, "October" => 10, "November" => 11, "December" => 12,
        _ => 0,
    };
    
    let year_val = year.parse::<i32>().unwrap_or(0);
    
    let stats = db.get_publication_stats_for_month(month_idx, year_val).unwrap_or((0, 0, 0, 0));

    poster::prepare_poster_pages(&students, storage.base_dir(), &month, &year, &achievement_type, stats)
}

#[tauri::command]
pub fn get_auto_select_candidates(db: State<Database>, month: String, year: String, achievement_type: String) -> Result<Vec<String>, AppError> {
    db.get_auto_select_candidates(&month, &year, &achievement_type)
}

#[tauri::command]
pub fn save_poster_image(
    db: State<Database>,
    storage: State<StorageManager>,
    student_ids: Vec<String>,
    image_data: String,
    page_number: usize,
    prefix: Option<String>,
) -> Result<String, AppError> {
    let data = base64::engine::general_purpose::STANDARD.decode(&image_data)
        .map_err(|e| AppError::PosterGeneration(format!("Invalid image data: {}", e)))?;

    let dir_id = student_ids.first().ok_or_else(|| AppError::PosterGeneration("No student IDs".into()))?;

    let timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
    
    let safe_prefix = prefix.unwrap_or_else(|| "poster".to_string()).replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_");
    let poster_filename = format!("{}_{}_p{}.png", safe_prefix, timestamp, page_number);
    
    let poster_dir = if student_ids.len() > 1 {
        let dir = storage.base_dir().join("posters");
        std::fs::create_dir_all(&dir)?;
        dir
    } else {
        storage.ensure_student_dir(dir_id)?
    };

    let dest = poster_dir.join(&poster_filename);
    std::fs::write(&dest, &data)?;

    let relative_path = if student_ids.len() > 1 { 
        format!("posters/{}", poster_filename) 
    } else { 
        format!("students/{}/{}", dir_id, poster_filename) 
    };

    for sid in &student_ids {
        let _ = db.update_student_poster(sid, &relative_path);
    }
    Ok(relative_path)
}

// ── Image serving ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_image_base64(storage: State<StorageManager>, relative_path: String) -> Result<String, AppError> {
    let full_path = storage.resolve_path(&relative_path);
    if !full_path.exists() { return Err(AppError::NotFound(format!("Image not found: {}", relative_path))); }
    let data = std::fs::read(&full_path)?;
    let ext = full_path.extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() { "jpg" | "jpeg" => "image/jpeg", "gif" => "image/gif", "webp" => "image/webp", _ => "image/png" };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(format!("data:{};base64,{}", mime, b64))
}

// ── Backup ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_storage_info(storage: State<StorageManager>) -> Result<serde_json::Value, AppError> {
    let base = storage.base_dir();
    let db_path = storage.database_path();
    let db_size = if db_path.exists() { std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0) } else { 0 };
    let students_dir = storage.students_dir();
    let student_count = if students_dir.exists() { std::fs::read_dir(&students_dir).map(|rd| rd.count()).unwrap_or(0) } else { 0 };
    Ok(serde_json::json!({ "data_dir": base.to_string_lossy(), "database_size_bytes": db_size, "student_folders": student_count }))
}

#[tauri::command]
pub fn get_students_with_posters(db: State<Database>) -> Result<Vec<Student>, AppError> {
    db.get_students_with_posters()
}

#[tauri::command]
pub fn get_top_publications(db: State<Database>, month: String, year: String) -> Result<Vec<crate::db::PublicationWithAuthors>, AppError> {
    db.get_top_publications(&month, &year)
}

#[tauri::command]
pub fn get_publication_students(db: State<Database>, publication_id: i64) -> Result<Vec<Student>, AppError> {
    db.get_publication_students(publication_id)
}

#[tauri::command]
pub fn prepare_spotlight_poster(
    db: State<Database>,
    storage: State<StorageManager>,
    publication_id: i64,
) -> Result<poster::PosterPage, AppError> {
    let students = db.get_publication_students(publication_id)?;
    if students.is_empty() {
        return Err(AppError::PosterGeneration("No students linked to this publication".into()));
    }
    let pub_record = db.get_publication(publication_id)?;
    poster::prepare_spotlight_page(&students, &pub_record, storage.base_dir())
}


#[tauri::command]
pub fn reset_all_data(db: State<Database>, storage: State<StorageManager>) -> Result<(), AppError> {
    db.reset_all_data()?;
    let _ = std::fs::remove_dir_all(storage.base_dir().join("students"));
    let _ = std::fs::remove_dir_all(storage.base_dir().join("posters"));
    Ok(())
}
