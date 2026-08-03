# Remora API BDD Automation

This is a TypeScript API test foundation using Cucumber (Gherkin) and Playwright's `APIRequestContext`. Feature files describe business behaviour; API clients, response contracts, and domain assertions contain the technical detail.

## Design principles

- Keep Gherkin readable: a scenario describes intent, not routes, headers, or JSON traversal.
- Keep step definitions thin. They orchestrate reusable clients and domain services only.
- Select live data deterministically. Dynamic filter tests choose values from one compatible master-planning record; there is no random selection.
- Fail on empty results when a selected value is expected to return data. This prevents false-positive filter tests.
- Use the selected company context from the scenario world for every company-scoped request.
- Do not hide defects with global retries. `CUCUMBER_RETRY` is opt-in and should only be used for a confirmed infrastructure incident.
- Keep stateful company selection serial until each worker has a dedicated account and tenant.

## Structure

```text
features/
  api/                  API clients grouped by capability
  contracts/            Safe response readers and domain-shaped contracts
  domain/               Deterministic dynamic-data selection and assertions
  step-definitions/     Small Cucumber bindings
  support/              World, hooks, config, HTTP diagnostics
  admin/                Business-readable Gherkin features
  master-planning/
scripts/                Report lifecycle utilities
```

## Setup

1. Use Node.js 20–23 and install exact locked dependencies with `npm ci`.
2. Copy `.env.example` to `.env`.
3. Use a dedicated non-production test account and company. Never commit `.env`.
4. Run static verification with `npm run verify`.

`TARGET_ENV` defaults to `uat`. Production is blocked unless `ALLOW_PRODUCTION_TESTS=true` is explicitly supplied; CAPTCHA bypass is disabled by default for production.

On Windows hosts where PowerShell execution policy blocks `npm.ps1`, use `npm.cmd` in place of `npm` (for example, `npm.cmd run verify`).

## Commands

| Command | Purpose |
| --- | --- |
| `npm run verify` | Type-checks, runs unit tests, validates Gherkin bindings, and exercises the suite against a local mock API. |
| `npm run test:mock` | Runs the complete suite against a local mock API; no credentials or external network are used. |
| `npm run test:smoke` | Runs the small admin/company-context smoke test. |
| `npm run test:regression` | Runs Master Planning dynamic and contract coverage. |
| `npm run test:uat` | Runs the full suite with `TARGET_ENV=uat`. |
| `npm run test:uat:report` | Runs UAT, builds the report, then opens it automatically in the default browser. |
| `npm run report` | Builds the rich HTML report, starts its local web server, and opens it in the default browser. |
| `npm run report:build` | Builds the rich HTML report without starting a server. |
| `npm run report:serve` | Serves the generated report locally at `http://127.0.0.1:9323` and opens it in the default browser. |

To use another port, set `REPORT_PORT` first (PowerShell: `$env:REPORT_PORT = 9324`).
`report` and `report:serve` keep the terminal active while the local report server is running; press `Ctrl+C` to stop it.

The status-summary scenarios can traverse every page of four live status filters and validate their active contracts. Their default scenario timeout is therefore three minutes (`SCENARIO_TIMEOUT_MS=180000`); tune it only when the UAT data volume or API latency warrants it.

The `@stateful` crew-replacement scenario is intentionally skipped unless `ENABLE_STATEFUL_PLANNING_TESTS=true`. It selects an `EXPIRED` or `EXPIRING` onboard crew whose matching rank is empty in both Planned and Nominee, adds an eligible `NEW` candidate, proceeds the nominee, verifies `CONFIRMED`, and reverts the planned record. Use it only with a disposable or isolated UAT fixture; its `After` hook also attempts the revert if an intermediate assertion fails.

Integration test commands replace their Cucumber JSON, HTML, and JUnit artifacts before each run, then mark the resulting run complete. The existing rich HTML web view is kept available while a new run starts, which avoids Windows file-lock conflicts. All report files are intentionally ignored by Git.

## Dynamic-data policy

The Master Planning suite intentionally uses current UAT data, so it does not depend on hard-coded IDs. It retrieves a bounded selection page, orders candidates deterministically, and chooses filter values that belong to the same record. That avoids impossible combinations such as a rank from one record and a vessel from another.

The timeline scenario also requires an exact crew identity, an active contract, and a recognised movement before continuing. It evaluates a bounded, deterministic number of candidates (`TIMELINE_CANDIDATE_LIMIT`). If no compatible test data exists, it fails with a precise diagnostic instead of silently passing or choosing a random person.

Master Planning contract-status scenarios resolve a crew identifier directly from the planning record, or through a unique exact-name crew lookup when the list contract only exposes a name. They select exactly one backend `ACTIVE` contract, read actual sign-on and Tour of Duty from its own APIs, and use calendar arithmetic for `expectedEndDate` and elapsed `contractDurationSpent`. `EXPIRING_THRESHOLD_DAYS` is `30` for the current Soechi UAT policy: EXPIRING data covers one through thirty calendar days before expected end date. Confirm the value if another environment uses a different policy.

For a contract already past its expected end date, Master Planning separates the values shown by the UI: `contractDurationSpent` is capped at the contracted period and `extendedDuration` holds the additional calendar days. For example, a one-year contract ending on 19 June with today on 31 July is validated as `365 Days + 42 Days`.

`ON_TRACK` is validated separately from the four dashboard-summary fields: it requires an active crew and active contract, no reliever, and an expected end date beyond the configured nearly-expired threshold.

For maximum CI stability, provision a known test-data fixture or a seeded tenant per worker. The current suite remains intentionally serial because selecting a company changes server-side account context.

## Adding coverage

1. Write the business rule and scenario in a `.feature` file first.
2. Add route-level code to the relevant `features/api/*` client.
3. Add only the response fields that the test needs to `features/contracts/*`.
4. Put selection and assertion logic in `features/domain/*`.
5. Bind the Gherkin phrase in a short step definition.

Avoid putting HTTP calls, mutable state, and complex response parsing directly in a step definition. For UI coverage in the future, add a separate UI layer with Playwright page objects; this repository is currently API-only.

## Diagnostics and security

Each scenario has its own API request context and disposes it after completion. Failed scenarios attach a bounded request timeline with password, token, authorization, cookie, secret, and API-key values redacted. Attachments contain response metadata rather than raw response bodies, so operational data and PII are not copied into reports.
