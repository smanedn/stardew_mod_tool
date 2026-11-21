import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type UndoRedoHistory,
  canRedo,
  canUndo,
  createStateChangeCommand,
  createUndoRedoHistory,
  executeCommand,
  redoCommand,
  undoCommand,
} from '../../core/engine/undo-redo.js';
import type { SdvProjectFile } from '../../data/models/index.js';
import {
  loadRecentProjectsFromDb,
  loadRecentProjectsSync,
  saveRecentProjectsAsync,
} from '../utils/project-storage.js';

function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function useKeyboardUndoRedo(
  enabled: boolean,
  onUndo: () => void,
  onRedo: () => void,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!enabled || (!event.ctrlKey && !event.metaKey) || isEditableElement(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        onUndo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        onRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return (): void => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled, onRedo, onUndo]);
}

function useDebouncedRecentSave(
  onNotify: (message: string) => void,
  setRecentProjects: (projects: readonly SdvProjectFile[]) => void,
): (projects: readonly SdvProjectFile[]) => void {
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadRecentProjectsFromDb().then((dbProjects) => {
      if (!cancelled && dbProjects !== null && dbProjects.length > 0) {
        setRecentProjects(dbProjects);
      }
    });
    return (): void => {
      cancelled = true;
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [setRecentProjects]);

  return useCallback(
    (projects: readonly SdvProjectFile[]): void => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void saveRecentProjectsAsync(projects).then((ok) => {
          if (!ok) {
            onNotify('Browser storage quota full — export .sdvproj backup to keep changes.');
          }
        });
      }, 300);
    },
    [onNotify],
  );
}

export interface ProjectWorkspaceController {
  readonly recentProjects: readonly SdvProjectFile[];
  readonly activeProject: SdvProjectFile | null;
  readonly undoAvailable: boolean;
  readonly redoAvailable: boolean;
  readonly setActiveProject: (project: SdvProjectFile | null) => void;
  readonly openAndRememberProject: (project: SdvProjectFile) => void;
  readonly applyProjectChange: (label: string, nextProject: SdvProjectFile) => void;
  readonly deleteProject: (uniqueId: string) => void;
  readonly handleUndo: () => void;
  readonly handleRedo: () => void;
}

function useWorkspaceHistoryActions(
  activeProject: SdvProjectFile | null,
  history: UndoRedoHistory<SdvProjectFile>,
  setHistory: (next: UndoRedoHistory<SdvProjectFile>) => void,
  persistActive: (proj: SdvProjectFile) => void,
): {
  readonly applyProjectChange: (label: string, nextProj: SdvProjectFile) => void;
  readonly handleUndo: () => void;
  readonly handleRedo: () => void;
} {
  const applyProjectChange = useCallback(
    (label: string, nextProj: SdvProjectFile): void => {
      if (activeProject === null) { return; }
      const res = executeCommand(
        history,
        activeProject,
        createStateChangeCommand(label, activeProject, nextProj),
      );
      setHistory(res.history);
      persistActive(res.state);
    },
    [activeProject, history, persistActive, setHistory],
  );

  const runHistoryStep = useCallback(
    (step: typeof undoCommand): void => {
      if (activeProject === null) { return; }
      const res = step(history, activeProject);
      if (res.changed) {
        setHistory(res.history);
        persistActive(res.state);
      }
    },
    [activeProject, history, persistActive, setHistory],
  );

  return {
    applyProjectChange,
    handleUndo: useCallback((): void => { runHistoryStep(undoCommand); }, [runHistoryStep]),
    handleRedo: useCallback((): void => { runHistoryStep(redoCommand); }, [runHistoryStep]),
  };
}

interface WorkspaceOpsDeps {
  readonly recentProjects: readonly SdvProjectFile[];
  readonly activeProject: SdvProjectFile | null;
  readonly setRecentProjects: (projects: readonly SdvProjectFile[]) => void;
  readonly setActiveProject: (project: SdvProjectFile | null) => void;
  readonly setHistory: (history: UndoRedoHistory<SdvProjectFile>) => void;
  readonly scheduleSave: (projects: readonly SdvProjectFile[]) => void;
  readonly onClearImportError: () => void;
}

function useWorkspaceProjectOps(deps: WorkspaceOpsDeps): {
  readonly persistActive: (proj: SdvProjectFile) => void;
  readonly openAndRememberProject: (proj: SdvProjectFile) => void;
  readonly deleteProject: (uniqueId: string) => void;
} {
  const persistActive = useCallback(
    (proj: SdvProjectFile): void => {
      const updated = [
        proj,
        ...deps.recentProjects.filter((p) => p.metadata.uniqueId !== proj.metadata.uniqueId),
      ];
      deps.setRecentProjects(updated);
      deps.scheduleSave(updated);
      deps.setActiveProject(proj);
      deps.onClearImportError();
    },
    [deps],
  );

  const openAndRememberProject = useCallback(
    (proj: SdvProjectFile): void => {
      deps.setHistory(createUndoRedoHistory<SdvProjectFile>());
      persistActive(proj);
    },
    [deps, persistActive],
  );

  const deleteProject = useCallback(
    (uniqueId: string): void => {
      const updated = deps.recentProjects.filter((item) => item.metadata.uniqueId !== uniqueId);
      deps.setRecentProjects(updated);
      deps.scheduleSave(updated);
      if (deps.activeProject?.metadata.uniqueId === uniqueId) {
        deps.setActiveProject(null);
        deps.setHistory(createUndoRedoHistory<SdvProjectFile>());
      }
    },
    [deps],
  );

  return { persistActive, openAndRememberProject, deleteProject };
}

export function useProjectWorkspace(
  onNotify: (message: string) => void,
  onClearImportError: () => void,
): ProjectWorkspaceController {
  const [recentProjects, setRecentProjects] = useState<readonly SdvProjectFile[]>(
    loadRecentProjectsSync,
  );
  const [activeProject, setActiveProject] = useState<SdvProjectFile | null>(null);
  const [history, setHistory] = useState<UndoRedoHistory<SdvProjectFile>>(() =>
    createUndoRedoHistory<SdvProjectFile>(),
  );
  const scheduleSave = useDebouncedRecentSave(onNotify, setRecentProjects);
  const { persistActive, openAndRememberProject, deleteProject } = useWorkspaceProjectOps({
    recentProjects,
    activeProject,
    setRecentProjects,
    setActiveProject,
    setHistory,
    scheduleSave,
    onClearImportError,
  });
  const actions = useWorkspaceHistoryActions(activeProject, history, setHistory, persistActive);
  useKeyboardUndoRedo(activeProject !== null, actions.handleUndo, actions.handleRedo);
  return {
    recentProjects,
    activeProject,
    undoAvailable: canUndo(history),
    redoAvailable: canRedo(history),
    setActiveProject,
    openAndRememberProject,
    deleteProject,
    ...actions,
  };
}
