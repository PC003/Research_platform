//! Poster generation module.
//!
//! Generates multi-student recognition posters from an HTML template.
//! Supports dynamic pagination: if more than MAX_PER_PAGE students,
//! multiple poster pages are generated.
//!
//! The poster HTML is rendered in the frontend WebView using html2canvas.
//! This module prepares the HTML content with student data injected.

use base64::Engine;
use serde::{Deserialize, Serialize};
use std::path::Path;

use crate::db::{Student, Publication};
use crate::error::AppError;

/// Maximum students per poster page (6 columns × 6 rows).
pub const MAX_PER_PAGE: usize = 36;

/// Poster page configuration calculated from student count.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosterConfig {
    pub total_students: usize,
    pub total_pages: usize,
    pub grid_columns: usize,
    pub grid_rows: usize,
    pub students_per_page: usize,
}

/// A single poster page with rendered HTML content.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosterPage {
    pub page_number: usize,
    pub total_pages: usize,
    pub html_content: String,
    pub student_ids: Vec<String>,
}

/// Result of poster generation (returned to frontend).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosterGenerationResult {
    pub pages: Vec<PosterPageResult>,
    pub total_students: usize,
    pub total_pages: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosterPageResult {
    pub page_number: usize,
    pub poster_path: String,
    pub student_count: usize,
}

/// Student data prepared for poster rendering (with base64 photo).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosterStudent {
    pub student_id: String,
    pub student_name: String,
    pub photo_data_url: String,
}

/// Calculate optimal grid layout for a given number of students.
pub fn calculate_layout(count: usize) -> PosterConfig {
    let total_pages = if count == 0 {
        1
    } else {
        (count + MAX_PER_PAGE - 1) / MAX_PER_PAGE
    };

    let students_per_page = if total_pages > 1 {
        // Distribute evenly across pages
        (count + total_pages - 1) / total_pages
    } else {
        count
    };

    // Calculate grid dimensions for the per-page count
    let (cols, rows) = optimal_grid(students_per_page);

    PosterConfig {
        total_students: count,
        total_pages,
        grid_columns: cols,
        grid_rows: rows,
        students_per_page,
    }
}

/// Determine optimal grid columns and rows for a given student count.
fn optimal_grid(count: usize) -> (usize, usize) {
    if count == 0 {
        return (1, 1);
    }
    if count <= 3 {
        return (count, 1);
    }
    if count <= 6 {
        return (3, 2);
    }
    if count <= 8 {
        return (4, 2);
    }
    if count <= 12 {
        return (4, 3);
    }
    if count <= 15 {
        return (5, 3);
    }
    if count <= 18 {
        return (6, 3);
    }
    if count <= 24 {
        return (6, 4);
    }
    if count <= 30 {
        return (6, 5);
    }
    // Max: 6×6 = 36
    (6, 6)
}

/// Prepare poster HTML pages for a set of students.
/// The base_dir is needed to resolve local photo paths to base64 data URLs.
pub fn prepare_poster_pages(
    students: &[Student],
    base_dir: &Path,
    month: &str,
    year: &str,
    achievement_type: &str,
    stats: (i64, i64, i64, i64),
) -> Result<Vec<PosterPage>, AppError> {
    if students.is_empty() {
        return Err(AppError::PosterGeneration("No students provided".into()));
    }

    let config = calculate_layout(students.len());
    let mut pages = Vec::new();

    for page_idx in 0..config.total_pages {
        let start = page_idx * config.students_per_page;
        let end = std::cmp::min(start + config.students_per_page, students.len());
        let page_students = &students[start..end];

        let (cols, _rows) = optimal_grid(page_students.len());

        // Convert students to poster format with base64 photos
        let poster_students: Vec<PosterStudent> = page_students
            .iter()
            .map(|s| {
                let photo_data_url = s
                    .photo_path
                    .as_ref()
                    .and_then(|path| {
                        let full_path = base_dir.join(path);
                        load_image_as_data_url(&full_path).ok()
                    })
                    .unwrap_or_else(|| generate_avatar_data_url(&s.student_name));

                PosterStudent {
                    student_id: s.student_id.clone(),
                    student_name: s.student_name.clone(),
                    photo_data_url,
                }
            })
            .collect();

        let html = render_poster_html(
            &poster_students,
            cols,
            page_idx + 1,
            config.total_pages,
            month,
            year,
            achievement_type,
            stats,
        );

        let student_ids: Vec<String> = page_students.iter().map(|s| s.student_id.clone()).collect();

        pages.push(PosterPage {
            page_number: page_idx + 1,
            total_pages: config.total_pages,
            html_content: html,
            student_ids,
        });
    }

    Ok(pages)
}

/// Prepare a single spotlight poster page for a specific high-impact publication
pub fn prepare_spotlight_page(
    students: &[Student],
    publication: &Publication,
    base_dir: &Path,
) -> Result<PosterPage, AppError> {
    if students.is_empty() {
        return Err(AppError::PosterGeneration("No students provided for spotlight".into()));
    }

    let poster_students: Vec<PosterStudent> = students
        .iter()
        .map(|s| {
            let photo_data_url = s
                .photo_path
                .as_ref()
                .and_then(|path| {
                    let full_path = base_dir.join(path);
                    load_image_as_data_url(&full_path).ok()
                })
                .unwrap_or_else(|| generate_avatar_data_url(&s.student_name));

            PosterStudent {
                student_id: s.student_id.clone(),
                student_name: s.student_name.clone(),
                photo_data_url,
            }
        })
        .collect();

    let html = render_spotlight_html(&poster_students, publication);

    let student_ids: Vec<String> = students.iter().map(|s| s.student_id.clone()).collect();

    Ok(PosterPage {
        page_number: 1,
        total_pages: 1,
        html_content: html,
        student_ids,
    })
}

/// Load an image file and convert to a base64 data URL.
fn load_image_as_data_url(path: &Path) -> Result<String, AppError> {
    let data = std::fs::read(path)?;
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/png",
    };
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(format!("data:{};base64,{}", mime, b64))
}

/// Generate a simple SVG avatar as a data URL for students without photos.
fn generate_avatar_data_url(name: &str) -> String {
    let initials: String = name
        .split_whitespace()
        .filter_map(|w| w.chars().next())
        .take(2)
        .collect::<String>()
        .to_uppercase();

    let svg = format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#1a2a5e" rx="100"/>
  <text x="100" y="100" text-anchor="middle" dominant-baseline="central"
        fill="white" font-family="Inter,sans-serif" font-size="72" font-weight="700">{}</text>
</svg>"##,
        initials
    );

    let b64 = base64::engine::general_purpose::STANDARD.encode(svg.as_bytes());
    format!("data:image/svg+xml;base64,{}", b64)
}

/// Render the complete poster HTML for one page.
fn render_poster_html(
    students: &[PosterStudent],
    columns: usize,
    page_number: usize,
    total_pages: usize,
    month: &str,
    year: &str,
    achievement_type: &str,
    stats: (i64, i64, i64, i64),
) -> String {
    let achievement_display = match achievement_type {
        "journal_publications" => "Journal Publication",
        "conference_presentations" => "Conference Presentation",
        "patents_filed" => "Patent Filing",
        "research_awards" => "Research Award",
        _ => achievement_type,
    };

    // Calculate photo size based on grid density
    let (photo_size, font_size_id, font_size_name, card_width) = match columns {
        1..=3 => (140, 14, 13, 160),
        4 => (120, 12, 11, 140),
        5 => (100, 11, 10, 130),
        _ => (100, 10, 10, 120),
    };

    let page_indicator = if total_pages > 1 {
        format!(
            r#"<div style="position:absolute;top:20px;right:30px;background:rgba(255,255,255,0.15);padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;letter-spacing:1px;">Page {} of {}</div>"#,
            page_number, total_pages
        )
    } else {
        String::new()
    };

    let summary_bg_bytes = include_bytes!("../assets/summary_bg.png");
    let summary_bg_b64 = base64::engine::general_purpose::STANDARD.encode(summary_bg_bytes);
    let summary_bg_data_url = format!("data:image/png;base64,{}", summary_bg_b64);

    let student_cards: String = students
        .iter()
        .map(|s| {
            format!(
                r#"<div style="text-align:center;width:{card_width}px;">
  <div style="width:{photo_size}px;height:{photo_size}px;margin:0 auto 8px;border-radius:50%;border:3px solid var(--vit-gold);padding:3px;background:#061233;box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
    <img src="{}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="{}"/>
  </div>
  <div style="background:var(--vit-gold);color:#020617;font-size:{font_size_id}px;font-weight:900;padding:4px 10px;border-radius:6px;display:inline-block;margin-bottom:6px;box-shadow: 0 2px 5px rgba(0,0,0,0.3);letter-spacing:1px;">{}</div>
  <p style="font-size:{font_size_name}px;font-weight:800;text-transform:uppercase;line-height:1.2;margin:0;color:#fff;text-shadow: 1px 1px 3px rgba(0,0,0,0.8);">{}</p>
</div>"#,
                s.photo_data_url,
                html_escape(&s.student_name),
                html_escape(&s.student_id),
                html_escape(&s.student_name),
                card_width = card_width,
                photo_size = photo_size,
                font_size_id = font_size_id + 2, // Boosted font size for register number
                font_size_name = font_size_name + 1,
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r##"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Student Recognition Poster</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,600&display=swap');
    :root {{
      --vit-gold: #FFD700;
      --vit-gold-light: #FFE55C;
    }}
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    body {{
      width: 1080px;
      height: 1350px;
      font-family: 'Inter', -apple-system, sans-serif;
      background-image: url('{summary_bg_data_url}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      color: #fff;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }}
    .container {{
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 30px 40px;
    }}
  </style>
</head>
<body>
  <div class="container">
    {page_indicator}

    <div style="text-align:center;margin-bottom:15px;">
      <h2 style="font-size:48px;font-family:'Playfair Display',serif;font-weight:700;letter-spacing:2px;text-shadow:0 2px 10px rgba(0,0,0,0.5);">VIT&reg;</h2>
      <p style="font-size:14px;letter-spacing:1px;text-shadow:0 1px 5px rgba(0,0,0,0.5);">Vellore Institute of Technology</p>
    </div>

    <div style="text-align:center;margin-bottom:15px;">
      <h1 style="font-size:56px;font-weight:900;color:var(--vit-gold);text-transform:uppercase;letter-spacing:-1px;text-shadow:0 4px 20px rgba(0,0,0,0.8);">UG Research Excellence</h1>
      <h3 style="font-size:22px;font-weight:600;letter-spacing:1px;margin:5px 0 10px;text-shadow:0 2px 10px rgba(0,0,0,0.5);">Celebrating Undergraduate Research Achievements</h3>
      <div style="display:inline-block;border:2px solid var(--vit-gold);padding:6px 30px;font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:2px;background:rgba(0,0,0,0.4);border-radius:30px;">{month} {year}</div>
    </div>

    <div style="text-align:center;margin-bottom:15px;margin-top:10px;">
      <h2 style="font-size:28px;font-weight:800;letter-spacing:1px;text-shadow:0 2px 10px rgba(0,0,0,0.5);">Honouring Our Young Researchers</h2>
      <h4 style="font-family:'Playfair Display',serif;font-style:italic;font-size:36px;color:var(--vit-gold);font-weight:600;margin:5px 0;">Hearty Congratulations</h4>
      <div style="display:flex;align-items:center;justify-content:center;gap:15px;margin-top:8px;">
        <span style="height:2px;width:150px;background:var(--vit-gold);display:inline-block;"></span>
        <span style="font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-shadow:0 2px 8px rgba(0,0,0,0.8);">on your {achievement_display}</span>
        <span style="height:2px;width:150px;background:var(--vit-gold);display:inline-block;"></span>
      </div>
    </div>

    <div style="flex:1;padding:20px;display:flex;justify-content:center;align-items:center;margin-bottom:10px;">
      <div style="display:grid;grid-template-columns:repeat({columns}, 1fr);gap:15px 12px;width:100%;justify-items:center;">
        {student_cards}
      </div>
    </div>

    <div style="text-align:center;margin-top:auto;">
      <p style="font-size:16px;color:var(--vit-gold);margin:4px 0;font-weight:700;text-shadow:0 2px 5px rgba(0,0,0,0.8);">Start your research journey with UG Research Cell &bull; Email: assodean.ugresearch@vit.ac.in &bull; Office: MGR Block - MB 127</p>
    </div>
  </div>
</body>
</html>"##,
        page_indicator = page_indicator,
        month = html_escape(month),
        year = html_escape(year),
        achievement_display = html_escape(achievement_display),
        columns = columns,
        student_cards = student_cards,
        summary_bg_data_url = summary_bg_data_url,
    )
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Render the HTML template for the Spotlight Poster.
fn render_spotlight_html(
    students: &[PosterStudent],
    publication: &Publication,
) -> String {
    // Generate the HTML for the student avatars
    let mut avatars_html = String::new();
    let num_students = students.len();
    
    // Size class adjustments based on number of students
    let size_class = if num_students == 1 {
        "w-48 h-48"
    } else if num_students == 2 {
        "w-40 h-40"
    } else {
        "w-32 h-32"
    };

    let container_class = if num_students == 1 {
        "grid-cols-1 max-w-sm"
    } else if num_students == 2 {
        "grid-cols-2 max-w-2xl gap-12"
    } else {
        "grid-cols-3 max-w-4xl gap-8"
    };

    for s in students {
        let avatar_html = format!(
            r#"
            <div class="flex flex-col items-center">
                <div class="relative group">
                    <div class="absolute -inset-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full blur opacity-75"></div>
                    <img src="{photo}" class="relative {size_class} rounded-full object-cover border-4 border-slate-900 shadow-2xl" alt="{name}" />
                </div>
                <div class="mt-6 text-center">
                    <h2 class="text-2xl font-bold text-amber-400 uppercase tracking-wider">{name}</h2>
                    <p class="text-lg font-medium text-slate-300 tracking-wide mt-1">#{id}</p>
                </div>
            </div>
            "#,
            photo = s.photo_data_url,
            name = s.student_name,
            id = s.student_id,
            size_class = size_class
        );
        avatars_html.push_str(&avatar_html);
    }

    let q_rank = publication.q_rank.as_deref().unwrap_or("");
    let q_rank_display = if !q_rank.is_empty() { format!("({})", q_rank) } else { "".to_string() };
    let impact_factor = publication.impact_factor.map(|f| format!("{:.1}", f)).unwrap_or_else(|| "-".to_string());
    
    let month_str = match publication.publication_month {
        Some(1) => "JANUARY", Some(2) => "FEBRUARY", Some(3) => "MARCH",
        Some(4) => "APRIL", Some(5) => "MAY", Some(6) => "JUNE",
        Some(7) => "JULY", Some(8) => "AUGUST", Some(9) => "SEPTEMBER",
        Some(10) => "OCTOBER", Some(11) => "NOVEMBER", Some(12) => "DECEMBER",
        _ => "",
    };
    let year_str = publication.publication_year.map(|y| y.to_string()).unwrap_or_default();
    let date_str = if !month_str.is_empty() && !year_str.is_empty() {
        format!("{} {}", month_str, year_str)
    } else {
        year_str
    };

    let corresponding_author = publication.corresponding_author.as_deref().unwrap_or("-");
    let research_title = publication.title.clone();
    let journal_name = publication.journal.clone().unwrap_or_default();

    let spotlight_bg_bytes = include_bytes!("../assets/spotlight_bg.png");
    let spotlight_bg_b64 = base64::engine::general_purpose::STANDARD.encode(spotlight_bg_bytes);
    let spotlight_bg_data_url = format!("data:image/png;base64,{}", spotlight_bg_b64);

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>High Impact Spotlight</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@1,600&display=swap');
        
        body {{
            margin: 0;
            padding: 0;
            width: 1080px;
            height: 1350px;
            background-color: #020617; /* Slate 950 */
            background-image: url('{spotlight_bg_data_url}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            font-family: 'Montserrat', sans-serif;
            color: #ffffff;
            position: relative;
            overflow: hidden;
        }}
        
        .content-layer {{
            position: relative;
            z-index: 10;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 60px 40px;
        }}
        
        .header {{
            text-align: center;
            margin-bottom: 50px;
        }}
        
        .title-high-impact {{
            font-size: 3.5rem;
            font-weight: 800;
            color: #fcd34d; /* amber-300 */
            text-transform: uppercase;
            letter-spacing: 0.05em;
            text-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
            margin-bottom: 0.5rem;
        }}
        
        .subtitle-ug {{
            font-size: 2.25rem;
            font-weight: 700;
            color: #e2e8f0;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }}
        
        .cursive-text {{
            font-family: 'Playfair Display', serif;
            font-size: 2.75rem;
            color: #ffffff;
            margin-top: 2rem;
        }}
        
        .divider {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            margin-top: 1rem;
        }}
        
        .divider-line {{
            height: 2px;
            width: 120px;
            background: linear-gradient(to right, transparent, #fbbf24);
        }}
        .divider-line.right {{
            background: linear-gradient(to left, transparent, #fbbf24);
        }}
        
        /* Stats Grid */
        .stats-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2px;
            background-color: rgba(255, 255, 255, 0.1);
            border: 2px dashed rgba(251, 191, 36, 0.3);
            border-radius: 1.5rem;
            margin: auto 40px 40px 40px;
            overflow: hidden;
        }}
        
        .stat-box {{
            background-color: #020617; /* Slate 950 to cover the gap */
            padding: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }}
        
        .stat-label {{
            font-size: 1.5rem;
            font-weight: 600;
            color: #fbbf24;
            margin-bottom: 1rem;
        }}
        
        .stat-value {{
            font-size: 1.5rem;
            font-weight: 500;
            color: #f8fafc;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
        }}
        
        .impact-factor-value {{
            font-size: 5rem;
            font-weight: 900;
            color: #ffffff;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
            line-height: 1;
        }}
        
        .month-badge {{
            position: absolute;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 1.75rem;
            font-weight: 800;
            color: #fbbf24;
            letter-spacing: 0.15em;
        }}
    </style>
</head>
<body>
    <div class="content-layer">
        <!-- Header -->
        <div class="header">
            <!-- You can inject the VIT logo here if needed, for now just text or placeholder -->
            <h1 class="title-high-impact">High-Impact Journal Publication</h1>
            <h2 class="subtitle-ug">UG Research Excellence</h2>
            
            <div class="divider">
                <div class="divider-line"></div>
                <div class="cursive-text">Hearty Congratulations to all the Authors</div>
                <div class="divider-line right"></div>
            </div>
        </div>
        
        <!-- Students -->
        <div class="flex-1 flex flex-col items-center justify-center -mt-8">
            <div class="grid {container_class} w-full justify-items-center">
                {avatars}
            </div>
        </div>
        
        <!-- Details Grid -->
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">Published in:</div>
                <div class="stat-value">{journal} {q_rank}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Corresponding Author</div>
                <div class="stat-value font-bold">{prof}</div>
                <!-- <div class="text-sm text-slate-400 mt-2">School placeholder</div> -->
            </div>
            <div class="stat-box">
                <div class="stat-label">Research Title</div>
                <div class="stat-value text-xl">{title}</div>
            </div>
            <div class="stat-box flex-row gap-6">
                <div class="stat-label mb-0 text-3xl">Impact<br/>Factor</div>
                <div class="impact-factor-value">{ifactor}</div>
            </div>
        </div>
        
        <!-- Footer Month -->
        <div class="month-badge">{year}</div>
    </div>
</body>
</html>"#,
        avatars = avatars_html,
        container_class = container_class,
        journal = html_escape(&journal_name),
        q_rank = html_escape(&q_rank_display),
        prof = html_escape(corresponding_author.split(';').next().unwrap_or(corresponding_author).trim()),
        title = html_escape(&research_title),
        ifactor = html_escape(&impact_factor),
        year = date_str,
        spotlight_bg_data_url = spotlight_bg_data_url
    )
}
