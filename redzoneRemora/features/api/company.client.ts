import { expect } from '@playwright/test';
import { normalized, recordsFrom, stringField } from '../contracts/response.contract';
import { config } from '../support/config';
import { authenticatedHeaders, expectSuccessfulResponse, sendRequest } from '../support/api-client';
import type { JsonRecord, RemoraWorld } from '../support/world';

export async function searchConfiguredCompany(world: RemoraWorld): Promise<void> {
  await sendRequest(world, 'Search configured company', 'GET', '/v1/admin/company', {
    headers: authenticatedHeaders(world),
    params: { page: 1, limit: 25, search: config.targetCompanyName }
  });
  expectSuccessfulResponse(world, 'Company search');
  world.companySearchResults = recordsFrom(world.lastResponseBody);
}

export function expectConfiguredCompanyInSearchResults(world: RemoraWorld): void {
  const company = world.companySearchResults.find(matchesConfiguredCompany);
  expect(
    company,
    `Company search must return configured company ${config.targetCompanyName} (${config.targetCompanyId})`
  ).toBeTruthy();
}

export async function selectConfiguredCompany(world: RemoraWorld): Promise<void> {
  await sendRequest(world, 'Select configured company', 'PATCH', '/v1/admin/company/selected', {
    headers: authenticatedHeaders(world),
    data: { companyId: config.targetCompanyId }
  });
  expectSuccessfulResponse(world, 'Company selection');

  // Some API versions refresh the token after a context change. Preserve it when sent.
  const body = world.lastResponseBody;
  const refreshedToken = body && typeof body === 'object'
    ? stringField(body as JsonRecord, ['token', 'accessToken', 'access_token'])
    : undefined;
  if (refreshedToken) world.token = refreshedToken;

  // Context is set only after the server accepts the selection. Company-scoped clients
  // consume this value instead of reaching into static configuration.
  world.companyId = config.targetCompanyId;
}

export function expectCompanyContext(world: RemoraWorld): void {
  expect(world.companyId).toBe(config.targetCompanyId);
  expect(authenticatedHeaders(world)[config.companyIdHeader]).toBe(config.targetCompanyId);
}

function matchesConfiguredCompany(company: JsonRecord): boolean {
  const id = stringField(company, ['id', 'uuid', 'companyId', 'company_id']);
  const name = stringField(company, ['name', 'companyName', 'company_name']);

  return id === config.targetCompanyId && normalized(name) === normalized(config.targetCompanyName);
}
