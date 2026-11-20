import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SecurityError,
  assertAllowedModFileExtension,
  assertContentPatcherOnlyManifest,
  assertSafeWriteTarget,
  createEmptyProject,
  exportModPackage,
  exportModZipArchive,
  generateUniqueId,
  importPngAssetSafely,
  launchSmapiWithLogMonitor,
  lintProjectBeforeBuild,
  validateAssetBuffer,
  validateContentJson,
  validateManifest,
} from '../../../src/core/index.js';
import type { SdvProjectFile } from '../../../src/data/models/index.js';

function createValidRgbaPng(width = 16, height = 16): Uint8Array {
  const bytes = new Uint8Array(29);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  bytes[24] = 8;
  bytes[25] = 6;
  return bytes;
}

describe('Phase 5 Step 28: Full src/core Integration & Security Suite', () => {
  let tempRoot: string;
  let projectDir: string;
  let modsDir: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-int-'));
    projectDir = path.join(tempRoot, 'project');
    modsDir = path.join(tempRoot, 'Mods');
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(modsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('runs full pipeline from .sdvproj to valid Content Patcher Mod & Nexus ZIP', async () => {
    const rawPngPath = path.join(tempRoot, 'Star Berry.png');
    await fs.writeFile(rawPngPath, createValidRgbaPng(16, 16));
    const imported = await importPngAssetSafely(rawPngPath, projectDir, 'berry-sprite');

    const uniqueId = generateUniqueId('Stardew Author', 'Star Berry Mod');
    const base = createEmptyProject({
      name: 'Star Berry Mod',
      author: 'Stardew Author',
      version: '1.0.0',
      description: 'Adds Star Berry, crop, retexture, dialogue, config, and i18n.',
      uniqueId,
      updateKeys: ['Nexus:99999'],
    });

    const fullProject: SdvProjectFile = {
      ...base,
      assets: [imported.asset],
      edits: [
        {
          kind: 'object',
          id: 'obj-1',
          itemId: `${uniqueId}_StarBerry`,
          displayName: 'Star Berry',
          description: 'Tastes like starlight.',
          price: 250,
          edibility: 40,
          category: -79,
          recipe: { kind: 'cooking', ingredients: { '245': 1, '246': 1 } },
        },
        {
          kind: 'crop',
          id: 'crop-1',
          seedItemId: `${uniqueId}_StarSeeds`,
          harvestItemId: `${uniqueId}_StarBerry`,
          seasons: ['Summer', 'Fall'],
          daysInPhase: [1, 2, 2, 3],
        },
        {
          kind: 'retexture',
          id: 'ret-1',
          target: 'Maps/springobjects',
          assetId: imported.asset.id,
          fromArea: { X: 0, Y: 0, Width: 16, Height: 16 },
          toArea: { X: 0, Y: 0, Width: 16, Height: 16 },
        },
        {
          kind: 'dialogue',
          id: 'dlg-1',
          npcName: 'Abigail',
          dialogueKey: 'summer_Mon',
          text: 'Hey @! Did you grow a Star Berry?$h',
        },
      ],
      configOptions: [
        {
          id: 'cfg-1',
          key: 'EnableStarBerry',
          optionType: 'toggle',
          defaultValue: 'true',
        },
      ],
      translations: {
        es: { [`object.${uniqueId}_StarBerry.name`]: 'Baya Estelar' },
      },
    };

    const lint = await lintProjectBeforeBuild(fullProject, { projectDir });
    expect(lint.valid).toBe(true);

    const exported = await exportModPackage({ project: fullProject, projectDir, modsDir });
    const manifestJson: unknown = JSON.parse(
      await fs.readFile(path.join(exported.exportedModDir, 'manifest.json'), 'utf-8'),
    );
    const contentJson: unknown = JSON.parse(
      await fs.readFile(path.join(exported.exportedModDir, 'content.json'), 'utf-8'),
    );

    const validManifest = validateManifest(manifestJson);
    const validContent = validateContentJson(contentJson);
    expect(validManifest.ContentPackFor.UniqueID).toBe('Pathoschild.ContentPatcher');
    expect(validContent.Changes).toHaveLength(5);
    expect(validContent.ConfigSchema?.['EnableStarBerry']?.Default).toBe('true');

    const zipResult = await exportModZipArchive({
      project: fullProject,
      projectDir,
      outputZipPath: path.join(tempRoot, 'StarBerryMod.zip'),
      allowedRoots: [tempRoot],
    });
    expect(zipResult.rootFolderName).toBe('[CP] Star Berry Mod');
    expect(zipResult.entryCount).toBe(6);
  });

  it('blocks malicious inputs across security boundaries', async () => {
    expect(() => assertAllowedModFileExtension('evil.dll')).toThrowError(SecurityError);
    expect(() => assertAllowedModFileExtension('payload.ps1')).toThrowError(SecurityError);
    expect(() => {
      assertContentPatcherOnlyManifest({
        Name: 'Evil',
        EntryDll: 'Evil.dll',
        ContentPackFor: { UniqueID: 'Pathoschild.ContentPatcher' },
      });
    }).toThrowError(SecurityError);

    await expect(
      assertSafeWriteTarget(path.join(projectDir, '..', '..', 'escape.json'), [projectDir]),
    ).rejects.toThrowError(SecurityError);

    const spoofedPng = new TextEncoder().encode('MZ\x90\x00EXECUTABLE');
    expect(() => validateAssetBuffer(spoofedPng, 'png')).toThrowError(SecurityError);

    const xxeTmx = new TextEncoder().encode(
      '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///c:/secret">]><map/>',
    );
    expect(() => validateAssetBuffer(xxeTmx, 'tmx')).toThrowError(SecurityError);

    expect(() =>
      launchSmapiWithLogMonitor({
        smapiExecutablePath: 'powershell.exe',
        modUniqueId: 'Farmer.Test',
        onLogEntry: () => {},
      }),
    ).toThrowError(SecurityError);
  });
});
