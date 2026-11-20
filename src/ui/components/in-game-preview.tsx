import { useState } from 'react';
import {
  type PortraitMood,
  computeEnergyHealthFromEdibility,
  formatObjectCategoryLabel,
  parseDialoguePreview,
} from '../../core/engine/ui-simulator.js';
import type { DialogueEditEntry, ObjectEditEntry } from '../../data/models/index.js';

export interface InGamePreviewProps {
  readonly objects: readonly ObjectEditEntry[];
  readonly dialogues: readonly DialogueEditEntry[];
}

const MOOD_EMOJI: Readonly<Record<PortraitMood, string>> = {
  Neutral: '🙂',
  Happy: '😄',
  Sad: '😢',
  Angry: '😠',
  Love: '😍',
  Surprised: '😮',
};

function InventoryTooltipSimulator(props: {
  readonly item: ObjectEditEntry;
}): React.JSX.Element {
  const { item } = props;
  const restore = computeEnergyHealthFromEdibility(item.edibility);

  return (
    <div className="sdv-tooltip-box">
      <div className="sdv-tooltip-title">{item.displayName || 'Unnamed Item'}</div>
      <div className="sdv-tooltip-category">{formatObjectCategoryLabel(item.category)}</div>
      <hr className="sdv-divider" />
      <p className="sdv-tooltip-desc">{item.description || 'No description provided.'}</p>
      {restore.edible && (
        <div className="sdv-restore-row">
          <span className="sdv-energy">+{String(restore.energy)} Energy</span>
          <span className="sdv-health">+{String(restore.health)} Health</span>
        </div>
      )}
      <div className="sdv-price-row">Sell Price: {String(item.price)}g</div>
    </div>
  );
}

function DialogueBoxSimulator(props: {
  readonly entry: DialogueEditEntry;
  readonly farmerName: string;
}): React.JSX.Element {
  const parsed = parseDialoguePreview(props.entry.text, props.farmerName);

  return (
    <div className="sdv-dialogue-box">
      <div className="sdv-dialogue-text">
        {parsed.pages.map((page, index) => (
          <p key={index} className="sdv-dialogue-page">
            {page}
          </p>
        ))}
      </div>
      <div className="sdv-portrait-panel">
        <div className="sdv-portrait-frame">
          <span className="sdv-portrait-emoji">{MOOD_EMOJI[parsed.mood]}</span>
          <span className="sdv-portrait-mood">{parsed.mood}</span>
        </div>
        <div className="sdv-npc-name">{props.entry.npcName}</div>
      </div>
    </div>
  );
}

export function InGamePreview(props: InGamePreviewProps): React.JSX.Element {
  const [selectedObjId, setSelectedObjId] = useState<string>(props.objects[0]?.id ?? '');
  const [selectedDlgId, setSelectedDlgId] = useState<string>(props.dialogues[0]?.id ?? '');
  const [farmerName, setFarmerName] = useState<string>('Farmer');

  const activeObj = props.objects.find((o) => o.id === selectedObjId) ?? props.objects[0];
  const activeDlg = props.dialogues.find((d) => d.id === selectedDlgId) ?? props.dialogues[0];

  return (
    <div className="module-container">
      <div className="module-card">
        <div className="module-toolbar">
          <h3>Inventory Tooltip Preview</h3>
          {props.objects.length > 0 && (
            <select
              value={activeObj?.id ?? ''}
              onChange={(e) => { setSelectedObjId(e.target.value); }}
            >
              {props.objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.displayName}
                </option>
              ))}
            </select>
          )}
        </div>
        {activeObj !== undefined ? (
          <InventoryTooltipSimulator item={activeObj} />
        ) : (
          <p className="muted-text">
            Create a custom object in the Objects tab to preview it here.
          </p>
        )}
      </div>

      <div className="module-card">
        <div className="module-toolbar">
          <h3>NPC Dialogue & Portrait Preview</h3>
          <div className="inline-row">
            <input
              type="text"
              value={farmerName}
              placeholder="Farmer Name (@)"
              onChange={(e) => { setFarmerName(e.target.value || 'Farmer'); }}
            />
            {props.dialogues.length > 0 && (
              <select
                value={activeDlg?.id ?? ''}
                onChange={(e) => { setSelectedDlgId(e.target.value); }}
              >
                {props.dialogues.map((dlg) => (
                  <option key={dlg.id} value={dlg.id}>
                    {dlg.npcName} ({dlg.dialogueKey})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        {activeDlg !== undefined ? (
          <DialogueBoxSimulator entry={activeDlg} farmerName={farmerName} />
        ) : (
          <p className="muted-text">Add a dialogue entry in the Dialogue tab to preview it here.</p>
        )}
      </div>
    </div>
  );
}
