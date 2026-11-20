/**
 * Dependency declaration inside a SMAPI manifest.json file.
 */
export interface ManifestDependency {
  readonly UniqueID: string;
  readonly MinimumVersion?: string;
  readonly IsRequired?: boolean;
}

/**
 * Target framework declaration for a SMAPI content pack.
 */
export interface ContentPackFor {
  readonly UniqueID: 'Pathoschild.ContentPatcher';
  readonly MinimumVersion?: string;
}

/**
 * Explicit data model for SMAPI's manifest.json.
 */
export interface Manifest {
  readonly Name: string;
  readonly Author: string;
  readonly Version: string;
  readonly Description: string;
  readonly UniqueID: string;
  readonly ContentPackFor: ContentPackFor;
  readonly MinimumApiVersion?: string;
  readonly UpdateKeys?: readonly string[];
  readonly Dependencies?: readonly ManifestDependency[];
}
