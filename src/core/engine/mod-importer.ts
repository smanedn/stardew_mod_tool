import {
  type CropEditEntry,
  type DialogueEditEntry,
  type FishBehaviorId,
  type FishEditEntry,
  type FishWeatherId,
  type FurnitureEditEntry,
  type FurnitureTileSize,
  type FurnitureTypeId,
  type LinkedAssetEntry,
  type ObjectEditEntry,
  type SdvProjectEdit,
  type SdvProjectFile,
} from '../../data/models/index.js';
import { type BrowserZipEntry, extractZipEntries } from './browser-zip.js';
import { importManifestJsonToProject } from './project-templates.js';

export interface ModImportSummary {
  readonly itemsCount: number;
  readonly cropsCount: number;
  readonly dialoguesCount: number;
  readonly furnitureCount: number;
  readonly fishCount: number;
  readonly assetsCount: number;
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

function parseFurnitureTileSize(dims: string | undefined): FurnitureTileSize {
  if (dims === '2 1') {
    return '2x1';
  }
  if (dims === '2 2') {
    return '2x2';
  }
  return '1x1';
}

function parseFurnitureType(raw: string | undefined): FurnitureTypeId {
  if (raw === 'table' || raw === 'rug' || raw === 'lamp' || raw === 'painting') {
    return raw;
  }
  return 'chair';
}

function extractFurnitureEdits(
  entries: Readonly<Record<string, unknown>>,
  nextId: () => string,
): readonly FurnitureEditEntry[] {
  const results: FurnitureEditEntry[] = [];
  for (const [furnitureId, raw] of Object.entries(entries)) {
    if (typeof raw !== 'string') {
      continue;
    }
    const parts = raw.split('/');
    const parsedPrice = Number.parseInt(parts[5] ?? '100', 10);
    results.push({
      kind: 'furniture',
      id: nextId(),
      furnitureId,
      displayName: parts[0] ?? furnitureId,
      furnitureType: parseFurnitureType(parts[1]),
      tileSize: parseFurnitureTileSize(parts[2]),
      price: Number.isNaN(parsedPrice) ? 100 : Math.max(0, parsedPrice),
    });
  }
  return results;
}

function parseFishBehavior(raw: string | undefined): FishBehaviorId {
  return raw === 'dart' || raw === 'sinker' || raw === 'floater' ? raw : 'smooth';
}

function parseFishWeather(raw: string | undefined): FishWeatherId {
  return raw === 'sunny' || raw === 'rainy' ? raw : 'both';
}

function extractFishEdits(
  entries: Readonly<Record<string, unknown>>,
  nextId: () => string,
): readonly FishEditEntry[] {
  const results: FishEditEntry[] = [];
  for (const [fishId, raw] of Object.entries(entries)) {
    if (typeof raw !== 'string') {
      continue;
    }
    const parts = raw.split('/');
    const seasons = (parts[6] ?? 'spring')
      .split(/\s+/)
      .map((s) => VALID_SEASONS.get(s.toLowerCase()))
      .filter((s): s is CropEditEntry['seasons'][number] => s !== undefined);
    results.push({
      kind: 'fish',
      id: nextId(),
      fishId,
      displayName: parts[0] ?? fishId,
      difficulty: Math.min(110, Math.max(5, Number.parseInt(parts[1] ?? '45', 10) || 45)),
      behavior: parseFishBehavior(parts[2]),
      minSize: Math.max(1, Number.parseInt(parts[3] ?? '8', 10) || 8),
      maxSize: Math.max(1, Number.parseInt(parts[4] ?? '24', 10) || 24),
      seasons: seasons.length > 0 ? seasons : ['Spring'],
      weather: parseFishWeather(parts[7]),
      waterLocation: 'River',
      price: 100,
    });
  }
  return results;
}

interface MutableImportAccumulator {
  readonly edits: SdvProjectEdit[];
  itemsCount: number;
  cropsCount: number;
  dialoguesCount: number;
  furnitureCount: number;
  fishCount: number;
  totalPatchesRead: number;
  skippedPatches: number;
  editSeq: number;
}

function dispatchEditDataPatch(
  target: string,
  entries: Readonly<Record<string, unknown>>,
  patch: Readonly<Record<string, unknown>>,
  acc: MutableImportAccumulator,
): void {
  const nextId = (): string => `imported-edit-${String(acc.editSeq++)}`;
  const lower = target.toLowerCase();
  if (lower === 'data/objects') {
    const res = extractObjectEdits(entries, nextId);
    acc.edits.push(...res);
    acc.itemsCount += res.length;
  } else if (lower === 'data/crops') {
    const res = extractCropEdits(entries, nextId);
    acc.edits.push(...res);
    acc.cropsCount += res.length;
  } else if (lower === 'data/furniture') {
    const res = extractFurnitureEdits(entries, nextId);
    acc.edits.push(...res);
    acc.furnitureCount += res.length;
  } else if (lower === 'data/fish') {
    const res = extractFishEdits(entries, nextId);
    acc.edits.push(...res);
    acc.fishCount += res.length;
  } else if (lower.startsWith('characters/dialogue/')) {
    const npcName = target.slice('Characters/Dialogue/'.length).trim();
    if (npcName.length === 0) {
      acc.skippedPatches += 1;
      return;
    }
    const res = extractDialogueEdits(npcName, entries, extractWhenRecord(patch['When']), nextId);
    acc.edits.push(...res);
    acc.dialoguesCount += res.length;
  } else {
    acc.skippedPatches += 1;
  }
}

function processContentPatch(
  patch: Readonly<Record<string, unknown>>,
  acc: MutableImportAccumulator,
): void {
  acc.totalPatchesRead += 1;
  const action = readStringField(patch, 'Action', '');
  const target = readStringField(patch, 'Target', '');
  const entries = patch['Entries'];

  if (action.toLowerCase() !== 'editdata' || !isPlainRecord(entries)) {
    acc.skippedPatches += 1;
    return;
  }
  dispatchEditDataPatch(target, entries, patch, acc);
}

function createImportAccumulator(): MutableImportAccumulator {
  return {
    edits: [],
    itemsCount: 0,
    cropsCount: 0,
    dialoguesCount: 0,
    furnitureCount: 0,
    fishCount: 0,
    totalPatchesRead: 0,
    skippedPatches: 0,
    editSeq: 1,
  };
}

/**
 * Imports manifest.json and optional content.json from an existing Content Patcher mod
 * into an editable .sdvproj project with items, crops, dialogues, furniture, and fish.
 */
export function importContentPatcherMod(input: {
  readonly manifestJson: string;
  readonly contentJson?: string;
}): ModImportResult {
  const baseProject = importManifestJsonToProject(stripSmapiJsonFormatting(input.manifestJson));
  const acc = createImportAccumulator();

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
      furnitureCount: acc.furnitureCount,
      fishCount: acc.fishCount,
      assetsCount: 0,
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

function encodeBytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function extractPngAssetsFromZip(
  entries: readonly BrowserZipEntry[],
  rootDir: string,
): readonly LinkedAssetEntry[] {
  const prefix = rootDir.length > 0 ? `${rootDir}/` : '';
  const assets: LinkedAssetEntry[] = [];
  let seq = 1;
  for (const entry of entries) {
    if (!entry.path.toLowerCase().endsWith('.png')) {
      continue;
    }
    const relPath =
      prefix.length > 0 && entry.path.startsWith(prefix)
        ? entry.path.slice(prefix.length)
        : entry.path;
    assets.push({
      id: `imported-asset-${String(seq++)}`,
      relativePath: relPath,
      kind: 'png',
      dataBase64: encodeBytesToBase64(entry.data),
    });
  }
  return assets;
}

/**
 * Unpacks a Content Patcher mod .zip archive and imports manifest.json, content.json, and PNGs.
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
  const assets = extractPngAssetsFromZip(entries, rootDir);
  const imported = importContentPatcherMod({ manifestJson, contentJson });

  return {
    project: { ...imported.project, assets },
    summary: { ...imported.summary, assetsCount: assets.length },
  };
}
