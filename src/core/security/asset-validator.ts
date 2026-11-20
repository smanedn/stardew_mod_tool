import fs from 'node:fs/promises';
import { SecurityError } from './security-error.js';

export type SupportedAssetKind = 'png' | 'tmx' | 'xnb';

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_MAP_FILE_SIZE_BYTES = 16 * 1024 * 1024;
export const MAX_XNB_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const PNG_MAGIC_BYTES: readonly number[] = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const XNB_MAGIC_PREFIX: readonly number[] = [0x58, 0x4e, 0x42];
const XNB_VALID_PLATFORMS = new Set(['w', 'm', 'x', 'i', 'a', 'd', 's', 'p', 'v']);
const HEADER_INSPECTION_BYTES = 512;

export interface AssetValidationResult {
  readonly kind: SupportedAssetKind;
  readonly byteLength: number;
}

export interface AssetValidationOptions {
  readonly maxBytes?: number;
}

const DEFAULT_MAX_BYTES_BY_KIND: Readonly<Record<SupportedAssetKind, number>> = {
  png: MAX_IMAGE_FILE_SIZE_BYTES,
  tmx: MAX_MAP_FILE_SIZE_BYTES,
  xnb: MAX_XNB_FILE_SIZE_BYTES,
};

/**
 * Returns the default maximum file size in bytes for a given asset kind.
 */
export function getDefaultMaxBytesForAsset(kind: SupportedAssetKind): number {
  return DEFAULT_MAX_BYTES_BY_KIND[kind];
}

function matchesPrefix(buffer: Uint8Array, prefix: readonly number[]): boolean {
  if (buffer.byteLength < prefix.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i += 1) {
    if (buffer[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
}

function verifyPngMagicBytes(buffer: Uint8Array): void {
  if (!matchesPrefix(buffer, PNG_MAGIC_BYTES)) {
    throw new SecurityError(
      'ASSET_INVALID_MAGIC_BYTES',
      'File does not have valid PNG magic bytes.',
    );
  }
}

function verifyXnbMagicBytes(buffer: Uint8Array): void {
  if (!matchesPrefix(buffer, XNB_MAGIC_PREFIX) || buffer.byteLength < 4) {
    throw new SecurityError(
      'ASSET_INVALID_MAGIC_BYTES',
      'File does not have valid XNB magic bytes.',
    );
  }
  const platformByte = buffer[3];
  const platformChar = platformByte !== undefined ? String.fromCharCode(platformByte) : '';
  if (!XNB_VALID_PLATFORMS.has(platformChar)) {
    throw new SecurityError(
      'ASSET_INVALID_MAGIC_BYTES',
      'XNB header contains an unrecognized target platform byte.',
    );
  }
}

function verifyTmxHeaderAndSafety(text: string): void {
  const cleaned = text.replace(/^\uFEFF/, '').trimStart();
  if (!cleaned.startsWith('<?xml') && !cleaned.startsWith('<map')) {
    throw new SecurityError(
      'ASSET_INVALID_MAGIC_BYTES',
      'TMX map must begin with an XML declaration or <map> root element.',
    );
  }

  const upper = cleaned.toUpperCase();
  if (upper.includes('<!DOCTYPE') || upper.includes('<!ENTITY')) {
    throw new SecurityError(
      'ASSET_UNSAFE_CONTENT',
      'TMX map contains forbidden DOCTYPE or ENTITY declarations.',
    );
  }
}

/**
 * Validates an in-memory asset buffer against size limits and magic-byte signatures.
 */
export function validateAssetBuffer(
  buffer: Uint8Array,
  expectedKind: SupportedAssetKind,
  options: AssetValidationOptions = {},
): AssetValidationResult {
  const maxBytes = options.maxBytes ?? getDefaultMaxBytesForAsset(expectedKind);

  if (buffer.byteLength === 0) {
    throw new SecurityError('ASSET_EMPTY_FILE', 'Imported asset file is empty (0 bytes).');
  }

  if (buffer.byteLength > maxBytes) {
    throw new SecurityError(
      'ASSET_SIZE_EXCEEDED',
      `Asset size (${String(buffer.byteLength)} bytes) exceeds limit of ${String(maxBytes)} bytes.`,
    );
  }

  if (expectedKind === 'png') {
    verifyPngMagicBytes(buffer);
  } else if (expectedKind === 'xnb') {
    verifyXnbMagicBytes(buffer);
  } else {
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    verifyTmxHeaderAndSafety(decoded);
  }

  return { kind: expectedKind, byteLength: buffer.byteLength };
}

/**
 * Asynchronously inspects an external asset file on disk, checking size limits
 * via stat() before reading header/content bytes to prevent OOM crashes.
 */
export async function validateExternalAssetFile(
  filePath: string,
  expectedKind: SupportedAssetKind,
  options: AssetValidationOptions = {},
): Promise<AssetValidationResult> {
  const maxBytes = options.maxBytes ?? getDefaultMaxBytesForAsset(expectedKind);
  const stats = await fs.stat(filePath);

  if (!stats.isFile()) {
    throw new SecurityError('INVALID_PATH', `Asset path "${filePath}" is not a regular file.`);
  }
  if (stats.size === 0) {
    throw new SecurityError('ASSET_EMPTY_FILE', 'Imported asset file is empty (0 bytes).');
  }
  if (stats.size > maxBytes) {
    throw new SecurityError(
      'ASSET_SIZE_EXCEEDED',
      `Asset size (${String(stats.size)} bytes) exceeds limit of ${String(maxBytes)} bytes.`,
    );
  }

  if (expectedKind === 'tmx') {
    const fullBuffer = await fs.readFile(filePath);
    return validateAssetBuffer(fullBuffer, 'tmx', { maxBytes });
  }

  const handle = await fs.open(filePath, 'r');
  try {
    const bytesToRead = Math.min(stats.size, HEADER_INSPECTION_BYTES);
    const headerBuffer = Buffer.alloc(bytesToRead);
    await handle.read(headerBuffer, 0, bytesToRead, 0);
    if (expectedKind === 'png') {
      verifyPngMagicBytes(headerBuffer);
    } else {
      verifyXnbMagicBytes(headerBuffer);
    }
    return { kind: expectedKind, byteLength: stats.size };
  } finally {
    await handle.close();
  }
}
