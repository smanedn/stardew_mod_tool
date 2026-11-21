import { describe, expect, it } from 'vitest';
import {
  compileProjectToContentJson,
  createEmptyProject,
  parseProjectJson,
} from '../../../src/core/index.js';

describe('Visual Cutscene Stage & Timeline Builder (Data/Events)', () => {
  it('compiles actor positions and chained Walk -> Emote -> Pause -> Speak steps', () => {
    const base = createEmptyProject({
      name: 'Cutscene Mod',
      author: 'Smane',
      version: '1.0.0',
      description: 'Event stage test',
      uniqueId: 'Smane.CutsceneMod',
    });

    const project = {
      ...base,
      edits: [
        {
          kind: 'event' as const,
          id: 'evt-1',
          location: 'Beach' as const,
          eventId: 'Smane.CutsceneMod_BeachHeart',
          npcName: 'Alex',
          dialogueText: 'Great day at the beach!$h',
          minHearts: 4,
          farmerPos: { x: 20, y: 12 },
          npcPos: { x: 22, y: 10 },
          steps: [
            {
              id: 's1',
              kind: 'walk' as const,
              actor: 'npc' as const,
              dx: -1,
              dy: 1,
              facing: 2 as const,
            },
            { id: 's2', kind: 'emote' as const, actor: 'npc' as const, emoteId: 20 },
            { id: 's3', kind: 'pause' as const, durationMs: 600 },
            { id: 's4', kind: 'speak' as const, text: 'Great day at the beach!$h' },
          ],
        },
      ],
    };

    const content = compileProjectToContentJson(project);
    const patch = content.Changes[0];
    expect(patch?.Action).toBe('EditData');
    if (patch?.Action === 'EditData') {
      expect(patch.Target).toBe('Data/Events/Beach');
      const script = patch.Entries?.['Smane.CutsceneMod_BeachHeart/f Alex 1000'];
      expect(script).toBe(
        'continue/20 10/farmer 20 12 0 Alex 22 10 2/' +
          'move Alex -1 1 2/emote Alex 20/pause 600/speak Alex "Great day at the beach!$h"/end',
      );
    }

    const roundTrip = parseProjectJson(JSON.stringify(project));
    expect(roundTrip.edits).toHaveLength(1);
  });
});
