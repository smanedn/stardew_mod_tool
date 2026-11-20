import { invoke } from '@tauri-apps/api/core';
import type { SdvProjectFile } from '../../data/models/index.js';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
  serializeCleanJson,
} from './browser-compiler.js';
import { formatBrowserZipRootName } from './browser-zip.js';

export interface TauriExportFilePayload {
  readonly relativePath: string;
  readonly content: string;
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

/**
 * Exports manifest.json and content.json directly into the user's Mods/ folder via Tauri.
 */
export async function exportModToModsViaTauri(
  modsDir: string,
  project: SdvProjectFile,
): Promise<string> {
  const folderName = formatBrowserZipRootName(project.metadata.name);
  const files: readonly TauriExportFilePayload[] = [
    {
      relativePath: 'manifest.json',
      content: serializeCleanJson(compileProjectToManifest(project)),
    },
    {
      relativePath: 'content.json',
      content: serializeCleanJson(compileProjectToContentJson(project)),
    },
  ];
  return invoke<string>('export_mod_files_to_mods', {
    modsDir,
    modFolderName: folderName,
    files,
  });
}
