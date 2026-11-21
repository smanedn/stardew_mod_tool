import type {
  AnimalEditEntry,
  ContentJsonDocument,
  ContentPatch,
  CropEditEntry,
  DialogueEditEntry,
  EventEditEntry,
  FishEditEntry,
  FurnitureEditEntry,
  GiftTasteEditEntry,
  LinkedAssetEntry,
  MailEditEntry,
  Manifest,
  ObjectEditEntry,
  RetextureEditEntry,
  SdvProjectFile,
  ShopEditEntry,
  VillagerEditEntry,
  WeaponEditEntry,
} from '../../data/models/index.js';
import { SecurityError } from '../security/security-error.js';
import { validateContentJson } from '../validators/content-patcher-validator.js';
import { validateManifest } from '../validators/manifest-validator.js';
import { compileConfigSchema } from './config-schema-builder.js';

export const CONTENT_PATCHER_FORMAT_VERSION = '2.0.0';
const CONTENT_PATCHER_ID = 'Pathoschild.ContentPatcher';

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively strips null and undefined properties from objects and arrays
 * to produce minimal, clean SMAPI JSON output.
 */
export function stripNullAndUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item) => stripNullAndUndefined(item));
  }

  if (isPlainRecord(value)) {
    const entries: Array<[string, unknown]> = [];
    for (const [key, propValue] of Object.entries(value)) {
      if (propValue !== null && propValue !== undefined) {
        entries.push([key, stripNullAndUndefined(propValue)]);
      }
    }
    return Object.fromEntries(entries);
  }

  return value;
}

/**
 * Serializes a value into clean, 2-space formatted JSON stripped of null/undefined fields.
 */
export function serializeCleanJson(data: unknown): string {
  const cleaned = stripNullAndUndefined(data);
  return `${JSON.stringify(cleaned, null, 2)}\n`;
}

/**
 * Compiles .sdvproj metadata into a validated SMAPI manifest.json object.
 */
export function compileProjectToManifest(project: SdvProjectFile): Manifest {
  const { metadata } = project;
  const rawManifest = {
    Name: metadata.name,
    Author: metadata.author,
    Version: metadata.version,
    Description: metadata.description,
    UniqueID: metadata.uniqueId,
    ContentPackFor: {
      UniqueID: CONTENT_PATCHER_ID,
      MinimumVersion: CONTENT_PATCHER_FORMAT_VERSION,
    },
    ...(metadata.updateKeys !== undefined && metadata.updateKeys.length > 0
      ? { UpdateKeys: metadata.updateKeys }
      : {}),
  };

  return validateManifest(rawManifest);
}

function buildAssetLookup(
  assets: readonly LinkedAssetEntry[],
): ReadonlyMap<string, LinkedAssetEntry> {
  return new Map(assets.map((asset) => [asset.id, asset]));
}

function buildObjectBuffs(buff: ObjectEditEntry['buff']): readonly unknown[] | undefined {
  if (buff === undefined) {
    return undefined;
  }
  const hasBuff =
    (buff.speed ?? 0) !== 0 ||
    (buff.luck ?? 0) !== 0 ||
    (buff.farming ?? 0) > 0 ||
    (buff.mining ?? 0) > 0;
  if (!hasBuff) {
    return undefined;
  }
  return [
    {
      Duration: buff.durationSeconds ?? 120,
      CustomAttributes: {
        ...(buff.speed !== undefined ? { Speed: buff.speed } : {}),
        ...(buff.luck !== undefined ? { LuckLevel: buff.luck } : {}),
        ...(buff.farming !== undefined ? { FarmingLevel: buff.farming } : {}),
        ...(buff.mining !== undefined ? { MiningLevel: buff.mining } : {}),
      },
    },
  ];
}

function resolveSpriteTexture(
  assetId: string | undefined,
  uniqueId: string,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
  label: string,
): { readonly loadPatch: ContentPatch | null; readonly textureTarget: string | null } {
  const linked = assetId !== undefined ? assetsById.get(assetId) : undefined;
  if (linked === undefined) {
    return { loadPatch: null, textureTarget: null };
  }
  const textureTarget = `Mods/${uniqueId}/${linked.id}`;
  return {
    textureTarget,
    loadPatch: {
      Action: 'Load',
      LogName: `Load Sprite: ${label}`,
      Target: textureTarget,
      FromFile: linked.relativePath,
    },
  };
}

function compileObjectPatches(
  edit: ObjectEditEntry,
  uniqueId: string,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): readonly ContentPatch[] {
  const buffs = buildObjectBuffs(edit.buff);
  const { loadPatch, textureTarget } = resolveSpriteTexture(
    edit.assetId,
    uniqueId,
    assetsById,
    edit.displayName,
  );
  const patches: ContentPatch[] = loadPatch !== null ? [loadPatch] : [];

  patches.push({
    Action: 'EditData',
    LogName: `Add Object: ${edit.displayName}`,
    Target: 'Data/Objects',
    Entries: {
      [edit.itemId]: {
        Name: edit.itemId,
        DisplayName: edit.displayName,
        Description: edit.description,
        Price: edit.price,
        Edibility: edit.edibility,
        Category: edit.category,
        ...(textureTarget !== null ? { Texture: textureTarget, SpriteIndex: 0 } : {}),
        ...(buffs !== undefined ? { Buffs: buffs } : {}),
      },
    },
  });

  const recipe = compileObjectRecipePatch(edit);
  return recipe !== null ? [...patches, recipe] : patches;
}

function compileObjectRecipePatch(edit: ObjectEditEntry): ContentPatch | null {
  if (edit.recipe === undefined) {
    return null;
  }
  const ingredientsStr = Object.entries(edit.recipe.ingredients)
    .map(([id, qty]) => `${id} ${String(qty)}`)
    .join(' ');
  const isCooking = edit.recipe.kind === 'cooking';
  const target = isCooking ? 'Data/CookingRecipes' : 'Data/CraftingRecipes';
  const recipeValue = isCooking
    ? `${ingredientsStr}/1 10/${edit.itemId}/default`
    : `${ingredientsStr}/Home/${edit.itemId}/false/default`;

  return {
    Action: 'EditData',
    LogName: `Add Recipe: ${edit.displayName}`,
    Target: target,
    Entries: { [edit.itemId]: recipeValue },
  };
}

function compileCropPatches(
  edit: CropEditEntry,
  uniqueId: string,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): readonly ContentPatch[] {
  const { loadPatch, textureTarget } = resolveSpriteTexture(
    edit.assetId,
    uniqueId,
    assetsById,
    edit.seedItemId,
  );
  const cropPatch: ContentPatch = {
    Action: 'EditData',
    LogName: `Add Crop: ${edit.seedItemId}`,
    Target: 'Data/Crops',
    Entries: {
      [edit.seedItemId]: {
        Seasons: edit.seasons,
        DaysInPhase: edit.daysInPhase,
        HarvestItemId: edit.harvestItemId,
        ...(textureTarget !== null ? { Texture: textureTarget, SpriteIndex: 0 } : {}),
      },
    },
  };
  return loadPatch !== null ? [loadPatch, cropPatch] : [cropPatch];
}

function compileRetexturePatch(
  edit: RetextureEditEntry,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): ContentPatch {
  const asset = assetsById.get(edit.assetId);
  if (asset === undefined) {
    throw new SecurityError(
      'INVALID_PATH',
      `Retexture edit "${edit.id}" references missing asset "${edit.assetId}".`,
    );
  }
  return {
    Action: 'EditImage',
    LogName: `Retexture: ${edit.target}`,
    Target: edit.target,
    FromFile: asset.relativePath,
    ...(edit.fromArea !== undefined ? { FromArea: edit.fromArea } : {}),
    ...(edit.toArea !== undefined ? { ToArea: edit.toArea } : {}),
    ...(edit.when !== undefined ? { When: edit.when } : {}),
  };
}

function compileDialoguePatch(edit: DialogueEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Dialogue: ${edit.npcName}`,
    Target: `Characters/Dialogue/${edit.npcName}`,
    Entries: {
      [edit.dialogueKey]: edit.text,
    },
    ...(edit.when !== undefined ? { When: edit.when } : {}),
  };
}

const GIFT_FIELD_INDEX: Readonly<Record<GiftTasteEditEntry['taste'], string>> = {
  Love: '1',
  Like: '3',
  Dislike: '5',
  Hate: '7',
};

function compileGiftTastePatch(edit: GiftTasteEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Gift Taste: ${edit.npcName} (${edit.taste})`,
    Target: 'Data/NPCGiftTastes',
    TextOperations: [
      {
        Operation: 'Append',
        Target: ['Entries', edit.npcName, GIFT_FIELD_INDEX[edit.taste]],
        Value: edit.itemId,
        Delimiter: ' ',
      },
    ],
  };
}

function compileShopPatch(edit: ShopEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Add to Shop: ${edit.shopId}`,
    Target: 'Data/Shops',
    TargetField: [edit.shopId, 'Items'],
    Entries: {
      [edit.id]: {
        Id: edit.id,
        ItemId: `(O)${edit.itemId}`,
        Price: edit.price,
      },
    },
  };
}

function compileMailPatch(edit: MailEditEntry): ContentPatch {
  const attach =
    edit.attachmentItemId !== undefined && edit.attachmentItemId.trim().length > 0
      ? ` %item object ${edit.attachmentItemId.trim()} 1 %%`
      : '';
  return {
    Action: 'EditData',
    LogName: `Mail: ${edit.title}`,
    Target: 'Data/mail',
    Entries: {
      [edit.mailId]: `${edit.body}${attach}[#]${edit.title}`,
    },
  };
}

const EVENT_CAMERA_ORIGIN: Readonly<
  Record<EventEditEntry['location'], { readonly x: number; readonly y: number }>
> = {
  Town: { x: 64, y: 15 },
  Farm: { x: 64, y: 15 },
  Saloon: { x: 14, y: 18 },
  Beach: { x: 20, y: 10 },
};

function compileEventStep(
  step: NonNullable<EventEditEntry['steps']>[number],
  npcName: string,
): string {
  switch (step.kind) {
    case 'walk': {
      const actor = step.actor === 'farmer' ? 'farmer' : npcName;
      return `move ${actor} ${String(step.dx)} ${String(step.dy)} ${String(step.facing)}`;
    }
    case 'emote': {
      const actor = step.actor === 'farmer' ? 'farmer' : npcName;
      return `emote ${actor} ${String(step.emoteId)}`;
    }
    case 'pause':
      return `pause ${String(step.durationMs)}`;
    case 'speak':
      return `speak ${npcName} "${step.text.replace(/"/g, "'")}"`;
  }
}

function compileEventPatch(edit: EventEditEntry): ContentPatch {
  const origin = EVENT_CAMERA_ORIGIN[edit.location];
  const farmerPos = edit.farmerPos ?? { x: origin.x, y: origin.y + 3 };
  const npcPos = edit.npcPos ?? { x: origin.x, y: origin.y + 1 };
  const heartsPoints = edit.minHearts * 250;
  const eventKey = `${edit.eventId}/f ${edit.npcName} ${String(heartsPoints)}`;
  const stepCmds =
    edit.steps !== undefined && edit.steps.length > 0
      ? edit.steps.map((s) => compileEventStep(s, edit.npcName))
      : ['pause 400', `speak ${edit.npcName} "${edit.dialogueText.replace(/"/g, "'")}"`];

  const script = [
    'continue',
    `${String(origin.x)} ${String(origin.y)}`,
    `farmer ${String(farmerPos.x)} ${String(farmerPos.y)} 0 ` +
      `${edit.npcName} ${String(npcPos.x)} ${String(npcPos.y)} 2`,
    ...stepCmds,
    'end',
  ].join('/');

  return {
    Action: 'EditData',
    LogName: `Event: ${edit.location} (${edit.npcName})`,
    Target: `Data/Events/${edit.location}`,
    Entries: { [eventKey]: script },
  };
}

function compileAnimalPatch(edit: AnimalEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Add Animal: ${edit.displayName}`,
    Target: 'Data/FarmAnimals',
    Entries: {
      [edit.animalId]: {
        DisplayName: edit.displayName,
        House: edit.house,
        PurchasePrice: edit.purchasePrice,
        DaysToMature: edit.daysToMature,
        ProduceItemIds: [{ Id: 'Default', ItemId: `(O)${edit.produceItemId}` }],
      },
    },
  };
}

const WEAPON_TYPE_CODE: Readonly<Record<WeaponEditEntry['weaponType'], number>> = {
  Sword: 3,
  Dagger: 1,
  Club: 2,
};

function compileWeaponPatches(
  edit: WeaponEditEntry,
  uniqueId: string,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): readonly ContentPatch[] {
  const { loadPatch, textureTarget } = resolveSpriteTexture(
    edit.assetId,
    uniqueId,
    assetsById,
    edit.displayName,
  );
  const weaponPatch: ContentPatch = {
    Action: 'EditData',
    LogName: `Add Weapon: ${edit.displayName}`,
    Target: 'Data/Weapons',
    Entries: {
      [edit.weaponId]: {
        Name: edit.weaponId,
        DisplayName: edit.displayName,
        Description: edit.description,
        MinDamage: edit.minDamage,
        MaxDamage: edit.maxDamage,
        CritChance: edit.critChance,
        Speed: edit.speed,
        Defense: edit.defense,
        Type: WEAPON_TYPE_CODE[edit.weaponType],
        ...(textureTarget !== null ? { Texture: textureTarget, SpriteIndex: 0 } : {}),
      },
    },
  };
  return loadPatch !== null ? [loadPatch, weaponPatch] : [weaponPatch];
}

const FURNITURE_TILE_DIMS: Readonly<Record<FurnitureEditEntry['tileSize'], string>> = {
  '1x1': '1 1',
  '2x1': '2 1',
  '2x2': '2 2',
};

function compileFurniturePatch(edit: FurnitureEditEntry): ContentPatch {
  const dims = FURNITURE_TILE_DIMS[edit.tileSize];
  const value = [
    edit.displayName,
    edit.furnitureType,
    dims,
    dims,
    '1',
    String(edit.price),
    '-1',
    edit.displayName,
  ].join('/');

  return {
    Action: 'EditData',
    LogName: `Add Furniture: ${edit.displayName}`,
    Target: 'Data/Furniture',
    Entries: { [edit.furnitureId]: value },
  };
}

const FISH_LOCATION_MAP: Readonly<Record<FishEditEntry['waterLocation'], string>> = {
  River: 'Town',
  Ocean: 'Beach',
  Lake: 'Mountain',
};

function buildFishObjectPatch(
  edit: FishEditEntry,
  textureTarget: string | null,
): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Add Fish Object: ${edit.displayName}`,
    Target: 'Data/Objects',
    Entries: {
      [edit.fishId]: {
        Name: edit.fishId,
        DisplayName: edit.displayName,
        Description: `A custom ${edit.waterLocation.toLowerCase()} fish.`,
        Price: edit.price,
        Edibility: -300,
        Category: -4,
        ...(textureTarget !== null ? { Texture: textureTarget, SpriteIndex: 0 } : {}),
      },
    },
  };
}

function formatFishDataValue(edit: FishEditEntry, seasonsStr: string): string {
  return [
    edit.displayName,
    String(edit.difficulty),
    edit.behavior,
    String(edit.minSize),
    String(edit.maxSize),
    '600 2600',
    seasonsStr,
    edit.weather,
    '688 .05',
    '4',
    '.2',
    '.1',
    '0',
  ].join('/');
}

function compileFishPatches(
  edit: FishEditEntry,
  uniqueId: string,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): readonly ContentPatch[] {
  const { loadPatch, textureTarget } = resolveSpriteTexture(
    edit.assetId,
    uniqueId,
    assetsById,
    edit.displayName,
  );
  const seasonsStr = edit.seasons.map((s) => s.toLowerCase()).join(' ');
  const fishValue = formatFishDataValue(edit, seasonsStr);
  const locationKey = FISH_LOCATION_MAP[edit.waterLocation];
  return [
    ...(loadPatch !== null ? [loadPatch] : []),
    buildFishObjectPatch(edit, textureTarget),
    {
      Action: 'EditData',
      LogName: `Add Fish: ${edit.displayName}`,
      Target: 'Data/Fish',
      Entries: { [edit.fishId]: fishValue },
    },
    {
      Action: 'EditData',
      LogName: `Add Fish Spawn: ${edit.displayName}`,
      Target: 'Data/Locations',
      Fields: {
        [locationKey]: {
          Fish: [{ Id: edit.fishId, ItemId: `(O)${edit.fishId}`, Season: seasonsStr }],
        },
      },
    },
  ];
}

function buildVillagerLoadPatches(
  edit: VillagerEditEntry,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): readonly ContentPatch[] {
  const patches: ContentPatch[] = [];
  const portrait =
    edit.portraitAssetId !== undefined ? assetsById.get(edit.portraitAssetId) : undefined;
  const sprite =
    edit.spriteAssetId !== undefined ? assetsById.get(edit.spriteAssetId) : undefined;
  if (portrait !== undefined) {
    patches.push({
      Action: 'Load',
      LogName: `Load Portrait: ${edit.npcId}`,
      Target: `Portraits/${edit.npcId}`,
      FromFile: portrait.relativePath,
    });
  }
  if (sprite !== undefined) {
    patches.push({
      Action: 'Load',
      LogName: `Load Character Sprite: ${edit.npcId}`,
      Target: `Characters/${edit.npcId}`,
      FromFile: sprite.relativePath,
    });
  }
  return patches;
}

function buildVillagerSchedulePatch(edit: VillagerEditEntry): ContentPatch | null {
  if (edit.scheduleWaypoints.length === 0) {
    return null;
  }
  const scheduleValue = edit.scheduleWaypoints
    .map((wp) => `${wp.time} ${wp.map} ${String(wp.x)} ${String(wp.y)} ${String(wp.facing)}`)
    .join('/');
  return {
    Action: 'EditData',
    LogName: `Schedule: ${edit.npcId}`,
    Target: `Characters/schedules/${edit.npcId}`,
    Entries: { spring: scheduleValue },
  };
}

function buildVillagerCharacterPatch(edit: VillagerEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Add Villager: ${edit.displayName}`,
    Target: 'Data/Characters',
    Entries: {
      [edit.npcId]: {
        DisplayName: edit.displayName,
        BirthSeason: edit.birthSeason,
        BirthDay: edit.birthDay,
        HomeRegion: edit.homeRegion,
        CanSocialize: true,
        Home: [
          {
            Id: 'Default',
            Location: edit.spawnMap,
            Tile: { X: edit.spawnX, Y: edit.spawnY },
            Direction: 'down',
          },
        ],
      },
    },
  };
}

function compileVillagerPatches(
  edit: VillagerEditEntry,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): readonly ContentPatch[] {
  const patches: ContentPatch[] = [
    ...buildVillagerLoadPatches(edit, assetsById),
    buildVillagerCharacterPatch(edit),
    {
      Action: 'EditData',
      LogName: `Villager Dialogue: ${edit.npcId}`,
      Target: `Characters/Dialogue/${edit.npcId}`,
      Entries: { Introduction: edit.greetingText, Mon: edit.greetingText },
    },
  ];
  const schedulePatch = buildVillagerSchedulePatch(edit);
  if (schedulePatch !== null) {
    patches.push(schedulePatch);
  }
  const loved = edit.lovedItems.trim();
  const liked = edit.likedItems.trim();
  if (loved.length > 0 || liked.length > 0) {
    patches.push({
      Action: 'EditData',
      LogName: `Villager Gift Tastes: ${edit.npcId}`,
      Target: 'Data/NPCGiftTastes',
      Entries: {
        [edit.npcId]: `Oh, thank you!/ ${loved}/Thanks!/ ${liked}/Hmm.../ /No thanks./ /`,
      },
    });
  }
  return patches;
}

function compileSingleEdit(
  edit: SdvProjectFile['edits'][number],
  uniqueId: string,
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): readonly ContentPatch[] {
  switch (edit.kind) {
    case 'object':
      return compileObjectPatches(edit, uniqueId, assetsById);
    case 'crop':
      return compileCropPatches(edit, uniqueId, assetsById);
    case 'retexture':
      return [compileRetexturePatch(edit, assetsById)];
    case 'dialogue':
      return [compileDialoguePatch(edit)];
    case 'giftTaste':
      return [compileGiftTastePatch(edit)];
    case 'shop':
      return [compileShopPatch(edit)];
    case 'mail':
      return [compileMailPatch(edit)];
    case 'event':
      return [compileEventPatch(edit)];
    case 'animal':
      return [compileAnimalPatch(edit)];
    case 'weapon':
      return compileWeaponPatches(edit, uniqueId, assetsById);
    case 'furniture':
      return [compileFurniturePatch(edit)];
    case 'fish':
      return compileFishPatches(edit, uniqueId, assetsById);
    case 'villager':
      return compileVillagerPatches(edit, assetsById);
  }
}

/**
 * Compiles .sdvproj edits into a validated Content Patcher 2.0+ content.json document.
 */
export function compileProjectToContentJson(project: SdvProjectFile): ContentJsonDocument {
  const assetsById = buildAssetLookup(project.assets);
  const changes: ContentPatch[] = [];

  for (const edit of project.edits) {
    changes.push(...compileSingleEdit(edit, project.metadata.uniqueId, assetsById));
  }

  const hasConfig = project.configOptions !== undefined && project.configOptions.length > 0;
  return validateContentJson({
    Format: CONTENT_PATCHER_FORMAT_VERSION,
    ...(hasConfig ? { ConfigSchema: compileConfigSchema(project.configOptions) } : {}),
    Changes: changes,
  });
}
