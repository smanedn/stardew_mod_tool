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

  it('lazy-loads Abigail_Happy.png, assets/Alex/*.png, and 16x16 SVG fallbacks', async () => {
    expect(await preloadNpcPortrait('Abigail', 'Happy')).toBeTruthy();
    expect(await preloadNpcPortrait('Alex', 'Happy')).toContain('Alex_Happy');
    expect(await preloadNpcPortrait('Alex', 'Love')).toContain('Alex_Blush');
    expect(await preloadNpcPortrait('Alex', 'Angry')).toContain('Alex_Annoyed');
    expect(await preloadNpcPortrait('Alex', 'Sad')).toContain('Alex_Concerned');
    expect(await preloadNpcPortrait('Shane', 'Love')).toContain('Shane_Blushing');
    for (const npc of COMMON_VILLAGERS) {
      expect(getNpcPortraitSrc(npc, 'Happy')).toBeTruthy();
      expect(getNpcPortraitSrc(npc, 'Sad')).toBeTruthy();
    }
    expect(getNpcPortraitSrc('CustomModNpc', 'Sad')).toBeNull();
  });
});
