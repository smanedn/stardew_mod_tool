import type {
  LinkedAssetEntry,
  NpcBirthSeason,
  NpcHomeRegion,
  VillagerEditEntry,
  VillagerScheduleWaypoint,
} from '../../data/models/index.js';

export interface VillagerCreatorProps {
  readonly uniqueId: string;
  readonly villagers: readonly VillagerEditEntry[];
  readonly assets: readonly LinkedAssetEntry[];
  readonly onAddVillager: (entry: VillagerEditEntry) => void;
  readonly onUpdateVillager: (entry: VillagerEditEntry) => void;
  readonly onRemoveVillager: (id: string) => void;
}

const SEASONS: readonly NpcBirthSeason[] = ['spring', 'summer', 'fall', 'winter'];
const REGIONS: readonly NpcHomeRegion[] = ['Town', 'Mountain', 'Forest', 'Beach'];

function parseBirthSeason(val: string): NpcBirthSeason {
  return val === 'summer' || val === 'fall' || val === 'winter' ? val : 'spring';
}

function parseHomeRegion(val: string): NpcHomeRegion {
  return val === 'Mountain' || val === 'Forest' || val === 'Beach' ? val : 'Town';
}

function WaypointRow(props: {
  readonly wp: VillagerScheduleWaypoint;
  readonly onChange: (next: VillagerScheduleWaypoint) => void;
  readonly onRemove: () => void;
}): React.JSX.Element {
  const { wp } = props;
  return (
    <div className="timeline-step-row">
      <input
        type="text"
        aria-label="Schedule Time"
        value={wp.time}
        onChange={(e) => { props.onChange({ ...wp, time: e.target.value }); }}
      />
      <input
        type="text"
        aria-label="Schedule Map"
        value={wp.map}
        onChange={(e) => { props.onChange({ ...wp, map: e.target.value }); }}
      />
      <input
        type="number"
        aria-label="Schedule X"
        value={wp.x}
        onChange={(e) => {
          props.onChange({ ...wp, x: Math.max(0, Number(e.target.value) || 0) });
        }}
      />
      <input
        type="number"
        aria-label="Schedule Y"
        value={wp.y}
        onChange={(e) => {
          props.onChange({ ...wp, y: Math.max(0, Number(e.target.value) || 0) });
        }}
      />
      <button type="button" className="danger-btn" onClick={props.onRemove}>
        ✕
      </button>
    </div>
  );
}

function VillagerBasicFields(props: {
  readonly entry: VillagerEditEntry;
  readonly onUpdate: (entry: VillagerEditEntry) => void;
}): React.JSX.Element {
  const { entry } = props;
  return (
    <>
      <div className="inline-row">
        <label className="form-field">
          <span>Villager Name</span>
          <input
            type="text"
            value={entry.displayName}
            onChange={(e) => { props.onUpdate({ ...entry, displayName: e.target.value }); }}
          />
        </label>
        <label className="form-field">
          <span>Birthday Season</span>
          <select
            value={entry.birthSeason}
            onChange={(e) => {
              props.onUpdate({ ...entry, birthSeason: parseBirthSeason(e.target.value) });
            }}
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Day (1-28)</span>
          <input
            type="number"
            min={1}
            max={28}
            value={entry.birthDay}
            onChange={(e) => {
              const day = Math.max(1, Math.min(28, Number(e.target.value) || 1));
              props.onUpdate({ ...entry, birthDay: day });
            }}
          />
        </label>
      </div>
      <div className="inline-row">
        <label className="form-field">
          <span>Home Region</span>
          <select
            value={entry.homeRegion}
            onChange={(e) => {
              props.onUpdate({ ...entry, homeRegion: parseHomeRegion(e.target.value) });
            }}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Spawn Map</span>
          <input
            type="text"
            value={entry.spawnMap}
            onChange={(e) => { props.onUpdate({ ...entry, spawnMap: e.target.value }); }}
          />
        </label>
        <label className="form-field">
          <span>Spawn X / Y</span>
          <div className="inline-row">
            <input
              type="number"
              value={entry.spawnX}
              onChange={(e) => {
                props.onUpdate({ ...entry, spawnX: Math.max(0, Number(e.target.value) || 0) });
              }}
            />
            <input
              type="number"
              value={entry.spawnY}
              onChange={(e) => {
                props.onUpdate({ ...entry, spawnY: Math.max(0, Number(e.target.value) || 0) });
              }}
            />
          </div>
        </label>
      </div>
    </>
  );
}

function VillagerAssetAndGiftFields(props: {
  readonly entry: VillagerEditEntry;
  readonly assets: readonly LinkedAssetEntry[];
  readonly onUpdate: (entry: VillagerEditEntry) => void;
}): React.JSX.Element {
  const { entry } = props;
  return (
    <>
      <div className="inline-row">
        <label className="form-field">
          <span>Loved Gift IDs (space-separated)</span>
          <input
            type="text"
            value={entry.lovedItems}
            onChange={(e) => { props.onUpdate({ ...entry, lovedItems: e.target.value }); }}
          />
        </label>
        <label className="form-field">
          <span>Liked Gift IDs (space-separated)</span>
          <input
            type="text"
            value={entry.likedItems}
            onChange={(e) => { props.onUpdate({ ...entry, likedItems: e.target.value }); }}
          />
        </label>
      </div>
      <div className="inline-row">
        <label className="form-field">
          <span>Portraits/{entry.npcId}</span>
          <select
            value={entry.portraitAssetId ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              props.onUpdate({ ...entry, portraitAssetId: val.length > 0 ? val : undefined });
            }}
          >
            <option value="">None</option>
            {props.assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.relativePath}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Characters/{entry.npcId}</span>
          <select
            value={entry.spriteAssetId ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              props.onUpdate({ ...entry, spriteAssetId: val.length > 0 ? val : undefined });
            }}
          >
            <option value="">None</option>
            {props.assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.relativePath}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}

function VillagerCard(props: {
  readonly entry: VillagerEditEntry;
  readonly assets: readonly LinkedAssetEntry[];
  readonly onUpdate: (entry: VillagerEditEntry) => void;
  readonly onRemove: (id: string) => void;
}): React.JSX.Element {
  const { entry } = props;
  const addWaypoint = (): void => {
    const wp: VillagerScheduleWaypoint = {
      id: `wp-${String(Date.now())}`,
      time: '1200',
      map: 'Town',
      x: 42,
      y: 57,
      facing: 2,
    };
    props.onUpdate({ ...entry, scheduleWaypoints: [...entry.scheduleWaypoints, wp] });
  };

  return (
    <div className="module-card">
      <div className="module-card-header">
        <strong>
          {entry.displayName} ({entry.npcId})
        </strong>
        <button type="button" className="danger-btn" onClick={() => { props.onRemove(entry.id); }}>
          Remove
        </button>
      </div>
      <VillagerBasicFields entry={entry} onUpdate={props.onUpdate} />
      <VillagerAssetAndGiftFields entry={entry} assets={props.assets} onUpdate={props.onUpdate} />
      <label className="form-field">
        <span>Greeting Dialogue</span>
        <textarea
          rows={2}
          value={entry.greetingText}
          onChange={(e) => { props.onUpdate({ ...entry, greetingText: e.target.value }); }}
        />
      </label>
      <div className="module-toolbar">
        <span className="muted-text">
          Daily Schedule ({String(entry.scheduleWaypoints.length)} waypoints)
        </span>
        <button type="button" className="secondary-btn" onClick={addWaypoint}>
          + Waypoint
        </button>
      </div>
      {entry.scheduleWaypoints.map((wp) => (
        <WaypointRow
          key={wp.id}
          wp={wp}
          onChange={(next) => {
            props.onUpdate({
              ...entry,
              scheduleWaypoints: entry.scheduleWaypoints.map((w) => (w.id === wp.id ? next : w)),
            });
          }}
          onRemove={() => {
            props.onUpdate({
              ...entry,
              scheduleWaypoints: entry.scheduleWaypoints.filter((w) => w.id !== wp.id),
            });
          }}
        />
      ))}
    </div>
  );
}

export function VillagerCreator(props: VillagerCreatorProps): React.JSX.Element {
  const handleAdd = (): void => {
    const idx = String(props.villagers.length + 1);
    const cleanUid = props.uniqueId.replace(/[^A-Za-z0-9_]/g, '');
    props.onAddVillager({
      kind: 'villager',
      id: `edit-villager-${String(Date.now())}`,
      npcId: `${cleanUid}_Villager${idx}`,
      displayName: `Willow ${idx}`,
      birthSeason: 'spring',
      birthDay: 14,
      homeRegion: 'Town',
      spawnMap: 'Town',
      spawnX: 40,
      spawnY: 55,
      lovedItems: '(O)72',
      likedItems: '(O)395',
      greetingText: 'Hi @! Lovely day in Pelican Town, isn’t it?$h',
      scheduleWaypoints: [
        { id: 'wp-1', time: '0900', map: 'Town', x: 40, y: 55, facing: 2 },
        { id: 'wp-2', time: '1400', map: 'Saloon', x: 15, y: 18, facing: 0 },
      ],
    });
  };

  const preview = props.villagers[0];
  const portrait =
    preview?.portraitAssetId !== undefined
      ? props.assets.find((a) => a.id === preview.portraitAssetId)
      : undefined;

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Custom Villagers ({String(props.villagers.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAdd}>
            + New Villager
          </button>
        </div>
        {props.villagers.length === 0 ? (
          <p className="muted-text">
            Create a brand-new NPC with birthday, home, gift tastes, schedule, and sprite sheets.
          </p>
        ) : (
          props.villagers.map((entry) => (
            <VillagerCard
              key={entry.id}
              entry={entry}
              assets={props.assets}
              onUpdate={props.onUpdateVillager}
              onRemove={props.onRemoveVillager}
            />
          ))
        )}
      </div>
      <aside className="json-preview-panel">
        <h4>Live Villager Card</h4>
        {preview !== undefined ? (
          <div className="sdv-tooltip-box">
            {portrait?.dataBase64 !== undefined && (
              <img
                src={`data:image/png;base64,${portrait.dataBase64}`}
                alt={preview.displayName}
                className="sdv-portrait-img"
              />
            )}
            <div className="sdv-tooltip-title">{preview.displayName}</div>
            <div className="sdv-tooltip-category">
              Birthday: {preview.birthSeason} {String(preview.birthDay)} • {preview.homeRegion}
            </div>
            <hr className="sdv-divider" />
            <p className="sdv-tooltip-desc">{preview.greetingText}</p>
            <div className="sdv-price-row">
              Schedule stops: {String(preview.scheduleWaypoints.length)}
            </div>
          </div>
        ) : (
          <p className="muted-text">Add a custom villager to preview their profile.</p>
        )}
      </aside>
    </div>
  );
}
