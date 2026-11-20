/**
 * Standard Stardew Valley item categories.
 */
export type ObjectCategory =
  | 'Basic'
  | 'Cooking'
  | 'Crafting'
  | 'Fish'
  | 'Flower'
  | 'Fruit'
  | 'Mineral'
  | 'Seeds'
  | 'Vegetable'
  | 'ArtisanGoods';

/**
 * Optional buff attributes granted when consuming an edible object.
 */
export interface ObjectBuffAttributes {
  readonly FarmingLevel?: number;
  readonly FishingLevel?: number;
  readonly MiningLevel?: number;
  readonly LuckLevel?: number;
  readonly ForagingLevel?: number;
  readonly MaxStamina?: number;
  readonly Speed?: number;
  readonly Defense?: number;
  readonly Attack?: number;
}

/**
 * Explicit data model for a Stardew Valley 1.6+ Data/Objects entry.
 */
export interface ObjectData {
  readonly Id: string;
  readonly Name: string;
  readonly DisplayName: string;
  readonly Description: string;
  readonly Type: string;
  readonly Category: number;
  readonly Price: number;
  readonly Texture: string;
  readonly SpriteIndex: number;
  readonly Edibility: number;
  readonly IsDrink?: boolean;
  readonly Buffs?: readonly ObjectBuffAttributes[];
  readonly ContextTags?: readonly string[];
}
