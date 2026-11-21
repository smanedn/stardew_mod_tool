import { useState } from 'react';
import { COMMON_VILLAGERS } from '../../core/engine/dialogue-tokens.js';
import type {
  EventEditEntry,
  EventLocationId,
  EventTilePos,
  EventTimelineStep,
} from '../../data/models/index.js';
import { EventStagePreview } from './event-stage-preview.js';

export interface EventBuilderProps {
  readonly uniqueId: string;
  readonly events: readonly EventEditEntry[];
  readonly onAddEvent: (entry: EventEditEntry) => void;
  readonly onUpdateEvent: (entry: EventEditEntry) => void;
  readonly onRemoveEvent: (id: string) => void;
}

const LOCATIONS: readonly EventLocationId[] = ['Town', 'Farm', 'Saloon', 'Beach'];
const EMOTE_PRESETS: ReadonlyArray<{ readonly id: number; readonly label: string }> = [
  { id: 20, label: 'Heart ♥' },
  { id: 32, label: 'Happy 😊' },
  { id: 16, label: 'Exclamation ❗' },
  { id: 8, label: 'Question ❓' },
  { id: 12, label: 'Angry 💢' },
];

function createDefaultStep(kind: EventTimelineStep['kind']): EventTimelineStep {
  const id = `step-${String(Date.now())}-${String(Math.floor(Math.random() * 1000))}`;
  switch (kind) {
    case 'walk':
      return { id, kind: 'walk', actor: 'npc', dx: 0, dy: 1, facing: 2 };
    case 'emote':
      return { id, kind: 'emote', actor: 'npc', emoteId: 20 };
    case 'pause':
      return { id, kind: 'pause', durationMs: 500 };
    case 'speak':
      return { id, kind: 'speak', text: 'Hey @! Thanks for coming!$h' };
  }
}

function TimelineStepRow(props: {
  readonly step: EventTimelineStep;
  readonly npcName: string;
  readonly index: number;
  readonly total: number;
  readonly onChange: (next: EventTimelineStep) => void;
  readonly onMove: (delta: -1 | 1) => void;
  readonly onRemove: () => void;
}): React.JSX.Element {
  const { step } = props;
  return (
    <div className="timeline-step-row">
      <span className="template-badge">{step.kind.toUpperCase()}</span>
      {step.kind === 'walk' && (
        <>
          <select
            value={step.actor}
            onChange={(e) => {
              const actor = e.target.value === 'farmer' ? 'farmer' : 'npc';
              props.onChange({ ...step, actor });
            }}
          >
            <option value="npc">{props.npcName}</option>
            <option value="farmer">Farmer</option>
          </select>
          <input
            type="number"
            aria-label="Walk dX"
            value={step.dx}
            onChange={(e) => { props.onChange({ ...step, dx: Number(e.target.value) || 0 }); }}
          />
          <input
            type="number"
            aria-label="Walk dY"
            value={step.dy}
            onChange={(e) => { props.onChange({ ...step, dy: Number(e.target.value) || 0 }); }}
          />
        </>
      )}
      {step.kind === 'emote' && (
        <>
          <select
            value={step.actor}
            onChange={(e) => {
              const actor = e.target.value === 'farmer' ? 'farmer' : 'npc';
              props.onChange({ ...step, actor });
            }}
          >
            <option value="npc">{props.npcName}</option>
            <option value="farmer">Farmer</option>
          </select>
          <select
            value={step.emoteId}
            onChange={(e) => {
            const val = Number(e.target.value) || 20;
            props.onChange({ ...step, emoteId: val });
          }}
          >
            {EMOTE_PRESETS.map((em) => (
              <option key={em.id} value={em.id}>
                {em.label}
              </option>
            ))}
          </select>
        </>
      )}
      {step.kind === 'pause' && (
        <input
          type="number"
          min={100}
          max={10000}
          step={100}
          value={step.durationMs}
          onChange={(e) => {
            props.onChange({ ...step, durationMs: Math.max(100, Number(e.target.value) || 500) });
          }}
        />
      )}
      {step.kind === 'speak' && (
        <input
          type="text"
          value={step.text}
          onChange={(e) => { props.onChange({ ...step, text: e.target.value }); }}
        />
      )}
      <button
        type="button"
        className="secondary-btn"
        disabled={props.index === 0}
        onClick={() => { props.onMove(-1); }}
      >
        ↑
      </button>
      <button
        type="button"
        className="secondary-btn"
        disabled={props.index + 1 >= props.total}
        onClick={() => { props.onMove(1); }}
      >
        ↓
      </button>
      <button type="button" className="danger-btn" onClick={props.onRemove}>
        ✕
      </button>
    </div>
  );
}

function EventCard(props: {
  readonly entry: EventEditEntry;
  readonly onSelect: (id: string) => void;
  readonly onUpdate: (entry: EventEditEntry) => void;
  readonly onRemove: (id: string) => void;
}): React.JSX.Element {
  const { entry } = props;
  const steps: readonly EventTimelineStep[] = entry.steps ?? [
    { id: 'init-pause', kind: 'pause', durationMs: 400 },
    { id: 'init-speak', kind: 'speak', text: entry.dialogueText },
  ];

  const updateSteps = (nextSteps: readonly EventTimelineStep[]): void => {
    const firstSpeak = nextSteps.find((s) => s.kind === 'speak');
    props.onUpdate({
      ...entry,
      steps: nextSteps,
      dialogueText: firstSpeak?.kind === 'speak' ? firstSpeak.text : entry.dialogueText,
    });
  };

  return (
    <div className="module-card" onFocus={() => { props.onSelect(entry.id); }}>
      <div className="module-card-header">
        <strong>
          {entry.location} — {entry.npcName} ({String(entry.minHearts)} Hearts)
        </strong>
        <button type="button" className="danger-btn" onClick={() => { props.onRemove(entry.id); }}>
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
              props.onUpdate({ ...entry, location });
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
            onChange={(e) => { props.onUpdate({ ...entry, npcName: e.target.value }); }}
          >
            {COMMON_VILLAGERS.map((npc) => (
              <option key={npc} value={npc}>
                {npc}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Hearts (0-14)</span>
          <input
            type="number"
            min={0}
            max={14}
            value={entry.minHearts}
            onChange={(e) => {
              const hearts = Math.max(0, Math.min(14, Number(e.target.value) || 0));
              props.onUpdate({ ...entry, minHearts: hearts });
            }}
          />
        </label>
      </div>

      <div className="token-toolbar">
        <span className="muted-text">Chain Timeline:</span>
        {(['walk', 'emote', 'pause', 'speak'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            className="secondary-btn"
            onClick={() => { updateSteps([...steps, createDefaultStep(kind)]); }}
          >
            + {kind.charAt(0).toUpperCase() + kind.slice(1)}
          </button>
        ))}
      </div>

      {steps.map((step, idx) => (
        <TimelineStepRow
          key={step.id}
          step={step}
          npcName={entry.npcName}
          index={idx}
          total={steps.length}
          onChange={(next) => {
            updateSteps(steps.map((s) => (s.id === step.id ? next : s)));
          }}
          onMove={(delta) => {
            const targetIdx = idx + delta;
            if (targetIdx < 0 || targetIdx >= steps.length) {
              return;
            }
            const copy = [...steps];
            const currentItem = copy[idx];
            const swapItem = copy[targetIdx];
            if (currentItem !== undefined && swapItem !== undefined) {
              copy[idx] = swapItem;
              copy[targetIdx] = currentItem;
              updateSteps(copy);
            }
          }}
          onRemove={() => { updateSteps(steps.filter((s) => s.id !== step.id)); }}
        />
      ))}
    </div>
  );
}

export function EventBuilder(props: EventBuilderProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string>(props.events[0]?.id ?? '');

  const handleAdd = (): void => {
    const id = `edit-event-${String(Date.now())}`;
    setSelectedId(id);
    props.onAddEvent({
      kind: 'event',
      id,
      location: 'Town',
      eventId: `${props.uniqueId}_Event1`,
      npcName: 'Abigail',
      dialogueText: 'Hey @! Meet me in town when you have a moment!$h',
      minHearts: 2,
      farmerPos: { x: 64, y: 18 },
      npcPos: { x: 64, y: 16 },
      steps: [
        { id: 'step-1', kind: 'walk', actor: 'npc', dx: 0, dy: 1, facing: 2 },
        { id: 'step-2', kind: 'emote', actor: 'npc', emoteId: 20 },
        { id: 'step-3', kind: 'pause', durationMs: 400 },
        { id: 'step-4', kind: 'speak', text: 'Hey @! Meet me in town when you have a moment!$h' },
      ],
    });
  };

  const activeEvent = props.events.find((e) => e.id === selectedId) ?? props.events[0];
  const handleMoveActor = (actor: 'farmer' | 'npc', pos: EventTilePos): void => {
    if (activeEvent === undefined) {
      return;
    }
    props.onUpdateEvent(
      actor === 'farmer' ? { ...activeEvent, farmerPos: pos } : { ...activeEvent, npcPos: pos },
    );
  };

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Cutscene Stage &amp; Timeline ({String(props.events.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAdd}>
            + Add Cutscene
          </button>
        </div>
        {props.events.length === 0 ? (
          <p className="muted-text">
            Build interactive 2D heart events! Drag actors onto tiles and chain Walk, Emote, Pause,
            and Speak steps.
          </p>
        ) : (
          props.events.map((entry) => (
            <EventCard
              key={entry.id}
              entry={entry}
              onSelect={setSelectedId}
              onUpdate={props.onUpdateEvent}
              onRemove={props.onRemoveEvent}
            />
          ))
        )}
      </div>

      {activeEvent !== undefined ? (
        <EventStagePreview event={activeEvent} onMoveActor={handleMoveActor} />
      ) : (
        <aside className="json-preview-panel">
          <h4>Live 2D Cutscene Stage</h4>
          <p className="muted-text">Click &quot;+ Add Cutscene&quot; to open the 2D stage.</p>
        </aside>
      )}
    </div>
  );
}
