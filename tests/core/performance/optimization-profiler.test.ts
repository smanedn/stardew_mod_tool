import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  captureMemorySnapshot,
  compressVanillaDump,
  decompressVanillaDump,
  loadCompressedVanillaDb,
  measurePerformanceAsync,
  writeCompressedVanillaDb,
} from '../../../src/core/index.js';
import type { VanillaDatabaseDump } from '../../../src/data/models/index.js';

describe('Phase 5 Step 29: Resource Optimization & Profiling', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-opt-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('compresses vanilla database dumps significantly and round-trips losslessly', async () => {
    const objects = Array.from({ length: 500 }, (_, i) => ({
      id: String(i),
      name: `Item_${String(i)}`,
      displayName: `Stardew Item ${String(i)}`,
      category: -75,
      price: i * 10,
    }));

    const dump: VanillaDatabaseDump = {
      gameVersion: '1.6.15',
      objects,
      crops: [],
      npcs: [],
      recipes: [],
      locations: [],
    };

    const rawSize = Buffer.byteLength(JSON.stringify(dump), 'utf-8');
    const compressed = await compressVanillaDump(dump);
    expect(compressed.length).toBeLessThan(rawSize * 0.35);

    const db = await decompressVanillaDump(compressed);
    expect(db.objects.count).toBe(500);
    expect(db.objects.getById('42')?.price).toBe(420);

    const dbPath = path.join(tempRoot, 'vanilla.sdvdb.gz');
    await writeCompressedVanillaDb(dbPath, dump, [tempRoot]);
    const loaded = await loadCompressedVanillaDb(dbPath, [tempRoot]);
    expect(loaded.objects.getById('100')?.name).toBe('Item_100');
  });

  it('captures memory snapshots and profiles async operations', async () => {
    const mem = captureMemorySnapshot();
    expect(mem.heapUsedMb).toBeGreaterThan(0);
    expect(mem.rssMb).toBeGreaterThan(0);

    const profiled = await measurePerformanceAsync('noop', async () => Promise.resolve(42));
    expect(profiled.result).toBe(42);
    expect(profiled.durationMs).toBeGreaterThanOrEqual(0);
  });
});
