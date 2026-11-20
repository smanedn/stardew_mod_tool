import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateUniqueId, incrementSemVer } from '../../../src/core/engine/index.js';
import {
  lintProjectBeforeBuild,
  validateJsonSyntax,
} from '../../../src/core/validators/index.js';
import { SDVPROJ_FORMAT_VERSION, type SdvProjectFile } from '../../../src/data/models/index.js';

describe('Phase 2 Steps 10 & 11: ID/Version Generator & Mod Linter', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-lint-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('generates valid UniqueIDs and increments SemVer cleanly', () => {
    expect(generateUniqueId('John Doe!', 'My Cool Mod 2')).toBe('JohnDoe.MyCoolMod2');
    expect(generateUniqueId('***', '')).toBe('Author.MyMod');

    expect(incrementSemVer('1.0.0', 'patch')).toBe('1.0.1');
    expect(incrementSemVer('1.2.9', 'minor')).toBe('1.3.0');
    expect(incrementSemVer('1.2.9', 'major')).toBe('2.0.0');
  });

  it('validates raw JSON syntax', () => {
    expect(validateJsonSyntax('{"ok": true}')).toBeNull();
    expect(validateJsonSyntax('{bad json')).toMatchObject({
      severity: 'error',
      code: 'INVALID_JSON_SYNTAX',
    });
  });

  it('catches missing .png files, duplicate IDs, and unknown game targets', async () => {
    const project: SdvProjectFile = {
      formatVersion: SDVPROJ_FORMAT_VERSION,
      updatedAt: '2026-11-20T00:00:00.000Z',
      metadata: {
        name: 'Test Mod',
        author: 'Farmer',
        version: '1.0.0',
        description: 'Test',
        uniqueId: 'Farmer.TestMod',
      },
      assets: [{ id: 'a1', relativePath: 'assets/missing.png', kind: 'png' }],
      edits: [
        {
          kind: 'object',
          id: 'dup-1',
          itemId: 'Farmer.Item',
          displayName: 'Item 1',
          description: '',
          price: 10,
          edibility: 0,
          category: -75,
        },
        {
          kind: 'object',
          id: 'dup-1',
          itemId: 'Farmer.Item',
          displayName: 'Item 2',
          description: '',
          price: 10,
          edibility: 0,
          category: -75,
        },
        {
          kind: 'retexture',
          id: 'ret-1',
          target: 'Maps/nonexistent_sheet',
          assetId: 'a1',
        },
      ],
    };

    const report = await lintProjectBeforeBuild(project, { projectDir: tempRoot });
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'DUPLICATE_ID')).toBe(true);
    expect(report.errors.some((e) => e.code === 'MISSING_ASSET_FILE')).toBe(true);
    expect(report.warnings.some((w) => w.code === 'INVALID_GAME_TARGET')).toBe(true);
  });

  it('passes linting for a valid project with existing assets', async () => {
    const assetsDir = path.join(tempRoot, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });
    await fs.writeFile(path.join(assetsDir, 'sprite.png'), 'png-placeholder');

    const project: SdvProjectFile = {
      formatVersion: SDVPROJ_FORMAT_VERSION,
      updatedAt: '2026-11-20T00:00:00.000Z',
      metadata: {
        name: 'Valid Mod',
        author: 'Farmer',
        version: '1.0.0',
        description: 'Valid',
        uniqueId: 'Farmer.ValidMod',
      },
      assets: [{ id: 'a1', relativePath: 'assets/sprite.png', kind: 'png' }],
      edits: [
        {
          kind: 'retexture',
          id: 'ret-1',
          target: 'Maps/springobjects',
          assetId: 'a1',
        },
      ],
    };

    const report = await lintProjectBeforeBuild(project, { projectDir: tempRoot });
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings).toHaveLength(0);
  });
});
