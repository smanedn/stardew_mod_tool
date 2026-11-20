import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { SdvProjectFile } from '../../data/models/index.js';
import {
  SecurityError,
  assertSafeWriteTarget,
  createBackupSnapshot,
  resolvePathWithinRoot,
  safeWriteFileWithBackup,
} from '../security/index.js';
import { lintProjectBeforeBuild } from '../validators/mod-linter.js';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
  serializeCleanJson,
} from './browser-compiler.js';
import { compileDefaultConfigJson } from './config-schema-builder.js';
import { buildLocaleFileMap } from './i18n-generator.js';

const execFileAsync = promisify(execFile);

export interface ModManagerCliConfig {
  readonly executablePath: string;
  readonly extraArgs?: readonly string[];
}

export interface ExportModOptions {
  readonly project: SdvProjectFile;
  readonly projectDir: string;
  readonly modsDir: string;
  readonly modManagerCli?: ModManagerCliConfig;
  readonly onExported?: (exportedModDir: string) => void | Promise<void>;
}

export interface ExportModResult {
  readonly exportedModDir: string;
  readonly filesWritten: readonly string[];
  readonly backupCreated: boolean;
  readonly modManagerNotified: boolean;
}

/**
 * Sanitizes a UniqueID into a safe folder name inside the Stardew Valley Mods directory.
 */
export function sanitizeModFolderName(uniqueId: string): string {
  const cleaned = uniqueId.trim().replace(/[^A-Za-z0-9._-]+/g, '_');
  return cleaned.length > 0 ? cleaned : 'CustomContentPack';
}

async function copyLinkedAssets(
  project: SdvProjectFile,
  projectDir: string,
  targetModDir: string,
  modsDir: string,
): Promise<readonly string[]> {
  const copied: string[] = [];
  for (const asset of project.assets) {
    const srcPath = resolvePathWithinRoot(projectDir, asset.relativePath);
    const destPath = await assertSafeWriteTarget(
      path.join(targetModDir, asset.relativePath),
      [modsDir],
    );
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    await fs.copyFile(srcPath, destPath);
    copied.push(destPath);
  }
  return copied;
}

async function writeLocaleFiles(
  project: SdvProjectFile,
  targetModDir: string,
  modsDir: string,
): Promise<readonly string[]> {
  const localeMap = buildLocaleFileMap(project);
  const written: string[] = [];

  for (const [relativePath, entries] of Object.entries(localeMap)) {
    if (Object.keys(entries).length === 0 && relativePath === 'i18n/default.json') {
      continue;
    }
    const destPath = path.join(targetModDir, relativePath);
    await safeWriteFileWithBackup({
      targetPath: destPath,
      content: serializeCleanJson(entries),
      allowedRoots: [modsDir],
    });
    written.push(destPath);
  }
  return written;
}

async function notifyModManager(
  exportedModDir: string,
  cli?: ModManagerCliConfig,
  onExported?: (dir: string) => void | Promise<void>,
): Promise<boolean> {
  let notified = false;
  if (cli !== undefined) {
    const args = [...(cli.extraArgs ?? []), exportedModDir];
    await execFileAsync(cli.executablePath, args);
    notified = true;
  }
  if (onExported !== undefined) {
    await onExported(exportedModDir);
    notified = true;
  }
  return notified;
}

async function writeCoreModFiles(
  project: SdvProjectFile,
  targetModDir: string,
  modsDir: string,
): Promise<readonly string[]> {
  const written: string[] = [];
  const manifestPath = path.join(targetModDir, 'manifest.json');
  const contentPath = path.join(targetModDir, 'content.json');

  await safeWriteFileWithBackup({
    targetPath: manifestPath,
    content: serializeCleanJson(compileProjectToManifest(project)),
    allowedRoots: [modsDir],
  });
  await safeWriteFileWithBackup({
    targetPath: contentPath,
    content: serializeCleanJson(compileProjectToContentJson(project)),
    allowedRoots: [modsDir],
  });
  written.push(manifestPath, contentPath);

  if (project.configOptions !== undefined && project.configOptions.length > 0) {
    const configPath = path.join(targetModDir, 'config.json');
    await safeWriteFileWithBackup({
      targetPath: configPath,
      content: serializeCleanJson(compileDefaultConfigJson(project.configOptions)),
      allowedRoots: [modsDir],
    });
    written.push(configPath);
  }
  return written;
}

/**
 * Validates, compiles, backs up, and exports a ready-to-use Content Patcher pack
 * into the Stardew Valley Mods folder, optionally notifying an external Mod Manager.
 */
export async function exportModPackage(options: ExportModOptions): Promise<ExportModResult> {
  const { project, projectDir, modsDir } = options;
  const lint = await lintProjectBeforeBuild(project, { projectDir });
  if (!lint.valid) {
    const details = lint.errors.map((e) => e.message).join('; ');
    throw new SecurityError('SCHEMA_VALIDATION_FAILED', `Pre-export lint failed: ${details}`);
  }

  const folderName = sanitizeModFolderName(project.metadata.uniqueId);
  const targetModDir = await assertSafeWriteTarget(path.join(modsDir, folderName), [modsDir]);
  const backup = await createBackupSnapshot({ targetPath: targetModDir, rootDir: modsDir });
  await fs.mkdir(targetModDir, { recursive: true });

  const coreFiles = await writeCoreModFiles(project, targetModDir, modsDir);
  const localeFiles = await writeLocaleFiles(project, targetModDir, modsDir);
  const assetFiles = await copyLinkedAssets(project, projectDir, targetModDir, modsDir);

  const modManagerNotified = await notifyModManager(
    targetModDir,
    options.modManagerCli,
    options.onExported,
  );

  return {
    exportedModDir: targetModDir,
    filesWritten: [...coreFiles, ...localeFiles, ...assetFiles],
    backupCreated: backup.created,
    modManagerNotified,
  };
}
