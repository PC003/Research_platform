//! UG Research Desktop — Application entry point.
//!
//! Local-first desktop application for student management, Excel import,
//! and poster generation. All data stored locally in SQLite + filesystem.

mod commands;
mod db;
mod error;
mod excel;
mod poster;
mod storage;
mod excel_image_extractor;

use db::Database;
use storage::StorageManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_secs()
        .init();

    log::info!("Starting UG Research Desktop v{}", env!("CARGO_PKG_VERSION"));

    // Initialize storage (creates app data directories)
    let storage = StorageManager::new().expect("Failed to initialize application storage");
    log::info!("App data directory: {:?}", storage.base_dir());

    // Initialize database
    let db_path = storage.database_path();
    let database = Database::new(&db_path).expect("Failed to initialize database");
    log::info!("Database initialized at: {:?}", db_path);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(storage)
        .manage(database)
        .invoke_handler(tauri::generate_handler![
            // App info
            commands::get_app_info,
            commands::open_data_folder,
            // Student CRUD
            commands::create_student,
            commands::get_student,
            commands::list_students,
            commands::update_student,
            commands::update_student_photo,
            commands::delete_student,
            // Faculty CRUD
            commands::create_faculty,
            commands::get_faculty,
            commands::list_faculty,
            commands::update_faculty,
            commands::delete_faculty,
            // Publication CRUD
            commands::create_publication,
            commands::get_publication,
            commands::list_publications,
            commands::delete_publication,
            commands::update_publication,
            commands::get_student_publications,
            commands::get_faculty_publications,
            // Metadata
            commands::get_departments,
            commands::get_batches,
            commands::list_journals,
            commands::list_publication_types,
            commands::list_publication_months,
            commands::list_schools,
            // Dashboard
            commands::get_dashboard_stats,
            // Excel import
            commands::preview_excel_import,
            commands::execute_excel_import,
            // Poster
            commands::prepare_poster,
            commands::prepare_spotlight_poster,
            commands::save_poster_image,
            commands::get_auto_select_candidates,
            commands::get_top_publications,
            commands::get_publication_students,
            // Images
            commands::get_image_base64,
            // Storage
            commands::get_storage_info,
            commands::get_students_with_posters,
            commands::reset_all_data,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running UG Research Desktop");
}
