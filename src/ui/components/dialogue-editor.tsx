import { useRef } from 'react';
import {
  COMMON_VILLAGERS,
  DIALOGUE_GAME_TOKENS,
  DIALOGUE_KEY_PRESETS,
  insertTokenAtCursor,
} from '../../core/engine/dialogue-tokens.js';
import type { DialogueEditEntry } from '../../data/models/index.js';

export interface DialogueEditorProps {
  readonly dialogues: readonly DialogueEditEntry[];
  readonly onAddDialogue: (entry: DialogueEditEntry) => void;
  readonly onUpdateDialogue: (entry: DialogueEditEntry) => void;
  readonly onRemoveDialogue: (id: string) => void;
}

function DialogueCard(props: {
  readonly entry: DialogueEditEntry;
  readonly onUpdate: (entry: DialogueEditEntry) => void;
  readonly onRemove: (id: string) => void;
}): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { entry } = props;

  const handleInsertToken = (token: string): void => {
    const cursor = textareaRef.current?.selectionStart ?? entry.text.length;
    const nextText = insertTokenAtCursor(entry.text, token, cursor);
    props.onUpdate({ ...entry, text: nextText });
  };

  return (
    <div className="module-card">
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
          <span>Dialogue Key (Daily / Seasonal / Marriage)</span>
          <input
            type="text"
            list={`dialogue-keys-${entry.id}`}
            value={entry.dialogueKey}
            onChange={(e) => { props.onUpdate({ ...entry, dialogueKey: e.target.value }); }}
          />
          <datalist id={`dialogue-keys-${entry.id}`}>
            {DIALOGUE_KEY_PRESETS.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.label} ({preset.group})
              </option>
            ))}
          </datalist>
        </label>
      </div>

      <div className="form-field">
        <span>Insert Game Token</span>
        <div className="token-toolbar">
          {DIALOGUE_GAME_TOKENS.map((item) => (
            <button
              key={item.token}
              type="button"
              className="secondary-btn"
              title={item.label}
              onClick={() => { handleInsertToken(item.token); }}
            >
              {item.token} ({item.label})
            </button>
          ))}
        </div>
      </div>

      <label className="form-field">
        <span>Dialogue Text</span>
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
  const handleAdd = (): void => {
    props.onAddDialogue({
      kind: 'dialogue',
      id: `edit-dialogue-${String(Date.now())}`,
      npcName: 'Abigail',
      dialogueKey: 'Mon',
      text: 'Hey @! Ready for an adventure today?$h',
    });
  };

  return (
    <div className="module-container">
      <div className="module-toolbar">
        <h3>NPC Dialogue & Event Editor ({String(props.dialogues.length)})</h3>
        <button type="button" className="secondary-btn" onClick={handleAdd}>
          + New Dialogue
        </button>
      </div>
      {props.dialogues.length === 0 ? (
        <p className="muted-text">No dialogue edits yet. Click "+ New Dialogue" to start.</p>
      ) : (
        props.dialogues.map((entry) => (
          <DialogueCard
            key={entry.id}
            entry={entry}
            onUpdate={props.onUpdateDialogue}
            onRemove={props.onRemoveDialogue}
          />
        ))
      )}
    </div>
  );
}
