import type {
  MailEditEntry,
  ObjectEditEntry,
  ShopEditEntry,
  VanillaShopId,
} from '../../data/models/index.js';
import { ItemPicker } from './item-picker.js';

export interface ShopMailEditorProps {
  readonly uniqueId: string;
  readonly shops: readonly ShopEditEntry[];
  readonly mails: readonly MailEditEntry[];
  readonly objects: readonly ObjectEditEntry[];
  readonly onAddShop: (entry: ShopEditEntry) => void;
  readonly onUpdateShop: (entry: ShopEditEntry) => void;
  readonly onRemoveShop: (id: string) => void;
  readonly onAddMail: (entry: MailEditEntry) => void;
  readonly onUpdateMail: (entry: MailEditEntry) => void;
  readonly onRemoveMail: (id: string) => void;
}

const SHOPS: ReadonlyArray<{ readonly id: VanillaShopId; readonly label: string }> = [
  { id: 'SeedShop', label: "Pierre's General Store" },
  { id: 'Saloon', label: "Gus's Stardrop Saloon" },
  { id: 'Joja', label: 'JojaMart' },
  { id: 'ShadowShop', label: "Krobus's Sewer Shop" },
];

export function ShopMailEditor(props: ShopMailEditorProps): React.JSX.Element {
  const defaultItem = props.objects[0]?.itemId ?? `${props.uniqueId}_Item1`;
  const previewMail = props.mails[0];

  const handleAddShop = (): void => {
    props.onAddShop({
      kind: 'shop',
      id: `edit-shop-${String(Date.now())}`,
      shopId: 'SeedShop',
      itemId: defaultItem,
      price: 150,
    });
  };

  const handleAddMail = (): void => {
    props.onAddMail({
      kind: 'mail',
      id: `edit-mail-${String(Date.now())}`,
      mailId: `${props.uniqueId}_WelcomeLetter`,
      title: 'A Special Gift!',
      body: 'Hey @, I found this for you. Enjoy! - Lewis',
      attachmentItemId: defaultItem,
    });
  };

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Sell in Shops ({String(props.shops.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAddShop}>
            + Add to Shop
          </button>
        </div>
        {props.shops.map((entry) => (
          <div key={entry.id} className="module-card">
            <div className="module-card-header">
              <strong>{entry.shopId}</strong>
              <button
                type="button"
                className="danger-btn"
                onClick={() => { props.onRemoveShop(entry.id); }}
              >
                Remove
              </button>
            </div>
            <div className="inline-row">
              <label className="form-field">
                <span>Store</span>
                <select
                  value={entry.shopId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const shopId: VanillaShopId =
                      val === 'Saloon' || val === 'Joja' || val === 'ShadowShop' ? val : 'SeedShop';
                    props.onUpdateShop({ ...entry, shopId });
                  }}
                >
                  {SHOPS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <ItemPicker
                label="Shop Item"
                value={entry.itemId}
                customObjects={props.objects}
                onChange={(nextId) => { props.onUpdateShop({ ...entry, itemId: nextId }); }}
              />
              <label className="form-field">
                <span>Buy Price (g)</span>
                <input
                  type="number"
                  min={0}
                  value={entry.price}
                  onChange={(e) => {
                    const nextPrice = Math.max(0, Number(e.target.value) || 0);
                    props.onUpdateShop({ ...entry, price: nextPrice });
                  }}
                />
              </label>
            </div>
          </div>
        ))}

        <div className="module-toolbar">
          <h3>Send via Mail ({String(props.mails.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAddMail}>
            + Add Mail Letter
          </button>
        </div>
        {props.mails.map((entry) => (
          <div key={entry.id} className="module-card">
            <div className="module-card-header">
              <strong>{entry.title}</strong>
              <button
                type="button"
                className="danger-btn"
                onClick={() => { props.onRemoveMail(entry.id); }}
              >
                Remove
              </button>
            </div>
            <label className="form-field">
              <span>Letter Title</span>
              <input
                type="text"
                value={entry.title}
                onChange={(e) => { props.onUpdateMail({ ...entry, title: e.target.value }); }}
              />
            </label>
            <label className="form-field">
              <span>Letter Message</span>
              <textarea
                rows={3}
                value={entry.body}
                onChange={(e) => { props.onUpdateMail({ ...entry, body: e.target.value }); }}
              />
            </label>
            <ItemPicker
              label="Attached Gift Item (optional)"
              value={entry.attachmentItemId ?? ''}
              customObjects={props.objects}
              allowEmpty
              onChange={(nextId) => {
                props.onUpdateMail({ ...entry, attachmentItemId: nextId });
              }}
            />
          </div>
        ))}
      </div>

      <aside className="json-preview-panel">
        <h4>Live Mail Letter Preview</h4>
        {previewMail !== undefined ? (
          <div className="sdv-tooltip-box">
            <div className="sdv-tooltip-title">{previewMail.title}</div>
            <hr className="sdv-divider" />
            <p className="sdv-tooltip-desc">{previewMail.body.replace(/@/g, 'Farmer')}</p>
            {previewMail.attachmentItemId !== undefined &&
              previewMail.attachmentItemId.trim().length > 0 && (
                <div className="sdv-price-row">
                  Attached Gift: {previewMail.attachmentItemId}
                </div>
              )}
          </div>
        ) : (
          <p className="muted-text">Add a mail letter or shop item to preview it here.</p>
        )}
      </aside>
    </div>
  );
}
