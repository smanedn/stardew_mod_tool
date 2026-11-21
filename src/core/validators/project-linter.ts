import type { SdvProjectFile } from '../../data/models/index.js';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
} from '../engine/browser-compiler.js';
import { GameTargetSchema, validateWithSchema } from '../security/input-schemas.js';

export type LintIssueCode =
  | 'MISSING_ASSET_REFERENCE'
  | 'MISSING_ASSET_FILE'
  | 'DUPLICATE_ID'
  | 'INVALID_GAME_TARGET'
  | 'INVALID_JSON_SYNTAX'
  | 'COMPILATION_ERROR';

export interface LintIssue {
  readonly severity: 'error' | 'warning';
  readonly code: LintIssueCode;
  readonly message: string;
  readonly editId?: string;
}

export interface LintReport {
  readonly valid: boolean;
  readonly errors: readonly LintIssue[];
  readonly warnings: readonly LintIssue[];
}

export const DEFAULT_KNOWN_GAME_TARGETS: ReadonlySet<string> = new Set([
  'Data/Objects',
  'Data/Crops',
  'Data/Characters',
  'Data/CookingRecipes',
  'Data/CraftingRecipes',
  'Data/Locations',
  'Data/FarmAnimals',
  'Data/Weapons',
  'Data/Furniture',
  'Data/Fish',
  'Data/Shops',
  'Data/mail',
  'Data/NPCGiftTastes',
  'Maps/springobjects',
  'TileSheets/crops',
  'TileSheets/furniture',
  'TileSheets/weapons',
  'LooseSprites/Cursors',
]);

/**
 * Validates raw JSON syntax without throwing, returning a structured LintIssue on failure.
 */
export function validateJsonSyntax(rawJson: string): LintIssue | null {
  try {
    JSON.parse(rawJson);
    return null;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid JSON syntax.';
    return { severity: 'error', code: 'INVALID_JSON_SYNTAX', message };
  }
}

export function checkDuplicateIds(project: SdvProjectFile): readonly LintIssue[] {
  const issues: LintIssue[] = [];
  const seenEditIds = new Set<string>();
  const seenItemIds = new Set<string>();

  for (const edit of project.edits) {
    if (seenEditIds.has(edit.id)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_ID',
        message: `Duplicate edit ID "${edit.id}".`,
        editId: edit.id,
      });
    }
    seenEditIds.add(edit.id);

    if (edit.kind === 'object') {
      if (seenItemIds.has(edit.itemId)) {
        issues.push({
          severity: 'error',
          code: 'DUPLICATE_ID',
          message: `Duplicate object itemId "${edit.itemId}".`,
          editId: edit.id,
        });
      }
      seenItemIds.add(edit.itemId);
    }
  }
  return issues;
}

export function checkInMemoryAssetReferences(project: SdvProjectFile): readonly LintIssue[] {
  const issues: LintIssue[] = [];
  const assetIds = new Set(project.assets.map((asset) => asset.id));

  for (const edit of project.edits) {
    if (edit.kind === 'retexture' && !assetIds.has(edit.assetId)) {
      issues.push({
        severity: 'error',
        code: 'MISSING_ASSET_REFERENCE',
        message: `Edit "${edit.id}" references missing asset "${edit.assetId}".`,
        editId: edit.id,
      });
    }
  }
  return issues;
}

export function checkGameTargets(
  project: SdvProjectFile,
  knownTargets: ReadonlySet<string>,
): readonly LintIssue[] {
  const issues: LintIssue[] = [];
  for (const edit of project.edits) {
    if (edit.kind !== 'retexture') {
      continue;
    }
    try {
      validateWithSchema(GameTargetSchema, edit.target, 'Game target');
    } catch {
      issues.push({
        severity: 'error',
        code: 'INVALID_GAME_TARGET',
        message: `Invalid game target "${edit.target}".`,
        editId: edit.id,
      });
      continue;
    }
    const isKnown =
      knownTargets.has(edit.target) ||
      edit.target.startsWith('Characters/') ||
      edit.target.startsWith('Portraits/') ||
      edit.target.startsWith('Data/Events/') ||
      edit.target.startsWith('Mods/');
    if (!isKnown) {
      issues.push({
        severity: 'warning',
        code: 'INVALID_GAME_TARGET',
        message: `Unrecognized game target "${edit.target}". Verify it exists in Content/.`,
        editId: edit.id,
      });
    }
  }
  return issues;
}

/**
 * Browser-safe in-memory pre-build linter (runs without Node.js fs).
 */
export function lintProjectInMemory(
  project: SdvProjectFile,
  knownTargets: ReadonlySet<string> = DEFAULT_KNOWN_GAME_TARGETS,
): LintReport {
  const allIssues: LintIssue[] = [
    ...checkDuplicateIds(project),
    ...checkInMemoryAssetReferences(project),
    ...checkGameTargets(project, knownTargets),
  ];

  try {
    compileProjectToManifest(project);
    compileProjectToContentJson(project);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Mod compilation failed.';
    allIssues.push({ severity: 'error', code: 'COMPILATION_ERROR', message });
  }

  const errors = allIssues.filter((issue) => issue.severity === 'error');
  const warnings = allIssues.filter((issue) => issue.severity === 'warning');
  return { valid: errors.length === 0, errors, warnings };
}
