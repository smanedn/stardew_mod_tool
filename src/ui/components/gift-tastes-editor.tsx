import { COMMON_VILLAGERS } from '../../core/engine/dialogue-tokens.js';
import type {
  GiftTasteEditEntry,
  GiftTasteLevel,
  ObjectEditEntry,
} from '../../data/models/index.js';
import { ItemPicker } from './item-picker.js';

export interface GiftTastesEditorProps {
  readonly uniqueId: string;
  readonly giftTastes: readonly GiftTasteEditEntry[];
  readonly objects: readonly ObjectEditEntry[];
  readonly onAddGiftTaste: (entry: GiftTasteEditEntry) => void;
  readonly onUpdateGiftTaste: (entry: GiftTasteEditEntry) => void;
  readonly onRemoveGiftTaste: (id: string) => void;
}

const TASTE_LEVELS: readonly GiftTasteLevel[] = ['Love', 'Like', 'Dislike', 'Hate'];

const TASTE_EMOJI: Readonly<Record<GiftTasteLevel, string>> = {
  Love: '❤️ Love',
  Like: '👍 Like',
  Dislike: '😕 Dislike',
  Hate: '💔 Hate',
};

export function GiftTastesEditor(props: GiftTastesEditorProps): React.JSX.Element {
  const handleAdd = (): void => {
    const defaultItem = props.objects[0]?.itemId ?? `${props.uniqueId}_Item1`;
    props.onAddGiftTaste({
      kind: 'giftTaste',
      id: `edit-gift-${String(Date.now())}`,
      npcName: 'Abigail',
      taste: 'Love',
      itemId: defaultItem,
    });
  };

  const preview = props.giftTastes[0];

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Villager Gift Tastes ({String(props.giftTastes.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAdd}>
            + Add Gift Reaction
          </button>
        </div>

        {props.giftTastes.length === 0 ? (
          <p className="muted-text">
            Choose which villagers Love, Like, Dislike, or Hate your custom items!
          </p>
        ) : (
          props.giftTastes.map((entry) => (
            <div key={entry.id} className="module-card">
              <div className="module-card-header">
                <strong>
                  {entry.npcName} — {TASTE_EMOJI[entry.taste]}
                </strong>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => { props.onRemoveGiftTaste(entry.id); }}
                >
                  Remove
                </button>
              </div>
              <div className="inline-row">
                <label className="form-field">
                  <span>Villager</span>
                  <select
                    value={entry.npcName}
                    onChange={(e) => {
                      props.onUpdateGiftTaste({ ...entry, npcName: e.target.value });
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
                  <span>Reaction</span>
                  <select
                    value={entry.taste}
                    onChange={(e) => {
                      const val = e.target.value;
                      const taste: GiftTasteLevel =
                        val === 'Like' || val === 'Dislike' || val === 'Hate' ? val : 'Love';
                      props.onUpdateGiftTaste({ ...entry, taste });
                    }}
                  >
                    {TASTE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {TASTE_EMOJI[lvl]}
                      </option>
                    ))}
                  </select>
                </label>
                <ItemPicker
                  label="Gift Item"
                  value={entry.itemId}
                  customObjects={props.objects}
                  onChange={(nextId) => {
                    props.onUpdateGiftTaste({ ...entry, itemId: nextId });
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <aside className="json-preview-panel">
        <h4>Live Reaction Preview</h4>
        {preview !== undefined ? (
          <div className="sdv-tooltip-box">
            <div className="sdv-tooltip-title">{preview.npcName}</div>
            <div className="sdv-tooltip-category">{TASTE_EMOJI[preview.taste]}</div>
            <hr className="sdv-divider" />
            <p className="sdv-tooltip-desc">
              When gifted <strong>{preview.itemId}</strong>, {preview.npcName} will react with{' '}
              <strong>{preview.taste}</strong>!
            </p>
          </div>
        ) : (
          <p className="muted-text">Add a gift reaction to preview it here.</p>
        )}
      </aside>
    </div>
  );
}
