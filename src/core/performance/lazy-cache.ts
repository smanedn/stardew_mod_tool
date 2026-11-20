export const DEFAULT_MAX_CACHE_ENTRIES = 256;

/**
 * Bounded LRU async cache that deduplicates concurrent loads and evicts
 * off-screen textures or assets when capacity is reached.
 */
export class LazyAssetCache<TKey, TValue> {
  private readonly maxEntries: number;
  private readonly entries = new Map<TKey, TValue>();
  private readonly inFlight = new Map<TKey, Promise<TValue>>();

  constructor(maxEntries: number = DEFAULT_MAX_CACHE_ENTRIES) {
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
  }

  public get size(): number {
    return this.entries.size;
  }

  public has(key: TKey): boolean {
    return this.entries.has(key);
  }

  public get(key: TKey): TValue | undefined {
    const existing = this.entries.get(key);
    if (existing === undefined) {
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, existing);
    return existing;
  }

  public async getOrLoad(key: TKey, loader: (key: TKey) => Promise<TValue>): Promise<TValue> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const pending = this.inFlight.get(key);
    if (pending !== undefined) {
      return pending;
    }

    const loadPromise = loader(key)
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, loadPromise);
    return loadPromise;
  }

  public set(key: TKey, value: TValue): void {
    if (this.entries.has(key)) {
      this.entries.delete(key);
    } else if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }
    this.entries.set(key, value);
  }

  public evict(key: TKey): boolean {
    return this.entries.delete(key);
  }

  public clear(): void {
    this.entries.clear();
  }
}
