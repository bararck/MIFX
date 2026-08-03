import 'dotenv/config';

type TargetEnvironment = 'local' | 'dev' | 'sit' | 'uat' | 'staging' | 'production';

const supportedEnvironments = new Set<TargetEnvironment>([
  'local',
  'dev',
  'sit',
  'uat',
  'staging',
  'production'
]);

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value || value.startsWith('replace-with-')) {
    throw new Error(`Missing required environment variable: ${name}. Copy .env.example to .env and configure it.`);
  }

  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) return fallback;

  const value = Number.parseInt(rawValue, 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer. Received: ${rawValue}`);
  }

  return value;
}

function optionalNonNegativeInteger(name: string): number | undefined {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) return undefined;
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer. Received: ${rawValue}`);
  }
  return value;
}

function booleanValue(name: string, fallback: boolean): boolean {
  const rawValue = process.env[name]?.trim().toLowerCase();
  if (!rawValue) return fallback;
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;

  throw new Error(`${name} must be either true or false. Received: ${rawValue}`);
}

function targetEnvironment(): TargetEnvironment {
  const value = (process.env.TARGET_ENV?.trim().toLowerCase() || 'uat') as TargetEnvironment;
  if (!supportedEnvironments.has(value)) {
    throw new Error(`TARGET_ENV must be one of: ${[...supportedEnvironments].join(', ')}. Received: ${value}`);
  }

  return value;
}

function validBaseUrl(): string {
  const value = required('BASE_URL').replace(/\/$/, '');

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('BASE_URL must be an absolute URL.');
  }

  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLocalHost) {
    throw new Error('BASE_URL must use HTTPS unless it targets localhost.');
  }

  return value;
}

const environment = targetEnvironment();
const isProduction = environment === 'production';

if (isProduction && !booleanValue('ALLOW_PRODUCTION_TESTS', false)) {
  throw new Error('TARGET_ENV=production is blocked. Set ALLOW_PRODUCTION_TESTS=true only after explicit approval.');
}

export const config = {
  environment,
  baseUrl: validBaseUrl(),
  email: required('API_EMAIL'),
  password: required('API_PASSWORD'),
  targetCompanyId: required('TARGET_COMPANY_ID'),
  targetCompanyName: required('TARGET_COMPANY_NAME'),
  companyIdHeader: process.env.COMPANY_ID_HEADER?.trim() || 'x-company-id',
  requestTimeoutMs: positiveInteger('API_TIMEOUT_MS', 30_000),
  scenarioTimeoutMs: positiveInteger('SCENARIO_TIMEOUT_MS', 45_000),
  selectionPageLimit: positiveInteger('SELECTION_PAGE_LIMIT', 100),
  filterReferenceLimit: positiveInteger('FILTER_REFERENCE_LIMIT', 250),
  timelineCandidateLimit: positiveInteger('TIMELINE_CANDIDATE_LIMIT', 10),
  // This scenario creates and moves a real nominee. Keep it opt-in so normal
  // regression and mock runs never alter shared UAT planning data.
  enableStatefulPlanningTests: booleanValue('ENABLE_STATEFUL_PLANNING_TESTS', false),
  // There is no threshold encoded in the API contract.  It is intentionally
  // opt-in so a business rule is never invented by the automation.
  expiringThresholdDays: optionalNonNegativeInteger('EXPIRING_THRESHOLD_DAYS'),
  diagnosticBodyLimit: positiveInteger('DIAGNOSTIC_BODY_LIMIT', 12_000),
  // CAPTCHA bypass is a test-environment concern. It is off by default for production
  // even when production use has been explicitly allowed.
  bypassCaptcha: booleanValue('BYPASS_CAPTCHA', !isProduction)
} as const;
