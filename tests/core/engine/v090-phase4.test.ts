import { describe, expect, it } from 'vitest';
import {
  createBrowserModZipBytes,
  importModFromZipBytes,
} from '../../../src/core/engine/index.js';
import { SDVPROJ_FORMAT_VERSION, type SdvProjectFile } from '../../../src/data/models/index.js';

describe('v0.9.0 Phase 4 Expanded Zip Importer (Furniture, Fish & PNG Assets)', () => {
  it('imports Data/Furniture, Data/Fish, and PNG assets from a .zip archive', async () => {
    const original: SdvProjectFile = {
      formatVersion: SDVPROJ_FORMAT_VERSION,
      updatedAt: '2026-11-21T00:00:00.000Z',
      metadata: {
        name: 'Cozy Decor & Pond',
        author: 'Smane',
        version: '0.9.0',
        description: 'Furniture, fish, and sprites.',
        uniqueId: 'Smane.CozyDecorPond',
      },
      assets: [
        {
          id: 'fish-png',
          relativePath: 'assets/koi.png',
          kind: 'png',
          dataBase64: 'iVBORw0KGgo=',
        },
      ],
      edits: [
        {
          kind: 'furniture',
          id: 'furn-1',
          furnitureId: 'Smane.CozyDecorPond_OakLamp',
          displayName: 'Oak Lamp',
          furnitureType: 'lamp',
          tileSize: '1x1',
          price: 450,
        },
        {
          kind: 'fish',
          id: 'fish-1',
          fishId: 'Smane.CozyDecorPond_GoldKoi',
          displayName: 'Gold Koi',
          minSize: 8,
          maxSize: 22,
          difficulty: 60,
          behavior: 'dart',
          seasons: ['Spring', 'Summer'],
          weather: 'sunny',
          waterLocation: 'Lake',
          price: 280,
          assetId: 'fish-png',
        },
      ],
    };

    const { bytes } = createBrowserModZipBytes(original);
    const imported = await importModFromZipBytes(bytes);

    expect(imported.summary.furnitureCount).toBe(1);
    expect(imported.summary.fishCount).toBe(1);
    expect(imported.summary.assetsCount).toBe(1);
    expect(imported.project.assets[0]?.relativePath).toBe('assets/koi.png');
    expect(imported.project.assets[0]?.dataBase64).toBe('iVBORw0KGgo=');

    const furn = imported.project.edits.find((e) => e.kind === 'furniture');
    expect(furn?.displayName).toBe('Oak Lamp');
    expect(furn?.furnitureType).toBe('lamp');
    expect(furn?.price).toBe(450);

    const fish = imported.project.edits.find((e) => e.kind === 'fish');
    expect(fish?.displayName).toBe('Gold Koi');
    expect(fish?.behavior).toBe('dart');
    expect(fish?.difficulty).toBe(60);
  });
});
