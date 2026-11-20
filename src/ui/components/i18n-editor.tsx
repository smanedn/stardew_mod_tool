import { useState } from 'react';
import {
  SUPPORTED_LOCALE_PRESETS,
  buildLocaleFileMap,
  extractDefaultTranslations,
} from '../../core/engine/i18n-generator.js';
import type { ProjectTranslations, SdvProjectFile } from '../../data/models/index.js';

export interface I18nEditorProps {
  readonly project: SdvProjectFile;
  readonly onChangeTranslations: (next: ProjectTranslations) => void;
}

export function I18nEditor({ project, onChangeTranslations }: I18nEditorProps): React.JSX.Element {
  const [selectedPreset, setSelectedPreset] = useState<string>('it');
  const [previewFile, setPreviewFile] = useState<string>('i18n/default.json');

  const defaultEntries = extractDefaultTranslations(project);
  const translations = project.translations ?? {};
  const addedLocales = Object.keys(translations);
  const keys = Object.keys(defaultEntries);
  const localeFiles = buildLocaleFileMap(project);

  const handleAddLocale = (): void => {
    const code = selectedPreset.trim().toLowerCase();
    if (code.length === 0 || code === 'default' || translations[code] !== undefined) {
      return;
    }
    onChangeTranslations({ ...translations, [code]: {} });
    setPreviewFile(`i18n/${code}.json`);
  };

  const handleRemoveLocale = (code: string): void => {
    const next = Object.fromEntries(
      Object.entries(translations).filter(([localeKey]) => localeKey !== code),
    );
    onChangeTranslations(next);
    if (previewFile === `i18n/${code}.json`) {
      setPreviewFile('i18n/default.json');
    }
  };

  const handleCellChange = (localeCode: string, key: string, value: string): void => {
    const currentLocale = translations[localeCode] ?? {};
    onChangeTranslations({
      ...translations,
      [localeCode]: { ...currentLocale, [key]: value },
    });
  };

  return (
    <div className="editor-split">
      <div className="module-container">
        <div className="module-card">
          <div className="module-toolbar">
            <h3>Localization Table (i18n)</h3>
            <div className="inline-row">
              <select
                value={selectedPreset}
                onChange={(e) => { setSelectedPreset(e.target.value); }}
              >
                {SUPPORTED_LOCALE_PRESETS.map((preset) => (
                  <option key={preset.code} value={preset.code}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <button type="button" className="secondary-btn" onClick={handleAddLocale}>
                + Add Language
              </button>
            </div>
          </div>

          {addedLocales.length > 0 && (
            <div className="token-toolbar">
              {addedLocales.map((code) => (
                <button
                  key={code}
                  type="button"
                  className="danger-btn"
                  onClick={() => { handleRemoveLocale(code); }}
                >
                  Remove {code}.json
                </button>
              ))}
            </div>
          )}

          {keys.length === 0 ? (
            <p className="muted-text">
              Add objects or NPC dialogues first — their text will automatically appear here for
              translation.
            </p>
          ) : (
            <table className="i18n-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>default.json</th>
                  {addedLocales.map((code) => (
                    <th key={code}>{code}.json</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key}>
                    <td className="i18n-key">{key}</td>
                    <td>{defaultEntries[key]}</td>
                    {addedLocales.map((code) => (
                      <td key={code}>
                        <input
                          type="text"
                          value={translations[code]?.[key] ?? ''}
                          placeholder={defaultEntries[key] ?? ''}
                          onChange={(e) => { handleCellChange(code, key, e.target.value); }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <aside className="json-preview-panel">
        <h4>Generated {previewFile}</h4>
        <div className="token-toolbar">
          {Object.keys(localeFiles).map((filePath) => (
            <button
              key={filePath}
              type="button"
              className={previewFile === filePath ? 'season-btn active' : 'season-btn'}
              onClick={() => { setPreviewFile(filePath); }}
            >
              {filePath}
            </button>
          ))}
        </div>
        <pre>{JSON.stringify(localeFiles[previewFile] ?? {}, null, 2)}</pre>
      </aside>
    </div>
  );
}
