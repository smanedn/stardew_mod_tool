import fs from 'node:fs/promises';
import path from 'node:path';
import type { SdvProjectFile } from '../../data/models/index.js';
import { SecurityError, assertSafeWriteTarget } from '../security/index.js';
import { formatBrowserZipRootName } from './browser-zip.js';
import { type ExportModResult, exportModPackage } from './mod-exporter.js';

export const SVMM_DATA_FOLDER_NAME = 'SVMM_Data';
export const SVMM_MODPACKS_FOLDER_NAME = 'modpacks';

export interface SvmmModpackInfo {
  readonly name: string;
  readonly directory: string;
}

export interface ExportToSvmmOptions {
  readonly project: SdvProjectFile;
  readonly projectDir: string;
  readonly svmmDataDir: string;
  readonly modpackName: string;
}

/**
 * Discovers all modpack folders inside an SVMM_Data/modpacks directory.
 */
export async function discoverSvmmModpacks(
  svmmDataDir: string,
): Promise<readonly SvmmModpackInfo[]> {
  const modpacksRoot = path.join(path.resolve(svmmDataDir), SVMM_MODPACKS_FOLDER_NAME);
  try {
    const entries = await fs.readdir(modpacksRoot, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        directory: path.join(modpacksRoot, entry.name),
      }));
  } catch {
    return [];
  }
}

/**
 * Exports a compiled Content Patcher mod directly into a Stardew Valley Mod Manager (SVMM)
 * modpack folder (SVMM_Data/modpacks/<ModpackName>/).
 */
export async function exportModToSvmmModpack(
  options: ExportToSvmmOptions,
): Promise<ExportModResult> {
  const cleanPackName = options.modpackName.trim();
  if (cleanPackName.length === 0 || cleanPackName.includes('..') || cleanPackName.includes('/')) {
    throw new SecurityError('INVALID_PATH', `Invalid SVMM modpack name "${options.modpackName}".`);
  }

  const modpacksRoot = path.join(path.resolve(options.svmmDataDir), SVMM_MODPACKS_FOLDER_NAME);
  const targetModpackDir = await assertSafeWriteTarget(
    path.join(modpacksRoot, cleanPackName),
    [modpacksRoot],
  );
  await fs.mkdir(targetModpackDir, { recursive: true });

  const modFolder = formatBrowserZipRootName(options.project.metadata.name);
  const modProject = {
    ...options.project,
    metadata: { ...options.project.metadata, uniqueId: options.project.metadata.uniqueId },
  };

  const result = await exportModPackage({
    project: modProject,
    projectDir: options.projectDir,
    modsDir: targetModpackDir,
  });

  const renamedTarget = path.join(targetModpackDir, modFolder);
  if (result.exportedModDir !== renamedTarget) {
    await fs.rm(renamedTarget, { recursive: true, force: true });
    await fs.rename(result.exportedModDir, renamedTarget);
    return { ...result, exportedModDir: renamedTarget };
  }

  return result;
}
