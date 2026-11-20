import { COMMON_VILLAGERS } from '../../core/engine/dialogue-tokens.js';
import type { EventEditEntry, EventLocationId } from '../../data/models/index.js';

export interface EventBuilderProps {
  readonly uniqueId: string;
  readonly events: readonly EventEditEntry[];
  readonly onAddEvent: (entry: EventEditEntry) => void;
  readonly onUpdateEvent: (entry: EventEditEntry) => void;
  readonly onRemoveEvent: (id: string) => void;
}

const LOCATIONS: readonly EventLocationId[] = ['Town', 'Farm', 'Saloon', 'Beach'];

export function EventBuilder(props: EventBuilderProps): React.JSX.Element {
  const handleAdd = (): void => {
    props.onAddEvent({
      kind: 'event',
      id: `edit-event-${String(Date.now())}`,
      location: 'Town',
      eventId: `${props.uniqueId}_Event1`,
      npcName: 'Abigail',
      dialogueText: 'Hey @! Meet me in town when you have a moment!',
      minHearts: 2,
    });
  };

  const preview = props.events[0];

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Cutscene / Event Builder ({String(props.events.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAdd}>
            + Add Cutscene
          </button>
        </div>

        {props.events.length === 0 ? (
          <p className="muted-text">
            Build simple villager heart events without writing raw event script syntax!
          </p>
        ) : (
          props.events.map((entry) => (
            <div key={entry.id} className="module-card">
              <div className="module-card-header">
                <strong>
                  {entry.location} — {entry.npcName} ({String(entry.minHearts)} Hearts)
                </strong>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => { props.onRemoveEvent(entry.id); }}
                >
                  Remove
                </button>
              </div>
              <div className="inline-row">
                <label className="form-field">
                  <span>Location</span>
                  <select
                    value={entry.location}
                    onChange={(e) => {
                      const val = e.target.value;
                      const location: EventLocationId =
                        val === 'Farm' || val === 'Saloon' || val === 'Beach' ? val : 'Town';
                      props.onUpdateEvent({ ...entry, location });
                    }}
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Villager</span>
                  <select
                    value={entry.npcName}
                    onChange={(e) => {
                      props.onUpdateEvent({ ...entry, npcName: e.target.value });
                    }}
                  >
                    {COMMON_VILLAGERS.map((npc) => (
                      <option key={npc} value={npc}>
                        {npc}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Required Hearts (0-14)</span>
                  <input
                    type="number"
                    min={0}
                    max={14}
                    value={entry.minHearts}
                    onChange={(e) => {
                      const hearts = Math.max(0, Math.min(14, Number(e.target.value) || 0));
                      props.onUpdateEvent({ ...entry, minHearts: hearts });
                    }}
                  />
                </label>
              </div>
              <label className="form-field">
                <span>What does {entry.npcName} say in the cutscene?</span>
                <textarea
                  rows={2}
                  value={entry.dialogueText}
                  onChange={(e) => {
                    props.onUpdateEvent({ ...entry, dialogueText: e.target.value });
                  }}
                />
              </label>
            </div>
          ))
        )}
      </div>

      <aside className="json-preview-panel">
        <h4>Live Cutscene Preview</h4>
        {preview !== undefined ? (
          <div className="sdv-tooltip-box">
            <div className="sdv-tooltip-title">
              {preview.location} Cutscene ({String(preview.minHearts)}♥)
            </div>
            <div className="sdv-tooltip-category">Starring: {preview.npcName}</div>
            <hr className="sdv-divider" />
            <p className="sdv-tooltip-desc">
              {preview.npcName}: &quot;{preview.dialogueText.replace(/@/g, 'Farmer')}&quot;
            </p>
          </div>
        ) : (
          <p className="muted-text">Add a cutscene to preview it here.</p>
        )}
      </aside>
    </div>
  );
}
