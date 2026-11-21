export type PortraitMood = 'Neutral' | 'Happy' | 'Sad' | 'Angry' | 'Love' | 'Surprised';

export interface ParsedDialoguePreview {
  readonly cleanText: string;
  readonly mood: PortraitMood;
  readonly pages: readonly string[];
}

export interface EdibilityRestoreStats {
  readonly edible: boolean;
  readonly energy: number;
  readonly health: number;
}

const CATEGORY_LABELS: Readonly<Record<number, string>> = {
  [-7]: 'Cooking',
  [-75]: 'Vegetable',
  [-79]: 'Fruit',
  [-26]: 'Artisan Goods',
  [-12]: 'Mineral',
  [0]: 'Object',
};

const MOOD_BY_TOKEN: ReadonlyArray<readonly [string, PortraitMood]> = [
  ['$h', 'Happy'],
  ['$1', 'Happy'],
  ['$s', 'Sad'],
  ['$2', 'Sad'],
  ['$a', 'Angry'],
  ['$3', 'Angry'],
  ['$l', 'Love'],
  ['$4', 'Love'],
  ['$u', 'Surprised'],
  ['$5', 'Surprised'],
];

/**
 * Returns the human-readable Stardew Valley category name for a numeric category ID.
 */
export function formatObjectCategoryLabel(category: number): string {
  return CATEGORY_LABELS[category] ?? `Category ${String(category)}`;
}

/**
 * Computes Stardew Valley energy and health restoration from an object's Edibility value.
 */
export function computeEnergyHealthFromEdibility(edibility: number): EdibilityRestoreStats {
  if (edibility <= -300 || edibility === 0) {
    return { edible: false, energy: 0, health: 0 };
  }
  const energy = Math.ceil(edibility * 2.5);
  const health = Math.max(0, Math.floor(energy * 0.45));
  return { edible: true, energy, health };
}

/**
 * Parses Stardew Valley dialogue tokens (@, %farm, %pet, $h/$s/$a/$l/$u, $b/$e)
 * into clean preview pages and detected NPC portrait mood.
 */
export function parseDialoguePreview(
  rawText: string,
  farmerName = 'Farmer',
  farmName = 'Stardew',
): ParsedDialoguePreview {
  let mood: PortraitMood = 'Neutral';
  for (const [token, detectedMood] of MOOD_BY_TOKEN) {
    if (rawText.includes(token)) {
      mood = detectedMood;
      break;
    }
  }

  const substituted = rawText
    .replace(/@/g, farmerName)
    .replace(/%farm/g, farmName)
    .replace(/%pet/g, 'Miso')
    .replace(/#\$e#/g, '')
    .replace(/#\$b#/g, '$b')
    .replace(/\$[hsaluekcn0-9]/g, '');

  const pages = substituted
    .split('$b')
    .map((page) => page.trim())
    .filter((page) => page.length > 0);

  return {
    cleanText: pages.join('\n\n'),
    mood,
    pages: pages.length > 0 ? pages : ['...'],
  };
}
