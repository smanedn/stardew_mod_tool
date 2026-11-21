import { useEffect, useState } from 'react';
import type { PortraitMood } from '../../core/engine/ui-simulator.js';
import { renderVillagerPortraitDataUri } from './villager-svg-portraits.js';

const LAZY_PORTRAITS = import.meta.glob<string>('../../../assets/**/*.png', {
  import: 'default',
});

const WIKI_MOOD_ALIASES: Readonly<Record<string, string>> = {
  blush: 'love',
  blushing: 'love',
  flustered: 'love',
  bashful: 'love',
  annoyed: 'angry',
  concerned: 'sad',
  smile: 'happy',
  pleased: 'happy',
  thinking: 'neutral',
};

const PORTRAIT_LOADERS = new Map<string, () => Promise<string>>();
const PORTRAIT_CACHE = new Map<string, string>();

function registerLoader(filePath: string, loader: () => Promise<string>): void {
  const fileName = filePath.split('/').pop() ?? '';
  if (fileName.toLowerCase() === 'logo.png') {
    return;
  }
  const stem = fileName.replace(/\.png$/i, '');
  const sepIdx = stem.indexOf('_');
  if (sepIdx <= 0) {
    const npc = stem.trim().toLowerCase();
    if (npc.length > 0 && !PORTRAIT_LOADERS.has(`${npc}:neutral`)) {
      PORTRAIT_LOADERS.set(`${npc}:neutral`, loader);
    }
    return;
  }
  const npc = stem.slice(0, sepIdx).trim().toLowerCase();
  const rawMood = stem.slice(sepIdx + 1).trim().toLowerCase();
  const mood = WIKI_MOOD_ALIASES[rawMood] ?? rawMood;
  if (npc.length > 0 && mood.length > 0) {
    PORTRAIT_LOADERS.set(`${npc}:${mood}`, loader);
  }
}

for (const [filePath, loader] of Object.entries(LAZY_PORTRAITS)) {
  registerLoader(filePath, loader);
}

/**
 * Lazy-loads the official PNG portrait for an NPC + mood into the in-memory cache.
 */
export async function preloadNpcPortrait(
  npcName: string,
  mood: PortraitMood,
): Promise<string | null> {
  const npc = npcName.trim().toLowerCase();
  const moodKey = mood.toLowerCase();
  const cacheKey = `${npc}:${moodKey}`;
  const cached = PORTRAIT_CACHE.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const loader = PORTRAIT_LOADERS.get(cacheKey) ?? PORTRAIT_LOADERS.get(`${npc}:neutral`);
  if (loader === undefined) {
    return null;
  }
  const url = await loader();
  PORTRAIT_CACHE.set(cacheKey, url);
  return url;
}

/**
 * Synchronous portrait lookup: returns cached PNG if loaded, otherwise 16x16 SVG fallback.
 */
export function getNpcPortraitSrc(npcName: string, mood: PortraitMood): string | null {
  const npc = npcName.trim().toLowerCase();
  const moodKey = mood.toLowerCase();
  return (
    PORTRAIT_CACHE.get(`${npc}:${moodKey}`) ??
    PORTRAIT_CACHE.get(`${npc}:neutral`) ??
    renderVillagerPortraitDataUri(npcName, mood)
  );
}

/**
 * React hook that returns the 16x16 SVG portrait immediately and lazy-loads any official PNG.
 */
export function useNpcPortraitSrc(npcName: string, mood: PortraitMood): string | null {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(() => getNpcPortraitSrc(npcName, mood));

  useEffect(() => {
    let cancelled = false;
    setLoadedUrl(getNpcPortraitSrc(npcName, mood));
    void preloadNpcPortrait(npcName, mood).then((url) => {
      if (!cancelled && url !== null) {
        setLoadedUrl(url);
      }
    });
    return (): void => {
      cancelled = true;
    };
  }, [npcName, mood]);

  return loadedUrl;
}
