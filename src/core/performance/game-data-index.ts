export const DEFAULT_SEARCH_LIMIT = 50;

export interface IndexableGameEntry {
  readonly id: string;
  readonly name: string;
}

/**
 * In-memory Hash Map index for extracted Stardew Valley game data (e.g. Objects.json),
 * enabling O(1) ID lookups and fast searches without repeated disk reads.
 */
export class GameDataIndex<TEntry extends IndexableGameEntry> {
  private readonly byId = new Map<string, TEntry>();

  constructor(entries: readonly TEntry[] = []) {
    this.loadEntries(entries);
  }

  public get count(): number {
    return this.byId.size;
  }

  public loadEntries(entries: readonly TEntry[]): void {
    this.byId.clear();
    for (const entry of entries) {
      this.byId.set(entry.id, entry);
    }
  }

  public loadFromRecord(record: Readonly<Record<string, TEntry>>): void {
    this.byId.clear();
    for (const [id, data] of Object.entries(record)) {
      this.byId.set(id, data);
    }
  }

  public getById(id: string): TEntry | undefined {
    return this.byId.get(id);
  }

  public search(query: string, limit: number = DEFAULT_SEARCH_LIMIT): readonly TEntry[] {
    const normalized = query.trim().toLowerCase();
    const maxResults = Math.max(1, Math.floor(limit));
    const matches: TEntry[] = [];

    for (const entry of this.byId.values()) {
      const matchesQuery =
        normalized.length === 0 ||
        entry.name.toLowerCase().includes(normalized) ||
        entry.id.toLowerCase().includes(normalized);

      if (matchesQuery) {
        matches.push(entry);
        if (matches.length >= maxResults) {
          break;
        }
      }
    }

    return matches;
  }
}
