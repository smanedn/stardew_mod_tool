import type { CropEditEntry, ObjectEditEntry } from '../../data/models/index.js';

export interface CropWizardProps {
  readonly uniqueId: string;
  readonly crops: readonly CropEditEntry[];
  readonly objects: readonly ObjectEditEntry[];
  readonly onAddCrop: (entry: CropEditEntry) => void;
  readonly onUpdateCrop: (entry: CropEditEntry) => void;
  readonly onRemoveCrop: (id: string) => void;
}

const SEASONS: readonly string[] = ['Spring', 'Summer', 'Fall', 'Winter'];

function parseGrowthStages(raw: string): readonly number[] {
  const parsed = raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((num) => !Number.isNaN(num) && num > 0);
  return parsed.length > 0 ? parsed : [1];
}

function CropCard(props: {
  readonly entry: CropEditEntry;
  readonly objects: readonly ObjectEditEntry[];
  readonly onUpdate: (entry: CropEditEntry) => void;
  readonly onRemove: (id: string) => void;
}): React.JSX.Element {
  const { entry } = props;
  const totalDays = entry.daysInPhase.reduce((sum, days) => sum + days, 0);

  const toggleSeason = (season: string): void => {
    const exists = entry.seasons.includes(season);
    const nextSeasons = exists
      ? entry.seasons.filter((s) => s !== season)
      : [...entry.seasons, season];
    if (nextSeasons.length > 0) {
      props.onUpdate({ ...entry, seasons: nextSeasons });
    }
  };

  return (
    <div className="module-card">
      <div className="module-card-header">
        <strong>Crop: {entry.harvestItemId}</strong>
        <span className="template-badge">Matures in {String(totalDays)} days</span>
        <button
          type="button"
          className="danger-btn"
          onClick={() => { props.onRemove(entry.id); }}
        >
          Remove
        </button>
      </div>

      <div className="inline-row">
        <label className="form-field">
          <span>Seed Item ID</span>
          <input
            type="text"
            value={entry.seedItemId}
            onChange={(e) => { props.onUpdate({ ...entry, seedItemId: e.target.value }); }}
          />
        </label>
        <label className="form-field">
          <span>Harvested Crop Item ID</span>
          <input
            type="text"
            list={`crop-objects-${entry.id}`}
            value={entry.harvestItemId}
            onChange={(e) => { props.onUpdate({ ...entry, harvestItemId: e.target.value }); }}
          />
          <datalist id={`crop-objects-${entry.id}`}>
            {props.objects.map((obj) => (
              <option key={obj.id} value={obj.itemId}>
                {obj.displayName}
              </option>
            ))}
          </datalist>
        </label>
      </div>

      <div className="form-field">
        <span>Valid Seasons</span>
        <div className="inline-row">
          {SEASONS.map((season) => {
            const active = entry.seasons.includes(season);
            return (
              <button
                key={season}
                type="button"
                className={active ? 'season-btn active' : 'season-btn'}
                onClick={() => { toggleSeason(season); }}
              >
                {season}
              </button>
            );
          })}
        </div>
      </div>

      <label className="form-field">
        <span>Growth Stages (days per stage, comma-separated)</span>
        <input
          type="text"
          value={entry.daysInPhase.join(', ')}
          onChange={(e) => {
            props.onUpdate({ ...entry, daysInPhase: parseGrowthStages(e.target.value) });
          }}
        />
      </label>
    </div>
  );
}

export function CropWizard(props: CropWizardProps): React.JSX.Element {
  const handleAdd = (): void => {
    const nextIndex = props.crops.length + 1;
    const defaultHarvest = props.objects[0]?.itemId ?? `${props.uniqueId}_Crop${String(nextIndex)}`;
    props.onAddCrop({
      kind: 'crop',
      id: `edit-crop-${String(Date.now())}`,
      seedItemId: `${props.uniqueId}_Seeds${String(nextIndex)}`,
      harvestItemId: defaultHarvest,
      seasons: ['Spring'],
      daysInPhase: [1, 2, 2, 2],
    });
  };

  const previewCrop = props.crops[0];
  const previewTotalDays = previewCrop
    ? previewCrop.daysInPhase.reduce((sum, days) => sum + days, 0)
    : 0;

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Crops & Seeds Wizard ({String(props.crops.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAdd}>
            + New Crop
          </button>
        </div>
        {props.crops.length === 0 ? (
          <p className="muted-text">
            No crops yet. Click &quot;+ New Crop&quot; to link seeds and growth stages.
          </p>
        ) : (
          props.crops.map((entry) => (
            <CropCard
              key={entry.id}
              entry={entry}
              objects={props.objects}
              onUpdate={props.onUpdateCrop}
              onRemove={props.onRemoveCrop}
            />
          ))
        )}
      </div>

      <aside className="json-preview-panel">
        <h4>Live Crop Growth Preview</h4>
        {previewCrop !== undefined ? (
          <>
            <div className="sdv-tooltip-box">
              <div className="sdv-tooltip-title">{previewCrop.harvestItemId}</div>
              <div className="sdv-tooltip-category">
                Seasons: {previewCrop.seasons.join(', ')}
              </div>
              <hr className="sdv-divider" />
              <div className="token-toolbar">
                {previewCrop.daysInPhase.map((days, idx) => (
                  <span key={idx} className="template-badge">
                    Stage {String(idx + 1)}: {String(days)}d
                  </span>
                ))}
              </div>
              <div className="sdv-price-row">
                Total Maturity: {String(previewTotalDays)} days
              </div>
            </div>
            <h4>Data/Crops JSON</h4>
            <pre>{JSON.stringify(previewCrop, null, 2)}</pre>
          </>
        ) : (
          <p className="muted-text">Add a crop to see its growth timeline & JSON.</p>
        )}
      </aside>
    </div>
  );
}
