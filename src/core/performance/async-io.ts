import fs from 'node:fs/promises';
import type { z } from 'zod';
import {
  type BackupSnapshotResult,
  type SupportedAssetKind,
  assertSafeWriteTarget,
  resolvePathWithinAllowedRoots,
  safeWriteFileWithBackup,
  validateExternalAssetFile,
  validateWithSchema,
} from '../security/index.js';

/**
 * Asynchronously reads and parses a JSON file, validating its path and schema.
 */
export async function readJsonFileAsync<T>(
  filePath: string,
  schema: z.ZodType<T>,
  allowedRoots?: readonly string[],
): Promise<T> {
  const targetPath =
    allowedRoots !== undefined ? resolvePathWithinAllowedRoots(filePath, allowedRoots) : filePath;

  const rawText = await fs.readFile(targetPath, 'utf-8');
  const parsed: unknown = JSON.parse(rawText);
  return validateWithSchema(schema, parsed, 'JSON file');
}

/**
 * Asynchronously serializes data as formatted JSON and writes it safely with backup.
 */
export async function writeJsonFileAsync(
  filePath: string,
  data: unknown,
  allowedRoots: readonly string[],
  backupRootDir?: string,
): Promise<BackupSnapshotResult> {
  const safeTarget = await assertSafeWriteTarget(filePath, allowedRoots);
  const serialized = `${JSON.stringify(data, null, 2)}\n`;

  return safeWriteFileWithBackup({
    targetPath: safeTarget,
    content: serialized,
    allowedRoots,
    ...(backupRootDir !== undefined ? { backupRootDir } : {}),
  });
}

/**
 * Asynchronously validates magic bytes and size limits, then reads a binary asset.
 */
export async function readBinaryAssetAsync(
  filePath: string,
  expectedKind: SupportedAssetKind,
  allowedRoots?: readonly string[],
): Promise<Uint8Array> {
  const targetPath =
    allowedRoots !== undefined ? resolvePathWithinAllowedRoots(filePath, allowedRoots) : filePath;

  await validateExternalAssetFile(targetPath, expectedKind);
  return fs.readFile(targetPath);
}
