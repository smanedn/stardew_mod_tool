import {
  computeEnergyHealthFromEdibility,
  formatObjectCategoryLabel,
} from '../../core/engine/ui-simulator.js';
import type { ObjectEditEntry, ObjectRecipeConfig } from '../../data/models/index.js';

export interface ObjectCreatorProps {
  readonly uniqueId: string;
  readonly objects: readonly ObjectEditEntry[];
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

function RecipeSection(props: {
  readonly recipe: ObjectRecipeConfig | undefined;
  readonly onChange: (recipe: ObjectRecipeConfig | undefined) => void;
}): React.JSX.Element {
  const kind = props.recipe?.kind ?? 'none';
  const ingredientsText = props.recipe
    ? Object.entries(props.recipe.ingredients)
        .map(([id, qty]) => `${id}:${String(qty)}`)
        .join(', ')
    : '';

  const handleKindChange = (nextKind: string): void => {
    if (nextKind === 'none') {
      props.onChange(undefined);
      return;
    }
    const validKind = nextKind === 'cooking' ? 'cooking' : 'crafting';
    props.onChange({ kind: validKind, ingredients: props.recipe?.ingredients ?? { '388': 5 } });
  };

  const handleIngredientsChange = (raw: string): void => {
    if (props.recipe === undefined) {
      return;
    }
    const parsed: Array<[string, number]> = [];
    for (const part of raw.split(',')) {
      const [id, qtyStr] = part.split(':').map((s) => s.trim());
      const qty = Number.parseInt(qtyStr ?? '1', 10);
      if (id !== undefined && id.length > 0 && !Number.isNaN(qty) && qty > 0) {
        parsed.push([id, qty]);
      }
    }
    props.onChange({ kind: props.recipe.kind, ingredients: Object.fromEntries(parsed) });
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
          <input
            type="text"
            placeholder="Item IDs e.g. 246:1, 245:1"
            value={ingredientsText}
            onChange={(e) => { handleIngredientsChange(e.target.value); }}
          />
        )}
      </div>
    </div>
  );
}

function ObjectCard(props: {
  readonly entry: ObjectEditEntry;
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
      <RecipeSection recipe={entry.recipe} onChange={(recipe) => { patch({ recipe }); }} />
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
              <div className="sdv-tooltip-title">{previewItem.displayName || 'Unnamed'}</div>
              <div className="sdv-tooltip-category">
                {formatObjectCategoryLabel(previewItem.category)}
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
