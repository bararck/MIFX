import { expect } from '@playwright/test';
import { isRecord, stringField } from '../contracts/response.contract';
import { config } from '../support/config';
import { expectSuccessfulResponse, sendRequest } from '../support/api-client';
import type { RemoraWorld } from '../support/world';

export async function authenticate(world: RemoraWorld): Promise<void> {
  await sendRequest(world, 'Authenticate configured API user', 'POST', '/v1/auth/login', {
    data: {
      email: config.email,
      password: config.password,
      bypassCaptcha: config.bypassCaptcha
    }
  });
  expectSuccessfulResponse(world, 'Login');

  const body = isRecord(world.lastResponseBody) ? world.lastResponseBody : {};
  const nestedData = isRecord(body.data) ? body.data : {};
  const token = stringField(body, ['token', 'accessToken', 'access_token'])
    ?? stringField(nestedData, ['token', 'accessToken', 'access_token']);

  expect(token, 'Login response must include an access token').toBeTruthy();
  world.token = token;
}
