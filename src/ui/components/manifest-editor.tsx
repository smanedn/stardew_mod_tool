import { generateUniqueId, incrementSemVer } from '../../core/engine/id-version-generator.js';
import { SemVerSchema, UniqueIdSchema } from '../../core/security/input-schemas.js';
import type { SdvProjectMetadata } from '../../data/models/index.js';

export interface ManifestEditorProps {
  readonly metadata: SdvProjectMetadata;
  readonly onChange: (next: SdvProjectMetadata) => void;
}

function getValidationError(value: string, schema: typeof UniqueIdSchema): string | null {
  const result = schema.safeParse(value);
  if (result.success) {
    return null;
  }
  return result.error.issues[0]?.message ?? 'Invalid value.';
}

function buildUpdateKeys(nexusId: string, modDropId: string): readonly string[] {
  const keys: string[] = [];
  if (nexusId.trim().length > 0) {
    keys.push(`Nexus:${nexusId.trim()}`);
  }
  if (modDropId.trim().length > 0) {
    keys.push(`ModDrop:${modDropId.trim()}`);
  }
  return keys;
}

function extractUpdateKeyId(keys: readonly string[] | undefined, prefix: string): string {
  const match = keys?.find((key) => key.startsWith(`${prefix}:`));
  return match !== undefined ? match.slice(prefix.length + 1) : '';
}

function buildManifestPreview(metadata: SdvProjectMetadata): string {
  return JSON.stringify(
    {
      Name: metadata.name,
      Author: metadata.author,
      Version: metadata.version,
      Description: metadata.description,
      UniqueID: metadata.uniqueId,
      ContentPackFor: { UniqueID: 'Pathoschild.ContentPatcher' },
      ...(metadata.updateKeys !== undefined && metadata.updateKeys.length > 0
        ? { UpdateKeys: metadata.updateKeys }
        : {}),
    },
    null,
    2,
  );
}

export function ManifestEditor({ metadata, onChange }: ManifestEditorProps): React.JSX.Element {
  const uniqueIdError = getValidationError(metadata.uniqueId, UniqueIdSchema);
  const versionError = getValidationError(metadata.version, SemVerSchema);
  const nexusId = extractUpdateKeyId(metadata.updateKeys, 'Nexus');
  const modDropId = extractUpdateKeyId(metadata.updateKeys, 'ModDrop');

  const updateField = (patch: Partial<SdvProjectMetadata>): void => {
    onChange({ ...metadata, ...patch });
  };

  return (
    <div className="editor-split">
      <form className="manifest-form" onSubmit={(e) => { e.preventDefault(); }}>
        <h3>Manifest & Mod Configuration</h3>

        <label className="form-field">
          <span>Mod Name *</span>
          <input
            type="text"
            value={metadata.name}
            onChange={(e) => { updateField({ name: e.target.value }); }}
          />
        </label>

        <label className="form-field">
          <span>Author *</span>
          <input
            type="text"
            value={metadata.author}
            onChange={(e) => { updateField({ author: e.target.value }); }}
          />
        </label>

        <label className="form-field">
          <span>UniqueID *</span>
          <div className="inline-row">
            <input
              type="text"
              value={metadata.uniqueId}
              onChange={(e) => { updateField({ uniqueId: e.target.value }); }}
            />
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                updateField({ uniqueId: generateUniqueId(metadata.author, metadata.name) });
              }}
            >
              Auto-Generate
            </button>
          </div>
          {uniqueIdError !== null && <span className="field-error">{uniqueIdError}</span>}
        </label>

        <label className="form-field">
          <span>Version (SemVer) *</span>
          <div className="inline-row">
            <input
              type="text"
              value={metadata.version}
              onChange={(e) => { updateField({ version: e.target.value }); }}
            />
            <button
              type="button"
              className="secondary-btn"
              disabled={versionError !== null}
              onClick={() => { updateField({ version: incrementSemVer(metadata.version, 'patch') }); }}
            >
              +Patch
            </button>
            <button
              type="button"
              className="secondary-btn"
              disabled={versionError !== null}
              onClick={() => { updateField({ version: incrementSemVer(metadata.version, 'minor') }); }}
            >
              +Minor
            </button>
          </div>
          {versionError !== null && <span className="field-error">{versionError}</span>}
        </label>

        <label className="form-field">
          <span>Description</span>
          <textarea
            rows={3}
            value={metadata.description}
            onChange={(e) => { updateField({ description: e.target.value }); }}
          />
        </label>

        <div className="inline-row">
          <label className="form-field">
            <span>Nexus Mods ID</span>
            <input
              type="text"
              placeholder="e.g. 12345"
              value={nexusId}
              onChange={(e) => {
                updateField({ updateKeys: buildUpdateKeys(e.target.value, modDropId) });
              }}
            />
          </label>
          <label className="form-field">
            <span>ModDrop ID</span>
            <input
              type="text"
              placeholder="e.g. 67890"
              value={modDropId}
              onChange={(e) => {
                updateField({ updateKeys: buildUpdateKeys(nexusId, e.target.value) });
              }}
            />
          </label>
        </div>
      </form>

      <aside className="json-preview-panel">
        <h4>Live manifest.json</h4>
        <pre>{buildManifestPreview(metadata)}</pre>
      </aside>
    </div>
  );
}
