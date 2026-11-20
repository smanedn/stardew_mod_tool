import {
  compileConfigSchema,
  compileDefaultConfigJson,
} from '../../core/engine/config-schema-builder.js';
import type { ProjectConfigOption } from '../../data/models/index.js';

export interface ConfigEditorProps {
  readonly options: readonly ProjectConfigOption[];
  readonly onChange: (next: readonly ProjectConfigOption[]) => void;
}

function ConfigOptionCard(props: {
  readonly option: ProjectConfigOption;
  readonly onUpdate: (next: ProjectConfigOption) => void;
  readonly onRemove: (id: string) => void;
}): React.JSX.Element {
  const { option } = props;
  const patch = (fields: Partial<ProjectConfigOption>): void => {
    props.onUpdate({ ...option, ...fields });
  };

  return (
    <div className="module-card">
      <div className="module-card-header">
        <strong>{option.key}</strong>
        <button
          type="button"
          className="danger-btn"
          onClick={() => { props.onRemove(option.id); }}
        >
          Remove
        </button>
      </div>

      <div className="inline-row">
        <label className="form-field">
          <span>Config Key</span>
          <input
            type="text"
            value={option.key}
            onChange={(e) => { patch({ key: e.target.value.replace(/[^A-Za-z0-9_]/g, '') }); }}
          />
        </label>
        <label className="form-field">
          <span>Type</span>
          <select
            value={option.optionType}
            onChange={(e) => {
              const nextType = e.target.value as ProjectConfigOption['optionType'];
              patch({
                optionType: nextType,
                defaultValue: nextType === 'toggle' ? 'true' : nextType === 'number' ? '1.0' : 'Default',
              });
            }}
          >
            <option value="toggle">Toggle (true/false)</option>
            <option value="number">Number / Multiplier</option>
            <option value="choice">Choice List</option>
          </select>
        </label>
        <label className="form-field">
          <span>Default Value</span>
          <input
            type="text"
            value={option.defaultValue}
            onChange={(e) => { patch({ defaultValue: e.target.value }); }}
          />
        </label>
      </div>

      {option.optionType !== 'toggle' && (
        <label className="form-field">
          <span>AllowValues (comma-separated, optional)</span>
          <input
            type="text"
            placeholder="e.g. 0.5, 1.0, 1.5, 2.0"
            value={option.allowValues ?? ''}
            onChange={(e) => { patch({ allowValues: e.target.value }); }}
          />
        </label>
      )}

      <div className="inline-row">
        <label className="form-field">
          <span>GMCM Description</span>
          <input
            type="text"
            value={option.description ?? ''}
            onChange={(e) => { patch({ description: e.target.value }); }}
          />
        </label>
        <label className="form-field">
          <span>GMCM Section (optional)</span>
          <input
            type="text"
            value={option.section ?? ''}
            onChange={(e) => { patch({ section: e.target.value }); }}
          />
        </label>
      </div>
    </div>
  );
}

export function ConfigEditor(props: ConfigEditorProps): React.JSX.Element {
  const handleAdd = (preset: 'toggle' | 'multiplier'): void => {
    const idx = String(props.options.length + 1);
    const nextOption: ProjectConfigOption =
      preset === 'multiplier'
        ? {
            id: `cfg-${String(Date.now())}`,
            key: `PriceMultiplier${idx}`,
            optionType: 'number',
            defaultValue: '1.0',
            allowValues: '0.5, 1.0, 1.5, 2.0',
            description: 'Adjusts custom item sell prices.',
          }
        : {
            id: `cfg-${String(Date.now())}`,
            key: `EnableFeature${idx}`,
            optionType: 'toggle',
            defaultValue: 'true',
            description: 'Enables or disables this feature.',
          };
    props.onChange([...props.options, nextOption]);
  };

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-toolbar">
          <h3>GMCM & config.json ({String(props.options.length)})</h3>
          <div className="inline-row">
            <button type="button" className="secondary-btn" onClick={() => { handleAdd('toggle'); }}>
              + Toggle
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => { handleAdd('multiplier'); }}
            >
              + Multiplier
            </button>
          </div>
        </div>
        {props.options.map((opt) => (
          <ConfigOptionCard
            key={opt.id}
            option={opt}
            onUpdate={(next) => {
              props.onChange(props.options.map((item) => (item.id === next.id ? next : item)));
            }}
            onRemove={(id) => {
              props.onChange(props.options.filter((item) => item.id !== id));
            }}
          />
        ))}
      </div>

      <aside className="json-preview-panel">
        <h4>Generated ConfigSchema</h4>
        <pre>{JSON.stringify(compileConfigSchema(props.options), null, 2)}</pre>
        <h4>Default config.json</h4>
        <pre>{JSON.stringify(compileDefaultConfigJson(props.options), null, 2)}</pre>
      </aside>
    </div>
  );
}
