import { describe, expect, it } from 'vitest';
import {
  compileProjectToContentJson,
  createBrowserModZipBytes,
  createEmptyProject,
} from '../../../src/core/index.js';

describe('v0.3.0 Features: PNG Zip Bundling, Gift Tastes, Shops, Mail & Events', () => {
  it('compiles gift tastes, shops, mail, and events and bundles base64 PNGs in .zip', () => {
    const base = createEmptyProject({
      name: 'Starberry Deluxe',
      author: 'Smane',
      version: '0.3.0',
      description: 'v0.3.0 full feature test',
      uniqueId: 'Smane.StarberryDeluxe',
    });

    const project = {
      ...base,
      assets: [
        {
          id: 'sprite-1',
          relativePath: 'assets/custom-berry.png',
          kind: 'png' as const,
          dataBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        },
      ],
      edits: [
        {
          kind: 'giftTaste' as const,
          id: 'g1',
          npcName: 'Abigail',
          taste: 'Love' as const,
          itemId: 'Smane.StarberryDeluxe_Berry',
        },
        {
          kind: 'shop' as const,
          id: 's1',
          shopId: 'SeedShop' as const,
          itemId: 'Smane.StarberryDeluxe_Berry',
          price: 150,
        },
        {
          kind: 'mail' as const,
          id: 'm1',
          mailId: 'Smane.StarberryDeluxe_Welcome',
          title: 'Welcome!',
          body: 'Here is a gift.',
          attachmentItemId: 'Smane.StarberryDeluxe_Berry',
        },
        {
          kind: 'event' as const,
          id: 'e1',
          location: 'Town' as const,
          eventId: '9901001',
          npcName: 'Abigail',
          dialogueText: 'Hey @!',
          minHearts: 2,
        },
      ],
    };

    const content = compileProjectToContentJson(project);
    expect(content.Changes.map((c) => ('Target' in c ? c.Target : ''))).toEqual([
      'Data/NPCGiftTastes',
      'Data/Shops',
      'Data/mail',
      'Data/Events/Town',
    ]);

    const { bytes } = createBrowserModZipBytes(project);
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toContain('[CP] Starberry Deluxe/assets/custom-berry.png');
  });
});
