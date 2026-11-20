import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import { gunzip, gzip } from 'node:zlib';
import type { VanillaDatabaseDump } from '../../data/models/index.js';
import {
  type VanillaDatabase,
  VanillaDatabaseDumpSchema,
  indexVanillaDump,
} from '../parsers/vanilla-data-indexer.js';
import {
  assertSafeWriteTarget,
  resolvePathWithinAllowedRoots,
  validateWithSchema,
} from '../security/index.js';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * Compresses a Stardew Valley 1.6+ vanilla data dump using gzip to minimize
 * bundled size and startup I/O.
 */
export async function compressVanillaDump(dump: VanillaDatabaseDump): Promise<Buffer> {
  const jsonBytes = Buffer.from(JSON.stringify(dump), 'utf-8');
  return gzipAsync(jsonBytes, { level: 9 });
}

/**
 * Asynchronously decompresses a gzipped vanilla data dump and indexes it into O(1) maps.
 */
export async function decompressVanillaDump(compressed: Uint8Array): Promise<VanillaDatabase> {
  const rawBuffer = await gunzipAsync(compressed);
  const parsed: unknown = JSON.parse(rawBuffer.toString('utf-8'));
  const dump = validateWithSchema(VanillaDatabaseDumpSchema, parsed, 'Compressed vanilla DB');
  return indexVanillaDump(dump);
}

/**
 * Writes a compressed .sdvdb.gz database safely within allowed roots.
 */
export async function writeCompressedVanillaDb(
  filePath: string,
  dump: VanillaDatabaseDump,
  allowedRoots: readonly string[],
): Promise<number> {
  const safeTarget = await assertSafeWriteTarget(filePath, allowedRoots);
  const compressed = await compressVanillaDump(dump);
  await fs.writeFile(safeTarget, compressed);
  return compressed.length;
}

/**
 * Reads and indexes a compressed .sdvdb.gz database asynchronously.
 */
export async function loadCompressedVanillaDb(
  filePath: string,
  allowedRoots?: readonly string[],
): Promise<VanillaDatabase> {
  const targetPath =
    allowedRoots !== undefined
      ? resolvePathWithinAllowedRoots(filePath, allowedRoots)
      : filePath;
  const compressed = await fs.readFile(targetPath);
  return decompressVanillaDump(compressed);
}
