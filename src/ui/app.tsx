import { useState } from 'react';
import {
  type ProjectTemplateId,
  createProjectFromTemplate,
  importManifestJsonToProject,
} from '../core/engine/project-templates.js';
import type {
  CropEditEntry,
  ObjectEditEntry,
  SdvProjectEdit,
  SdvProjectFile,
  SdvProjectMetadata,
} from '../data/models/index.js';
import {
  CropWizard,
  ManifestEditor,
  ObjectCreator,
  ProjectDashboard,
} from './components/index.js';
import './styles.css';

type EditorTab = 'manifest' | 'objects' | 'crops';

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
            {(['manifest', 'objects', 'crops'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'tab-btn active' : 'tab-btn'}
                onClick={() => { setActiveTab(tab); }}
              >
                {tab === 'manifest'
                  ? 'Manifest & Config'
                  : tab === 'objects'
                    ? 'Custom Objects'
                    : 'Crops & Seeds'}
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
        </>
      )}
    </main>
  );
}
