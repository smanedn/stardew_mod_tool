import { describe, expect, it } from 'vitest';
import { compileProjectToContentJson, createEmptyProject } from '../../../src/core/index.js';

describe('v0.8.0 Phase 3 Sprite Linking (Crop, Weapon, Fish)', () => {
  it('emits Load + Texture + SpriteIndex for linked Crop, Weapon, and Fish sprites', () => {
    const base = createEmptyProject({
      name: 'Sprite Pack',
      author: 'Smane',
      version: '0.8.0',
      description: 'Sprite linking test',
      uniqueId: 'Smane.SpritePack',
    });

    const project = {
      ...base,
      assets: [
        { id: 'crop-png', relativePath: 'assets/crop.png', kind: 'png' as const },
        { id: 'sword-png', relativePath: 'assets/sword.png', kind: 'png' as const },
        { id: 'fish-png', relativePath: 'assets/fish.png', kind: 'png' as const },
      ],
      edits: [
        {
          kind: 'crop' as const,
          id: 'crop-1',
          seedItemId: 'Smane.SpritePack_Seeds',
          harvestItemId: 'Smane.SpritePack_Fruit',
          seasons: ['Spring'],
          daysInPhase: [1, 2, 2],
          assetId: 'crop-png',
        },
        {
          kind: 'weapon' as const,
          id: 'wpn-1',
          weaponId: 'Smane.SpritePack_Blade',
          displayName: 'Star Blade',
          description: 'Shiny.',
          weaponType: 'Sword' as const,
          minDamage: 10,
          maxDamage: 20,
          critChance: 0.05,
          speed: 2,
          defense: 1,
          assetId: 'sword-png',
        },
        {
          kind: 'fish' as const,
          id: 'fish-1',
          fishId: 'Smane.SpritePack_BlueFin',
          displayName: 'Blue Fin',
          minSize: 5,
          maxSize: 15,
          difficulty: 45,
          behavior: 'smooth' as const,
          seasons: ['Summer'],
          weather: 'sunny' as const,
          waterLocation: 'Ocean' as const,
          price: 180,
          assetId: 'fish-png',
        },
      ],
    };

    const content = compileProjectToContentJson(project);
    const loadTargets = content.Changes.filter((c) => c.Action === 'Load').map((c) => c.Target);
    expect(loadTargets).toEqual([
      'Mods/Smane.SpritePack/crop-png',
      'Mods/Smane.SpritePack/sword-png',
      'Mods/Smane.SpritePack/fish-png',
    ]);
  });
});
