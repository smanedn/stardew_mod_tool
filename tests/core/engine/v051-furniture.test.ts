import { describe, expect, it } from 'vitest';
import {
  compileProjectToContentJson,
  createEmptyProject,
  parseProjectJson,
} from '../../../src/core/index.js';

describe('v0.5.1 Custom Furniture & Decoration Creator', () => {
  it('compiles Data/Furniture patches and round-trips .sdvproj JSON', () => {
    const base = createEmptyProject({
      name: 'Cozy Home',
      author: 'Smane',
      version: '0.5.1',
      description: 'Adds custom furniture',
      uniqueId: 'Smane.CozyHome',
    });

    const project = {
      ...base,
      edits: [
        {
          kind: 'furniture' as const,
          id: 'f1',
          furnitureId: 'Smane.CozyHome_OakTable',
          displayName: 'Oak Dining Table',
          furnitureType: 'table' as const,
          tileSize: '2x2' as const,
          price: 800,
        },
      ],
    };

    const content = compileProjectToContentJson(project);
    const patch = content.Changes[0];
    expect(patch && 'Target' in patch ? patch.Target : '').toBe('Data/Furniture');

    const restored = parseProjectJson(JSON.stringify(project));
    expect(restored.edits).toHaveLength(1);
  });
});
