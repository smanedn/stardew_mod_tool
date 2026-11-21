import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  VANILLA_ITEM_CATALOG,
  buildCombinedItemOptions,
  filterItemOptions,
} from '../../../src/core/engine/index.js';
import type { ObjectEditEntry } from '../../../src/data/models/index.js';
import { ItemPicker } from '../../../src/ui/components/index.js';

describe('Searchable Vanilla Item & Ingredient Picker', () => {
  it('combines custom mod objects with vanilla items like Diamond, Sugar, and Coffee', () => {
    const custom: ObjectEditEntry[] = [
      {
        kind: 'object',
        id: 'obj-1',
        itemId: 'Smane.Mod_StarCake',
        displayName: 'Star Cake',
        description: 'Yum',
        price: 200,
        edibility: 45,
        category: -7,
      },
    ];

    const combined = buildCombinedItemOptions(custom);
    expect(combined.length).toBe(VANILLA_ITEM_CATALOG.length + 1);
    expect(combined[0]?.id).toBe('Smane.Mod_StarCake');

    expect(filterItemOptions(combined, 'diamond')[0]?.id).toBe('(O)72');
    expect(filterItemOptions(combined, '(O)245')[0]?.name).toBe('Sugar');
    expect(filterItemOptions(combined, 'coffee')[0]?.id).toBe('(O)395');
  });

  it('renders ItemPicker with search input and custom/vanilla options', () => {
    const html = renderToStaticMarkup(
      <ItemPicker
        label="Gift Item"
        value="(O)72"
        customObjects={[]}
        onChange={() => undefined}
      />,
    );
    expect(html).toContain('Search Gift Item');
    expect(html).toContain('Diamond ((O)72)');
  });
});
