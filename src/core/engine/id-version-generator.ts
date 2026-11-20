import { SemVerSchema, UniqueIdSchema, validateWithSchema } from '../security/input-schemas.js';
import { SecurityError } from '../security/security-error.js';

export type VersionBumpKind = 'major' | 'minor' | 'patch';

export const DEFAULT_INITIAL_VERSION = '1.0.0';

function sanitizeIdentifierSegment(raw: string, fallback: string): string {
  const words = raw
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return fallback;
  }

  const pascal = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  return /^[A-Za-z]/.test(pascal) ? pascal : `${fallback}${pascal}`;
}

/**
 * Generates a valid SMAPI UniqueID (e.g. "AuthorName.ModName") from free-text inputs,
 * stripping illegal characters and validating against UniqueIdSchema.
 */
export function generateUniqueId(author: string, modName: string): string {
  const safeAuthor = sanitizeIdentifierSegment(author, 'Author');
  const safeModName = sanitizeIdentifierSegment(modName, 'MyMod');
  const candidate = `${safeAuthor}.${safeModName}`;
  return validateWithSchema(UniqueIdSchema, candidate, 'Generated UniqueID');
}

/**
 * Increments a Semantic Version string ("MAJOR.MINOR.PATCH") by major, minor, or patch.
 */
export function incrementSemVer(currentVersion: string, bump: VersionBumpKind = 'patch'): string {
  const validated = validateWithSchema(SemVerSchema, currentVersion, 'Current Version');
  const corePart = validated.split('-')[0]?.split('+')[0] ?? '';
  const parts = corePart.split('.').map((part) => Number.parseInt(part, 10));

  const major = parts[0];
  const minor = parts[1];
  const patch = parts[2];

  if (
    major === undefined ||
    minor === undefined ||
    patch === undefined ||
    Number.isNaN(major) ||
    Number.isNaN(minor) ||
    Number.isNaN(patch)
  ) {
    throw new SecurityError('SCHEMA_VALIDATION_FAILED', `Invalid SemVer: "${currentVersion}".`);
  }

  if (bump === 'major') {
    return `${String(major + 1)}.0.0`;
  }
  if (bump === 'minor') {
    return `${String(major)}.${String(minor + 1)}.0`;
  }
  return `${String(major)}.${String(minor)}.${String(patch + 1)}`;
}
