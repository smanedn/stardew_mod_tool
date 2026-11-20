import type { AreaRect } from '../../data/models/index.js';

export type SpriteGalleryCategory = 'Tool' | 'Animal' | 'Furniture' | 'Object';

export interface VanillaSpritePreset {
  readonly id: string;
  readonly name: string;
  readonly category: SpriteGalleryCategory;
  readonly target: string;
  readonly spriteIndex: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly sheetColumns: number;
}

export interface CalculatedEditImageAreas {
  readonly fromArea: AreaRect;
  readonly toArea: AreaRect;
}

export const VANILLA_SPRITE_GALLERY: readonly VanillaSpritePreset[] = [
  {
    id: 'tool-axe',
    name: 'Axe (Steel)',
    category: 'Tool',
    target: 'TileSheets/tools',
    spriteIndex: 215,
    tileWidth: 16,
    tileHeight: 16,
    sheetColumns: 21,
  },
  {
    id: 'tool-pickaxe',
    name: 'Pickaxe (Steel)',
    category: 'Tool',
    target: 'TileSheets/tools',
    spriteIndex: 110,
    tileWidth: 16,
    tileHeight: 16,
    sheetColumns: 21,
  },
  {
    id: 'tool-watering-can',
    name: 'Watering Can (Basic)',
    category: 'Tool',
    target: 'TileSheets/tools',
    spriteIndex: 273,
    tileWidth: 16,
    tileHeight: 16,
    sheetColumns: 21,
  },
  {
    id: 'animal-white-chicken',
    name: 'White Chicken (Frame 0)',
    category: 'Animal',
    target: 'Animals/White Chicken',
    spriteIndex: 0,
    tileWidth: 16,
    tileHeight: 16,
    sheetColumns: 4,
  },
  {
    id: 'animal-white-cow',
    name: 'White Cow (Frame 0)',
    category: 'Animal',
    target: 'Animals/White Cow',
    spriteIndex: 0,
    tileWidth: 32,
    tileHeight: 32,
    sheetColumns: 4,
  },
  {
    id: 'furniture-oak-chair',
    name: 'Oak Chair',
    category: 'Furniture',
    target: 'TileSheets/furniture',
    spriteIndex: 0,
    tileWidth: 16,
    tileHeight: 32,
    sheetColumns: 32,
  },
  {
    id: 'object-parsnip',
    name: 'Parsnip',
    category: 'Object',
    target: 'Maps/springobjects',
    spriteIndex: 24,
    tileWidth: 16,
    tileHeight: 16,
    sheetColumns: 24,
  },
  {
    id: 'object-strawberry',
    name: 'Strawberry',
    category: 'Object',
    target: 'Maps/springobjects',
    spriteIndex: 400,
    tileWidth: 16,
    tileHeight: 16,
    sheetColumns: 24,
  },
];

/**
 * Automatically calculates FromArea and ToArea coordinates for a Content Patcher EditImage patch.
 */
export function calculateEditImageAreas(
  preset: VanillaSpritePreset,
  uploadedWidthPx: number = preset.tileWidth,
  uploadedHeightPx: number = preset.tileHeight,
): CalculatedEditImageAreas {
  const columns = Math.max(1, preset.sheetColumns);
  const col = preset.spriteIndex % columns;
  const row = Math.floor(preset.spriteIndex / columns);

  return {
    fromArea: {
      X: 0,
      Y: 0,
      Width: Math.max(1, Math.min(uploadedWidthPx, preset.tileWidth)),
      Height: Math.max(1, Math.min(uploadedHeightPx, preset.tileHeight)),
    },
    toArea: {
      X: col * preset.tileWidth,
      Y: row * preset.tileHeight,
      Width: preset.tileWidth,
      Height: preset.tileHeight,
    },
  };
}
