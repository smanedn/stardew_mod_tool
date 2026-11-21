import { describe, expect, it } from 'vitest';
import {
  compileProjectToContentJson,
  createEmptyProject,
  parseProjectJson,
} from '../../../src/core/index.js';

describe('Custom Villager / NPC Creator (Data/Characters)', () => {
  it('compiles Data/Characters, Dialogue, Schedules, GiftTastes, and Load patches', () => {
    const base = createEmptyProject({
      name: 'Willow NPC',
      author: 'Smane',
      version: '1.0.0',
      description: 'Adds Willow NPC',
      uniqueId: 'Smane.WillowNpc',
    });

    const project = {
      ...base,
      assets: [
        { id: 'willow-portrait', relativePath: 'assets/Willow_Portrait.png', kind: 'png' as const },
        { id: 'willow-sprite', relativePath: 'assets/Willow_Sprite.png', kind: 'png' as const },
      ],
      edits: [
        {
          kind: 'villager' as const,
          id: 'npc-1',
          npcId: 'SmaneWillowNpc_Willow',
          displayName: 'Willow',
          birthSeason: 'fall' as const,
          birthDay: 18,
          homeRegion: 'Forest' as const,
          spawnMap: 'Forest',
          spawnX: 30,
          spawnY: 22,
          lovedItems: '(O)72 (O)395',
          likedItems: '(O)18',
          greetingText: 'Hi @! The forest feels peaceful today.$h',
          scheduleWaypoints: [
            { id: 'w1', time: '0900', map: 'Forest', x: 30, y: 22, facing: 2 as const },
            { id: 'w2', time: '1400', map: 'Town', x: 45, y: 60, facing: 0 as const },
          ],
          portraitAssetId: 'willow-portrait',
          spriteAssetId: 'willow-sprite',
        },
      ],
    };

    const content = compileProjectToContentJson(project);
    expect(content.Changes.map((c) => ('Target' in c ? c.Target : ''))).toEqual([
      'Portraits/SmaneWillowNpc_Willow',
      'Characters/SmaneWillowNpc_Willow',
      'Data/Characters',
      'Characters/Dialogue/SmaneWillowNpc_Willow',
      'Characters/schedules/SmaneWillowNpc_Willow',
      'Data/NPCGiftTastes',
    ]);

    const schedulePatch = content.Changes[4];
    if (schedulePatch?.Action === 'EditData') {
      expect(schedulePatch.Entries?.['spring']).toBe('0900 Forest 30 22 2/1400 Town 45 60 0');
    }

    const roundTrip = parseProjectJson(JSON.stringify(project));
    expect(roundTrip.edits).toHaveLength(1);
  });
});
