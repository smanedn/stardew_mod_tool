import { useRef, useState } from 'react';
import {
  COMMON_VILLAGERS,
  DIALOGUE_GAME_TOKENS,
  DIALOGUE_KEY_PRESETS,
  insertTokenAtCursor,
} from '../../core/engine/dialogue-tokens.js';
import { parseDialoguePreview } from '../../core/engine/ui-simulator.js';
import type { DialogueEditEntry } from '../../data/models/index.js';
import { useNpcPortraitSrc } from '../utils/npc-portraits.js';

export interface DialogueEditorProps {
  readonly dialogues: readonly DialogueEditEntry[];
  readonly showAdvanced?: boolean;
  readonly onAddDialogue: (entry: DialogueEditEntry) => void;
  readonly onUpdateDialogue: (entry: DialogueEditEntry) => void;
  readonly onRemoveDialogue: (id: string) => void;
}

function DialogueCard(props: {
  readonly entry: DialogueEditEntry;
  readonly onSelectPreview: (id: string) => void;
  readonly onUpdate: (entry: DialogueEditEntry) => void;
  readonly onRemove: (id: string) => void;
}): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { entry } = props;
  const hasCustomNpc = !COMMON_VILLAGERS.includes(entry.npcName);
  const hasCustomKey = !DIALOGUE_KEY_PRESETS.some((p) => p.key === entry.dialogueKey);

  const handleInsertToken = (token: string): void => {
    const cursor = textareaRef.current?.selectionStart ?? entry.text.length;
    const nextText = insertTokenAtCursor(entry.text, token, cursor);
    props.onSelectPreview(entry.id);
    props.onUpdate({ ...entry, text: nextText });
  };

  return (
    <div className="module-card" onFocus={() => { props.onSelectPreview(entry.id); }}>
      <div className="module-card-header">
        <strong>
          {entry.npcName} — {entry.dialogueKey}
        </strong>
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
          <span>Choose Villager</span>
          <select
            value={entry.npcName}
            onChange={(e) => {
              props.onSelectPreview(entry.id);
              props.onUpdate({ ...entry, npcName: e.target.value });
            }}
          >
            {hasCustomNpc && <option value={entry.npcName}>{entry.npcName} (Custom)</option>}
            {COMMON_VILLAGERS.map((npc) => (
              <option key={npc} value={npc}>
                {npc}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>When do they say this?</span>
          <select
            value={entry.dialogueKey}
            onChange={(e) => {
              props.onSelectPreview(entry.id);
              props.onUpdate({ ...entry, dialogueKey: e.target.value });
            }}
          >
            {hasCustomKey && (
              <option value={entry.dialogueKey}>{entry.dialogueKey} (Custom)</option>
            )}
            {DIALOGUE_KEY_PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label} ({preset.group})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-field">
        <span>Quick Insert (Expressions &amp; Names)</span>
        <div className="token-toolbar">
          {DIALOGUE_GAME_TOKENS.map((item) => (
            <button
              key={item.token}
              type="button"
              className="secondary-btn"
              title={item.token}
              onClick={() => { handleInsertToken(item.token); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <label className="form-field">
        <span>What should {entry.npcName} say?</span>
        <textarea
          ref={textareaRef}
          rows={3}
          value={entry.text}
          onChange={(e) => { props.onUpdate({ ...entry, text: e.target.value }); }}
        />
      </label>
    </div>
  );
}

export function DialogueEditor(props: DialogueEditorProps): React.JSX.Element {
  const showAdvanced = props.showAdvanced ?? false;
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>(props.dialogues[0]?.id ?? '');

  const handleAdd = (): void => {
    const newId = `edit-dialogue-${String(Date.now())}`;
    setSelectedPreviewId(newId);
    props.onAddDialogue({
      kind: 'dialogue',
      id: newId,
      npcName: 'Abigail',
      dialogueKey: 'Mon',
      text: 'Hey @! Ready for an adventure today?$h',
    });
  };

  const previewDlg =
    props.dialogues.find((d) => d.id === selectedPreviewId) ?? props.dialogues[0];
  const parsedPreview = previewDlg ? parseDialoguePreview(previewDlg.text) : null;
  const previewPortraitSrc = useNpcPortraitSrc(
    previewDlg?.npcName ?? '',
    parsedPreview?.mood ?? 'Neutral',
  );

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Villager Chat ({String(props.dialogues.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAdd}>
            + Add Villager Line
          </button>
        </div>
        {props.dialogues.length === 0 ? (
          <p className="muted-text">
            No villager lines yet. Click &quot;+ Add Villager Line&quot; to start!
          </p>
        ) : (
          props.dialogues.map((entry) => (
            <DialogueCard
              key={entry.id}
              entry={entry}
              onSelectPreview={setSelectedPreviewId}
              onUpdate={props.onUpdateDialogue}
              onRemove={props.onRemoveDialogue}
            />
          ))
        )}
      </div>

      <aside className="json-preview-panel">
        <div className="module-toolbar">
          <h4>How It Looks In-Game</h4>
          {props.dialogues.length > 1 && previewDlg !== undefined && (
            <select
              aria-label="Preview dialogue line"
              value={previewDlg.id}
              onChange={(e) => { setSelectedPreviewId(e.target.value); }}
            >
              {props.dialogues.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.npcName} ({d.dialogueKey})
                </option>
              ))}
            </select>
          )}
        </div>
        {previewDlg !== undefined && parsedPreview !== null ? (
          <>
            <div className="sdv-dialogue-box">
              <div className="sdv-dialogue-text">
                {parsedPreview.pages.map((page, idx) => (
                  <p key={idx} className="sdv-dialogue-page">
                    {page}
                  </p>
                ))}
              </div>
              <div className="sdv-portrait-panel">
                <div className="sdv-portrait-frame">
                  {previewPortraitSrc !== null ? (
                    <img
                      src={previewPortraitSrc}
                      alt={`${previewDlg.npcName} (${parsedPreview.mood})`}
                      className="sdv-portrait-img"
                    />
                  ) : (
                    <span className="sdv-portrait-mood">In development</span>
                  )}
                </div>
                <div className="sdv-npc-name">{previewDlg.npcName}</div>
              </div>
            </div>
            {showAdvanced && (
              <>
                <h4>Dialogue JSON</h4>
                <pre>{JSON.stringify({ [previewDlg.dialogueKey]: previewDlg.text }, null, 2)}</pre>
              </>
            )}
          </>
        ) : (
          <p className="muted-text">Add a villager line to preview the in-game dialogue box.</p>
        )}
      </aside>
    </div>
  );
}
