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

function readU16(source: Uint8Array, offset: number): number {
  return (source[offset] ?? 0) | ((source[offset + 1] ?? 0) << 8);
}

function readU32(source: Uint8Array, offset: number): number {
  return (
    ((source[offset] ?? 0) |
      ((source[offset + 1] ?? 0) << 8) |
      ((source[offset + 2] ?? 0) << 16) |
      ((source[offset + 3] ?? 0) << 24)) >>>
    0
  );
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

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function collectOptionalAssetEntries(
  project: SdvProjectFile,
  rootFolder: string,
  encoder: TextEncoder,
): readonly BrowserZipEntry[] {
  const extra: BrowserZipEntry[] = [];
  for (const [relPath, localeEntries] of Object.entries(buildLocaleFileMap(project))) {
    if (Object.keys(localeEntries).length > 0) {
      extra.push({
        path: `${rootFolder}/${relPath}`,
        data: encoder.encode(serializeCleanJson(localeEntries)),
      });
    }
  }
  for (const asset of project.assets) {
    if (asset.dataBase64 !== undefined && asset.dataBase64.length > 0) {
      extra.push({
        path: `${rootFolder}/${asset.relativePath}`,
        data: decodeBase64ToBytes(asset.dataBase64),
      });
    }
  }
  return extra;
}

/**
 * Packages a complete Content Patcher mod into a ready-to-install .zip byte array,
 * including any in-memory PNG sprites stored on LinkedAssetEntry.dataBase64.
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

  entries.push(...collectOptionalAssetEntries(project, rootFolder, encoder));

  return {
    zipName: `${rootFolder} v${project.metadata.version}.zip`,
    bytes: buildStoredZipBytes(entries),
  };
}

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Deflate decompression is not supported in this runtime.');
  }
  const copy = new Uint8Array(compressed.byteLength);
  copy.set(compressed);
  const stream = new Blob([copy.buffer])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

function findEocdOffset(zipBytes: Uint8Array): number {
  const minOffset = Math.max(0, zipBytes.length - 65557);
  for (let offset = zipBytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readU32(zipBytes, offset) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error('Invalid .zip file: End of Central Directory record not found.');
}

function normalizeZipEntryPath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/^\/+/, '');
  if (normalized.includes('\0') || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe path inside .zip archive: "${rawPath}".`);
  }
  return normalized;
}

async function decompressZipPayload(
  compressionMethod: number,
  compressed: Uint8Array,
  cleanPath: string,
): Promise<Uint8Array> {
  if (compressionMethod === 0) {
    return compressed.slice();
  }
  if (compressionMethod === 8) {
    return inflateRawBytes(compressed);
  }
  throw new Error(
    `Unsupported ZIP compression method (${String(compressionMethod)}) for "${cleanPath}".`,
  );
}

/**
 * Extracts all file entries from a standard PKZIP archive (supports Stored and Deflate).
 */
export async function extractZipEntries(zipBytes: Uint8Array): Promise<readonly BrowserZipEntry[]> {
  const eocdOffset = findEocdOffset(zipBytes);
  const entryCount = readU16(zipBytes, eocdOffset + 10);
  let cdCursor = readU32(zipBytes, eocdOffset + 16);
  const decoder = new TextDecoder();
  const entries: BrowserZipEntry[] = [];

  for (let i = 0; i < entryCount; i += 1) {
    if (readU32(zipBytes, cdCursor) !== 0x02014b50) {
      throw new Error('Invalid .zip file: corrupt Central Directory header.');
    }
    const compressionMethod = readU16(zipBytes, cdCursor + 10);
    const compressedSize = readU32(zipBytes, cdCursor + 20);
    const fileNameLen = readU16(zipBytes, cdCursor + 28);
    const extraLen = readU16(zipBytes, cdCursor + 30);
    const commentLen = readU16(zipBytes, cdCursor + 32);
    const localOffset = readU32(zipBytes, cdCursor + 42);
    const rawName = decoder.decode(zipBytes.subarray(cdCursor + 46, cdCursor + 46 + fileNameLen));
    cdCursor += 46 + fileNameLen + extraLen + commentLen;

    const cleanPath = normalizeZipEntryPath(rawName);
    if (cleanPath.length === 0 || cleanPath.endsWith('/')) {
      continue;
    }
    if (readU32(zipBytes, localOffset) !== 0x04034b50) {
      throw new Error(`Invalid .zip file: corrupt local header for "${cleanPath}".`);
    }
    const localNameLen = readU16(zipBytes, localOffset + 26);
    const localExtraLen = readU16(zipBytes, localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const data = await decompressZipPayload(
      compressionMethod,
      zipBytes.subarray(dataStart, dataStart + compressedSize),
      cleanPath,
    );
    entries.push({ path: cleanPath, data });
  }

  return entries;
}
