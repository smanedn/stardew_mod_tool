import fs from 'node:fs/promises';
import path from 'node:path';
import { SecurityError } from './security-error.js';

export interface PathContainmentOptions {
  readonly allowRoot?: boolean;
}

/**
 * Rejects empty paths and paths containing null bytes.
 */
export function assertValidRawPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (trimmed.length === 0) {
    throw new SecurityError('INVALID_PATH', 'Path must not be empty.');
  }
  if (trimmed.includes('\0')) {
    throw new SecurityError('INVALID_PATH', 'Path must not contain null bytes.');
  }
  return trimmed;
}

/**
 * Checks whether a resolved target path is lexically contained within a resolved root directory.
 */
export function isPathInsideRoot(
  resolvedRoot: string,
  resolvedTarget: string,
  allowRoot = false,
): boolean {
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative === '') {
    return allowRoot;
  }
  if (relative === '..' || relative.startsWith(`..${path.sep}`)) {
    return false;
  }
  return !path.isAbsolute(relative);
}

/**
 * Resolves a user-supplied path against a single root directory and blocks traversal outside it.
 */
export function resolvePathWithinRoot(
  rootDir: string,
  targetPath: string,
  options: PathContainmentOptions = {},
): string {
  const safeRoot = assertValidRawPath(rootDir);
  const safeTarget = assertValidRawPath(targetPath);

  const resolvedRoot = path.resolve(safeRoot);
  const resolvedTarget = path.resolve(resolvedRoot, safeTarget);

  if (!isPathInsideRoot(resolvedRoot, resolvedTarget, options.allowRoot ?? false)) {
    throw new SecurityError(
      'PATH_TRAVERSAL_BLOCKED',
      `Path "${targetPath}" escapes allowed root "${resolvedRoot}".`,
    );
  }

  return resolvedTarget;
}

/**
 * Resolves a target path and verifies it falls inside at least one of the allowed root folders
 * (such as the active project directory or the configured Stardew Valley Mods folder).
 */
export function resolvePathWithinAllowedRoots(
  targetPath: string,
  allowedRoots: readonly string[],
  options: PathContainmentOptions = {},
): string {
  const safeTarget = assertValidRawPath(targetPath);
  const validRoots = allowedRoots.map((root) => path.resolve(assertValidRawPath(root)));

  if (validRoots.length === 0) {
    throw new SecurityError('INVALID_PATH', 'At least one allowed root directory is required.');
  }

  for (const resolvedRoot of validRoots) {
    const candidate = path.resolve(resolvedRoot, safeTarget);
    if (isPathInsideRoot(resolvedRoot, candidate, options.allowRoot ?? false)) {
      return candidate;
    }
  }

  throw new SecurityError(
    'PATH_TRAVERSAL_BLOCKED',
    `Write target "${targetPath}" is outside all permitted directories.`,
  );
}

async function resolveDeepestExistingRealPath(targetPath: string): Promise<string> {
  const resolved = path.resolve(targetPath);
  const missingSegments: string[] = [];

  for (let current = resolved; ;) {
    try {
      const realCurrent = await fs.realpath(current);
      return path.join(realCurrent, ...missingSegments.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) {
        return resolved;
      }
      missingSegments.push(path.basename(current));
      current = parent;
    }
  }
}

/**
 * Asynchronously verifies that a target path (following any existing symlinks/junctions)
 * remains inside at least one allowed root directory.
 */
export async function assertSafeWriteTarget(
  targetPath: string,
  allowedRoots: readonly string[],
  options: PathContainmentOptions = {},
): Promise<string> {
  const resolvedTarget = resolvePathWithinAllowedRoots(targetPath, allowedRoots, options);
  const realTarget = await resolveDeepestExistingRealPath(resolvedTarget);

  for (const root of allowedRoots) {
    const resolvedRoot = path.resolve(assertValidRawPath(root));
    const realRoot = await resolveDeepestExistingRealPath(resolvedRoot);
    if (isPathInsideRoot(realRoot, realTarget, options.allowRoot ?? false)) {
      return resolvedTarget;
    }
  }

  throw new SecurityError(
    'PATH_TRAVERSAL_BLOCKED',
    `Resolved real path for "${targetPath}" escapes permitted directories.`,
  );
}
