import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { SdvProjectFile } from '../../data/models/index.js';
import { SdvProjectSchema } from '../parsers/project-file.js';
import { readJsonFileAsync, writeJsonFileAsync } from '../performance/index.js';
import { assertSafeWriteTarget, validateWithSchema } from '../security/index.js';

export const AUTO_RECOVERY_INTERVAL_MS = 2 * 60 * 1000;
export const RECOVERY_FILE_NAME = 'project.recovery.json';

interface RecoveryEnvelope {
  readonly savedAt: string;
  readonly checksum: string;
  readonly project: SdvProjectFile;
}

const RecoveryEnvelopeSchema: z.ZodType<RecoveryEnvelope> = z
  .object({
    savedAt: z.string().min(1),
    checksum: z.string().length(64),
    project: SdvProjectSchema,
  })
  .strict();

export type RecoveryLoadResult =
  | { readonly recovered: true; readonly project: SdvProjectFile; readonly savedAt: string }
  | { readonly recovered: false; readonly reason: 'missing' | 'corrupted' };

export interface AutoRecoveryController {
  readonly triggerNow: () => Promise<void>;
  readonly stop: () => void;
}

function computeProjectChecksum(project: SdvProjectFile): string {
  return createHash('sha256').update(JSON.stringify(project)).digest('hex');
}

/**
 * Silently writes a checksum-protected recovery snapshot inside projectDir.
 */
export async function writeRecoverySnapshot(
  projectDir: string,
  project: SdvProjectFile,
): Promise<string> {
  const validated = validateWithSchema(SdvProjectSchema, project, 'Recovery project');
  const recoveryPath = await assertSafeWriteTarget(
    path.join(projectDir, RECOVERY_FILE_NAME),
    [projectDir],
  );
  const envelope: RecoveryEnvelope = {
    savedAt: new Date().toISOString(),
    checksum: computeProjectChecksum(validated),
    project: validated,
  };
  await writeJsonFileAsync(recoveryPath, envelope, [projectDir]);
  return recoveryPath;
}

/**
 * Reads and verifies the SHA-256 integrity checksum of a recovery snapshot.
 */
export async function loadRecoverySnapshot(projectDir: string): Promise<RecoveryLoadResult> {
  const recoveryPath = path.join(path.resolve(projectDir), RECOVERY_FILE_NAME);
  try {
    await fs.access(recoveryPath);
  } catch {
    return { recovered: false, reason: 'missing' };
  }

  try {
    const envelope = await readJsonFileAsync(recoveryPath, RecoveryEnvelopeSchema, [projectDir]);
    const expectedChecksum = computeProjectChecksum(envelope.project);
    if (envelope.checksum !== expectedChecksum) {
      return { recovered: false, reason: 'corrupted' };
    }
    return { recovered: true, project: envelope.project, savedAt: envelope.savedAt };
  } catch {
    return { recovered: false, reason: 'corrupted' };
  }
}

/**
 * Removes the recovery snapshot after a clean manual save or normal exit.
 */
export async function clearRecoverySnapshot(projectDir: string): Promise<void> {
  const recoveryPath = await assertSafeWriteTarget(
    path.join(projectDir, RECOVERY_FILE_NAME),
    [projectDir],
  );
  await fs.rm(recoveryPath, { force: true });
}

/**
 * Starts a silent 2-minute auto-recovery timer that snapshots dirty project state.
 */
export function startAutoRecoveryScheduler(options: {
  readonly projectDir: string;
  readonly getProject: () => SdvProjectFile | null;
  readonly intervalMs?: number;
  readonly onSaved?: (recoveryPath: string) => void;
}): AutoRecoveryController {
  const intervalMs = options.intervalMs ?? AUTO_RECOVERY_INTERVAL_MS;

  const triggerNow = async (): Promise<void> => {
    const project = options.getProject();
    if (project !== null) {
      const savedPath = await writeRecoverySnapshot(options.projectDir, project);
      options.onSaved?.(savedPath);
    }
  };

  const timerId = setInterval(() => {
    void triggerNow();
  }, intervalMs);

  return {
    triggerNow,
    stop: (): void => {
      clearInterval(timerId);
    },
  };
}
