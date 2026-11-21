import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SPRITESHEET_TARGETS,
  computeTileToArea,
} from '../../../src/core/engine/sprite-patcher.js';
import { RetexturePatcher } from '../../../src/ui/components/index.js';

describe('Visual Spritesheet Tile Picker (EditImage)', () => {
  it('computes 16x16 ToArea coordinates for clicked tiles', () => {
    expect(SPRITESHEET_TARGETS.map((s) => s.target)).toEqual([
      'Maps/springobjects',
      'TileSheets/crops',
      'TileSheets/furniture',
    ]);
    expect(computeTileToArea(3, 2)).toEqual({ X: 48, Y: 32, Width: 16, Height: 16 });
  });

  it('renders clickable 16x16 spritesheet tile grid in RetexturePatcher', () => {
    const html = renderToStaticMarkup(
      <RetexturePatcher
        retextures={[]}
        assets={[]}
        onAddRetexture={() => undefined}
        onRemoveRetexture={() => undefined}
      />,
    );
    expect(html).toContain('Visual 16x16 Spritesheet Tile Picker');
    expect(html).toContain('Maps/springobjects');
    expect(html).toContain('TileSheets/crops');
    expect(html).toContain('TileSheets/furniture');
  });
});
