import type { SdvProjectFile } from '../../data/models/index.js';
import { SemVerSchema, UniqueIdSchema } from '../security/input-schemas.js';

export interface ModReadinessReport {
  readonly scorePercent: number;
  readonly hasValidMetadata: boolean;
  readonly hasContent: boolean;
  readonly summaryLabel: string;
}

/**
 * Computes a beginner-friendly 0-100% readiness score for the active mod project.
 */
export function computeModReadiness(project: SdvProjectFile): ModReadinessReport {
  let score = 0;
  const nameOk = project.metadata.name.trim().length > 0;
  const authorOk = project.metadata.author.trim().length > 0;
  const idOk = UniqueIdSchema.safeParse(project.metadata.uniqueId).success;
  const verOk = SemVerSchema.safeParse(project.metadata.version).success;
  const hasValidMetadata = nameOk && authorOk && idOk && verOk;

  if (nameOk) score += 20;
  if (authorOk) score += 15;
  if (idOk && verOk) score += 15;

  const hasContent = project.edits.length > 0 || project.assets.length > 0;
  if (hasContent) score += 35;
  if (project.metadata.description.trim().length > 0) score += 15;

  const summaryLabel =
    score >= 85
      ? 'Ready to Export!'
      : score >= 50
        ? 'Almost Ready — add items or details'
        : 'Getting Started';

  return { scorePercent: score, hasValidMetadata, hasContent, summaryLabel };
}
