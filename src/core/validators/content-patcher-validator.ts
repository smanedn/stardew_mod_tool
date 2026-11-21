import { z } from 'zod';
import type { ContentJsonDocument, ContentPatch } from '../../data/models/index.js';
import {
  AreaRectSchema,
  GameTargetSchema,
  RelativeAssetPathSchema,
  validateWithSchema,
} from '../security/index.js';

export const PatchConditionsSchema = z.record(z.string().trim().min(1), z.string());

export const DynamicTokenSchema = z
  .object({
    Name: z
      .string()
      .trim()
      .min(1)
      .regex(/^[A-Za-z0-9_]+$/, 'DynamicToken Name must be alphanumeric or underscore.'),
    Value: z.string(),
    When: PatchConditionsSchema.optional(),
  })
  .strict();

export const ConfigSchemaFieldSchema = z
  .object({
    AllowValues: z.string().optional(),
    Default: z.string(),
    Description: z.string().optional(),
    Section: z.string().optional(),
    AllowMultiple: z.boolean().optional(),
    AllowBlank: z.boolean().optional(),
  })
  .strict();

export const LoadPatchSchema = z
  .object({
    Action: z.literal('Load'),
    LogName: z.string().trim().min(1).optional(),
    Target: GameTargetSchema,
    FromFile: RelativeAssetPathSchema,
    When: PatchConditionsSchema.optional(),
  })
  .strict();

export const TextOperationSchema = z
  .object({
    Operation: z.enum(['Append', 'Prepend', 'Remove']),
    Target: z.array(z.string().min(1)).min(1),
    Value: z.string(),
    Delimiter: z.string().optional(),
  })
  .strict();

export const EditDataPatchSchema = z
  .object({
    Action: z.literal('EditData'),
    LogName: z.string().trim().min(1).optional(),
    Target: GameTargetSchema,
    TargetField: z.array(z.string().min(1)).min(1).optional(),
    Entries: z.record(z.string().min(1), z.unknown()).optional(),
    Fields: z
      .record(z.string().min(1), z.record(z.string().min(1), z.unknown()))
      .optional(),
    TextOperations: z.array(TextOperationSchema).min(1).optional(),
    When: PatchConditionsSchema.optional(),
  })
  .strict()
  .refine(
    (patch) =>
      patch.Entries !== undefined ||
      patch.Fields !== undefined ||
      patch.TextOperations !== undefined,
    'EditData patch must specify Entries, Fields, or TextOperations.',
  );

export const EditImagePatchSchema = z
  .object({
    Action: z.literal('EditImage'),
    LogName: z.string().trim().min(1).optional(),
    Target: GameTargetSchema,
    FromFile: RelativeAssetPathSchema,
    FromArea: AreaRectSchema.optional(),
    ToArea: AreaRectSchema.optional(),
    PatchMode: z.enum(['Replace', 'Overlay']).optional(),
    When: PatchConditionsSchema.optional(),
  })
  .strict();

export const IncludePatchSchema = z
  .object({
    Action: z.literal('Include'),
    LogName: z.string().trim().min(1).optional(),
    FromFile: RelativeAssetPathSchema,
    When: PatchConditionsSchema.optional(),
  })
  .strict();

export const ContentPatchSchema: z.ZodType<ContentPatch> = z.union([
  LoadPatchSchema,
  EditDataPatchSchema,
  EditImagePatchSchema,
  IncludePatchSchema,
]);

export const ContentJsonDocumentSchema: z.ZodType<ContentJsonDocument> = z
  .object({
    Format: z
      .string()
      .trim()
      .regex(/^2\.\d+\.\d+$/, 'Content Patcher Format must be 2.x.x (e.g. "2.0.0").'),
    ConfigSchema: z.record(z.string().trim().min(1), ConfigSchemaFieldSchema).optional(),
    DynamicTokens: z.array(DynamicTokenSchema).optional(),
    Changes: z.array(ContentPatchSchema),
  })
  .strict();

/**
 * Validates a Content Patcher 2.0+ content.json document.
 */
export function validateContentJson(input: unknown): ContentJsonDocument {
  return validateWithSchema(ContentJsonDocumentSchema, input, 'content.json');
}
