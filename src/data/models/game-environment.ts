/**
 * Supported digital storefronts and manual installation source for Stardew Valley.
 */
export type GameStorefront = 'Steam' | 'GOG' | 'XboxApp' | 'Manual';

/**
 * Detection status for SMAPI inside a Stardew Valley installation.
 */
export interface SmapiStatus {
  readonly installed: boolean;
  readonly executablePath: string | null;
  readonly version: string | null;
}

/**
 * Detection status for Content Patcher inside the Mods folder.
 */
export interface ContentPatcherStatus {
  readonly installed: boolean;
  readonly folderPath: string | null;
  readonly version: string | null;
}

/**
 * Complete detected environment for Stardew Valley, SMAPI, and Content Patcher.
 */
export interface GameEnvironmentInfo {
  readonly gameDirectory: string | null;
  readonly storefront: GameStorefront | null;
  readonly modsDirectory: string | null;
  readonly smapi: SmapiStatus;
  readonly contentPatcher: ContentPatcherStatus;
}
