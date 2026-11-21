import { invoke } from '@tauri-apps/api/core';
import type { SdvProjectFile } from '../../data/models/index.js';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
  serializeCleanJson,
} from './browser-compiler.js';
import { formatBrowserZipRootName } from './browser-zip.js';
import { compileDefaultConfigJson } from './config-schema-builder.js';
import { buildLocaleFileMap } from './i18n-generator.js';

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
