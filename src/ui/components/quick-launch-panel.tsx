import { useState } from 'react';
import { type SmapiLogEntry, parseSmapiLogLine } from '../../core/engine/smapi-log-parser.js';

export interface QuickLaunchPanelProps {
  readonly modUniqueId: string;
  readonly modName: string;
  readonly onLaunchSmapi?: (
    onLog: (entry: SmapiLogEntry) => void,
  ) => Promise<void> | void;
}

function buildSampleSmapiLines(uniqueId: string, modName: string): readonly string[] {
  return [
    '[21:45:01 INFO SMAPI] SMAPI 4.1.10 with Stardew Valley 1.6.15',
    `[21:45:02 INFO Content Patcher] Loaded content pack '${modName}' (${uniqueId})`,
    `[21:45:03 ERROR Content Patcher] ${uniqueId}: Missing asset 'assets/example.png'.`,
    '[21:45:04 INFO SMAPI] Type "help" for help, or "help <cmd>" for a command.',
  ];
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

    setStatusText('Simulated SMAPI Log (Browser Preview)');
    const sampleLines = buildSampleSmapiLines(props.modUniqueId, props.modName);
    for (const line of sampleLines) {
      appendEntry(parseSmapiLogLine(line, props.modUniqueId, props.modName));
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
