import { z } from 'zod';
import {
  SDVPROJ_FORMAT_VERSION,
  type SdvProjectFile,
  type SdvProjectMetadata,
} from '../../data/models/index.js';
import { readJsonFileAsync, writeJsonFileAsync } from '../performance/index.js';
import {
  AreaRectSchema,
  type BackupSnapshotResult,
  RelativeAssetPathSchema,
  SemVerSchema,
  UniqueIdSchema,
  validateWithSchema,
} from '../security/index.js';

const PatchConditionsSchema = z.record(z.string().min(1), z.string());

const SdvProjectMetadataSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    author: z.string().trim().min(1).max(100),
    version: SemVerSchema,
    description: z.string().trim().max(1000),
    uniqueId: UniqueIdSchema,
    updateKeys: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

const LinkedAssetSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    relativePath: RelativeAssetPathSchema,
    kind: z.enum(['png', 'tmx', 'xnb']),
  })
  .strict();

const ObjectRecipeSchema = z
  .object({
    kind: z.enum(['cooking', 'crafting']),
    ingredients: z.record(z.string().min(1), z.number().int().min(1)),
  })
  .strict();

const ObjectEditSchema = z
  .object({
    kind: z.literal('object'),
    id: z.string().min(1),
    itemId: z.string().min(1),
    displayName: z.string().min(1),
    description: z.string(),
    price: z.number().int().min(0),
    edibility: z.number().int(),
    category: z.number().int(),
    assetId: z.string().min(1).optional(),
    recipe: ObjectRecipeSchema.optional(),
  })
  .strict();

const CropEditSchema = z
  .object({
    kind: z.literal('crop'),
    id: z.string().min(1),
    seedItemId: z.string().min(1),
    harvestItemId: z.string().min(1),
    seasons: z.array(z.string().min(1)).min(1),
    daysInPhase: z.array(z.number().int().min(1)).min(1),
    assetId: z.string().min(1).optional(),
  })
  .strict();

const RetextureEditSchema = z
  .object({
    kind: z.literal('retexture'),
    id: z.string().min(1),
    target: z.string().min(1),
    assetId: z.string().min(1),
    fromArea: AreaRectSchema.optional(),
    toArea: AreaRectSchema.optional(),
    when: PatchConditionsSchema.optional(),
  })
  .strict();

const DialogueEditSchema = z
  .object({
    kind: z.literal('dialogue'),
    id: z.string().min(1),
    npcName: z.string().min(1),
    dialogueKey: z.string().min(1),
    text: z.string(),
    when: PatchConditionsSchema.optional(),
  })
  .strict();

const ProjectConfigOptionSchema = z
  .object({
    id: z.string().min(1),
    key: z
      .string()
      .trim()
      .min(1)
      .regex(/^[A-Za-z0-9_]+$/),
    optionType: z.enum(['toggle', 'choice', 'number']),
    defaultValue: z.string(),
    allowValues: z.string().optional(),
    description: z.string().optional(),
    section: z.string().optional(),
  })
  .strict();

export const SdvProjectSchema: z.ZodType<SdvProjectFile> = z
  .object({
    formatVersion: z.number().int().min(1),
    updatedAt: z.string().min(1),
    metadata: SdvProjectMetadataSchema,
    assets: z.array(LinkedAssetSchema),
    edits: z.array(
      z.discriminatedUnion('kind', [
        ObjectEditSchema,
        CropEditSchema,
        RetextureEditSchema,
        DialogueEditSchema,
      ]),
    ),
    configOptions: z.array(ProjectConfigOptionSchema).optional(),
    translations: z
      .record(z.string().min(1), z.record(z.string().min(1), z.string()))
      .optional(),
  })
  .strict();

/**
 * Creates a new empty .sdvproj state from validated metadata.
 */
export function createEmptyProject(metadata: SdvProjectMetadata): SdvProjectFile {
  const safeMeta = validateWithSchema(SdvProjectMetadataSchema, metadata, 'Project metadata');
  return {
    formatVersion: SDVPROJ_FORMAT_VERSION,
    updatedAt: new Date().toISOString(),
    metadata: safeMeta,
    assets: [],
    edits: [],
  };
}

/**
 * Validates and parses a raw .sdvproj JSON string.
 */
export function parseProjectJson(rawJson: string): SdvProjectFile {
  const parsed: unknown = JSON.parse(rawJson);
  return validateWithSchema(SdvProjectSchema, parsed, '.sdvproj');
}

/**
 * Asynchronously loads and validates a .sdvproj file from disk.
 */
export async function loadProjectFile(
  filePath: string,
  allowedRoots: readonly string[],
): Promise<SdvProjectFile> {
  return readJsonFileAsync(filePath, SdvProjectSchema, allowedRoots);
}

/**
 * Validates and asynchronously saves a .sdvproj file with automatic .backup snapshot.
 */
export async function saveProjectFile(
  filePath: string,
  project: SdvProjectFile,
  allowedRoots: readonly string[],
): Promise<BackupSnapshotResult> {
  const validated = validateWithSchema(SdvProjectSchema, project, '.sdvproj');
  return writeJsonFileAsync(filePath, validated, allowedRoots);
}
