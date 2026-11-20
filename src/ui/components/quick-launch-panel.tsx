import { useState } from 'react';
import {
  compileProjectToContentJson,
  compileProjectToManifest,
} from '../../core/engine/browser-compiler.js';
import { type SmapiLogEntry, parseSmapiLogLine } from '../../core/engine/smapi-log-parser.js';
import type { SdvProjectFile } from '../../data/models/index.js';

export interface QuickLaunchPanelProps {
  readonly project: SdvProjectFile;
  readonly onLaunchSmapi?: (
    onLog: (entry: SmapiLogEntry) => void,
  ) => Promise<void> | void;
}

function buildValidatedSmapiLines(project: SdvProjectFile): readonly string[] {
  const { uniqueId, name } = project.metadata;
  const lines: string[] = [
    '[21:45:01 INFO SMAPI] SMAPI 4.1.10 with Stardew Valley 1.6.15',
    `[21:45:02 INFO Content Patcher] Loaded content pack '${name}' (${uniqueId})`,
  ];

  try {
    compileProjectToManifest(project);
    const content = compileProjectToContentJson(project);
    const patchCount = String(content.Changes.length);
    lines.push(
      `[21:45:03 INFO Content Patcher] ${uniqueId}: Applied ${patchCount} patch(es) cleanly.`,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Validation failed.';
    lines.push(`[21:45:03 ERROR Content Patcher] ${uniqueId}: ${message}`);
  }

  lines.push('[21:45:04 INFO SMAPI] Type "help" for help, or "help <cmd>" for a command.');
  return lines;
}

function getLogLineClass(entry: SmapiLogEntry): string {
  if (entry.severity === 'error' && entry.isModRelated) {
    return 'smapi-log-line smapi-mod-error';
  }
  if (entry.severity === 'error') {
    return 'smapi-log-line smapi-error';
  }
  if (entry.severity === 'warn') {
    return 'smapi-log-line smapi-warn';
  }
  return 'smapi-log-line';
}

export function QuickLaunchPanel(props: QuickLaunchPanelProps): React.JSX.Element {
  const [logs, setLogs] = useState<readonly SmapiLogEntry[]>([]);
  const [statusText, setStatusText] = useState<string>('Idle');
  const { uniqueId, name } = props.project.metadata;

  const appendEntry = (entry: SmapiLogEntry): void => {
    setLogs((prev) => [...prev, entry]);
  };

  const handleTestInGame = (): void => {
    setLogs([]);
    if (props.onLaunchSmapi !== undefined) {
      setStatusText('Running SMAPI...');
      void Promise.resolve(props.onLaunchSmapi(appendEntry)).then(() => {
        setStatusText('SMAPI exited');
      });
      return;
    }

    setStatusText('Simulated SMAPI Log (Live Project Check)');
    for (const line of buildValidatedSmapiLines(props.project)) {
      appendEntry(parseSmapiLogLine(line, uniqueId, name));
    }
  };

  const modErrorCount = logs.filter((e) => e.severity === 'error' && e.isModRelated).length;

  return (
    <div className="module-card">
      <div className="module-toolbar">
        <div>
          <h3>Quick Launch with SMAPI</h3>
          <span className="muted-text">
            Status: {statusText} | Mod Errors: {String(modErrorCount)}
          </span>
        </div>
        <div className="inline-row">
          <button type="button" className="launch-btn" onClick={handleTestInGame}>
            Test in Game
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => { setLogs([]); }}
          >
            Clear Log
          </button>
        </div>
      </div>

      <div className="smapi-console">
        {logs.length === 0 ? (
          <div className="muted-text">
            Click &quot;Test in Game&quot; to launch SMAPI and monitor console output.
          </div>
        ) : (
          logs.map((entry, idx) => (
            <div key={idx} className={getLogLineClass(entry)}>
              {entry.isModRelated && entry.severity === 'error' ? '[YOUR MOD] ' : ''}
              {entry.rawLine}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
