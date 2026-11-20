import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  compileModToDirectory,
  importPngAssetSafely,
  parseAndVerifyRgbaPngHeader,
  sanitizePngFileName,
  stripNullAndUndefined,
} from '../../../src/core/engine/index.js';
import { SecurityError } from '../../../src/core/security/index.js';
import { SDVPROJ_FORMAT_VERSION, type SdvProjectFile } from '../../../src/data/models/index.js';

function buildMinimalPngBuffer(
  width: number,
  height: number,
  bitDepth: number,
  colorType: number,
): Uint8Array {
  const bytes = new Uint8Array(29);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // IHDR
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  bytes[24] = bitDepth;
  bytes[25] = colorType;
  return bytes;
}

describe('Phase 2 Steps 8 & 9: Serialization Engine & Safe Asset Manager', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-engine-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('strips null and undefined properties cleanly', () => {
    const cleaned = stripNullAndUndefined({
      Name: 'Test',
      OptionalField: undefined,
      NullField: null,
      Nested: { Keep: 1, Drop: null },
    });
    expect(cleaned).toEqual({ Name: 'Test', Nested: { Keep: 1 } });
  });

  it('compiles .sdvproj into clean manifest.json and content.json files', async () => {
    const project: SdvProjectFile = {
      formatVersion: SDVPROJ_FORMAT_VERSION,
      updatedAt: '2026-11-20T00:00:00.000Z',
      metadata: {
        name: 'Golden Parsnip',
        author: 'Farmer',
        version: '1.0.0',
        description: 'Adds a golden parsnip',
        uniqueId: 'Farmer.GoldenParsnip',
      },
      assets: [{ id: 'sprite-1', relativePath: 'assets/golden-parsnip.png', kind: 'png' }],
      edits: [
        {
          kind: 'object',
          id: 'edit-1',
          itemId: 'Farmer.GoldenParsnip_Item',
          displayName: 'Golden Parsnip',
          description: 'Shiny!',
          price: 150,
          edibility: 25,
          category: -75,
        },
        {
          kind: 'retexture',
          id: 'edit-2',
          target: 'Maps/springobjects',
          assetId: 'sprite-1',
          toArea: { X: 0, Y: 0, Width: 16, Height: 16 },
        },
      ],
    };

    const outDir = path.join(tempRoot, 'build');
    const { manifestPath, contentPath } = await compileModToDirectory(project, outDir, [tempRoot]);

    const manifestText = await fs.readFile(manifestPath, 'utf-8');
    const contentText = await fs.readFile(contentPath, 'utf-8');

    expect(manifestText).toContain('"UniqueID": "Farmer.GoldenParsnip"');
    expect(contentText).toContain('"Action": "EditData"');
    expect(contentText).toContain('"Action": "EditImage"');
    expect(contentText).toContain('"FromFile": "assets/golden-parsnip.png"');
  });

  it('sanitizes PNG filenames and verifies 32-bit RGBA format on import', async () => {
    expect(sanitizePngFileName('My Cool Sprite (Final)!.PNG')).toBe('my-cool-sprite-final.png');

    const rgbaPng = buildMinimalPngBuffer(16, 16, 8, 6);
    const sourcePath = path.join(tempRoot, 'Golden Parsnip!.PNG');
    await fs.writeFile(sourcePath, rgbaPng);

    const projectDir = path.join(tempRoot, 'project');
    await fs.mkdir(projectDir, { recursive: true });

    const imported = await importPngAssetSafely(sourcePath, projectDir, 'asset-1');
    expect(imported.asset.relativePath).toBe('assets/golden-parsnip.png');
    expect(imported.metadata).toEqual({ width: 16, height: 16, bitDepth: 8, colorType: 6 });

    const rgbOnlyPng = buildMinimalPngBuffer(16, 16, 8, 2);
    expect(() => parseAndVerifyRgbaPngHeader(rgbOnlyPng)).toThrowError(SecurityError);
  });
});
