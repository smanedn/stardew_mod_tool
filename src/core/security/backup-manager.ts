import fs from 'node:fs/promises';
import path from 'node:path';
import { assertAllowedModFileExtension } from './execution-policy.js';
import { assertSafeWriteTarget, resolvePathWithinRoot } from './path-sanitizer.js';
import { SecurityError } from './security-error.js';

export const BACKUP_FOLDER_NAME = '.backup';

export interface BackupSnapshotOptions {
  readonly targetPath: string;
  readonly rootDir: string;
  readonly backupBaseDir?: string;
}

export interface BackupSnapshotResult {
  readonly created: boolean;
  readonly backupPath: string | null;
}

export interface SafeWriteOptions {
  readonly targetPath: string;
  readonly content: string | Uint8Array;
  readonly allowedRoots: readonly string[];
  readonly backupRootDir?: string;
}

function formatBackupTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function pathExists(targetPath: string): Promise<'file' | 'directory' | 'missing'> {
  try {
    const stats = await fs.lstat(targetPath);
    if (stats.isDirectory()) {
      return 'directory';
    }
    return 'file';
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return 'missing';
    }
    throw error;
  }
}

/**
 * Creates a timestamped snapshot of an existing file or directory inside a `.backup` folder
 * before it is overwritten or exported over.
 */
export async function createBackupSnapshot(
  options: BackupSnapshotOptions,
): Promise<BackupSnapshotResult> {
  const safeRoot = path.resolve(options.rootDir);
  const safeTarget = await assertSafeWriteTarget(options.targetPath, [safeRoot]);
  const existingKind = await pathExists(safeTarget);

  if (existingKind === 'missing') {
    return { created: false, backupPath: null };
  }

  const backupBase = options.backupBaseDir
    ? resolvePathWithinRoot(safeRoot, options.backupBaseDir, { allowRoot: false })
    : path.join(safeRoot, BACKUP_FOLDER_NAME);

  const relativeTarget = path.relative(safeRoot, safeTarget);
  const timestamp = formatBackupTimestamp();
  const snapshotPath = resolvePathWithinRoot(backupBase, path.join(timestamp, relativeTarget));

  try {
    await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
    if (existingKind === 'directory') {
      await fs.cp(safeTarget, snapshotPath, { recursive: true, force: false, errorOnExist: true });
    } else {
      await fs.copyFile(safeTarget, snapshotPath);
    }
    return { created: true, backupPath: snapshotPath };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new SecurityError('BACKUP_FAILED', `Failed to create backup snapshot: ${message}`);
  }
}

/**
 * Validates extension, path containment, creates a backup snapshot if the target exists,
 * and writes the file asynchronously.
 */
export async function safeWriteFileWithBackup(
  options: SafeWriteOptions,
): Promise<BackupSnapshotResult> {
  assertAllowedModFileExtension(options.targetPath);
  const safeTarget = await assertSafeWriteTarget(options.targetPath, options.allowedRoots);

  const matchingRoot = options.allowedRoots.find((root) => {
    const resolvedRoot = path.resolve(root);
    const rel = path.relative(resolvedRoot, safeTarget);
    return rel !== '' && !rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel);
  });

  if (matchingRoot === undefined) {
    throw new SecurityError('PATH_TRAVERSAL_BLOCKED', 'No matching allowed root for backup.');
  }

  const backupResult = await createBackupSnapshot({
    targetPath: safeTarget,
    rootDir: matchingRoot,
    ...(options.backupRootDir !== undefined ? { backupBaseDir: options.backupRootDir } : {}),
  });

  await fs.mkdir(path.dirname(safeTarget), { recursive: true });
  await fs.writeFile(safeTarget, options.content);
  return backupResult;
}
