import { describe, expect, it } from 'vitest';
import {
  canRedo,
  canUndo,
  createStateChangeCommand,
  createUndoRedoHistory,
  executeCommand,
  redoCommand,
  undoCommand,
} from '../../../src/core/engine/index.js';

describe('Phase 5 Step 26: Global Undo/Redo Management (Command Pattern)', () => {
  it('executes commands, undoes with Ctrl+Z semantics, and redoes with Ctrl+Y semantics', () => {
    let history = createUndoRedoHistory<number>();
    let state = 10;

    const addFive = createStateChangeCommand('Add 5', 10, 15);
    const step1 = executeCommand(history, state, addFive);
    state = step1.state;
    history = step1.history;
    expect(state).toBe(15);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);

    const addTen = createStateChangeCommand('Add 10', 15, 25);
    const step2 = executeCommand(history, state, addTen);
    state = step2.state;
    history = step2.history;
    expect(state).toBe(25);

    const undone = undoCommand(history, state);
    state = undone.state;
    history = undone.history;
    expect(undone.changed).toBe(true);
    expect(state).toBe(15);
    expect(canRedo(history)).toBe(true);

    const redone = redoCommand(history, state);
    state = redone.state;
    history = redone.history;
    expect(redone.changed).toBe(true);
    expect(state).toBe(25);
    expect(canRedo(history)).toBe(false);
  });

  it('clears redo stack on a new edit after undo and caps history length', () => {
    let history = createUndoRedoHistory<number>(2);
    let state = 0;

    for (const next of [1, 2, 3]) {
      const res = executeCommand(history, state, createStateChangeCommand('Set', state, next));
      state = res.state;
      history = res.history;
    }

    expect(history.past).toHaveLength(2);
    const undone = undoCommand(history, state);
    state = undone.state;
    history = undone.history;
    expect(canRedo(history)).toBe(true);

    const branch = executeCommand(history, state, createStateChangeCommand('Branch', state, 99));
    expect(branch.state).toBe(99);
    expect(canRedo(branch.history)).toBe(false);
  });
});
