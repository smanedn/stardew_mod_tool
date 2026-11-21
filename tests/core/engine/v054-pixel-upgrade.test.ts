import { describe, expect, it } from 'vitest';
import {
  SPRITE_TEMPLATES,
  createPixelGrid,
  createPixelGridFromTemplate,
  floodFillPixels,
  getPixelColor,
  setPixelColor,
} from '../../../src/core/engine/pixel-grid.js';

describe('v0.5.4 Pixel Editor Upgrade (Flood Fill & Starter Templates)', () => {
  it('flood-fills a bounded region without leaking outside', () => {
    let grid = createPixelGrid(5, 5);
    for (let i = 0; i < 5; i += 1) {
      grid = setPixelColor(grid, i, 0, '#000000');
      grid = setPixelColor(grid, i, 4, '#000000');
      grid = setPixelColor(grid, 0, i, '#000000');
      grid = setPixelColor(grid, 4, i, '#000000');
    }

    const filled = floodFillPixels(grid, 2, 2, '#dc2626');
    expect(getPixelColor(filled, 1, 1)).toBe('#dc2626');
    expect(getPixelColor(filled, 2, 2)).toBe('#dc2626');
    expect(getPixelColor(filled, 3, 3)).toBe('#dc2626');
    expect(getPixelColor(filled, 0, 0)).toBe('#000000');

    const noop = floodFillPixels(filled, 2, 2, '#dc2626');
    expect(noop).toBe(filled);
  });

  it('provides closed 16x16 starter outlines for Berry, Gem, Potion, and Sword', () => {
    expect(SPRITE_TEMPLATES.map((t) => t.id)).toEqual(['berry', 'gem', 'potion', 'sword']);

    const interiorSeeds = {
      berry: [7, 8],
      gem: [7, 4],
      potion: [7, 9],
      sword: [7, 6],
    } as const;

    for (const tpl of SPRITE_TEMPLATES) {
      const grid = createPixelGridFromTemplate(tpl.id);
      expect(grid.width).toBe(16);
      expect(grid.height).toBe(16);
      expect(grid.pixels).toHaveLength(256);

      const [sx, sy] = interiorSeeds[tpl.id];
      const filled = floodFillPixels(grid, sx, sy, '#eab308');
      expect(getPixelColor(filled, sx, sy)).toBe('#eab308');
      expect(getPixelColor(filled, 0, 0)).toBeNull();
    }
  });
});
