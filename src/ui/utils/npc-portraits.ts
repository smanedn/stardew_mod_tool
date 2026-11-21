import abigailHappyPortrait from '../../../assets/Abigail_Happy.png';
import type { PortraitMood } from '../../core/engine/ui-simulator.js';

const PORTRAIT_MAP: Readonly<Record<string, string>> = {
  'abigail:Happy': abigailHappyPortrait,
};

/**
 * Returns a bundled NPC portrait image URL when available for the given NPC and mood.
 */
export function getNpcPortraitSrc(npcName: string, mood: PortraitMood): string | null {
  const key = `${npcName.trim().toLowerCase()}:${mood}`;
  return PORTRAIT_MAP[key] ?? null;
}
