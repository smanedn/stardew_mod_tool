import { z } from 'zod';
import { CONTENT_PATCHER_UNIQUE_ID } from './execution-policy.js';
import { SecurityError } from './security-error.js';

export const MAX_SPRITE_COORDINATE = 16384;

const UNIQUE_ID_PATTERN = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_-]+)*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const GAME_TARGET_PATTERN = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/;
const RELATIVE_ASSET_PATTERN = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:png|tmx|xnb|json)$/i;

/**
 * Validates a SMAPI UniqueID (e.g. "AuthorName.MyMod").
 */
export const UniqueIdSchema = z
  .string()
  .trim()
  .min(3, 'UniqueID must be at least 3 characters.')
  .max(128, 'UniqueID must be at most 128 characters.')
  .regex(
    UNIQUE_ID_PATTERN,
    'UniqueID may only contain alphanumeric characters, dots, underscores, and hyphens.',
  )
  .refine((val) => !val.includes('..'), 'UniqueID must not contain consecutive dots.');

/**
 * Validates a Semantic Version string (e.g. "1.0.0" or "1.2.0-beta.1").
 */
export const SemVerSchema = z
  .string()
  .trim()
  .max(64, 'Version string is too long.')
  .regex(SEMVER_PATTERN, 'Version must follow Semantic Versioning (e.g. 1.0.0).');

/**
 * Validates a Content Patcher game asset target (e.g. "Data/Objects", "Maps/Farm").
 */
export const GameTargetSchema = z
  .string()
  .trim()
  .min(1, 'Game target must not be empty.')
  .max(256, 'Game target is too long.')
  .regex(
    GAME_TARGET_PATTERN,
    'Game target must use forward-slash segments without backslashes or leading slashes.',
  )
  .refine(
    (val) => !val.split('/').includes('..') && !val.split('/').includes('.'),
    'Game target must not contain "." or ".." path segments.',
  );

/**
 * Validates a relative mod asset path (e.g. "assets/strawberry.png").
 */
export const RelativeAssetPathSchema = z
  .string()
  .trim()
  .min(1, 'Asset path must not be empty.')
  .max(256, 'Asset path is too long.')
  .regex(
    RELATIVE_ASSET_PATTERN,
    'Asset path must be a relative forward-slash path ending in .png, .tmx, .xnb, or .json.',
  )
  .refine(
    (val) => !val.split('/').includes('..') && !val.split('/').includes('.'),
    'Asset path must not contain "." or ".." segments.',
  );

/**
 * Validates a 2D point coordinate (non-negative integer within safe bounds).
 */
export const CoordinatesSchema = z
  .object({
    X: z.number().int().min(0).max(MAX_SPRITE_COORDINATE),
    Y: z.number().int().min(0).max(MAX_SPRITE_COORDINATE),
  })
  .strict();

/**
 * Validates a rectangular region (FromArea / ToArea) for EditImage patches.
 */
export const AreaRectSchema = z
  .object({
    X: z.number().int().min(0).max(MAX_SPRITE_COORDINATE),
    Y: z.number().int().min(0).max(MAX_SPRITE_COORDINATE),
    Width: z.number().int().min(1).max(MAX_SPRITE_COORDINATE),
    Height: z.number().int().min(1).max(MAX_SPRITE_COORDINATE),
  })
  .strict();

/**
 * Validates a Content Patcher manifest.json payload. Strictly forbids EntryDll.
 */
export const ManifestInputSchema = z
  .object({
    Name: z.string().trim().min(1, 'Mod Name is required.').max(120),
    Author: z.string().trim().min(1, 'Author is required.').max(100),
    Version: SemVerSchema,
    Description: z.string().trim().max(1000).default(''),
    UniqueID: UniqueIdSchema,
    ContentPackFor: z
      .object({
        UniqueID: z.literal(CONTENT_PATCHER_UNIQUE_ID),
        MinimumVersion: SemVerSchema.optional(),
      })
      .strict(),
  })
  .strict();

export type ValidatedCoordinates = z.infer<typeof CoordinatesSchema>;
export type ValidatedAreaRect = z.infer<typeof AreaRectSchema>;
export type ValidatedManifestInput = z.infer<typeof ManifestInputSchema>;

/**
 * Parses and validates unknown input against a Zod schema before any filesystem operation.
 * Throws a SecurityError with SCHEMA_VALIDATION_FAILED on invalid input.
 */
export function validateWithSchema<T>(
  schema: z.ZodType<T>,
  input: unknown,
  contextLabel = 'Input',
): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const summary = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    throw new SecurityError(
      'SCHEMA_VALIDATION_FAILED',
      `${contextLabel} validation failed: ${summary}`,
    );
  }
  return result.data;
}
