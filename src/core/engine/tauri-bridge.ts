import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { SdvProjectFile } from '../../data/models/index.js';
import {
  type InstalledModSnapshot,
  type ModConflictWarning,
  scanModConflicts,
} from '../validators/conflict-scanner.js';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
  serializeCleanJson,
} from './browser-compiler.js';
import { formatBrowserZipRootName } from './browser-zip.js';
import { compileDefaultConfigJson } from './config-schema-builder.js';
import { buildLocaleFileMap } from './i18n-generator.js';
import { type ModImportResult, importContentPatcherMod } from './mod-importer.js';
import { type SmapiLogEntry, parseSmapiLogLine } from './smapi-log-parser.js';

export interface TauriExportFilePayload {
  readonly relativePath: string;
  readonly content: string;
  readonly isBase64?: boolean;
}

/**
 * Builds the complete list of text and binary mod files for Tauri desktop export.
 */
export function buildTauriExportFiles(
  project: SdvProjectFile,
): readonly TauriExportFilePayload[] {
  const files: TauriExportFilePayload[] = [
    {
      relativePath: 'manifest.json',
      content: serializeCleanJson(compileProjectToManifest(project)),
    },
    {
      relativePath: 'content.json',
      content: serializeCleanJson(compileProjectToContentJson(project)),
    },
  ];

  if (project.configOptions !== undefined && project.configOptions.length > 0) {
    files.push({
      relativePath: 'config.json',
      content: serializeCleanJson(compileDefaultConfigJson(project.configOptions)),
    });
  }

  for (const [relPath, localeEntries] of Object.entries(buildLocaleFileMap(project))) {
    if (Object.keys(localeEntries).length > 0) {
      files.push({
        relativePath: relPath,
        content: serializeCleanJson(localeEntries),
      });
    }
  }

  for (const asset of project.assets) {
    if (asset.dataBase64 !== undefined && asset.dataBase64.length > 0) {
      files.push({
        relativePath: asset.relativePath,
        content: asset.dataBase64,
        isBase64: true,
      });
    }
  }

  return files;
}

/**
 * Returns true when running inside the Tauri v2 desktop executable.
 */
export function isTauriDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Invokes the native Rust command to auto-detect the Stardew Valley Mods directory.
 */
export async function detectModsFolderViaTauri(): Promise<string | null> {
  if (!isTauriDesktopRuntime()) {
    return null;
  }
  return invoke<string | null>('detect_stardew_mods_dir');
}

export interface TauriSvmmInfo {
  readonly svmmDataDir: string;
  readonly modpacks: readonly string[];
}

/**
 * Discovers SVMM_Data/modpacks via the native Tauri backend.
 */
export async function detectSvmmViaTauri(
  svmmDataDirHint?: string,
): Promise<TauriSvmmInfo | null> {
  if (!isTauriDesktopRuntime()) {
    return null;
  }
  return invoke<TauriSvmmInfo | null>('detect_svmm_modpacks', {
    svmmDataDirHint: svmmDataDirHint ?? null,
  });
}

/**
 * Exports the compiled mod directly into an SVMM modpack folder via Tauri.
 */
export async function exportModToSvmmViaTauri(
  svmmDataDir: string,
  modpackName: string,
  project: SdvProjectFile,
): Promise<string> {
  const folderName = formatBrowserZipRootName(project.metadata.name);
  const files = buildTauriExportFiles(project);
  return invoke<string>('export_mod_to_svmm_modpack', {
    svmmDataDir,
    modpackName,
    modFolderName: folderName,
    files,
  });
}

/**
 * Exports all mod files directly into the user's Mods/ folder via Tauri.
 */
export async function exportModToModsViaTauri(
  modsDir: string,
  project: SdvProjectFile,
): Promise<string> {
  const folderName = formatBrowserZipRootName(project.metadata.name);
  const files = buildTauriExportFiles(project);
  return invoke<string>('export_mod_files_to_mods', {
    modsDir,
    modFolderName: folderName,
    files,
  });
}

/**
 * Lists Content Patcher mod folders inside an SVMM modpack via Tauri.
 */
export async function listSvmmModFoldersViaTauri(
  svmmDataDir: string,
  modpackName: string,
): Promise<readonly string[]> {
  if (!isTauriDesktopRuntime()) {
    return [];
  }
  return invoke<readonly string[]>('list_svmm_mod_folders', { svmmDataDir, modpackName });
}

/**
 * Opens an existing Content Patcher mod from an SVMM modpack into an editable project.
 */
export async function openSvmmModViaTauri(
  svmmDataDir: string,
  modpackName: string,
  modFolderName: string,
): Promise<ModImportResult> {
  const payload = await invoke<InstalledModSnapshot>('read_svmm_mod_files', {
    svmmDataDir,
    modpackName,
    modFolderName,
  });
  return importContentPatcherMod({
    manifestJson: payload.manifestJson,
    contentJson: payload.contentJson,
  });
}

/**
 * Scans Mods/ via Tauri for UniqueID, Data/Objects key, and EditImage ToArea conflicts.
 */
export async function scanModsConflictsViaTauri(
  modsDir: string,
  project: SdvProjectFile,
): Promise<readonly ModConflictWarning[]> {
  if (!isTauriDesktopRuntime()) {
    return [];
  }
  const snapshots = await invoke<readonly InstalledModSnapshot[]>('scan_mods_folder_manifests', {
    modsDir,
  });
  return scanModConflicts(project, snapshots);
}

/**
 * Launches StardewModdingAPI via Tauri and streams parsed log lines until exit.
 */
export async function launchSmapiViaTauri(
  modUniqueId: string,
  modName: string,
  onLogEntry: (entry: SmapiLogEntry) => void,
): Promise<void> {
  const unlistenLog = await listen<string>('smapi-log', (event) => {
    onLogEntry(parseSmapiLogLine(event.payload, modUniqueId, modName));
  });

  await new Promise<void>((resolve, reject) => {
    void listen<number | null>('smapi-exit', () => {
      unlistenLog();
      resolve();
    }).then((unlistenExit) => {
      void invoke('launch_smapi').catch((err: unknown) => {
        unlistenLog();
        unlistenExit();
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  });
}
