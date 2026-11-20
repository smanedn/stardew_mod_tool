import { describe, expect, it } from 'vitest';
import { SecurityError } from '../../../src/core/security/index.js';
import { validateContentJson, validateManifest } from '../../../src/core/validators/index.js';

describe('Phase 2 Steps 6 & 7: Manifest & Content Patcher 2.0+ Validation', () => {
  it('validates a complete manifest.json with optional dependencies and update keys', () => {
    const manifest = validateManifest({
      Name: 'Golden Crops',
      Author: 'Farmer',
      Version: '1.0.0',
      Description: 'Adds golden crops.',
      UniqueID: 'Farmer.GoldenCrops',
      MinimumApiVersion: '4.0.0',
      UpdateKeys: ['Nexus:12345'],
      ContentPackFor: {
        UniqueID: 'Pathoschild.ContentPatcher',
        MinimumVersion: '2.0.0',
      },
      Dependencies: [
        {
          UniqueID: 'spacechase0.GenericModConfigMenu',
          MinimumVersion: '1.12.0',
          IsRequired: false,
        },
      ],
    });

    expect(manifest.UniqueID).toBe('Farmer.GoldenCrops');
    expect(manifest.Dependencies?.[0]?.IsRequired).toBe(false);
  });

  it('rejects manifest.json with EntryDll or invalid UniqueID', () => {
    expect(() =>
      validateManifest({
        Name: 'Bad Mod',
        Author: 'Farmer',
        Version: '1.0.0',
        UniqueID: 'Farmer.BadMod',
        EntryDll: 'BadMod.dll',
        ContentPackFor: { UniqueID: 'Pathoschild.ContentPatcher' },
      }),
    ).toThrowError(SecurityError);
  });

  it('validates content.json with Load, EditData, EditImage, Include, DynamicTokens, and When', () => {
    const doc = validateContentJson({
      Format: '2.0.0',
      ConfigSchema: {
        EnableGolden: {
          AllowValues: 'true, false',
          Default: 'true',
          Description: 'Enable golden crops',
        },
      },
      DynamicTokens: [
        {
          Name: 'CropSeason',
          Value: 'Spring',
          When: { Season: 'spring' },
        },
      ],
      Changes: [
        {
          Action: 'Load',
          Target: 'Mods/Farmer.GoldenCrops/Sprites',
          FromFile: 'assets/sprites.png',
        },
        {
          Action: 'EditData',
          Target: 'Data/Objects',
          Entries: {
            'Farmer.GoldenCrops_Parsnip': { DisplayName: 'Golden Parsnip', Price: 120 },
          },
          When: { EnableGolden: 'true' },
        },
        {
          Action: 'EditImage',
          Target: 'Maps/springobjects',
          FromFile: 'assets/parsnip.png',
          FromArea: { X: 0, Y: 0, Width: 16, Height: 16 },
          ToArea: { X: 384, Y: 0, Width: 16, Height: 16 },
          PatchMode: 'Overlay',
        },
        {
          Action: 'Include',
          FromFile: 'assets/extra.json',
          When: { HasMod: 'Example.Mod' },
        },
      ],
    });

    expect(doc.Format).toBe('2.0.0');
    expect(doc.Changes).toHaveLength(4);
  });

  it('rejects EditData without Entries/Fields and rejects traversal in FromFile', () => {
    expect(() =>
      validateContentJson({
        Format: '2.0.0',
        Changes: [{ Action: 'EditData', Target: 'Data/Objects' }],
      }),
    ).toThrowError(SecurityError);

    expect(() =>
      validateContentJson({
        Format: '2.0.0',
        Changes: [
          {
            Action: 'Load',
            Target: 'Maps/Farm',
            FromFile: '../outside/evil.png',
          },
        ],
      }),
    ).toThrowError(SecurityError);
  });
});
