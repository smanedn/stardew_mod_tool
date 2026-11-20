import { useEffect, useRef, useState } from 'react';
import {
  type PixelGrid,
  SPRITE_CANVAS_PRESETS,
  type SpriteCanvasSizeId,
  createPixelGrid,
  getPixelColor,
  setPixelColor,
} from '../../core/engine/pixel-grid.js';

type PixelTool = 'pencil' | 'eyedropper' | 'eraser';

const PIXEL_SCALE = 14;
const QUICK_PALETTE: readonly string[] = [
  '#5a381e',
  '#d97706',
  '#eab308',
  '#15803d',
  '#2563eb',
  '#dc2626',
  '#ffffff',
  '#111827',
];

function drawGridToCanvas(
  canvas: HTMLCanvasElement,
  grid: PixelGrid,
  showGrid: boolean,
): void {
  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const color = getPixelColor(grid, x, y);
      if (color !== null) {
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL_SCALE, y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
      }
      if (showGrid) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
        ctx.strokeRect(x * PIXEL_SCALE, y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
      }
    }
  }
}

export function PixelEditor(): React.JSX.Element {
  const [sizeId, setSizeId] = useState<SpriteCanvasSizeId>('16x16');
  const [grid, setGrid] = useState<PixelGrid>(() => createPixelGrid(16, 16));
  const [tool, setTool] = useState<PixelTool>('pencil');
  const [activeColor, setActiveColor] = useState<string>('#d97706');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current !== null) {
      drawGridToCanvas(canvasRef.current, grid, showGrid);
    }
  }, [grid, showGrid]);

  const handleSizeChange = (nextId: SpriteCanvasSizeId): void => {
    const preset = SPRITE_CANVAS_PRESETS.find((p) => p.id === nextId) ?? SPRITE_CANVAS_PRESETS[0]!;
    setSizeId(preset.id);
    setGrid(createPixelGrid(preset.width, preset.height));
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / PIXEL_SCALE);
    const y = Math.floor((event.clientY - rect.top) / PIXEL_SCALE);

    if (tool === 'eyedropper') {
      const picked = getPixelColor(grid, x, y);
      if (picked !== null) {
        setActiveColor(picked);
        setTool('pencil');
      }
      return;
    }

    setGrid(setPixelColor(grid, x, y, tool === 'eraser' ? null : activeColor));
  };

  const handleExportPng = (): void => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = grid.width;
    exportCanvas.height = grid.height;
    const ctx = exportCanvas.getContext('2d');
    if (ctx === null) {
      return;
    }
    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        const color = getPixelColor(grid, x, y);
        if (color !== null) {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    const link = document.createElement('a');
    link.download = `sprite-${sizeId}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="module-card">
      <div className="module-toolbar">
        <h3>Pixel-Art Quick Touch-up</h3>
        <div className="inline-row">
          {SPRITE_CANVAS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={sizeId === preset.id ? 'season-btn active' : 'season-btn'}
              onClick={() => { handleSizeChange(preset.id); }}
            >
              {preset.id}
            </button>
          ))}
        </div>
      </div>

      <div className="token-toolbar">
        {(['pencil', 'eyedropper', 'eraser'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tool === t ? 'season-btn active' : 'season-btn'}
            onClick={() => { setTool(t); }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <input
          type="color"
          value={activeColor}
          onChange={(e) => { setActiveColor(e.target.value); }}
        />
        {QUICK_PALETTE.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className="swatch-btn"
            style={{ backgroundColor: swatch }}
            onClick={() => {
              setActiveColor(swatch);
              setTool('pencil');
            }}
          />
        ))}
        <button
          type="button"
          className="secondary-btn"
          onClick={() => { setShowGrid(!showGrid); }}
        >
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </button>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => { setGrid(createPixelGrid(grid.width, grid.height)); }}
        >
          Clear
        </button>
        <button type="button" className="secondary-btn" onClick={handleExportPng}>
          Download PNG
        </button>
      </div>

      <div className="pixel-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={grid.width * PIXEL_SCALE}
          height={grid.height * PIXEL_SCALE}
          className="pixel-canvas"
          onClick={handleCanvasClick}
        />
      </div>
    </div>
  );
}
