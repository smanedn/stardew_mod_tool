import { useState } from 'react';
import {
  type SpriteGalleryCategory,
  VANILLA_SPRITE_GALLERY,
  type VanillaSpritePreset,
  calculateEditImageAreas,
} from '../../core/engine/sprite-patcher.js';
import type { LinkedAssetEntry, RetextureEditEntry } from '../../data/models/index.js';

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

export function RetexturePatcher(props: RetexturePatcherProps): React.JSX.Element {
  const [categoryFilter, setCategoryFilter] = useState<'All' | SpriteGalleryCategory>('All');
  const [selectedPreset, setSelectedPreset] = useState<VanillaSpritePreset>(
    VANILLA_SPRITE_GALLERY[0] ?? DEFAULT_PRESET,
  );
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);

  const filteredGallery =
    categoryFilter === 'All'
      ? VANILLA_SPRITE_GALLERY
      : VANILLA_SPRITE_GALLERY.filter((item) => item.category === categoryFilter);

  const handleSpriteUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    void Promise.all([readImageDimensions(file), readFileAsBase64(file)]).then(
      ([{ width, height }, dataBase64]) => {
        const { fromArea, toArea } = calculateEditImageAreas(selectedPreset, width, height);
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
            target: selectedPreset.target,
            assetId,
            fromArea,
            toArea,
          },
          asset,
        );
        const dims = `${String(width)}x${String(height)}px`;
        const pos = `${String(toArea.X)}, ${String(toArea.Y)}`;
        const size = `${String(toArea.Width)}x${String(toArea.Height)}`;
        setUploadInfo(`Uploaded ${file.name} (${dims}) -> ToArea (${pos}, ${size})`);
      },
    );
  };

  const previewAreas = calculateEditImageAreas(selectedPreset);

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
                onClick={() => { setSelectedPreset(preset); }}
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

        <div className="module-card">
          <h3>2. Upload Modified Sprite (.png)</h3>
          <p className="muted-text">
            Target: <strong>{selectedPreset.target}</strong> ({String(selectedPreset.tileWidth)}x
            {String(selectedPreset.tileHeight)}px)
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
