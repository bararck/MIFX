import { expect } from '@playwright/test';
import { getActualTimeline, getCrewContractDetail, getCrewContractTabs, getMasterPlanning, getMasterPlanningAnalytics, searchCrew } from '../api/master-planning.client';
import { actualSignOnFrom, crewContracts, findActiveContract, tourOfDutyFrom } from '../contracts/crew-contract.contract';
import { crewIdFrom, crewNameFrom, masterPlanningRecords, type MasterPlanningRecord } from '../contracts/master-planning.contract';
import { apiEnum, isRecord, normalized, numberValue, paginationFrom, recordsFrom, stringField } from '../contracts/response.contract';
import { classifyPlanningStatus, hasValidReliever } from './master-planning.classifier';
import { calendarDate, expectedEndDate, masterPlanningDuration } from './contract-duration.calculator';
import { expectSuccessfulResponse } from '../support/api-client';
import { config } from '../support/config';
import type { PlanningEvaluation, RemoraWorld } from '../support/world';

export async function loadPlanningStatusData(world: RemoraWorld): Promise<void> {
  // EXPIRING and summary validation cannot start without the established
  // business policy. Fail before traversing every filtered page and contract.
  requiredThreshold();
  world.planningEvaluations = [];
  for (const status of ['CONFIRMED', 'EXPIRED', 'EXPIRING', 'VACANT', 'ON_TRACK'] as const) {
    world.planningEvaluations.push(await selectStatusSample(world, status));
  }
}

export async function loadPlanningStatusDateData(world: RemoraWorld): Promise<void> {
  requiredThreshold();
  world.planningEvaluations = [];
  for (const status of ['CONFIRMED', 'EXPIRED', 'EXPIRING', 'VACANT', 'ON_TRACK'] as const) {
    world.planningEvaluations.push(await selectStatusDateSample(world, status));
  }
}

/** Summary totals come from the complete paginated detail sets for each status.
 * Contract classification is exercised separately against deterministic samples. */
export async function loadPlanningSummaryData(world: RemoraWorld): Promise<void> {
  requiredThreshold();
  const totals = {} as Record<'expired' | 'expiring' | 'confirmed' | 'vacant', number>;
  for (const [status, key] of [
    ['EXPIRED', 'expired'], ['EXPIRING', 'expiring'], ['CONFIRMED', 'confirmed'], ['VACANT', 'vacant']
  ] as const) {
    await getMasterPlanning(world, { status }, 50);
    expectSuccessfulResponse(world, `${status} Master Planning summary detail request`);
    const pagination = paginationFrom(world.lastResponseBody);
    totals[key] = pagination?.totalItems ?? masterPlanningRecords(recordsFrom(world.lastResponseBody)).length;
  }
  world.expectedPlanningSummary = totals;
  await getMasterPlanningAnalytics(world);
  expectSuccessfulResponse(world, 'Master Planning summary request');
  world.planningSummary = summaryFrom(world.lastResponseBody);
}

/** Invariants for CONFIRMED and VACANT are asserted from planning assignments;
 * neither requires contract or nearly-expired policy evaluation. */
export async function loadPlanningAssignmentData(world: RemoraWorld): Promise<void> {
  const records = await planningRecordsForStatus(world, 'CONFIRMED');
  expect(records, 'No confirmed Master Planning record is available in the current UAT data.').not.toHaveLength(0);
  storeAssignmentEvaluations(world, records);
}

export async function loadVacantPlanningAssignmentData(world: RemoraWorld): Promise<void> {
  const records = await planningRecordsForStatus(world, 'VACANT');
  expect(records, 'No vacant Master Planning record is available in the current UAT data.').not.toHaveLength(0);
  storeAssignmentEvaluations(world, records);
}

function storeAssignmentEvaluations(world: RemoraWorld, records: MasterPlanningRecord[]): void {
  world.planningEvaluations = records.map(record => ({
    recordId: record.stableId, rankId: record.rankId, crewId: record.crewId,
    actualStatus: record.status?.trim().toUpperCase(),
    expectedStatus: record.hasActiveCrew ? 'UNASSESSED' : 'VACANT',
    hasActiveCrew: record.hasActiveCrew, hasValidReliever: hasValidReliever(record.reliever, record.totalReliever),
    actualDuration: record.contractDurationSpent,
    reason: 'Planning assignment snapshot.'
  }));
}

/** Date and duration validation uses the active contract, but intentionally does
 * not classify an approaching contract when the business threshold is absent. */
export async function loadPlanningContractData(world: RemoraWorld): Promise<void> {
  const records = await planningRecordsByStatuses(world);
  const rejected: string[] = [];
  for (const record of records) {
    if (!record.hasActiveCrew) {
      rejected.push(`${record.stableId}: no active crew`);
      continue;
    }
    try {
      const evaluation = await evaluateRecord(world, record, false);
      if (evaluation.expectedEndDate && evaluation.expectedEndDate >= calendarDate(new Date())) {
        world.planningEvaluations = [evaluation];
        return;
      }
      rejected.push(`${record.stableId}: expected end date has passed`);
    } catch (error) {
      rejected.push(`${record.stableId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(
    `No deterministic Master Planning record has a compatible active contract, actual sign-on, and Tour of Duty. `
    + `Candidates checked: ${records.length}. Rejections: ${rejected.slice(0, 10).join(' | ')}`
  );
}

async function planningRecordsByStatuses(world: RemoraWorld): Promise<MasterPlanningRecord[]> {
  const records: MasterPlanningRecord[] = [];
  for (const status of ['CONFIRMED', 'EXPIRED', 'EXPIRING', 'VACANT', 'ON_TRACK'] as const) {
    records.push(...await planningRecordsForStatus(world, status));
  }
  const unique = [...new Map(records.map(record => [record.stableId, record])).values()]
    .sort((left, right) => left.stableId.localeCompare(right.stableId));
  expect(unique, 'Master Planning status filters returned no records for CONFIRMED, EXPIRED, EXPIRING, VACANT, or ON_TRACK.').not.toHaveLength(0);
  return unique;
}

async function selectStatusSample(
  world: RemoraWorld,
  status: 'CONFIRMED' | 'EXPIRED' | 'EXPIRING' | 'VACANT' | 'ON_TRACK'
): Promise<PlanningEvaluation> {
  const records = await planningRecordsForStatus(world, status, false);
  const rejected: string[] = [];
  for (const record of records) {
    try {
      const evaluation = await evaluateRecord(world, record);
      if (evaluation.expectedStatus === status) return evaluation;
      rejected.push(`${record.stableId}: expected ${evaluation.expectedStatus}`);
    } catch (error) {
      rejected.push(`${record.stableId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(
    `No compatible ${status} Master Planning record was found in the deterministic first page. `
    + `Candidates checked: ${records.length}. Rejections: ${rejected.slice(0, 10).join(' | ')}`
  );
}

async function selectStatusDateSample(
  world: RemoraWorld,
  status: 'CONFIRMED' | 'EXPIRED' | 'EXPIRING' | 'VACANT' | 'ON_TRACK'
): Promise<PlanningEvaluation> {
  const records = await planningRecordsForStatus(world, status, false);
  const rejected: string[] = [];
  for (const record of records) {
    try {
      const evaluation = await evaluateRecord(world, record, status !== 'CONFIRMED');
      const expectedStatus = status === 'CONFIRMED' && evaluation.hasValidReliever
        ? 'CONFIRMED'
        : evaluation.expectedStatus;
      if (expectedStatus === status) return { ...evaluation, expectedStatus };
      rejected.push(`${record.stableId}: expected ${expectedStatus}`);
    } catch (error) {
      rejected.push(`${record.stableId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(
    `No compatible ${status} Master Planning record with contract-derived dates was found in the deterministic first page. `
    + `Candidates checked: ${records.length}. Rejections: ${rejected.slice(0, 10).join(' | ')}`
  );
}

async function planningRecordsForStatus(
  world: RemoraWorld,
  status: 'CONFIRMED' | 'EXPIRED' | 'EXPIRING' | 'VACANT' | 'ON_TRACK',
  includeAllPages = true
): Promise<MasterPlanningRecord[]> {
  const limit = 50;
  const filters = { status: apiEnum(status) };
  await getMasterPlanning(world, filters, limit);
  expectSuccessfulResponse(world, `${status} Master Planning records request`);
  const firstPage = masterPlanningRecords(recordsFrom(world.lastResponseBody));
  const pagination = paginationFrom(world.lastResponseBody);
  const pages = includeAllPages && pagination ? Math.max(1, pagination.totalPages) : 1;
  const records = [...firstPage];
  for (let page = 2; page <= pages; page += 1) {
    await getMasterPlanning(world, filters, limit, page);
    expectSuccessfulResponse(world, `${status} Master Planning page ${page} request`);
    records.push(...masterPlanningRecords(recordsFrom(world.lastResponseBody)));
  }
  return records.sort((left, right) => left.stableId.localeCompare(right.stableId));
}

async function evaluateRecord(world: RemoraWorld, record: MasterPlanningRecord, classify = true): Promise<PlanningEvaluation> {
  const base = {
    recordId: record.stableId, rankId: record.rankId, crewId: record.crewId,
    actualStatus: record.status?.trim().toUpperCase(), hasActiveCrew: record.hasActiveCrew,
    hasValidReliever: hasValidReliever(record.reliever, record.totalReliever), actualDuration: record.contractDurationSpent,
    actualExtendedDuration: record.extendedDuration,
    actualStartDate: record.startDate && calendarDate(record.startDate),
    actualExpectedEndDate: record.expectedEndDate && calendarDate(record.expectedEndDate)
  };
  if (!record.hasActiveCrew) {
    return { ...base, expectedStatus: 'VACANT', reason: 'No active crew assignment is present.' };
  }
  const crewId = record.crewId ?? await crewIdForRecord(world, record);

  await getCrewContractTabs(world, crewId);
  expectSuccessfulResponse(world, `Contract tabs for planning record ${record.stableId}`);
  const contract = findActiveContract(crewContracts(world.lastResponseBody));
  if (classify && base.hasValidReliever) {
    return {
      ...base,
      crewId,
      expectedStatus: 'CONFIRMED',
      contractId: contract.id,
      contractStatus: contract.status,
      reason: 'Valid reliever and unambiguous active contract.'
    };
  }
  await getCrewContractDetail(world, crewId, contract.id);
  expectSuccessfulResponse(world, `Active contract detail for planning record ${record.stableId}`);
  const tour = tourOfDutyFrom(world.lastResponseBody);
  await getActualTimeline(world, crewId, contract.id);
  expectSuccessfulResponse(world, `Actual timeline for planning record ${record.stableId}`);
  const signOn = actualSignOnFrom(world.lastResponseBody);
  const end = expectedEndDate(signOn, tour);
  const duration = masterPlanningDuration(signOn, end);
  const expected = classify
    ? classifyPlanningStatus({
      hasActiveCrew: true, hasValidReliever: base.hasValidReliever, hasActiveContract: true,
      expectedEndDate: end, today: calendarDate(new Date()), expiringThresholdDays: requiredThreshold()
    })
    : 'UNASSESSED';
  return {
    ...base, crewId, expectedStatus: expected, contractId: contract.id, contractStatus: contract.status,
    actualSignOn: calendarDate(signOn), expectedEndDate: end,
    expectedDuration: duration.contractDurationSpent, expectedExtendedDuration: duration.extendedDuration,
    reason: base.hasValidReliever ? 'Valid reliever and active contract.' : `No valid reliever; active contract ends ${end}.`
  };
}

async function crewIdForRecord(world: RemoraWorld, record: MasterPlanningRecord): Promise<string> {
  const names = [...new Set(record.crewNames)].sort((a, b) => a.localeCompare(b));
  if (names.length !== 1) {
    throw new Error(`Planning record ${record.stableId} has an active crew but no unique crew name for deterministic identity lookup.`);
  }
  const name = names[0]!;
  await searchCrew(world, name);
  expectSuccessfulResponse(world, `Crew identity lookup for planning record ${record.stableId}`);
  const matches = recordsFrom(world.lastResponseBody)
    .map(item => ({ id: crewIdFrom(item), name: crewNameFrom(item) }))
    .filter((item): item is { id: string; name: string } => Boolean(item.id && item.name))
    .filter(item => normalized(item.name) === normalized(name));
  const uniqueIds = [...new Set(matches.map(item => item.id))].sort();
  if (uniqueIds.length === 1) return uniqueIds[0]!;

  const activeCandidates: { id: string; rank?: string; contractId: string }[] = [];
  for (const id of uniqueIds) {
    await getCrewContractTabs(world, id);
    expectSuccessfulResponse(world, `Contract identity lookup for planning record ${record.stableId}`);
    try {
      const active = findActiveContract(crewContracts(world.lastResponseBody));
      activeCandidates.push({
        id,
        contractId: active.id,
        rank: stringField(active.raw, ['rankName', 'rank_name'])
      });
    } catch {
      // An identity without one unambiguous active contract cannot be selected.
    }
  }
  const candidatesWithMatchingStartDate: string[] = [];
  if (record.startDate) {
    for (const candidate of activeCandidates) {
      await getActualTimeline(world, candidate.id, candidate.contractId);
      expectSuccessfulResponse(world, `Timeline identity lookup for planning record ${record.stableId}`);
      try {
        if (calendarDate(actualSignOnFrom(world.lastResponseBody)) === calendarDate(record.startDate)) {
          candidatesWithMatchingStartDate.push(candidate.id);
        }
      } catch {
        // Without actual sign-on, the candidate cannot prove the planning identity.
      }
    }
  }
  if (candidatesWithMatchingStartDate.length === 1) return candidatesWithMatchingStartDate[0]!;

  const candidatesWithMatchingActiveRank = activeCandidates
    .filter(candidate => candidate.rank && normalized(candidate.rank) === normalized(record.rankName))
    .map(candidate => candidate.id);
  if (candidatesWithMatchingActiveRank.length === 1) return candidatesWithMatchingActiveRank[0]!;
  throw new Error(
    `Planning record ${record.stableId} has ${uniqueIds.length} exact crew-name matches; `
    + `${candidatesWithMatchingStartDate.length} match actual sign-on, and ${candidatesWithMatchingActiveRank.length} have a compatible active contract rank.`
  );
}

function requiredThreshold(): number {
  if (config.expiringThresholdDays === undefined) {
    throw new Error('EXPIRING_THRESHOLD_DAYS is required for EXPIRING classification: no nearly-expired threshold exists in the repository or response contract.');
  }
  return config.expiringThresholdDays;
}

function summaryFrom(payload: unknown): Record<'expired' | 'expiring' | 'confirmed' | 'vacant', number> {
  const body = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(body)) throw new Error('Master Planning summary response must be an object.');
  const result = {} as Record<'expired' | 'expiring' | 'confirmed' | 'vacant', number>;
  for (const key of ['expired', 'expiring', 'confirmed', 'vacant'] as const) {
    const value = numberValue(body[key]);
    if (!Number.isInteger(value) || value! < 0) {
      throw new Error(`Master Planning summary field "${key}" must be a non-negative integer. Received: ${String(body[key])}.`);
    }
    result[key] = value!;
  }
  return result;
}
