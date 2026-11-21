import fs from 'node:fs/promises';
import type { SdvProjectFile } from '../../data/models/index.js';
import { compileProjectToContentJson, compileProjectToManifest } from '../engine/mod-compiler.js';
import { resolvePathWithinRoot } from '../security/index.js';
import {
  DEFAULT_KNOWN_GAME_TARGETS,
  type LintIssue,
  type LintReport,
  checkDuplicateIds,
  checkGameTargets,
  checkInMemoryAssetReferences,
} from './project-linter.js';

export * from './project-linter.js';

export interface ProjectLintOptions {
  readonly projectDir: string;
  readonly knownTargets?: ReadonlySet<string>;
}

async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function checkDiskAssetFiles(
  project: SdvProjectFile,
  projectDir: string,
): Promise<readonly LintIssue[]> {
  const issues: LintIssue[] = [];
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
  return issues;
}

/**
 * Runs pre-build validation on a .sdvproj project prior to SMAPI export (including disk checks).
 */
export async function lintProjectBeforeBuild(
  project: SdvProjectFile,
  options: ProjectLintOptions,
): Promise<LintReport> {
  const knownTargets = options.knownTargets ?? DEFAULT_KNOWN_GAME_TARGETS;
  const allIssues: LintIssue[] = [
    ...checkDuplicateIds(project),
    ...(await checkDiskAssetFiles(project, options.projectDir)),
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
