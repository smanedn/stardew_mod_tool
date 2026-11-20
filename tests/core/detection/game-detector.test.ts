import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectContentPatcherStatus,
  detectGameEnvironment,
  detectSmapiStatus,
  parseSteamLibraryPaths,
} from '../../../src/core/detection/index.js';

describe('Phase 1 Step 3: Game and SMAPI Detection System', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-detect-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('parses Steam libraryfolders.vdf paths', () => {
    const vdf = `
      "libraryfolders"
      {
        "0" { "path" "C:\\\\Program Files (x86)\\\\Steam" }
        "1" { "path" "D:\\\\SteamLibrary" }
      }
    `;
    expect(parseSteamLibraryPaths(vdf)).toEqual([
      'C:\\Program Files (x86)\\Steam',
      'D:\\SteamLibrary',
    ]);
  });

  it('detects manual game directory, SMAPI version, and Content Patcher version', async () => {
    const gameDir = path.join(tempRoot, 'Stardew Valley');
    const cpDir = path.join(gameDir, 'Mods', 'ContentPatcher');
    await fs.mkdir(cpDir, { recursive: true });

    await fs.writeFile(path.join(gameDir, 'Stardew Valley.dll'), '');
    await fs.writeFile(path.join(gameDir, 'StardewModdingAPI.exe'), '');
    await fs.writeFile(
      path.join(gameDir, 'StardewModdingAPI.deps.json'),
      '{"libraries":{"StardewModdingAPI/4.1.10":{"type":"project"}}}',
    );
    await fs.writeFile(
      path.join(cpDir, 'manifest.json'),
      JSON.stringify({
        Name: 'Content Patcher',
        UniqueID: 'Pathoschild.ContentPatcher',
        Version: '2.4.3',
      }),
    );

    const env = await detectGameEnvironment({ manualGameDir: gameDir });
    expect(env.gameDirectory).toBe(gameDir);
    expect(env.storefront).toBe('Manual');
    expect(env.smapi.installed).toBe(true);
    expect(env.smapi.version).toBe('4.1.10');
    expect(env.contentPatcher.installed).toBe(true);
    expect(env.contentPatcher.version).toBe('2.4.3');
  });

  it('returns not-installed status when SMAPI or Content Patcher are missing', async () => {
    const gameDir = path.join(tempRoot, 'VanillaOnly');
    await fs.mkdir(path.join(gameDir, 'Content'), { recursive: true });

    const smapi = await detectSmapiStatus(gameDir);
    const cp = await detectContentPatcherStatus(path.join(gameDir, 'Mods'));

    expect(smapi.installed).toBe(false);
    expect(cp.installed).toBe(false);
  });
});
