import { describe, expect, it } from 'vitest';
import { COMMON_VILLAGERS } from '../../../src/core/engine/dialogue-tokens.js';
import { parseDialoguePreview } from '../../../src/core/engine/ui-simulator.js';
import { getNpcPortraitSrc, preloadNpcPortrait } from '../../../src/ui/utils/npc-portraits.js';

describe('Villager Dialogue & Portrait Fixes', () => {
  it('includes all 34 vanilla Stardew Valley villagers', () => {
    expect(COMMON_VILLAGERS.length).toBe(34);
    expect(COMMON_VILLAGERS).toContain('Robin');
    expect(COMMON_VILLAGERS).toContain('Lewis');
    expect(COMMON_VILLAGERS).toContain('Krobus');
    expect(COMMON_VILLAGERS).toContain('Wizard');
  });

  it('parses numeric portrait tokens and #$b# / #$e# dialogue markers', () => {
    const parsed = parseDialoguePreview('Hi @!$1#$b#Welcome to %farm Farm!#$e#', 'Alex', 'Star');
    expect(parsed.mood).toBe('Happy');
    expect(parsed.pages).toEqual(['Hi Alex!', 'Welcome to Star Farm!']);
  });

  it('lazy-loads all 12 Marriage Candidates PNGs and returns null for others', async () => {
    const candidates = [
      'Abigail', 'Alex', 'Elliott', 'Emily', 'Haley', 'Harvey',
      'Leah', 'Maru', 'Penny', 'Sam', 'Sebastian', 'Shane',
    ];
    for (const npc of candidates) {
      expect(await preloadNpcPortrait(npc, 'Happy')).toBeTruthy();
    }
    expect(await preloadNpcPortrait('Alex', 'Love')).toContain('Alex_Blush');
    expect(await preloadNpcPortrait('Shane', 'Love')).toContain('Shane_Blushing');
    expect(getNpcPortraitSrc('Wizard', 'Sad')).toBeNull();
    expect(getNpcPortraitSrc('Lewis', 'Neutral')).toBeNull();
  });
});
