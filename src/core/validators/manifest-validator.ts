import { z } from 'zod';
import type { Manifest } from '../../data/models/index.js';
import {
  CONTENT_PATCHER_UNIQUE_ID,
  SemVerSchema,
  UniqueIdSchema,
  validateWithSchema,
} from '../security/index.js';

export const ManifestDependencySchema = z
  .object({
    UniqueID: UniqueIdSchema,
    MinimumVersion: SemVerSchema.optional(),
    IsRequired: z.boolean().optional(),
  })
  .strict();

export const ManifestSchema: z.ZodType<Manifest> = z
  .object({
    Name: z.string().trim().min(1, 'Name is required.').max(120),
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
    MinimumApiVersion: SemVerSchema.optional(),
    UpdateKeys: z.array(z.string().trim().min(1)).optional(),
    Dependencies: z.array(ManifestDependencySchema).optional(),
  })
  .strict();

/**
 * Validates a SMAPI manifest.json object with mandatory fields, optional dependencies,
 * and Content Patcher enforcement (forbids EntryDll).
 */
export function validateManifest(input: unknown): Manifest {
  return validateWithSchema(ManifestSchema, input, 'manifest.json');
}
