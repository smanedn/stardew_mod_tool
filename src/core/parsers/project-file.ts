import {
  SDVPROJ_FORMAT_VERSION,
  type SdvProjectFile,
  type SdvProjectMetadata,
} from '../../data/models/index.js';
import { readJsonFileAsync, writeJsonFileAsync } from '../performance/index.js';
import { type BackupSnapshotResult, validateWithSchema } from '../security/index.js';
import { SdvProjectMetadataSchema, SdvProjectSchema } from './project-schema.js';

export * from './project-schema.js';

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
