use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::Emitter;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SvmmDiscoveryResult {
    pub svmm_data_dir: String,
    pub modpacks: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportFilePayload {
    pub relative_path: String,
    pub content: String,
    #[serde(default)]
    pub is_base64: bool,
}

fn is_safe_relative_path(rel: &str) -> bool {
    let path = Path::new(rel);
    !path.is_absolute()
        && !rel.is_empty()
        && path
            .components()
            .all(|c| matches!(c, Component::Normal(_)))
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    let clean: Vec<u8> = input
        .bytes()
        .filter(|b| !b.is_ascii_whitespace())
        .collect();
    if clean.len() % 4 != 0 {
        return Err("Invalid base64 payload length.".to_string());
    }
    let mut out = Vec::with_capacity((clean.len() / 4) * 3);
    for chunk in clean.chunks_exact(4) {
        let vals = [
            b64_val(chunk[0])?,
            b64_val(chunk[1])?,
            if chunk[2] == b'=' { 0 } else { b64_val(chunk[2])? },
            if chunk[3] == b'=' { 0 } else { b64_val(chunk[3])? },
        ];
        out.push((vals[0] << 2) | (vals[1] >> 4));
        if chunk[2] != b'=' {
            out.push((vals[1] << 4) | (vals[2] >> 2));
        }
        if chunk[3] != b'=' {
            out.push((vals[2] << 6) | vals[3]);
        }
    }
    Ok(out)
}

fn b64_val(b: u8) -> Result<u8, String> {
    match b {
        b'A'..=b'Z' => Ok(b - b'A'),
        b'a'..=b'z' => Ok(b - b'a' + 26),
        b'0'..=b'9' => Ok(b - b'0' + 52),
        b'+' => Ok(62),
        b'/' => Ok(63),
        _ => Err("Invalid base64 character.".to_string()),
    }
}

fn validate_existing_dir(raw_dir: &str, expected_names: &[&str]) -> Result<PathBuf, String> {
    let canonical = fs::canonicalize(raw_dir)
        .map_err(|_| format!("Target directory does not exist: {raw_dir}"))?;
    if !canonical.is_dir() {
        return Err(format!("Target path is not a directory: {raw_dir}"));
    }
    let dir_name = canonical
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_lowercase();
    let allowed = expected_names
        .iter()
        .any(|name| dir_name == name.to_lowercase());
    if !allowed {
        return Err(format!(
            "Refusing to write outside expected Stardew/SVMM folders: {raw_dir}"
        ));
    }
    Ok(canonical)
}

fn write_export_files(target_dir: &Path, files: Vec<ExportFilePayload>) -> Result<(), String> {
    fs::create_dir_all(target_dir).map_err(|e| e.to_string())?;
    for file in files {
        if !is_safe_relative_path(&file.relative_path) {
            return Err(format!("Unsafe relative path: {}", file.relative_path));
        }
        let dest = target_dir.join(&file.relative_path);
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        if file.is_base64 {
            let bytes = decode_base64(&file.content)?;
            fs::write(&dest, bytes).map_err(|e| e.to_string())?;
        } else {
            fs::write(&dest, file.content).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn collect_steam_vdf_mods_dirs() -> Vec<String> {
    let vdf_path = Path::new(r"C:\Program Files (x86)\Steam\steamapps\libraryfolders.vdf");
    let Ok(text) = fs::read_to_string(vdf_path) else {
        return Vec::new();
    };
    let mut dirs = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("\"path\"") {
            let val = rest.trim().trim_matches('"').replace("\\\\", "\\");
            if !val.is_empty() {
                dirs.push(format!(r"{val}\steamapps\common\Stardew Valley\Mods"));
            }
        }
    }
    dirs
}

#[tauri::command]
fn detect_stardew_mods_dir() -> Option<String> {
    let mut candidates: Vec<String> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        candidates.extend([
            r"C:\Program Files (x86)\Steam\steamapps\common\Stardew Valley\Mods".to_string(),
            r"C:\Program Files (x86)\GOG Galaxy\Games\Stardew Valley\Mods".to_string(),
            r"C:\GOG Games\Stardew Valley\Mods".to_string(),
            r"C:\XboxGames\Stardew Valley\Content\Mods".to_string(),
        ]);
        candidates.extend(collect_steam_vdf_mods_dirs());
    }

    #[cfg(target_os = "macos")]
    if let Ok(home) = std::env::var("HOME") {
        candidates.push(format!(
            "{home}/Library/Application Support/Steam/steamapps/common/Stardew Valley/Contents/MacOS/Mods"
        ));
        candidates.push("/Applications/Stardew Valley.app/Contents/MacOS/Mods".to_string());
    }

    #[cfg(target_os = "linux")]
    if let Ok(home) = std::env::var("HOME") {
        candidates.push(format!(
            "{home}/.local/share/Steam/steamapps/common/Stardew Valley/Mods"
        ));
        candidates.push(format!(
            "{home}/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/common/Stardew Valley/Mods"
        ));
    }

    candidates.into_iter().find(|dir| Path::new(dir).is_dir())
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
    let mods_root = validate_existing_dir(&mods_dir, &["Mods"])?;
    let target_dir = mods_root.join(&mod_folder_name);
    write_export_files(&target_dir, files)?;
    Ok(target_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn detect_svmm_modpacks(svmm_data_dir_hint: Option<String>) -> Option<SvmmDiscoveryResult> {
    let candidates: Vec<PathBuf> = match svmm_data_dir_hint {
        Some(hint) if !hint.trim().is_empty() => vec![PathBuf::from(hint)],
        _ => vec![
            PathBuf::from("SVMM_Data"),
            PathBuf::from(r"..\SVMM_Data"),
            PathBuf::from(r"..\stardew_mod_manager\SVMM_Data"),
        ],
    };

    for svmm_dir in candidates {
        let modpacks_dir = svmm_dir.join("modpacks");
        if modpacks_dir.is_dir() {
            let mut modpacks = Vec::new();
            if let Ok(entries) = fs::read_dir(&modpacks_dir) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        modpacks.push(entry.file_name().to_string_lossy().to_string());
                    }
                }
            }
            return Some(SvmmDiscoveryResult {
                svmm_data_dir: svmm_dir.to_string_lossy().to_string(),
                modpacks,
            });
        }
    }
    None
}

#[tauri::command]
fn export_mod_to_svmm_modpack(
    svmm_data_dir: String,
    modpack_name: String,
    mod_folder_name: String,
    files: Vec<ExportFilePayload>,
) -> Result<String, String> {
    if !is_safe_relative_path(&modpack_name) || !is_safe_relative_path(&mod_folder_name) {
        return Err("Invalid SVMM modpack or mod folder name.".to_string());
    }
    let svmm_root = validate_existing_dir(&svmm_data_dir, &["SVMM_Data"])?;
    let target_dir = svmm_root
        .join("modpacks")
        .join(&modpack_name)
        .join(&mod_folder_name);
    write_export_files(&target_dir, files)?;
    Ok(target_dir.to_string_lossy().to_string())
}

#[tauri::command]
fn launch_smapi(app: tauri::AppHandle) -> Result<(), String> {
    let mods_dir = detect_stardew_mods_dir()
        .ok_or_else(|| "Could not locate Stardew Valley/Mods directory.".to_string())?;
    let game_dir = PathBuf::from(&mods_dir)
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Invalid Stardew Valley game directory.".to_string())?;

    let bin_name = if cfg!(target_os = "windows") {
        "StardewModdingAPI.exe"
    } else {
        "StardewModdingAPI"
    };
    let smapi_exe = game_dir.join(bin_name);
    if !smapi_exe.is_file() {
        return Err(format!("SMAPI binary not found at {}", smapi_exe.display()));
    }

    let mut child = Command::new(&smapi_exe)
        .current_dir(&game_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start SMAPI: {e}"))?;

    if let Some(stdout) = child.stdout.take() {
        let handle = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                let _ = handle.emit("smapi-log", line);
            }
        });
    }
    if let Some(stderr) = child.stderr.take() {
        let handle = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                let _ = handle.emit("smapi-log", line);
            }
        });
    }

    std::thread::spawn(move || {
        let code = child.wait().ok().and_then(|s| s.code());
        let _ = app.emit("smapi-exit", code);
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            detect_stardew_mods_dir,
            export_mod_files_to_mods,
            detect_svmm_modpacks,
            export_mod_to_svmm_modpack,
            launch_smapi
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
