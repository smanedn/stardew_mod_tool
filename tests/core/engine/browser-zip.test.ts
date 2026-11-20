import { describe, expect, it } from 'vitest';
import { createBrowserModZipBytes, createEmptyProject } from '../../../src/core/index.js';

describe('v0.2.0 Browser Ready-to-Install ZIP Builder', () => {
  it('builds a valid PKZIP with [CP] root folder, manifest.json, content.json, and i18n', () => {
    const base = createEmptyProject({
      name: 'Golden Starberry',
      author: 'Smane',
      version: '0.2.0',
      description: 'v0.2.0 test mod',
      uniqueId: 'Smane.GoldenStarberry',
    });

    const project = {
      ...base,
      edits: [
        {
          kind: 'object' as const,
          id: 'obj-1',
          itemId: 'Smane.GoldenStarberry_Berry',
          displayName: 'Golden Starberry',
          description: 'Sweet!',
          price: 250,
          edibility: 40,
          category: -79,
        },
      ],
      configOptions: [
        { id: 'c1', key: 'EnableMod', optionType: 'toggle' as const, defaultValue: 'true' },
      ],
    };

    const { zipName, bytes } = createBrowserModZipBytes(project);
    expect(zipName).toBe('[CP] Golden Starberry v0.2.0.zip');
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const asText = new TextDecoder().decode(bytes);
    expect(asText).toContain('[CP] Golden Starberry/manifest.json');
    expect(asText).toContain('[CP] Golden Starberry/content.json');
    expect(asText).toContain('[CP] Golden Starberry/config.json');
    expect(asText).toContain('[CP] Golden Starberry/i18n/default.json');
  });
});
