import { describe, expect, it } from 'vitest';
import {
  buildLocaleFileMap,
  extractDefaultTranslations,
  toI18nToken,
} from '../../../src/core/engine/index.js';
import { SDVPROJ_FORMAT_VERSION, type SdvProjectFile } from '../../../src/data/models/index.js';

describe('Phase 3 Step 20: Multi-Language Localization (i18n)', () => {
  it('extracts object and dialogue strings into i18n/default.json and builds locale files', () => {
    const project: SdvProjectFile = {
      formatVersion: SDVPROJ_FORMAT_VERSION,
      updatedAt: '2026-11-20T00:00:00.000Z',
      metadata: {
        name: 'Golden Parsnip',
        author: 'Farmer',
        version: '1.0.0',
        description: '',
        uniqueId: 'Farmer.GoldenParsnip',
      },
      assets: [],
      edits: [
        {
          kind: 'object',
          id: 'obj-1',
          itemId: 'Farmer.GoldenParsnip_Item',
          displayName: 'Golden Parsnip',
          description: 'A shiny root vegetable.',
          price: 120,
          edibility: 25,
          category: -75,
        },
        {
          kind: 'dialogue',
          id: 'dlg-1',
          npcName: 'Abigail',
          dialogueKey: 'Mon',
          text: 'Whoa, is that a golden parsnip?$h',
        },
      ],
      translations: {
        it: {
          'object.Farmer.GoldenParsnip_Item.name': 'Pastinaca Dorata',
        },
      },
    };

    const defaults = extractDefaultTranslations(project);
    expect(defaults).toEqual({
      'object.Farmer.GoldenParsnip_Item.name': 'Golden Parsnip',
      'object.Farmer.GoldenParsnip_Item.description': 'A shiny root vegetable.',
      'dialogue.Abigail.Mon': 'Whoa, is that a golden parsnip?$h',
    });

    const files = buildLocaleFileMap(project);
    expect(files['i18n/default.json']).toEqual(defaults);
    expect(files['i18n/it.json']).toEqual({
      'object.Farmer.GoldenParsnip_Item.name': 'Pastinaca Dorata',
    });
    expect(toI18nToken('object.Farmer.GoldenParsnip_Item.name')).toBe(
      '{{i18n:object.Farmer.GoldenParsnip_Item.name}}',
    );
  });
});
