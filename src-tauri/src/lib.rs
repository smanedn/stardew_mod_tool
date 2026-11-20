use serde::Deserialize;
use std::fs;
use std::path::{Component, Path, PathBuf};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFilePayload {
    pub relative_path: String,
    pub content: String,
}

fn is_safe_relative_path(rel: &str) -> bool {
    let path = Path::new(rel);
    !path.is_absolute()
        && path
            .components()
            .all(|c| matches!(c, Component::Normal(_)))
}

#[tauri::command]
fn detect_stardew_mods_dir() -> Option<String> {
    let candidates = [
        r"C:\Program Files (x86)\Steam\steamapps\common\Stardew Valley\Mods",
        r"C:\Program Files (x86)\GOG Galaxy\Games\Stardew Valley\Mods",
        r"C:\GOG Games\Stardew Valley\Mods",
        r"C:\XboxGames\Stardew Valley\Content\Mods",
    ];
    candidates
        .iter()
        .find(|dir| Path::new(dir).is_dir())
        .map(|dir| (*dir).to_string())
}

#[tauri::command]
fn export_mod_files_to_mods(
    mods_dir: String,
    mod_folder_name: String,
    files: Vec<ExportFilePayload>,
) -> Result<String, String> {
    if !is_safe_relative_path(&mod_folder_name) {
        return Err("Invalid mod folder name.".to_string());
    }
    let mods_root = PathBuf::from(&mods_dir);
    let target_dir = mods_root.join(&mod_folder_name);
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    for file in files {
        if !is_safe_relative_path(&file.relative_path) {
            return Err(format!("Unsafe relative path: {}", file.relative_path));
        }
        let dest = target_dir.join(&file.relative_path);
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&dest, file.content).map_err(|e| e.to_string())?;
    }

    Ok(target_dir.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            detect_stardew_mods_dir,
            export_mod_files_to_mods
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
