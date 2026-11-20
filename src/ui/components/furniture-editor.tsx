import type {
  FurnitureEditEntry,
  FurnitureTileSize,
  FurnitureTypeId,
  LinkedAssetEntry,
} from '../../data/models/index.js';

export interface FurnitureEditorProps {
  readonly uniqueId: string;
  readonly furniture: readonly FurnitureEditEntry[];
  readonly assets?: readonly LinkedAssetEntry[];
  readonly onAddFurniture: (entry: FurnitureEditEntry) => void;
  readonly onUpdateFurniture: (entry: FurnitureEditEntry) => void;
  readonly onRemoveFurniture: (id: string) => void;
}

const FURNITURE_TYPES: ReadonlyArray<{ readonly id: FurnitureTypeId; readonly label: string }> = [
  { id: 'chair', label: '🪑 Chair' },
  { id: 'table', label: '🪵 Table' },
  { id: 'rug', label: '🧶 Rug' },
  { id: 'lamp', label: '💡 Lamp' },
  { id: 'painting', label: '🖼️ Wall Painting' },
];

const TILE_SIZES: readonly FurnitureTileSize[] = ['1x1', '2x1', '2x2'];

function parseFurnitureType(val: string): FurnitureTypeId {
  if (val === 'table' || val === 'rug' || val === 'lamp' || val === 'painting') {
    return val;
  }
  return 'chair';
}

function parseTileSize(val: string): FurnitureTileSize {
  if (val === '2x1' || val === '2x2') {
    return val;
  }
  return '1x1';
}

export function FurnitureEditor(props: FurnitureEditorProps): React.JSX.Element {
  const handleAdd = (): void => {
    const idx = String(props.furniture.length + 1);
    props.onAddFurniture({
      kind: 'furniture',
      id: `edit-furniture-${String(Date.now())}`,
      furnitureId: `${props.uniqueId}_Chair${idx}`,
      displayName: `Cozy Oak Chair ${idx}`,
      furnitureType: 'chair',
      tileSize: '1x1',
      price: 350,
    });
  };

  const preview = props.furniture[0];
  const previewAsset = preview?.assetId
    ? props.assets?.find((a) => a.id === preview.assetId)
    : undefined;

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Furniture &amp; Decoration ({String(props.furniture.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAdd}>
            + Add Furniture
          </button>
        </div>

        {props.furniture.length === 0 ? (
          <p className="muted-text">
            Design custom chairs, tables, rugs, lamps, and wall paintings!
          </p>
        ) : (
          props.furniture.map((entry) => (
            <div key={entry.id} className="module-card">
              <div className="module-card-header">
                <strong>
                  {entry.displayName} ({entry.tileSize})
                </strong>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => { props.onRemoveFurniture(entry.id); }}
                >
                  Remove
                </button>
              </div>
              <div className="inline-row">
                <label className="form-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={entry.displayName}
                    onChange={(e) => {
                      props.onUpdateFurniture({ ...entry, displayName: e.target.value });
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>Type</span>
                  <select
                    value={entry.furnitureType}
                    onChange={(e) => {
                      props.onUpdateFurniture({
                        ...entry,
                        furnitureType: parseFurnitureType(e.target.value),
                      });
                    }}
                  >
                    {FURNITURE_TYPES.map((ft) => (
                      <option key={ft.id} value={ft.id}>
                        {ft.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Tile Size</span>
                  <select
                    value={entry.tileSize}
                    onChange={(e) => {
                      props.onUpdateFurniture({
                        ...entry,
                        tileSize: parseTileSize(e.target.value),
                      });
                    }}
                  >
                    {TILE_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Price (g)</span>
                  <input
                    type="number"
                    min={0}
                    value={entry.price}
                    onChange={(e) => {
                      const nextPrice = Math.max(0, Number(e.target.value) || 0);
                      props.onUpdateFurniture({ ...entry, price: nextPrice });
                    }}
                  />
                </label>
              </div>
              {props.assets !== undefined && props.assets.length > 0 && (
                <label className="form-field">
                  <span>Sprite (Optional)</span>
                  <select
                    value={entry.assetId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      props.onUpdateFurniture({
                        ...entry,
                        assetId: val === '' ? undefined : val,
                      });
                    }}
                  >
                    <option value="">Default Sprite</option>
                    {props.assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.relativePath}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ))
        )}
      </div>

      <aside className="json-preview-panel">
        <h4>Live Furniture Preview</h4>
        {preview !== undefined ? (
          <div className="sdv-tooltip-box">
            <div className="sdv-tooltip-header">
              {previewAsset?.dataBase64 !== undefined && (
                <img
                  src={`data:image/png;base64,${previewAsset.dataBase64}`}
                  alt={preview.displayName}
                  className="sdv-item-icon"
                />
              )}
              <div>
                <div className="sdv-tooltip-title">{preview.displayName}</div>
                <div className="sdv-tooltip-category">
                  {preview.furnitureType} • {preview.tileSize} tiles
                </div>
              </div>
            </div>
            <hr className="sdv-divider" />
            <div className="sdv-price-row">Buy/Sell Price: {String(preview.price)}g</div>
          </div>
        ) : (
          <p className="muted-text">Add a piece of furniture to preview it here.</p>
        )}
      </aside>
    </div>
  );
}
