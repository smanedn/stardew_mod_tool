import { useEffect, useRef, useState } from 'react';
import {
  type PixelGrid,
  type PixelTemplateId,
  SPRITE_CANVAS_PRESETS,
  SPRITE_TEMPLATES,
  type SpriteCanvasSizeId,
  createPixelGrid,
  createPixelGridFromTemplate,
  floodFillPixels,
  getPixelColor,
  setPixelColor,
} from '../../core/engine/pixel-grid.js';

import type { LinkedAssetEntry } from '../../data/models/index.js';

export interface PixelEditorProps {
  readonly onSaveSpriteToMod?: (asset: LinkedAssetEntry) => void;
}

type PixelTool = 'pencil' | 'fill' | 'eyedropper' | 'eraser';

const MAX_CANVAS_UNDO = 40;

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

export function PixelEditor(props: PixelEditorProps = {}): React.JSX.Element {
  const [sizeId, setSizeId] = useState<SpriteCanvasSizeId>('16x16');
  const [grid, setGrid] = useState<PixelGrid>(() => createPixelGrid(16, 16));
  const [undoStack, setUndoStack] = useState<readonly PixelGrid[]>([]);
  const [tool, setTool] = useState<PixelTool>('pencil');
  const [activeColor, setActiveColor] = useState<string>('#d97706');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const strokeStartRef = useRef<PixelGrid | null>(null);

  useEffect(() => {
    if (canvasRef.current !== null) {
      drawGridToCanvas(canvasRef.current, grid, showGrid);
    }
    const preview = previewCanvasRef.current;
    const pCtx = preview?.getContext('2d') ?? null;
    if (preview !== null && pCtx !== null) {
      pCtx.clearRect(0, 0, preview.width, preview.height);
      for (let y = 0; y < grid.height; y += 1) {
        for (let x = 0; x < grid.width; x += 1) {
          const c = getPixelColor(grid, x, y);
          if (c !== null) {
            pCtx.fillStyle = c;
            pCtx.fillRect(x * 4, y * 4, 4, 4);
          }
        }
      }
    }
  }, [grid, showGrid]);

  const commitGrid = (nextGrid: PixelGrid): void => {
    if (nextGrid === grid) {
      return;
    }
    setUndoStack((prev) => [...prev.slice(-(MAX_CANVAS_UNDO - 1)), grid]);
    setGrid(nextGrid);
  };

  const handleCanvasUndo = (): void => {
    if (undoStack.length === 0) {
      return;
    }
    const previous = undoStack[undoStack.length - 1];
    if (previous === undefined) {
      return;
    }
    setUndoStack((prev) => prev.slice(0, -1));
    setGrid(previous);
  };

  const handleSizeChange = (nextId: SpriteCanvasSizeId): void => {
    const preset = SPRITE_CANVAS_PRESETS.find((p) => p.id === nextId) ?? {
      id: '16x16' as const,
      width: 16,
      height: 16,
    };
    setSizeId(preset.id);
    setUndoStack([]);
    setGrid(createPixelGrid(preset.width, preset.height));
  };

  const handleApplyTemplate = (templateId: PixelTemplateId): void => {
    setSizeId('16x16');
    commitGrid(createPixelGridFromTemplate(templateId));
  };

  const getCellCoords = (
    event: React.PointerEvent<HTMLCanvasElement>,
  ): { readonly x: number; readonly y: number } | null => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor((event.clientX - rect.left) / PIXEL_SCALE),
      y: Math.floor((event.clientY - rect.top) / PIXEL_SCALE),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const coords = getCellCoords(event);
    if (coords === null) {
      return;
    }
    if (tool === 'eyedropper') {
      const picked = getPixelColor(grid, coords.x, coords.y);
      if (picked !== null) {
        setActiveColor(picked);
        setTool('pencil');
      }
      return;
    }
    if (tool === 'fill') {
      commitGrid(floodFillPixels(grid, coords.x, coords.y, activeColor));
      return;
    }
    isDrawingRef.current = true;
    strokeStartRef.current = grid;
    setGrid(setPixelColor(grid, coords.x, coords.y, tool === 'eraser' ? null : activeColor));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!isDrawingRef.current || (tool !== 'pencil' && tool !== 'eraser')) {
      return;
    }
    const coords = getCellCoords(event);
    if (coords === null) {
      return;
    }
    const nextColor = tool === 'eraser' ? null : activeColor;
    if (getPixelColor(grid, coords.x, coords.y) !== nextColor) {
      setGrid((prev) => setPixelColor(prev, coords.x, coords.y, nextColor));
    }
  };

  const handlePointerEnd = (): void => {
    if (!isDrawingRef.current) {
      return;
    }
    isDrawingRef.current = false;
    const startGrid = strokeStartRef.current;
    strokeStartRef.current = null;
    if (startGrid !== null && startGrid !== grid) {
      setUndoStack((prev) => [...prev.slice(-(MAX_CANVAS_UNDO - 1)), startGrid]);
    }
  };

  const buildExportDataUrl = (): string | null => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = grid.width;
    exportCanvas.height = grid.height;
    const ctx = exportCanvas.getContext('2d');
    if (ctx === null) {
      return null;
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
    return exportCanvas.toDataURL('image/png');
  };

  const handleExportPng = (): void => {
    const dataUrl = buildExportDataUrl();
    if (dataUrl === null) {
      return;
    }
    const link = document.createElement('a');
    link.download = `sprite-${sizeId}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleSaveToMod = (): void => {
    const dataUrl = buildExportDataUrl();
    if (dataUrl === null || props.onSaveSpriteToMod === undefined) {
      return;
    }
    const base64 = dataUrl.split(',')[1] ?? '';
    const id = `pixel-${String(Date.now())}`;
    const relativePath = `assets/custom-sprite-${sizeId}.png`;
    props.onSaveSpriteToMod({ id, relativePath, kind: 'png', dataBase64: base64 });
    setSavedNotice(`Added ${relativePath} to your mod .zip!`);
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
        {(['pencil', 'fill', 'eyedropper', 'eraser'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tool === t ? 'season-btn active' : 'season-btn'}
            onClick={() => { setTool(t); }}
          >
            {t === 'fill' ? 'Fill Bucket' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <input
          type="color"
          aria-label="Custom color picker"
          value={activeColor}
          onChange={(e) => { setActiveColor(e.target.value); }}
        />
        {QUICK_PALETTE.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`Select color ${swatch}`}
            className="swatch-btn"
            style={{ backgroundColor: swatch }}
            onClick={() => {
              setActiveColor(swatch);
              if (tool === 'eyedropper' || tool === 'eraser') {
                setTool('pencil');
              }
            }}
          />
        ))}
        <button
          type="button"
          className="secondary-btn"
          disabled={undoStack.length === 0}
          onClick={handleCanvasUndo}
        >
          Undo ({String(undoStack.length)})
        </button>
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
          onClick={() => { commitGrid(createPixelGrid(grid.width, grid.height)); }}
        >
          Clear
        </button>
        <button type="button" className="secondary-btn" onClick={handleExportPng}>
          Download PNG
        </button>
        {props.onSaveSpriteToMod !== undefined && (
          <button type="button" className="launch-btn" onClick={handleSaveToMod}>
            Add Sprite to Mod
          </button>
        )}
      </div>

      <div className="token-toolbar">
        <span className="muted-text">16x16 Starter Outlines:</span>
        {SPRITE_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className="secondary-btn"
            onClick={() => { handleApplyTemplate(tpl.id); }}
          >
            {tpl.label}
          </button>
        ))}
      </div>
      {savedNotice !== null && <p className="muted-text">{savedNotice}</p>}

      <div className="pixel-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={grid.width * PIXEL_SCALE}
          height={grid.height * PIXEL_SCALE}
          aria-label="Pixel art sprite canvas"
          className="pixel-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
        />
        <div className="pixel-live-preview">
          <span className="muted-text">Live Sprite Preview (4x)</span>
          <canvas
            ref={previewCanvasRef}
            width={grid.width * 4}
            height={grid.height * 4}
            className="pixel-canvas"
          />
        </div>
      </div>
    </div>
  );
}
