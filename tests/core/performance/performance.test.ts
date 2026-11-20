import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  GameDataIndex,
  LazyAssetCache,
  MIN_AUTO_SAVE_DEBOUNCE_MS,
  computeVirtualWindow,
  createDebouncedTask,
  readBinaryAssetAsync,
  readJsonFileAsync,
  writeJsonFileAsync,
} from '../../../src/core/performance/index.js';

describe('2. Performance (Speed & Low Footprint)', () => {
  describe('Non-Blocking Asynchronous I/O', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sdv-perf-'));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('reads and writes validated JSON asynchronously with backup', async () => {
      const filePath = path.join(tempDir, 'objects.json');
      const schema = z.object({ name: z.string(), price: z.number() }).strict();

      await writeJsonFileAsync(filePath, { name: 'Parsnip', price: 35 }, [tempDir]);
      const loaded = await readJsonFileAsync(filePath, schema, [tempDir]);
      expect(loaded).toEqual({ name: 'Parsnip', price: 35 });

      const backupResult = await writeJsonFileAsync(filePath, { name: 'Parsnip', price: 45 }, [
        tempDir,
      ]);
      expect(backupResult.created).toBe(true);
    });

    it('reads validated binary assets asynchronously', async () => {
      const pngPath = path.join(tempDir, 'icon.png');
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
      await fs.writeFile(pngPath, pngBytes);

      const loaded = await readBinaryAssetAsync(pngPath, 'png', [tempDir]);
      expect(Array.from(loaded)).toEqual(Array.from(pngBytes));
    });
  });

  describe('Lazy Loading and Virtualization', () => {
    it('computes visible window with overscan for large lists', () => {
      const window = computeVirtualWindow({
        totalItems: 5000,
        itemHeightPx: 40,
        viewportHeightPx: 400,
        scrollTopPx: 800,
        overscanCount: 3,
      });

      expect(window.startIndex).toBe(17);
      expect(window.endIndex).toBe(32);
      expect(window.offsetTopPx).toBe(17 * 40);
      expect(window.totalHeightPx).toBe(5000 * 40);
      expect(window.visibleCount).toBe(16);
    });

    it('deduplicates concurrent loads and evicts LRU entries', async () => {
      const cache = new LazyAssetCache<string, string>(2);
      const loader = vi.fn(async (key: string) => Promise.resolve(`loaded:${key}`));

      const [a1, a2] = await Promise.all([
        cache.getOrLoad('sprite-a', loader),
        cache.getOrLoad('sprite-a', loader),
      ]);

      expect(a1).toBe('loaded:sprite-a');
      expect(a2).toBe('loaded:sprite-a');
      expect(loader).toHaveBeenCalledTimes(1);

      await cache.getOrLoad('sprite-b', loader);
      await cache.getOrLoad('sprite-c', loader);

      expect(cache.size).toBe(2);
      expect(cache.has('sprite-a')).toBe(false);
      expect(cache.has('sprite-b')).toBe(true);
      expect(cache.has('sprite-c')).toBe(true);
    });
  });

  describe('Smart In-Memory Caching', () => {
    it('indexes game data in a Map for O(1) lookup and fast search', () => {
      const index = new GameDataIndex([
        { id: '24', name: 'Parsnip' },
        { id: '400', name: 'Strawberry' },
        { id: '254', name: 'Melon' },
      ]);

      expect(index.count).toBe(3);
      expect(index.getById('400')?.name).toBe('Strawberry');
      expect(index.search('berry').map((item) => item.id)).toEqual(['400']);
    });
  });

  describe('Debounce on Auto-Save and Live Preview', () => {
    it('enforces minimum 300ms delay and coalesces rapid edits', () => {
      vi.useFakeTimers();
      try {
        const saveSpy = vi.fn();
        const task = createDebouncedTask(saveSpy, 100);
        expect(task.delayMs).toBe(MIN_AUTO_SAVE_DEBOUNCE_MS);

        task.call('draft-1');
        task.call('draft-2');
        task.call('draft-3');

        vi.advanceTimersByTime(299);
        expect(saveSpy).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(saveSpy).toHaveBeenCalledTimes(1);
        expect(saveSpy).toHaveBeenCalledWith('draft-3');
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
