import { useMemo, useState } from 'react';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
  serializeCleanJson,
} from '../../core/engine/browser-compiler.js';
import type { SdvProjectFile } from '../../data/models/index.js';

export interface CodeInspectorProps {
  readonly project: SdvProjectFile;
}

type InspectedFile = 'content.json' | 'manifest.json';

function tryCompileFile(project: SdvProjectFile, file: InspectedFile): {
  readonly text: string;
  readonly error: string | null;
} {
  try {
    const compiled =
      file === 'content.json'
        ? compileProjectToContentJson(project)
        : compileProjectToManifest(project);
    return { text: serializeCleanJson(compiled), error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Compilation failed.';
    return { text: '', error: message };
  }
}

export function CodeInspector({ project }: CodeInspectorProps): React.JSX.Element {
  const [selectedFile, setSelectedFile] = useState<InspectedFile>('content.json');
  const [copied, setCopied] = useState<boolean>(false);

  const result = useMemo(
    () => tryCompileFile(project, selectedFile),
    [project, selectedFile],
  );

  const handleCopy = (): void => {
    if (result.text.length === 0) {
      return;
    }
    void navigator.clipboard.writeText(result.text).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); }, 1500);
    });
  };

  return (
    <aside className="json-preview-panel inspector-sidebar">
      <div className="module-toolbar">
        <h4>Live Code Inspector (Read-Only)</h4>
        <button
          type="button"
          className="secondary-btn"
          disabled={result.error !== null}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="token-toolbar">
        {(['content.json', 'manifest.json'] as const).map((file) => (
          <button
            key={file}
            type="button"
            className={selectedFile === file ? 'season-btn active' : 'season-btn'}
            onClick={() => { setSelectedFile(file); }}
          >
            {file}
          </button>
        ))}
      </div>

      {result.error !== null ? (
        <p className="field-error">{result.error}</p>
      ) : (
        <pre>{result.text}</pre>
      )}
    </aside>
  );
}
