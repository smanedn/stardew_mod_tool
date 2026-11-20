import type { SdvProjectFile } from '../../data/models/index.js';

export interface LocalePreset {
  readonly code: string;
  readonly label: string;
}

export const SUPPORTED_LOCALE_PRESETS: readonly LocalePreset[] = [
  { code: 'it', label: 'Italiano (it.json)' },
  { code: 'es', label: 'Español (es.json)' },
  { code: 'fr', label: 'Français (fr.json)' },
  { code: 'de', label: 'Deutsch (de.json)' },
  { code: 'pt', label: 'Português (pt.json)' },
  { code: 'ja', label: '日本語 (ja.json)' },
  { code: 'ko', label: '한국어 (ko.json)' },
  { code: 'zh', label: '中文 (zh.json)' },
  { code: 'ru', label: 'Русский (ru.json)' },
];

/**
 * Formats a Content Patcher i18n token reference for a given translation key.
 */
export function toI18nToken(key: string): string {
  return `{{i18n:${key}}}`;
}

/**
 * Automatically extracts all entered text strings from project edits
 * into a flat i18n/default.json key-value dictionary.
 */
export function extractDefaultTranslations(
  project: SdvProjectFile,
): Readonly<Record<string, string>> {
  const entries: Array<[string, string]> = [];

  for (const edit of project.edits) {
    if (edit.kind === 'object') {
      entries.push([`object.${edit.itemId}.name`, edit.displayName]);
      if (edit.description.trim().length > 0) {
        entries.push([`object.${edit.itemId}.description`, edit.description]);
      }
    } else if (edit.kind === 'dialogue') {
      entries.push([`dialogue.${edit.npcName}.${edit.dialogueKey}`, edit.text]);
    }
  }

  return Object.fromEntries(entries);
}

/**
 * Builds the complete map of i18n/<locale>.json files (starting with i18n/default.json).
 */
export function buildLocaleFileMap(
  project: SdvProjectFile,
): Readonly<Record<string, Readonly<Record<string, string>>>> {
  const defaultMap = extractDefaultTranslations(project);
  const files: Array<[string, Readonly<Record<string, string>>]> = [
    ['i18n/default.json', defaultMap],
  ];

  const translations = project.translations ?? {};
  for (const [localeCode, localeEntries] of Object.entries(translations)) {
    const cleanCode = localeCode.trim().toLowerCase();
    if (cleanCode.length > 0 && cleanCode !== 'default') {
      files.push([`i18n/${cleanCode}.json`, localeEntries]);
    }
  }

  return Object.fromEntries(files);
}
