import { expect } from '@playwright/test';
import type { PlanningEvaluation, RemoraWorld } from '../support/world';

type SummaryKey = 'expired' | 'expiring' | 'confirmed' | 'vacant';
const summaryKeys: SummaryKey[] = ['expired', 'expiring', 'confirmed', 'vacant'];

export function expectedPlanningSummary(evaluations: PlanningEvaluation[]): Record<SummaryKey, number> {
  const result: Record<SummaryKey, number> = { expired: 0, expiring: 0, confirmed: 0, vacant: 0 };
  for (const evaluation of evaluations) {
    const key = evaluation.expectedStatus.toLowerCase() as SummaryKey;
    if (summaryKeys.includes(key)) result[key] += 1;
  }
  return result;
}

export function assertConfirmedRecordsHaveRelievers(world: RemoraWorld): void {
  const confirmed = world.planningEvaluations.filter(item => item.actualStatus === 'CONFIRMED');
  expect(confirmed, 'Master Planning must contain confirmed records for this invariant.').not.toHaveLength(0);
  const invalid = confirmed.filter(item => !item.hasValidReliever);
  expect(invalid.map(diagnostic), 'Every confirmed Master Planning record must have a valid reliever.').toEqual([]);
}

export function assertVacantRecordsHaveNoCrew(world: RemoraWorld): void {
  const vacant = world.planningEvaluations.filter(item => item.actualStatus === 'VACANT');
  expect(vacant, 'Master Planning must contain vacant records for this invariant.').not.toHaveLength(0);
  const invalid = vacant.filter(item => item.hasActiveCrew);
  expect(invalid.map(diagnostic), 'A vacant vessel-rank must not have an active crew assignment.').toEqual([]);
}

export function assertPlanningDetailMatchesCalculatedStatus(world: RemoraWorld): void {
  const mismatches = world.planningEvaluations.filter(item =>
    ['CONFIRMED', 'EXPIRING', 'EXPIRED', 'VACANT', 'ON_TRACK'].includes(item.expectedStatus)
      && item.actualStatus !== item.expectedStatus
  );
  expect(mismatches.map(diagnostic), 'Master Planning detail status mismatch.').toEqual([]);
}

export function assertPlanningDatesAndDuration(world: RemoraWorld): void {
  const invalid = world.planningEvaluations.filter(item => item.hasActiveCrew && (
    !item.actualSignOn || !item.expectedEndDate
    || item.actualStartDate !== item.actualSignOn
    || item.actualExpectedEndDate !== item.expectedEndDate
    || item.actualDuration !== item.expectedDuration
    || item.actualExtendedDuration !== item.expectedExtendedDuration
  ));
  expect(invalid.map(diagnostic), 'Master Planning dates or contract duration do not match the active contract.').toEqual([]);
}

export function assertPlanningSummary(world: RemoraWorld): void {
  const actual = world.planningSummary;
  expect(actual, 'Master Planning summary must be loaded before it is asserted.').toBeTruthy();
  const expected = world.expectedPlanningSummary ?? expectedPlanningSummary(world.planningEvaluations);
  const mismatches = summaryKeys.filter(key => actual![key] !== expected[key]);
  expect(mismatches, summaryDiagnostic(expected, actual!)).toEqual([]);
}

function summaryDiagnostic(expected: Record<SummaryKey, number>, actual: Record<SummaryKey, number>): string {
  return `Master Planning summary mismatch:\n${summaryKeys.map(key => `- ${key}: expected ${expected[key]}, actual ${actual[key]}`).join('\n')}`;
}

function diagnostic(value: PlanningEvaluation): string {
  return JSON.stringify({
    vesselRankId: value.rankId, crewId: value.crewId, actualStatus: value.actualStatus,
    expectedStatus: value.expectedStatus, contractId: value.contractId, contractStatus: value.contractStatus,
    actualSignOn: value.actualSignOn,
    startDate: { expected: value.actualSignOn, actual: value.actualStartDate },
    expectedEndDate: { expected: value.expectedEndDate, actual: value.actualExpectedEndDate },
    contractDurationSpent: { expected: value.expectedDuration, actual: value.actualDuration },
    extendedDuration: { expected: value.expectedExtendedDuration, actual: value.actualExtendedDuration },
    hasReliever: value.hasValidReliever, reason: value.reason
  });
}
