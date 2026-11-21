import type { ObjectEditEntry } from '../../data/models/index.js';

export interface VanillaItemOption {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly icon: string;
}

export const VANILLA_ITEM_CATALOG: readonly VanillaItemOption[] = [
  { id: '(O)72', name: 'Diamond', category: 'Gem', icon: '💎' },
  { id: '(O)74', name: 'Prismatic Shard', category: 'Gem', icon: '🌈' },
  { id: '(O)60', name: 'Emerald', category: 'Gem', icon: '💚' },
  { id: '(O)64', name: 'Ruby', category: 'Gem', icon: '❤️' },
  { id: '(O)66', name: 'Amethyst', category: 'Gem', icon: '💜' },
  { id: '(O)245', name: 'Sugar', category: 'Cooking', icon: '🍬' },
  { id: '(O)246', name: 'Wheat Flour', category: 'Cooking', icon: '🌾' },
  { id: '(O)247', name: 'Oil', category: 'Cooking', icon: '🫗' },
  { id: '(O)395', name: 'Coffee', category: 'Cooking', icon: '☕' },
  { id: '(O)253', name: 'Triple Shot Espresso', category: 'Cooking', icon: '⚡' },
  { id: '(O)221', name: 'Pink Cake', category: 'Cooking', icon: '🍰' },
  { id: '(O)340', name: 'Honey', category: 'Artisan', icon: '🍯' },
  { id: '(O)348', name: 'Wine', category: 'Artisan', icon: '🍷' },
  { id: '(O)346', name: 'Beer', category: 'Artisan', icon: '🍺' },
  { id: '(O)303', name: 'Pale Ale', category: 'Artisan', icon: '🍻' },
  { id: '(O)424', name: 'Cheese', category: 'Artisan', icon: '🧀' },
  { id: '(O)176', name: 'Egg', category: 'Animal', icon: '🥚' },
  { id: '(O)174', name: 'Large Egg', category: 'Animal', icon: '🥚' },
  { id: '(O)184', name: 'Milk', category: 'Animal', icon: '🥛' },
  { id: '(O)186', name: 'Large Milk', category: 'Animal', icon: '🥛' },
  { id: '(O)430', name: 'Truffle', category: 'Animal', icon: '🍄' },
  { id: '(O)440', name: 'Wool', category: 'Animal', icon: '🧶' },
  { id: '(O)444', name: 'Duck Feather', category: 'Animal', icon: '🪶' },
  { id: '(O)446', name: "Rabbit's Foot", category: 'Animal', icon: '🐾' },
  { id: '(O)400', name: 'Strawberry', category: 'Crop', icon: '🍓' },
  { id: '(O)258', name: 'Blueberry', category: 'Crop', icon: '🫐' },
  { id: '(O)276', name: 'Pumpkin', category: 'Crop', icon: '🎃' },
  { id: '(O)454', name: 'Ancient Fruit', category: 'Crop', icon: '🍇' },
  { id: '(O)417', name: 'Sweet Gem Berry', category: 'Crop', icon: '🍒' },
  { id: '(O)388', name: 'Wood', category: 'Resource', icon: '🪵' },
  { id: '(O)390', name: 'Stone', category: 'Resource', icon: '🪨' },
  { id: '(O)771', name: 'Fiber', category: 'Resource', icon: '🌿' },
  { id: '(O)766', name: 'Slime', category: 'Resource', icon: '🟢' },
  { id: '(O)334', name: 'Copper Bar', category: 'Resource', icon: '🟧' },
  { id: '(O)335', name: 'Iron Bar', category: 'Resource', icon: '⬜' },
  { id: '(O)336', name: 'Gold Bar', category: 'Resource', icon: '🟨' },
  { id: '(O)337', name: 'Iridium Bar', category: 'Resource', icon: '🟪' },
  { id: '(O)787', name: 'Battery Pack', category: 'Resource', icon: '🔋' },
];

/**
 * Combines the user's custom objects with the curated Stardew Valley vanilla item catalog.
 */
export function buildCombinedItemOptions(
  customObjects: readonly ObjectEditEntry[],
): readonly VanillaItemOption[] {
  const custom: VanillaItemOption[] = customObjects.map((obj) => ({
    id: obj.itemId,
    name: obj.displayName,
    category: 'Custom Mod Item',
    icon: '✨',
  }));
  return [...custom, ...VANILLA_ITEM_CATALOG];
}

/**
 * Filters item options by display name, item ID, or category (case-insensitive).
 */
export function filterItemOptions(
  options: readonly VanillaItemOption[],
  query: string,
): readonly VanillaItemOption[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) {
    return options;
  }
  return options.filter(
    (opt) =>
      opt.name.toLowerCase().includes(q) ||
      opt.id.toLowerCase().includes(q) ||
      opt.category.toLowerCase().includes(q),
  );
}
