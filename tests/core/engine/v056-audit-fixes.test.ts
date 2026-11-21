import { describe, expect, it } from 'vitest';
import {
  buildTauriExportFiles,
  compileProjectToContentJson,
  createEmptyProject,
} from '../../../src/core/index.js';
import { lintProjectInMemory } from '../../../src/core/validators/project-linter.js';

describe('Audit Fixes (Compiler, Tauri Export & Linter)', () => {
  it('uses TargetField for Data/Shops and TextOperations for Data/NPCGiftTastes', () => {
    const base = createEmptyProject({
      name: 'Safe Patches',
      author: 'Smane',
      version: '0.5.5',
      description: 'Non-destructive patches',
      uniqueId: 'Smane.SafePatches',
    });

    const project = {
      ...base,
      edits: [
        {
          kind: 'shop' as const,
          id: 'shop-1',
          shopId: 'SeedShop' as const,
          itemId: 'Smane.SafePatches_Cake',
          price: 250,
        },
        {
          kind: 'giftTaste' as const,
          id: 'gift-1',
          npcName: 'Abigail',
          taste: 'Love' as const,
          itemId: 'Smane.SafePatches_Cake',
        },
      ],
    };

    const content = compileProjectToContentJson(project);
    const shopPatch = content.Changes[0];
    const giftPatch = content.Changes[1];

    expect(shopPatch?.Action).toBe('EditData');
    if (shopPatch?.Action === 'EditData') {
      expect(shopPatch.TargetField).toEqual(['SeedShop', 'Items']);
      expect(shopPatch.Fields).toBeUndefined();
      expect(shopPatch.Entries).toHaveProperty('shop-1');
    }

    expect(giftPatch?.Action).toBe('EditData');
    if (giftPatch?.Action === 'EditData') {
      expect(giftPatch.Fields).toBeUndefined();
      expect(giftPatch.TextOperations).toEqual([
        {
          Operation: 'Append',
          Target: ['Entries', 'Abigail', '1'],
          Value: 'Smane.SafePatches_Cake',
          Delimiter: ' ',
        },
      ]);
    }
  });

  it('emits Load + Texture for linked object sprites and Data/Objects for custom fish', () => {
    const base = createEmptyProject({
      name: 'Sprite & Fish',
      author: 'Smane',
      version: '0.5.5',
      description: 'Tests object sprite & fish object',
      uniqueId: 'Smane.SpriteFish',
    });

    const project = {
      ...base,
      assets: [
        {
          id: 'cake-png',
          relativePath: 'assets/cake.png',
          kind: 'png' as const,
          dataBase64: 'AAAA',
        },
      ],
      configOptions: [
        { id: 'cfg-1', key: 'EnableMod', optionType: 'toggle' as const, defaultValue: 'true' },
      ],
      translations: { default: { cakeName: 'Berry Cake' } },
      edits: [
        {
          kind: 'object' as const,
          id: 'obj-1',
          itemId: 'Smane.SpriteFish_Cake',
          displayName: 'Berry Cake',
          description: 'Yum',
          price: 150,
          edibility: 40,
          category: -7,
          assetId: 'cake-png',
        },
        {
          kind: 'fish' as const,
          id: 'fish-1',
          fishId: 'Smane.SpriteFish_GoldFin',
          displayName: 'Gold Fin',
          minSize: 5,
          maxSize: 15,
          difficulty: 40,
          behavior: 'smooth' as const,
          seasons: ['Summer'],
          weather: 'sunny' as const,
          waterLocation: 'Ocean' as const,
          price: 300,
        },
      ],
    };

    const content = compileProjectToContentJson(project);
    expect(content.Changes[0]?.Action).toBe('Load');
    const objPatch = content.Changes[1];
    if (objPatch?.Action === 'EditData') {
      expect(objPatch.Entries?.['Smane.SpriteFish_Cake']).toMatchObject({
        Texture: 'Mods/Smane.SpriteFish/cake-png',
        SpriteIndex: 0,
      });
    }

    const fishObjPatch = content.Changes[2];
    if (fishObjPatch?.Action === 'EditData') {
      expect(fishObjPatch.Target).toBe('Data/Objects');
      expect(fishObjPatch.Entries?.['Smane.SpriteFish_GoldFin']).toMatchObject({
        Price: 300,
        Category: -4,
      });
    }

    const tauriFiles = buildTauriExportFiles(project);
    expect(tauriFiles.map((f) => f.relativePath)).toEqual([
      'manifest.json',
      'content.json',
      'config.json',
      'i18n/default.json',
      'assets/cake.png',
    ]);
    expect(tauriFiles[4]?.isBase64).toBe(true);

    const lint = lintProjectInMemory(project);
    expect(lint.valid).toBe(true);
    expect(lint.warnings).toHaveLength(0);
  });
});
