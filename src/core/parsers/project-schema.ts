import { z } from 'zod';
import type { SdvProjectFile } from '../../data/models/index.js';
import {
  AreaRectSchema,
  RelativeAssetPathSchema,
  SemVerSchema,
  UniqueIdSchema,
  validateWithSchema,
} from '../security/input-schemas.js';

const PatchConditionsSchema = z.record(z.string().min(1), z.string());

export const SdvProjectMetadataSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    author: z.string().trim().min(1).max(100),
    version: SemVerSchema,
    description: z.string().trim().max(1000),
    uniqueId: UniqueIdSchema,
    updateKeys: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

const LinkedAssetSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    relativePath: RelativeAssetPathSchema,
    kind: z.enum(['png', 'tmx', 'xnb']),
    dataBase64: z.string().optional(),
  })
  .strict();

const ObjectRecipeSchema = z
  .object({
    kind: z.enum(['cooking', 'crafting']),
    ingredients: z.record(z.string().min(1), z.number().int().min(1)),
  })
  .strict();

const ObjectBuffSchema = z
  .object({
    speed: z.number().int().min(-5).max(10).optional(),
    luck: z.number().int().min(-5).max(10).optional(),
    farming: z.number().int().min(0).max(10).optional(),
    mining: z.number().int().min(0).max(10).optional(),
    durationSeconds: z.number().int().min(10).max(1200).optional(),
  })
  .strict();

const ObjectEditSchema = z
  .object({
    kind: z.literal('object'),
    id: z.string().min(1),
    itemId: z.string().min(1),
    displayName: z.string().min(1),
    description: z.string(),
    price: z.number().int().min(0),
    edibility: z.number().int(),
    category: z.number().int(),
    assetId: z.string().min(1).optional(),
    recipe: ObjectRecipeSchema.optional(),
    buff: ObjectBuffSchema.optional(),
  })
  .strict();

const CropEditSchema = z
  .object({
    kind: z.literal('crop'),
    id: z.string().min(1),
    seedItemId: z.string().min(1),
    harvestItemId: z.string().min(1),
    seasons: z.array(z.string().min(1)).min(1),
    daysInPhase: z.array(z.number().int().min(1)).min(1),
    assetId: z.string().min(1).optional(),
  })
  .strict();

const RetextureEditSchema = z
  .object({
    kind: z.literal('retexture'),
    id: z.string().min(1),
    target: z.string().min(1),
    assetId: z.string().min(1),
    fromArea: AreaRectSchema.optional(),
    toArea: AreaRectSchema.optional(),
    when: PatchConditionsSchema.optional(),
  })
  .strict();

const DialogueEditSchema = z
  .object({
    kind: z.literal('dialogue'),
    id: z.string().min(1),
    npcName: z.string().min(1),
    dialogueKey: z.string().min(1),
    text: z.string(),
    when: PatchConditionsSchema.optional(),
  })
  .strict();

const GiftTasteEditSchema = z
  .object({
    kind: z.literal('giftTaste'),
    id: z.string().min(1),
    npcName: z.string().min(1),
    taste: z.enum(['Love', 'Like', 'Dislike', 'Hate']),
    itemId: z.string().min(1),
  })
  .strict();

const ShopEditSchema = z
  .object({
    kind: z.literal('shop'),
    id: z.string().min(1),
    shopId: z.enum(['SeedShop', 'Saloon', 'Joja', 'ShadowShop']),
    itemId: z.string().min(1),
    price: z.number().int().min(0),
  })
  .strict();

const MailEditSchema = z
  .object({
    kind: z.literal('mail'),
    id: z.string().min(1),
    mailId: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    attachmentItemId: z.string().min(1).optional(),
  })
  .strict();

const EventTilePosSchema = z
  .object({
    x: z.number().int().min(0).max(200),
    y: z.number().int().min(0).max(200),
  })
  .strict();

const EventTimelineStepSchema = z.discriminatedUnion('kind', [
  z
    .object({
      id: z.string().min(1),
      kind: z.literal('walk'),
      actor: z.enum(['farmer', 'npc']),
      dx: z.number().int().min(-20).max(20),
      dy: z.number().int().min(-20).max(20),
      facing: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    })
    .strict(),
  z
    .object({
      id: z.string().min(1),
      kind: z.literal('emote'),
      actor: z.enum(['farmer', 'npc']),
      emoteId: z.number().int().min(4).max(64),
    })
    .strict(),
  z
    .object({
      id: z.string().min(1),
      kind: z.literal('pause'),
      durationMs: z.number().int().min(100).max(10000),
    })
    .strict(),
  z
    .object({
      id: z.string().min(1),
      kind: z.literal('speak'),
      text: z.string().min(1),
    })
    .strict(),
]);

const EventEditSchema = z
  .object({
    kind: z.literal('event'),
    id: z.string().min(1),
    location: z.enum(['Town', 'Farm', 'Saloon', 'Beach']),
    eventId: z.string().min(1),
    npcName: z.string().min(1),
    dialogueText: z.string().min(1),
    minHearts: z.number().int().min(0).max(14),
    farmerPos: EventTilePosSchema.optional(),
    npcPos: EventTilePosSchema.optional(),
    steps: z.array(EventTimelineStepSchema).optional(),
  })
  .strict();

const AnimalEditSchema = z
  .object({
    kind: z.literal('animal'),
    id: z.string().min(1),
    animalId: z.string().min(1),
    displayName: z.string().min(1),
    house: z.enum(['Coop', 'Barn']),
    purchasePrice: z.number().int().min(0),
    daysToMature: z.number().int().min(1).max(30),
    produceItemId: z.string().min(1),
  })
  .strict();

const WeaponEditSchema = z
  .object({
    kind: z.literal('weapon'),
    id: z.string().min(1),
    weaponId: z.string().min(1),
    displayName: z.string().min(1),
    description: z.string(),
    weaponType: z.enum(['Sword', 'Dagger', 'Club']),
    minDamage: z.number().int().min(1),
    maxDamage: z.number().int().min(1),
    critChance: z.number().min(0).max(1),
    speed: z.number().int().min(-10).max(10),
    defense: z.number().int().min(0).max(20),
    assetId: z.string().min(1).optional(),
  })
  .strict();

const FurnitureEditSchema = z
  .object({
    kind: z.literal('furniture'),
    id: z.string().min(1),
    furnitureId: z.string().min(1),
    displayName: z.string().min(1),
    furnitureType: z.enum(['chair', 'table', 'rug', 'lamp', 'painting']),
    tileSize: z.enum(['1x1', '2x1', '2x2']),
    price: z.number().int().min(0),
    assetId: z.string().min(1).optional(),
  })
  .strict();

const FishEditSchema = z
  .object({
    kind: z.literal('fish'),
    id: z.string().min(1),
    fishId: z.string().min(1),
    displayName: z.string().min(1),
    minSize: z.number().int().min(1),
    maxSize: z.number().int().min(1),
    difficulty: z.number().int().min(5).max(110),
    behavior: z.enum(['smooth', 'dart', 'sinker', 'floater']),
    seasons: z.array(z.string().min(1)).min(1),
    weather: z.enum(['sunny', 'rainy', 'both']),
    waterLocation: z.enum(['River', 'Ocean', 'Lake']),
    price: z.number().int().min(0),
    assetId: z.string().min(1).optional(),
  })
  .strict();

const VillagerWaypointSchema = z
  .object({
    id: z.string().min(1),
    time: z.string().min(3),
    map: z.string().min(1),
    x: z.number().int().min(0).max(200),
    y: z.number().int().min(0).max(200),
    facing: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  })
  .strict();

const VillagerEditSchema = z
  .object({
    kind: z.literal('villager'),
    id: z.string().min(1),
    npcId: z.string().min(1),
    displayName: z.string().min(1),
    birthSeason: z.enum(['spring', 'summer', 'fall', 'winter']),
    birthDay: z.number().int().min(1).max(28),
    homeRegion: z.enum(['Town', 'Mountain', 'Forest', 'Beach']),
    spawnMap: z.string().min(1),
    spawnX: z.number().int().min(0).max(200),
    spawnY: z.number().int().min(0).max(200),
    lovedItems: z.string(),
    likedItems: z.string(),
    greetingText: z.string().min(1),
    scheduleWaypoints: z.array(VillagerWaypointSchema),
    portraitAssetId: z.string().min(1).optional(),
    spriteAssetId: z.string().min(1).optional(),
  })
  .strict();

const ProjectConfigOptionSchema = z
  .object({
    id: z.string().min(1),
    key: z
      .string()
      .trim()
      .min(1)
      .regex(/^[A-Za-z0-9_]+$/),
    optionType: z.enum(['toggle', 'choice', 'number']),
    defaultValue: z.string(),
    allowValues: z.string().optional(),
    description: z.string().optional(),
    section: z.string().optional(),
  })
  .strict();

export const SdvProjectSchema: z.ZodType<SdvProjectFile> = z
  .object({
    formatVersion: z.number().int().min(1),
    updatedAt: z.string().min(1),
    metadata: SdvProjectMetadataSchema,
    assets: z.array(LinkedAssetSchema),
    edits: z.array(
      z.discriminatedUnion('kind', [
        ObjectEditSchema,
        CropEditSchema,
        RetextureEditSchema,
        DialogueEditSchema,
        GiftTasteEditSchema,
        ShopEditSchema,
        MailEditSchema,
        EventEditSchema,
        AnimalEditSchema,
        WeaponEditSchema,
        FurnitureEditSchema,
        FishEditSchema,
        VillagerEditSchema,
      ]),
    ),
    configOptions: z.array(ProjectConfigOptionSchema).optional(),
    translations: z
      .record(z.string().min(1), z.record(z.string().min(1), z.string()))
      .optional(),
  })
  .strict();

/**
 * Validates and parses a raw .sdvproj JSON string (browser-safe).
 */
export function parseProjectJson(rawJson: string): SdvProjectFile {
  const parsed: unknown = JSON.parse(rawJson);
  return validateWithSchema(SdvProjectSchema, parsed, '.sdvproj');
}
