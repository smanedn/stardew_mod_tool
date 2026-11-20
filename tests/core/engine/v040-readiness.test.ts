import { describe, expect, it } from 'vitest';
import { computeModReadiness, createEmptyProject } from '../../../src/core/index.js';

describe('v0.4.0 Mod Readiness Meter', () => {
  it('computes 100% readiness when metadata, description, and edits are present', () => {
    const empty = createEmptyProject({
      name: 'Starberry',
      author: 'Smane',
      version: '0.4.0',
      description: 'Adds Starberry',
      uniqueId: 'Smane.Starberry',
    });

    const beforeEdits = computeModReadiness(empty);
    expect(beforeEdits.scorePercent).toBe(65);
    expect(beforeEdits.hasContent).toBe(false);

    const withEdit = computeModReadiness({
      ...empty,
      edits: [
        {
          kind: 'object',
          id: 'o1',
          itemId: 'Smane.Starberry_Item',
          displayName: 'Starberry',
          description: 'Sweet',
          price: 100,
          edibility: 20,
          category: -79,
        },
      ],
    });
    expect(withEdit.scorePercent).toBe(100);
    expect(withEdit.summaryLabel).toBe('Ready to Export!');
  });
});
