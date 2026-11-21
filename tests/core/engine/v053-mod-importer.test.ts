import { describe, expect, it } from 'vitest';
import {
  buildStoredZipBytes,
  createBrowserModZipBytes,
  importContentPatcherMod,
  importModFromZipBytes,
} from '../../../src/core/engine/index.js';
import { SDVPROJ_FORMAT_VERSION, type SdvProjectFile } from '../../../src/data/models/index.js';

describe('v0.5.3 Mod Importer (.zip & manifest.json + content.json)', () => {
  it('imports items, crops, and dialogues from SMAPI manifest.json + content.json', () => {
    const manifestJson = `{
      // SMAPI manifest
      "Name": "Cozy Valley Pack",
      "Author": "Smane",
      "Version": "1.2.0",
      "Description": "Adds berries, crops, and Abigail dialogue.",
      "UniqueID": "Smane.CozyValleyPack",
    }`;

    const contentJson = `{
      "Format": "2.0.0",
      "Changes": [
        {
          "Action": "EditData",
          "Target": "Data/Objects",
          "Entries": {
            "Smane.CozyValleyPack_StarBerry": {
              "Name": "Smane.CozyValleyPack_StarBerry",
              "DisplayName": "Star Berry",
              "Description": "Sweet cosmic berry.",
              "Price": 140,
              "Edibility": 35,
              "Category": -79,
              "Buffs": [
                {
                  "Duration": 180,
                  "CustomAttributes": { "Speed": 1, "LuckLevel": 2 }
                }
              ]
            }
          }
        },
        {
          "Action": "EditData",
          "Target": "Data/Crops",
          "Entries": {
            "Smane.CozyValleyPack_StarSeeds": {
              "Seasons": ["Spring", "Summer"],
              "DaysInPhase": [1, 2, 3, 2],
              "HarvestItemId": "Smane.CozyValleyPack_StarBerry"
            }
          }
        },
        {
          "Action": "EditData",
          "Target": "Characters/Dialogue/Abigail",
          "When": { "Season": "spring" },
          "Entries": {
            "Mon": "Have you tried the Star Berries?$h"
          }
        },
        {
          "Action": "EditImage",
          "Target": "Maps/springobjects",
          "FromFile": "assets/berry.png"
        }
      ]
    }`;

    const result = importContentPatcherMod({ manifestJson, contentJson });

    expect(result.project.metadata.name).toBe('Cozy Valley Pack');
    expect(result.project.metadata.uniqueId).toBe('Smane.CozyValleyPack');
    expect(result.summary.itemsCount).toBe(1);
    expect(result.summary.cropsCount).toBe(1);
    expect(result.summary.dialoguesCount).toBe(1);
    expect(result.summary.skippedPatches).toBe(1);

    const item = result.project.edits.find((e) => e.kind === 'object');
    expect(item?.displayName).toBe('Star Berry');
    expect(item?.price).toBe(140);
    expect(item?.buff?.luck).toBe(2);

    const crop = result.project.edits.find((e) => e.kind === 'crop');
    expect(crop?.seedItemId).toBe('Smane.CozyValleyPack_StarSeeds');
    expect(crop?.seasons).toEqual(['Spring', 'Summer']);

    const dialogue = result.project.edits.find((e) => e.kind === 'dialogue');
    expect(dialogue?.npcName).toBe('Abigail');
    expect(dialogue?.dialogueKey).toBe('Mon');
    expect(dialogue?.when).toEqual({ Season: 'spring' });
  });

  it('round-trips a full exported .zip mod back into editable project state', async () => {
    const original: SdvProjectFile = {
      formatVersion: SDVPROJ_FORMAT_VERSION,
      updatedAt: '2026-11-21T00:00:00.000Z',
      metadata: {
        name: 'Zip Roundtrip Mod',
        author: 'Smane',
        version: '0.5.3',
        description: 'Roundtrip test mod',
        uniqueId: 'Smane.ZipRoundtripMod',
      },
      assets: [],
      edits: [
        {
          kind: 'object',
          id: 'obj-1',
          itemId: 'Smane.ZipRoundtripMod_HoneyTart',
          displayName: 'Honey Tart',
          description: 'Golden tart.',
          price: 220,
          edibility: 45,
          category: -7,
        },
        {
          kind: 'crop',
          id: 'crop-1',
          seedItemId: 'Smane.ZipRoundtripMod_GoldenSeeds',
          harvestItemId: 'Smane.ZipRoundtripMod_HoneyTart',
          seasons: ['Fall'],
          daysInPhase: [2, 2, 3],
        },
        {
          kind: 'dialogue',
          id: 'dlg-1',
          npcName: 'Penny',
          dialogueKey: 'Fri',
          text: 'The fall breeze feels wonderful today.',
        },
      ],
    };

    const { bytes } = createBrowserModZipBytes(original);
    const imported = await importModFromZipBytes(bytes);

    expect(imported.project.metadata.uniqueId).toBe('Smane.ZipRoundtripMod');
    expect(imported.summary.itemsCount).toBe(1);
    expect(imported.summary.cropsCount).toBe(1);
    expect(imported.summary.dialoguesCount).toBe(1);
    expect(imported.project.edits).toHaveLength(3);
  });

  it('throws a clear error when .zip archive has no manifest.json', async () => {
    const encoder = new TextEncoder();
    const zipBytes = buildStoredZipBytes([
      { path: 'MyMod/readme.txt', data: encoder.encode('hello') },
    ]);

    await expect(importModFromZipBytes(zipBytes)).rejects.toThrow('No manifest.json found');
  });
});
