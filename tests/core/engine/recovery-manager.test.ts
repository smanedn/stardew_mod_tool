import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTO_RECOVERY_INTERVAL_MS,
  RECOVERY_FILE_NAME,
  clearRecoverySnapshot,
  createEmptyProject,
  loadRecoverySnapshot,
  startAutoRecoveryScheduler,
  writeRecoverySnapshot,
} from '../../../src/core/index.js';

describe('Phase 5 Step 27: Integrity Check & Recovery System', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-recovery-'));
  });

  afterEach(async () => {
    vi.useRealTimers();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('writes, verifies SHA-256 integrity, and clears recovery snapshots', async () => {
    const project = createEmptyProject({
      name: 'Recovery Test',
      author: 'Farmer',
      version: '1.0.0',
      description: 'Test',
      uniqueId: 'Farmer.RecoveryTest',
    });

    await writeRecoverySnapshot(tempRoot, project);
    const loaded = await loadRecoverySnapshot(tempRoot);
    expect(loaded.recovered).toBe(true);
    if (loaded.recovered) {
      expect(loaded.project.metadata.uniqueId).toBe('Farmer.RecoveryTest');
    }

    await clearRecoverySnapshot(tempRoot);
    const afterClear = await loadRecoverySnapshot(tempRoot);
    expect(afterClear).toEqual({ recovered: false, reason: 'missing' });
  });

  it('detects corrupted recovery snapshots via checksum mismatch', async () => {
    const project = createEmptyProject({
      name: 'Tamper Test',
      author: 'Farmer',
      version: '1.0.0',
      description: 'Test',
      uniqueId: 'Farmer.TamperTest',
    });

    const recoveryPath = await writeRecoverySnapshot(tempRoot, project);
    const raw = await fs.readFile(recoveryPath, 'utf-8');
    await fs.writeFile(recoveryPath, raw.replace('Tamper Test', 'Corrupted Name'));

    const loaded = await loadRecoverySnapshot(tempRoot);
    expect(loaded).toEqual({ recovered: false, reason: 'corrupted' });
  });

  it('auto-saves silently on the 2-minute interval', async () => {
    vi.useFakeTimers();
    const project = createEmptyProject({
      name: 'Auto Save',
      author: 'Farmer',
      version: '1.0.0',
      description: 'Test',
      uniqueId: 'Farmer.AutoSave',
    });

    let resolveSaved: (() => void) | undefined;
    const savedPromise = new Promise<void>((resolve) => {
      resolveSaved = resolve;
    });

    const controller = startAutoRecoveryScheduler({
      projectDir: tempRoot,
      getProject: () => project,
      onSaved: () => {
        resolveSaved?.();
      },
    });

    expect(AUTO_RECOVERY_INTERVAL_MS).toBe(120_000);
    vi.advanceTimersByTime(AUTO_RECOVERY_INTERVAL_MS);
    await savedPromise;
    controller.stop();

    await expect(fs.access(path.join(tempRoot, RECOVERY_FILE_NAME))).resolves.toBeUndefined();
  });
});
