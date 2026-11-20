import { describe, expect, it } from 'vitest';
import {
  VANILLA_SPRITE_GALLERY,
  calculateEditImageAreas,
  insertTokenAtCursor,
} from '../../../src/core/engine/index.js';

describe('Phase 3 Steps 16 & 17: Sprite Patcher & Dialogue Tokens', () => {
  it('calculates FromArea and ToArea coordinates from a vanilla sprite preset', () => {
    const parsnip = VANILLA_SPRITE_GALLERY.find((item) => item.id === 'object-parsnip');
    expect(parsnip).toBeDefined();
    if (parsnip === undefined) {
      return;
    }
    const { fromArea, toArea } = calculateEditImageAreas(parsnip, 16, 16);

    expect(fromArea).toEqual({ X: 0, Y: 0, Width: 16, Height: 16 });
    expect(toArea).toEqual({ X: 0, Y: 16, Width: 16, Height: 16 });
  });

  it('inserts game tokens cleanly at the cursor position', () => {
    expect(insertTokenAtCursor('Hello !', '@', 6)).toBe('Hello @!');
    expect(insertTokenAtCursor('Great day', '$h')).toBe('Great day$h');
  });
});
