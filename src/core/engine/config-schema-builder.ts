import type { ConfigSchemaField, ProjectConfigOption } from '../../data/models/index.js';

/**
 * Generates Content Patcher ConfigSchema compatible with Generic Mod Config Menu (GMCM).
 */
export function compileConfigSchema(
  options: readonly ProjectConfigOption[],
): Readonly<Record<string, ConfigSchemaField>> {
  const entries: Array<[string, ConfigSchemaField]> = [];

  for (const opt of options) {
    const allowValues =
      opt.optionType === 'toggle'
        ? 'true, false'
        : opt.allowValues !== undefined && opt.allowValues.trim().length > 0
          ? opt.allowValues.trim()
          : undefined;

    entries.push([
      opt.key,
      {
        Default: opt.defaultValue,
        ...(allowValues !== undefined ? { AllowValues: allowValues } : {}),
        ...(opt.description !== undefined && opt.description.trim().length > 0
          ? { Description: opt.description.trim() }
          : {}),
        ...(opt.section !== undefined && opt.section.trim().length > 0
          ? { Section: opt.section.trim() }
          : {}),
      },
    ]);
  }

  return Object.fromEntries(entries);
}

/**
 * Generates default config.json key-value pairs from project config options.
 */
export function compileDefaultConfigJson(
  options: readonly ProjectConfigOption[],
): Readonly<Record<string, string>> {
  return Object.fromEntries(options.map((opt) => [opt.key, opt.defaultValue]));
}
