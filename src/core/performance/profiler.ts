export interface MemorySnapshot {
  readonly heapUsedMb: number;
  readonly rssMb: number;
  readonly externalMb: number;
}

export interface ProfiledResult<T> {
  readonly label: string;
  readonly durationMs: number;
  readonly heapDeltaMb: number;
  readonly result: T;
}

const BYTES_PER_MB = 1024 * 1024;

function roundMb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_MB) * 100) / 100;
}

/**
 * Captures current Node/V8 process memory usage in megabytes.
 */
export function captureMemorySnapshot(): MemorySnapshot {
  const usage = process.memoryUsage();
  return {
    heapUsedMb: roundMb(usage.heapUsed),
    rssMb: roundMb(usage.rss),
    externalMb: roundMb(usage.external),
  };
}

/**
 * Measures execution time and heap delta for an async startup or rendering operation.
 */
export async function measurePerformanceAsync<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<ProfiledResult<T>> {
  const startHeap = process.memoryUsage().heapUsed;
  const startTime = performance.now();
  const result = await operation();
  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
  const heapDeltaMb = roundMb(process.memoryUsage().heapUsed - startHeap);

  return { label, durationMs, heapDeltaMb, result };
}
