export type SpriteCanvasSizeId = '16x16' | '16x32' | '32x32';

export interface SpriteCanvasDimensions {
  readonly id: SpriteCanvasSizeId;
  readonly width: number;
  readonly height: number;
}

export const SPRITE_CANVAS_PRESETS: readonly SpriteCanvasDimensions[] = [
  { id: '16x16', width: 16, height: 16 },
  { id: '16x32', width: 16, height: 32 },
  { id: '32x32', width: 32, height: 32 },
];

export type PixelColor = string | null;

export interface PixelGrid {
  readonly width: number;
  readonly height: number;
  readonly pixels: readonly PixelColor[];
}

/**
 * Creates a transparent pixel grid of the specified sprite dimensions.
 */
export function createPixelGrid(width: number, height: number): PixelGrid {
  const safeW = Math.max(1, Math.floor(width));
  const safeH = Math.max(1, Math.floor(height));
  return {
    width: safeW,
    height: safeH,
    pixels: Array<PixelColor>(safeW * safeH).fill(null),
  };
}

/**
 * Returns the color at (x, y) or null if transparent or out of bounds.
 */
export function getPixelColor(grid: PixelGrid, x: number, y: number): PixelColor {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return null;
  }
  return grid.pixels[y * grid.width + x] ?? null;
}

/**
 * Immutably updates a single pixel in the grid (null erases to transparent).
 */
export function setPixelColor(
  grid: PixelGrid,
  x: number,
  y: number,
  color: PixelColor,
): PixelGrid {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return grid;
  }
  const index = y * grid.width + x;
  const nextPixels = [...grid.pixels];
  nextPixels[index] = color;
  return { ...grid, pixels: nextPixels };
}
