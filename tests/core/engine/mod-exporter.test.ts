import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportModPackage } from '../../../src/core/engine/index.js';
import { SDVPROJ_FORMAT_VERSION, type SdvProjectFile } from '../../../src/data/models/index.js';

describe('Phase 4 Step 23: One-Click Exporter & Mod Manager Integration', () => {
  let tempRoot: string;
  let projectDir: string;
  let modsDir: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-export-'));
    projectDir = path.join(tempRoot, 'project');
    modsDir = path.join(tempRoot, 'Mods');
    await fs.mkdir(path.join(projectDir, 'assets'), { recursive: true });
    await fs.mkdir(modsDir, { recursive: true });
    await fs.writeFile(path.join(projectDir, 'assets', 'parsnip.png'), 'png-bytes');
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('exports manifest, content, config, i18n, and assets to Mods/ with backup', async () => {
    const project: SdvProjectFile = {
      formatVersion: SDVPROJ_FORMAT_VERSION,
      updatedAt: '2026-11-20T00:00:00.000Z',
      metadata: {
        name: 'Golden Parsnip',
        author: 'Farmer',
        version: '1.0.0',
        description: 'Adds golden parsnip',
        uniqueId: 'Farmer.GoldenParsnip',
      },
      assets: [{ id: 'a1', relativePath: 'assets/parsnip.png', kind: 'png' }],
      edits: [
        {
          kind: 'object',
          id: 'obj-1',
          itemId: 'Farmer.GoldenParsnip_Item',
          displayName: 'Golden Parsnip',
          description: 'Shiny!',
          price: 150,
          edibility: 25,
          category: -75,
        },
        {
          kind: 'retexture',
          id: 'ret-1',
          target: 'Maps/springobjects',
          assetId: 'a1',
        },
      ],
      configOptions: [
        {
          id: 'c1',
          key: 'EnableMod',
          optionType: 'toggle',
          defaultValue: 'true',
        },
      ],
      translations: {
        it: { 'object.Farmer.GoldenParsnip_Item.name': 'Pastinaca Dorata' },
      },
    };

    const onExported = vi.fn();
    const first = await exportModPackage({ project, projectDir, modsDir, onExported });

    expect(first.backupCreated).toBe(false);
    expect(first.modManagerNotified).toBe(true);
    expect(onExported).toHaveBeenCalledWith(path.join(modsDir, 'Farmer.GoldenParsnip'));

    const exportedModDir = first.exportedModDir;
    await expect(fs.access(path.join(exportedModDir, 'manifest.json'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(exportedModDir, 'content.json'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(exportedModDir, 'config.json'))).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(exportedModDir, 'i18n', 'default.json')),
    ).resolves.toBeUndefined();
    await expect(fs.access(path.join(exportedModDir, 'i18n', 'it.json'))).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(exportedModDir, 'assets', 'parsnip.png')),
    ).resolves.toBeUndefined();

    const second = await exportModPackage({ project, projectDir, modsDir });
    expect(second.backupCreated).toBe(true);
  });
});
