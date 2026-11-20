import {
  SDVPROJ_FORMAT_VERSION,
  type SdvProjectEdit,
  type SdvProjectFile,
  type SdvProjectMetadata,
} from '../../data/models/index.js';
import { SemVerSchema, UniqueIdSchema, validateWithSchema } from '../security/input-schemas.js';

export type ProjectTemplateId = 'object' | 'crop' | 'retexture' | 'dialogue';

export interface ProjectTemplateInfo {
  readonly id: ProjectTemplateId;
  readonly title: string;
  readonly description: string;
  readonly badge: string;
}

export const PROJECT_TEMPLATES: readonly ProjectTemplateInfo[] = [
  {
    id: 'object',
    title: 'New Object',
    description: 'Add a custom food, artisan good, or material to Data/Objects.',
    badge: 'Item',
  },
  {
    id: 'crop',
    title: 'New Crop & Seed',
    description: 'Create a seasonal crop with growth phases and harvest item.',
    badge: 'Farming',
  },
  {
    id: 'retexture',
    title: 'Retexture Sprite',
    description: 'Replace a vanilla item, tool, or furniture sprite with EditImage.',
    badge: 'Visual',
  },
  {
    id: 'dialogue',
    title: 'NPC Dialogue',
    description: 'Customize villager daily, seasonal, or marriage dialogue lines.',
    badge: 'Social',
  },
];

function buildTemplateEdits(templateId: ProjectTemplateId, uniqueId: string): readonly SdvProjectEdit[] {
  switch (templateId) {
    case 'object':
      return [
        {
          kind: 'object',
          id: 'edit-object-1',
          itemId: `${uniqueId}_CustomItem`,
          displayName: 'Custom Item',
          description: 'A brand-new item created with Stardew Mod Creator.',
          price: 100,
          edibility: 20,
          category: -75,
        },
      ];
    case 'crop':
      return [
        {
          kind: 'crop',
          id: 'edit-crop-1',
          seedItemId: `${uniqueId}_CustomSeeds`,
          harvestItemId: `${uniqueId}_CustomCrop`,
          seasons: ['Spring'],
          daysInPhase: [1, 2, 2, 2],
        },
      ];
    case 'retexture':
      return [
        {
          kind: 'retexture',
          id: 'edit-retexture-1',
          target: 'Maps/springobjects',
          assetId: 'placeholder-sprite',
          toArea: { X: 0, Y: 0, Width: 16, Height: 16 },
        },
      ];
    case 'dialogue':
      return [
        {
          kind: 'dialogue',
          id: 'edit-dialogue-1',
          npcName: 'Abigail',
          dialogueKey: 'Mon',
          text: 'Hey @! Have you checked out the mines lately?$h',
        },
      ];
  }
}

/**
 * Creates a new .sdvproj project pre-populated with a starter template edit.
 */
export function createProjectFromTemplate(
  templateId: ProjectTemplateId,
  metadata: SdvProjectMetadata,
): SdvProjectFile {
  validateWithSchema(UniqueIdSchema, metadata.uniqueId, 'UniqueID');
  validateWithSchema(SemVerSchema, metadata.version, 'Version');

  return {
    formatVersion: SDVPROJ_FORMAT_VERSION,
    updatedAt: new Date().toISOString(),
    metadata,
    assets: [],
    edits: buildTemplateEdits(templateId, metadata.uniqueId),
  };
}

function readString(obj: unknown, key: string, fallback: string): string {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return fallback;
  }
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  return typeof desc?.value === 'string' ? desc.value : fallback;
}

/**
 * Imports an existing manifest.json string into an editable .sdvproj project state.
 */
export function importManifestJsonToProject(manifestJson: string): SdvProjectFile {
  const parsed: unknown = JSON.parse(manifestJson.replace(/^\uFEFF/, ''));
  const name = readString(parsed, 'Name', 'Imported Mod');
  const author = readString(parsed, 'Author', 'Author');
  const version = readString(parsed, 'Version', '1.0.0');
  const description = readString(parsed, 'Description', '');
  const uniqueId = readString(parsed, 'UniqueID', 'Author.ImportedMod');

  validateWithSchema(UniqueIdSchema, uniqueId, 'UniqueID');
  validateWithSchema(SemVerSchema, version, 'Version');

  return {
    formatVersion: SDVPROJ_FORMAT_VERSION,
    updatedAt: new Date().toISOString(),
    metadata: { name, author, version, description, uniqueId },
    assets: [],
    edits: [],
  };
}
