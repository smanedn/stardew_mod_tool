import { spawn } from 'node:child_process';
import path from 'node:path';
import { SecurityError } from '../security/security-error.js';
import { type SmapiLogEntry, parseSmapiLogLine } from './smapi-log-parser.js';

export interface SmapiLaunchOptions {
  readonly smapiExecutablePath: string;
  readonly modUniqueId: string;
  readonly modName?: string;
  readonly onLogEntry: (entry: SmapiLogEntry) => void;
  readonly onExit?: (exitCode: number | null) => void;
}

export interface SmapiProcessHandle {
  readonly pid: number | undefined;
  readonly stop: () => void;
}

const ALLOWED_SMAPI_BINARIES: ReadonlySet<string> = new Set([
  'StardewModdingAPI',
  'StardewModdingAPI.exe',
]);

function forwardStreamLines(
  chunk: Buffer,
  modUniqueId: string,
  modName: string,
  onLogEntry: (entry: SmapiLogEntry) => void,
): void {
  const text = chunk.toString('utf-8');
  for (const line of text.split(/\r?\n/)) {
    if (line.trim().length > 0) {
      onLogEntry(parseSmapiLogLine(line, modUniqueId, modName));
    }
  }
}

/**
 * Launches SMAPI directly without shell interpolation and streams console output
 * in real time, highlighting red errors tied to the user's mod.
 */
export function launchSmapiWithLogMonitor(options: SmapiLaunchOptions): SmapiProcessHandle {
  const baseName = path.basename(options.smapiExecutablePath);
  if (!ALLOWED_SMAPI_BINARIES.has(baseName)) {
    throw new SecurityError(
      'FORBIDDEN_CODE_EXECUTION',
      `Refusing to launch non-SMAPI executable "${baseName}".`,
    );
  }

  const child = spawn(options.smapiExecutablePath, [], {
    cwd: path.dirname(options.smapiExecutablePath),
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const modName = options.modName ?? '';
  child.stdout.on('data', (chunk: Buffer) => {
    forwardStreamLines(chunk, options.modUniqueId, modName, options.onLogEntry);
  });
  child.stderr.on('data', (chunk: Buffer) => {
    forwardStreamLines(chunk, options.modUniqueId, modName, options.onLogEntry);
  });
  child.on('exit', (code) => {
    options.onExit?.(code);
  });

  return {
    pid: child.pid,
    stop: (): void => {
      child.kill();
    },
  };
}
