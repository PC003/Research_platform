import { invoke } from '@tauri-apps/api/core';

/**
 * Frontend service layer — wraps all Tauri IPC invoke calls.
 * This is the ONLY place that communicates with Rust.
 */

// ── App Info ────────────────────────────────────────────────────────────

export async function getAppInfo() {
  return invoke('get_app_info');
}

export async function openDataFolder() {
  const path = await invoke('open_data_folder');
  // Use shell to open in OS file manager
  const { open } = await import('@tauri-apps/plugin-shell');
  await open(path);
}

export async function resetData() {
  return invoke('reset_all_data');
}

// ── Student CRUD ────────────────────────────────────────────────────────

export async function createStudent({ studentId, studentName, department, school, batch, photoPath }) {
  return invoke('create_student', {
    studentId,
    studentName,
    department: department || null,
    school: school || null,
    batch: batch || null,
    photoPath: photoPath || null,
  });
}

export async function getStudent(studentId) {
  return invoke('get_student', { studentId });
}

export async function listStudents({ search, department, school, batch, limit, offset } = {}) {
  return invoke('list_students', {
    search: search || null,
    department: department || null,
    school: school || null,
    batch: batch || null,
    limit: limit || 50,
    offset: offset || 0,
  });
}

export async function updateStudent(studentId, updates) {
  return invoke('update_student', {
    studentId,
    studentName: updates.studentName || null,
    department: updates.department || null,
    school: updates.school || null,
    batch: updates.batch || null,
  });
}

export async function updateStudentPhoto(studentId, photoPath) {
  return invoke('update_student_photo', { studentId, photoPath });
}

export async function deleteStudent(studentId) {
  return invoke('delete_student', { studentId });
}

// ── Faculty CRUD ────────────────────────────────────────────────────────

export async function createFaculty({ name, department, school }) {
  return invoke('create_faculty', { data: { name, department: department || null, school: school || null } });
}

export async function getFaculty(id) {
  return invoke('get_faculty', { id });
}

export async function listFaculty({ search, limit, offset } = {}) {
  return invoke('list_faculty', { search: search || null, limit: limit || 50, offset: offset || 0 });
}

export async function updateFaculty(id, updates) {
  return invoke('update_faculty', {
    id,
    data: {
      name: updates.name,
      department: updates.department || null,
      school: updates.school || null
    }
  });
}

export async function deleteFaculty(id) {
  return invoke('delete_faculty', { id });
}

// ── Publication CRUD ────────────────────────────────────────────────────

export async function createPublication(data) {
  return invoke('create_publication', { data });
}

export async function getPublication(id) {
  return invoke('get_publication', { id });
}

export async function listPublications(filter = {}) {
  return invoke('list_publications', {
    filter: {
      search: filter.search || null,
      journal: filter.journal || null,
      publication_type: filter.publication_type || null,
      publication_month: filter.publication_month || null,
      publication_year: filter.publication_year || null,
      student_id: filter.student_id || null,
      faculty_id: filter.faculty_id || null,
      q_rank: filter.q_rank || null,
      limit: filter.limit || 50,
      offset: filter.offset || 0,
    }
  });
}

export async function updatePublication(id, data) {
  return invoke('update_publication', { id, data });
}

export async function deletePublication(id) {
  return invoke('delete_publication', { id });
}

export async function getStudentPublications(studentId) {
  return await invoke('get_student_publications', { studentId });
}

export async function getFacultyPublications(facultyId) {
  return await invoke('get_faculty_publications', { facultyId });
}

// ── Metadata ────────────────────────────────────────────────────────────

export async function getDepartments() {
  return invoke('get_departments');
}

export async function getBatches() {
  return invoke('get_batches');
}

export async function listJournals() {
  return invoke('list_journals');
}

export async function listPublicationTypes() {
  return invoke('list_publication_types');
}

export async function listPublicationMonths() {
  return invoke('list_publication_months');
}

export async function listSchools() {
  return invoke('list_schools');
}

// ── Dashboard ───────────────────────────────────────────────────────────

export async function getDashboardStats() {
  return invoke('get_dashboard_stats');
}

// ── Excel Import ────────────────────────────────────────────────────────

export async function previewExcelImport(filePath) {
  return invoke('preview_excel_import', { filePath });
}

export async function executeExcelImport(filePath, options) {
  return invoke('execute_excel_import', { filePath, options });
}

// ── Poster ──────────────────────────────────────────────────────────────

export async function preparePoster(studentIds, month, year, achievementType) {
  return invoke('prepare_poster', {
    studentIds,
    month,
    year,
    achievementType,
  });
}

export async function savePosterImage(studentIds, imageData, pageNumber, prefix) {
  return invoke('save_poster_image', { studentIds, imageData, pageNumber, prefix });
}

export async function getAutoSelectCandidates(month, year, achievementType) {
  return invoke('get_auto_select_candidates', { month, year, achievementType });
}

export async function getTopPublications(month, year) {
  return invoke('get_top_publications', { month, year });
}

export async function getPublicationStudents(publicationId) {
  return invoke('get_publication_students', { publicationId });
}

export async function prepareSpotlightPoster(publicationId) {
  return invoke('prepare_spotlight_poster', { publicationId });
}

export async function getStudentsWithPosters() {
  return invoke('get_students_with_posters');
}

// ── Images ──────────────────────────────────────────────────────────────

export async function getImageBase64(relativePath) {
  return invoke('get_image_base64', { relativePath });
}

// ── Storage ─────────────────────────────────────────────────────────────

export async function getStorageInfo() {
  return invoke('get_storage_info');
}
