import { useState } from 'react';
import {
  PROJECT_TEMPLATES,
  type ProjectTemplateId,
} from '../../core/engine/project-templates.js';
import type { SdvProjectFile } from '../../data/models/index.js';

export interface ProjectDashboardProps {
  readonly recentProjects: readonly SdvProjectFile[];
  readonly onCreateFromTemplate: (templateId: ProjectTemplateId) => void;
  readonly onOpenRecent: (project: SdvProjectFile) => void;
  readonly onDeleteRecent: (uniqueId: string) => void;
  readonly onImportManifest: (manifestJson: string) => void;
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
  readonly error: string | null;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [manifestText, setManifestText] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    void file.text().then((text) => {
      setManifestText(text);
      props.onImport(text);
    });
  };

  return (
    <section className="dashboard-section">
      <div className="module-toolbar">
        <div>
          <h3>Already have a mod?</h3>
          <span className="muted-text">Optional: open an existing mod&apos;s manifest.json</span>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => { setOpen(!open); }}
        >
          {open ? 'Hide Import' : 'Import Existing Mod'}
        </button>
      </div>
      {open && (
        <>
          <div className="import-controls">
            <label className="file-upload-btn">
              Choose manifest.json File
              <input type="file" accept=".json" onChange={handleFileChange} hidden />
            </label>
            <button
              type="button"
              className="secondary-btn"
              disabled={manifestText.trim().length === 0}
              onClick={() => { props.onImport(manifestText); }}
            >
              Open Pasted Mod
            </button>
          </div>
          <textarea
            className="manifest-paste-box"
            rows={4}
            placeholder="Or paste your manifest.json text here..."
            value={manifestText}
            onChange={(e) => { setManifestText(e.target.value); }}
          />
          {props.error !== null && <p className="field-error">{props.error}</p>}
        </>
      )}
    </section>
  );
}

export function ProjectDashboard(props: ProjectDashboardProps): React.JSX.Element {
  return (
    <div className="dashboard-container">
      <section className="dashboard-section">
        <h3>What do you want to create today?</h3>
        <p className="muted-text">
          Pick one below — no coding needed! We will guide you step by step.
        </p>
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
        <h3>Your Saved Mods</h3>
        {props.recentProjects.length === 0 ? (
          <p className="muted-text">You haven&apos;t created any mods yet. Pick a card above!</p>
        ) : (
          <ul className="recent-list">
            {props.recentProjects.map((proj) => (
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

      <ImportModSection onImport={props.onImportManifest} error={props.importError} />
    </div>
  );
}
