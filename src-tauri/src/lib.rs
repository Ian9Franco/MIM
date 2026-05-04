use std::fs;
use tauri::Emitter;
use notify::{Watcher, RecursiveMode};
use regex::Regex;

use std::io::Read;
use zip::ZipArchive;

fn deep_scan_mod(path: &std::path::Path) -> serde_json::Value {
    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    
    // Fallback regex version extraction
    let re = Regex::new(r"1\.\d{2}(?:\.\d+)?").unwrap();
    let fallback_version = if let Some(caps) = re.captures(&file_name) {
        caps.get(0).unwrap().as_str().to_string()
    } else {
        "1.20.1".to_string() 
    };

    let file = match std::fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return serde_json::json!({ "loader": "unknown", "version": fallback_version })
    };
    
    let mut archive = match ZipArchive::new(file) {
        Ok(a) => a,
        Err(_) => return serde_json::json!({ "loader": "unknown", "version": fallback_version }),
    };

    for i in 0..archive.len() {
        if let Ok(mut file) = archive.by_index(i) {
            let name = file.name().to_string();
            if name.ends_with("fabric.mod.json") {
                let mut contents = String::new();
                let _ = file.read_to_string(&mut contents);
                let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap_or(serde_json::json!({}));
                let mut ver = fallback_version.clone();
                if let Some(depends) = parsed.get("depends") {
                    if let Some(mc) = depends.get("minecraft") {
                        if let Some(mc_str) = mc.as_str() {
                            if let Some(caps) = re.captures(mc_str) { ver = caps.get(0).unwrap().as_str().to_string(); }
                        }
                    }
                }
                return serde_json::json!({ "loader": "fabric", "version": ver });
            } else if name.ends_with("neoforge.mods.toml") {
                return serde_json::json!({ "loader": "neoforge", "version": fallback_version });
            } else if name.ends_with("mods.toml") {
                let mut contents = String::new();
                let _ = file.read_to_string(&mut contents);
                let mut ver = fallback_version.clone();
                // Simple regex to find version in TOML
                let toml_re = Regex::new(r#"version\s*=\s*"([^"]+)""#).unwrap();
                if let Some(caps) = toml_re.captures(&contents) {
                    let v = caps.get(1).unwrap().as_str();
                    if v != "${file.jarVersion}" { ver = v.to_string(); }
                }
                return serde_json::json!({ "loader": "forge", "version": ver });
            } else if name.ends_with("pack.mcmeta") {
                let mut contents = String::new();
                let _ = file.read_to_string(&mut contents);
                let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap_or(serde_json::json!({}));
                let mut ver = fallback_version.clone();
                if let Some(pack) = parsed.get("pack") {
                    if let Some(format) = pack.get("pack_format") {
                        if let Some(f) = format.as_u64() {
                            ver = match f { 15=>"1.20.1".into(), 18=>"1.20.2".into(), 22=>"1.20.4".into(), 32|34=>"1.21".into(), _=>ver };
                        }
                    }
                }
                return serde_json::json!({ "loader": "resourcepack", "version": ver });
            }
        }
    }

    // Fallback if no manifest is found but we still want to guess from name
    let mut guess_loader = "unknown";
    let lower = file_name.to_lowercase();
    if lower.contains("fabric") { guess_loader = "fabric"; }
    else if lower.contains("forge") { guess_loader = "forge"; }

    serde_json::json!({
        "loader": guess_loader,
        "version": fallback_version
    })
}

#[tauri::command]
fn generate_structure(version: String, modloader: String) -> Result<String, String> {
    let base_dir = format!("D:\\.mine\\source\\{}\\{}", version, modloader);
    
    let subfolders = vec![
        ".essential\\fauna", ".essential\\hostiles", ".essential\\estructuras y mazmorras",
        ".essential\\arsenal", ".essential\\bosses", ".essential\\vanilla + & qol",
        ".essential\\dimensiones", ".essential\\progreso y rpg", ".essential\\comidas",
        ".essential\\librerias", ".essential\\tecnologia", ".essential\\combate avanzado",
        ".local\\animaciones", ".local\\sonidos", ".local\\rendimiento", ".local\\qol", ".local\\particulas",
        ".server\\estructuras", ".server\\qol", ".server\\rendimiento", ".server\\terreno"
    ];

    for folder in subfolders {
        let full_path = format!("{}\\{}", base_dir, folder);
        fs::create_dir_all(&full_path).map_err(|e| e.to_string())?;
    }
    
    // Also create common
    let common_dir = format!("D:\\.mine\\source\\{}\\common", version);
    fs::create_dir_all(format!("{}\\resourcepacks", common_dir)).map_err(|e| e.to_string())?;
    fs::create_dir_all(format!("{}\\datapacks", common_dir)).map_err(|e| e.to_string())?;

    Ok("Estructura generada".to_string())
}

#[tauri::command]
fn classify_mod(file_name: String, source_path: String, target_category: String, modloader: String, version: String) -> Result<String, String> {
    let dest_dir = format!("D:\\.mine\\source\\{}\\{}\\{}", version, modloader, target_category);
    let dest_path = format!("{}\\{}", dest_dir, file_name);

    fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    fs::rename(&source_path, &dest_path).map_err(|e| e.to_string())?;

    Ok(format!("Moved to {}", target_category))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();
            
            // Start watcher in a background thread
            std::thread::spawn(move || {
                let Some(user_dirs) = directories::UserDirs::new() else { return };
                let Some(downloads_dir) = user_dirs.download_dir() else { return };
                
                // 1. Scan existing files on startup (like ignoreInitial: false)
                if let Ok(entries) = std::fs::read_dir(downloads_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if let Some(ext) = path.extension() {
                            if ext == "jar" || ext == "zip" {
                                let file_name = path.file_name().unwrap().to_string_lossy().to_string();
                                let meta = deep_scan_mod(&path);
                                let payload = serde_json::json!({ "path": path.to_string_lossy().to_string(), "fileName": file_name, "meta": meta });
                                let _ = app_handle.emit("new_file", payload);
                            }
                        }
                    }
                }

                // 2. Watch for new events (downloads renaming from .crdownload to .jar)
                let (tx, rx) = std::sync::mpsc::channel();
                let mut watcher = notify::recommended_watcher(tx).unwrap();
                watcher.watch(downloads_dir, RecursiveMode::NonRecursive).unwrap();

                for res in rx {
                    if let Ok(event) = res {
                        // Browsers rename .crdownload to .jar when finished, so we check all events
                        for path in event.paths {
                            if let Some(ext) = path.extension() {
                                if ext == "jar" || ext == "zip" {
                                    let file_name = path.file_name().unwrap().to_string_lossy().to_string();
                                    let meta = deep_scan_mod(&path);
                                    let payload = serde_json::json!({ "path": path.to_string_lossy().to_string(), "fileName": file_name, "meta": meta });
                                    let _ = app_handle.emit("new_file", payload);
                                }
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![classify_mod, generate_structure])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
