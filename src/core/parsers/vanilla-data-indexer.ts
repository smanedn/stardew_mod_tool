import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type {
  VanillaCropEntry,
  VanillaDatabaseDump,
  VanillaLocationEntry,
  VanillaNpcEntry,
  VanillaObjectEntry,
  VanillaRecipeEntry,
} from '../../data/models/index.js';
import { GameDataIndex, readJsonFileAsync } from '../performance/index.js';

export interface VanillaDatabase {
  readonly gameVersion: string;
  readonly objects: GameDataIndex<VanillaObjectEntry>;
  readonly crops: GameDataIndex<VanillaCropEntry>;
  readonly npcs: GameDataIndex<VanillaNpcEntry>;
  readonly recipes: GameDataIndex<VanillaRecipeEntry>;
  readonly locations: GameDataIndex<VanillaLocationEntry>;
}

export const VanillaDatabaseDumpSchema: z.ZodType<VanillaDatabaseDump> = z
  .object({
    gameVersion: z.string().min(1),
    objects: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        displayName: z.string(),
        category: z.number().int(),
        price: z.number().int(),
      }),
    ),
    crops: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        harvestItemId: z.string(),
        seasons: z.array(z.string()),
        daysInPhase: z.array(z.number().int()),
      }),
    ),
    npcs: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        displayName: z.string(),
        homeRegion: z.string(),
        canRomance: z.boolean(),
      }),
    ),
    recipes: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        kind: z.enum(['cooking', 'crafting']),
        outputItemId: z.string(),
        ingredients: z.record(z.string(), z.number().int()),
      }),
    ),
    locations: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string(),
        displayName: z.string(),
      }),
    ),
  })
  .strict();

/**
 * Indexes a pre-parsed Stardew Valley 1.6+ dump into O(1) in-memory Hash Maps.
 */
export function indexVanillaDump(dump: VanillaDatabaseDump): VanillaDatabase {
  return {
    gameVersion: dump.gameVersion,
    objects: new GameDataIndex(dump.objects),
    crops: new GameDataIndex(dump.crops),
    npcs: new GameDataIndex(dump.npcs),
    recipes: new GameDataIndex(dump.recipes),
    locations: new GameDataIndex(dump.locations),
  };
}

/**
 * Asynchronously reads and indexes a pre-indexed Stardew Valley 1.6+ JSON dump file.
 */
export async function loadVanillaDatabaseFromDumpFile(
  filePath: string,
  allowedRoots?: readonly string[],
): Promise<VanillaDatabase> {
  const dump = await readJsonFileAsync(filePath, VanillaDatabaseDumpSchema, allowedRoots);
  return indexVanillaDump(dump);
}

async function readOptionalJsonRecord(
  filePath: string,
): Promise<Readonly<Record<string, unknown>>> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw.replace(/^\uFEFF/, ''));
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed));
    }
    return {};
  } catch {
    return {};
  }
}

function readStr(record: unknown, key: string, fallback = ''): string {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    return fallback;
  }
  const desc = Object.getOwnPropertyDescriptor(record, key);
  return typeof desc?.value === 'string' ? desc.value : fallback;
}

function readNum(record: unknown, key: string, fallback = 0): number {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    return fallback;
  }
  const desc = Object.getOwnPropertyDescriptor(record, key);
  return typeof desc?.value === 'number' ? desc.value : fallback;
}

function extractObjects(raw: Readonly<Record<string, unknown>>): readonly VanillaObjectEntry[] {
  return Object.entries(raw).map(([id, value]) => ({
    id,
    name: readStr(value, 'Name', id),
    displayName: readStr(value, 'DisplayName', readStr(value, 'Name', id)),
    category: readNum(value, 'Category', 0),
    price: readNum(value, 'Price', 0),
  }));
}

function extractLocations(
  raw: Readonly<Record<string, unknown>>,
): readonly VanillaLocationEntry[] {
  return Object.entries(raw).map(([id, value]) => ({
    id,
    name: id,
    displayName: readStr(value, 'DisplayName', id),
  }));
}

function extractNpcs(raw: Readonly<Record<string, unknown>>): readonly VanillaNpcEntry[] {
  return Object.entries(raw).map(([id, value]) => {
    const desc =
      typeof value === 'object' && value !== null
        ? Object.getOwnPropertyDescriptor(value, 'CanSocialize')
        : undefined;
    return {
      id,
      name: id,
      displayName: readStr(value, 'DisplayName', id),
      homeRegion: readStr(value, 'HomeRegion', 'Town'),
      canRomance: desc?.value === true,
    };
  });
}

function extractRecipes(
  raw: Readonly<Record<string, unknown>>,
  kind: 'cooking' | 'crafting',
): readonly VanillaRecipeEntry[] {
  return Object.entries(raw).map(([id, value]) => {
    const rawStr = typeof value === 'string' ? value : '';
    const segments = rawStr.split('/');
    const outputItemId = (segments[2] ?? '').split(' ')[0] ?? '';
    return { id, name: id, kind, outputItemId, ingredients: {} };
  });
}

/**
 * Extracts and indexes vanilla 1.6+ data directly from a Content/Data JSON folder.
 */
export async function extractVanillaDatabaseFromContentDir(
  contentDataDir: string,
  gameVersion = '1.6+',
): Promise<VanillaDatabase> {
  const [objectsRaw, npcsRaw, cookingRaw, craftingRaw, locationsRaw] = await Promise.all([
    readOptionalJsonRecord(path.join(contentDataDir, 'Objects.json')),
    readOptionalJsonRecord(path.join(contentDataDir, 'Characters.json')),
    readOptionalJsonRecord(path.join(contentDataDir, 'CookingRecipes.json')),
    readOptionalJsonRecord(path.join(contentDataDir, 'CraftingRecipes.json')),
    readOptionalJsonRecord(path.join(contentDataDir, 'Locations.json')),
  ]);

  return indexVanillaDump({
    gameVersion,
    objects: extractObjects(objectsRaw),
    crops: [],
    npcs: extractNpcs(npcsRaw),
    recipes: [
      ...extractRecipes(cookingRaw, 'cooking'),
      ...extractRecipes(craftingRaw, 'crafting'),
    ],
    locations: extractLocations(locationsRaw),
  });
}
