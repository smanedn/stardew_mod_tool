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

/**
 * Creates a debounced wrapper for auto-save or live preview callbacks.
 * Enforces at least 300ms delay by default to prevent disk writes on every keystroke.
 */
export function createDebouncedTask<TArgs extends readonly unknown[]>(
  callback: (...args: TArgs) => void | Promise<void>,
  delayMs: number = DEFAULT_AUTO_SAVE_DEBOUNCE_MS,
  options: DebounceOptions = {},
): DebouncedTask<TArgs> {
  const enforceMin = options.enforceMinimumDelay ?? true;
  const effectiveDelay = enforceMin ? Math.max(delayMs, MIN_AUTO_SAVE_DEBOUNCE_MS) : delayMs;

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

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
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastArgs = null;
  };

  const flush = (): void => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    invokeLatest();
  };

  const call = (...args: TArgs): void => {
    lastArgs = args;
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(invokeLatest, effectiveDelay);
  };

  const pending = (): boolean => timerId !== null;

  return { delayMs: effectiveDelay, call, cancel, flush, pending };
}
