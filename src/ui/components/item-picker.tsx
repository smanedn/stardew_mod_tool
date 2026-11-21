import { useState } from 'react';
import {
  buildCombinedItemOptions,
  filterItemOptions,
} from '../../core/engine/vanilla-items.js';
import type { ObjectEditEntry } from '../../data/models/index.js';

export interface ItemPickerProps {
  readonly label: string;
  readonly value: string;
  readonly customObjects: readonly ObjectEditEntry[];
  readonly allowEmpty?: boolean;
  readonly onChange: (nextItemId: string) => void;
}

export function ItemPicker(props: ItemPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const allOptions = buildCombinedItemOptions(props.customObjects);
  const filtered = filterItemOptions(allOptions, query);
  const hasExactMatch = allOptions.some((o) => o.id === props.value);

  return (
    <div className="form-field">
      <span>{props.label}</span>
      <input
        type="search"
        aria-label={`Search ${props.label}`}
        placeholder="Search item (e.g. Diamond, Sugar, Coffee)..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); }}
      />
      <select
        aria-label={props.label}
        value={props.value}
        onChange={(e) => { props.onChange(e.target.value); }}
      >
        {props.allowEmpty === true && <option value="">None</option>}
        {!hasExactMatch && props.value.trim().length > 0 && (
          <option value={props.value}>{props.value} (Custom ID)</option>
        )}
        {filtered.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.icon} {opt.name} ({opt.id})
          </option>
        ))}
      </select>
    </div>
  );
}
