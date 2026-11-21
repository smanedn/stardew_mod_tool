import { useCallback, useEffect, useState } from 'react';
import {
  type ModImportResult,
  importContentPatcherMod,
  importModFromZipBytes,
} from '../core/engine/mod-importer.js';
import { computeModReadiness } from '../core/engine/mod-readiness.js';
import {
  isTauriDesktopRuntime,
  launchSmapiViaTauri,
} from '../core/engine/tauri-bridge.js';
import {
  type ProjectTemplateId,
  createProjectFromTemplate,
  importManifestJsonToProject,
} from '../core/engine/project-templates.js';
import { parseProjectJson } from '../core/parsers/project-schema.js';
import type {
  AnimalEditEntry,
  CropEditEntry,
  DialogueEditEntry,
  EventEditEntry,
  FishEditEntry,
  FurnitureEditEntry,
  GiftTasteEditEntry,
  LinkedAssetEntry,
  MailEditEntry,
  ObjectEditEntry,
  ProjectConfigOption,
  ProjectTranslations,
  RetextureEditEntry,
  SdvProjectEdit,
  SdvProjectMetadata,
  ShopEditEntry,
  WeaponEditEntry,
} from '../data/models/index.js';
import {
  AnimalWeaponEditor,
  CodeInspector,
  ConfigEditor,
  CropWizard,
  DialogueEditor,
  ErrorBoundary,
  EventBuilder,
  FishEditor,
  FurnitureEditor,
  GiftTastesEditor,
  I18nEditor,
  InGamePreview,
  ManifestEditor,
  ObjectCreator,
  OnboardingTutorial,
  PixelEditor,
  ProjectDashboard,
  QuickLaunchPanel,
  RetexturePatcher,
  ShopMailEditor,
  type TutorialTargetTab,
} from './components/index.js';
import './styles.css';
import { useProjectWorkspace } from './hooks/use-project-workspace.js';
import { useToast } from './hooks/use-toast.js';
import { playCozyChime } from './utils/cozy-sound.js';

type EditorTab =
  | 'manifest'
  | 'objects'
  | 'crops'
  | 'retexture'
  | 'dialogue'
  | 'gifts'
  | 'shops'
  | 'events'
  | 'animals'
  | 'furniture'
  | 'fish'
  | 'config'
  | 'pixel'
  | 'i18n'
  | 'preview'
  | 'launch';

const RECOVERY_STORAGE_KEY = 'sdv_mod_creator_recovery_snapshot';
const ONBOARDING_STORAGE_KEY = 'sdv_mod_creator_onboarding_done';
const THEME_STORAGE_KEY = 'sdv_mod_creator_theme';
const SEASON_STORAGE_KEY = 'sdv_mod_creator_season';
const BROWSER_AUTO_RECOVERY_MS = 120_000;

type ValleySeason = 'spring' | 'summer' | 'fall' | 'winter';

function loadInitialSeason(): ValleySeason {
  try {
    const val = localStorage.getItem(SEASON_STORAGE_KEY);
    if (val === 'summer' || val === 'fall' || val === 'winter') {
      return val;
    }
    return 'spring';
  } catch {
    return 'spring';
  }
}

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

export function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<EditorTab>('manifest');
  const [advancedMode, setAdvancedMode] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(loadInitialOnboarding);
  const [theme, setTheme] = useState<'light' | 'dark'>(loadInitialTheme);
  const [season, setSeason] = useState<ValleySeason>(loadInitialSeason);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [importError, setImportError] = useState<string | null>(null);
  const { toastMessage, showToast } = useToast(soundEnabled);
  const clearImportError = useCallback((): void => {
    setImportError(null);
  }, []);
  const {
    recentProjects,
    activeProject,
    undoAvailable,
    redoAvailable,
    setActiveProject,
    openAndRememberProject,
    applyProjectChange,
    deleteProject: handleDeleteProject,
    handleUndo,
    handleRedo,
  } = useProjectWorkspace(showToast, clearImportError);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-season', season);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(SEASON_STORAGE_KEY, season);
    } catch {
      // Ignore storage errors.
    }
  }, [theme, season]);

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

  const applyImportedModResult = (result: ModImportResult): void => {
    const { project, summary } = result;
    openAndRememberProject(project);
    if (summary.itemsCount > 0) {
      setActiveTab('objects');
    } else if (summary.cropsCount > 0) {
      setActiveTab('crops');
    } else if (summary.dialoguesCount > 0) {
      setActiveTab('dialogue');
    } else {
      setActiveTab('manifest');
    }
    showToast(
      `Imported "${project.metadata.name}": ${String(summary.itemsCount)} items, ` +
        `${String(summary.cropsCount)} crops, ${String(summary.dialoguesCount)} dialogues`,
    );
  };

  const handleImportManifest = (manifestJson: string): void => {
    try {
      openAndRememberProject(importManifestJsonToProject(manifestJson));
      setActiveTab('manifest');
      showToast('Imported manifest.json!');
    } catch (error: unknown) {
      setImportError(error instanceof Error ? error.message : 'Failed to parse manifest.json.');
    }
  };

  const handleImportModFiles = (manifestJson: string, contentJson: string): void => {
    try {
      applyImportedModResult(importContentPatcherMod({ manifestJson, contentJson }));
    } catch (error: unknown) {
      setImportError(error instanceof Error ? error.message : 'Failed to import mod files.');
    }
  };

  const handleImportZip = (zipBytes: Uint8Array): void => {
    void importModFromZipBytes(zipBytes)
      .then((result) => {
        applyImportedModResult(result);
      })
      .catch((error: unknown) => {
        setImportError(error instanceof Error ? error.message : 'Failed to import .zip mod.');
      });
  };

  const handleImportProjectBackup = (projectJson: string): void => {
    try {
      const restored = parseProjectJson(projectJson);
      openAndRememberProject(restored);
      setActiveTab('manifest');
      showToast(`Restored "${restored.metadata.name}"!`);
    } catch (error: unknown) {
      setImportError(error instanceof Error ? error.message : 'Invalid .sdvproj.json backup.');
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

  const handleLoadSampleMod = (): void => {
    const base = createProjectFromTemplate('object', {
      name: 'Starberry Deluxe',
      author: 'Smane',
      version: '0.4.0',
      description: 'Adds Starberry fruit, seeds, Abigail dialogue, shop listing, and gift tastes.',
      uniqueId: 'Smane.StarberryDeluxe',
    });
    const itemId = 'Smane.StarberryDeluxe_Starberry';
    openAndRememberProject({
      ...base,
      edits: [
        {
          kind: 'object',
          id: 'sample-obj',
          itemId,
          displayName: 'Starberry',
          description: 'A glowing berry infused with valley starlight.',
          price: 280,
          edibility: 45,
          category: -79,
          buff: { speed: 1, luck: 2, durationSeconds: 180 },
        },
        {
          kind: 'crop',
          id: 'sample-crop',
          seedItemId: 'Smane.StarberryDeluxe_Seeds',
          harvestItemId: itemId,
          seasons: ['Spring', 'Summer'],
          daysInPhase: [1, 2, 2, 3],
        },
        {
          kind: 'dialogue',
          id: 'sample-dlg',
          npcName: 'Abigail',
          dialogueKey: 'Mon',
          text: 'Hey @! Have you grown any Starberries this season?$h',
        },
        {
          kind: 'giftTaste',
          id: 'sample-gift',
          npcName: 'Abigail',
          taste: 'Love',
          itemId,
        },
        {
          kind: 'shop',
          id: 'sample-shop',
          shopId: 'SeedShop',
          itemId,
          price: 350,
        },
      ],
    });
    setActiveTab('preview');
  };

  const readiness = activeProject !== null ? computeModReadiness(activeProject) : null;

  const objectEdits: readonly ObjectEditEntry[] =
    activeProject?.edits.filter((e): e is ObjectEditEntry => e.kind === 'object') ?? [];
  const cropEdits: readonly CropEditEntry[] =
    activeProject?.edits.filter((e): e is CropEditEntry => e.kind === 'crop') ?? [];
  const retextureEdits: readonly RetextureEditEntry[] =
    activeProject?.edits.filter((e): e is RetextureEditEntry => e.kind === 'retexture') ?? [];
  const dialogueEdits: readonly DialogueEditEntry[] =
    activeProject?.edits.filter((e): e is DialogueEditEntry => e.kind === 'dialogue') ?? [];
  const giftTasteEdits: readonly GiftTasteEditEntry[] =
    activeProject?.edits.filter((e): e is GiftTasteEditEntry => e.kind === 'giftTaste') ?? [];
  const shopEdits: readonly ShopEditEntry[] =
    activeProject?.edits.filter((e): e is ShopEditEntry => e.kind === 'shop') ?? [];
  const mailEdits: readonly MailEditEntry[] =
    activeProject?.edits.filter((e): e is MailEditEntry => e.kind === 'mail') ?? [];
  const eventEdits: readonly EventEditEntry[] =
    activeProject?.edits.filter((e): e is EventEditEntry => e.kind === 'event') ?? [];
  const animalEdits: readonly AnimalEditEntry[] =
    activeProject?.edits.filter((e): e is AnimalEditEntry => e.kind === 'animal') ?? [];
  const weaponEdits: readonly WeaponEditEntry[] =
    activeProject?.edits.filter((e): e is WeaponEditEntry => e.kind === 'weapon') ?? [];
  const furnitureEdits: readonly FurnitureEditEntry[] =
    activeProject?.edits.filter((e): e is FurnitureEditEntry => e.kind === 'furniture') ?? [];
  const fishEdits: readonly FishEditEntry[] =
    activeProject?.edits.filter((e): e is FishEditEntry => e.kind === 'fish') ?? [];

  const handleSavePixelSprite = (newAsset: LinkedAssetEntry): void => {
    if (activeProject === null) {
      return;
    }
    applyProjectChange('Save Pixel Sprite', {
      ...activeProject,
      updatedAt: new Date().toISOString(),
      assets: [...activeProject.assets, newAsset],
    });
  };

  return (
    <ErrorBoundary>
      <main className="app-shell">
      <header className="app-header hero-banner">
        <div className="hero-brand">
          <img src="/logo.png" alt="SVMC Logo" className="hero-logo" />
          <div>
            <h1>Stardew Valley Mod Creator - by Smane</h1>
            <p className="app-subtitle">Cozy Content Patcher Studio • v0.8.0</p>
          </div>
        </div>
        <div className="inline-row">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => { setSoundEnabled(!soundEnabled); }}
          >
            {soundEnabled ? '🔊 Sound' : '🔇 Muted'}
          </button>
          <select
            className="season-select"
            aria-label="Valley Season Theme"
            value={season}
            onChange={(e) => {
              const v = e.target.value;
              setSeason(v === 'summer' || v === 'fall' || v === 'winter' ? v : 'spring');
            }}
          >
            <option value="spring">🌸 Spring</option>
            <option value="summer">☀️ Summer</option>
            <option value="fall">🍂 Fall</option>
            <option value="winter">❄️ Winter</option>
          </select>
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
                className={advancedMode ? 'season-btn active' : 'secondary-btn'}
                onClick={() => { setAdvancedMode(!advancedMode); }}
              >
                {advancedMode ? 'Simple Mode' : 'Advanced Mode'}
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={!undoAvailable}
                title="Undo (Ctrl+Z)"
                onClick={handleUndo}
              >
                Undo
              </button>
              <button
                type="button"
                className="secondary-btn"
                disabled={!redoAvailable}
                title="Redo (Ctrl+Y)"
                onClick={handleRedo}
              >
                Redo
              </button>
              {advancedMode && (
                <button
                  type="button"
                  className={showInspector ? 'season-btn active' : 'secondary-btn'}
                  onClick={() => { setShowInspector(!showInspector); }}
                >
                  {showInspector ? 'Hide Code Inspector' : 'Live Code Inspector'}
                </button>
              )}
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
                My Mods
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
          onLoadSampleMod={handleLoadSampleMod}
          onOpenRecent={openAndRememberProject}
          onDeleteRecent={handleDeleteProject}
          onImportManifest={handleImportManifest}
          onImportModFiles={handleImportModFiles}
          onImportZip={handleImportZip}
          onImportProjectBackup={handleImportProjectBackup}
          importError={importError}
        />
      ) : (
        <>
          {readiness !== null && (
            <div className="readiness-bar-card">
              <div className="module-toolbar">
                <strong>
                  Mod Readiness: {String(readiness.scorePercent)}% — {readiness.summaryLabel}
                </strong>
                <span className="muted-text">{activeProject.metadata.name}</span>
              </div>
              <div className="tutorial-progress-track">
                <div
                  className="tutorial-progress-fill"
                  style={{ width: `${String(readiness.scorePercent)}%` }}
                />
              </div>
            </div>
          )}
          <nav className="workspace-tabs">
            {(advancedMode
              ? ([
                  'manifest',
                  'objects',
                  'crops',
                  'dialogue',
                  'gifts',
                  'shops',
                  'events',
                  'animals',
                  'furniture',
                  'fish',
                  'retexture',
                  'pixel',
                  'preview',
                  'config',
                  'i18n',
                  'launch',
                ] as const)
              : ([
                  'manifest',
                  'objects',
                  'crops',
                  'dialogue',
                  'gifts',
                  'shops',
                  'events',
                  'animals',
                  'furniture',
                  'fish',
                  'retexture',
                  'pixel',
                  'preview',
                ] as const)
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'tab-btn active' : 'tab-btn'}
                onClick={() => {
                  setActiveTab(tab);
                  playCozyChime(soundEnabled, 'pop');
                }}
              >
                {tab === 'manifest'
                  ? '1. Mod Info'
                  : tab === 'objects'
                    ? '2. New Items'
                    : tab === 'crops'
                      ? '3. Crops'
                      : tab === 'dialogue'
                        ? '4. Villager Chat'
                        : tab === 'gifts'
                          ? '5. Gift Tastes'
                          : tab === 'shops'
                            ? '6. Shops & Mail'
                            : tab === 'events'
                              ? '7. Cutscenes'
                              : tab === 'animals'
                                ? '8. Animals & Weapons'
                                : tab === 'furniture'
                                  ? '9. Furniture'
                                  : tab === 'fish'
                                    ? '10. Fish'
                                    : tab === 'retexture'
                                      ? '11. Sprites'
                                      : tab === 'pixel'
                                        ? '12. Draw Sprite'
                                        : tab === 'preview'
                                          ? '13. Preview & Export'
                                          : tab === 'config'
                                            ? 'Config (GMCM)'
                                            : tab === 'i18n'
                                              ? 'Translations'
                                              : 'Test in Game'}
              </button>
            ))}
          </nav>

          <div className={advancedMode && showInspector ? 'workspace-with-inspector' : ''}>
            <div key={activeTab} className="workspace-main tab-panel-animate">
              {activeTab === 'manifest' && (
                <ManifestEditor
                  metadata={activeProject.metadata}
                  showAdvanced={advancedMode}
                  onChange={handleMetadataChange}
                />
              )}
              {activeTab === 'objects' && (
                <ObjectCreator
                  uniqueId={activeProject.metadata.uniqueId}
                  objects={objectEdits}
                  assets={activeProject.assets}
                  showAdvanced={advancedMode}
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
                  showAdvanced={advancedMode}
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
              {activeTab === 'gifts' && (
                <GiftTastesEditor
                  uniqueId={activeProject.metadata.uniqueId}
                  giftTastes={giftTasteEdits}
                  objects={objectEdits}
                  onAddGiftTaste={(entry) => {
                    updateProjectEdits([...activeProject.edits, entry]);
                  }}
                  onUpdateGiftTaste={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveGiftTaste={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                />
              )}
              {activeTab === 'shops' && (
                <ShopMailEditor
                  uniqueId={activeProject.metadata.uniqueId}
                  shops={shopEdits}
                  mails={mailEdits}
                  objects={objectEdits}
                  onAddShop={(entry) => { updateProjectEdits([...activeProject.edits, entry]); }}
                  onUpdateShop={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveShop={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                  onAddMail={(entry) => { updateProjectEdits([...activeProject.edits, entry]); }}
                  onUpdateMail={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveMail={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                />
              )}
              {activeTab === 'events' && (
                <EventBuilder
                  uniqueId={activeProject.metadata.uniqueId}
                  events={eventEdits}
                  onAddEvent={(entry) => { updateProjectEdits([...activeProject.edits, entry]); }}
                  onUpdateEvent={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveEvent={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                />
              )}
              {activeTab === 'animals' && (
                <AnimalWeaponEditor
                  uniqueId={activeProject.metadata.uniqueId}
                  animals={animalEdits}
                  weapons={weaponEdits}
                  objects={objectEdits}
                  onAddAnimal={(entry) => { updateProjectEdits([...activeProject.edits, entry]); }}
                  onUpdateAnimal={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveAnimal={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                  onAddWeapon={(entry) => { updateProjectEdits([...activeProject.edits, entry]); }}
                  onUpdateWeapon={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveWeapon={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                />
              )}
              {activeTab === 'furniture' && (
                <FurnitureEditor
                  uniqueId={activeProject.metadata.uniqueId}
                  furniture={furnitureEdits}
                  assets={activeProject.assets}
                  onAddFurniture={(entry) => {
                    updateProjectEdits([...activeProject.edits, entry]);
                  }}
                  onUpdateFurniture={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveFurniture={(id) => {
                    updateProjectEdits(activeProject.edits.filter((item) => item.id !== id));
                  }}
                />
              )}
              {activeTab === 'fish' && (
                <FishEditor
                  uniqueId={activeProject.metadata.uniqueId}
                  fishList={fishEdits}
                  onAddFish={(entry) => { updateProjectEdits([...activeProject.edits, entry]); }}
                  onUpdateFish={(entry) => {
                    updateProjectEdits(
                      activeProject.edits.map((item) => (item.id === entry.id ? entry : item)),
                    );
                  }}
                  onRemoveFish={(id) => {
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
              {activeTab === 'pixel' && <PixelEditor onSaveSpriteToMod={handleSavePixelSprite} />}
              {activeTab === 'i18n' && (
                <I18nEditor
                  project={activeProject}
                  onChangeTranslations={handleTranslationsChange}
                />
              )}
              {activeTab === 'preview' && (
                <InGamePreview
                  project={activeProject}
                  objects={objectEdits}
                  dialogues={dialogueEdits}
                  onNotifyToast={(msg) => { showToast(msg, 'success'); }}
                />
              )}
              {activeTab === 'launch' && (
                <QuickLaunchPanel
                  project={activeProject}
                  onLaunchSmapi={
                    isTauriDesktopRuntime()
                      ? (onLog) =>
                          launchSmapiViaTauri(
                            activeProject.metadata.uniqueId,
                            activeProject.metadata.name,
                            onLog,
                          )
                      : undefined
                  }
                />
              )}
            </div>
            {advancedMode && showInspector && <CodeInspector project={activeProject} />}
          </div>
        </>
      )}
      {toastMessage !== null && <div className="toast-banner">{toastMessage}</div>}
    </main>
    </ErrorBoundary>
  );
}
