import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createEmptyProject,
  extractVanillaDatabaseFromContentDir,
  indexVanillaDump,
  loadProjectFile,
  saveProjectFile,
} from '../../../src/core/parsers/index.js';
import { SecurityError } from '../../../src/core/security/index.js';

describe('Phase 1 Steps 4 & 5: Vanilla Indexer & .sdvproj', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-parsers-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('indexes a 1.6+ vanilla dump into O(1) databases', () => {
    const db = indexVanillaDump({
      gameVersion: '1.6.15',
      objects: [{ id: '24', name: 'Parsnip', displayName: 'Parsnip', category: -75, price: 35 }],
      crops: [
        {
          id: '472',
          name: 'Parsnip Seeds',
          harvestItemId: '24',
          seasons: ['Spring'],
          daysInPhase: [1, 1, 1, 1],
        },
      ],
      npcs: [
        { id: 'Abigail', name: 'Abigail', displayName: 'Abigail', homeRegion: 'Town', canRomance: true },
      ],
      recipes: [
        {
          id: 'Fried Egg',
          name: 'Fried Egg',
          kind: 'cooking',
          outputItemId: '194',
          ingredients: { '-5': 1 },
        },
      ],
      locations: [{ id: 'Farm', name: 'Farm', displayName: 'Farm' }],
    });

    expect(db.objects.getById('24')?.price).toBe(35);
    expect(db.crops.getById('472')?.harvestItemId).toBe('24');
    expect(db.npcs.getById('Abigail')?.canRomance).toBe(true);
    expect(db.recipes.getById('Fried Egg')?.kind).toBe('cooking');
    expect(db.locations.getById('Farm')?.displayName).toBe('Farm');
  });

  it('extracts Objects.json and Locations.json from a Content/Data folder', async () => {
    const dataDir = path.join(tempRoot, 'Content', 'Data');
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(
      path.join(dataDir, 'Objects.json'),
      JSON.stringify({ '128': { Name: 'Pufferfish', DisplayName: 'Pufferfish', Price: 200 } }),
    );
    await fs.writeFile(
      path.join(dataDir, 'Locations.json'),
      JSON.stringify({ Town: { DisplayName: 'Pelican Town' } }),
    );

    const db = await extractVanillaDatabaseFromContentDir(dataDir);
    expect(db.objects.getById('128')?.price).toBe(200);
    expect(db.locations.getById('Town')?.displayName).toBe('Pelican Town');
  });

  it('creates, saves, and loads a validated .sdvproj file', async () => {
    const project = createEmptyProject({
      name: 'Golden Parsnip',
      author: 'Farmer',
      version: '1.0.0',
      description: 'Adds a golden parsnip',
      uniqueId: 'Farmer.GoldenParsnip',
    });

    const projectFile = path.join(tempRoot, 'golden-parsnip.json');
    await saveProjectFile(projectFile, project, [tempRoot]);
    const loaded = await loadProjectFile(projectFile, [tempRoot]);

    expect(loaded.metadata.uniqueId).toBe('Farmer.GoldenParsnip');
    expect(loaded.formatVersion).toBe(1);
  });

  it('rejects invalid UniqueID when creating a project', () => {
    expect(() =>
      createEmptyProject({
        name: 'Bad',
        author: 'Farmer',
        version: '1.0.0',
        description: '',
        uniqueId: 'Invalid ID!',
      }),
    ).toThrowError(SecurityError);
  });
});
