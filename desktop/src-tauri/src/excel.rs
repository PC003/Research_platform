//! Excel import pipeline for publications.
//!
//! Pipeline:
//! 1. Open .xlsx with calamine for cell data
//! 2. Identify column headers
//! 3. Parse all data rows
//! 4. Group rows by Publication (DOI or Title+Year)
//! 5. Map student register numbers to the Author list using the sequence rule
//! 6. Return PublicationImportPreview

use calamine::{open_workbook, Reader, Xlsx, Data};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;

use crate::error::AppError;

// ── Public Data Structures ──────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedAuthor {
    pub name: String,
    pub author_type: String, // "student", "faculty", "external"
    pub reg_number: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedPublication {
    pub title: String,
    pub journal: Option<String>,
    pub doi: Option<String>,
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
    
    pub authors: Vec<DetectedAuthor>,
    pub student_schools: HashMap<String, String>, // reg_number -> school
    pub student_images: HashMap<String, String>, // reg_number -> image_path
    
    pub row_indices: Vec<usize>, // Which rows in the excel file this pub came from
    pub status: RowStatus,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RowStatus {
    Valid,
    Warning,
    Error,
    Duplicate,
}

/// Preview result before committing import.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicationImportPreview {
    pub filename: String,
    pub sheet_name: String,
    pub total_rows: usize, // Excel rows processed
    pub publications_count: usize, // Unique publications detected
    pub students_count: usize, // Unique students detected
    pub faculty_count: usize, // Faculty detected
    
    pub valid_count: usize,
    pub warning_count: usize,
    pub error_count: usize,
    
    pub publications: Vec<DetectedPublication>,
    pub detected_columns: Vec<String>,
}

// ── Column Detection ────────────────────────────────────────────────────────

#[derive(Debug, Default)]
struct PublicationColumnMap {
    reg_no: Option<usize>,
    school: Option<usize>,
    title: Option<usize>,
    authors: Option<usize>,
    journal: Option<usize>,
    doi: Option<usize>,
    year: Option<usize>,
    citations: Option<usize>,
    pub_type: Option<usize>,
    foreign_collab: Option<usize>,
    impact_factor: Option<usize>,
    open_access: Option<usize>,
    q_rank: Option<usize>,
    first_author: Option<usize>,
    corresponding_author: Option<usize>,
    tagged_date: Option<usize>,
    is_student_first_author: Option<usize>,
    student_image: Option<usize>,
}

impl PublicationColumnMap {
    fn detect_from_headers(headers: &[String]) -> Result<Self, AppError> {
        let mut map = PublicationColumnMap::default();

        for (i, header) in headers.iter().enumerate() {
            let h = header.to_lowercase().trim().replace('\n', " ");
            
            if h.contains("reg no") || h.contains("register") || h == "reg_no" { map.reg_no = Some(i); }
            else if h.contains("school") { map.school = Some(i); }
            else if h.contains("paper title") || h.contains("title") { map.title = Some(i); }
            else if h == "authors" || h.contains("author list") { map.authors = Some(i); }
            else if h.contains("journal") { map.journal = Some(i); }
            else if h.contains("doi") || h.contains("d.o.i") { map.doi = Some(i); }
            else if h.contains("year") { map.year = Some(i); }
            else if h.contains("citation") { map.citations = Some(i); }
            else if h == "type" || h.contains("pub type") || h.contains("publication type") { map.pub_type = Some(i); }
            else if h.contains("foriegn collab") || h.contains("foreign collab") { map.foreign_collab = Some(i); }
            else if h.contains("imp factor") || h.contains("impact factor") { map.impact_factor = Some(i); }
            else if h.contains("open access") { map.open_access = Some(i); }
            else if h.contains("q rank") || h.contains("quartile") { map.q_rank = Some(i); }
            else if h.contains("is student first author") { map.is_student_first_author = Some(i); } // check this before first_author
            else if h.contains("first author") { map.first_author = Some(i); }
            else if h.contains("corresponding") { map.corresponding_author = Some(i); }
            else if h.contains("tagged date") { map.tagged_date = Some(i); }
            else if h.contains("studentimage") || h.contains("student image") || h == "image" { map.student_image = Some(i); }
        }

        if map.title.is_none() {
            return Err(AppError::Excel("Required column 'Paper Title' or 'Title' not found.".into()));
        }
        if map.authors.is_none() {
            return Err(AppError::Excel("Required column 'Authors' not found.".into()));
        }
        if map.reg_no.is_none() {
            return Err(AppError::Excel("Required column 'Reg No' not found.".into()));
        }

        Ok(map)
    }

    fn get_string<'a>(&self, row: &'a [Data], col: Option<usize>) -> Option<String> {
        col.and_then(|i| row.get(i))
            .and_then(|cell| match cell {
                Data::String(s) => Some(s.trim().to_string()),
                Data::Float(f) => Some(f.to_string()),
                Data::Int(i) => Some(i.to_string()),
                _ => None,
            })
            .filter(|s| !s.is_empty())
            .map(|s| {
                if s.eq_ignore_ascii_case("na") || s == "-" { String::new() } else { s }
            })
            .filter(|s| !s.is_empty())
    }
    
    fn get_int<'a>(&self, row: &'a [Data], col: Option<usize>) -> Option<i32> {
        self.get_string(row, col).and_then(|s| s.parse().ok())
    }
    
    fn get_float<'a>(&self, row: &'a [Data], col: Option<usize>) -> Option<f64> {
        self.get_string(row, col).and_then(|s| s.parse().ok())
    }
    
    fn get_bool<'a>(&self, row: &'a [Data], col: Option<usize>) -> bool {
        self.get_string(row, col)
            .map(|s| s.eq_ignore_ascii_case("yes") || s.eq_ignore_ascii_case("true") || s == "1")
            .unwrap_or(false)
    }
}

// ── Parsing Logic ───────────────────────────────────────────────────────────

#[derive(Debug)]
struct RawExcelRow {
    row_idx: usize,
    reg_no: String,
    school: Option<String>,
    title: String,
    authors_str: String,
    journal: Option<String>,
    doi: Option<String>,
    year: Option<i32>,
    citations: Option<i32>,
    pub_type: Option<String>,
    foreign_collab: Option<String>,
    impact_factor: Option<f64>,
    open_access: bool,
    q_rank: Option<String>,
    first_author: Option<String>,
    corresponding_author: Option<String>,
    tagged_date: Option<String>,
    is_student_first_author: bool,
    student_image: Option<String>,
}

pub fn parse_publication_excel_for_preview(
    xlsx_path: &Path,
) -> Result<PublicationImportPreview, AppError> {
    let filename = xlsx_path
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("unknown.xlsx")
        .to_string();

    let mut workbook: Xlsx<_> = open_workbook(xlsx_path)
        .map_err(|e| AppError::Excel(format!("Cannot open workbook: {}", e)))?;

    let sheet_names = workbook.sheet_names().to_vec();
    if sheet_names.is_empty() {
        return Err(AppError::Excel("Workbook contains no sheets".into()));
    }
    let sheet_name = sheet_names[0].clone();

    let range = workbook
        .worksheet_range(&sheet_name)
        .map_err(|e| AppError::Excel(format!("Cannot read sheet '{}': {}", sheet_name, e)))?;

    let rows: Vec<Vec<Data>> = range.rows().map(|r| r.to_vec()).collect();
    if rows.len() < 2 {
        return Err(AppError::Excel("Sheet is empty or has no data".into()));
    }

    // In the provided sample, row 1 is a merged title, row 2 contains headers.
    // We'll search for the header row by looking for "Reg No" or "Title".
    let mut header_row_idx = 0;
    for (i, row) in rows.iter().enumerate().take(5) {
        let text = row.iter().map(|c| c.to_string().to_lowercase()).collect::<Vec<_>>().join(" ");
        if text.contains("reg no") || text.contains("title") || text.contains("authors") {
            header_row_idx = i;
            break;
        }
    }

    let headers: Vec<String> = rows[header_row_idx]
        .iter()
        .map(|cell| cell.to_string().trim().to_string())
        .collect();

    let col_map = PublicationColumnMap::detect_from_headers(&headers)?;

    let embedded_images = crate::excel_image_extractor::extract_cell_images(xlsx_path).unwrap_or_default();
    let start_row = range.start().unwrap_or((0, 0)).0 as usize;

    let mut raw_rows = Vec::new();

    for (row_idx, row) in rows.iter().enumerate().skip(header_row_idx + 1) {
        let reg_no = match col_map.get_string(row, col_map.reg_no) {
            Some(r) => r,
            None => continue, // Skip empty rows
        };
        
        let title = match col_map.get_string(row, col_map.title) {
            Some(t) => t,
            None => continue,
        };
        
        let authors_str = col_map.get_string(row, col_map.authors).unwrap_or_default();

        raw_rows.push(RawExcelRow {
            row_idx,
            reg_no,
            school: col_map.get_string(row, col_map.school),
            title,
            authors_str,
            journal: col_map.get_string(row, col_map.journal),
            doi: col_map.get_string(row, col_map.doi),
            year: col_map.get_int(row, col_map.year),
            citations: col_map.get_int(row, col_map.citations),
            pub_type: col_map.get_string(row, col_map.pub_type),
            foreign_collab: col_map.get_string(row, col_map.foreign_collab),
            impact_factor: col_map.get_float(row, col_map.impact_factor),
            open_access: col_map.get_bool(row, col_map.open_access),
            q_rank: col_map.get_string(row, col_map.q_rank),
            first_author: col_map.get_string(row, col_map.first_author),
            corresponding_author: col_map.get_string(row, col_map.corresponding_author),
            tagged_date: col_map.get_string(row, col_map.tagged_date),
            is_student_first_author: col_map.get_bool(row, col_map.is_student_first_author),
            student_image: {
                let abs_row = row_idx + start_row;
                if embedded_images.contains_key(&abs_row) {
                    Some(format!("embed://{}", abs_row))
                } else {
                    col_map.get_string(row, col_map.student_image)
                }
            },
        });
    }

    // Group by Publication
    // Identity: DOI if exists, else lowercase title + year
    let mut groups: HashMap<String, Vec<RawExcelRow>> = HashMap::new();
    
    for r in raw_rows {
        let key = if let Some(ref doi) = r.doi {
            format!("doi:{}", doi.trim().to_lowercase())
        } else {
            let y = r.year.unwrap_or(0);
            format!("title:{}_{}", r.title.trim().to_lowercase(), y)
        };
        
        groups.entry(key).or_default().push(r);
    }

    let mut detected_publications = Vec::new();
    let mut total_students = HashSet::new();
    let mut total_faculty = HashSet::new();
    
    let mut valid_count = 0;
    let mut warning_count = 0;
    let mut error_count = 0;

    for (_, group) in groups {
        if group.is_empty() { continue; }
        
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut status = RowStatus::Valid;
        
        // Take metadata from the first row in the group
        let first = &group[0];
        
        let authors_list: Vec<String> = first.authors_str
            .split(';')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
            
        let mut student_regs = Vec::new();
        let mut student_schools = HashMap::new();
        let mut student_images = HashMap::new();
        let mut row_indices = Vec::new();
        
        for r in &group {
            student_regs.push(r.reg_no.clone());
            if let Some(sch) = &r.school {
                student_schools.insert(r.reg_no.clone(), sch.clone());
            }
            if let Some(img) = &r.student_image {
                student_images.insert(r.reg_no.clone(), img.clone());
            }
            row_indices.push(r.row_idx + 1); // 1-based for UI
            total_students.insert(r.reg_no.clone());
        }
        
        // Map authors to reg numbers
        let mut detected_authors = Vec::new();
        
        if authors_list.is_empty() {
            errors.push("Author list is empty.".to_string());
            status = RowStatus::Error;
        } else {
            let num_authors = authors_list.len();
            let num_students = student_regs.len();
            
            if num_students > num_authors {
                errors.push(format!("Found {} student records but only {} authors in the list.", num_students, num_authors));
                status = RowStatus::Error;
            }
            
            // Map according to the sequence rule:
            // The first `num_students` authors are the students (in order).
            // The last author is the faculty member.
            // Any in between are external.
            // If num_students == num_authors, then the last student overlaps with the faculty rule?
            // "The student register numbers appear in the same sequence as the student authors. The last author is the faculty member."
            // We will assign:
            // Indices 0..num_students -> student
            // Index num_authors - 1 -> faculty (if not already assigned as a student, though usually faculty is at the end and students are before)
            
            for (i, author_name) in authors_list.iter().enumerate() {
                let is_student = i < num_students;
                let is_last = i == num_authors - 1;
                
                let mut author_type = "external".to_string();
                let mut reg_number = None;
                
                if is_student {
                    author_type = "student".to_string();
                    reg_number = Some(student_regs[i].clone());
                } else if is_last {
                    author_type = "faculty".to_string();
                    total_faculty.insert(author_name.clone());
                }
                
                detected_authors.push(DetectedAuthor {
                    name: author_name.clone(),
                    author_type,
                    reg_number,
                });
            }
        }
        
        if first.doi.is_none() {
            warnings.push("Missing DOI, deduplication will rely on Title and Year.".to_string());
            if status == RowStatus::Valid { status = RowStatus::Warning; }
        }
        
        if first.year.is_none() {
            warnings.push("Missing Publication Year.".to_string());
            if status == RowStatus::Valid { status = RowStatus::Warning; }
        }
        
        match status {
            RowStatus::Valid => valid_count += 1,
            RowStatus::Warning => warning_count += 1,
            RowStatus::Error => error_count += 1,
            RowStatus::Duplicate => {}
        }

        detected_publications.push(DetectedPublication {
            title: first.title.clone(),
            journal: first.journal.clone(),
            doi: first.doi.clone(),
            publication_year: first.year,
            publication_type: first.pub_type.clone(),
            citations: first.citations,
            first_author: first.first_author.clone(),
            corresponding_author: first.corresponding_author.clone(),
            is_student_first_author: first.is_student_first_author,
            foreign_collab: first.foreign_collab.clone(),
            impact_factor: first.impact_factor,
            q_rank: first.q_rank.clone(),
            open_access: first.open_access,
            tagged_date: first.tagged_date.clone(),
            
            authors: detected_authors,
            student_schools,
            student_images,
            row_indices,
            
            status,
            errors,
            warnings,
        });
    }
    
    // Sort publications by first row index for consistent preview order
    detected_publications.sort_by_key(|p| p.row_indices.first().copied().unwrap_or(0));

    Ok(PublicationImportPreview {
        filename,
        sheet_name,
        total_rows: rows.len() - header_row_idx - 1,
        publications_count: detected_publications.len(),
        students_count: total_students.len(),
        faculty_count: total_faculty.len(),
        
        valid_count,
        warning_count,
        error_count,
        
        publications: detected_publications,
        detected_columns: headers,
    })
}
