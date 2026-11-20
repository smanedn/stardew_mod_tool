import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  SecurityError,
  createEmptyProject,
  discoverSvmmModpacks,
  exportModToSvmmModpack,
} from '../../../src/core/index.js';

describe('SVMM (Stardew Valley Mod Manager) Integration', () => {
  let tempRoot: string;
  let projectDir: string;
  let svmmDataDir: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-svmm-'));
    projectDir = path.join(tempRoot, 'project');
    svmmDataDir = path.join(tempRoot, 'SVMM_Data');
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(svmmDataDir, 'modpacks', 'CozyPack'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('discovers SVMM modpacks and exports a mod directly into a modpack folder', async () => {
    const packs = await discoverSvmmModpacks(svmmDataDir);
    expect(packs.map((p) => p.name)).toEqual(['CozyPack']);

    const project = createEmptyProject({
      name: 'Golden Starberry',
      author: 'Smane',
      version: '0.3.0',
      description: 'SVMM link test',
      uniqueId: 'Smane.GoldenStarberry',
    });

    const result = await exportModToSvmmModpack({
      project,
      projectDir,
      svmmDataDir,
      modpackName: 'CozyPack',
    });

    const expectedDir = path.join(svmmDataDir, 'modpacks', 'CozyPack', '[CP] Golden Starberry');
    expect(result.exportedModDir).toBe(expectedDir);
    await expect(fs.access(path.join(expectedDir, 'manifest.json'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(expectedDir, 'content.json'))).resolves.toBeUndefined();
  });

  it('blocks path traversal in SVMM modpack name', async () => {
    const project = createEmptyProject({
      name: 'Bad',
      author: 'Smane',
      version: '1.0.0',
      description: '',
      uniqueId: 'Smane.Bad',
    });

    await expect(
      exportModToSvmmModpack({
        project,
        projectDir,
        svmmDataDir,
        modpackName: '../escape',
      }),
    ).rejects.toThrowError(SecurityError);
  });
});
