import { describe, expect, it } from 'vitest';
import { COMMON_VILLAGERS } from '../../../src/core/engine/dialogue-tokens.js';
import { parseDialoguePreview } from '../../../src/core/engine/ui-simulator.js';
import { getNpcPortraitSrc } from '../../../src/ui/utils/npc-portraits.js';

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

  it('resolves Abigail_Happy.png and 16x16 pixel-art SVG portraits for all 34 villagers', () => {
    expect(getNpcPortraitSrc('Abigail', 'Happy')).toBeTruthy();
    for (const npc of COMMON_VILLAGERS) {
      expect(getNpcPortraitSrc(npc, 'Happy')).toBeTruthy();
      expect(getNpcPortraitSrc(npc, 'Sad')).toBeTruthy();
    }
    expect(getNpcPortraitSrc('CustomModNpc', 'Sad')).toBeNull();
  });
});
