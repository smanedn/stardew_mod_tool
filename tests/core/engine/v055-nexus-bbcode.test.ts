import { describe, expect, it } from 'vitest';
import { generateNexusBbCode } from '../../../src/core/engine/index.js';
import { SDVPROJ_FORMAT_VERSION, type SdvProjectFile } from '../../../src/data/models/index.js';

describe('v0.5.5 Nexus Mods BBCode Generator', () => {
  it('generates copy-ready BBCode listing items, crops, dialogues, and install steps', () => {
    const project: SdvProjectFile = {
      formatVersion: SDVPROJ_FORMAT_VERSION,
      updatedAt: '2026-11-21T00:00:00.000Z',
      metadata: {
        name: 'Stardew Bakery',
        author: 'Smane',
        version: '0.5.5',
        description: 'Cozy pastries and crops for Pelican Town.',
        uniqueId: 'Smane.StardewBakery',
      },
      assets: [],
      edits: [
        {
          kind: 'object',
          id: 'obj-1',
          itemId: 'Smane.StardewBakery_Croissant',
          displayName: 'Butter Croissant',
          description: 'Warm flaky pastry.',
          price: 160,
          edibility: 40,
          category: -7,
        },
        {
          kind: 'crop',
          id: 'crop-1',
          seedItemId: 'Smane.StardewBakery_WheatSeeds',
          harvestItemId: 'Smane.StardewBakery_GoldenWheat',
          seasons: ['Spring', 'Fall'],
          daysInPhase: [1, 2, 2],
        },
        {
          kind: 'dialogue',
          id: 'dlg-1',
          npcName: 'Penny',
          dialogueKey: 'Mon',
          text: 'The bakery smells amazing!',
        },
        {
          kind: 'dialogue',
          id: 'dlg-2',
          npcName: 'Penny',
          dialogueKey: 'Tue',
          text: 'I saved a croissant for Jas.',
        },
      ],
    };

    const bbcode = generateNexusBbCode(project);

    expect(bbcode).toContain('[size=5][b]Stardew Bakery[/b][/size] [size=3]v0.5.5[/size]');
    expect(bbcode).toContain('by [b]Smane[/b]');
    expect(bbcode).toContain('[size=4][b]Custom Items[/b][/size]');
    expect(bbcode).toContain('[*] [b]Butter Croissant[/b] (160g) — Warm flaky pastry.');
    expect(bbcode).toContain('[size=4][b]Custom Crops[/b][/size]');
    expect(bbcode).toContain('Smane.StardewBakery_GoldenWheat (Spring, Fall)');
    expect(bbcode).toContain('[size=4][b]NPC Dialogues[/b][/size]');
    expect(bbcode).toContain('[*] [b]Penny[/b]: 2 dialogue lines');
    expect(bbcode).toContain('[size=4][b]Installation (SMAPI & SVMM)[/b][/size]');
    expect(bbcode).toContain('Stardew Valley Mod Manager (SVMM)');
    expect(bbcode).toContain('Smane.StardewBakery');
  });
});
