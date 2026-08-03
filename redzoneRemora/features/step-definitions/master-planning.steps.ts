import { Given, Then, When } from '@cucumber/cucumber';
import { getActualTimeline, getMasterPlanning, getMasterPlanningAnalytics } from '../api/master-planning.client';
import {
  assertAnalyticTotal,
  assertFilteredRecords,
  assertOnTrackRecords,
  assertPagination,
  assertSearchResultsContainSelectedCrew,
  assertSelectedMasterPlanningDetailMatchesList,
  assertTimelineMatchesSelectedMovement,
  loadSelectedMasterPlanningDetail,
  loadFilteredMasterPlanning,
  loadMasterPlanningPage,
  selectAllCompatibleFilters,
  selectCompatibleFilter,
  selectCompatibleFilterPair,
  selectCrewNameFromMasterPlanning,
  selectExplicitStatus,
  selectMasterPlanningRecordForDetail,
  selectTimelineCompatibleCrew,
  storeAnalytics,
  storeOnTrackTotal
} from '../domain/master-planning';
import { expectSuccessfulResponse } from '../support/api-client';
import type { FilterName, RemoraWorld } from '../support/world';
import {
  loadPlanningAssignmentData,
  loadPlanningContractData,
  loadPlanningSummaryData,
  loadPlanningStatusData,
  loadPlanningStatusDateData,
  loadVacantPlanningAssignmentData
} from '../domain/master-planning.status';
import {
  assertConfirmedRecordsHaveRelievers,
  assertPlanningDatesAndDuration,
  assertPlanningDetailMatchesCalculatedStatus,
  assertPlanningSummary,
  assertVacantRecordsHaveNoCrew
} from '../domain/master-planning.assertions';
import {
  assertReplacementConfirmed,
  assertReplacementRestored,
  nominateNewCrew,
  proceedSelectedNominee,
  revertCrewReplacement,
  selectCrewReplacementOpportunity
} from '../domain/crew-replacement';

const supportedFilters: FilterName[] = ['rank', 'vessel', 'status', 'recruiter'];

Given('I select a compatible {string} Master Planning filter value', async function (this: RemoraWorld, name: string) {
  await selectCompatibleFilter(this, filterName(name));
});

Given('I select a compatible pair of Master Planning filter values', async function (this: RemoraWorld) {
  await selectCompatibleFilterPair(this);
});

Given('I select a compatible set of all Master Planning filter values', async function (this: RemoraWorld) {
  await selectAllCompatibleFilters(this);
});

Given('I use the {string} Master Planning status', function (this: RemoraWorld, status: string) {
  selectExplicitStatus(this, status);
});

Given('I select a crew name from available master planning records', async function (this: RemoraWorld) {
  await selectCrewNameFromMasterPlanning(this);
});

Given('I select a Master Planning crew record with a compatible vessel-rank detail', async function (this: RemoraWorld) {
  await selectMasterPlanningRecordForDetail(this);
});

Given('I identify a crew with an active contract and compatible master planning movement', async function (this: RemoraWorld) {
  await selectTimelineCompatibleCrew(this);
});

Given('Master Planning status records are available for contract validation', async function (this: RemoraWorld) {
  await loadPlanningStatusData(this);
});

Given('confirmed planning records are available in Master Planning', async function (this: RemoraWorld) {
  await loadPlanningAssignmentData(this);
});

Given('vacant planning records are available in Master Planning', async function (this: RemoraWorld) {
  await loadVacantPlanningAssignmentData(this);
});

Given('active planning contracts are available for date validation', async function (this: RemoraWorld) {
  await loadPlanningContractData(this);
});

Given('Master Planning summary detail records are available', async function (this: RemoraWorld) {
  await loadPlanningSummaryData(this);
});

Given('a compatible planning record is available for each Master Planning status', async function (this: RemoraWorld) {
  await loadPlanningStatusDateData(this);
});

Given('I select an eligible expired or near-expired onboard crew replacement opportunity', async function (this: RemoraWorld) {
  await selectCrewReplacementOpportunity(this);
});

When('I retrieve the Master Planning dashboard analytics', async function (this: RemoraWorld) {
  await getMasterPlanningAnalytics(this);
  expectSuccessfulResponse(this, 'Master Planning dashboard analytics request');
  storeAnalytics(this);
});

When('I retrieve the first master planning page', async function (this: RemoraWorld) {
  await loadMasterPlanningPage(this);
});

When('I retrieve master planning using the selected filters', async function (this: RemoraWorld) {
  await loadFilteredMasterPlanning(this);
});

When('I retrieve master planning filtered by the {string} status', async function (this: RemoraWorld, status: string) {
  selectExplicitStatus(this, status);
  await loadFilteredMasterPlanning(this);
  storeOnTrackTotal(this);
});

When('I search master planning for the selected crew name', async function (this: RemoraWorld) {
  const name = this.selectedCrew?.name;
  if (!name) throw new Error('A crew name must be selected before master planning can be searched.');

  await getMasterPlanning(this, { search: name }, 10);
  expectSuccessfulResponse(this, 'Master planning crew search');
});

When('I retrieve the selected Master Planning vessel-rank detail', async function (this: RemoraWorld) {
  await loadSelectedMasterPlanningDetail(this);
});

When('I retrieve the selected crew active contract timeline', async function (this: RemoraWorld) {
  const crew = this.selectedCrew;
  if (!crew?.id || !crew.contractId) {
    throw new Error('A crew with an active contract must be identified before its timeline can be retrieved.');
  }

  await getActualTimeline(this, crew.id, crew.contractId);
  expectSuccessfulResponse(this, 'Active contract actual timeline request');
});

When('I add a New Crew candidate as nominee for the selected rank', async function (this: RemoraWorld) {
  await nominateNewCrew(this);
});

When('I proceed the selected nominee to Planned', async function (this: RemoraWorld) {
  await proceedSelectedNominee(this);
});

When('I revert the selected Planned crew', async function (this: RemoraWorld) {
  await revertCrewReplacement(this);
});

Then('the master planning pagination is valid', function (this: RemoraWorld) {
  assertPagination(this);
});

Then('the returned On Track records have the On Track status', function (this: RemoraWorld) {
  assertOnTrackRecords(this);
});

Then('the master planning total equals the analytic status total plus On Track', function (this: RemoraWorld) {
  assertAnalyticTotal(this);
});

Then('every returned record matches the selected filters', function (this: RemoraWorld) {
  assertFilteredRecords(this);
});

Then('every returned record contains the selected crew name', function (this: RemoraWorld) {
  assertSearchResultsContainSelectedCrew(this);
});

Then('the vessel-rank detail should match the selected Master Planning crew record', function (this: RemoraWorld) {
  assertSelectedMasterPlanningDetailMatchesList(this);
});

Then('the master planning movement agrees with the active contract actual timeline', function (this: RemoraWorld) {
  assertTimelineMatchesSelectedMovement(this);
});

Then('every confirmed planning record should have a valid reliever', function (this: RemoraWorld) {
  assertConfirmedRecordsHaveRelievers(this);
});

Then('every vacant planning record should have no active crew assignment', function (this: RemoraWorld) {
  assertVacantRecordsHaveNoCrew(this);
});

Then('planning status should match the active contract and reliever rules', function (this: RemoraWorld) {
  assertPlanningDetailMatchesCalculatedStatus(this);
});

Then('planning dates and contract duration should match the active contract', function (this: RemoraWorld) {
  assertPlanningDatesAndDuration(this);
});

Then('the Master Planning summary should match the detailed planning statuses', function (this: RemoraWorld) {
  assertPlanningSummary(this);
});

Then('each planning status should match its active contract and reliever rules', function (this: RemoraWorld) {
  assertPlanningDetailMatchesCalculatedStatus(this);
});

Then('the original onboard crew planning status becomes Confirmed with the selected New Crew as reliever', async function (this: RemoraWorld) {
  await assertReplacementConfirmed(this);
});

Then('the original onboard crew planning status is restored', async function (this: RemoraWorld) {
  await assertReplacementRestored(this);
});

function filterName(value: string): FilterName {
  const normalizedValue = value.trim().toLowerCase();
  if (supportedFilters.includes(normalizedValue as FilterName)) return normalizedValue as FilterName;
  throw new Error(`Unsupported Master Planning filter "${value}". Supported values: ${supportedFilters.join(', ')}.`);
}
