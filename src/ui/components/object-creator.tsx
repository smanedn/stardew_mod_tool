import type { ObjectEditEntry, ObjectRecipeConfig } from '../../data/models/index.js';

export interface ObjectCreatorProps {
  readonly uniqueId: string;
  readonly objects: readonly ObjectEditEntry[];
  readonly onAddObject: (entry: ObjectEditEntry) => void;
  readonly onUpdateObject: (entry: ObjectEditEntry) => void;
  readonly onRemoveObject: (id: string) => void;
}

const OBJECT_CATEGORIES: ReadonlyArray<{ readonly label: string; readonly value: number }> = [
  { label: 'Cooking / Food (-7)', value: -7 },
  { label: 'Vegetable (-75)', value: -75 },
  { label: 'Fruit (-79)', value: -79 },
  { label: 'Artisan Goods (-26)', value: -26 },
  { label: 'Mineral / Material (-12)', value: -12 },
  { label: 'Artifact / Basic (0)', value: 0 },
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
      <span>Recipe (Optional)</span>
      <div className="inline-row">
        <select value={kind} onChange={(e) => { handleKindChange(e.target.value); }}>
          <option value="none">No Recipe</option>
          <option value="cooking">Cooking Recipe</option>
          <option value="crafting">Crafting Recipe</option>
        </select>
        {props.recipe !== undefined && (
          <input
            type="text"
            placeholder="Ingredients e.g. 246:1, 245:1"
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
  readonly onUpdate: (entry: ObjectEditEntry) => void;
  readonly onRemove: (id: string) => void;
}): React.JSX.Element {
  const { entry } = props;
  const patch = (fields: Partial<ObjectEditEntry>): void => {
    props.onUpdate({ ...entry, ...fields });
  };

  return (
    <div className="module-card">
      <div className="module-card-header">
        <strong>{entry.displayName || 'Unnamed Object'}</strong>
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
          <span>Display Name</span>
          <input
            type="text"
            value={entry.displayName}
            onChange={(e) => { patch({ displayName: e.target.value }); }}
          />
        </label>
        <label className="form-field">
          <span>Item ID</span>
          <input
            type="text"
            value={entry.itemId}
            onChange={(e) => { patch({ itemId: e.target.value }); }}
          />
        </label>
      </div>
      <label className="form-field">
        <span>Description</span>
        <input
          type="text"
          value={entry.description}
          onChange={(e) => { patch({ description: e.target.value }); }}
        />
      </label>
      <div className="inline-row">
        <label className="form-field">
          <span>Sell Price (g)</span>
          <input
            type="number"
            min={0}
            value={entry.price}
            onChange={(e) => { patch({ price: Math.max(0, Number(e.target.value) || 0) }); }}
          />
        </label>
        <label className="form-field">
          <span>Edibility (-300 = inedible)</span>
          <input
            type="number"
            value={entry.edibility}
            onChange={(e) => { patch({ edibility: Number(e.target.value) || 0 }); }}
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
      </div>
      <RecipeSection recipe={entry.recipe} onChange={(recipe) => { patch({ recipe }); }} />
    </div>
  );
}

export function ObjectCreator(props: ObjectCreatorProps): React.JSX.Element {
  const handleAdd = (): void => {
    const nextIndex = props.objects.length + 1;
    props.onAddObject({
      kind: 'object',
      id: `edit-object-${String(Date.now())}`,
      itemId: `${props.uniqueId}_Item${String(nextIndex)}`,
      displayName: `Custom Item ${String(nextIndex)}`,
      description: 'A custom item.',
      price: 50,
      edibility: 10,
      category: -75,
    });
  };

  return (
    <div className="module-container">
      <div className="module-toolbar">
        <h3>Custom Objects Creator ({String(props.objects.length)})</h3>
        <button type="button" className="secondary-btn" onClick={handleAdd}>
          + New Object
        </button>
      </div>
      {props.objects.length === 0 ? (
        <p className="muted-text">No custom objects yet. Click "+ New Object" to create one.</p>
      ) : (
        props.objects.map((entry) => (
          <ObjectCard
            key={entry.id}
            entry={entry}
            onUpdate={props.onUpdateObject}
            onRemove={props.onRemoveObject}
          />
        ))
      )}
    </div>
  );
}
