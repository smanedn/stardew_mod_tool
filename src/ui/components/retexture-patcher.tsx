import { useState } from 'react';
import {
  SPRITESHEET_TARGETS,
  type SpriteGalleryCategory,
  type SpritesheetTargetInfo,
  VANILLA_SPRITE_GALLERY,
  type VanillaSpritePreset,
  calculateEditImageAreas,
  computeTileToArea,
} from '../../core/engine/sprite-patcher.js';
import type { AreaRect, LinkedAssetEntry, RetextureEditEntry } from '../../data/models/index.js';

export interface RetexturePatcherProps {
  readonly retextures: readonly RetextureEditEntry[];
  readonly assets: readonly LinkedAssetEntry[];
  readonly onAddRetexture: (entry: RetextureEditEntry, newAsset?: LinkedAssetEntry) => void;
  readonly onRemoveRetexture: (id: string) => void;
}

const CATEGORIES: readonly ('All' | SpriteGalleryCategory)[] = [
  'All',
  'Tool',
  'Animal',
  'Furniture',
  'Object',
];

function readFileAsBase64(file: File): Promise<string> {
  return file.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  });
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = (): void => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = (): void => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode uploaded PNG image.'));
    };
    img.src = url;
  });
}

const DEFAULT_PRESET: VanillaSpritePreset = {
  id: 'tool-axe',
  name: 'Axe (Steel)',
  category: 'Tool',
  target: 'TileSheets/tools',
  spriteIndex: 215,
  tileWidth: 16,
  tileHeight: 16,
  sheetColumns: 21,
};

function TileGridPickerCard(props: {
  readonly activeSheet: SpritesheetTargetInfo;
  readonly selectedTile: { readonly col: number; readonly row: number };
  readonly onSelectSheet: (sheet: SpritesheetTargetInfo) => void;
  readonly onSelectTile: (col: number, row: number) => void;
}): React.JSX.Element {
  const rows = Array.from({ length: props.activeSheet.previewRows }, (_, r) => r);
  const cols = Array.from({ length: props.activeSheet.columns }, (_, c) => c);
  const area = computeTileToArea(
    props.selectedTile.col,
    props.selectedTile.row,
    props.activeSheet.tileWidth,
    props.activeSheet.tileHeight,
  );

  return (
    <div className="module-card">
      <h3>Visual 16x16 Spritesheet Tile Picker</h3>
      <div className="inline-row">
        {SPRITESHEET_TARGETS.map((sheet) => (
          <button
            key={sheet.target}
            type="button"
            className={
              props.activeSheet.target === sheet.target ? 'season-btn active' : 'season-btn'
            }
            onClick={() => { props.onSelectSheet(sheet); }}
          >
            {sheet.label}
          </button>
        ))}
      </div>
      <div
        className="spritesheet-tile-grid"
        style={{ gridTemplateColumns: `repeat(${String(props.activeSheet.columns)}, 1fr)` }}
        aria-label={`${props.activeSheet.target} 16x16 tile grid`}
      >
        {rows.flatMap((r) =>
          cols.map((c) => {
            const idx = r * props.activeSheet.columns + c;
            const isSelected = props.selectedTile.col === c && props.selectedTile.row === r;
            return (
              <button
                key={idx}
                type="button"
                className={isSelected ? 'spritesheet-tile active' : 'spritesheet-tile'}
                title={`Tile #${String(idx)} (X:${String(c * 16)}, Y:${String(r * 16)})`}
                onClick={() => { props.onSelectTile(c, r); }}
              >
                {String(idx)}
              </button>
            );
          }),
        )}
      </div>
      <p className="muted-text">
        Selected ToArea: X={String(area.X)}, Y={String(area.Y)}, Width={String(area.Width)}, Height=
        {String(area.Height)}
      </p>
    </div>
  );
}

export function RetexturePatcher(props: RetexturePatcherProps): React.JSX.Element {
  const [categoryFilter, setCategoryFilter] = useState<'All' | SpriteGalleryCategory>('All');
  const [selectedPreset, setSelectedPreset] = useState<VanillaSpritePreset>(
    VANILLA_SPRITE_GALLERY[0] ?? DEFAULT_PRESET,
  );
  const [activeSheet, setActiveSheet] = useState<SpritesheetTargetInfo>(
    SPRITESHEET_TARGETS[0] ?? {
      target: 'Maps/springobjects',
      label: 'Maps/springobjects',
      columns: 16,
      previewRows: 6,
      tileWidth: 16,
      tileHeight: 16,
    },
  );
  const [selectedTile, setSelectedTile] = useState<{ readonly col: number; readonly row: number }>({
    col: 0,
    row: 0,
  });
  const [useTilePicker, setUseTilePicker] = useState<boolean>(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);

  const filteredGallery =
    categoryFilter === 'All'
      ? VANILLA_SPRITE_GALLERY
      : VANILLA_SPRITE_GALLERY.filter((item) => item.category === categoryFilter);

  const activeTarget = useTilePicker ? activeSheet.target : selectedPreset.target;
  const activeToArea: AreaRect = useTilePicker
    ? computeTileToArea(
        selectedTile.col,
        selectedTile.row,
        activeSheet.tileWidth,
        activeSheet.tileHeight,
      )
    : calculateEditImageAreas(selectedPreset).toArea;

  const handleSpriteUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    void Promise.all([readImageDimensions(file), readFileAsBase64(file)]).then(
      ([{ width, height }, dataBase64]) => {
        const fromArea: AreaRect = useTilePicker
          ? {
              X: 0,
              Y: 0,
              Width: Math.max(1, Math.min(width, 16)),
              Height: Math.max(1, Math.min(height, 16)),
            }
          : calculateEditImageAreas(selectedPreset, width, height).fromArea;
        const assetId = `asset-${String(Date.now())}`;
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
        const asset: LinkedAssetEntry = {
          id: assetId,
          relativePath: `assets/${safeName}`,
          kind: 'png',
          dataBase64,
        };
        props.onAddRetexture(
          {
            kind: 'retexture',
            id: `edit-retexture-${String(Date.now())}`,
            target: activeTarget,
            assetId,
            fromArea,
            toArea: activeToArea,
          },
          asset,
        );
        const dims = `${String(width)}x${String(height)}px`;
        const pos = `${String(activeToArea.X)}, ${String(activeToArea.Y)}`;
        const size = `${String(activeToArea.Width)}x${String(activeToArea.Height)}`;
        setUploadInfo(`Uploaded ${file.name} (${dims}) -> ToArea (${pos}, ${size})`);
      },
    );
  };

  const previewAreas = {
    fromArea: calculateEditImageAreas(selectedPreset).fromArea,
    toArea: activeToArea,
  };

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-card">
          <h3>1. Select Vanilla Sprite from Gallery</h3>
          <div className="inline-row">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={categoryFilter === cat ? 'season-btn active' : 'season-btn'}
                onClick={() => { setCategoryFilter(cat); }}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="template-grid">
            {filteredGallery.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={
                  selectedPreset.id === preset.id ? 'template-card selected-card' : 'template-card'
                }
                onClick={() => {
                  setSelectedPreset(preset);
                  setUseTilePicker(false);
                }}
              >
                <span className="template-badge">{preset.category}</span>
                <strong>{preset.name}</strong>
                <span className="muted-text">
                  {preset.target} (#{String(preset.spriteIndex)})
                </span>
              </button>
            ))}
          </div>
        </div>

        <TileGridPickerCard
          activeSheet={activeSheet}
          selectedTile={selectedTile}
          onSelectSheet={(sheet) => {
            setActiveSheet(sheet);
            setUseTilePicker(true);
          }}
          onSelectTile={(col, row) => {
            setSelectedTile({ col, row });
            setUseTilePicker(true);
          }}
        />

        <div className="module-card">
          <h3>2. Upload Modified Sprite (.png)</h3>
          <p className="muted-text">
            Target: <strong>{activeTarget}</strong> ({String(activeToArea.Width)}x
            {String(activeToArea.Height)}px)
          </p>
          <label className="file-upload-btn">
            Upload Replacement PNG
            <input type="file" accept=".png,image/png" onChange={handleSpriteUpload} hidden />
          </label>
          {uploadInfo !== null && <p className="muted-text">{uploadInfo}</p>}
        </div>

        <div className="module-card">
          <h3>Active EditImage Patches ({String(props.retextures.length)})</h3>
          {props.retextures.map((item) => (
            <div key={item.id} className="recent-item">
              <div>
                <strong>{item.target}</strong>
                <div className="muted-text">
                  FromArea: {JSON.stringify(item.fromArea)} | ToArea: {JSON.stringify(item.toArea)}
                </div>
              </div>
              <button
                type="button"
                className="danger-btn"
                onClick={() => { props.onRemoveRetexture(item.id); }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <aside className="json-preview-panel">
        <h4>Live EditImage Preview</h4>
        <div className="sdv-tooltip-box">
          <div className="sdv-tooltip-title">{selectedPreset.name}</div>
          <div className="sdv-tooltip-category">{selectedPreset.target}</div>
          <hr className="sdv-divider" />
          <div className="sdv-price-row">
            Tile Size: {String(selectedPreset.tileWidth)}x{String(selectedPreset.tileHeight)}px
          </div>
        </div>
        <h4>Calculated Patch Coordinates</h4>
        <pre>
          {JSON.stringify(
            {
              Action: 'EditImage',
              Target: selectedPreset.target,
              FromArea: previewAreas.fromArea,
              ToArea: previewAreas.toArea,
            },
            null,
            2,
          )}
        </pre>
      </aside>
    </div>
  );
}
