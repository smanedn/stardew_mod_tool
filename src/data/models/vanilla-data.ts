import type { IndexableGameEntry } from '../../core/performance/index.js';

/**
 * Indexed vanilla object entry from Stardew Valley 1.6+ Data/Objects.
 */
export interface VanillaObjectEntry extends IndexableGameEntry {
  readonly displayName: string;
  readonly category: number;
  readonly price: number;
}

/**
 * Indexed vanilla crop entry from Stardew Valley 1.6+ Data/Crops.
 */
export interface VanillaCropEntry extends IndexableGameEntry {
  readonly harvestItemId: string;
  readonly seasons: readonly string[];
  readonly daysInPhase: readonly number[];
}

/**
 * Indexed vanilla NPC entry from Stardew Valley 1.6+ Data/Characters.
 */
export interface VanillaNpcEntry extends IndexableGameEntry {
  readonly displayName: string;
  readonly homeRegion: string;
  readonly canRomance: boolean;
}

/**
 * Indexed vanilla cooking or crafting recipe entry.
 */
export interface VanillaRecipeEntry extends IndexableGameEntry {
  readonly kind: 'cooking' | 'crafting';
  readonly outputItemId: string;
  readonly ingredients: Readonly<Record<string, number>>;
}

/**
 * Indexed vanilla location entry from Stardew Valley 1.6+ Data/Locations.
 */
export interface VanillaLocationEntry extends IndexableGameEntry {
  readonly displayName: string;
}

/**
 * Pre-indexed JSON dump of Stardew Valley 1.6+ vanilla data.
 */
export interface VanillaDatabaseDump {
  readonly gameVersion: string;
  readonly objects: readonly VanillaObjectEntry[];
  readonly crops: readonly VanillaCropEntry[];
  readonly npcs: readonly VanillaNpcEntry[];
  readonly recipes: readonly VanillaRecipeEntry[];
  readonly locations: readonly VanillaLocationEntry[];
}
