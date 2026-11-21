import type {
  AnimalEditEntry,
  AnimalHouseType,
  ObjectEditEntry,
  WeaponEditEntry,
  WeaponTypeId,
} from '../../data/models/index.js';
import { ItemPicker } from './item-picker.js';

export interface AnimalWeaponEditorProps {
  readonly uniqueId: string;
  readonly animals: readonly AnimalEditEntry[];
  readonly weapons: readonly WeaponEditEntry[];
  readonly objects: readonly ObjectEditEntry[];
  readonly onAddAnimal: (entry: AnimalEditEntry) => void;
  readonly onUpdateAnimal: (entry: AnimalEditEntry) => void;
  readonly onRemoveAnimal: (id: string) => void;
  readonly onAddWeapon: (entry: WeaponEditEntry) => void;
  readonly onUpdateWeapon: (entry: WeaponEditEntry) => void;
  readonly onRemoveWeapon: (id: string) => void;
}

export function AnimalWeaponEditor(props: AnimalWeaponEditorProps): React.JSX.Element {
  const defaultProduce = props.objects[0]?.itemId ?? '176';
  const previewWeapon = props.weapons[0];
  const previewAnimal = props.animals[0];

  const handleAddAnimal = (): void => {
    props.onAddAnimal({
      kind: 'animal',
      id: `edit-animal-${String(Date.now())}`,
      animalId: `${props.uniqueId}_GoldenDuck`,
      displayName: 'Golden Duck',
      house: 'Coop',
      purchasePrice: 1200,
      daysToMature: 5,
      produceItemId: defaultProduce,
    });
  };

  const handleAddWeapon = (): void => {
    props.onAddWeapon({
      kind: 'weapon',
      id: `edit-weapon-${String(Date.now())}`,
      weaponId: `${props.uniqueId}_StarBlade`,
      displayName: 'Starlight Blade',
      description: 'Forged from valley starlight.',
      weaponType: 'Sword',
      minDamage: 35,
      maxDamage: 55,
      critChance: 0.05,
      speed: 2,
      defense: 2,
    });
  };

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>Farm Animals ({String(props.animals.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAddAnimal}>
            + Add Animal
          </button>
        </div>
        {props.animals.map((entry) => (
          <div key={entry.id} className="module-card">
            <div className="module-card-header">
              <strong>
                {entry.displayName} ({entry.house})
              </strong>
              <button
                type="button"
                className="danger-btn"
                onClick={() => { props.onRemoveAnimal(entry.id); }}
              >
                Remove
              </button>
            </div>
            <div className="inline-row">
              <label className="form-field">
                <span>Animal Name</span>
                <input
                  type="text"
                  value={entry.displayName}
                  onChange={(e) => {
                    props.onUpdateAnimal({ ...entry, displayName: e.target.value });
                  }}
                />
              </label>
              <label className="form-field">
                <span>Building</span>
                <select
                  value={entry.house}
                  onChange={(e) => {
                    const house: AnimalHouseType = e.target.value === 'Barn' ? 'Barn' : 'Coop';
                    props.onUpdateAnimal({ ...entry, house });
                  }}
                >
                  <option value="Coop">Coop</option>
                  <option value="Barn">Barn</option>
                </select>
              </label>
              <label className="form-field">
                <span>Price (g)</span>
                <input
                  type="number"
                  min={0}
                  value={entry.purchasePrice}
                  onChange={(e) => {
                    props.onUpdateAnimal({
                      ...entry,
                      purchasePrice: Math.max(0, Number(e.target.value) || 0),
                    });
                  }}
                />
              </label>
              <ItemPicker
                label="Produce Item"
                value={entry.produceItemId}
                customObjects={props.objects}
                onChange={(nextId) => {
                  props.onUpdateAnimal({ ...entry, produceItemId: nextId });
                }}
              />
            </div>
          </div>
        ))}

        <div className="module-toolbar">
          <h3>Weapons ({String(props.weapons.length)})</h3>
          <button type="button" className="secondary-btn" onClick={handleAddWeapon}>
            + Add Weapon
          </button>
        </div>
        {props.weapons.map((entry) => (
          <div key={entry.id} className="module-card">
            <div className="module-card-header">
              <strong>
                {entry.displayName} ({entry.weaponType})
              </strong>
              <button
                type="button"
                className="danger-btn"
                onClick={() => { props.onRemoveWeapon(entry.id); }}
              >
                Remove
              </button>
            </div>
            <div className="inline-row">
              <label className="form-field">
                <span>Weapon Name</span>
                <input
                  type="text"
                  value={entry.displayName}
                  onChange={(e) => {
                    props.onUpdateWeapon({ ...entry, displayName: e.target.value });
                  }}
                />
              </label>
              <label className="form-field">
                <span>Type</span>
                <select
                  value={entry.weaponType}
                  onChange={(e) => {
                    const v = e.target.value;
                    const weaponType: WeaponTypeId =
                      v === 'Dagger' || v === 'Club' ? v : 'Sword';
                    props.onUpdateWeapon({ ...entry, weaponType });
                  }}
                >
                  <option value="Sword">Sword</option>
                  <option value="Dagger">Dagger</option>
                  <option value="Club">Club</option>
                </select>
              </label>
              <label className="form-field">
                <span>Min Damage</span>
                <input
                  type="number"
                  min={1}
                  value={entry.minDamage}
                  onChange={(e) => {
                    props.onUpdateWeapon({
                      ...entry,
                      minDamage: Math.max(1, Number(e.target.value) || 1),
                    });
                  }}
                />
              </label>
              <label className="form-field">
                <span>Max Damage</span>
                <input
                  type="number"
                  min={1}
                  value={entry.maxDamage}
                  onChange={(e) => {
                    props.onUpdateWeapon({
                      ...entry,
                      maxDamage: Math.max(1, Number(e.target.value) || 1),
                    });
                  }}
                />
              </label>
            </div>
            <label className="form-field">
              <span>Description</span>
              <input
                type="text"
                value={entry.description}
                onChange={(e) => {
                  props.onUpdateWeapon({ ...entry, description: e.target.value });
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <aside className="json-preview-panel">
        <h4>Live Preview</h4>
        {previewWeapon !== undefined ? (
          <div className="sdv-tooltip-box">
            <div className="sdv-tooltip-title">{previewWeapon.displayName}</div>
            <div className="sdv-tooltip-category">{previewWeapon.weaponType}</div>
            <hr className="sdv-divider" />
            <p className="sdv-tooltip-desc">{previewWeapon.description}</p>
            <div className="sdv-price-row">
              {String(previewWeapon.minDamage)}–{String(previewWeapon.maxDamage)} Damage
            </div>
          </div>
        ) : previewAnimal !== undefined ? (
          <div className="sdv-tooltip-box">
            <div className="sdv-tooltip-title">{previewAnimal.displayName}</div>
            <div className="sdv-tooltip-category">{previewAnimal.house} Animal</div>
            <hr className="sdv-divider" />
            <div className="sdv-price-row">
              Price: {String(previewAnimal.purchasePrice)}g • Produces {previewAnimal.produceItemId}
            </div>
          </div>
        ) : (
          <p className="muted-text">Add an animal or weapon to preview it here.</p>
        )}
      </aside>
    </div>
  );
}
