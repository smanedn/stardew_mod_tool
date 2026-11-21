export interface DialogueTokenInfo {
  readonly token: string;
  readonly label: string;
  readonly category: 'Portrait' | 'Player' | 'Flow';
}

export interface DialogueKeyPreset {
  readonly key: string;
  readonly label: string;
  readonly group: 'Daily' | 'Seasonal' | 'Marriage';
}

export const COMMON_VILLAGERS: readonly string[] = [
  'Abigail',
  'Alex',
  'Caroline',
  'Clint',
  'Demetrius',
  'Dwarf',
  'Elliott',
  'Emily',
  'Evelyn',
  'George',
  'Gus',
  'Haley',
  'Harvey',
  'Jas',
  'Jodi',
  'Kent',
  'Krobus',
  'Leah',
  'Leo',
  'Lewis',
  'Linus',
  'Marnie',
  'Maru',
  'Pam',
  'Penny',
  'Pierre',
  'Robin',
  'Sam',
  'Sandy',
  'Sebastian',
  'Shane',
  'Vincent',
  'Willy',
  'Wizard',
];

export const DIALOGUE_GAME_TOKENS: readonly DialogueTokenInfo[] = [
  { token: '@', label: 'Player Name', category: 'Player' },
  { token: '%farm', label: 'Farm Name', category: 'Player' },
  { token: '%pet', label: 'Pet Name', category: 'Player' },
  { token: '$h', label: 'Happy Portrait', category: 'Portrait' },
  { token: '$s', label: 'Sad Portrait', category: 'Portrait' },
  { token: '$a', label: 'Angry Portrait', category: 'Portrait' },
  { token: '$l', label: 'Blush / Love', category: 'Portrait' },
  { token: '$u', label: 'Unique / Surprised', category: 'Portrait' },
  { token: '$b', label: 'New Dialogue Box', category: 'Flow' },
  { token: '$e', label: 'End / Break', category: 'Flow' },
];

export const DIALOGUE_KEY_PRESETS: readonly DialogueKeyPreset[] = [
  { key: 'Mon', label: 'Monday (Daily)', group: 'Daily' },
  { key: 'Tue', label: 'Tuesday (Daily)', group: 'Daily' },
  { key: 'Wed', label: 'Wednesday (Daily)', group: 'Daily' },
  { key: 'Thu', label: 'Thursday (Daily)', group: 'Daily' },
  { key: 'Fri', label: 'Friday (Daily)', group: 'Daily' },
  { key: 'Sat', label: 'Saturday (Daily)', group: 'Daily' },
  { key: 'Sun', label: 'Sunday (Daily)', group: 'Daily' },
  { key: 'spring_Mon', label: 'Spring Monday', group: 'Seasonal' },
  { key: 'summer_Mon', label: 'Summer Monday', group: 'Seasonal' },
  { key: 'fall_Mon', label: 'Fall Monday', group: 'Seasonal' },
  { key: 'winter_Mon', label: 'Winter Monday', group: 'Seasonal' },
  { key: 'Rainy_Day_0', label: 'Rainy Day', group: 'Seasonal' },
  { key: 'Marriage_Mon', label: 'Marriage Monday', group: 'Marriage' },
  { key: 'Good_0', label: 'Marriage Happy', group: 'Marriage' },
];

/**
 * Inserts a Stardew Valley dialogue token at the specified cursor offset.
 */
export function insertTokenAtCursor(
  text: string,
  token: string,
  cursorIndex: number = text.length,
): string {
  const clamped = Math.max(0, Math.min(cursorIndex, text.length));
  return `${text.slice(0, clamped)}${token}${text.slice(clamped)}`;
}
