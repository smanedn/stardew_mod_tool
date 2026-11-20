import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  exportModZipArchive,
  formatNexusRootFolderName,
} from '../../../src/core/engine/index.js';
import { SDVPROJ_FORMAT_VERSION, type SdvProjectFile } from '../../../src/data/models/index.js';

describe('Phase 4 Step 25: Distribution Packaging (Export ZIP)', () => {
  let tempRoot: string;
  let projectDir: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-zip-'));
    projectDir = path.join(tempRoot, 'project');
    await fs.mkdir(path.join(projectDir, 'assets'), { recursive: true });
    await fs.writeFile(path.join(projectDir, 'assets', 'parsnip.png'), 'png-data');
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('packages a Nexus-ready .zip archive with a [CP] root folder', async () => {
    expect(formatNexusRootFolderName('Golden: Parsnip?')).toBe('[CP] Golden Parsnip');

    const project: SdvProjectFile = {
      formatVersion: SDVPROJ_FORMAT_VERSION,
      updatedAt: '2026-11-20T00:00:00.000Z',
      metadata: {
        name: 'Golden Parsnip',
        author: 'Farmer',
        version: '1.0.0',
        description: 'Shiny parsnip',
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
    };

    const outputZipPath = path.join(tempRoot, 'dist', 'GoldenParsnip-1.0.0.zip');
    const result = await exportModZipArchive({
      project,
      projectDir,
      outputZipPath,
      allowedRoots: [tempRoot],
    });

    expect(result.rootFolderName).toBe('[CP] Golden Parsnip');
    expect(result.entryCount).toBe(4);
    const zipBytes = await fs.readFile(result.zipPath);
    expect(zipBytes[0]).toBe(0x50); // 'P'
    expect(zipBytes[1]).toBe(0x4b); // 'K'
    expect(zipBytes.includes(Buffer.from('[CP] Golden Parsnip/manifest.json'))).toBe(true);
    expect(zipBytes.includes(Buffer.from('[CP] Golden Parsnip/content.json'))).toBe(true);
  });
});
