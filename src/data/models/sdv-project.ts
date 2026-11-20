import type { AreaRect, PatchConditions } from './content-patch.js';

export const SDVPROJ_FORMAT_VERSION = 1;

/**
 * Project metadata mapped to SMAPI manifest.json during compilation.
 */
export interface SdvProjectMetadata {
  readonly name: string;
  readonly author: string;
  readonly version: string;
  readonly description: string;
  readonly uniqueId: string;
  readonly updateKeys?: readonly string[];
}

/**
 * Linked static asset inside the project's assets/ folder.
 */
export interface LinkedAssetEntry {
  readonly id: string;
  readonly relativePath: string;
  readonly kind: 'png' | 'tmx' | 'xnb';
}

export interface ObjectRecipeConfig {
  readonly kind: 'cooking' | 'crafting';
  readonly ingredients: Readonly<Record<string, number>>;
}

export interface ObjectEditEntry {
  readonly kind: 'object';
  readonly id: string;
  readonly itemId: string;
  readonly displayName: string;
  readonly description: string;
  readonly price: number;
  readonly edibility: number;
  readonly category: number;
  readonly assetId?: string;
  readonly recipe?: ObjectRecipeConfig;
}

export interface CropEditEntry {
  readonly kind: 'crop';
  readonly id: string;
  readonly seedItemId: string;
  readonly harvestItemId: string;
  readonly seasons: readonly string[];
  readonly daysInPhase: readonly number[];
  readonly assetId?: string;
}

export interface RetextureEditEntry {
  readonly kind: 'retexture';
  readonly id: string;
  readonly target: string;
  readonly assetId: string;
  readonly fromArea?: AreaRect;
  readonly toArea?: AreaRect;
  readonly when?: PatchConditions;
}

export interface DialogueEditEntry {
  readonly kind: 'dialogue';
  readonly id: string;
  readonly npcName: string;
  readonly dialogueKey: string;
  readonly text: string;
  readonly when?: PatchConditions;
}

export type SdvProjectEdit =
  | ObjectEditEntry
  | CropEditEntry
  | RetextureEditEntry
  | DialogueEditEntry;

export interface ProjectConfigOption {
  readonly id: string;
  readonly key: string;
  readonly optionType: 'toggle' | 'choice' | 'number';
  readonly defaultValue: string;
  readonly allowValues?: string;
  readonly description?: string;
  readonly section?: string;
}

/**
 * Human-readable .sdvproj project file structure storing work state prior to SMAPI compilation.
 */
export interface SdvProjectFile {
  readonly formatVersion: number;
  readonly updatedAt: string;
  readonly metadata: SdvProjectMetadata;
  readonly assets: readonly LinkedAssetEntry[];
  readonly edits: readonly SdvProjectEdit[];
  readonly configOptions?: readonly ProjectConfigOption[];
}
