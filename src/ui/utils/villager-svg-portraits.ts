import type { PortraitMood } from '../../core/engine/ui-simulator.js';

type HairStyle = 'short' | 'long' | 'bob' | 'spiky' | 'emo' | 'bun' | 'bald' | 'shadow';

interface VillagerAppearance {
  readonly skin: string;
  readonly hair: string;
  readonly shirt: string;
  readonly hairStyle: HairStyle;
  readonly glasses?: boolean;
  readonly beard?: string;
  readonly hat?: 'cap' | 'wizard' | 'hood' | 'bow';
}

const VILLAGER_APPEARANCES: Readonly<Record<string, VillagerAppearance>> = {
  abigail: { skin: '#fce0c8', hair: '#7c3aed', shirt: '#312e81', hairStyle: 'long', hat: 'bow' },
  alex: { skin: '#f5cfa0', hair: '#78350f', shirt: '#15803d', hairStyle: 'short' },
  caroline: { skin: '#fce0c8', hair: '#16a34a', shirt: '#fef08a', hairStyle: 'bun' },
  clint: {
    skin: '#f5cfa0', hair: '#78350f', shirt: '#92400e', hairStyle: 'short', beard: '#5c2d0c',
  },
  demetrius: {
    skin: '#7c4a2d', hair: '#1f2937', shirt: '#2563eb', hairStyle: 'short', beard: '#1f2937',
  },
  dwarf: { skin: '#a8a29e', hair: '#78716c', shirt: '#57534e', hairStyle: 'bald', hat: 'hood' },
  elliott: { skin: '#fce0c8', hair: '#b45309', shirt: '#991b1b', hairStyle: 'long' },
  emily: { skin: '#fce0c8', hair: '#2563eb', shirt: '#dc2626', hairStyle: 'bob' },
  evelyn: { skin: '#fce0c8', hair: '#e5e7eb', shirt: '#db2777', hairStyle: 'bun', glasses: true },
  george: {
    skin: '#f5cfa0', hair: '#d1d5db', shirt: '#6b7280', hairStyle: 'bald', beard: '#d1d5db',
  },
  gus: { skin: '#f5cfa0', hair: '#92400e', shirt: '#b91c1c', hairStyle: 'short', beard: '#78350f' },
  haley: { skin: '#fce0c8', hair: '#facc15', shirt: '#38bdf8', hairStyle: 'long' },
  harvey: {
    skin: '#fce0c8', hair: '#78350f', shirt: '#166534', hairStyle: 'short',
    glasses: true, beard: '#5c2d0c',
  },
  jas: { skin: '#fce0c8', hair: '#4c1d95', shirt: '#ec4899', hairStyle: 'bob', hat: 'bow' },
  jodi: { skin: '#fce0c8', hair: '#b45309', shirt: '#16a34a', hairStyle: 'long' },
  kent: { skin: '#f5cfa0', hair: '#ca8a04', shirt: '#3f6212', hairStyle: 'short' },
  krobus: { skin: '#111827', hair: '#111827', shirt: '#030712', hairStyle: 'shadow' },
  leah: { skin: '#fce0c8', hair: '#ea580c', shirt: '#15803d', hairStyle: 'long' },
  leo: { skin: '#d9a066', hair: '#451a03', shirt: '#16a34a', hairStyle: 'spiky' },
  lewis: {
    skin: '#f5cfa0', hair: '#9ca3af', shirt: '#78350f', hairStyle: 'short',
    beard: '#d1d5db', hat: 'cap',
  },
  linus: {
    skin: '#f5cfa0', hair: '#d1d5db', shirt: '#a16207', hairStyle: 'long', beard: '#e5e7eb',
  },
  marnie: { skin: '#fce0c8', hair: '#92400e', shirt: '#db2777', hairStyle: 'bun' },
  maru: { skin: '#9a5b3c', hair: '#7f1d1d', shirt: '#0284c7', hairStyle: 'bob', glasses: true },
  pam: { skin: '#fce0c8', hair: '#eab308', shirt: '#9333ea', hairStyle: 'bob' },
  penny: { skin: '#fce0c8', hair: '#ea580c', shirt: '#eab308', hairStyle: 'bob' },
  pierre: { skin: '#fce0c8', hair: '#92400e', shirt: '#15803d', hairStyle: 'short', glasses: true },
  robin: { skin: '#fce0c8', hair: '#c2410c', shirt: '#047857', hairStyle: 'long' },
  sam: { skin: '#fce0c8', hair: '#facc15', shirt: '#2563eb', hairStyle: 'spiky' },
  sandy: { skin: '#fce0c8', hair: '#db2777', shirt: '#7e22ce', hairStyle: 'long' },
  sebastian: { skin: '#fce0c8', hair: '#1f2937', shirt: '#111827', hairStyle: 'emo' },
  shane: { skin: '#f5cfa0', hair: '#312e81', shirt: '#1e3a8a', hairStyle: 'short' },
  vincent: { skin: '#fce0c8', hair: '#ea580c', shirt: '#dc2626', hairStyle: 'spiky' },
  willy: {
    skin: '#f5cfa0', hair: '#78350f', shirt: '#0369a1', hairStyle: 'short',
    beard: '#78350f', hat: 'cap',
  },
  wizard: {
    skin: '#fce0c8', hair: '#7e22ce', shirt: '#581c87', hairStyle: 'long',
    beard: '#7e22ce', hat: 'wizard',
  },
};

function rect(x: number, y: number, w: number, h: number, fill: string): string {
  return `<rect x="${String(x)}" y="${String(y)}" ` +
    `width="${String(w)}" height="${String(h)}" fill="${fill}"/>`;
}

function renderHairSvg(app: VillagerAppearance): string {
  const c = app.hair;
  switch (app.hairStyle) {
    case 'long':
      return rect(4, 2, 8, 3, c) + rect(3, 4, 2, 7, c) + rect(11, 4, 2, 7, c);
    case 'bob':
      return rect(4, 2, 8, 3, c) + rect(3, 4, 2, 5, c) + rect(11, 4, 2, 5, c);
    case 'spiky':
      return rect(4, 1, 2, 2, c) + rect(7, 1, 2, 2, c) + rect(10, 1, 2, 2, c) + rect(4, 2, 8, 2, c);
    case 'emo':
      return rect(4, 2, 8, 3, c) + rect(4, 4, 4, 3, c) + rect(3, 4, 1, 5, c) + rect(12, 4, 1, 5, c);
    case 'bun':
      return rect(6, 1, 4, 2, c) + rect(4, 2, 8, 3, c);
    case 'bald':
      return rect(3, 5, 1, 2, c) + rect(12, 5, 1, 2, c);
    case 'shadow':
      return '';
    case 'short':
      return rect(4, 2, 8, 3, c) + rect(4, 4, 1, 2, c) + rect(11, 4, 1, 2, c);
  }
}

function renderHatSvg(app: VillagerAppearance): string {
  if (app.hat === 'wizard') {
    return rect(2, 3, 12, 1, '#6b21a8') + rect(5, 1, 6, 2, '#6b21a8') + rect(7, 0, 2, 1, '#6b21a8');
  }
  if (app.hat === 'cap') {
    return rect(4, 2, 8, 2, '#374151') + rect(3, 3, 10, 1, '#1f2937');
  }
  if (app.hat === 'hood') {
    return rect(3, 2, 10, 3, '#78716c');
  }
  if (app.hat === 'bow') {
    return rect(10, 2, 3, 2, '#f43f5e');
  }
  return '';
}

function renderFaceDetails(app: VillagerAppearance, mood: PortraitMood): string {
  const eyeColor = app.hairStyle === 'shadow' ? '#fef08a' : '#1f2937';
  const eyes =
    mood === 'Happy'
      ? rect(5, 6, 2, 1, eyeColor) + rect(9, 6, 2, 1, eyeColor)
      : rect(5, 6, 1, 2, eyeColor) + rect(10, 6, 1, 2, eyeColor);
  const brows = mood === 'Angry' ? rect(5, 5, 2, 1, '#7f1d1d') + rect(9, 5, 2, 1, '#7f1d1d') : '';
  const blush = mood === 'Love' ? rect(4, 8, 2, 1, '#fb7185') + rect(10, 8, 2, 1, '#fb7185') : '';
  const glasses =
    app.glasses === true
      ? rect(4, 6, 3, 1, '#4b5563') + rect(9, 6, 3, 1, '#4b5563') + rect(7, 6, 2, 1, '#4b5563')
      : '';
  const beard = app.beard !== undefined ? rect(5, 9, 6, 2, app.beard) : '';
  const mouth =
    mood === 'Happy' || mood === 'Love'
      ? rect(6, 9, 4, 1, '#be123c')
      : mood === 'Sad' || mood === 'Angry'
        ? rect(6, 10, 4, 1, '#7c2d12')
        : mood === 'Surprised'
          ? rect(7, 9, 2, 2, '#7c2d12')
          : rect(7, 9, 2, 1, '#7c2d12');

  return `${brows}${eyes}${blush}${glasses}${beard}${mouth}`;
}

/**
 * Generates a crisp 16x16 pixel-art SVG data URI portrait for any of the 34 Stardew villagers.
 */
export function renderVillagerPortraitDataUri(npcName: string, mood: PortraitMood): string | null {
  const app = VILLAGER_APPEARANCES[npcName.trim().toLowerCase()];
  if (app === undefined) {
    return null;
  }

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">',
    rect(0, 0, 16, 16, '#fff7e6'),
    rect(3, 12, 10, 4, app.shirt),
    rect(6, 11, 4, 2, app.skin),
    rect(4, 4, 8, 7, app.skin),
    renderHairSvg(app),
    renderHatSvg(app),
    renderFaceDetails(app, mood),
    '</svg>',
  ].join('');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
