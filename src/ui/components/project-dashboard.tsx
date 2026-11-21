import { useState } from 'react';
import {
  PROJECT_TEMPLATES,
  type ProjectTemplateId,
} from '../../core/engine/project-templates.js';
import type { SdvProjectFile } from '../../data/models/index.js';

export interface ProjectDashboardProps {
  readonly recentProjects: readonly SdvProjectFile[];
  readonly onCreateFromTemplate: (templateId: ProjectTemplateId) => void;
  readonly onLoadSampleMod: () => void;
  readonly onOpenRecent: (project: SdvProjectFile) => void;
  readonly onDeleteRecent: (uniqueId: string) => void;
  readonly onImportManifest: (manifestJson: string) => void;
  readonly onImportModFiles: (manifestJson: string, contentJson: string) => void;
  readonly onImportZip: (zipBytes: Uint8Array) => void;
  readonly onImportProjectBackup: (projectJson: string) => void;
  readonly importError: string | null;
}

const FRIENDLY_ICONS: Readonly<Record<ProjectTemplateId, string>> = {
  object: '🍎',
  crop: '🌾',
  retexture: '🎨',
  dialogue: '💬',
};

const FRIENDLY_TITLES: Readonly<Record<ProjectTemplateId, string>> = {
  object: 'Add a New Item',
  crop: 'Add a New Crop',
  retexture: 'Repaint a Sprite',
  dialogue: 'Change Villager Chat',
};

function ImportModSection(props: {
  readonly onImport: (json: string) => void;
  readonly onImportModFiles: (manifestJson: string, contentJson: string) => void;
  readonly onImportZip: (zipBytes: Uint8Array) => void;
  readonly onImportBackup: (json: string) => void;
  readonly error: string | null;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [manifestText, setManifestText] = useState('');
  const [contentText, setContentText] = useState('');

  const handleZipChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    void file.arrayBuffer().then((buffer) => {
      props.onImportZip(new Uint8Array(buffer));
    });
  };

  const handleModFilesChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const fileList = event.target.files;
    if (fileList === null || fileList.length === 0) {
      return;
    }
    const files = Array.from(fileList);
    const loadText = async (file: File): Promise<{ name: string; text: string }> => ({
      name: file.name.toLowerCase(),
      text: await file.text(),
    });
    void Promise.all(files.map(loadText)).then((loaded) => {
        const manifestFile = loaded.find((f) => f.name === 'manifest.json');
        const contentFile = loaded.find((f) => f.name === 'content.json');
        const nextManifest = manifestFile?.text ?? manifestText;
        const nextContent = contentFile?.text ?? contentText;
        if (manifestFile !== undefined) {
          setManifestText(manifestFile.text);
        }
        if (contentFile !== undefined) {
          setContentText(contentFile.text);
        }
        if (nextManifest.trim().length > 0 && nextContent.trim().length > 0) {
          props.onImportModFiles(nextManifest, nextContent);
        } else if (manifestFile !== undefined) {
          props.onImport(manifestFile.text);
        }
      },
    );
  };

  const handleBackupChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    void file.text().then((text) => {
      props.onImportBackup(text);
    });
  };

  return (
    <section className="dashboard-section">
      <div className="module-toolbar">
        <div>
          <h3>Already have a mod or backup?</h3>
          <span className="muted-text">
            Import a .zip Content Patcher mod, manifest.json + content.json, or .sdvproj.json backup
          </span>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => { setOpen(!open); }}
        >
          {open ? 'Hide Import' : 'Import / Restore'}
        </button>
      </div>
      {open && (
        <>
          <div className="import-controls">
            <label className="launch-btn">
              Import Mod (.zip)
              <input type="file" accept=".zip" onChange={handleZipChange} hidden />
            </label>
            <label className="file-upload-btn">
              Choose manifest.json / content.json
              <input type="file" accept=".json" multiple onChange={handleModFilesChange} hidden />
            </label>
            <label className="secondary-btn">
              Restore .sdvproj.json
              <input type="file" accept=".json,.sdvproj" onChange={handleBackupChange} hidden />
            </label>
            <button
              type="button"
              className="secondary-btn"
              disabled={manifestText.trim().length === 0}
              onClick={() => {
                if (contentText.trim().length > 0) {
                  props.onImportModFiles(manifestText, contentText);
                } else {
                  props.onImport(manifestText);
                }
              }}
            >
              Open Pasted Mod
            </button>
          </div>
          <textarea
            className="manifest-paste-box"
            rows={4}
            placeholder="Paste manifest.json text here..."
            value={manifestText}
            onChange={(e) => { setManifestText(e.target.value); }}
          />
          <textarea
            className="manifest-paste-box"
            rows={4}
            placeholder="Optional: paste content.json text here to load items, crops & dialogues..."
            value={contentText}
            onChange={(e) => { setContentText(e.target.value); }}
          />
          {props.error !== null && <p className="field-error">{props.error}</p>}
        </>
      )}
    </section>
  );
}

export function ProjectDashboard(props: ProjectDashboardProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const filteredProjects = props.recentProjects.filter((proj) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      q.length === 0 ||
      proj.metadata.name.toLowerCase().includes(q) ||
      proj.metadata.author.toLowerCase().includes(q)
    );
  });

  return (
    <div className="dashboard-container">
      <section className="dashboard-section">
        <div className="module-toolbar">
          <div>
            <h3>What do you want to create today?</h3>
            <p className="muted-text">
              Pick one below — no coding needed! We will guide you step by step.
            </p>
          </div>
          <button type="button" className="launch-btn" onClick={props.onLoadSampleMod}>
            ✨ Try Full Sample Mod
          </button>
        </div>
        <div className="template-grid">
          {PROJECT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="template-card"
              onClick={() => { props.onCreateFromTemplate(tpl.id); }}
            >
              <span className="template-badge">
                {FRIENDLY_ICONS[tpl.id]} {tpl.badge}
              </span>
              <strong>{FRIENDLY_TITLES[tpl.id]}</strong>
              <span className="template-desc">{tpl.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="module-toolbar">
          <h3>Your Saved Mods ({String(props.recentProjects.length)})</h3>
          {props.recentProjects.length > 0 && (
            <input
              type="search"
              className="search-input"
              placeholder="Search saved mods..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
            />
          )}
        </div>
        {filteredProjects.length === 0 ? (
          <p className="muted-text">
            {props.recentProjects.length === 0
              ? "You haven't created any mods yet. Pick a card above!"
              : 'No saved mods match your search.'}
          </p>
        ) : (
          <ul className="recent-list">
            {filteredProjects.map((proj) => (
              <li key={proj.metadata.uniqueId} className="recent-item">
                <div>
                  <strong>{proj.metadata.name}</strong>{' '}
                  <span className="muted-text">v{proj.metadata.version}</span>
                  <div className="muted-text">By {proj.metadata.author}</div>
                </div>
                <div className="inline-row">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => { props.onOpenRecent(proj); }}
                  >
                    Edit Mod
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => { props.onDeleteRecent(proj.metadata.uniqueId); }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ImportModSection
        onImport={props.onImportManifest}
        onImportModFiles={props.onImportModFiles}
        onImportZip={props.onImportZip}
        onImportBackup={props.onImportProjectBackup}
        error={props.importError}
      />
    </div>
  );
}
