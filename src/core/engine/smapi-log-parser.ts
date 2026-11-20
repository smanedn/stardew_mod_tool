export type SmapiLogSeverity = 'error' | 'warn' | 'info';

export interface SmapiLogEntry {
  readonly rawLine: string;
  readonly severity: SmapiLogSeverity;
  readonly isModRelated: boolean;
}

/**
 * Parses a SMAPI console output line, classifying severity and flagging
 * errors or warnings tied to the user's active mod.
 */
export function parseSmapiLogLine(
  rawLine: string,
  modUniqueId: string,
  modName = '',
): SmapiLogEntry {
  const upper = rawLine.toUpperCase();
  const severity: SmapiLogSeverity =
    upper.includes(' ERROR ') || upper.includes('[ERROR]')
      ? 'error'
      : upper.includes(' WARN ') || upper.includes('[WARN]')
        ? 'warn'
        : 'info';

  const lowerLine = rawLine.toLowerCase();
  const idMatch =
    modUniqueId.trim().length > 0 && lowerLine.includes(modUniqueId.trim().toLowerCase());
  const nameMatch = modName.trim().length > 0 && lowerLine.includes(modName.trim().toLowerCase());

  return {
    rawLine,
    severity,
    isModRelated: idMatch || nameMatch,
  };
}
