import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '../../../src/core/index.js';
import { scanModConflicts } from '../../../src/core/validators/conflict-scanner.js';

describe('Conflict Scanner (UniqueID, Data/Objects & EditImage)', () => {
  it('detects duplicate UniqueID, colliding Data/Objects key, and overlapping EditImage', () => {
    const base = createEmptyProject({
      name: 'My Mod',
      author: 'Smane',
      version: '1.0.0',
      description: 'Conflict test',
      uniqueId: 'Smane.MyMod',
    });

    const project = {
      ...base,
      assets: [{ id: 'spr-1', relativePath: 'assets/axe.png', kind: 'png' as const }],
      edits: [
        {
          kind: 'object' as const,
          id: 'obj-1',
          itemId: 'Smane.MyMod_StarBerry',
          displayName: 'Star Berry',
          description: 'Sweet',
          price: 100,
          edibility: 20,
          category: -79,
        },
        {
          kind: 'retexture' as const,
          id: 'ret-1',
          target: 'Maps/springobjects',
          assetId: 'spr-1',
          toArea: { X: 16, Y: 16, Width: 16, Height: 16 },
        },
      ],
    };

    const conflicts = scanModConflicts(project, [
      {
        folderName: '[CP] OtherMod',
        manifestJson: JSON.stringify({ Name: 'Other Mod', UniqueID: 'Smane.MyMod' }),
        contentJson: JSON.stringify({
          Format: '2.0.0',
          Changes: [
            {
              Action: 'EditData',
              Target: 'Data/Objects',
              Entries: { 'Smane.MyMod_StarBerry': { DisplayName: 'Dup' } },
            },
            {
              Action: 'EditImage',
              Target: 'Maps/springobjects',
              FromFile: 'assets/other.png',
              ToArea: { X: 20, Y: 20, Width: 16, Height: 16 },
            },
          ],
        }),
      },
    ]);

    expect(conflicts.map((c) => c.kind)).toEqual([
      'DUPLICATE_UNIQUE_ID',
      'COLLIDING_OBJECT_KEY',
      'OVERLAPPING_EDIT_IMAGE',
    ]);
  });
});
