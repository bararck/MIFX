export type PlanningStatus = 'VACANT' | 'CONFIRMED' | 'EXPIRING' | 'EXPIRED' | 'ON_TRACK';

export interface PlanningClassificationInput {
  hasActiveCrew: boolean;
  hasValidReliever: boolean;
  hasActiveContract: boolean;
  expectedEndDate?: string;
  today: string;
  expiringThresholdDays: number;
}

export function classifyPlanningStatus(input: PlanningClassificationInput): PlanningStatus {
  if (!input.hasActiveCrew) return 'VACANT';
  if (!input.hasActiveContract || !input.expectedEndDate) throw new Error('An active crew requires one unambiguous active contract and expected end date.');
  if (input.hasValidReliever) return 'CONFIRMED';
  const remainingDays = Math.floor((Date.parse(`${input.expectedEndDate}T00:00:00Z`) - Date.parse(`${input.today}T00:00:00Z`)) / 86_400_000);
  if (remainingDays < 0) return 'EXPIRED';
  if (remainingDays <= input.expiringThresholdDays) return 'EXPIRING';
  return 'ON_TRACK';
}

export function hasValidReliever(value: unknown, reportedCount?: number): boolean {
  if (Number.isInteger(reportedCount) && reportedCount! > 0) return true;
  if (Array.isArray(value)) return value.some(item => hasValidReliever(item));
  if (typeof value === 'string') return Boolean(value.trim());
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return ['id', 'uuid', 'crewId', 'crew_id', 'relieverId', 'reliever_id'].some(key => typeof record[key] === 'string' && record[key].trim());
}
