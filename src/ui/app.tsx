import { useCallback, useEffect, useState } from 'react';
import {
  type ProjectTemplateId,
  createProjectFromTemplate,
  importManifestJsonToProject,
} from '../core/engine/project-templates.js';
import {
  type UndoRedoHistory,
  canRedo,
  canUndo,
  createStateChangeCommand,
  createUndoRedoHistory,
  executeCommand,
  redoCommand,
  undoCommand,
} from '../core/engine/undo-redo.js';
import type {
  CropEditEntry,
  DialogueEditEntry,
  LinkedAssetEntry,
  ObjectEditEntry,
  ProjectConfigOption,
  ProjectTranslations,
  RetextureEditEntry,
  SdvProjectEdit,
  SdvProjectFile,
  SdvProjectMetadata,
} from '../data/models/index.js';
import {
  CodeInspector,
  ConfigEditor,
  CropWizard,
  DialogueEditor,
  I18nEditor,
  InGamePreview,
  ManifestEditor,
  ObjectCreator,
  OnboardingTutorial,
  PixelEditor,
  ProjectDashboard,
  QuickLaunchPanel,
  RetexturePatcher,
  type TutorialTargetTab,
} from './components/index.js';
import './styles.css';

type EditorTab =
  | 'manifest'
  | 'objects'
  | 'crops'
  | 'retexture'
  | 'dialogue'
  | 'config'
  | 'pixel'
  | 'i18n'
  | 'preview'
  | 'launch';

const RECENT_STORAGE_KEY = 'sdv_mod_creator_recent_projects';
const RECOVERY_STORAGE_KEY = 'sdv_mod_creator_recovery_snapshot';
const ONBOARDING_STORAGE_KEY = 'sdv_mod_creator_onboarding_done';
const THEME_STORAGE_KEY = 'sdv_mod_creator_theme';
const BROWSER_AUTO_RECOVERY_MS = 120_000;

function loadInitialTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function loadInitialOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true';
  } catch {
    return true;
  }
}

function isSdvProjectFile(value: unknown): value is SdvProjectFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'formatVersion' in value &&
    'metadata' in value &&
    'edits' in value
  );
}

function loadRecentProjects(): readonly SdvProjectFile[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSdvProjectFile) : [];
  } catch {
    return [];
  }
}

function saveRecentProjects(projects: readonly SdvProjectFile[]): void {
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(projects.slice(0, 8)));
  } catch {
    // Ignore storage quota errors in preview mode.
  }
}

export function App(): React.JSX.Element {
  const [recentProjects, setRecentProjects] = useState<readonly SdvProjectFile[]>(
    loadRecentProjects,
  );
  const [activeProject, setActiveProject] = useState<SdvProjectFile | null>(null);
  const [history, setHistory] = useState<UndoRedoHistory<SdvProjectFile>>(() =>
    createUndoRedoHistory<SdvProjectFile>(),
  );
  const [activeTab, setActiveTab] = useState<EditorTab>('manifest');
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(loadInitialOnboarding);
  const [theme, setTheme] = useState<'light' | 'dark'>(loadInitialTheme);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors.
    }
  }, [theme]);

  const persistActiveProject = useCallback(
    (project: SdvProjectFile): void => {
      const updated = [
        project,
        ...recentProjects.filter((item) => item.metadata.uniqueId !== project.metadata.uniqueId),
      ];
      setRecentProjects(updated);
      saveRecentProjects(updated);
      setActiveProject(project);
      setImportError(null);
    },
    [recentProjects],
  );

  const openAndRememberProject = (project: SdvProjectFile): void => {
    setHistory(createUndoRedoHistory<SdvProjectFile>());
    persistActiveProject(project);
  };

  const handleDeleteProject = (uniqueId: string): void => {
    const updated = recentProjects.filter((item) => item.metadata.uniqueId !== uniqueId);
    setRecentProjects(updated);
    saveRecentProjects(updated);
    if (activeProject?.metadata.uniqueId === uniqueId) {
      setActiveProject(null);
      setHistory(createUndoRedoHistory<SdvProjectFile>());
    }
  };

  const applyProjectChange = (label: string, nextProject: SdvProjectFile): void => {
    if (activeProject === null) {
      return;
    }
    const result = executeCommand(
      history,
      activeProject,
      createStateChangeCommand(label, activeProject, nextProject),
    );
    setHistory(result.history);
    persistActiveProject(result.state);
  };

  const handleUndo = useCallback((): void => {
    if (activeProject === null) {
      return;
    }
    const result = undoCommand(history, activeProject);
    if (result.changed) {
      setHistory(result.history);
      persistActiveProject(result.state);
    }
  }, [activeProject, history, persistActiveProject]);

  const handleRedo = useCallback((): void => {
    if (activeProject === null) {
      return;
    }
    const result = redoCommand(history, activeProject);
    if (result.changed) {
      setHistory(result.history);
      persistActiveProject(result.state);
    }
  }, [activeProject, history, persistActiveProject]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (activeProject === null || (!event.ctrlKey && !event.metaKey)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return (): void => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeProject, handleRedo, handleUndo]);

  useEffect(() => {
    if (activeProject === null) {
      return;
    }
    const timerId = setInterval(() => {
      try {
        localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(activeProject));
      } catch {
        // Ignore storage quota errors during silent recovery save.
      }
    }, BROWSER_AUTO_RECOVERY_MS);
    return (): void => {
      clearInterval(timerId);
    };
  }, [activeProject]);

  const dismissOnboarding = (): void => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors.
    }
  };

  const handleCreateTemplate = (templateId: ProjectTemplateId): void => {
    const label = `${templateId.charAt(0).toUpperCase()}${templateId.slice(1)}`;
    const project = createProjectFromTemplate(templateId, {
      name: `My ${label} Mod`,
      author: 'Farmer',
      version: '1.0.0',
      description: 'Created with Stardew Valley Mod Creator - by Smane.',
      uniqueId: `Farmer.My${label}Mod`,
    });
    openAndRememberProject(project);
    const nextTab: EditorTab =
      templateId === 'object' ? 'objects' : templateId === 'crop' ? 'crops' : 'manifest';
    setActiveTab(nextTab);
  };

  const handleImportManifest = (manifestJson: string): void => {
    try {
      openAndRememberProject(importManifestJsonToProject(manifestJson));
      setActiveTab('manifest');
    } catch (error: unknown) {
      setImportError(error instanceof Error ? error.message : 'Failed to parse manifest.json.');
    }
  };

  const updateProjectEdits = (nextEdits: readonly SdvProjectEdit[]): void => {
    if (activeProject === null) {
      return;
    }
    applyProjectChange('Update Edits', {
      ...activeProject,
      updatedAt: new Date().toISOString(),
      edits: nextEdits,
    });
  };

  const handleMetadataChange = (metadata: SdvProjectMetadata): void => {
    if (activeProject !== null) {
      applyProjectChange('Update Manifest', {
        ...activeProject,
        updatedAt: new Date().toISOString(),
        metadata,
      });
    }
  };

  const handleConfigChange = (configOptions: readonly ProjectConfigOption[]): void => {
    if (activeProject !== null) {
      applyProjectChange('Update Config', {
        ...activeProject,
        updatedAt: new Date().toISOString(),
        configOptions,
      });
    }
  };

  const handleTranslationsChange = (translations: ProjectTranslations): void => {
    if (activeProject !== null) {
      applyProjectChange('Update Translations', {
        ...activeProject,
        updatedAt: new Date().toISOString(),
        translations,
      });
    }
  };

  const handleAddRetexture = (entry: RetextureEditEntry, newAsset?: LinkedAssetEntry): void => {
    if (activeProject === null) {
      return;
    }
    applyProjectChange('Add Retexture', {
      ...activeProject,
      updatedAt: new Date().toISOString(),
      assets: newAsset !== undefined ? [...activeProject.assets, newAsset] : activeProject.assets,
      edits: [...activeProject.edits, entry],
    });
  };

  const handleStartTutorialMod = (): void => {
    const project = createProjectFromTemplate('object', {
      name: 'Golden Starberry',
      author: 'Smane',
      version: '1.0.0',
      description: 'Adds a Golden Starberry item and Abigail dialogue.',
      uniqueId: 'Smane.GoldenStarberry',
    });
    openAndRememberProject({ ...project, edits: [] });
  };

  const handleAddTutorialObject = (): void => {
    if (activeProject === null) {
      return;
    }
    const itemId = `${activeProject.metadata.uniqueId}_GoldenStarberry`;
    const alreadyExists = activeProject.edits.some(
      (e) => e.kind === 'object' && e.itemId === itemId,
    );
    if (!alreadyExists) {
      updateProjectEdits([
        ...activeProject.edits,
        {
          kind: 'object',
          id: `tut-obj-${String(Date.now())}`,
          itemId,
          displayName: 'Golden Starberry',
          description: 'A sweet, glowing berry grown with Stardew Mod Creator.',
          price: 250,
          edibility: 40,
          category: -79,
        },
      ]);
    }
  };

  const handleAddTutorialDialogue = (): void => {
    if (activeProject === null) {
      return;
    }
    const alreadyExists = activeProject.edits.some(
      (e) => e.kind === 'dialogue' && e.npcName === 'Abigail',
    );
    if (!alreadyExists) {
      updateProjectEdits([
        ...activeProject.edits,
        {
          kind: 'dialogue',
          id: `tut-dlg-${String(Date.now())}`,
          npcName: 'Abigail',
          dialogueKey: 'Mon',
          text: 'Hey @! Have you tasted the Golden Starberry yet?$h',
        },
      ]);
    }
  };

  const handleNavigateTutorialTab = (tab: TutorialTargetTab): void => {
    setActiveTab(tab);
  };

  const objectEdits: readonly ObjectEditEntry[] =
    activeProject?.edits.filter((e): e is ObjectEditEntry => e.kind === 'object') ?? [];
  const cropEdits: readonly CropEditEntry[] =
    activeProject?.edits.filter((e): e is CropEditEntry => e.kind === 'crop') ?? [];
  const retextureEdits: readonly RetextureEditEntry[] =
    activeProject?.edits.filter((e): e is RetextureEditEntry => e.kind === 'retexture') ?? [];
  const dialogueEdits: readonly DialogueEditEntry[] =
    activeProject?.edits.filter((e): e is DialogueEditEntry => e.kind === 'dialogue') ?? [];

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Stardew Valley Mod Creator - by Smane</h1>
          <p className="app-subtitle">Content Patcher Pack Studio (SMAPI 4.0+)</p>
        </div>
        <div className="inline-row">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); }}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          {!showOnboarding && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => { setShowOnboarding(true); }}
            >
              2-Min Tutorial
            </button>
          )}
          {activeProject !== null && (
            <>
              <button
                type="button"
                className="secondary-btn"
                disabled={!canUndo(history)}
                title="Undo (Ctrl+Z)"
                onClick={handleUndo}
              >
                Undo
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={!canRedo(history)}
                title="Redo (Ctrl+Y)"
                onClick={handleRedo}
              >
                Redo
              </button>
              <button
                type="button"
                className={showInspector ? 'season-btn active' : 'secondary-btn'}
                onClick={() => { setShowInspector(!showInspector); }}
              >
                {showInspector ? 'Hide Code Inspector' : 'Live Code Inspector'}
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={() => { handleDeleteProject(activeProject.metadata.uniqueId); }}
              >
                Delete Mod
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => { setActiveProject(null); }}
              >
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </header>

      {showOnboarding && (
        <OnboardingTutorial
          activeProject={activeProject}
          onComplete={dismissOnboarding}
          onStartTutorialMod={handleStartTutorialMod}
          onNavigateTab={handleNavigateTutorialTab}
          onAddTutorialObject={handleAddTutorialObject}
          onAddTutorialDialogue={handleAddTutorialDialogue}
        />
      )}

      {activeProject === null ? (
        <ProjectDashboard
          recentProjects={recentProjects}
          onCreateFromTemplate={handleCreateTemplate}
          onOpenRecent={openAndRememberProject}
          onDeleteRecent={handleDeleteProject}
          onImportManifest={handleImportManifest}
          importError={importError}
        />
      ) : (
        <>
          <nav className="workspace-tabs">
            {(
              [
                'manifest',
                'objects',
                'crops',
                'retexture',
                'dialogue',
                'config',
                'pixel',
                'i18n',
                'preview',
                'launch',
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'tab-btn active' : 'tab-btn'}
                onClick={() => { setActiveTab(tab); }}
              >
                {tab === 'manifest'
                  ? 'Manifest'
                  : tab === 'objects'
                    ? 'Objects'
                    : tab === 'crops'
                      ? 'Crops'
                      : tab === 'retexture'
                        ? 'Retexture'
                        : tab === 'dialogue'
                          ? 'Dialogue'
                          : tab === 'config'
                            ? 'Config (GMCM)'
                            : tab === 'pixel'
                              ? 'Pixel Editor'
                              : tab === 'i18n'
                                ? 'i18n'
                                : tab === 'preview'
                                  ? 'Live Preview'
                                  : 'Test in Game'}
              </button>
            ))}
          </nav>

          <div className={showInspector ? 'workspace-with-inspector' : ''}>
            <div className="workspace-main">
              {activeTab === 'manifest' && (
                <ManifestEditor
                  metadata={activeProject.metadata}
                  onChange={handleMetadataChange}
                />
              )}
              {activeTab === 'objects' && (
                <ObjectCreator
                  uniqueId={activeProject.metadata.uniqueId}
                  objects={objectEdits}
                  onAddObject={(entry) => { updateProjectEdits([...activeProject.edits, entry]); }}
                  onUpdateObject={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveObject={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                />
              )}
              {activeTab === 'crops' && (
                <CropWizard
                  uniqueId={activeProject.metadata.uniqueId}
                  crops={cropEdits}
                  objects={objectEdits}
                  onAddCrop={(entry) => { updateProjectEdits([...activeProject.edits, entry]); }}
                  onUpdateCrop={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveCrop={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                />
              )}
              {activeTab === 'retexture' && (
                <RetexturePatcher
                  retextures={retextureEdits}
                  assets={activeProject.assets}
                  onAddRetexture={handleAddRetexture}
                  onRemoveRetexture={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                />
              )}
              {activeTab === 'dialogue' && (
                <DialogueEditor
                  dialogues={dialogueEdits}
                  onAddDialogue={(entry) => {
                    updateProjectEdits([...activeProject.edits, entry]);
                  }}
                  onUpdateDialogue={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveDialogue={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                />
              )}
              {activeTab === 'config' && (
                <ConfigEditor
                  options={activeProject.configOptions ?? []}
                  onChange={handleConfigChange}
                />
              )}
              {activeTab === 'pixel' && <PixelEditor />}
              {activeTab === 'i18n' && (
                <I18nEditor
                  project={activeProject}
                  onChangeTranslations={handleTranslationsChange}
                />
              )}
              {activeTab === 'preview' && (
                <InGamePreview objects={objectEdits} dialogues={dialogueEdits} />
              )}
              {activeTab === 'launch' && (
                <QuickLaunchPanel
                  modUniqueId={activeProject.metadata.uniqueId}
                  modName={activeProject.metadata.name}
                />
              )}
            </div>
            {showInspector && <CodeInspector project={activeProject} />}
          </div>
        </>
      )}
    </main>
  );
}
