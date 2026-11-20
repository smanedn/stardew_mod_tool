export const DEFAULT_MAX_UNDO_HISTORY = 100;

/**
 * Command Pattern interface representing a reversible state mutation.
 */
export interface Command<TState> {
  readonly label: string;
  execute: (state: TState) => TState;
  undo: (state: TState) => TState;
}

export interface UndoRedoHistory<TState> {
  readonly past: readonly Command<TState>[];
  readonly future: readonly Command<TState>[];
  readonly maxHistory: number;
}

export interface HistoryTransitionResult<TState> {
  readonly state: TState;
  readonly history: UndoRedoHistory<TState>;
  readonly changed: boolean;
}

/**
 * Creates a reversible command from a previous and next immutable state snapshot.
 */
export function createStateChangeCommand<TState>(
  label: string,
  previousState: TState,
  nextState: TState,
): Command<TState> {
  return {
    label,
    execute: () => nextState,
    undo: () => previousState,
  };
}

/**
 * Initializes an empty chronological undo/redo history stack.
 */
export function createUndoRedoHistory<TState>(
  maxHistory: number = DEFAULT_MAX_UNDO_HISTORY,
): UndoRedoHistory<TState> {
  return {
    past: [],
    future: [],
    maxHistory: Math.max(1, Math.floor(maxHistory)),
  };
}

export function canUndo<TState>(history: UndoRedoHistory<TState>): boolean {
  return history.past.length > 0;
}

export function canRedo<TState>(history: UndoRedoHistory<TState>): boolean {
  return history.future.length > 0;
}

/**
 * Executes a command, pushes it onto the past stack, and clears the redo stack.
 */
export function executeCommand<TState>(
  history: UndoRedoHistory<TState>,
  state: TState,
  command: Command<TState>,
): HistoryTransitionResult<TState> {
  const nextState = command.execute(state);
  const nextPast = [...history.past, command].slice(-history.maxHistory);
  return {
    state: nextState,
    history: {
      ...history,
      past: nextPast,
      future: [],
    },
    changed: true,
  };
}

/**
 * Undoes the most recent command and moves it onto the redo stack.
 */
export function undoCommand<TState>(
  history: UndoRedoHistory<TState>,
  state: TState,
): HistoryTransitionResult<TState> {
  const lastCommand = history.past[history.past.length - 1];
  if (lastCommand === undefined) {
    return { state, history, changed: false };
  }

  return {
    state: lastCommand.undo(state),
    history: {
      ...history,
      past: history.past.slice(0, -1),
      future: [lastCommand, ...history.future],
    },
    changed: true,
  };
}

/**
 * Re-applies the most recently undone command and moves it back onto the past stack.
 */
export function redoCommand<TState>(
  history: UndoRedoHistory<TState>,
  state: TState,
): HistoryTransitionResult<TState> {
  const nextCommand = history.future[0];
  if (nextCommand === undefined) {
    return { state, history, changed: false };
  }

  return {
    state: nextCommand.execute(state),
    history: {
      ...history,
      past: [...history.past, nextCommand].slice(-history.maxHistory),
      future: history.future.slice(1),
    },
    changed: true,
  };
}
