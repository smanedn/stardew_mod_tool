/**
 * Supported Content Patcher 2.0+ patch actions.
 */
export type PatchAction = 'Load' | 'EditData' | 'EditImage' | 'Include';

/**
 * Rectangular sprite or map region used by EditImage patches.
 */
export interface AreaRect {
  readonly X: number;
  readonly Y: number;
  readonly Width: number;
  readonly Height: number;
}

/**
 * Conditional key-value map restricting when a patch or token applies.
 */
export type PatchConditions = Readonly<Record<string, string>>;

/**
 * Image blend mode for EditImage patches.
 */
export type ImagePatchMode = 'Replace' | 'Overlay';

export interface LoadPatch {
  readonly Action: 'Load';
  readonly LogName?: string;
  readonly Target: string;
  readonly FromFile: string;
  readonly When?: PatchConditions;
}

export interface EditDataPatch {
  readonly Action: 'EditData';
  readonly LogName?: string;
  readonly Target: string;
  readonly Entries?: Readonly<Record<string, unknown>>;
  readonly Fields?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly When?: PatchConditions;
}

export interface EditImagePatch {
  readonly Action: 'EditImage';
  readonly LogName?: string;
  readonly Target: string;
  readonly FromFile: string;
  readonly FromArea?: AreaRect;
  readonly ToArea?: AreaRect;
  readonly PatchMode?: ImagePatchMode;
  readonly When?: PatchConditions;
}

export interface IncludePatch {
  readonly Action: 'Include';
  readonly LogName?: string;
  readonly FromFile: string;
  readonly When?: PatchConditions;
}

/**
 * Explicit discriminated union for Content Patcher 2.0+ Changes entries.
 */
export type ContentPatch = LoadPatch | EditDataPatch | EditImagePatch | IncludePatch;

/**
 * Dynamic token definition inside content.json.
 */
export interface DynamicToken {
  readonly Name: string;
  readonly Value: string;
  readonly When?: PatchConditions;
}

/**
 * Configuration schema field compatible with Generic Mod Config Menu.
 */
export interface ConfigSchemaField {
  readonly AllowValues?: string;
  readonly Default: string;
  readonly Description?: string;
  readonly Section?: string;
  readonly AllowMultiple?: boolean;
  readonly AllowBlank?: boolean;
}

/**
 * Top-level Content Patcher content.json document model.
 */
export interface ContentJsonDocument {
  readonly Format: string;
  readonly ConfigSchema?: Readonly<Record<string, ConfigSchemaField>>;
  readonly DynamicTokens?: readonly DynamicToken[];
  readonly Changes: readonly ContentPatch[];
}
