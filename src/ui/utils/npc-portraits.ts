import type { PortraitMood } from '../../core/engine/ui-simulator.js';
import { renderVillagerPortraitDataUri } from './villager-svg-portraits.js';

const BUNDLED_PORTRAITS = import.meta.glob<string>('../../../assets/*_*.png', {
  eager: true,
  import: 'default',
});

function buildPortraitLookup(): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [filePath, url] of Object.entries(BUNDLED_PORTRAITS)) {
    const fileName = filePath.split('/').pop() ?? '';
    const stem = fileName.replace(/\.png$/i, '');
    const sepIdx = stem.lastIndexOf('_');
    if (sepIdx <= 0) {
      continue;
    }
    const npc = stem.slice(0, sepIdx).trim().toLowerCase();
    const mood = stem.slice(sepIdx + 1).trim().toLowerCase();
    if (npc.length > 0 && mood.length > 0) {
      map.set(`${npc}:${mood}`, url);
    }
  }
  return map;
}

const PORTRAIT_MAP = buildPortraitLookup();

/**
 * Returns a bundled PNG portrait URL from assets/<Npc>_<Mood>.png if present,
 * or falls back to a crisp 16x16 pixel-art SVG portrait for all 34 vanilla villagers.
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
