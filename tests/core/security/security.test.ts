import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AreaRectSchema,
  CONTENT_PATCHER_UNIQUE_ID,
  CoordinatesSchema,
  GameTargetSchema,
  ManifestInputSchema,
  SecurityError,
  SemVerSchema,
  UniqueIdSchema,
  assertAllowedModFileExtension,
  assertContentPatcherOnlyManifest,
  assertSafeWriteTarget,
  createBackupSnapshot,
  resolvePathWithinAllowedRoots,
  resolvePathWithinRoot,
  safeWriteFileWithBackup,
  validateAssetBuffer,
  validateExternalAssetFile,
  validateWithSchema,
} from '../../../src/core/security/index.js';

describe('1. Zero Arbitrary Code Execution', () => {
  it('allows Content Patcher JSON and static asset extensions', () => {
    expect(assertAllowedModFileExtension('manifest.json')).toBe('.json');
    expect(assertAllowedModFileExtension('assets/crop.PNG')).toBe('.png');
    expect(assertAllowedModFileExtension('maps/farm.tmx')).toBe('.tmx');
    expect(assertAllowedModFileExtension('data/Objects.xnb')).toBe('.xnb');
  });

  it('rejects C# DLLs, executables, and script extensions', () => {
    for (const badFile of ['Mod.dll', 'helper.exe', 'Patch.cs', 'run.ps1', 'evil.bat', 'a.js']) {
      expect(() => assertAllowedModFileExtension(badFile)).toThrowError(SecurityError);
    }
  });

  it('forbids EntryDll and enforces ContentPatcher in manifest.json', () => {
    expect(() => {
      assertContentPatcherOnlyManifest({
        Name: 'Test',
        EntryDll: 'Test.dll',
        ContentPackFor: { UniqueID: CONTENT_PATCHER_UNIQUE_ID },
      });
    }).toThrowError(SecurityError);

    expect(() => {
      assertContentPatcherOnlyManifest({
        Name: 'Test',
        ContentPackFor: { UniqueID: 'SomeOther.Framework' },
      });
    }).toThrowError(SecurityError);

    expect(() => {
      assertContentPatcherOnlyManifest({
        Name: 'Test',
        ContentPackFor: { UniqueID: CONTENT_PATCHER_UNIQUE_ID },
      });
    }).not.toThrow();
  });
});

describe('2. Path Sanitization (Path Traversal Protection)', () => {
  let tempRoot: string;
  let projectDir: string;
  let modsDir: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-sec-'));
    projectDir = path.join(tempRoot, 'project');
    modsDir = path.join(tempRoot, 'Mods');
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(modsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('resolves valid relative paths inside the project root', () => {
    const resolved = resolvePathWithinRoot(projectDir, 'assets/crop.png');
    expect(resolved).toBe(path.join(projectDir, 'assets', 'crop.png'));
  });

  it('blocks path traversal and null bytes', () => {
    expect(() => resolvePathWithinRoot(projectDir, '../escape.json')).toThrowError(SecurityError);
    expect(() => resolvePathWithinRoot(projectDir, 'assets/../../etc/passwd')).toThrowError(
      SecurityError,
    );
    expect(() => resolvePathWithinRoot(projectDir, 'bad\0path.json')).toThrowError(SecurityError);
  });

  it('allows writes inside either projectDir or modsDir, but blocks elsewhere', async () => {
    const inProject = path.join(projectDir, 'content.json');
    const inMods = path.join(modsDir, 'MyMod', 'manifest.json');
    const outside = path.join(tempRoot, 'outside.json');

    expect(resolvePathWithinAllowedRoots(inProject, [projectDir, modsDir])).toBe(inProject);
    expect(resolvePathWithinAllowedRoots(inMods, [projectDir, modsDir])).toBe(inMods);
    expect(() => resolvePathWithinAllowedRoots(outside, [projectDir, modsDir])).toThrowError(
      SecurityError,
    );

    await expect(assertSafeWriteTarget(inMods, [projectDir, modsDir])).resolves.toBe(inMods);
    await expect(assertSafeWriteTarget(outside, [projectDir, modsDir])).rejects.toThrowError(
      SecurityError,
    );
  });
});

describe('3. Strict Input Validation (Schema Validation)', () => {
  it('validates UniqueID, SemVer, GameTarget, and Coordinates', () => {
    expect(validateWithSchema(UniqueIdSchema, 'Author.MyMod')).toBe('Author.MyMod');
    expect(validateWithSchema(SemVerSchema, '1.2.3-beta.1')).toBe('1.2.3-beta.1');
    expect(validateWithSchema(GameTargetSchema, 'Data/Objects')).toBe('Data/Objects');
    expect(validateWithSchema(CoordinatesSchema, { X: 16, Y: 32 })).toEqual({ X: 16, Y: 32 });
    expect(validateWithSchema(AreaRectSchema, { X: 0, Y: 0, Width: 16, Height: 16 })).toEqual({
      X: 0,
      Y: 0,
      Width: 16,
      Height: 16,
    });
  });

  it('rejects malformed IDs, versions, traversal targets, and negative coordinates', () => {
    expect(() => validateWithSchema(UniqueIdSchema, 'Bad Mod/ID')).toThrowError(SecurityError);
    expect(() => validateWithSchema(SemVerSchema, 'v1.0')).toThrowError(SecurityError);
    expect(() => validateWithSchema(GameTargetSchema, '../Data/Objects')).toThrowError(
      SecurityError,
    );
    expect(() => validateWithSchema(CoordinatesSchema, { X: -1, Y: 0 })).toThrowError(
      SecurityError,
    );
    expect(() =>
      validateWithSchema(ManifestInputSchema, {
        Name: 'Bad',
        Author: 'User',
        Version: '1.0.0',
        UniqueID: 'User.Bad',
        ContentPackFor: { UniqueID: CONTENT_PATCHER_UNIQUE_ID },
        EntryDll: 'Bad.dll',
      }),
    ).toThrowError(SecurityError);
  });
});

describe('4. Safe External Asset Handling', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-asset-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('accepts valid PNG, XNB, and TMX magic bytes', () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(validateAssetBuffer(pngBytes, 'png').kind).toBe('png');

    const xnbBytes = new Uint8Array([0x58, 0x4e, 0x42, 0x77, 0x05, 0x00]);
    expect(validateAssetBuffer(xnbBytes, 'xnb').kind).toBe('xnb');

    const tmxBytes = new TextEncoder().encode('<?xml version="1.0"?><map version="1.10"></map>');
    expect(validateAssetBuffer(tmxBytes, 'tmx').kind).toBe('tmx');
  });

  it('rejects spoofed PNGs, empty files, oversized files, and XXE TMX payloads', async () => {
    const fakePng = new TextEncoder().encode('MZ_NOT_A_PNG_EXECUTABLE');
    expect(() => validateAssetBuffer(fakePng, 'png')).toThrowError(SecurityError);

    expect(() => validateAssetBuffer(new Uint8Array(0), 'png')).toThrowError(SecurityError);

    const smallLimitBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2]);
    expect(() => validateAssetBuffer(smallLimitBytes, 'png', { maxBytes: 8 })).toThrowError(
      SecurityError,
    );

    const xxeTmx = new TextEncoder().encode(
      '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><map/>',
    );
    expect(() => validateAssetBuffer(xxeTmx, 'tmx')).toThrowError(SecurityError);

    const diskPngPath = path.join(tempRoot, 'sprite.png');
    await fs.writeFile(diskPngPath, smallLimitBytes);
    const result = await validateExternalAssetFile(diskPngPath, 'png');
    expect(result.byteLength).toBe(smallLimitBytes.byteLength);
  });
});

describe('5. Automatic Backups', () => {
  let tempRoot: string;
  let projectDir: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-backup-'));
    projectDir = path.join(tempRoot, 'project');
    await fs.mkdir(projectDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('creates a snapshot inside .backup before overwriting an existing file', async () => {
    const manifestPath = path.join(projectDir, 'manifest.json');
    await fs.writeFile(manifestPath, '{"version":"1.0.0"}');

    const backupResult = await safeWriteFileWithBackup({
      targetPath: manifestPath,
      content: '{"version":"1.0.1"}',
      allowedRoots: [projectDir],
    });

    expect(backupResult.created).toBe(true);
    expect(backupResult.backupPath).not.toBeNull();
    if (backupResult.backupPath !== null) {
      const backedUpContent = await fs.readFile(backupResult.backupPath, 'utf-8');
      expect(backedUpContent).toBe('{"version":"1.0.0"}');
    }

    const updatedContent = await fs.readFile(manifestPath, 'utf-8');
    expect(updatedContent).toBe('{"version":"1.0.1"}');
  });

  it('skips backup when target file does not exist yet', async () => {
    const targetPath = path.join(projectDir, 'content.json');
    const result = await createBackupSnapshot({ targetPath, rootDir: projectDir });
    expect(result).toEqual({ created: false, backupPath: null });
  });
});
