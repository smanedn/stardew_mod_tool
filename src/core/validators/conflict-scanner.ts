import type { AreaRect, SdvProjectFile } from '../../data/models/index.js';
import { compileProjectToContentJson } from '../engine/browser-compiler.js';
import { stripSmapiJsonFormatting } from '../engine/mod-importer.js';

export type ModConflictKind =
  | 'DUPLICATE_UNIQUE_ID'
  | 'COLLIDING_OBJECT_KEY'
  | 'OVERLAPPING_EDIT_IMAGE';

export interface ModConflictWarning {
  readonly kind: ModConflictKind;
  readonly otherModName: string;
  readonly otherUniqueId: string;
  readonly detail: string;
}

export interface InstalledModSnapshot {
  readonly folderName: string;
  readonly manifestJson: string;
  readonly contentJson?: string;
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rectsOverlap(a: AreaRect, b: AreaRect): boolean {
  return (
    a.X < b.X + b.Width &&
    a.X + a.Width > b.X &&
    a.Y < b.Y + b.Height &&
    a.Y + a.Height > b.Y
  );
}

function readAreaRect(raw: unknown): AreaRect | null {
  if (!isPlainRecord(raw)) {
    return null;
  }
  const x = raw['X'];
  const y = raw['Y'];
  const w = raw['Width'];
  const h = raw['Height'];
  if (
    typeof x === 'number' &&
    typeof y === 'number' &&
    typeof w === 'number' &&
    typeof h === 'number'
  ) {
    return { X: x, Y: y, Width: w, Height: h };
  }
  return null;
}

interface ParsedInstalledMod {
  readonly name: string;
  readonly uniqueId: string;
  readonly objectKeys: ReadonlySet<string>;
  readonly imagePatches: ReadonlyArray<{ readonly target: string; readonly toArea: AreaRect }>;
}

function parseInstalledModSnapshot(snap: InstalledModSnapshot): ParsedInstalledMod | null {
  try {
    const manifest: unknown = JSON.parse(stripSmapiJsonFormatting(snap.manifestJson));
    if (!isPlainRecord(manifest)) {
      return null;
    }
    const name = typeof manifest['Name'] === 'string' ? manifest['Name'] : snap.folderName;
    const uniqueId = typeof manifest['UniqueID'] === 'string' ? manifest['UniqueID'] : '';
    const objectKeys = new Set<string>();
    const imagePatches: Array<{ readonly target: string; readonly toArea: AreaRect }> = [];

    if (snap.contentJson !== undefined && snap.contentJson.trim().length > 0) {
      const content: unknown = JSON.parse(stripSmapiJsonFormatting(snap.contentJson));
      const changes =
        isPlainRecord(content) && Array.isArray(content['Changes']) ? content['Changes'] : [];
      for (const patch of changes) {
        if (!isPlainRecord(patch)) {
          continue;
        }
        const action = typeof patch['Action'] === 'string' ? patch['Action'].toLowerCase() : '';
        const target = typeof patch['Target'] === 'string' ? patch['Target'] : '';
        if (action === 'editdata' && target.toLowerCase() === 'data/objects') {
          const entries = patch['Entries'];
          if (isPlainRecord(entries)) {
            for (const key of Object.keys(entries)) {
              objectKeys.add(key);
            }
          }
        } else if (action === 'editimage') {
          const toArea = readAreaRect(patch['ToArea']);
          if (toArea !== null && target.length > 0) {
            imagePatches.push({ target: target.toLowerCase(), toArea });
          }
        }
      }
    }

    return { name, uniqueId, objectKeys, imagePatches };
  } catch {
    return null;
  }
}

function collectActiveModFootprint(project: SdvProjectFile): {
  readonly objectKeys: ReadonlySet<string>;
  readonly imagePatches: ReadonlyArray<{ readonly target: string; readonly toArea: AreaRect }>;
} {
  const doc = compileProjectToContentJson(project);
  const objectKeys = new Set<string>();
  const imagePatches: Array<{ readonly target: string; readonly toArea: AreaRect }> = [];

  for (const patch of doc.Changes) {
    if (patch.Action === 'EditData' && patch.Target.toLowerCase() === 'data/objects') {
      for (const key of Object.keys(patch.Entries ?? {})) {
        objectKeys.add(key);
      }
    } else if (patch.Action === 'EditImage' && patch.ToArea !== undefined) {
      imagePatches.push({ target: patch.Target.toLowerCase(), toArea: patch.ToArea });
    }
  }
  return { objectKeys, imagePatches };
}

function checkModPairConflicts(
  activeUniqueId: string,
  activeFootprint: ReturnType<typeof collectActiveModFootprint>,
  other: ParsedInstalledMod,
): readonly ModConflictWarning[] {
  const warnings: ModConflictWarning[] = [];
  if (
    other.uniqueId.length > 0 &&
    other.uniqueId.toLowerCase() === activeUniqueId.toLowerCase()
  ) {
    warnings.push({
      kind: 'DUPLICATE_UNIQUE_ID',
      otherModName: other.name,
      otherUniqueId: other.uniqueId,
      detail: `Another installed mod shares UniqueID "${other.uniqueId}".`,
    });
  }
  for (const key of activeFootprint.objectKeys) {
    if (other.objectKeys.has(key)) {
      warnings.push({
        kind: 'COLLIDING_OBJECT_KEY',
        otherModName: other.name,
        otherUniqueId: other.uniqueId,
        detail: `Colliding Data/Objects key "${key}" also edited by "${other.name}".`,
      });
    }
  }
  for (const mine of activeFootprint.imagePatches) {
    for (const theirs of other.imagePatches) {
      if (mine.target === theirs.target && rectsOverlap(mine.toArea, theirs.toArea)) {
        warnings.push({
          kind: 'OVERLAPPING_EDIT_IMAGE',
          otherModName: other.name,
          otherUniqueId: other.uniqueId,
          detail: `Overlapping EditImage on "${mine.target}" with "${other.name}".`,
        });
      }
    }
  }
  return warnings;
}

/**
 * Scans installed Mods/ snapshots against the active project for UniqueID,
 * Data/Objects key, and EditImage ToArea conflicts.
 */
export function scanModConflicts(
  project: SdvProjectFile,
  installedMods: readonly InstalledModSnapshot[],
): readonly ModConflictWarning[] {
  const footprint = collectActiveModFootprint(project);
  const warnings: ModConflictWarning[] = [];

  for (const snap of installedMods) {
    const parsed = parseInstalledModSnapshot(snap);
    if (parsed !== null) {
      warnings.push(...checkModPairConflicts(project.metadata.uniqueId, footprint, parsed));
    }
  }
  return warnings;
}
