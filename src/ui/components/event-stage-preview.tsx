import { useEffect, useState } from 'react';
import { parseDialoguePreview } from '../../core/engine/ui-simulator.js';
import type {
  EventEditEntry,
  EventLocationId,
  EventTilePos,
  EventTimelineStep,
} from '../../data/models/index.js';
import { useNpcPortraitSrc } from '../utils/npc-portraits.js';

export interface EventStagePreviewProps {
  readonly event: EventEditEntry;
  readonly onMoveActor: (actor: 'farmer' | 'npc', pos: EventTilePos) => void;
}

const STAGE_COLS = 10;
const STAGE_ROWS = 7;

const LOCATION_ORIGIN: Readonly<Record<EventLocationId, EventTilePos>> = {
  Town: { x: 60, y: 13 },
  Farm: { x: 60, y: 13 },
  Saloon: { x: 10, y: 16 },
  Beach: { x: 16, y: 8 },
};

const EMOTE_ICONS: Readonly<Record<number, string>> = {
  20: '♥',
  32: '😊',
  16: '❗',
  8: '❓',
  12: '💢',
};

function clampTile(col: number, row: number): { readonly col: number; readonly row: number } {
  return {
    col: Math.max(0, Math.min(STAGE_COLS - 1, col)),
    row: Math.max(0, Math.min(STAGE_ROWS - 1, row)),
  };
}

function getEffectiveSteps(entry: EventEditEntry): readonly EventTimelineStep[] {
  if (entry.steps !== undefined && entry.steps.length > 0) {
    return entry.steps;
  }
  return [
    { id: 'default-pause', kind: 'pause', durationMs: 400 },
    { id: 'default-speak', kind: 'speak', text: entry.dialogueText },
  ];
}

function computePlaybackSnapshot(
  entry: EventEditEntry,
  stepIndex: number,
): {
  readonly farmerCol: number;
  readonly farmerRow: number;
  readonly npcCol: number;
  readonly npcRow: number;
  readonly farmerEmote: string | null;
  readonly npcEmote: string | null;
  readonly activeText: string;
} {
  const origin = LOCATION_ORIGIN[entry.location];
  const baseF = entry.farmerPos ?? { x: origin.x + 4, y: origin.y + 5 };
  const baseN = entry.npcPos ?? { x: origin.x + 4, y: origin.y + 3 };
  let fCol = baseF.x - origin.x;
  let fRow = baseF.y - origin.y;
  let nCol = baseN.x - origin.x;
  let nRow = baseN.y - origin.y;
  let farmerEmote: string | null = null;
  let npcEmote: string | null = null;
  let activeText = entry.dialogueText;

  const steps = getEffectiveSteps(entry);
  for (let i = 0; i <= stepIndex && i < steps.length; i += 1) {
    const step = steps[i];
    if (step === undefined) {
      continue;
    }
    farmerEmote = null;
    npcEmote = null;
    if (step.kind === 'walk') {
      if (step.actor === 'farmer') {
        fCol += step.dx;
        fRow += step.dy;
      } else {
        nCol += step.dx;
        nRow += step.dy;
      }
    } else if (step.kind === 'emote') {
      const icon = EMOTE_ICONS[step.emoteId] ?? '✨';
      if (step.actor === 'farmer') {
        farmerEmote = icon;
      } else {
        npcEmote = icon;
      }
    } else if (step.kind === 'speak') {
      activeText = step.text;
    }
  }

  const clampedF = clampTile(fCol, fRow);
  const clampedN = clampTile(nCol, nRow);
  return {
    farmerCol: clampedF.col,
    farmerRow: clampedF.row,
    npcCol: clampedN.col,
    npcRow: clampedN.row,
    farmerEmote,
    npcEmote,
    activeText,
  };
}

function StageGrid(props: {
  readonly location: EventLocationId;
  readonly npcName: string;
  readonly portraitSrc: string | null;
  readonly farmerCol: number;
  readonly farmerRow: number;
  readonly npcCol: number;
  readonly npcRow: number;
  readonly farmerEmote: string | null;
  readonly npcEmote: string | null;
  readonly placementActor: 'farmer' | 'npc';
  readonly onPlaceTile: (col: number, row: number) => void;
  readonly onDropActor: (actor: 'farmer' | 'npc', col: number, row: number) => void;
}): React.JSX.Element {
  const rows = Array.from({ length: STAGE_ROWS }, (_, r) => r);
  const cols = Array.from({ length: STAGE_COLS }, (_, c) => c);

  return (
    <div
      className={`cutscene-stage-grid stage-${props.location.toLowerCase()}`}
      aria-label={`${props.location} 2D cutscene stage`}
    >
      {rows.flatMap((r) =>
        cols.map((c) => {
          const hasFarmer = c === props.farmerCol && r === props.farmerRow;
          const hasNpc = c === props.npcCol && r === props.npcRow;
          return (
            <div
              key={`${String(c)}-${String(r)}`}
              className="cutscene-tile"
              onClick={() => { props.onPlaceTile(c, r); }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.getData('text/plain');
                const actor = dropped === 'farmer' ? 'farmer' : 'npc';
                props.onDropActor(actor, c, r);
              }}
            >
              {hasFarmer && (
                <span
                  draggable
                  className="cutscene-actor-chip farmer"
                  title="Drag Farmer"
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'farmer'); }}
                >
                  {props.farmerEmote !== null && (
                    <span className="cutscene-emote-bubble">{props.farmerEmote}</span>
                  )}
                  🧑‍🌾
                </span>
              )}
              {hasNpc && (
                <span
                  draggable
                  className="cutscene-actor-chip npc"
                  title={`Drag ${props.npcName}`}
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', 'npc'); }}
                >
                  {props.npcEmote !== null && (
                    <span className="cutscene-emote-bubble">{props.npcEmote}</span>
                  )}
                  {props.portraitSrc !== null ? (
                    <img
                      src={props.portraitSrc}
                      alt={props.npcName}
                      className="cutscene-mini-img"
                    />
                  ) : (
                    '⭐'
                  )}
                </span>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

export function EventStagePreview(props: EventStagePreviewProps): React.JSX.Element {
  const { event } = props;
  const [placementActor, setPlacementActor] = useState<'farmer' | 'npc'>('npc');
  const [playing, setPlaying] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const steps = getEffectiveSteps(event);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const current = steps[stepIndex];
    const delayMs = current?.kind === 'pause' ? Math.min(1800, current.durationMs) : 950;
    const timer = window.setTimeout(() => {
      if (stepIndex + 1 >= steps.length) {
        setPlaying(false);
        setStepIndex(-1);
      } else {
        setStepIndex(stepIndex + 1);
      }
    }, delayMs);
    return (): void => {
      window.clearTimeout(timer);
    };
  }, [playing, stepIndex, steps]);

  const snapshot = computePlaybackSnapshot(event, playing ? stepIndex : -1);
  const parsed = parseDialoguePreview(snapshot.activeText);
  const portraitSrc = useNpcPortraitSrc(event.npcName, parsed.mood);
  const origin = LOCATION_ORIGIN[event.location];

  return (
    <aside className="json-preview-panel">
      <div className="module-toolbar">
        <h4>Live 2D Cutscene Stage ({event.location})</h4>
        <button
          type="button"
          className="launch-btn"
          onClick={() => {
            if (playing) {
              setPlaying(false);
              setStepIndex(-1);
            } else {
              setStepIndex(0);
              setPlaying(true);
            }
          }}
        >
          {playing ? '⏹ Stop' : '▶ Play Timeline'}
        </button>
      </div>

      <div className="inline-row">
        <button
          type="button"
          className={placementActor === 'farmer' ? 'season-btn active' : 'season-btn'}
          onClick={() => { setPlacementActor('farmer'); }}
        >
          Place Farmer ({String(origin.x + snapshot.farmerCol)},{' '}
          {String(origin.y + snapshot.farmerRow)})
        </button>
        <button
          type="button"
          className={placementActor === 'npc' ? 'season-btn active' : 'season-btn'}
          onClick={() => { setPlacementActor('npc'); }}
        >
          Place {event.npcName} ({String(origin.x + snapshot.npcCol)},{' '}
          {String(origin.y + snapshot.npcRow)})
        </button>
      </div>

      <StageGrid
        location={event.location}
        npcName={event.npcName}
        portraitSrc={portraitSrc}
        farmerCol={snapshot.farmerCol}
        farmerRow={snapshot.farmerRow}
        npcCol={snapshot.npcCol}
        npcRow={snapshot.npcRow}
        farmerEmote={snapshot.farmerEmote}
        npcEmote={snapshot.npcEmote}
        placementActor={placementActor}
        onPlaceTile={(c, r) => {
          props.onMoveActor(placementActor, { x: origin.x + c, y: origin.y + r });
        }}
        onDropActor={(actor, c, r) => {
          props.onMoveActor(actor, { x: origin.x + c, y: origin.y + r });
        }}
      />

      <div className="sdv-dialogue-box">
        <div className="sdv-dialogue-text">
          {parsed.pages.map((page, idx) => (
            <p key={idx} className="sdv-dialogue-page">
              {page}
            </p>
          ))}
        </div>
        <div className="sdv-portrait-panel">
          <div className="sdv-portrait-frame">
            {portraitSrc !== null ? (
              <img
                src={portraitSrc}
                alt={`${event.npcName} (${parsed.mood})`}
                className="sdv-portrait-img"
              />
            ) : (
              <span className="sdv-portrait-mood">In development</span>
            )}
          </div>
          <div className="sdv-npc-name">{event.npcName}</div>
        </div>
      </div>
    </aside>
  );
}
