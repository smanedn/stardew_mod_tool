import { describe, expect, it } from 'vitest';
import {
  compileProjectToContentJson,
  createEmptyProject,
  parseProjectJson,
} from '../../../src/core/index.js';

describe('v0.5.2 Custom Fish & Fishing Locations', () => {
  it('compiles Data/Fish and Data/Locations spawn patches and round-trips .sdvproj', () => {
    const base = createEmptyProject({
      name: 'Angler Pack',
      author: 'Smane',
      version: '0.5.2',
      description: 'Adds custom fish',
      uniqueId: 'Smane.AnglerPack',
    });

    const project = {
      ...base,
      edits: [
        {
          kind: 'fish' as const,
          id: 'fish-1',
          fishId: 'Smane.AnglerPack_StarTrout',
          displayName: 'Starlight Trout',
          minSize: 10,
          maxSize: 28,
          difficulty: 55,
          behavior: 'dart' as const,
          seasons: ['Spring', 'Fall'],
          weather: 'rainy' as const,
          waterLocation: 'River' as const,
          price: 220,
        },
      ],
    };

    const content = compileProjectToContentJson(project);
    expect(content.Changes.map((c) => ('Target' in c ? c.Target : ''))).toEqual([
      'Data/Objects',
      'Data/Fish',
      'Data/Locations',
    ]);

    const restored = parseProjectJson(JSON.stringify(project));
    expect(restored.edits).toHaveLength(1);
  });
});
