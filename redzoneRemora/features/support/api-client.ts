import { expect, request } from '@playwright/test';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { config } from './config';
import type { RemoraWorld } from './world';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export type ApiRequestOptions = Omit<NonNullable<Parameters<APIRequestContext['fetch']>[1]>, 'method' | 'timeout'>;

const maximumRequestLogEntries = 30;
const sensitiveKey = /password|token|authorization|cookie|secret|api.?key|credential/i;
const sensitiveText = /((?:bearer\s+)|(?:[?&](?:access_?token|token|password|api_?key|secret)=))[^\s&]+/gi;

export async function createApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: config.baseUrl,
    extraHTTPHeaders: { accept: 'application/json' },
    ignoreHTTPSErrors: false,
    timeout: config.requestTimeoutMs
  });
}

export function authenticatedHeaders(world: RemoraWorld): Record<string, string> {
  expect(world.token, 'Login token must exist before calling an authenticated endpoint').toBeTruthy();

  return {
    authorization: `Bearer ${world.token}`,
    ...(world.companyId ? { [config.companyIdHeader]: world.companyId } : {})
  };
}

export function requireCompanyContext(world: RemoraWorld): string {
  expect(world.companyId, 'A company must be selected before calling a company-scoped endpoint').toBeTruthy();
  return world.companyId!;
}

export function companyPath(world: RemoraWorld, template: string): string {
  return template.replace('{companyId}', requireCompanyContext(world));
}

export async function sendRequest(
  world: RemoraWorld,
  action: string,
  method: HttpMethod,
  path: string,
  options: ApiRequestOptions = {}
): Promise<APIResponse> {
  try {
    const response = await world.request.fetch(path, {
      ...options,
      method,
      timeout: config.requestTimeoutMs
    });

    world.lastResponse = response;
    world.lastResponseBody = await responseBody(response);
    appendRequestLog(world, {
      action,
      method,
      url: safeUrl(response.url()),
      status: response.status(),
      response: responseSummary(world.lastResponseBody)
    });

    return response;
  } catch (error) {
    appendRequestLog(world, {
      action,
      method,
      url: safeUrl(path),
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export function expectSuccessfulResponse(world: RemoraWorld, action: string): void {
  expect(world.lastResponse, `${action} did not return an HTTP response`).toBeTruthy();
  expect(
    world.lastResponse!.ok(),
    `${action} failed with HTTP ${world.lastResponse!.status()}. Diagnostic: ${diagnosticSummary(world.lastResponseBody)}`
  ).toBeTruthy();
}

export function diagnosticSummary(value: unknown): string {
  return redact(responseSummary(value));
}

export function redact(value: unknown): string {
  const visited = new WeakSet<object>();

  return JSON.stringify(
    value,
    (key, item) => {
      if (sensitiveKey.test(key)) return '[REDACTED]';
      if (typeof item === 'string') return item.replace(sensitiveText, '$1[REDACTED]');
      if (typeof item === 'object' && item !== null) {
        if (visited.has(item)) return '[CIRCULAR]';
        visited.add(item);
      }
      return item;
    },
    2
  ) ?? 'undefined';
}

async function responseBody(response: APIResponse): Promise<unknown> {
  const rawBody = await response.text();

  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
}

function appendRequestLog(world: RemoraWorld, entry: Record<string, unknown>): void {
  const serialized = redact(entry);
  const boundedEntry = serialized.length > config.diagnosticBodyLimit
    ? `${serialized.slice(0, config.diagnosticBodyLimit)}… [truncated]`
    : serialized;
  world.requestLog.push(boundedEntry);
  if (world.requestLog.length > maximumRequestLogEntries) world.requestLog.shift();
}

function responseSummary(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    return {
      type: 'array',
      itemCount: value.length,
      firstItemKeys: firstRecordKeys(value[0])
    };
  }

  if (typeof value === 'string') return { type: 'text', length: value.length };
  if (typeof value !== 'object' || value === null) return { type: typeof value };

  const record = value as Record<string, unknown>;
  return {
    type: 'object',
    keys: Object.keys(record).sort(),
    data: Array.isArray(record.data)
      ? { type: 'array', itemCount: record.data.length, firstItemKeys: firstRecordKeys(record.data[0]) }
      : isPlainRecord(record.data)
        ? { type: 'object', keys: Object.keys(record.data).sort() }
      : undefined,
    items: Array.isArray(record.items)
      ? {
        type: 'array', itemCount: record.items.length, firstItemKeys: firstRecordKeys(record.items[0]),
        firstItemFieldShapes: firstRecordFieldShapes(record.items[0])
      }
      : undefined
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstRecordKeys(value: unknown): string[] | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.keys(value as Record<string, unknown>).sort()
    : undefined;
}

function firstRecordFieldShapes(value: unknown): Record<string, unknown> | undefined {
  if (!isPlainRecord(value)) return undefined;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fieldShape(item)]));
}

function fieldShape(value: unknown): unknown {
  if (Array.isArray(value)) return {
    type: 'array', itemCount: value.length,
    firstItemKeys: firstRecordKeys(value[0]),
    firstItemShape: fieldShape(value[0])
  };
  if (isPlainRecord(value)) return { type: 'object', keys: Object.keys(value).sort() };
  if (typeof value === 'string') return { type: 'string', uuidLike: isUuidLike(value) };
  return value === null ? 'null' : typeof value;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeUrl(value: string): string {
  try {
    const url = new URL(value, config.baseUrl);
    const queryNames = [...url.searchParams.keys()].sort();
    return `${url.origin}${url.pathname}${queryNames.length ? `?${queryNames.join('&')}` : ''}`;
  } catch {
    return value.split('?')[0] ?? value;
  }
}
