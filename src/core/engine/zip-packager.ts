import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { deflateRaw } from 'node:zlib';
import type { SdvProjectFile } from '../../data/models/index.js';
import {
  SecurityError,
  assertSafeWriteTarget,
  createBackupSnapshot,
  resolvePathWithinRoot,
} from '../security/index.js';
import { lintProjectBeforeBuild } from '../validators/mod-linter.js';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
  serializeCleanJson,
} from './browser-compiler.js';
import { compileDefaultConfigJson } from './config-schema-builder.js';
import { buildLocaleFileMap } from './i18n-generator.js';

const deflateRawAsync = promisify(deflateRaw);

export interface ZipEntryInput {
  readonly archivePath: string;
  readonly data: Uint8Array;
}

export interface ExportZipOptions {
  readonly project: SdvProjectFile;
  readonly projectDir: string;
  readonly outputZipPath: string;
  readonly allowedRoots: readonly string[];
}

export interface ExportZipResult {
  readonly zipPath: string;
  readonly rootFolderName: string;
  readonly entryCount: number;
  readonly byteLength: number;
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

function buildLocalHeader(
  nameBytes: Buffer,
  crc: number,
  compSize: number,
  rawSize: number,
): Buffer {
  const header = Buffer.alloc(30 + nameBytes.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compSize, 18);
  header.writeUInt32LE(rawSize, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  nameBytes.copy(header, 30);
  return header;
}

function buildCentralHeader(
  nameBytes: Buffer,
  crc: number,
  compSize: number,
  rawSize: number,
  localOffset: number,
): Buffer {
  const header = Buffer.alloc(46 + nameBytes.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(compSize, 20);
  header.writeUInt32LE(rawSize, 24);
  header.writeUInt16LE(nameBytes.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);
  nameBytes.copy(header, 46);
  return header;
}

/**
 * Builds a standard deflated .zip Buffer from in-memory entries.
 */
export async function buildZipArchiveBuffer(entries: readonly ZipEntryInput[]): Promise<Buffer> {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const cleanPath = entry.archivePath.replace(/\\/g, '/').replace(/^\/+/, '');
    const nameBytes = Buffer.from(cleanPath, 'utf-8');
    const crc = computeCrc32(entry.data);
    const compressed = await deflateRawAsync(entry.data);
    const localHeader = buildLocalHeader(nameBytes, crc, compressed.length, entry.data.length);
    const centralHeader = buildCentralHeader(
      nameBytes,
      crc,
      compressed.length,
      entry.data.length,
      offset,
    );

    localParts.push(localHeader, compressed);
    centralParts.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

/**
 * Formats a clean Nexus Mods root folder name (e.g. "[CP] Golden Parsnip").
 */
export function formatNexusRootFolderName(modName: string): string {
  const cleaned = modName.trim().replace(/[<>:"/\\|?*]+/g, '');
  return cleaned.length > 0 ? `[CP] ${cleaned}` : '[CP] CustomMod';
}

async function collectArchiveEntries(
  project: SdvProjectFile,
  projectDir: string,
  rootFolder: string,
): Promise<readonly ZipEntryInput[]> {
  const encoder = new TextEncoder();
  const entries: ZipEntryInput[] = [
    {
      archivePath: `${rootFolder}/manifest.json`,
      data: encoder.encode(serializeCleanJson(compileProjectToManifest(project))),
    },
    {
      archivePath: `${rootFolder}/content.json`,
      data: encoder.encode(serializeCleanJson(compileProjectToContentJson(project))),
    },
  ];

  if (project.configOptions !== undefined && project.configOptions.length > 0) {
    entries.push({
      archivePath: `${rootFolder}/config.json`,
      data: encoder.encode(serializeCleanJson(compileDefaultConfigJson(project.configOptions))),
    });
  }

  for (const [relPath, localeEntries] of Object.entries(buildLocaleFileMap(project))) {
    if (Object.keys(localeEntries).length > 0) {
      entries.push({
        archivePath: `${rootFolder}/${relPath}`,
        data: encoder.encode(serializeCleanJson(localeEntries)),
      });
    }
  }

  for (const asset of project.assets) {
    const srcPath = resolvePathWithinRoot(projectDir, asset.relativePath);
    const bytes = await fs.readFile(srcPath);
    entries.push({ archivePath: `${rootFolder}/${asset.relativePath}`, data: bytes });
  }

  return entries;
}

/**
 * Packages a validated Content Patcher mod into a Nexus-ready .zip archive
 * with a properly named root folder.
 */
export async function exportModZipArchive(options: ExportZipOptions): Promise<ExportZipResult> {
  const { project, projectDir, outputZipPath, allowedRoots } = options;
  const lint = await lintProjectBeforeBuild(project, { projectDir });
  if (!lint.valid) {
    const details = lint.errors.map((e) => e.message).join('; ');
    throw new SecurityError('SCHEMA_VALIDATION_FAILED', `Pre-zip lint failed: ${details}`);
  }

  const safeZipPath = await assertSafeWriteTarget(outputZipPath, allowedRoots);
  if (path.extname(safeZipPath).toLowerCase() !== '.zip') {
    throw new SecurityError('INVALID_PATH', 'Distribution archive must end with .zip.');
  }

  const matchingRoot = allowedRoots[0] ?? path.dirname(safeZipPath);
  await createBackupSnapshot({ targetPath: safeZipPath, rootDir: path.resolve(matchingRoot) });

  const rootFolderName = formatNexusRootFolderName(project.metadata.name);
  const entries = await collectArchiveEntries(project, projectDir, rootFolderName);
  const zipBuffer = await buildZipArchiveBuffer(entries);

  await fs.mkdir(path.dirname(safeZipPath), { recursive: true });
  await fs.writeFile(safeZipPath, zipBuffer);

  return {
    zipPath: safeZipPath,
    rootFolderName,
    entryCount: entries.length,
    byteLength: zipBuffer.length,
  };
}
