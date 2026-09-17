use std::collections::HashMap;
use std::fs::File;
use std::io::{Read};
use std::path::Path;
use zip::ZipArchive;
use quick_xml::events::Event;
use quick_xml::Reader;

/// Extracts images embedded as Rich Data Types from an Excel (.xlsx) file.
/// Returns a map of (0-based row index) -> raw image bytes.
pub fn extract_cell_images(xlsx_path: &Path) -> Result<HashMap<usize, Vec<u8>>, Box<dyn std::error::Error>> {
    let file = File::open(xlsx_path)?;
    let mut archive = ZipArchive::new(file)?;
    
    let mut all_images = HashMap::new();
    
    if let Ok(rich_images) = extract_rich_data_images(&mut archive) {
        all_images.extend(rich_images);
    }
    
    if let Ok(drawing_images) = extract_drawing_images(&mut archive) {
        all_images.extend(drawing_images);
    }
    
    Ok(all_images)
}

fn extract_rich_data_images(archive: &mut ZipArchive<File>) -> Result<HashMap<usize, Vec<u8>>, Box<dyn std::error::Error>> {
    
    // 1. Parse sheet1.xml to find cells with `vm` attribute.
    // We map: value_metadata_index (vm) -> row_index (0-based)
    let mut vm_to_row: HashMap<String, usize> = HashMap::new();
    
    let mut sheet_xml = String::new();
    {
        let mut sheet_file = archive.by_name("xl/worksheets/sheet1.xml")?;
        sheet_file.read_to_string(&mut sheet_xml)?;
    }
    
    let mut reader = Reader::from_str(&sheet_xml);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();
    
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Empty(e)) | Ok(Event::Start(e)) => {
                if e.name().as_ref() == b"c" {
                    let mut r_attr = None;
                    let mut vm_attr = None;
                    for attr in e.attributes() {
                        if let Ok(a) = attr {
                            if a.key.as_ref() == b"r" {
                                r_attr = Some(String::from_utf8_lossy(&a.value).into_owned());
                            } else if a.key.as_ref() == b"vm" {
                                vm_attr = Some(String::from_utf8_lossy(&a.value).into_owned());
                            }
                        }
                    }
                    if let (Some(r), Some(vm)) = (r_attr, vm_attr) {
                        let row_str: String = r.chars().filter(|c| c.is_digit(10)).collect();
                        if let Ok(row_num) = row_str.parse::<usize>() {
                            if row_num > 0 {
                                vm_to_row.insert(vm, row_num - 1);
                            }
                        }
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => (),
        }
        buf.clear();
    }

    if vm_to_row.is_empty() {
        return Ok(HashMap::new()); 
    }

    // 2. Parse xl/metadata.xml to map `vm` to futureMetadata / richData index (v).
    let mut metadata_xml = String::new();
    {
        let mut metadata_file = match archive.by_name("xl/metadata.xml") {
            Ok(f) => f,
            Err(_) => return Ok(HashMap::new()), 
        };
        metadata_file.read_to_string(&mut metadata_xml)?;
    }
    
    let mut reader = Reader::from_str(&metadata_xml);
    let mut buf = Vec::new();
    
    let mut vm_to_rv_index: HashMap<String, String> = HashMap::new();
    let mut current_vm = 1; 
    
    let mut in_value_metadata = false;
    
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                if e.name().as_ref() == b"valueMetadata" {
                    in_value_metadata = true;
                }
            }
            Ok(Event::Empty(e)) => {
                if in_value_metadata && e.name().as_ref() == b"rc" {
                    let mut t_attr = None;
                    let mut v_attr = None;
                    for attr in e.attributes() {
                        if let Ok(a) = attr {
                            if a.key.as_ref() == b"t" {
                                t_attr = Some(String::from_utf8_lossy(&a.value).into_owned());
                            } else if a.key.as_ref() == b"v" {
                                v_attr = Some(String::from_utf8_lossy(&a.value).into_owned());
                            }
                        }
                    }
                    if t_attr.as_deref() == Some("1") {
                        if let Some(v) = v_attr {
                            vm_to_rv_index.insert(current_vm.to_string(), v);
                        }
                    }
                    current_vm += 1;
                }
            }
            Ok(Event::End(e)) => {
                if e.name().as_ref() == b"valueMetadata" {
                    in_value_metadata = false;
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => (),
        }
        buf.clear();
    }
    
    let mut row_to_rv_index: HashMap<usize, String> = HashMap::new();
    for (vm, row) in vm_to_row {
        if let Some(rv) = vm_to_rv_index.get(&vm) {
            row_to_rv_index.insert(row, rv.clone());
        }
    }

    if row_to_rv_index.is_empty() {
        return Ok(HashMap::new());
    }

    // 3. Parse xl/richData/rdrichvalue.xml to map rv_index to rid_index
    let mut rdrich_xml = String::new();
    {
        let mut rdrichvalue_file = match archive.by_name("xl/richData/rdrichvalue.xml") {
            Ok(f) => f,
            Err(_) => return Ok(HashMap::new()),
        };
        rdrichvalue_file.read_to_string(&mut rdrich_xml)?;
    }
    
    let mut reader = Reader::from_str(&rdrich_xml);
    let mut buf = Vec::new();
    
    let mut rv_index_to_rid_index: HashMap<String, String> = HashMap::new();
    let mut current_rv = 0; 
    
    let mut in_rv = false;
    let mut first_v_in_rv = false;
    
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                if e.name().as_ref() == b"rv" {
                    in_rv = true;
                    first_v_in_rv = true;
                } else if in_rv && e.name().as_ref() == b"v" {
                }
            }
            Ok(Event::Text(e)) => {
                if in_rv && first_v_in_rv {
                    let text = e.unescape().unwrap_or_default().into_owned();
                    rv_index_to_rid_index.insert(current_rv.to_string(), text);
                    first_v_in_rv = false; 
                }
            }
            Ok(Event::End(e)) => {
                if e.name().as_ref() == b"rv" {
                    in_rv = false;
                    current_rv += 1;
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => (),
        }
        buf.clear();
    }
    
    let mut row_to_rid_index: HashMap<usize, String> = HashMap::new();
    for (row, rv) in row_to_rv_index {
        if let Some(rid) = rv_index_to_rid_index.get(&rv) {
            row_to_rid_index.insert(row, rid.clone());
        }
    }

    if row_to_rid_index.is_empty() {
        return Ok(HashMap::new());
    }

    // 4. Parse xl/richData/richValueRel.xml to map rid_index to r:id
    let mut richrel_xml = String::new();
    {
        let mut richrel_file = match archive.by_name("xl/richData/richValueRel.xml") {
            Ok(f) => f,
            Err(_) => return Ok(HashMap::new()),
        };
        richrel_file.read_to_string(&mut richrel_xml)?;
    }
    
    let mut reader = Reader::from_str(&richrel_xml);
    let mut buf = Vec::new();
    
    let mut rid_index_to_rid: HashMap<String, String> = HashMap::new();
    let mut current_rel = 0; 
    
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Empty(e)) | Ok(Event::Start(e)) => {
                if e.name().as_ref() == b"rel" {
                    for attr in e.attributes() {
                        if let Ok(a) = attr {
                            if a.key.as_ref() == b"r:id" {
                                let rid = String::from_utf8_lossy(&a.value).into_owned();
                                rid_index_to_rid.insert(current_rel.to_string(), rid);
                                break;
                            }
                        }
                    }
                    current_rel += 1;
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => (),
        }
        buf.clear();
    }

    let mut row_to_rid: HashMap<usize, String> = HashMap::new();
    for (row, rid_idx) in row_to_rid_index {
        if let Some(rid) = rid_index_to_rid.get(&rid_idx) {
            row_to_rid.insert(row, rid.clone());
        }
    }

    if row_to_rid.is_empty() {
        return Ok(HashMap::new());
    }

    // 5. Parse xl/richData/_rels/richValueRel.xml.rels to map rId to image path
    let mut rels_xml = String::new();
    {
        let mut rels_file = match archive.by_name("xl/richData/_rels/richValueRel.xml.rels") {
            Ok(f) => f,
            Err(_) => return Ok(HashMap::new()),
        };
        rels_file.read_to_string(&mut rels_xml)?;
    }
    
    let mut reader = Reader::from_str(&rels_xml);
    let mut buf = Vec::new();
    
    let mut rid_to_path: HashMap<String, String> = HashMap::new();
    
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Empty(e)) | Ok(Event::Start(e)) => {
                if e.name().as_ref() == b"Relationship" {
                    let mut id = None;
                    let mut target = None;
                    for attr in e.attributes() {
                        if let Ok(a) = attr {
                            if a.key.as_ref() == b"Id" {
                                id = Some(String::from_utf8_lossy(&a.value).into_owned());
                            } else if a.key.as_ref() == b"Target" {
                                target = Some(String::from_utf8_lossy(&a.value).into_owned());
                            }
                        }
                    }
                    if let (Some(id), Some(target)) = (id, target) {
                        let resolved_path = if target.starts_with("../") {
                            format!("xl/{}", &target[3..])
                        } else {
                            format!("xl/richData/{}", target)
                        };
                        rid_to_path.insert(id, resolved_path);
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => (),
        }
        buf.clear();
    }

    let mut row_to_path: HashMap<usize, String> = HashMap::new();
    for (row, rid) in row_to_rid {
        if let Some(path) = rid_to_path.get(&rid) {
            row_to_path.insert(row, path.clone());
        }
    }

    if row_to_path.is_empty() {
        return Ok(HashMap::new());
    }

    // 6. Extract image bytes
    let mut row_to_bytes: HashMap<usize, Vec<u8>> = HashMap::new();
    for (row, path) in row_to_path {
        if let Ok(mut img_file) = archive.by_name(&path) {
            let mut img_buf = Vec::new();
            if img_file.read_to_end(&mut img_buf).is_ok() {
                row_to_bytes.insert(row, img_buf);
            }
        }
    }

    Ok(row_to_bytes)
}

fn extract_drawing_images(archive: &mut ZipArchive<File>) -> Result<HashMap<usize, Vec<u8>>, Box<dyn std::error::Error>> {
    let mut drawing_xml = String::new();
    {
        let mut drawing_file = match archive.by_name("xl/drawings/drawing1.xml") {
            Ok(f) => f,
            Err(_) => return Ok(HashMap::new()),
        };
        drawing_file.read_to_string(&mut drawing_xml)?;
    }
    
    let mut reader = Reader::from_str(&drawing_xml);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();
    
    let mut row_to_rid: HashMap<usize, String> = HashMap::new();
    
    let mut in_from = false;
    let mut in_row = false;
    let mut current_row: Option<usize> = None;
    
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let name = e.name();
                let name_ref = name.as_ref();
                if name_ref == b"from" || name_ref == b"xdr:from" {
                    in_from = true;
                } else if in_from && (name_ref == b"row" || name_ref == b"xdr:row") {
                    in_row = true;
                } else if name_ref == b"a:blip" {
                    for attr in e.attributes() {
                        if let Ok(a) = attr {
                            if a.key.as_ref() == b"r:embed" {
                                if let Some(r) = current_row {
                                    row_to_rid.insert(r, String::from_utf8_lossy(&a.value).into_owned());
                                }
                            }
                        }
                    }
                }
            }
            Ok(Event::Empty(e)) => {
                let name = e.name();
                let name_ref = name.as_ref();
                if name_ref == b"a:blip" {
                    for attr in e.attributes() {
                        if let Ok(a) = attr {
                            if a.key.as_ref() == b"r:embed" {
                                if let Some(r) = current_row {
                                    row_to_rid.insert(r, String::from_utf8_lossy(&a.value).into_owned());
                                }
                            }
                        }
                    }
                }
            }
            Ok(Event::Text(e)) => {
                if in_row {
                    let text = e.unescape().unwrap_or_default().into_owned();
                    if let Ok(r) = text.parse::<usize>() {
                        current_row = Some(r); // 0-based based on xml
                    }
                }
            }
            Ok(Event::End(e)) => {
                let name = e.name();
                let name_ref = name.as_ref();
                if name_ref == b"from" || name_ref == b"xdr:from" {
                    in_from = false;
                } else if name_ref == b"row" || name_ref == b"xdr:row" {
                    in_row = false;
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => (),
        }
        buf.clear();
    }
    
    // Parse rels
    let mut rels_xml = String::new();
    {
        let mut rels_file = match archive.by_name("xl/drawings/_rels/drawing1.xml.rels") {
            Ok(f) => f,
            Err(_) => return Ok(HashMap::new()),
        };
        rels_file.read_to_string(&mut rels_xml)?;
    }
    
    let mut reader = Reader::from_str(&rels_xml);
    let mut buf = Vec::new();
    let mut rid_to_path: HashMap<String, String> = HashMap::new();
    
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Empty(e)) | Ok(Event::Start(e)) => {
                if e.name().as_ref() == b"Relationship" {
                    let mut id = None;
                    let mut target = None;
                    for attr in e.attributes() {
                        if let Ok(a) = attr {
                            if a.key.as_ref() == b"Id" {
                                id = Some(String::from_utf8_lossy(&a.value).into_owned());
                            } else if a.key.as_ref() == b"Target" {
                                target = Some(String::from_utf8_lossy(&a.value).into_owned());
                            }
                        }
                    }
                    if let (Some(id), Some(target)) = (id, target) {
                        let resolved_path = if target.starts_with("../") {
                            format!("xl/{}", &target[3..])
                        } else if target.starts_with("/xl/") {
                            target[1..].to_string()
                        } else {
                            format!("xl/drawings/{}", target)
                        };
                        rid_to_path.insert(id, resolved_path);
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(_) => break,
            _ => (),
        }
        buf.clear();
    }
    
    let mut row_to_bytes: HashMap<usize, Vec<u8>> = HashMap::new();
    for (row, rid) in row_to_rid {
        if let Some(path) = rid_to_path.get(&rid) {
            if let Ok(mut img_file) = archive.by_name(path) {
                let mut img_buf = Vec::new();
                if img_file.read_to_end(&mut img_buf).is_ok() {
                    row_to_bytes.insert(row, img_buf);
                }
            }
        }
    }
    
    Ok(row_to_bytes)
}
