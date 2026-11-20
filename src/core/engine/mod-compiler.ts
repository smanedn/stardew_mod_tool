import path from 'node:path';
import type { SdvProjectFile } from '../../data/models/index.js';
import { safeWriteFileWithBackup } from '../security/index.js';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
  serializeCleanJson,
} from './browser-compiler.js';

export * from './browser-compiler.js';

/**
 * Compiles and writes manifest.json and content.json into an output mod folder safely.
 */
export async function compileModToDirectory(
  project: SdvProjectFile,
  outputDir: string,
  allowedRoots: readonly string[],
): Promise<{ readonly manifestPath: string; readonly contentPath: string }> {
  const manifest = compileProjectToManifest(project);
  const content = compileProjectToContentJson(project);

  const manifestPath = path.join(outputDir, 'manifest.json');
  const contentPath = path.join(outputDir, 'content.json');

  await safeWriteFileWithBackup({
    targetPath: manifestPath,
    content: serializeCleanJson(manifest),
    allowedRoots,
  });

  await safeWriteFileWithBackup({
    targetPath: contentPath,
    content: serializeCleanJson(content),
    allowedRoots,
  });

  return { manifestPath, contentPath };
}
