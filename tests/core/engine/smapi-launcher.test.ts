import { describe, expect, it } from 'vitest';
import {
  launchSmapiWithLogMonitor,
  parseSmapiLogLine,
} from '../../../src/core/engine/index.js';
import { SecurityError } from '../../../src/core/security/index.js';

describe('Phase 4 Step 24: Quick Launch & SMAPI Log Monitor', () => {
  it('detects SMAPI error severity and flags lines tied to the user mod', () => {
    const modErr = parseSmapiLogLine(
      '[21:00:01 ERROR Content Patcher] Farmer.MyMod: Missing sprite.png',
      'Farmer.MyMod',
      'My Mod',
    );
    expect(modErr.severity).toBe('error');
    expect(modErr.isModRelated).toBe(true);

    const otherInfo = parseSmapiLogLine(
      '[21:00:02 INFO SMAPI] Loaded 10 mods',
      'Farmer.MyMod',
      'My Mod',
    );
    expect(otherInfo.severity).toBe('info');
    expect(otherInfo.isModRelated).toBe(false);
  });

  it('refuses to launch arbitrary non-SMAPI executables', () => {
    expect(() =>
      launchSmapiWithLogMonitor({
        smapiExecutablePath: 'C:\\Windows\\System32\\cmd.exe',
        modUniqueId: 'Farmer.MyMod',
        onLogEntry: () => {},
      }),
    ).toThrowError(SecurityError);
  });
});
