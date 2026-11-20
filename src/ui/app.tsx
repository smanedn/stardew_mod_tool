import { useState } from 'react';
import {
  type ProjectTemplateId,
  createProjectFromTemplate,
  importManifestJsonToProject,
} from '../core/engine/project-templates.js';
import type {
  CropEditEntry,
  DialogueEditEntry,
  LinkedAssetEntry,
  ObjectEditEntry,
  ProjectConfigOption,
  RetextureEditEntry,
  SdvProjectEdit,
  SdvProjectFile,
  SdvProjectMetadata,
} from '../data/models/index.js';
import {
  ConfigEditor,
  CropWizard,
  DialogueEditor,
  ManifestEditor,
  ObjectCreator,
  PixelEditor,
  ProjectDashboard,
  RetexturePatcher,
} from './components/index.js';
import './styles.css';

type EditorTab = 'manifest' | 'objects' | 'crops' | 'retexture' | 'dialogue' | 'config' | 'pixel';

const RECENT_STORAGE_KEY = 'sdv_mod_creator_recent_projects';

function loadRecentProjects(): readonly SdvProjectFile[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as readonly SdvProjectFile[]) : [];
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
  const [recentProjects, setRecentProjects] = useState<readonly SdvProjectFile[]>(loadRecentProjects);
  const [activeProject, setActiveProject] = useState<SdvProjectFile | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('manifest');
  const [importError, setImportError] = useState<string | null>(null);

  const openAndRememberProject = (project: SdvProjectFile): void => {
    const updated = [
      project,
      ...recentProjects.filter((item) => item.metadata.uniqueId !== project.metadata.uniqueId),
    ];
    setRecentProjects(updated);
    saveRecentProjects(updated);
    setActiveProject(project);
    setImportError(null);
  };

  const handleCreateTemplate = (templateId: ProjectTemplateId): void => {
    const label = `${templateId.charAt(0).toUpperCase()}${templateId.slice(1)}`;
    const project = createProjectFromTemplate(templateId, {
      name: `My ${label} Mod`,
      author: 'Farmer',
      version: '1.0.0',
      description: 'Created with Stardew Valley Easy Mod Creator.',
      uniqueId: `Farmer.My${label}Mod`,
    });
    openAndRememberProject(project);
    setActiveTab(templateId === 'object' ? 'objects' : templateId === 'crop' ? 'crops' : 'manifest');
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
    openAndRememberProject({
      ...activeProject,
      updatedAt: new Date().toISOString(),
      edits: nextEdits,
    });
  };

  const handleMetadataChange = (metadata: SdvProjectMetadata): void => {
    if (activeProject !== null) {
      openAndRememberProject({ ...activeProject, updatedAt: new Date().toISOString(), metadata });
    }
  };

  const objectEdits: readonly ObjectEditEntry[] =
    activeProject?.edits.filter((e): e is ObjectEditEntry => e.kind === 'object') ?? [];
  const cropEdits: readonly CropEditEntry[] =
    activeProject?.edits.filter((e): e is CropEditEntry => e.kind === 'crop') ?? [];
  const retextureEdits: readonly RetextureEditEntry[] =
    activeProject?.edits.filter((e): e is RetextureEditEntry => e.kind === 'retexture') ?? [];
  const dialogueEdits: readonly DialogueEditEntry[] =
    activeProject?.edits.filter((e): e is DialogueEditEntry => e.kind === 'dialogue') ?? [];

  const handleConfigChange = (configOptions: readonly ProjectConfigOption[]): void => {
    if (activeProject !== null) {
      openAndRememberProject({
        ...activeProject,
        updatedAt: new Date().toISOString(),
        configOptions,
      });
    }
  };

  const handleAddRetexture = (entry: RetextureEditEntry, newAsset?: LinkedAssetEntry): void => {
    if (activeProject === null) {
      return;
    }
    openAndRememberProject({
      ...activeProject,
      updatedAt: new Date().toISOString(),
      assets: newAsset !== undefined ? [...activeProject.assets, newAsset] : activeProject.assets,
      edits: [...activeProject.edits, entry],
    });
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>Stardew Valley Easy Mod Creator</h1>
          <p className="app-subtitle">Content Patcher Pack Studio (SMAPI 4.0+)</p>
        </div>
        {activeProject !== null && (
          <button
            type="button"
            className="secondary-btn"
            onClick={() => { setActiveProject(null); }}
          >
            Back to Dashboard
          </button>
        )}
      </header>

      {activeProject === null ? (
        <ProjectDashboard
          recentProjects={recentProjects}
          onCreateFromTemplate={handleCreateTemplate}
          onOpenRecent={openAndRememberProject}
          onImportManifest={handleImportManifest}
          importError={importError}
        />
      ) : (
        <>
          <nav className="workspace-tabs">
            {(
              ['manifest', 'objects', 'crops', 'retexture', 'dialogue', 'config', 'pixel'] as const
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
                            : 'Pixel Editor'}
              </button>
            ))}
          </nav>

          {activeTab === 'manifest' && (
            <ManifestEditor metadata={activeProject.metadata} onChange={handleMetadataChange} />
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
              onAddDialogue={(entry) => { updateProjectEdits([...activeProject.edits, entry]); }}
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
        </>
      )}
    </main>
  );
}
