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
  readonly dataBase64?: string;
}

export interface ObjectRecipeConfig {
  readonly kind: 'cooking' | 'crafting';
  readonly ingredients: Readonly<Record<string, number>>;
}

export interface ObjectBuffConfig {
  readonly speed?: number;
  readonly luck?: number;
  readonly farming?: number;
  readonly mining?: number;
  readonly durationSeconds?: number;
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
  readonly buff?: ObjectBuffConfig;
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

export type GiftTasteLevel = 'Love' | 'Like' | 'Dislike' | 'Hate';

export interface GiftTasteEditEntry {
  readonly kind: 'giftTaste';
  readonly id: string;
  readonly npcName: string;
  readonly taste: GiftTasteLevel;
  readonly itemId: string;
}

export type VanillaShopId = 'SeedShop' | 'Saloon' | 'Joja' | 'ShadowShop';

export interface ShopEditEntry {
  readonly kind: 'shop';
  readonly id: string;
  readonly shopId: VanillaShopId;
  readonly itemId: string;
  readonly price: number;
}

export interface MailEditEntry {
  readonly kind: 'mail';
  readonly id: string;
  readonly mailId: string;
  readonly title: string;
  readonly body: string;
  readonly attachmentItemId?: string;
}

export type EventLocationId = 'Town' | 'Farm' | 'Saloon' | 'Beach';

export interface EventTilePos {
  readonly x: number;
  readonly y: number;
}

export type EventTimelineStep =
  | {
      readonly id: string;
      readonly kind: 'walk';
      readonly actor: 'farmer' | 'npc';
      readonly dx: number;
      readonly dy: number;
      readonly facing: 0 | 1 | 2 | 3;
    }
  | {
      readonly id: string;
      readonly kind: 'emote';
      readonly actor: 'farmer' | 'npc';
      readonly emoteId: number;
    }
  | {
      readonly id: string;
      readonly kind: 'pause';
      readonly durationMs: number;
    }
  | {
      readonly id: string;
      readonly kind: 'speak';
      readonly text: string;
    };

export interface EventEditEntry {
  readonly kind: 'event';
  readonly id: string;
  readonly location: EventLocationId;
  readonly eventId: string;
  readonly npcName: string;
  readonly dialogueText: string;
  readonly minHearts: number;
  readonly farmerPos?: EventTilePos;
  readonly npcPos?: EventTilePos;
  readonly steps?: readonly EventTimelineStep[];
}

export type AnimalHouseType = 'Coop' | 'Barn';

export interface AnimalEditEntry {
  readonly kind: 'animal';
  readonly id: string;
  readonly animalId: string;
  readonly displayName: string;
  readonly house: AnimalHouseType;
  readonly purchasePrice: number;
  readonly daysToMature: number;
  readonly produceItemId: string;
}

export type WeaponTypeId = 'Sword' | 'Dagger' | 'Club';

export interface WeaponEditEntry {
  readonly kind: 'weapon';
  readonly id: string;
  readonly weaponId: string;
  readonly displayName: string;
  readonly description: string;
  readonly weaponType: WeaponTypeId;
  readonly minDamage: number;
  readonly maxDamage: number;
  readonly critChance: number;
  readonly speed: number;
  readonly defense: number;
  readonly assetId?: string;
}

export type FurnitureTypeId = 'chair' | 'table' | 'rug' | 'lamp' | 'painting';
export type FurnitureTileSize = '1x1' | '2x1' | '2x2';

export interface FurnitureEditEntry {
  readonly kind: 'furniture';
  readonly id: string;
  readonly furnitureId: string;
  readonly displayName: string;
  readonly furnitureType: FurnitureTypeId;
  readonly tileSize: FurnitureTileSize;
  readonly price: number;
  readonly assetId?: string;
}

export type FishBehaviorId = 'smooth' | 'dart' | 'sinker' | 'floater';
export type FishWeatherId = 'sunny' | 'rainy' | 'both';
export type FishLocationId = 'River' | 'Ocean' | 'Lake';

export interface FishEditEntry {
  readonly kind: 'fish';
  readonly id: string;
  readonly fishId: string;
  readonly displayName: string;
  readonly minSize: number;
  readonly maxSize: number;
  readonly difficulty: number;
  readonly behavior: FishBehaviorId;
  readonly seasons: readonly string[];
  readonly weather: FishWeatherId;
  readonly waterLocation: FishLocationId;
  readonly price: number;
  readonly assetId?: string;
}

export type NpcBirthSeason = 'spring' | 'summer' | 'fall' | 'winter';
export type NpcHomeRegion = 'Town' | 'Mountain' | 'Forest' | 'Beach';

export interface VillagerScheduleWaypoint {
  readonly id: string;
  readonly time: string;
  readonly map: string;
  readonly x: number;
  readonly y: number;
  readonly facing: 0 | 1 | 2 | 3;
}

export interface VillagerEditEntry {
  readonly kind: 'villager';
  readonly id: string;
  readonly npcId: string;
  readonly displayName: string;
  readonly birthSeason: NpcBirthSeason;
  readonly birthDay: number;
  readonly homeRegion: NpcHomeRegion;
  readonly spawnMap: string;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly lovedItems: string;
  readonly likedItems: string;
  readonly greetingText: string;
  readonly scheduleWaypoints: readonly VillagerScheduleWaypoint[];
  readonly portraitAssetId?: string;
  readonly spriteAssetId?: string;
}

export type SdvProjectEdit =
  | ObjectEditEntry
  | CropEditEntry
  | RetextureEditEntry
  | DialogueEditEntry
  | GiftTasteEditEntry
  | ShopEditEntry
  | MailEditEntry
  | EventEditEntry
  | AnimalEditEntry
  | WeaponEditEntry
  | FurnitureEditEntry
  | FishEditEntry
  | VillagerEditEntry;

export interface ProjectConfigOption {
  readonly id: string;
  readonly key: string;
  readonly optionType: 'toggle' | 'choice' | 'number';
  readonly defaultValue: string;
  readonly allowValues?: string;
  readonly description?: string;
  readonly section?: string;
}

export type ProjectTranslations = Readonly<Record<string, Readonly<Record<string, string>>>>;

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
  readonly translations?: ProjectTranslations;
}
