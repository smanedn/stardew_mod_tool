import {
  type CropEditEntry,
  type DialogueEditEntry,
  type ObjectEditEntry,
  type SdvProjectEdit,
  type SdvProjectFile,
} from '../../data/models/index.js';
import { extractZipEntries } from './browser-zip.js';
import { importManifestJsonToProject } from './project-templates.js';

export interface ModImportSummary {
  readonly itemsCount: number;
  readonly cropsCount: number;
  readonly dialoguesCount: number;
  readonly totalPatchesRead: number;
  readonly skippedPatches: number;
}

export interface ModImportResult {
  readonly project: SdvProjectFile;
  readonly summary: ModImportSummary;
}

const VALID_SEASONS = new Map<string, CropEditEntry['seasons'][number]>([
  ['spring', 'Spring'],
  ['summer', 'Summer'],
  ['fall', 'Fall'],
  ['winter', 'Winter'],
]);

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function skipComment(input: string, index: number): number {
  const ch = input[index] ?? '';
  const next = input[index + 1] ?? '';
  if (ch === '/' && next === '/') {
    let i = index;
    while (i < input.length && input[i] !== '\n') {
      i += 1;
    }
    return i - 1;
  }
  if (ch === '/' && next === '*') {
    let i = index + 2;
    while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) {
      i += 1;
    }
    return i + 1;
  }
  return -1;
}

/**
 * Strips UTF-8 BOM, // and /* *\/ comments, and trailing commas from SMAPI JSON files.
 */
export function stripSmapiJsonFormatting(raw: string): string {
  const input = raw.replace(/^\uFEFF/, '');
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] ?? '';
    if (inString) {
      out += ch;
      escaped = !escaped && ch === '\\';
      if (!escaped && ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    const skippedTo = skipComment(input, i);
    if (skippedTo >= 0) {
      i = skippedTo;
      continue;
    }
    out += ch;
  }

  return stripTrailingCommas(out);
}

function stripTrailingCommas(jsonText: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonText.length; i += 1) {
    const ch = jsonText[i] ?? '';
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ',') {
      let j = i + 1;
      while (j < jsonText.length && /\s/.test(jsonText[j] ?? '')) {
        j += 1;
      }
      if (jsonText[j] === '}' || jsonText[j] === ']') {
        continue;
      }
    }
    out += ch;
  }

  return out;
}

function readStringField(
  record: Readonly<Record<string, unknown>>,
  key: string,
  fallback: string,
): string {
  const val = record[key];
  return typeof val === 'string' ? val : fallback;
}

function readNumberField(
  record: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number,
): number {
  const val = record[key];
  return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
}

function extractBuff(rawEntry: Readonly<Record<string, unknown>>): ObjectEditEntry['buff'] {
  const buffs = rawEntry['Buffs'];
  if (!Array.isArray(buffs) || buffs.length === 0 || !isPlainRecord(buffs[0])) {
    return undefined;
  }
  const firstBuff = buffs[0];
  const attrs = isPlainRecord(firstBuff['CustomAttributes'])
    ? firstBuff['CustomAttributes']
    : undefined;
  if (attrs === undefined) {
    return undefined;
  }
  return {
    speed: readNumberField(attrs, 'Speed', 0),
    luck: readNumberField(attrs, 'LuckLevel', 0),
    farming: readNumberField(attrs, 'FarmingLevel', 0),
    mining: readNumberField(attrs, 'MiningLevel', 0),
    durationSeconds: readNumberField(firstBuff, 'Duration', 120),
  };
}

function extractObjectEdits(
  entries: Readonly<Record<string, unknown>>,
  nextId: () => string,
): readonly ObjectEditEntry[] {
  const results: ObjectEditEntry[] = [];
  for (const [itemId, raw] of Object.entries(entries)) {
    if (!isPlainRecord(raw)) {
      continue;
    }
    const buff = extractBuff(raw);
    results.push({
      kind: 'object',
      id: nextId(),
      itemId,
      displayName: readStringField(raw, 'DisplayName', readStringField(raw, 'Name', itemId)),
      description: readStringField(raw, 'Description', ''),
      price: readNumberField(raw, 'Price', 0),
      edibility: readNumberField(raw, 'Edibility', -300),
      category: readNumberField(raw, 'Category', 0),
      ...(buff !== undefined ? { buff } : {}),
    });
  }
  return results;
}

function extractCropEdits(
  entries: Readonly<Record<string, unknown>>,
  nextId: () => string,
): readonly CropEditEntry[] {
  const results: CropEditEntry[] = [];
  for (const [seedItemId, raw] of Object.entries(entries)) {
    if (!isPlainRecord(raw)) {
      continue;
    }
    const rawSeasons = Array.isArray(raw['Seasons']) ? raw['Seasons'] : [];
    const seasons = rawSeasons
      .map((s) => (typeof s === 'string' ? VALID_SEASONS.get(s.toLowerCase()) : undefined))
      .filter((s): s is CropEditEntry['seasons'][number] => s !== undefined);

    const rawPhases = Array.isArray(raw['DaysInPhase']) ? raw['DaysInPhase'] : [];
    const daysInPhase = rawPhases.filter(
      (n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0,
    );

    results.push({
      kind: 'crop',
      id: nextId(),
      seedItemId,
      harvestItemId: readStringField(raw, 'HarvestItemId', seedItemId),
      seasons: seasons.length > 0 ? seasons : ['Spring'],
      daysInPhase: daysInPhase.length > 0 ? daysInPhase : [1, 2, 2, 2],
    });
  }
  return results;
}

function extractWhenRecord(rawWhen: unknown): Readonly<Record<string, string>> | undefined {
  if (!isPlainRecord(rawWhen)) {
    return undefined;
  }
  const pairs: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(rawWhen)) {
    if (typeof v === 'string') {
      pairs.push([k, v]);
    }
  }
  return pairs.length > 0 ? Object.fromEntries(pairs) : undefined;
}

function extractDialogueEdits(
  npcName: string,
  entries: Readonly<Record<string, unknown>>,
  whenRecord: Readonly<Record<string, string>> | undefined,
  nextId: () => string,
): readonly DialogueEditEntry[] {
  const results: DialogueEditEntry[] = [];
  for (const [dialogueKey, text] of Object.entries(entries)) {
    if (typeof text !== 'string') {
      continue;
    }
    results.push({
      kind: 'dialogue',
      id: nextId(),
      npcName,
      dialogueKey,
      text,
      ...(whenRecord !== undefined ? { when: whenRecord } : {}),
    });
  }
  return results;
}

interface MutableImportAccumulator {
  readonly edits: SdvProjectEdit[];
  itemsCount: number;
  cropsCount: number;
  dialoguesCount: number;
  totalPatchesRead: number;
  skippedPatches: number;
  editSeq: number;
}

function processContentPatch(
  patch: Readonly<Record<string, unknown>>,
  acc: MutableImportAccumulator,
): void {
  const nextId = (): string => `imported-edit-${String(acc.editSeq++)}`;
  acc.totalPatchesRead += 1;
  const action = readStringField(patch, 'Action', '');
  const target = readStringField(patch, 'Target', '');
  const entries = patch['Entries'];

  if (action.toLowerCase() !== 'editdata' || !isPlainRecord(entries)) {
    acc.skippedPatches += 1;
    return;
  }

  const lowerTarget = target.toLowerCase();
  if (lowerTarget === 'data/objects') {
    const extracted = extractObjectEdits(entries, nextId);
    acc.edits.push(...extracted);
    acc.itemsCount += extracted.length;
  } else if (lowerTarget === 'data/crops') {
    const extracted = extractCropEdits(entries, nextId);
    acc.edits.push(...extracted);
    acc.cropsCount += extracted.length;
  } else if (lowerTarget.startsWith('characters/dialogue/')) {
    const npcName = target.slice('Characters/Dialogue/'.length).trim();
    if (npcName.length === 0) {
      acc.skippedPatches += 1;
      return;
    }
    const extracted = extractDialogueEdits(
      npcName,
      entries,
      extractWhenRecord(patch['When']),
      nextId,
    );
    acc.edits.push(...extracted);
    acc.dialoguesCount += extracted.length;
  } else {
    acc.skippedPatches += 1;
  }
}

/**
 * Imports manifest.json and optional content.json from an existing Content Patcher mod
 * into an editable .sdvproj project with items, crops, and dialogues populated.
 */
export function importContentPatcherMod(input: {
  readonly manifestJson: string;
  readonly contentJson?: string;
}): ModImportResult {
  const baseProject = importManifestJsonToProject(stripSmapiJsonFormatting(input.manifestJson));
  const acc: MutableImportAccumulator = {
    edits: [],
    itemsCount: 0,
    cropsCount: 0,
    dialoguesCount: 0,
    totalPatchesRead: 0,
    skippedPatches: 0,
    editSeq: 1,
  };

  if (input.contentJson !== undefined && input.contentJson.trim().length > 0) {
    const parsedContent: unknown = JSON.parse(stripSmapiJsonFormatting(input.contentJson));
    const changes =
      isPlainRecord(parsedContent) && Array.isArray(parsedContent['Changes'])
        ? parsedContent['Changes']
        : [];
    for (const patch of changes) {
      if (isPlainRecord(patch)) {
        processContentPatch(patch, acc);
      }
    }
  }

  return {
    project: { ...baseProject, edits: acc.edits },
    summary: {
      itemsCount: acc.itemsCount,
      cropsCount: acc.cropsCount,
      dialoguesCount: acc.dialoguesCount,
      totalPatchesRead: acc.totalPatchesRead,
      skippedPatches: acc.skippedPatches,
    },
  };
}

function getFileName(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(idx + 1) : path;
}

function getDirName(path: string): string {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(0, idx) : '';
}

/**
 * Unpacks a Content Patcher mod .zip archive and imports its manifest.json + content.json.
 */
export async function importModFromZipBytes(zipBytes: Uint8Array): Promise<ModImportResult> {
  const entries = await extractZipEntries(zipBytes);
  const manifestCandidates = entries
    .filter((e) => getFileName(e.path).toLowerCase() === 'manifest.json')
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length);

  const manifestEntry = manifestCandidates[0];
  if (manifestEntry === undefined) {
    throw new Error('No manifest.json found inside the .zip archive.');
  }

  const rootDir = getDirName(manifestEntry.path);
  const contentEntry =
    entries.find(
      (e) =>
        getDirName(e.path) === rootDir && getFileName(e.path).toLowerCase() === 'content.json',
    ) ??
    entries
      .filter((e) => getFileName(e.path).toLowerCase() === 'content.json')
      .sort((a, b) => a.path.split('/').length - b.path.split('/').length)[0];

  const decoder = new TextDecoder();
  const manifestJson = decoder.decode(manifestEntry.data);
  const contentJson = contentEntry !== undefined ? decoder.decode(contentEntry.data) : undefined;

  return importContentPatcherMod({ manifestJson, contentJson });
}
