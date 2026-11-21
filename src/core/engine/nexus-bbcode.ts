import type {
  CropEditEntry,
  DialogueEditEntry,
  ObjectEditEntry,
  SdvProjectFile,
} from '../../data/models/index.js';

function buildItemsSection(items: readonly ObjectEditEntry[]): string[] {
  if (items.length === 0) {
    return [];
  }
  const lines = ['', '[size=4][b]Custom Items[/b][/size]', '[list]'];
  for (const item of items) {
    const desc = item.description.trim().length > 0 ? ` — ${item.description.trim()}` : '';
    lines.push(`[*] [b]${item.displayName}[/b] (${String(item.price)}g)${desc}`);
  }
  lines.push('[/list]');
  return lines;
}

function buildCropsSection(crops: readonly CropEditEntry[]): string[] {
  if (crops.length === 0) {
    return [];
  }
  const lines = ['', '[size=4][b]Custom Crops[/b][/size]', '[list]'];
  for (const crop of crops) {
    const seasons = crop.seasons.join(', ');
    lines.push(
      `[*] [b]${crop.seedItemId}[/b] -> ${crop.harvestItemId} (${seasons})`,
    );
  }
  lines.push('[/list]');
  return lines;
}

function buildDialoguesSection(dialogues: readonly DialogueEditEntry[]): string[] {
  if (dialogues.length === 0) {
    return [];
  }
  const countsByNpc = new Map<string, number>();
  for (const dlg of dialogues) {
    countsByNpc.set(dlg.npcName, (countsByNpc.get(dlg.npcName) ?? 0) + 1);
  }
  const lines = ['', '[size=4][b]NPC Dialogues[/b][/size]', '[list]'];
  for (const [npcName, count] of countsByNpc.entries()) {
    const label = count === 1 ? '1 dialogue line' : `${String(count)} dialogue lines`;
    lines.push(`[*] [b]${npcName}[/b]: ${label}`);
  }
  lines.push('[/list]');
  return lines;
}

function buildExtraSummarySection(project: SdvProjectFile): string[] {
  const furniture = project.edits.filter((e) => e.kind === 'furniture').length;
  const fish = project.edits.filter((e) => e.kind === 'fish').length;
  const animals = project.edits.filter((e) => e.kind === 'animal').length;
  const weapons = project.edits.filter((e) => e.kind === 'weapon').length;
  const extras: string[] = [];
  if (furniture > 0) {
    extras.push(`[*] [b]Furniture:[/b] ${String(furniture)} custom piece(s)`);
  }
  if (fish > 0) {
    extras.push(`[*] [b]Fish:[/b] ${String(fish)} custom fish`);
  }
  if (animals > 0) {
    extras.push(`[*] [b]Farm Animals:[/b] ${String(animals)} custom animal(s)`);
  }
  if (weapons > 0) {
    extras.push(`[*] [b]Weapons:[/b] ${String(weapons)} custom weapon(s)`);
  }
  if (extras.length === 0) {
    return [];
  }
  return ['', '[size=4][b]Additional Content[/b][/size]', '[list]', ...extras, '[/list]'];
}

/**
 * Generates a copy-ready Nexus Mods BBCode description from a .sdvproj project.
 */
export function generateNexusBbCode(project: SdvProjectFile): string {
  const { name, version, author, description, uniqueId } = project.metadata;
  const items = project.edits.filter((e): e is ObjectEditEntry => e.kind === 'object');
  const crops = project.edits.filter((e): e is CropEditEntry => e.kind === 'crop');
  const dialogues = project.edits.filter((e): e is DialogueEditEntry => e.kind === 'dialogue');

  const lines: string[] = [
    `[size=5][b]${name}[/b][/size] [size=3]v${version}[/size]`,
    `by [b]${author}[/b]`,
  ];

  if (description.trim().length > 0) {
    lines.push('', description.trim());
  }

  lines.push(
    ...buildItemsSection(items),
    ...buildCropsSection(crops),
    ...buildDialoguesSection(dialogues),
    ...buildExtraSummarySection(project),
    '',
    '[size=4][b]Requirements[/b][/size]',
    '[list]',
    '[*] [b]SMAPI[/b]',
    '[*] [b]Content Patcher[/b]',
    '[/list]',
    '',
    '[size=4][b]Installation (SMAPI & SVMM)[/b][/size]',
    '[list=1]',
    '[*] Install [b]SMAPI[/b] and [b]Content Patcher[/b].',
    '[*] [b]SVMM (Recommended):[/b] Import the [code].zip[/code] into ' +
      'Stardew Valley Mod Manager (SVMM).',
    '[*] [b]Manual:[/b] Extract the [code][CP][/code] folder into ' +
      '[code]Stardew Valley/Mods[/code].',
    '[*] Launch Stardew Valley through SMAPI.',
    '[/list]',
    '',
    `[size=2]UniqueID: [code]${uniqueId}[/code] • Created with Stardew Valley Mod Creator[/size]`,
  );

  return lines.join('\n');
}
