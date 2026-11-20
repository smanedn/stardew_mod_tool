import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type {
  ContentPatcherStatus,
  GameEnvironmentInfo,
  GameStorefront,
  SmapiStatus,
} from '../../data/models/index.js';
import { CONTENT_PATCHER_UNIQUE_ID } from '../security/index.js';

export interface StorefrontCandidate {
  readonly directory: string;
  readonly storefront: GameStorefront;
}

export interface GameDetectionOptions {
  readonly manualGameDir?: string;
  readonly steamLibraryVdfPath?: string;
  readonly extraCandidates?: readonly StorefrontCandidate[];
}

const DEFAULT_STEAM_VDF_WIN = 'C:\\Program Files (x86)\\Steam\\steamapps\\libraryfolders.vdf';

async function existsOnDisk(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extracts Steam library root paths from a Steam libraryfolders.vdf file.
 */
export function parseSteamLibraryPaths(vdfContent: string): readonly string[] {
  const paths: string[] = [];
  const pathPattern = /"path"\s+"([^"]+)"/g;
  for (const match of vdfContent.matchAll(pathPattern)) {
    const rawPath = match[1];
    if (rawPath !== undefined && rawPath.trim().length > 0) {
      paths.push(rawPath.replace(/\\\\/g, '\\'));
    }
  }
  return paths;
}

/**
 * Returns standard installation directory candidates for Steam, GOG, and Xbox App.
 */
export function getDefaultStorefrontCandidates(): readonly StorefrontCandidate[] {
  const home = os.homedir();
  return [
    {
      directory: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Stardew Valley',
      storefront: 'Steam',
    },
    {
      directory: path.join(home, '.local', 'share', 'Steam', 'steamapps', 'common', 'Stardew Valley'),
      storefront: 'Steam',
    },
    {
      directory: 'C:\\Program Files (x86)\\GOG Galaxy\\Games\\Stardew Valley',
      storefront: 'GOG',
    },
    { directory: 'C:\\GOG Games\\Stardew Valley', storefront: 'GOG' },
    { directory: 'C:\\XboxGames\\Stardew Valley\\Content', storefront: 'XboxApp' },
  ];
}

/**
 * Checks whether a directory looks like a valid Stardew Valley installation.
 */
export async function isValidStardewDirectory(dirPath: string): Promise<boolean> {
  const hasDll = await existsOnDisk(path.join(dirPath, 'Stardew Valley.dll'));
  if (hasDll) {
    return true;
  }
  const hasExe = await existsOnDisk(path.join(dirPath, 'Stardew Valley.exe'));
  if (hasExe) {
    return true;
  }
  return existsOnDisk(path.join(dirPath, 'Content'));
}

async function extractSmapiVersionFromDeps(gameDir: string): Promise<string | null> {
  const depsPath = path.join(gameDir, 'StardewModdingAPI.deps.json');
  try {
    const raw = await fs.readFile(depsPath, 'utf-8');
    const versionMatch = /"StardewModdingAPI\/([0-9]+\.[0-9]+\.[0-9]+[^"]*)"/.exec(raw);
    return versionMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Verifies whether SMAPI is installed in the given game directory and reads its version.
 */
export async function detectSmapiStatus(gameDir: string): Promise<SmapiStatus> {
  const exePath = path.join(gameDir, 'StardewModdingAPI.exe');
  const unixPath = path.join(gameDir, 'StardewModdingAPI');
  const resolvedExe = (await existsOnDisk(exePath))
    ? exePath
    : (await existsOnDisk(unixPath))
      ? unixPath
      : null;

  if (resolvedExe === null) {
    return { installed: false, executablePath: null, version: null };
  }

  const version = await extractSmapiVersionFromDeps(gameDir);
  return { installed: true, executablePath: resolvedExe, version };
}

function readStringProperty(value: unknown, key: string): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return typeof descriptor?.value === 'string' ? descriptor.value : null;
}

async function tryReadContentPatcherManifest(
  folderPath: string,
): Promise<ContentPatcherStatus | null> {
  const manifestPath = path.join(folderPath, 'manifest.json');
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw.replace(/^\uFEFF/, ''));
    const uniqueId = readStringProperty(parsed, 'UniqueID');
    if (uniqueId !== CONTENT_PATCHER_UNIQUE_ID) {
      return null;
    }
    const version = readStringProperty(parsed, 'Version');
    return { installed: true, folderPath, version };
  } catch {
    return null;
  }
}

/**
 * Scans the Mods directory for Content Patcher and extracts its installed version.
 */
export async function detectContentPatcherStatus(modsDir: string): Promise<ContentPatcherStatus> {
  const directMatch = await tryReadContentPatcherManifest(path.join(modsDir, 'ContentPatcher'));
  if (directMatch !== null) {
    return directMatch;
  }

  try {
    const entries = await fs.readdir(modsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const match = await tryReadContentPatcherManifest(path.join(modsDir, entry.name));
        if (match !== null) {
          return match;
        }
      }
    }
  } catch {
    return { installed: false, folderPath: null, version: null };
  }

  return { installed: false, folderPath: null, version: null };
}

async function collectSteamVdfCandidates(vdfPath: string): Promise<readonly StorefrontCandidate[]> {
  try {
    const vdfContent = await fs.readFile(vdfPath, 'utf-8');
    return parseSteamLibraryPaths(vdfContent).map((libraryRoot) => ({
      directory: path.join(libraryRoot, 'steamapps', 'common', 'Stardew Valley'),
      storefront: 'Steam',
    }));
  } catch {
    return [];
  }
}

async function findFirstValidInstallation(
  candidates: readonly StorefrontCandidate[],
): Promise<StorefrontCandidate | null> {
  for (const candidate of candidates) {
    if (await isValidStardewDirectory(candidate.directory)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Automatically scans Steam, GOG, and Xbox App locations (with manual fallback)
 * for Stardew Valley, SMAPI, and Content Patcher.
 */
export async function detectGameEnvironment(
  options: GameDetectionOptions = {},
): Promise<GameEnvironmentInfo> {
  if (options.manualGameDir !== undefined && options.manualGameDir.trim().length > 0) {
    const manualDir = path.resolve(options.manualGameDir);
    if (await isValidStardewDirectory(manualDir)) {
      return buildEnvironmentInfo(manualDir, 'Manual');
    }
  }

  const vdfCandidates = await collectSteamVdfCandidates(
    options.steamLibraryVdfPath ?? DEFAULT_STEAM_VDF_WIN,
  );
  const allCandidates: readonly StorefrontCandidate[] = [
    ...(options.extraCandidates ?? []),
    ...vdfCandidates,
    ...getDefaultStorefrontCandidates(),
  ];

  const found = await findFirstValidInstallation(allCandidates);
  if (found === null) {
    return {
      gameDirectory: null,
      storefront: null,
      modsDirectory: null,
      smapi: { installed: false, executablePath: null, version: null },
      contentPatcher: { installed: false, folderPath: null, version: null },
    };
  }

  return buildEnvironmentInfo(path.resolve(found.directory), found.storefront);
}

async function buildEnvironmentInfo(
  gameDirectory: string,
  storefront: GameStorefront,
): Promise<GameEnvironmentInfo> {
  const modsDirectory = path.join(gameDirectory, 'Mods');
  const smapi = await detectSmapiStatus(gameDirectory);
  const contentPatcher = await detectContentPatcherStatus(modsDirectory);
  return { gameDirectory, storefront, modsDirectory, smapi, contentPatcher };
}
