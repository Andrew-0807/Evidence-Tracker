// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use dirs::config_dir;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};

// Data structures
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Entry {
    id: Option<i64>,
    date: String,
    tag: String,
    value: f64,
    locked: bool,
    description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EntryRequest {
    date: String,
    tag: String,
    value: f64,
    description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct EntriesResponse {
    entries: Vec<Entry>,
    locked: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct MonthlySummary {
    tags: Vec<TagTotal>,
    total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct TagTotal {
    tag: String,
    total: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct TagConfig {
    available_tags: Vec<String>,
    tag_colors: HashMap<String, String>,
}

impl Default for TagConfig {
    fn default() -> Self {
        TagConfig {
            available_tags: vec![],
            tag_colors: HashMap::new(),
        }
    }
}

// Database connection wrapper
struct Database {
    conn: Mutex<Connection>,
}

// File watcher state
struct FileWatcher {
    _watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
}

impl Database {
    fn new(db_path: &PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let conn = Connection::open(db_path)?;

        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                tag TEXT NOT NULL,
                value REAL NOT NULL,
                locked INTEGER DEFAULT 0,
                description TEXT
            )",
            [],
        )?;

        // Migrate existing database to add description column if it doesn't exist
        let _ = conn.execute(
            "ALTER TABLE entries ADD COLUMN description TEXT",
            [],
        );

        conn.execute(
            "CREATE TABLE IF NOT EXISTS monthly_totals (
                month TEXT PRIMARY KEY,
                totals TEXT
            )",
            [],
        )?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }
}

// Tauri commands
#[tauri::command]
fn get_entries(date: String, state: State<Database>) -> Result<EntriesResponse, String> {
    println!("DEBUG: get_entries called for date: {}", date);

    let conn = state.conn.lock().map_err(|e| {
        println!("DEBUG: Failed to lock database connection: {}", e);
        e.to_string()
    })?;

    let mut stmt = conn.prepare("SELECT id, date, tag, value, locked, description FROM entries WHERE date = ?")
        .map_err(|e| {
            println!("DEBUG: Failed to prepare statement: {}", e);
            e.to_string()
        })?;

    println!("DEBUG: Executing query for date: {}", date);
    let entries: Vec<Entry> = stmt.query_map(params![date], |row| {
        let entry = Entry {
            id: Some(row.get(0)?),
            date: row.get(1)?,
            tag: row.get(2)?,
            value: row.get(3)?,
            locked: row.get::<_, i32>(4)? == 1,
            description: row.get::<_, Option<String>>(5)?,
        };
        println!("DEBUG: Found entry: id={:?}, date={}, tag={}, value={}, locked={}, description={:?}",
                 entry.id, entry.date, entry.tag, entry.value, entry.locked, entry.description);
        Ok(entry)
    }).map_err(|e| {
        println!("DEBUG: Failed to execute query: {}", e);
        e.to_string()
    })?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| {
        println!("DEBUG: Failed to collect results: {}", e);
        e.to_string()
    })?;

    let locked = entries.get(0).map(|e| e.locked).unwrap_or(false);

    println!("DEBUG: Retrieved {} entries for date {}, locked: {}", entries.len(), date, locked);

    Ok(EntriesResponse { entries, locked })
}

#[tauri::command]
fn add_entries(date: String, entries: Vec<EntryRequest>, state: State<Database>) -> Result<bool, String> {
    println!("DEBUG: add_entries called with date: {}, entries count: {}", date, entries.len());

    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // Check if day is locked
    let mut stmt = conn.prepare("SELECT locked FROM entries WHERE date = ? LIMIT 1")
        .map_err(|e| e.to_string())?;

    if let Ok(locked) = stmt.query_row(params![date], |row| Ok(row.get::<_, i32>(0)? == 1)) {
        if locked {
            println!("DEBUG: Day {} is locked, cannot add entries", date);
            return Err("Day is locked".to_string());
        }
    }

    // Delete existing entries for this date
    let deleted_count = conn.execute("DELETE FROM entries WHERE date = ?", params![date])
        .map_err(|e| e.to_string())?;
    println!("DEBUG: Deleted {} existing entries for date {}", deleted_count, date);

    // Insert new entries
    let mut stmt = conn.prepare("INSERT INTO entries (date, tag, value, description) VALUES (?, ?, ?, ?)")
        .map_err(|e| e.to_string())?;

    for (index, entry) in entries.iter().enumerate() {
        println!("DEBUG: Inserting entry {}: date={}, tag={}, value={}, description={:?}",
                 index + 1, entry.date, entry.tag, entry.value, entry.description);
        stmt.execute(params![entry.date, entry.tag, entry.value, entry.description])
            .map_err(|e| {
                println!("DEBUG: Failed to insert entry {}: {}", index + 1, e);
                e.to_string()
            })?;
    }

    println!("DEBUG: Successfully inserted {} entries for date {}", entries.len(), date);
    Ok(true)
}

#[tauri::command]
fn lock_day(date: String, state: State<Database>) -> Result<String, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    conn.execute("UPDATE entries SET locked = 1 WHERE date = ?", params![date])
        .map_err(|e| e.to_string())?;

    Ok(format!("Day {} locked successfully", date))
}

#[tauri::command]
fn update_entry(id: i64, tag: String, value: f64, description: Option<String>, state: State<Database>) -> Result<bool, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    // Check if entry is locked
    let mut stmt = conn.prepare("SELECT locked FROM entries WHERE id = ?")
        .map_err(|e| e.to_string())?;

    let locked: bool = stmt.query_row(params![id], |row| Ok(row.get::<_, i32>(0)? == 1))
        .map_err(|e| e.to_string())?;

    if locked {
        return Err("Cannot edit locked entry".to_string());
    }

    conn.execute("UPDATE entries SET tag = ?, value = ?, description = ? WHERE id = ?", params![tag, value, description, id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
fn get_months(state: State<Database>) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT DISTINCT substr(date, 1, 7) as month FROM entries ORDER BY month DESC")
        .map_err(|e| e.to_string())?;

    let months: Vec<String> = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(0)?)
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(months)
}

#[tauri::command]
fn get_monthly_summary(month: String, state: State<Database>) -> Result<MonthlySummary, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT tag, SUM(value) as total FROM entries WHERE substr(date, 1, 7) = ? GROUP BY tag")
        .map_err(|e| e.to_string())?;

    let tag_totals: Vec<TagTotal> = stmt.query_map(params![month], |row| {
        Ok(TagTotal {
            tag: row.get(0)?,
            total: row.get(1)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    let total = tag_totals.iter().map(|t| t.total).sum();

    Ok(MonthlySummary { tags: tag_totals, total })
}

#[tauri::command]
fn get_graph_data(state: State<Database>) -> Result<Vec<HashMap<String, String>>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT DISTINCT date FROM entries ORDER BY date")
        .map_err(|e| e.to_string())?;

    let dates: Vec<HashMap<String, String>> = stmt.query_map([], |row| {
        let mut map = HashMap::new();
        map.insert("date".to_string(), row.get::<_, String>(0)?);
        Ok(map)
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(dates)
}

#[tauri::command]
fn get_monthly_total(month: String, state: State<Database>) -> Result<HashMap<String, HashMap<String, f64>>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT tag, SUM(value) as total FROM entries WHERE date LIKE ? GROUP BY tag")
        .map_err(|e| e.to_string())?;

    let pattern = format!("{}%", month);
    let mut totals = HashMap::new();

    let rows = stmt.query_map(params![pattern], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, f64>(1)?))
    }).map_err(|e| e.to_string())?;

    for row in rows {
        let (tag, total) = row.map_err(|e| e.to_string())?;
        totals.insert(tag, total);
    }

    let mut result = HashMap::new();
    result.insert("total".to_string(), totals);
    Ok(result)
}

#[tauri::command]
fn get_tag_config(_app_handle: AppHandle) -> Result<TagConfig, String> {
    // Load tags from embedded JSON file only
    const EMBEDDED_TAGS_JSON: &str = include_str!("../resources/tags.json");

    let config: TagConfig = serde_json::from_str(EMBEDDED_TAGS_JSON)
        .map_err(|e| format!("Failed to parse embedded tags file: {}", e))?;

    Ok(config)
}

fn setup_file_watcher(app_handle: AppHandle) -> Result<RecommendedWatcher, String> {
    let watch_path = app_handle.path_resolver().resource_dir()
        .ok_or_else(|| "Failed to resolve resource path".to_string())?;

    // Ensure the directory exists
    fs::create_dir_all(&watch_path).map_err(|e| format!("Failed to create resource directory: {}", e))?;

    let app_handle_clone = app_handle.clone();
    let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        match res {
            Ok(event) => {
                // Only handle modify events for tags.json
                if matches!(event.kind, EventKind::Modify(_)) {
                    if let Some(path) = event.paths.first() {
                        if path.file_name().and_then(|n| n.to_str()) == Some("tags.json") {
                            println!("Tags file changed, notifying frontend...");

                            // Emit event to frontend
                            if let Some(window) = app_handle_clone.get_window("main") {
                                let _ = window.emit("tags-config-changed", ());
                            }
                        }
                    }
                }
            }
            Err(e) => println!("Watch error: {:?}", e),
        }
    }).map_err(|e| format!("Failed to create watcher: {}", e))?;

    // Watch the determined path
    watcher.watch(&watch_path, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    Ok(watcher)
}

#[tauri::command]
fn save_tag_config(app_handle: AppHandle, config: TagConfig) -> Result<(), String> {
    let config_path = get_config_path(&app_handle)?;
    let tags_file = config_path.join("tags.json");

    fs::create_dir_all(&config_path)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&tags_file, content)
        .map_err(|e| format!("Failed to write tags file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn add_tag(app_handle: AppHandle, tag: String, color: Option<String>) -> Result<(), String> {
    let mut config = get_tag_config(app_handle.clone())?;

    if !config.available_tags.contains(&tag) {
        config.available_tags.push(tag.clone());
    }

    if let Some(color) = color {
        config.tag_colors.insert(tag, color);
    }

    save_tag_config(app_handle, config)
}

#[tauri::command]
fn remove_tag(app_handle: AppHandle, tag: String) -> Result<(), String> {
    let mut config = get_tag_config(app_handle.clone())?;

    config.available_tags.retain(|t| t != &tag);
    config.tag_colors.remove(&tag);

    save_tag_config(app_handle, config)
}

#[tauri::command]
fn get_monthly_entries(month: String, state: State<Database>) -> Result<Vec<Entry>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, date, tag, value, locked, description FROM entries WHERE date LIKE ? ORDER BY date, id")
        .map_err(|e| e.to_string())?;

    let pattern = format!("{}%", month);
    let entries: Vec<Entry> = stmt.query_map(params![pattern], |row| {
        Ok(Entry {
            id: Some(row.get(0)?),
            date: row.get(1)?,
            tag: row.get(2)?,
            value: row.get(3)?,
            locked: row.get::<_, i32>(4)? == 1,
            description: row.get::<_, Option<String>>(5)?,
        })
    }).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(entries)
}

#[tauri::command]
fn get_config_path_cmd(app_handle: AppHandle) -> Result<String, String> {
    let config_path = get_config_path(&app_handle)?;
    Ok(config_path.to_string_lossy().to_string())
}

fn get_config_path(_app_handle: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = config_dir()
        .ok_or_else(|| "Could not find config directory".to_string())?;
    Ok(config_dir.join("evidence-tracker"))
}

fn get_database_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let config_path = get_config_path(app_handle)?;
    Ok(config_path.join("entries.db"))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = get_database_path(&app.handle())?;
            println!("DEBUG: Database path: {:?}", db_path);

            // Ensure the parent directory exists
            if let Some(parent) = db_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create database directory: {}", e))?;
                println!("DEBUG: Created database directory: {:?}", parent);
            }

            let database = Database::new(&db_path)
                .map_err(|e| format!("Failed to initialize database: {}", e))?;
            println!("DEBUG: Database initialized successfully");

            app.manage(database);

            // Setup file watcher
            let watcher = setup_file_watcher(app.handle())
                .map_err(|e| format!("Failed to setup file watcher: {}", e))?;

            let file_watcher = FileWatcher {
                _watcher: Arc::new(Mutex::new(Some(watcher))),
            };

            app.manage(file_watcher);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_entries,
            add_entries,
            lock_day,
            update_entry,
            get_months,
            get_monthly_summary,
            get_graph_data,
            get_monthly_total,
            get_monthly_entries,
            get_tag_config,
            save_tag_config,
            add_tag,
            remove_tag,
            get_config_path_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
