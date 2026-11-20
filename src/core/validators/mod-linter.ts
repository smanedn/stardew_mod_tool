import fs from 'node:fs/promises';
import type { SdvProjectFile } from '../../data/models/index.js';
import { compileProjectToContentJson, compileProjectToManifest } from '../engine/mod-compiler.js';
import { GameTargetSchema, resolvePathWithinRoot, validateWithSchema } from '../security/index.js';

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

export interface ProjectLintOptions {
  readonly projectDir: string;
  readonly knownTargets?: ReadonlySet<string>;
}

const DEFAULT_KNOWN_GAME_TARGETS: ReadonlySet<string> = new Set([
  'Data/Objects',
  'Data/Crops',
  'Data/Characters',
  'Data/CookingRecipes',
  'Data/CraftingRecipes',
  'Data/Locations',
  'Maps/springobjects',
  'TileSheets/crops',
  'LooseSprites/Cursors',
]);

async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

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

function checkDuplicateIds(project: SdvProjectFile): readonly LintIssue[] {
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

async function checkAssetReferences(
  project: SdvProjectFile,
  projectDir: string,
): Promise<readonly LintIssue[]> {
  const issues: LintIssue[] = [];
  const assetIds = new Set(project.assets.map((asset) => asset.id));

  for (const asset of project.assets) {
    try {
      const resolved = resolvePathWithinRoot(projectDir, asset.relativePath);
      if (!(await fileExistsAsync(resolved))) {
        issues.push({
          severity: 'error',
          code: 'MISSING_ASSET_FILE',
          message: `Linked asset file "${asset.relativePath}" does not exist on disk.`,
        });
      }
    } catch {
      issues.push({
        severity: 'error',
        code: 'MISSING_ASSET_FILE',
        message: `Linked asset path "${asset.relativePath}" is invalid.`,
      });
    }
  }

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

function checkGameTargets(
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
    if (!knownTargets.has(edit.target) && !edit.target.startsWith('Characters/')) {
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
 * Runs pre-build validation on a .sdvproj project prior to SMAPI export.
 */
export async function lintProjectBeforeBuild(
  project: SdvProjectFile,
  options: ProjectLintOptions,
): Promise<LintReport> {
  const knownTargets = options.knownTargets ?? DEFAULT_KNOWN_GAME_TARGETS;
  const allIssues: LintIssue[] = [
    ...checkDuplicateIds(project),
    ...(await checkAssetReferences(project, options.projectDir)),
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
