import fs from 'node:fs/promises';
import path from 'node:path';
import type { LinkedAssetEntry } from '../../data/models/index.js';
import {
  SecurityError,
  assertSafeWriteTarget,
  validateExternalAssetFile,
} from '../security/index.js';

export const ASSETS_FOLDER_NAME = 'assets';
export const MAX_SPRITE_DIMENSION_PX = 4096;
export const PNG_COLOR_TYPE_RGBA = 6;
export const PNG_REQUIRED_BIT_DEPTH = 8;

const PNG_IHDR_MIN_BYTES = 29;

export interface PngImageMetadata {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  readonly colorType: number;
}

export interface ImportedAssetResult {
  readonly asset: LinkedAssetEntry;
  readonly destinationPath: string;
  readonly metadata: PngImageMetadata;
}

/**
 * Sanitizes an imported asset filename into safe lowercase kebab-case with .png extension.
 */
export function sanitizePngFileName(originalFileName: string): string {
  const baseName = path.basename(originalFileName, path.extname(originalFileName));
  const cleaned = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeBase = cleaned.length > 0 ? cleaned : 'sprite';
  return `${safeBase}.png`;
}

/**
 * Parses PNG IHDR chunk metadata and enforces 32-bit RGBA (bitDepth=8, colorType=6)
 * and safe sprite dimensions.
 */
export function parseAndVerifyRgbaPngHeader(buffer: Uint8Array): PngImageMetadata {
  if (buffer.byteLength < PNG_IHDR_MIN_BYTES) {
    throw new SecurityError('ASSET_INVALID_MAGIC_BYTES', 'PNG file is too small for IHDR chunk.');
  }

  const chunkType = String.fromCharCode(
    buffer[12] ?? 0,
    buffer[13] ?? 0,
    buffer[14] ?? 0,
    buffer[15] ?? 0,
  );
  if (chunkType !== 'IHDR') {
    throw new SecurityError('ASSET_INVALID_MAGIC_BYTES', 'PNG missing IHDR header chunk.');
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  const bitDepth = buffer[24] ?? 0;
  const colorType = buffer[25] ?? 0;

  if (
    width === 0 ||
    height === 0 ||
    width > MAX_SPRITE_DIMENSION_PX ||
    height > MAX_SPRITE_DIMENSION_PX
  ) {
    throw new SecurityError(
      'ASSET_UNSAFE_CONTENT',
      `PNG dimensions (${String(width)}x${String(height)}) exceed safe sprite bounds.`,
    );
  }

  if (bitDepth !== PNG_REQUIRED_BIT_DEPTH || colorType !== PNG_COLOR_TYPE_RGBA) {
    throw new SecurityError(
      'ASSET_UNSAFE_CONTENT',
      `PNG must be 32-bit RGBA (8-bit depth, colorType 6). Found depth=${String(bitDepth)}, colorType=${String(colorType)}.`,
    );
  }

  return { width, height, bitDepth, colorType };
}

async function readPngHeaderBytes(filePath: string): Promise<Uint8Array> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(PNG_IHDR_MIN_BYTES);
    await handle.read(buffer, 0, PNG_IHDR_MIN_BYTES, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

/**
 * Safely imports an external .png image into <projectDir>/assets/, verifying magic bytes,
 * file size limits, dimensions, and 32-bit RGBA color format before copying.
 */
export async function importPngAssetSafely(
  sourceFilePath: string,
  projectDir: string,
  assetId: string,
): Promise<ImportedAssetResult> {
  await validateExternalAssetFile(sourceFilePath, 'png');
  const headerBytes = await readPngHeaderBytes(sourceFilePath);
  const metadata = parseAndVerifyRgbaPngHeader(headerBytes);

  const safeFileName = sanitizePngFileName(sourceFilePath);
  const relativePath = `${ASSETS_FOLDER_NAME}/${safeFileName}`;
  const destinationPath = await assertSafeWriteTarget(
    path.join(projectDir, ASSETS_FOLDER_NAME, safeFileName),
    [projectDir],
  );

  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourceFilePath, destinationPath);

  return {
    asset: { id: assetId, relativePath, kind: 'png' },
    destinationPath,
    metadata,
  };
}
