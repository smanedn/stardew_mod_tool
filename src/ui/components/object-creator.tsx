import {
  computeEnergyHealthFromEdibility,
  formatObjectCategoryLabel,
} from '../../core/engine/ui-simulator.js';
import type {
  LinkedAssetEntry,
  ObjectEditEntry,
  ObjectRecipeConfig,
} from '../../data/models/index.js';
import { ItemPicker } from './item-picker.js';

export interface ObjectCreatorProps {
  readonly uniqueId: string;
  readonly objects: readonly ObjectEditEntry[];
  readonly assets?: readonly LinkedAssetEntry[];
  readonly showAdvanced?: boolean;
  readonly onAddObject: (entry: ObjectEditEntry) => void;
  readonly onUpdateObject: (entry: ObjectEditEntry) => void;
  readonly onRemoveObject: (id: string) => void;
}

const OBJECT_CATEGORIES: ReadonlyArray<{ readonly label: string; readonly value: number }> = [
  { label: 'Cooked Dish / Meal', value: -7 },
  { label: 'Vegetable', value: -75 },
  { label: 'Fruit', value: -79 },
  { label: 'Artisan Good (Jam, Cheese, etc.)', value: -26 },
  { label: 'Mineral / Gem / Material', value: -12 },
  { label: 'Artifact / Keepsake', value: 0 },
];

function IngredientRow(props: {
  readonly itemId: string;
  readonly qty: number;
  readonly customObjects: readonly ObjectEditEntry[];
  readonly onChangeItem: (nextId: string) => void;
  readonly onChangeQty: (nextQty: number) => void;
  readonly onRemove: () => void;
}): React.JSX.Element {
  return (
    <div className="timeline-step-row">
      <ItemPicker
        label="Ingredient"
        value={props.itemId}
        customObjects={props.customObjects}
        onChange={props.onChangeItem}
      />
      <input
        type="number"
        min={1}
        aria-label="Ingredient quantity"
        value={props.qty}
        onChange={(e) => { props.onChangeQty(Math.max(1, Number(e.target.value) || 1)); }}
      />
      <button type="button" className="danger-btn" onClick={props.onRemove}>
        ✕
      </button>
    </div>
  );
}

function RecipeSection(props: {
  readonly recipe: ObjectRecipeConfig | undefined;
  readonly customObjects: readonly ObjectEditEntry[];
  readonly onChange: (recipe: ObjectRecipeConfig | undefined) => void;
}): React.JSX.Element {
  const kind = props.recipe?.kind ?? 'none';
  const entries = props.recipe ? Object.entries(props.recipe.ingredients) : [];

  const handleKindChange = (nextKind: string): void => {
    if (nextKind === 'none') {
      props.onChange(undefined);
      return;
    }
    const validKind = nextKind === 'cooking' ? 'cooking' : 'crafting';
    props.onChange({ kind: validKind, ingredients: props.recipe?.ingredients ?? { '(O)388': 5 } });
  };

  const updateEntries = (next: Array<[string, number]>): void => {
    if (props.recipe === undefined) {
      return;
    }
    props.onChange({ kind: props.recipe.kind, ingredients: Object.fromEntries(next) });
  };

  return (
    <div className="form-field">
      <span>How do players make it? (Optional Recipe)</span>
      <div className="inline-row">
        <select value={kind} onChange={(e) => { handleKindChange(e.target.value); }}>
          <option value="none">No Recipe</option>
          <option value="cooking">Cook in Kitchen</option>
          <option value="crafting">Craft in Inventory</option>
        </select>
        {props.recipe !== undefined && (
          <button
            type="button"
            className="secondary-btn"
            onClick={() => { updateEntries([...entries, ['(O)245', 1]]); }}
          >
            + Ingredient
          </button>
        )}
      </div>
      {entries.map(([id, qty], idx) => (
        <IngredientRow
          key={`${id}-${String(idx)}`}
          itemId={id}
          qty={qty}
          customObjects={props.customObjects}
          onChangeItem={(nextId) => {
            updateEntries(entries.map((pair, i) => (i === idx ? [nextId, pair[1]] : pair)));
          }}
          onChangeQty={(nextQty) => {
            updateEntries(entries.map((pair, i) => (i === idx ? [pair[0], nextQty] : pair)));
          }}
          onRemove={() => { updateEntries(entries.filter((_, i) => i !== idx)); }}
        />
      ))}
    </div>
  );
}

function ObjectCard(props: {
  readonly entry: ObjectEditEntry;
  readonly allObjects: readonly ObjectEditEntry[];
  readonly assets: readonly LinkedAssetEntry[];
  readonly showAdvanced: boolean;
  readonly onUpdate: (entry: ObjectEditEntry) => void;
  readonly onRemove: (id: string) => void;
}): React.JSX.Element {
  const { entry } = props;
  const patch = (fields: Partial<ObjectEditEntry>): void => {
    props.onUpdate({ ...entry, ...fields });
  };
  const isEdible = entry.edibility > 0;

  return (
    <div className="module-card">
      <div className="module-card-header">
        <strong>{entry.displayName || 'Unnamed Item'}</strong>
        <button
          type="button"
          className="danger-btn"
          onClick={() => { props.onRemove(entry.id); }}
        >
          Delete Item
        </button>
      </div>
      <div className="inline-row">
        <label className="form-field">
          <span>Item Name *</span>
          <input
            type="text"
            value={entry.displayName}
            onChange={(e) => { patch({ displayName: e.target.value }); }}
          />
        </label>
        {props.showAdvanced && (
          <label className="form-field">
            <span>Internal Item ID</span>
            <input
              type="text"
              value={entry.itemId}
              onChange={(e) => { patch({ itemId: e.target.value }); }}
            />
          </label>
        )}
      </div>
      <label className="form-field">
        <span>Item Description</span>
        <input
          type="text"
          value={entry.description}
          onChange={(e) => { patch({ description: e.target.value }); }}
        />
      </label>
      <div className="inline-row">
        <label className="form-field">
          <span>Sell Price (Gold)</span>
          <input
            type="number"
            min={0}
            value={entry.price}
            onChange={(e) => { patch({ price: Math.max(0, Number(e.target.value) || 0) }); }}
          />
        </label>
        <label className="form-field">
          <span>Category</span>
          <select
            value={entry.category}
            onChange={(e) => { patch({ category: Number(e.target.value) }); }}
          >
            {OBJECT_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Can the player eat it?</span>
          <select
            value={isEdible ? 'yes' : 'no'}
            onChange={(e) => {
              patch({ edibility: e.target.value === 'yes' ? 20 : -300 });
            }}
          >
            <option value="yes">Yes (Restores Energy)</option>
            <option value="no">No (Inedible)</option>
          </select>
        </label>
        {isEdible && (
          <label className="form-field">
            <span>Edibility Strength</span>
            <input
              type="number"
              min={1}
              value={entry.edibility}
              onChange={(e) => { patch({ edibility: Math.max(1, Number(e.target.value) || 1) }); }}
            />
          </label>
        )}
      </div>
      {isEdible && (
        <div className="inline-row">
          <label className="form-field">
            <span>Speed Buff</span>
            <input
              type="number"
              min={0}
              max={5}
              value={entry.buff?.speed ?? 0}
              onChange={(e) => {
                patch({ buff: { ...entry.buff, speed: Number(e.target.value) || 0 } });
              }}
            />
          </label>
          <label className="form-field">
            <span>Luck Buff</span>
            <input
              type="number"
              min={0}
              max={5}
              value={entry.buff?.luck ?? 0}
              onChange={(e) => {
                patch({ buff: { ...entry.buff, luck: Number(e.target.value) || 0 } });
              }}
            />
          </label>
          <label className="form-field">
            <span>Farming Buff</span>
            <input
              type="number"
              min={0}
              max={5}
              value={entry.buff?.farming ?? 0}
              onChange={(e) => {
                patch({ buff: { ...entry.buff, farming: Number(e.target.value) || 0 } });
              }}
            />
          </label>
        </div>
      )}
      <RecipeSection
        recipe={entry.recipe}
        customObjects={props.allObjects}
        onChange={(recipe) => { patch({ recipe }); }}
      />
      {props.assets.length > 0 && (
        <label className="form-field">
          <span>Item Sprite (from Sprites or Draw Sprite)</span>
          <select
            value={entry.assetId ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              patch({ assetId: val === '' ? undefined : val });
            }}
          >
            <option value="">Default Icon</option>
            {props.assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.relativePath}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

export function ObjectCreator(props: ObjectCreatorProps): React.JSX.Element {
  const showAdvanced = props.showAdvanced ?? false;
  const handleAdd = (): void => {
    const nextIndex = props.objects.length + 1;
    props.onAddObject({
      kind: 'object',
      id: `edit-object-${String(Date.now())}`,
      itemId: `${props.uniqueId}_Item${String(nextIndex)}`,
      displayName: `Custom Item ${String(nextIndex)}`,
      description: 'A custom item.',
      price: 50,
      edibility: 20,
      category: -75,
    });
  };

  const previewItem = props.objects[0];
  const previewAsset = previewItem?.assetId
    ? props.assets?.find((a) => a.id === previewItem.assetId)
    : undefined;
  const restore = previewItem
    ? computeEnergyHealthFromEdibility(previewItem.edibility)
    : null;

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>New Items ({String(props.objects.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAdd}>
            + Add New Item
          </button>
        </div>
        {props.objects.length === 0 ? (
          <p className="muted-text">
            No items yet. Click &quot;+ Add New Item&quot; to create your first item!
          </p>
        ) : (
          props.objects.map((entry) => (
            <ObjectCard
              key={entry.id}
              entry={entry}
              allObjects={props.objects}
              assets={props.assets ?? []}
              showAdvanced={showAdvanced}
              onUpdate={props.onUpdateObject}
              onRemove={props.onRemoveObject}
            />
          ))
        )}
      </div>

      <aside className="json-preview-panel">
        <h4>How It Looks In-Game</h4>
        {previewItem !== undefined && restore !== null ? (
          <>
            <div className="sdv-tooltip-box">
              <div className="sdv-tooltip-header">
                {previewAsset?.dataBase64 !== undefined && (
                  <img
                    src={`data:image/png;base64,${previewAsset.dataBase64}`}
                    alt={previewItem.displayName}
                    className="sdv-item-icon"
                  />
                )}
                <div>
                  <div className="sdv-tooltip-title">{previewItem.displayName || 'Unnamed'}</div>
                  <div className="sdv-tooltip-category">
                    {formatObjectCategoryLabel(previewItem.category)}
                  </div>
                </div>
              </div>
              <hr className="sdv-divider" />
              <p className="sdv-tooltip-desc">{previewItem.description || 'No description.'}</p>
              {restore.edible && (
                <div className="sdv-restore-row">
                  <span className="sdv-energy">+{String(restore.energy)} Energy</span>
                  <span className="sdv-health">+{String(restore.health)} Health</span>
                </div>
              )}
              <div className="sdv-price-row">Sell Price: {String(previewItem.price)}g</div>
            </div>
            {showAdvanced && (
              <>
                <h4>Data/Objects JSON</h4>
                <pre>{JSON.stringify(previewItem, null, 2)}</pre>
              </>
            )}
          </>
        ) : (
          <p className="muted-text">Add an item to see its live Stardew Valley tooltip.</p>
        )}
      </aside>
    </div>
  );
}
