import { describe, expect, it } from 'vitest';
import {
  compileConfigSchema,
  compileDefaultConfigJson,
  createPixelGrid,
  getPixelColor,
  setPixelColor,
} from '../../../src/core/engine/index.js';

describe('Phase 3 Steps 18 & 19: GMCM ConfigSchema & Pixel Grid', () => {
  it('compiles GMCM-compatible ConfigSchema and config.json defaults', () => {
    const options = [
      {
        id: 'c1',
        key: 'EnableMod',
        optionType: 'toggle' as const,
        defaultValue: 'true',
        description: 'Toggle mod',
      },
      {
        id: 'c2',
        key: 'PriceMultiplier',
        optionType: 'number' as const,
        defaultValue: '1.0',
        allowValues: '0.5, 1.0, 2.0',
        section: 'Balance',
      },
    ];

    expect(compileConfigSchema(options)).toEqual({
      EnableMod: { Default: 'true', AllowValues: 'true, false', Description: 'Toggle mod' },
      PriceMultiplier: { Default: '1.0', AllowValues: '0.5, 1.0, 2.0', Section: 'Balance' },
    });
    expect(compileDefaultConfigJson(options)).toEqual({
      EnableMod: 'true',
      PriceMultiplier: '1.0',
    });
  });

  it('creates, paints, picks, and erases pixels in a 16x32 pixel grid', () => {
    let grid = createPixelGrid(16, 32);
    expect(getPixelColor(grid, 4, 8)).toBeNull();

    grid = setPixelColor(grid, 4, 8, '#d97706');
    expect(getPixelColor(grid, 4, 8)).toBe('#d97706');

    grid = setPixelColor(grid, 4, 8, null);
    expect(getPixelColor(grid, 4, 8)).toBeNull();
  });
});
