import type { SdvProjectFile } from '../../data/models/index.js';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
  serializeCleanJson,
} from './browser-compiler.js';
import { compileDefaultConfigJson } from './config-schema-builder.js';
import { buildLocaleFileMap } from './i18n-generator.js';

export interface BrowserZipEntry {
  readonly path: string;
  readonly data: Uint8Array;
}

function computeCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function concatUint8Arrays(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

/**
 * Formats a safe [CP] ModName folder name for Nexus Mods / SVMM zip archives.
 */
export function formatBrowserZipRootName(modName: string): string {
  const cleaned = modName.trim().replace(/[<>:"/\\|?*]+/g, '');
  return cleaned.length > 0 ? `[CP] ${cleaned}` : '[CP] CustomMod';
}

/**
 * Builds an uncompressed standard PKZIP archive in the browser (zero Node dependencies).
 */
export function buildStoredZipBytes(entries: readonly BrowserZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path.replace(/\\/g, '/').replace(/^\/+/, ''));
    const crc = computeCrc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    writeU32(local, 0, 0x04034b50);
    writeU16(local, 4, 20);
    writeU32(local, 14, crc);
    writeU32(local, 18, size);
    writeU32(local, 22, size);
    writeU16(local, 26, nameBytes.length);
    local.set(nameBytes, 30);

    const central = new Uint8Array(46 + nameBytes.length);
    writeU32(central, 0, 0x02014b50);
    writeU16(central, 4, 20);
    writeU16(central, 6, 20);
    writeU32(central, 16, crc);
    writeU32(central, 20, size);
    writeU32(central, 24, size);
    writeU16(central, 28, nameBytes.length);
    writeU32(central, 42, offset);
    central.set(nameBytes, 46);

    localParts.push(local, entry.data);
    centralParts.push(central);
    offset += local.length + size;
  }

  const centralBytes = concatUint8Arrays(centralParts);
  const eocd = new Uint8Array(22);
  writeU32(eocd, 0, 0x06054b50);
  writeU16(eocd, 8, entries.length);
  writeU16(eocd, 10, entries.length);
  writeU32(eocd, 12, centralBytes.length);
  writeU32(eocd, 16, offset);

  return concatUint8Arrays([...localParts, centralBytes, eocd]);
}

/**
 * Packages a complete Content Patcher mod into a ready-to-install .zip byte array.
 */
export function createBrowserModZipBytes(project: SdvProjectFile): {
  readonly zipName: string;
  readonly bytes: Uint8Array;
} {
  const encoder = new TextEncoder();
  const rootFolder = formatBrowserZipRootName(project.metadata.name);
  const entries: BrowserZipEntry[] = [
    {
      path: `${rootFolder}/manifest.json`,
      data: encoder.encode(serializeCleanJson(compileProjectToManifest(project))),
    },
    {
      path: `${rootFolder}/content.json`,
      data: encoder.encode(serializeCleanJson(compileProjectToContentJson(project))),
    },
  ];

  if (project.configOptions !== undefined && project.configOptions.length > 0) {
    entries.push({
      path: `${rootFolder}/config.json`,
      data: encoder.encode(serializeCleanJson(compileDefaultConfigJson(project.configOptions))),
    });
  }

  for (const [relPath, localeEntries] of Object.entries(buildLocaleFileMap(project))) {
    if (Object.keys(localeEntries).length > 0) {
      entries.push({
        path: `${rootFolder}/${relPath}`,
        data: encoder.encode(serializeCleanJson(localeEntries)),
      });
    }
  }

  return {
    zipName: `${rootFolder} v${project.metadata.version}.zip`,
    bytes: buildStoredZipBytes(entries),
  };
}
