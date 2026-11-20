import { describe, expect, it } from 'vitest';
import {
  computeEnergyHealthFromEdibility,
  formatObjectCategoryLabel,
  parseDialoguePreview,
} from '../../../src/core/engine/index.js';

describe('Phase 4 Step 21: Stardew Valley UI Simulator', () => {
  it('computes energy and health restoration from edibility', () => {
    expect(computeEnergyHealthFromEdibility(20)).toEqual({
      edible: true,
      energy: 50,
      health: 22,
    });
    expect(computeEnergyHealthFromEdibility(-300).edible).toBe(false);
    expect(formatObjectCategoryLabel(-75)).toBe('Vegetable');
  });

  it('parses dialogue tokens, portrait mood, and page breaks', () => {
    const parsed = parseDialoguePreview(
      'Hey @, welcome to %farm!$h$bWant to explore the mines?',
      'Alex',
      'Sunrise',
    );
    expect(parsed.mood).toBe('Happy');
    expect(parsed.pages).toEqual([
      'Hey Alex, welcome to Sunrise!',
      'Want to explore the mines?',
    ]);
  });
});
