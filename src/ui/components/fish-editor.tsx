import type {
  FishBehaviorId,
  FishEditEntry,
  FishLocationId,
  FishWeatherId,
  LinkedAssetEntry,
} from '../../data/models/index.js';

export interface FishEditorProps {
  readonly uniqueId: string;
  readonly fishList: readonly FishEditEntry[];
  readonly assets?: readonly LinkedAssetEntry[];
  readonly onAddFish: (entry: FishEditEntry) => void;
  readonly onUpdateFish: (entry: FishEditEntry) => void;
  readonly onRemoveFish: (id: string) => void;
}

const BEHAVIORS: readonly FishBehaviorId[] = ['smooth', 'dart', 'sinker', 'floater'];
const WEATHERS: readonly FishWeatherId[] = ['sunny', 'rainy', 'both'];
const WATER_LOCATIONS: readonly FishLocationId[] = ['River', 'Ocean', 'Lake'];
const SEASONS: readonly string[] = ['Spring', 'Summer', 'Fall', 'Winter'];

function parseBehavior(val: string): FishBehaviorId {
  return val === 'dart' || val === 'sinker' || val === 'floater' ? val : 'smooth';
}

function parseWeather(val: string): FishWeatherId {
  return val === 'sunny' || val === 'rainy' ? val : 'both';
}

function parseWaterLocation(val: string): FishLocationId {
  return val === 'Ocean' || val === 'Lake' ? val : 'River';
}

export function FishEditor(props: FishEditorProps): React.JSX.Element {
  const handleAdd = (): void => {
    const idx = String(props.fishList.length + 1);
    props.onAddFish({
      kind: 'fish',
      id: `edit-fish-${String(Date.now())}`,
      fishId: `${props.uniqueId}_Starfish${idx}`,
      displayName: `Starlight Trout ${idx}`,
      minSize: 8,
      maxSize: 24,
      difficulty: 45,
      behavior: 'smooth',
      seasons: ['Spring', 'Summer'],
      weather: 'both',
      waterLocation: 'River',
      price: 180,
    });
  };

  const toggleSeason = (entry: FishEditEntry, season: string): void => {
    const exists = entry.seasons.includes(season);
    const next = exists ? entry.seasons.filter((s) => s !== season) : [...entry.seasons, season];
    if (next.length > 0) {
      props.onUpdateFish({ ...entry, seasons: next });
    }
  };

  const preview = props.fishList[0];

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Fish &amp; Fishing Locations ({String(props.fishList.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAdd}>
            + Add Fish
          </button>
        </div>

        {props.fishList.length === 0 ? (
          <p className="muted-text">
            Create custom fish with size range, difficulty, behavior, weather, and water location!
          </p>
        ) : (
          props.fishList.map((entry) => (
            <div key={entry.id} className="module-card">
              <div className="module-card-header">
                <strong>
                  🐟 {entry.displayName} ({entry.waterLocation})
                </strong>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => { props.onRemoveFish(entry.id); }}
                >
                  Remove
                </button>
              </div>
              <div className="inline-row">
                <label className="form-field">
                  <span>Fish Name</span>
                  <input
                    type="text"
                    value={entry.displayName}
                    onChange={(e) => {
                      props.onUpdateFish({ ...entry, displayName: e.target.value });
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>Water Location</span>
                  <select
                    value={entry.waterLocation}
                    onChange={(e) => {
                      props.onUpdateFish({
                        ...entry,
                        waterLocation: parseWaterLocation(e.target.value),
                      });
                    }}
                  >
                    {WATER_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Weather</span>
                  <select
                    value={entry.weather}
                    onChange={(e) => {
                      props.onUpdateFish({ ...entry, weather: parseWeather(e.target.value) });
                    }}
                  >
                    {WEATHERS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="inline-row">
                <label className="form-field">
                  <span>Behavior</span>
                  <select
                    value={entry.behavior}
                    onChange={(e) => {
                      props.onUpdateFish({ ...entry, behavior: parseBehavior(e.target.value) });
                    }}
                  >
                    {BEHAVIORS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Difficulty (5-110)</span>
                  <input
                    type="number"
                    min={5}
                    max={110}
                    value={entry.difficulty}
                    onChange={(e) => {
                      const diff = Math.max(5, Math.min(110, Number(e.target.value) || 5));
                      props.onUpdateFish({ ...entry, difficulty: diff });
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>Min Size (in)</span>
                  <input
                    type="number"
                    min={1}
                    value={entry.minSize}
                    onChange={(e) => {
                      props.onUpdateFish({
                        ...entry,
                        minSize: Math.max(1, Number(e.target.value) || 1),
                      });
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>Max Size (in)</span>
                  <input
                    type="number"
                    min={1}
                    value={entry.maxSize}
                    onChange={(e) => {
                      props.onUpdateFish({
                        ...entry,
                        maxSize: Math.max(1, Number(e.target.value) || 1),
                      });
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>Price (g)</span>
                  <input
                    type="number"
                    min={0}
                    value={entry.price}
                    onChange={(e) => {
                      props.onUpdateFish({
                        ...entry,
                        price: Math.max(0, Number(e.target.value) || 0),
                      });
                    }}
                  />
                </label>
                {(props.assets ?? []).length > 0 && (
                  <label className="form-field">
                    <span>Sprite Asset</span>
                    <select
                      value={entry.assetId ?? ''}
                      onChange={(e) => {
                        const nextAsset = e.target.value;
                        props.onUpdateFish({
                          ...entry,
                          assetId: nextAsset.length > 0 ? nextAsset : undefined,
                        });
                      }}
                    >
                      <option value="">None (Default)</option>
                      {(props.assets ?? []).map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.relativePath}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <div className="form-field">
                <span>Seasons</span>
                <div className="inline-row">
                  {SEASONS.map((season) => (
                    <button
                      key={season}
                      type="button"
                      className={
                        entry.seasons.includes(season) ? 'season-btn active' : 'season-btn'
                      }
                      onClick={() => { toggleSeason(entry, season); }}
                    >
                      {season}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <aside className="json-preview-panel">
        <h4>Live Fish Preview</h4>
        {preview !== undefined ? (
          <div className="sdv-tooltip-box">
            <div className="sdv-tooltip-title">🐟 {preview.displayName}</div>
            <div className="sdv-tooltip-category">
              {preview.waterLocation} • {preview.seasons.join(', ')} ({preview.weather})
            </div>
            <hr className="sdv-divider" />
            <p className="sdv-tooltip-desc">
              Size: {String(preview.minSize)}–{String(preview.maxSize)} in • Difficulty:{' '}
              {String(preview.difficulty)} ({preview.behavior})
            </p>
            <div className="sdv-price-row">Sell Price: {String(preview.price)}g</div>
          </div>
        ) : (
          <p className="muted-text">Add a fish to preview its stats and spawn info here.</p>
        )}
      </aside>
    </div>
  );
}
