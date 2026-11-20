import { describe, expect, it } from 'vitest';
import {
  compileProjectToContentJson,
  createEmptyProject,
  parseProjectJson,
} from '../../../src/core/index.js';

describe('v0.5.0 Features: Farm Animals, Weapons & .sdvproj Restore', () => {
  it('compiles Data/FarmAnimals and Data/Weapons and round-trips .sdvproj JSON', () => {
    const base = createEmptyProject({
      name: 'Valley Expanded',
      author: 'Smane',
      version: '0.5.0',
      description: 'Adds custom animals and weapons',
      uniqueId: 'Smane.ValleyExpanded',
    });

    const project = {
      ...base,
      edits: [
        {
          kind: 'animal' as const,
          id: 'a1',
          animalId: 'Smane.ValleyExpanded_GoldenDuck',
          displayName: 'Golden Duck',
          house: 'Coop' as const,
          purchasePrice: 1200,
          daysToMature: 5,
          produceItemId: '176',
        },
        {
          kind: 'weapon' as const,
          id: 'w1',
          weaponId: 'Smane.ValleyExpanded_StarBlade',
          displayName: 'Starlight Blade',
          description: 'Forged from starlight.',
          weaponType: 'Sword' as const,
          minDamage: 35,
          maxDamage: 55,
          critChance: 0.05,
          speed: 2,
          defense: 2,
        },
      ],
    };

    const content = compileProjectToContentJson(project);
    expect(content.Changes.map((c) => ('Target' in c ? c.Target : ''))).toEqual([
      'Data/FarmAnimals',
      'Data/Weapons',
    ]);

    const restored = parseProjectJson(JSON.stringify(project));
    expect(restored.edits).toHaveLength(2);
  });
});
