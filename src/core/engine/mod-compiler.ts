import path from 'node:path';
import type {
  ContentJsonDocument,
  ContentPatch,
  CropEditEntry,
  DialogueEditEntry,
  LinkedAssetEntry,
  Manifest,
  ObjectEditEntry,
  RetextureEditEntry,
  SdvProjectFile,
} from '../../data/models/index.js';
import {
  CONTENT_PATCHER_UNIQUE_ID,
  SecurityError,
  safeWriteFileWithBackup,
} from '../security/index.js';
import { validateContentJson, validateManifest } from '../validators/index.js';
import { compileConfigSchema } from './config-schema-builder.js';

export const CONTENT_PATCHER_FORMAT_VERSION = '2.0.0';

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively strips null and undefined properties from objects and arrays
 * to produce minimal, clean SMAPI JSON output.
 */
export function stripNullAndUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => stripNullAndUndefined(item));
  }

  if (isPlainRecord(value)) {
    const entries: Array<[string, unknown]> = [];
    for (const [key, propValue] of Object.entries(value)) {
      if (propValue !== null && propValue !== undefined) {
        entries.push([key, stripNullAndUndefined(propValue)]);
      }
    }
    return Object.fromEntries(entries);
  }

  return value;
}

/**
 * Serializes a value into clean, 2-space formatted JSON stripped of null/undefined fields.
 */
export function serializeCleanJson(data: unknown): string {
  const cleaned = stripNullAndUndefined(data);
  return `${JSON.stringify(cleaned, null, 2)}\n`;
}

/**
 * Compiles .sdvproj metadata into a validated SMAPI manifest.json object.
 */
export function compileProjectToManifest(project: SdvProjectFile): Manifest {
  const { metadata } = project;
  const rawManifest = {
    Name: metadata.name,
    Author: metadata.author,
    Version: metadata.version,
    Description: metadata.description,
    UniqueID: metadata.uniqueId,
    ContentPackFor: {
      UniqueID: CONTENT_PATCHER_UNIQUE_ID,
      MinimumVersion: CONTENT_PATCHER_FORMAT_VERSION,
    },
    ...(metadata.updateKeys !== undefined && metadata.updateKeys.length > 0
      ? { UpdateKeys: metadata.updateKeys }
      : {}),
  };

  return validateManifest(rawManifest);
}

function buildAssetLookup(
  assets: readonly LinkedAssetEntry[],
): ReadonlyMap<string, LinkedAssetEntry> {
  return new Map(assets.map((asset) => [asset.id, asset]));
}

function compileObjectPatch(edit: ObjectEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Add Object: ${edit.displayName}`,
    Target: 'Data/Objects',
    Entries: {
      [edit.itemId]: {
        Name: edit.itemId,
        DisplayName: edit.displayName,
        Description: edit.description,
        Price: edit.price,
        Edibility: edit.edibility,
        Category: edit.category,
      },
    },
  };
}

function compileObjectRecipePatch(edit: ObjectEditEntry): ContentPatch | null {
  if (edit.recipe === undefined) {
    return null;
  }
  const ingredientsStr = Object.entries(edit.recipe.ingredients)
    .map(([id, qty]) => `${id} ${String(qty)}`)
    .join(' ');
  const isCooking = edit.recipe.kind === 'cooking';
  const target = isCooking ? 'Data/CookingRecipes' : 'Data/CraftingRecipes';
  const recipeValue = isCooking
    ? `${ingredientsStr}/1 10/${edit.itemId}/default`
    : `${ingredientsStr}/Home/${edit.itemId}/false/default`;

  return {
    Action: 'EditData',
    LogName: `Add Recipe: ${edit.displayName}`,
    Target: target,
    Entries: { [edit.itemId]: recipeValue },
  };
}

function compileCropPatch(edit: CropEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Add Crop: ${edit.seedItemId}`,
    Target: 'Data/Crops',
    Entries: {
      [edit.seedItemId]: {
        Seasons: edit.seasons,
        DaysInPhase: edit.daysInPhase,
        HarvestItemId: edit.harvestItemId,
      },
    },
  };
}

function compileRetexturePatch(
  edit: RetextureEditEntry,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): ContentPatch {
  const asset = assetsById.get(edit.assetId);
  if (asset === undefined) {
    throw new SecurityError(
      'INVALID_PATH',
      `Retexture edit "${edit.id}" references missing asset "${edit.assetId}".`,
    );
  }
  return {
    Action: 'EditImage',
    LogName: `Retexture: ${edit.target}`,
    Target: edit.target,
    FromFile: asset.relativePath,
    ...(edit.fromArea !== undefined ? { FromArea: edit.fromArea } : {}),
    ...(edit.toArea !== undefined ? { ToArea: edit.toArea } : {}),
    ...(edit.when !== undefined ? { When: edit.when } : {}),
  };
}

function compileDialoguePatch(edit: DialogueEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Dialogue: ${edit.npcName}`,
    Target: `Characters/Dialogue/${edit.npcName}`,
    Entries: {
      [edit.dialogueKey]: edit.text,
    },
    ...(edit.when !== undefined ? { When: edit.when } : {}),
  };
}

/**
 * Compiles .sdvproj edits into a validated Content Patcher 2.0+ content.json document.
 */
export function compileProjectToContentJson(project: SdvProjectFile): ContentJsonDocument {
  const assetsById = buildAssetLookup(project.assets);
  const changes: ContentPatch[] = [];

  for (const edit of project.edits) {
    if (edit.kind === 'object') {
      changes.push(compileObjectPatch(edit));
      const recipePatch = compileObjectRecipePatch(edit);
      if (recipePatch !== null) {
        changes.push(recipePatch);
      }
    } else if (edit.kind === 'crop') {
      changes.push(compileCropPatch(edit));
    } else if (edit.kind === 'retexture') {
      changes.push(compileRetexturePatch(edit, assetsById));
    } else {
      changes.push(compileDialoguePatch(edit));
    }
  }

  const hasConfig = project.configOptions !== undefined && project.configOptions.length > 0;
  return validateContentJson({
    Format: CONTENT_PATCHER_FORMAT_VERSION,
    ...(hasConfig ? { ConfigSchema: compileConfigSchema(project.configOptions) } : {}),
    Changes: changes,
  });
}

/**
 * Compiles and writes manifest.json and content.json into an output mod folder safely.
 */
export async function compileModToDirectory(
  project: SdvProjectFile,
  outputDir: string,
  allowedRoots: readonly string[],
): Promise<{ readonly manifestPath: string; readonly contentPath: string }> {
  const manifest = compileProjectToManifest(project);
  const content = compileProjectToContentJson(project);

  const manifestPath = path.join(outputDir, 'manifest.json');
  const contentPath = path.join(outputDir, 'content.json');

  await safeWriteFileWithBackup({
    targetPath: manifestPath,
    content: serializeCleanJson(manifest),
    allowedRoots,
  });

  await safeWriteFileWithBackup({
    targetPath: contentPath,
    content: serializeCleanJson(content),
    allowedRoots,
  });

  return { manifestPath, contentPath };
}
