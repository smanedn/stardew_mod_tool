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

function compileObjectPatch(edit: ObjectEditEntry): ContentPatch {
  const buff = edit.buff;
  const hasBuff =
    buff !== undefined &&
    ((buff.speed ?? 0) !== 0 ||
      (buff.luck ?? 0) !== 0 ||
      (buff.farming ?? 0) > 0 ||
      (buff.mining ?? 0) > 0);

  return {
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
        ...(hasBuff
          ? {
              Buffs: [
                {
                  Duration: buff.durationSeconds ?? 120,
                  CustomAttributes: {
                    ...(buff.speed !== undefined ? { Speed: buff.speed } : {}),
                    ...(buff.luck !== undefined ? { LuckLevel: buff.luck } : {}),
                    ...(buff.farming !== undefined ? { FarmingLevel: buff.farming } : {}),
                    ...(buff.mining !== undefined ? { MiningLevel: buff.mining } : {}),
                  },
                },
              ],
            }
          : {}),
      },
    },
  };
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

function compileCropPatch(edit: CropEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Add Crop: ${edit.seedItemId}`,
    Target: 'Data/Crops',
    Entries: {
      [edit.seedItemId]: {
        Seasons: edit.seasons,
        DaysInPhase: edit.daysInPhase,
        HarvestItemId: edit.harvestItemId,
      },
    },
  };
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
    Fields: {
      [edit.npcName]: {
        [GIFT_FIELD_INDEX[edit.taste]]: edit.itemId,
      },
    },
  };
}

function compileShopPatch(edit: ShopEditEntry): ContentPatch {
  return {
    Action: 'EditData',
    LogName: `Add to Shop: ${edit.shopId}`,
    Target: 'Data/Shops',
    Fields: {
      [edit.shopId]: {
        Items: [
          {
            Id: edit.id,
            ItemId: `(O)${edit.itemId}`,
            Price: edit.price,
          },
        ],
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

function compileEventPatch(edit: EventEditEntry): ContentPatch {
  const cleanText = edit.dialogueText.replace(/"/g, "'");
  const heartsPoints = edit.minHearts * 250;
  const eventKey = `${edit.eventId}/f ${edit.npcName} ${String(heartsPoints)}`;
  const script = [
    'continue',
    '64 15',
    `farmer 64 18 0 ${edit.npcName} 64 16 2`,
    'pause 400',
    `speak ${edit.npcName} "${cleanText}"`,
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

function compileWeaponPatch(edit: WeaponEditEntry): ContentPatch {
  return {
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
      },
    },
  };
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

function compileFishPatches(edit: FishEditEntry): readonly ContentPatch[] {
  const seasonsStr = edit.seasons.map((s) => s.toLowerCase()).join(' ');
  const fishValue = [
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

  const locationKey = FISH_LOCATION_MAP[edit.waterLocation];
  return [
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

function compileSingleEdit(
  edit: SdvProjectFile['edits'][number],
  assetsById: ReadonlyMap<string, LinkedAssetEntry>,
): readonly ContentPatch[] {
  switch (edit.kind) {
    case 'object': {
      const recipe = compileObjectRecipePatch(edit);
      return recipe !== null ? [compileObjectPatch(edit), recipe] : [compileObjectPatch(edit)];
    }
    case 'crop':
      return [compileCropPatch(edit)];
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
      return [compileWeaponPatch(edit)];
    case 'furniture':
      return [compileFurniturePatch(edit)];
    case 'fish':
      return compileFishPatches(edit);
  }
}

/**
 * Compiles .sdvproj edits into a validated Content Patcher 2.0+ content.json document.
 */
export function compileProjectToContentJson(project: SdvProjectFile): ContentJsonDocument {
  const assetsById = buildAssetLookup(project.assets);
  const changes: ContentPatch[] = [];

  for (const edit of project.edits) {
    changes.push(...compileSingleEdit(edit, assetsById));
  }

  const hasConfig = project.configOptions !== undefined && project.configOptions.length > 0;
  return validateContentJson({
    Format: CONTENT_PATCHER_FORMAT_VERSION,
    ...(hasConfig ? { ConfigSchema: compileConfigSchema(project.configOptions) } : {}),
    Changes: changes,
  });
}
