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
  readonly onImportManifest: (manifestJson: string) => void;
  readonly importError: string | null;
}

function ImportModSection(props: {
  readonly onImport: (json: string) => void;
  readonly error: string | null;
}): React.JSX.Element {
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
      <h3>Import Existing Content Patcher Mod</h3>
      <div className="import-controls">
        <label className="file-upload-btn">
          Choose manifest.json
          <input type="file" accept=".json" onChange={handleFileChange} hidden />
        </label>
        <button
          type="button"
          className="secondary-btn"
          disabled={manifestText.trim().length === 0}
          onClick={() => {
            props.onImport(manifestText);
          }}
        >
          Import Pasted JSON
        </button>
      </div>
      <textarea
        className="manifest-paste-box"
        rows={4}
        placeholder="Or paste an existing manifest.json here..."
        value={manifestText}
        onChange={(e) => {
          setManifestText(e.target.value);
        }}
      />
      {props.error !== null && <p className="field-error">{props.error}</p>}
    </section>
  );
}

export function ProjectDashboard(props: ProjectDashboardProps): React.JSX.Element {
  return (
    <div className="dashboard-container">
      <section className="dashboard-section">
        <h3>Create New Mod from Template</h3>
        <div className="template-grid">
          {PROJECT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="template-card"
              onClick={() => {
                props.onCreateFromTemplate(tpl.id);
              }}
            >
              <span className="template-badge">{tpl.badge}</span>
              <strong>{tpl.title}</strong>
              <span className="template-desc">{tpl.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <h3>Recent Projects</h3>
        {props.recentProjects.length === 0 ? (
          <p className="muted-text">No recent projects yet. Pick a template above to start.</p>
        ) : (
          <ul className="recent-list">
            {props.recentProjects.map((proj) => (
              <li key={proj.metadata.uniqueId} className="recent-item">
                <div>
                  <strong>{proj.metadata.name}</strong>{' '}
                  <span className="muted-text">v{proj.metadata.version}</span>
                  <div className="muted-text">{proj.metadata.uniqueId}</div>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    props.onOpenRecent(proj);
                  }}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ImportModSection onImport={props.onImportManifest} error={props.importError} />
    </div>
  );
}
