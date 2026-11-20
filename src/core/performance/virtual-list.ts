export const DEFAULT_OVERSCAN_COUNT = 5;

export interface VirtualWindowInput {
  readonly totalItems: number;
  readonly itemHeightPx: number;
  readonly viewportHeightPx: number;
  readonly scrollTopPx: number;
  readonly overscanCount?: number;
}

export interface VirtualWindowResult {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly offsetTopPx: number;
  readonly totalHeightPx: number;
  readonly visibleCount: number;
}

/**
 * Computes the visible slice of a virtualized list so only on-screen items
 * (plus a small overscan buffer) are rendered or loaded into memory.
 */
export function computeVirtualWindow(input: VirtualWindowInput): VirtualWindowResult {
  const totalItems = Math.max(0, Math.floor(input.totalItems));
  const itemHeightPx = Math.max(1, input.itemHeightPx);
  const viewportHeightPx = Math.max(0, input.viewportHeightPx);
  const scrollTopPx = Math.max(0, input.scrollTopPx);
  const overscan = Math.max(0, Math.floor(input.overscanCount ?? DEFAULT_OVERSCAN_COUNT));

  if (totalItems === 0) {
    return {
      startIndex: 0,
      endIndex: -1,
      offsetTopPx: 0,
      totalHeightPx: 0,
      visibleCount: 0,
    };
  }

  const firstVisible = Math.floor(scrollTopPx / itemHeightPx);
  const visibleRows = Math.ceil(viewportHeightPx / itemHeightPx);
  const startIndex = Math.max(0, firstVisible - overscan);
  const endIndex = Math.min(totalItems - 1, firstVisible + visibleRows + overscan - 1);

  return {
    startIndex,
    endIndex,
    offsetTopPx: startIndex * itemHeightPx,
    totalHeightPx: totalItems * itemHeightPx,
    visibleCount: Math.max(0, endIndex - startIndex + 1),
  };
}
