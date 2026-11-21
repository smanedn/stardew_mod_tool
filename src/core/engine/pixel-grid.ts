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

/**
 * Flood-fills a contiguous region of matching pixels starting at (startX, startY).
 */
export function floodFillPixels(
  grid: PixelGrid,
  startX: number,
  startY: number,
  replacementColor: PixelColor,
): PixelGrid {
  if (startX < 0 || startY < 0 || startX >= grid.width || startY >= grid.height) {
    return grid;
  }
  const targetColor = getPixelColor(grid, startX, startY);
  if (targetColor === replacementColor) {
    return grid;
  }

  const nextPixels = [...grid.pixels];
  const stack: Array<[number, number]> = [[startX, startY]];

  while (stack.length > 0) {
    const pos = stack.pop();
    if (pos === undefined) {
      continue;
    }
    const [cx, cy] = pos;
    if (cx < 0 || cy < 0 || cx >= grid.width || cy >= grid.height) {
      continue;
    }
    const idx = cy * grid.width + cx;
    if (nextPixels[idx] !== targetColor) {
      continue;
    }
    nextPixels[idx] = replacementColor;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }

  return { ...grid, pixels: nextPixels };
}

export type PixelTemplateId = 'berry' | 'gem' | 'potion' | 'sword';

export interface PixelTemplateInfo {
  readonly id: PixelTemplateId;
  readonly label: string;
}

export const SPRITE_TEMPLATES: readonly PixelTemplateInfo[] = [
  { id: 'berry', label: 'Berry' },
  { id: 'gem', label: 'Gem' },
  { id: 'potion', label: 'Potion' },
  { id: 'sword', label: 'Sword' },
];

const OUTLINE_COLOR = '#1f2937';

const TEMPLATE_PATTERNS: Readonly<Record<PixelTemplateId, readonly string[]>> = {
  berry: [
    '.......##.......',
    '......#..#......',
    '....##.##.##....',
    '...#..####..#...',
    '....##....##....',
    '...#........#...',
    '..#..........#..',
    '..#..........#..',
    '..#..........#..',
    '..#..........#..',
    '...#........#...',
    '...#........#...',
    '....#......#....',
    '.....#....#.....',
    '......####......',
    '................',
  ],
  gem: [
    '................',
    '.....######.....',
    '....#......#....',
    '...#........#...',
    '..#..........#..',
    '.#............#.',
    '.##############.',
    '.#............#.',
    '..#..........#..',
    '...#........#...',
    '....#......#....',
    '.....#....#.....',
    '......#..#......',
    '.......##.......',
    '................',
    '................',
  ],
  potion: [
    '......####......',
    '......#..#......',
    '.....######.....',
    '......#..#......',
    '......#..#......',
    '....##....##....',
    '...#........#...',
    '..#..........#..',
    '..#..........#..',
    '..#..........#..',
    '..#..........#..',
    '..#..........#..',
    '...#........#...',
    '....########....',
    '................',
    '................',
  ],
  sword: [
    '............###.',
    '...........#..#.',
    '..........#..#..',
    '.........#..#...',
    '........#..#....',
    '.......#..#.....',
    '......#..#......',
    '.....#..#.......',
    '..###..#........',
    '...#..#.........',
    '....##..........',
    '...#..#.........',
    '..#....#........',
    '.#..##..........',
    '.###............',
    '................',
  ],
};

/**
 * Creates a 16x16 PixelGrid pre-populated with a closed starter outline.
 */
export function createPixelGridFromTemplate(templateId: PixelTemplateId): PixelGrid {
  const rows = TEMPLATE_PATTERNS[templateId];
  const pixels: PixelColor[] = [];
  for (let y = 0; y < 16; y += 1) {
    const row = rows[y] ?? '';
    for (let x = 0; x < 16; x += 1) {
      pixels.push(row[x] === '#' ? OUTLINE_COLOR : null);
    }
  }
  return { width: 16, height: 16, pixels };
}
