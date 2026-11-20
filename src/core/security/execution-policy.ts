import path from 'node:path';
import { SecurityError } from './security-error.js';

/**
 * File extensions permitted for Content Patcher packs and static mod assets.
 */
export const ALLOWED_MOD_FILE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.json',
  '.png',
  '.tmx',
  '.xnb',
]);

/**
 * Executable or script extensions explicitly blocked to prevent arbitrary code execution.
 */
export const FORBIDDEN_EXECUTABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.dll',
  '.exe',
  '.cs',
  '.csproj',
  '.ps1',
  '.bat',
  '.cmd',
  '.sh',
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.vbs',
  '.msi',
]);

/**
 * Required Content Pack target ID for all generated mods.
 */
export const CONTENT_PATCHER_UNIQUE_ID = 'Pathoschild.ContentPatcher';

/**
 * Verifies that a target file path has an allowed static asset or JSON extension
 * and is not an executable or compiled C# assembly.
 */
export function assertAllowedModFileExtension(filePath: string): string {
  const normalized = filePath.trim();
  if (normalized.length === 0) {
    throw new SecurityError('INVALID_PATH', 'File path cannot be empty.');
  }

  const ext = path.extname(normalized).toLowerCase();
  if (FORBIDDEN_EXECUTABLE_EXTENSIONS.has(ext)) {
    throw new SecurityError(
      'FORBIDDEN_CODE_EXECUTION',
      `Executable or code file extension "${ext}" is forbidden.`,
    );
  }

  if (!ALLOWED_MOD_FILE_EXTENSIONS.has(ext)) {
    throw new SecurityError(
      'FORBIDDEN_CODE_EXECUTION',
      `Unsupported mod file extension "${ext || '(none)'}". Allowed: .json, .png, .tmx, .xnb.`,
    );
  }

  return ext;
}

function extractContentPackUniqueId(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, 'UniqueID');
  return descriptor?.value;
}

/**
 * Ensures a raw manifest object does not declare an EntryDll (C# SMAPI mod)
 * and targets Content Patcher instead.
 */
export function assertContentPatcherOnlyManifest(manifest: Record<string, unknown>): void {
  if ('EntryDll' in manifest && manifest['EntryDll'] !== undefined) {
    throw new SecurityError(
      'FORBIDDEN_CODE_EXECUTION',
      'EntryDll is forbidden: only Content Patcher packs are allowed.',
    );
  }

  const uniqueId = extractContentPackUniqueId(manifest['ContentPackFor']);
  if (uniqueId !== CONTENT_PATCHER_UNIQUE_ID) {
    throw new SecurityError(
      'FORBIDDEN_CODE_EXECUTION',
      `Manifest must declare ContentPackFor.UniqueID = "${CONTENT_PATCHER_UNIQUE_ID}".`,
    );
  }
}
