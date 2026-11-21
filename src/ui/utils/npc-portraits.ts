import type { PortraitMood } from '../../core/engine/ui-simulator.js';
import { renderVillagerPortraitDataUri } from './villager-svg-portraits.js';

const BUNDLED_PORTRAITS = import.meta.glob<string>('../../../assets/**/*.png', {
  eager: true,
  import: 'default',
});

const WIKI_MOOD_ALIASES: Readonly<Record<string, string>> = {
  blush: 'love',
  annoyed: 'angry',
  concerned: 'sad',
};

function registerPortraitEntry(
  map: Map<string, string>,
  filePath: string,
  url: string,
): void {
  const fileName = filePath.split('/').pop() ?? '';
  if (fileName.toLowerCase() === 'logo.png') {
    return;
  }
  const stem = fileName.replace(/\.png$/i, '');
  const sepIdx = stem.indexOf('_');
  if (sepIdx <= 0) {
    const npc = stem.trim().toLowerCase();
    if (npc.length > 0 && !map.has(`${npc}:neutral`)) {
      map.set(`${npc}:neutral`, url);
    }
    return;
  }
  const npc = stem.slice(0, sepIdx).trim().toLowerCase();
  const rawMood = stem.slice(sepIdx + 1).trim().toLowerCase();
  const mood = WIKI_MOOD_ALIASES[rawMood] ?? rawMood;
  if (npc.length > 0 && mood.length > 0) {
    map.set(`${npc}:${mood}`, url);
  }
}

function buildPortraitLookup(): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [filePath, url] of Object.entries(BUNDLED_PORTRAITS)) {
    registerPortraitEntry(map, filePath, url);
  }
  return map;
}

const PORTRAIT_MAP = buildPortraitLookup();

/**
 * Returns a bundled PNG portrait URL from assets/ (supports <Npc>_<Mood>.png or
 * subfolders like assets/<Npc>/<Npc>_<Mood>.png), or falls back to 16x16 SVG portraits.
 */
export function getNpcPortraitSrc(npcName: string, mood: PortraitMood): string | null {
  const npc = npcName.trim().toLowerCase();
  const moodKey = mood.toLowerCase();
  return (
    PORTRAIT_MAP.get(`${npc}:${moodKey}`) ??
    PORTRAIT_MAP.get(`${npc}:neutral`) ??
    renderVillagerPortraitDataUri(npcName, mood)
  );
}
