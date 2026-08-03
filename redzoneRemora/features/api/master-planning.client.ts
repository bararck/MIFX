import { config } from '../support/config';
import { authenticatedHeaders, companyPath, sendRequest } from '../support/api-client';
import type { RemoraWorld } from '../support/world';

export async function getMasterPlanningAnalytics(world: RemoraWorld): Promise<void> {
  await sendRequest(
    world,
    'Get Master Planning dashboard analytics',
    'GET',
    companyPath(world, '/v1/company/{companyId}/dashboard/analytic'),
    { headers: authenticatedHeaders(world) }
  );
}

export async function getMasterPlanning(
  world: RemoraWorld,
  filters: Record<string, string> = {},
  limit = 10,
  page = 1
): Promise<void> {
  await sendRequest(
    world,
    'Get master planning list',
    'GET',
    // The backend route retains its historical vessel-rank segment. It is the
    // Master Planning list from the business and test perspective.
    companyPath(world, '/v2/company/{companyId}/vessel-rank/master-planning-list'),
    {
      headers: authenticatedHeaders(world),
      params: { page, limit, ...filters }
    }
  );
}

export async function getMasterPlanningDetail(
  world: RemoraWorld,
  vesselRankId: string,
  vesselPlanId: string
): Promise<void> {
  await sendRequest(
    world,
    'Get Master Planning vessel-rank detail',
    'GET',
    companyPath(world, `/v1/company/{companyId}/dashboard/vessel-rank/${vesselRankId}`),
    {
      headers: authenticatedHeaders(world),
      params: { vesselPlanId }
    }
  );
}

export async function getFilterReference(
  world: RemoraWorld,
  filter: 'rank' | 'vessel' | 'recruiter'
): Promise<void> {
  const paths = {
    rank: '/v1/company/{companyId}/rank',
    vessel: '/v1/company/{companyId}/dashboard/filter/vessel',
    recruiter: '/v1/company/{companyId}/dashboard/filter/recruiter'
  } as const;

  await sendRequest(
    world,
    `Load ${filter} filter reference`,
    'GET',
    companyPath(world, paths[filter]),
    {
      headers: authenticatedHeaders(world),
      ...(filter === 'vessel' ? { params: { limit: config.filterReferenceLimit } } : {})
    }
  );
}

export async function searchCrew(world: RemoraWorld, name: string): Promise<void> {
  await sendRequest(
    world,
    'Search crew details',
    'POST',
    companyPath(world, '/v1/company/{companyId}/crew/data'),
    {
      headers: authenticatedHeaders(world),
      params: { page: 1, limit: 25 },
      data: { search: name }
    }
  );
}

export async function getCrewContractTabs(world: RemoraWorld, crewId: string): Promise<void> {
  await sendRequest(
    world,
    'Get crew contract tabs',
    'GET',
    companyPath(world, `/v1/company/{companyId}/crew/${crewId}/contract/tabs`),
    { headers: authenticatedHeaders(world) }
  );
}

/** Contract detail is deliberately separate from the tab list: calculations must
 * use the active contract's own Tour of Duty, never a list-row approximation. */
export async function getCrewContractDetail(world: RemoraWorld, crewId: string, contractId: string): Promise<void> {
  await sendRequest(
    world,
    'Get active crew contract detail',
    'GET',
    companyPath(world, `/v1/company/{companyId}/crew/${crewId}/contract/${contractId}`),
    { headers: authenticatedHeaders(world) }
  );
}

export async function getActualTimeline(world: RemoraWorld, crewId: string, contractId: string): Promise<void> {
  await sendRequest(
    world,
    'Get active contract actual timeline',
    'GET',
    companyPath(world, `/v1/company/{companyId}/crew/${crewId}/contract/${contractId}/actual-timeline`),
    { headers: authenticatedHeaders(world) }
  );
}

export async function getVesselPlanTab(
  world: RemoraWorld,
  vesselId: string,
  tab: 'onboard' | 'planned' | 'nominee'
): Promise<void> {
  await sendRequest(
    world,
    `Get vessel ${tab} plan`,
    'GET',
    companyPath(world, `/v1/company/{companyId}/vessel/${vesselId}/plan/${tab}`),
    { headers: authenticatedHeaders(world), params: { sort: 'RANK' } }
  );
}

export async function getNewCrewCandidates(world: RemoraWorld, vesselRankId: string): Promise<void> {
  await sendRequest(
    world,
    'Get new crew candidates for vessel rank',
    'GET',
    companyPath(world, `/v1/company/{companyId}/vessel-rank/${vesselRankId}/plan/candidate`),
    { headers: authenticatedHeaders(world), params: { page: 1, limit: 20, type: 'NEW' } }
  );
}

export async function addNominee(world: RemoraWorld, vesselId: string, vesselRankId: string, crewId: string): Promise<void> {
  await sendRequest(
    world,
    'Add new crew candidate as nominee',
    'POST',
    companyPath(world, `/v1/company/{companyId}/vessel/${vesselId}/plan/nominee`),
    { headers: authenticatedHeaders(world), data: { vesselRankId, crewIds: [crewId] } }
  );
}

export async function proceedNominee(world: RemoraWorld, vesselId: string, vesselPlanId: string): Promise<void> {
  await sendRequest(
    world,
    'Proceed nominee to planned',
    'PATCH',
    companyPath(world, `/v1/company/{companyId}/vessel/${vesselId}/plan/nominee/proceed`),
    { headers: authenticatedHeaders(world), data: { vesselPlanIds: [vesselPlanId] } }
  );
}

export async function revertPlanned(world: RemoraWorld, vesselId: string, vesselPlanId: string): Promise<void> {
  await sendRequest(
    world,
    'Revert planned crew',
    'PATCH',
    companyPath(world, `/v1/company/{companyId}/vessel/${vesselId}/plan/planned/revert`),
    { headers: authenticatedHeaders(world), data: { vesselPlanIds: [vesselPlanId] } }
  );
}
