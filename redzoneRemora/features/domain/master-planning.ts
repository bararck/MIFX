import { expect } from '@playwright/test';
import {
  activeContract,
  actualTimelineMovement,
  contractIdFrom,
  crewIdFrom,
  crewNameFrom,
  filterReferences,
  masterPlanningDetail,
  masterPlanningRecords,
  type FilterReference,
  type MasterPlanningRecord
} from '../contracts/master-planning.contract';
import { apiEnum, isRecord, normalized, paginationFrom, recordsFrom } from '../contracts/response.contract';
import {
  getCrewContractTabs,
  getActualTimeline,
  getFilterReference,
  getMasterPlanning,
  getMasterPlanningDetail,
  searchCrew
} from '../api/master-planning.client';
import { expectSuccessfulResponse } from '../support/api-client';
import { config } from '../support/config';
import { calendarDate } from './contract-duration.calculator';
import type { FilterName, RemoraWorld, SelectedFilter } from '../support/world';

const queryName: Record<FilterName, string> = {
  rank: 'rankIds',
  vessel: 'vesselIds',
  status: 'status',
  recruiter: 'recruiterKeys'
};

const referenceFilterNames: Exclude<FilterName, 'status'>[] = ['rank', 'vessel', 'recruiter'];

export async function selectCompatibleFilter(world: RemoraWorld, filter: FilterName): Promise<void> {
  await selectCompatibleFilterSet(world, [filter]);
}

export async function selectCompatibleFilterPair(world: RemoraWorld): Promise<void> {
  const baseline = await loadSelectionRecords(world);
  const references = await loadFilterReferences(world, referenceFilterNames);
  const preferredPairs: FilterName[][] = [
    ['rank', 'vessel'],
    ['rank', 'recruiter'],
    ['vessel', 'recruiter'],
    ['rank', 'status'],
    ['vessel', 'status'],
    ['recruiter', 'status']
  ];

  for (const pair of preferredPairs) {
    const selection = findCompatibleSelection(baseline, pair, references);
    if (selection) {
      applySelection(world, selection);
      return;
    }
  }

  throw new Error('No compatible pair of Master Planning filters was found in the current test data.');
}

export async function selectAllCompatibleFilters(world: RemoraWorld): Promise<void> {
  await selectCompatibleFilterSet(world, ['rank', 'vessel', 'status', 'recruiter']);
}

export function selectExplicitStatus(world: RemoraWorld, status: string): void {
  const value = apiEnum(status);
  world.selectedFilters = {
    status: {
      name: 'status',
      queryName: queryName.status,
      queryValue: value,
      label: status,
      reference: status
    }
  };
  world.activeFilters = { [queryName.status]: value };
}

export async function loadMasterPlanningPage(world: RemoraWorld): Promise<void> {
  await getMasterPlanning(world, {}, 10);
  expectSuccessfulResponse(world, 'Master planning request');
  storePagination(world);
}

export async function loadFilteredMasterPlanning(world: RemoraWorld): Promise<void> {
  await getMasterPlanning(world, world.activeFilters, 10);
  expectSuccessfulResponse(world, 'Filtered master planning request');
}

export function storeAnalytics(world: RemoraWorld): void {
  const body = isRecord(world.lastResponseBody) ? world.lastResponseBody : {};
  const candidate = isRecord(body.data) ? body.data : body;
  const analytics = Object.fromEntries(
    Object.entries(candidate).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
  ) as Record<string, number>;

  expect(Object.keys(analytics), 'Analytics response must contain numeric status totals').not.toHaveLength(0);
  world.analytics = analytics;
}

export function storeOnTrackTotal(world: RemoraWorld): void {
  const pagination = paginationFrom(world.lastResponseBody);
  expect(pagination, 'On Track response must include pagination metadata').toBeTruthy();
  world.onTrackTotal = pagination!.totalItems;
}

export function assertPagination(world: RemoraWorld): void {
  const pagination = world.masterPlanning;
  expect(pagination, 'Master planning pagination must be captured before it is asserted').toBeTruthy();
  expect(pagination!.page).toBe(1);
  expect(pagination!.limit).toBe(10);
  expect(pagination!.totalItems).toBeGreaterThanOrEqual(0);
  expect(pagination!.totalPages).toBe(Math.ceil(pagination!.totalItems / pagination!.limit));
}

export function assertOnTrackRecords(world: RemoraWorld): void {
  const records = resultRecords(world);

  if (world.onTrackTotal === 0) {
    expect(records, 'An empty On Track result is valid only when pagination total is zero').toHaveLength(0);
    return;
  }

  expect(records, 'On Track pagination reports records but the first page is empty').not.toHaveLength(0);
  for (const record of records) {
    expect(normalized(record.status), 'On Track query returned a record with another status').toBe('ontrack');
  }
}

export function assertAnalyticTotal(world: RemoraWorld): void {
  const analyticTotal = Object.values(world.analytics).reduce((total, value) => total + value, 0);
  expect(world.masterPlanning, 'Master planning pagination must be loaded before comparing totals').toBeTruthy();
  expect(world.onTrackTotal, 'On Track total must be loaded before comparing totals').not.toBeUndefined();
  expect(
    world.masterPlanning!.totalItems,
    `Master planning total must equal analytic (${analyticTotal}) + On Track (${world.onTrackTotal})`
  ).toBe(analyticTotal + world.onTrackTotal!);
}

export function assertFilteredRecords(world: RemoraWorld): void {
  const records = resultRecords(world);
  const selections = Object.values(world.selectedFilters) as SelectedFilter[];

  expect(selections, 'At least one selected filter is required before asserting a filtered response').not.toHaveLength(0);
  expect(records, 'A dynamically selected compatible filter must return at least one record').not.toHaveLength(0);

  for (const record of records) {
    for (const selection of selections) assertRecordMatchesSelection(record, selection);
  }
}

export async function selectCrewNameFromMasterPlanning(world: RemoraWorld): Promise<void> {
  const records = await loadSelectionRecords(world);
  const name = uniqueCrewNames(records)[0];
  expect(name, 'Master planning must contain at least one crew name to test search').toBeTruthy();
  world.selectedCrew = { name: name! };
}

export function assertSearchResultsContainSelectedCrew(world: RemoraWorld): void {
  const selectedName = world.selectedCrew?.name;
  expect(selectedName, 'A crew name must be selected before asserting search results').toBeTruthy();

  const records = resultRecords(world);
  expect(records, 'A search for an existing crew name must return at least one record').not.toHaveLength(0);
  for (const record of records) {
    expect(
      record.crewNames.map(normalized),
      `Search result ${record.stableId} does not contain crew ${selectedName}`
    ).toContain(normalized(selectedName));
  }
}

/** Select a list row whose detail can be addressed without hard-coded IDs.
 * The list must expose exactly one crew name so its identity remains clear in
 * the detail response even when the list omits a crew ID. */
export async function selectMasterPlanningRecordForDetail(world: RemoraWorld): Promise<void> {
  const records = await loadSelectionRecords(world);
  const candidates = records.filter(record =>
    Boolean(record.rankId && record.vesselPlanId && record.rankName && record.vesselName && record.status)
    && record.crewNames.length === 1
    && Boolean(record.startDate && record.expectedEndDate)
    && record.contractDurationSpent !== undefined
    && record.extendedDuration !== undefined
  );
  expect(
    candidates,
    'Master Planning list must contain a deterministic crew row with vessel-rank, vessel-plan, dates, and duration for detail comparison.'
  ).not.toHaveLength(0);
  world.selectedPlanningRecord = candidates[0];
}

export async function loadSelectedMasterPlanningDetail(world: RemoraWorld): Promise<void> {
  const record = world.selectedPlanningRecord;
  if (!record?.rankId || !record.vesselPlanId) {
    throw new Error('A Master Planning list record with vessel-rank and vessel-plan identifiers must be selected before retrieving its detail.');
  }
  await getMasterPlanningDetail(world, record.rankId, record.vesselPlanId);
  expectSuccessfulResponse(world, `Master Planning detail for list record ${record.stableId}`);
}

export function assertSelectedMasterPlanningDetailMatchesList(world: RemoraWorld): void {
  const record = world.selectedPlanningRecord;
  expect(record, 'A Master Planning list record must be selected before asserting its detail.').toBeTruthy();
  const detail = masterPlanningDetail(world.lastResponseBody);

  expect(detail.crewId, 'Vessel-rank detail must expose the selected crew identifier.').toBeTruthy();
  expect(normalized(detail.crewName), 'Vessel-rank detail crew name must match the Master Planning list crew.').toBe(normalized(record!.crewNames[0]));
  if (record!.crewId) expect(detail.crewId, 'Vessel-rank detail crew ID must match the Master Planning list crew ID.').toBe(record!.crewId);
  expect(normalized(detail.vesselName), 'Vessel-rank detail vessel must match the Master Planning list vessel.').toBe(normalized(record!.vesselName));
  expect(normalized(detail.rankName), 'Vessel-rank detail rank must match the Master Planning list rank.').toBe(normalized(record!.rankName));
  expect(normalized(detail.status), 'Vessel-rank detail status must match the Master Planning list status.').toBe(normalized(record!.status));
  expect(calendarDate(detail.startDate!), 'Vessel-rank detail start date must match the Master Planning list start date.').toBe(calendarDate(record!.startDate!));
  expect(calendarDate(detail.expectedEndDate!), 'Vessel-rank detail expected end date must match the Master Planning list expected end date.').toBe(calendarDate(record!.expectedEndDate!));
  expect(detail.contractDurationSpent, 'Vessel-rank detail duration must match the Master Planning list duration.').toBe(record!.contractDurationSpent);
  expect(detail.extendedDuration, 'Vessel-rank detail extension must match the Master Planning list extension.').toBe(record!.extendedDuration);
  if (record!.totalReliever !== undefined) {
    expect(
      relieverCount(detail.reliever),
      'Vessel-rank detail reliever count must match totalReliever in the Master Planning list.'
    ).toBe(record!.totalReliever);
  }
}

export async function selectTimelineCompatibleCrew(world: RemoraWorld): Promise<void> {
  const records = await loadSelectionRecords(world);
  const candidates = records
    .flatMap(record => record.movement
      ? record.crewNames.map(name => ({ name, movement: record.movement!, recordId: record.stableId }))
      : [])
    .sort((left, right) => `${left.recordId}|${left.name}`.localeCompare(`${right.recordId}|${right.name}`));

  expect(candidates, 'Master planning must contain a crew with Sign On or Rotational movement').not.toHaveLength(0);

  for (const candidate of candidates.slice(0, config.timelineCandidateLimit)) {
    await searchCrew(world, candidate.name);
    expectSuccessfulResponse(world, `Crew search for ${candidate.name}`);

    const exactCrews = uniqueExactCrewMatches(world.lastResponseBody, candidate.name);
    if (exactCrews.length !== 1) continue;

    const crew = exactCrews[0];
    if (!crew) continue;
    await getCrewContractTabs(world, crew.id);
    expectSuccessfulResponse(world, `Contract tab lookup for crew ${crew.id}`);

    const contract = activeContract(recordsFrom(world.lastResponseBody));
    const contractId = contract && contractIdFrom(contract);
    if (!contractId) continue;

    await getActualTimeline(world, crew.id, contractId);
    expectSuccessfulResponse(world, `Actual timeline lookup for crew ${crew.id}`);
    if (actualTimelineMovement(world.lastResponseBody) !== candidate.movement) continue;

    world.selectedCrew = {
      id: crew.id,
      name: candidate.name,
      contractId,
      movement: candidate.movement
    };
    return;
  }

  throw new Error(
    'No deterministic crew with an exact unique identity, active contract, and actual timeline compatible with its Master Planning movement was found in the first selection page.'
  );
}

export function assertTimelineMatchesSelectedMovement(world: RemoraWorld): void {
  const expectedMovement = world.selectedCrew?.movement;
  expect(expectedMovement, 'A timeline-compatible crew must be selected before asserting its timeline').toBeTruthy();

  const actualMovement = actualTimelineMovement(world.lastResponseBody);
  expect(actualMovement, 'Actual timeline must contain a Sign On date or at least one rotation').toBeTruthy();
  expect(actualMovement, 'Master Planning movement must match the active contract actual timeline').toBe(expectedMovement);
}

async function selectCompatibleFilterSet(world: RemoraWorld, filters: FilterName[]): Promise<void> {
  const uniqueFilters = [...new Set(filters)];
  const baseline = await loadSelectionRecords(world);
  const referenceNames = uniqueFilters.filter(
    (filter): filter is Exclude<FilterName, 'status'> => filter !== 'status'
  );
  const references = await loadFilterReferences(world, referenceNames);
  const selection = findCompatibleSelection(baseline, uniqueFilters, references);

  expect(
    selection,
    `No single master planning record has compatible ${uniqueFilters.join(', ')} filter values in current test data.`
  ).toBeTruthy();
  applySelection(world, selection!);
}

async function loadSelectionRecords(world: RemoraWorld): Promise<MasterPlanningRecord[]> {
  await getMasterPlanning(world, {}, config.selectionPageLimit);
  expectSuccessfulResponse(world, 'Master planning selection request');

  const records = masterPlanningRecords(recordsFrom(world.lastResponseBody))
    .sort((left, right) => left.stableId.localeCompare(right.stableId));
  expect(records, 'Master planning selection page must contain at least one record').not.toHaveLength(0);
  return records;
}

async function loadFilterReferences(
  world: RemoraWorld,
  filters: Exclude<FilterName, 'status'>[]
): Promise<Partial<Record<Exclude<FilterName, 'status'>, FilterReference[]>>> {
  const references: Partial<Record<Exclude<FilterName, 'status'>, FilterReference[]>> = {};

  for (const filter of filters) {
    await getFilterReference(world, filter);
    expectSuccessfulResponse(world, `${filter} filter reference request`);
    references[filter] = filterReferences(filter, recordsFrom(world.lastResponseBody));
    expect(references[filter], `${filter} filter reference must contain usable values`).not.toHaveLength(0);
  }

  return references;
}

function findCompatibleSelection(
  records: MasterPlanningRecord[],
  filters: FilterName[],
  references: Partial<Record<Exclude<FilterName, 'status'>, FilterReference[]>>
): SelectedFilter[] | undefined {
  for (const record of records) {
    const selections = filters.map(filter => selectionFor(record, filter, references));
    if (selections.every((selection): selection is SelectedFilter => Boolean(selection))) return selections;
  }

  return undefined;
}

function selectionFor(
  record: MasterPlanningRecord,
  filter: FilterName,
  references: Partial<Record<Exclude<FilterName, 'status'>, FilterReference[]>>
): SelectedFilter | undefined {
  if (filter === 'status') {
    if (!record.status) return undefined;
    return {
      name: filter,
      queryName: queryName[filter],
      queryValue: apiEnum(record.status),
      label: record.status,
      reference: record.status
    };
  }

  const reference = references[filter]?.find(candidate => {
    if (filter === 'rank') return normalized(candidate.label) === normalized(record.rankName);
    if (filter === 'vessel') return normalized(candidate.queryValue) === normalized(record.vesselId);
    return record.recruiterNames.some(name => normalized(name) === normalized(candidate.label));
  });
  if (!reference) return undefined;

  return {
    name: filter,
    queryName: queryName[filter],
    queryValue: reference.queryValue,
    label: reference.label,
    reference: reference.raw
  };
}

function applySelection(world: RemoraWorld, selections: SelectedFilter[]): void {
  world.selectedFilters = Object.fromEntries(selections.map(selection => [selection.name, selection]));
  world.activeFilters = Object.fromEntries(selections.map(selection => [selection.queryName, selection.queryValue]));
  world.requestLog.push(JSON.stringify({ action: 'Selected compatible filters', filterNames: selections.map(selection => selection.name) }));
}

function storePagination(world: RemoraWorld): void {
  const pagination = paginationFrom(world.lastResponseBody);
  expect(pagination, 'Master planning response must include pagination metadata').toBeTruthy();
  world.masterPlanning = pagination;
}

function resultRecords(world: RemoraWorld): MasterPlanningRecord[] {
  return masterPlanningRecords(recordsFrom(world.lastResponseBody));
}

function assertRecordMatchesSelection(record: MasterPlanningRecord, selection: SelectedFilter): void {
  if (selection.name === 'rank') {
    expect(normalized(record.rankName), `Record ${record.stableId} rank does not match selected rank`).toBe(normalized(selection.label));
    return;
  }

  if (selection.name === 'vessel') {
    expect(normalized(record.vesselId), `Record ${record.stableId} vessel does not match selected vessel`).toBe(normalized(selection.queryValue));
    return;
  }

  if (selection.name === 'recruiter') {
    expect(
      record.recruiterNames.map(normalized),
      `Record ${record.stableId} recruiter does not match selected recruiter`
    ).toContain(normalized(selection.label));
    return;
  }

  expect(normalized(record.status), `Record ${record.stableId} status does not match selected status`).toBe(normalized(selection.queryValue));
}

function uniqueCrewNames(records: MasterPlanningRecord[]): string[] {
  return [...new Set(records.flatMap(record => record.crewNames))]
    .sort((left, right) => left.localeCompare(right));
}

function relieverCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') return value.trim() ? 1 : 0;
  if (value && typeof value === 'object') return Object.keys(value).length ? 1 : 0;
  return 0;
}

function uniqueExactCrewMatches(payload: unknown, selectedName: string): { id: string; name: string }[] {
  const matches = recordsFrom(payload)
    .map(record => ({ id: crewIdFrom(record), name: crewNameFrom(record) }))
    .filter((crew): crew is { id: string; name: string } => Boolean(crew.id && crew.name))
    .filter(crew => normalized(crew.name) === normalized(selectedName));

  return [...new Map(matches.map(crew => [crew.id, crew])).values()];
}
