export const MIN_AUTO_SAVE_DEBOUNCE_MS = 300;
export const DEFAULT_AUTO_SAVE_DEBOUNCE_MS = 400;

export interface DebounceOptions {
  readonly enforceMinimumDelay?: boolean;
}

export interface DebouncedTask<TArgs extends readonly unknown[]> {
  readonly delayMs: number;
  call: (...args: TArgs) => void;
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
}

function resolveEffectiveDelay(delayMs: number, options: DebounceOptions): number {
  const enforceMin = options.enforceMinimumDelay ?? true;
  return enforceMin ? Math.max(delayMs, MIN_AUTO_SAVE_DEBOUNCE_MS) : delayMs;
}

/**
 * Creates a debounced wrapper for auto-save or live preview callbacks.
 * Enforces at least 300ms delay by default to prevent disk writes on every keystroke.
 */
export function createDebouncedTask<TArgs extends readonly unknown[]>(
  callback: (...args: TArgs) => void | Promise<void>,
  delayMs: number = DEFAULT_AUTO_SAVE_DEBOUNCE_MS,
  options: DebounceOptions = {},
): DebouncedTask<TArgs> {
  const effectiveDelay = resolveEffectiveDelay(delayMs, options);
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const clearPendingTimer = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  const invokeLatest = (): void => {
    if (lastArgs === null) {
      return;
    }
    const argsToRun = lastArgs;
    lastArgs = null;
    timerId = null;
    void callback(...argsToRun);
  };

  const cancel = (): void => {
    clearPendingTimer();
    lastArgs = null;
  };

  const flush = (): void => {
    clearPendingTimer();
    invokeLatest();
  };

  const call = (...args: TArgs): void => {
    lastArgs = args;
    clearPendingTimer();
    timerId = setTimeout(invokeLatest, effectiveDelay);
  };

  return { delayMs: effectiveDelay, call, cancel, flush, pending: () => timerId !== null };
}
