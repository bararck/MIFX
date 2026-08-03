import { Given, Then, When } from '@cucumber/cucumber';
import { authenticate } from '../api/auth.client';
import {
  expectCompanyContext,
  expectConfiguredCompanyInSearchResults,
  searchConfiguredCompany,
  selectConfiguredCompany
} from '../api/company.client';
import { expectSuccessfulResponse } from '../support/api-client';
import type { RemoraWorld } from '../support/world';

Given('I authenticate to Remora as the configured API user', async function (this: RemoraWorld) {
  await authenticate(this);
});

Given('I am authenticated in the configured company context', async function (this: RemoraWorld) {
  await authenticate(this);
  await selectConfiguredCompany(this);
  expectCompanyContext(this);
});

When('I search companies using the configured company name', async function (this: RemoraWorld) {
  await searchConfiguredCompany(this);
});

Then('the configured company is returned by the search', function (this: RemoraWorld) {
  expectConfiguredCompanyInSearchResults(this);
});

When('I select the configured company', async function (this: RemoraWorld) {
  await selectConfiguredCompany(this);
});

Then('the company selection response is successful', function (this: RemoraWorld) {
  expectSuccessfulResponse(this, 'Company selection');
});

Then('the active company context is available for subsequent requests', function (this: RemoraWorld) {
  expectCompanyContext(this);
});
