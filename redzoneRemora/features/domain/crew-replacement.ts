import { expect } from '@playwright/test';
import {
  addNominee,
  getMasterPlanning,
  getNewCrewCandidates,
  getVesselPlanTab,
  proceedNominee,
  revertPlanned
} from '../api/master-planning.client';
import { masterPlanningRecords, type MasterPlanningRecord } from '../contracts/master-planning.contract';
import { isRecord, normalized, recordsFrom, stringField, stringValue } from '../contracts/response.contract';
import { expectSuccessfulResponse } from '../support/api-client';
import type { CrewReplacementTransaction, JsonRecord, RemoraWorld } from '../support/world';

const eligibleStatuses = ['EXPIRED', 'EXPIRING'] as const;

/** Select one real replacement opportunity only when all three vessel tabs prove
 * the same rank is safe to exercise. The selection is deterministic by status,
 * vessel, rank, and crew name. */
export async function selectCrewReplacementOpportunity(world: RemoraWorld): Promise<void> {
  const rejected: string[] = [];
  for (const status of eligibleStatuses) {
    await getMasterPlanning(world, { status }, 50);
    expectSuccessfulResponse(world, `${status} Master Planning list request`);
    const candidates = masterPlanningRecords(recordsFrom(world.lastResponseBody))
      .filter(record => record.status?.trim().toUpperCase() === status)
      .filter(record => Boolean(record.vesselId && record.rankId && uniqueCrewName(record)))
      .sort(compareRecords);

    for (const record of candidates) {
      try {
        const transaction = await compatibleOpportunity(world, record, status);
        world.crewReplacement = transaction;
        return;
      } catch (error) {
        rejected.push(`${record.stableId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  throw new Error(
    `No safe EXPIRED or EXPIRING crew replacement opportunity is available. `
    + `Checked ${rejected.length} records. Rejections: ${rejected.slice(0, 10).join(' | ')}`
  );
}

export async function nominateNewCrew(world: RemoraWorld): Promise<void> {
  const transaction = requireTransaction(world);
  await getNewCrewCandidates(world, transaction.vesselRankId);
  expectSuccessfulResponse(world, 'New crew candidate request');
  const candidate = recordsFrom(world.lastResponseBody)
    .map(row => ({ id: candidateId(row), name: crewName(row) }))
    .filter((row): row is { id: string; name: string } => Boolean(row.id && row.name))
    .filter(row => normalized(row.name) !== normalized(transaction.originalCrewName))
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))[0];
  expect(candidate, `No eligible NEW crew candidate is available for rank ${transaction.vesselRankId}.`).toBeTruthy();

  transaction.candidateCrewId = candidate!.id;
  transaction.candidateCrewName = candidate!.name;
  await addNominee(world, transaction.vesselId, transaction.vesselRankId, candidate!.id);
  expectSuccessfulResponse(world, 'Add nominee request');

  const vesselPlanId = vesselPlanIdFrom(world.lastResponseBody) ?? await nominatedPlanId(world, transaction, candidate!);
  expect(vesselPlanId, 'The added NEW crew candidate must appear in Nominee with a vesselPlanId.').toBeTruthy();
  transaction.nomineeVesselPlanId = vesselPlanId;
}

export async function proceedSelectedNominee(world: RemoraWorld): Promise<void> {
  const transaction = requireTransaction(world);
  if (!transaction.nomineeVesselPlanId) throw new Error('Nominee vesselPlanId is required before proceeding the candidate.');
  await proceedNominee(world, transaction.vesselId, transaction.nomineeVesselPlanId);
  expectSuccessfulResponse(world, 'Proceed nominee request');
  transaction.proceeded = true;
}

export async function assertReplacementConfirmed(world: RemoraWorld): Promise<void> {
  const transaction = requireTransaction(world);
  const record = await findTargetMasterPlanningRecord(world, transaction);
  expect(record.status?.trim().toUpperCase(), 'Replacement must change the original crew planning status to CONFIRMED.').toBe('CONFIRMED');
  expect(record.totalReliever ?? relieverCount(record.reliever), 'Confirmed replacement must have at least one reliever.').toBeGreaterThan(0);
  expect(transaction.candidateCrewName, 'The selected New Crew candidate name must be retained for reliever verification.').toBeTruthy();
  expect(
    relieverNames(record.reliever).map(normalized),
    'Confirmed planning reliever name must match the New Crew candidate that was proceeded to Planned.'
  ).toContain(normalized(transaction.candidateCrewName));
}

export async function revertCrewReplacement(world: RemoraWorld): Promise<void> {
  const transaction = requireTransaction(world);
  if (!transaction.proceeded || !transaction.nomineeVesselPlanId) return;
  await revertPlanned(world, transaction.vesselId, transaction.nomineeVesselPlanId);
  expectSuccessfulResponse(world, 'Revert planned crew request');
  transaction.proceeded = false;
}

/** Idempotent final safeguard: a failed assertion must not leave a nominee in
 * Planned. It intentionally does nothing until a successful proceed occurred. */
export async function revertCrewReplacementIfNeeded(world: RemoraWorld): Promise<void> {
  if (!world.request || !world.crewReplacement?.proceeded) return;
  await revertCrewReplacement(world);
}

export async function assertReplacementRestored(world: RemoraWorld): Promise<void> {
  const transaction = requireTransaction(world);
  const record = await findTargetMasterPlanningRecord(world, transaction);
  expect(record.status?.trim().toUpperCase(), 'Reverting the planned crew must restore the prior planning status.').toBe(transaction.originalStatus);
  expect(record.totalReliever ?? relieverCount(record.reliever), 'Reverted replacement must not retain a reliever.').toBe(0);
}

async function compatibleOpportunity(
  world: RemoraWorld,
  record: MasterPlanningRecord,
  status: 'EXPIRED' | 'EXPIRING'
): Promise<CrewReplacementTransaction> {
  const vesselId = record.vesselId!;
  const vesselRankId = record.rankId!;
  const originalCrewName = uniqueCrewName(record)!;

  await getVesselPlanTab(world, vesselId, 'onboard');
  expectSuccessfulResponse(world, 'Onboard plan request');
  if (!recordsFrom(world.lastResponseBody).some(row => sameRank(row, vesselRankId) && rowContainsCrew(row, undefined, originalCrewName))) {
    throw new Error('Original onboard crew is absent from the same vessel rank.');
  }

  await getVesselPlanTab(world, vesselId, 'planned');
  expectSuccessfulResponse(world, 'Planned plan request');
  if (!rankIsEmpty(recordsFrom(world.lastResponseBody), vesselRankId)) {
    throw new Error('The same vessel rank is not empty in Planned.');
  }

  await getVesselPlanTab(world, vesselId, 'nominee');
  expectSuccessfulResponse(world, 'Nominee plan request');
  if (!rankIsEmpty(recordsFrom(world.lastResponseBody), vesselRankId)) {
    throw new Error('The same vessel rank is not empty in Nominee.');
  }
  return { vesselId, vesselRankId, originalCrewName, originalStatus: status, proceeded: false };
}

async function findTargetMasterPlanningRecord(world: RemoraWorld, transaction: CrewReplacementTransaction): Promise<MasterPlanningRecord> {
  await getMasterPlanning(world, { search: transaction.originalCrewName }, 50);
  expectSuccessfulResponse(world, 'Master Planning replacement status verification request');
  const record = masterPlanningRecords(recordsFrom(world.lastResponseBody)).find(candidate =>
    candidate.vesselId === transaction.vesselId
    && candidate.rankId === transaction.vesselRankId
    && candidate.crewNames.some(name => normalized(name) === normalized(transaction.originalCrewName))
  );
  expect(record, 'The original onboard crew must remain discoverable in Master Planning for the selected vessel rank.').toBeTruthy();
  return record!;
}

async function nominatedPlanId(
  world: RemoraWorld,
  transaction: CrewReplacementTransaction,
  candidate: { id: string; name: string }
): Promise<string | undefined> {
  // UAT can acknowledge the POST before the Nominee read model has refreshed.
  // The rank was verified empty immediately before the POST, so one row on that
  // rank is a safe fallback even when its crew fields use another response shape.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await getVesselPlanTab(world, transaction.vesselId, 'nominee');
    expectSuccessfulResponse(world, 'Nominee plan verification request');
    const rankRows = recordsFrom(world.lastResponseBody).filter(row => sameRank(row, transaction.vesselRankId));
    const matched = rankRows.find(row => rowContainsCrew(row, candidate.id, candidate.name));
    const nomination = matched ?? (rankRows.length === 1 ? rankRows[0] : undefined);
    const vesselPlanId = nomination && vesselPlanIdFrom(nomination);
    if (vesselPlanId) return vesselPlanId;
    if (attempt < 4) await pause(1_000);
  }
  return undefined;
}

function rankIsEmpty(rows: JsonRecord[], vesselRankId: string): boolean {
  const matches = rows.filter(row => sameRank(row, vesselRankId));
  // The plan tabs return an empty array when no record exists for a rank. A
  // missing row is therefore the canonical empty state, not a failed lookup.
  return matches.every(row => !rowContainsCrew(row));
}

function sameRank(row: JsonRecord, vesselRankId: string): boolean {
  const directMatch = deepFieldValues(row, ['vesselRankId', 'vessel_rank_id', 'rankId', 'rank_id', 'positionId'])
    .some(value => value === vesselRankId);
  if (directMatch) return true;

  return nestedRankObjects(row).some(rank => candidateId(rank) === vesselRankId);
}

function rowContainsCrew(row: JsonRecord, expectedId?: string, expectedName?: string): boolean {
  const entries = crewEntries(row, Boolean(expectedName));
  if (!expectedId && !expectedName) return entries.length > 0;
  return (!expectedId || entries.some(entry => entry.id === expectedId))
    && (!expectedName || entries.some(entry => normalized(entry.name) === normalized(expectedName)));
}

function crewEntries(row: JsonRecord, includeGenericNames: boolean): { id?: string; name?: string }[] {
  const direct = [{ id: crewId(row), name: crewSpecificName(row) }];
  const nested = ['crew', 'candidate', 'nominee', 'reliever'].flatMap(key => isRecord(row[key]) ? [row[key] as JsonRecord] : [])
    .map(value => ({ id: candidateId(value), name: crewName(value) }));
  const ids = deepFieldValues(row, ['crewId', 'crew_id', 'crewUuid', 'crewUUID']);
  const names = deepFieldValues(row, ['crewName', 'crew_name', 'fullName', 'full_name', 'crewNames']);
  if (includeGenericNames) names.push(...deepFieldValues(row, ['name']));
  return [
    ...direct,
    ...nested,
    ...ids.map(id => ({ id, name: undefined })),
    ...names.map(name => ({ id: undefined, name }))
  ].filter(entry => Boolean(entry.id || entry.name));
}

function crewId(row: JsonRecord): string | undefined {
  return stringField(row, ['crewId', 'crew_id', 'crewUuid', 'crewUUID']);
}

function candidateId(row: JsonRecord): string | undefined {
  return crewId(row) ?? stringField(row, ['id', 'uuid']);
}

function crewName(row: JsonRecord): string | undefined {
  return stringField(row, ['crewName', 'crew_name', 'fullName', 'full_name', 'name']);
}

function crewSpecificName(row: JsonRecord): string | undefined {
  return stringField(row, ['crewName', 'crew_name', 'fullName', 'full_name']);
}

function deepFieldValues(value: unknown, fieldNames: string[]): string[] {
  const wanted = new Set(fieldNames.map(normalized));
  const values: string[] = [];
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!isRecord(current)) return;
    for (const [key, item] of Object.entries(current)) {
      if (wanted.has(normalized(key))) {
        if (Array.isArray(item)) item.map(stringValue).filter((entry): entry is string => Boolean(entry)).forEach(entry => values.push(entry));
        else {
          const entry = stringValue(item);
          if (entry) values.push(entry);
        }
      }
      visit(item);
    }
  };
  visit(value);
  return values;
}

function nestedRankObjects(value: unknown): JsonRecord[] {
  const ranks: JsonRecord[] = [];
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!isRecord(current)) return;
    for (const [key, item] of Object.entries(current)) {
      if (['vesselrank', 'vessel_rank', 'position'].includes(normalized(key)) && isRecord(item)) ranks.push(item);
      visit(item);
    }
  };
  visit(value);
  return ranks;
}

function vesselPlanIdFrom(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = vesselPlanIdFrom(entry);
      if (found) return found;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  const direct = stringField(value, ['vesselPlanId', 'vessel_plan_id']);
  if (direct) return direct;
  for (const entry of Object.values(value)) {
    const found = vesselPlanIdFrom(entry);
    if (found) return found;
  }
  return undefined;
}

function uniqueCrewName(record: MasterPlanningRecord): string | undefined {
  const names = [...new Set(record.crewNames.map(name => name.trim()).filter(Boolean))];
  return names.length === 1 ? names[0] : undefined;
}

function relieverCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (isRecord(value)) return Object.keys(value).length ? 1 : 0;
  return stringValue(value) ? 1 : 0;
}

function relieverNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(relieverNames);
  const direct = stringValue(value);
  if (direct) return [direct];
  if (!isRecord(value)) return [];
  return deepFieldValues(value, ['crewName', 'crew_name', 'fullName', 'full_name', 'name']);
}

function compareRecords(left: MasterPlanningRecord, right: MasterPlanningRecord): number {
  return `${left.vesselId}|${left.rankId}|${left.crewNames.join('|')}`
    .localeCompare(`${right.vesselId}|${right.rankId}|${right.crewNames.join('|')}`);
}

function requireTransaction(world: RemoraWorld): CrewReplacementTransaction {
  if (!world.crewReplacement) throw new Error('A crew replacement opportunity must be selected first.');
  return world.crewReplacement;
}

function pause(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
