const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const companyId = 'mock-company';
const initialToken = 'mock-initial-token';
const refreshedToken = 'mock-refreshed-token';
const recruiterKeys = { Alice: 'recruiter-1', Bob: 'recruiter-2', Cara: 'recruiter-3' };
function calendarDayOffset(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const masterPlanning = [
  {
    id: 'master-1',
    vesselPlanId: 'vessel-plan-1',
    rankId: 'rank-1',
    rankName: 'Captain',
    vesselId: 'vessel-1',
    vesselName: 'Atlas',
    status: 'CONFIRMED',
    recruiter: [{ name: 'Alice' }],
    crewNames: ['Crew One'],
    crewStatus: 'ONBOARD', crewId: 'crew-1', reliever: { crewId: 'reliever-1', name: 'Reliever One' }, totalReliever: 1,
    startDate: '2026-01-01T00:00:00Z', expectedEndDate: '2027-01-01T00:00:00Z'
  },
  {
    id: 'master-2',
    rankId: 'rank-2',
    rankName: 'Officer',
    vesselId: 'vessel-2',
    status: 'ON_TRACK',
    recruiter: [{ name: 'Bob' }],
    crewNames: ['Crew Two'],
    crewStatus: 'ROTATION', crewId: 'crew-2', startDate: '2026-01-01T00:00:00Z', expectedEndDate: '2027-01-01T00:00:00Z'
  },
  {
    id: 'master-3',
    rankId: 'rank-1',
    rankName: 'Captain',
    vesselId: 'vessel-3',
    status: 'CONFIRMED',
    recruiter: [{ name: 'Cara' }],
    crewNames: ['Crew Three'],
    crewStatus: 'ONBOARD', crewId: 'crew-3', reliever: { crewId: 'reliever-3', name: 'Reliever Three' },
    startDate: '2026-02-01T00:00:00Z', expectedEndDate: '2027-02-01T00:00:00Z'
  },
  {
    id: 'master-4',
    rankId: 'rank-3',
    rankName: 'Engineer',
    vesselId: 'vessel-4',
    status: 'VACANT',
    recruiter: [],
    crewNames: [],
    crewStatus: 'INACTIVE'
  },
  {
    id: 'master-5', rankId: 'rank-4', rankName: 'Bosun', vesselId: 'vessel-5', status: 'EXPIRED',
    recruiter: [], crewNames: ['Crew Four'], crewStatus: 'ONBOARD', crewId: 'crew-4',
    startDate: calendarDayOffset(-366), expectedEndDate: calendarDayOffset(-1)
  },
  {
    id: 'master-6', rankId: 'rank-5', rankName: 'Cook', vesselId: 'vessel-6', status: 'EXPIRING',
    recruiter: [], crewNames: ['Crew Five'], crewStatus: 'ONBOARD', crewId: 'crew-5',
    startDate: calendarDayOffset(-15), expectedEndDate: calendarDayOffset(15)
  }
];

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function isAuthenticated(request) {
  return request.headers.authorization === `Bearer ${initialToken}`
    || request.headers.authorization === `Bearer ${refreshedToken}`;
}

function hasCompanyContext(request) {
  return request.headers.authorization === `Bearer ${refreshedToken}`
    && request.headers['x-company-id'] === companyId;
}

function filteredMasterPlanning(search) {
  return masterPlanning.filter(record => {
    const rank = search.get('rankIds');
    const vessel = search.get('vesselIds');
    const status = search.get('status');
    const recruiter = search.get('recruiterKeys');
    const crew = search.get('search')?.toLowerCase();

    return (!rank || record.rankId === rank)
      && (!vessel || record.vesselId === vessel)
      && (!status || record.status === status)
      && (!recruiter || record.recruiter.some(person => recruiterKeys[person.name] === recruiter))
      && (!crew || record.crewNames.some(name => name.toLowerCase().includes(crew)));
  }).map(record => record.startDate && record.expectedEndDate
    ? { ...record, ...planningDuration(record.startDate, record.expectedEndDate) }
    : record);
}

function calendarDays(isoDate) {
  const start = Date.parse(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
  const today = new Date().toISOString().slice(0, 10);
  return Math.floor((Date.parse(`${today}T00:00:00.000Z`) - start) / 86400000);
}

function planningDuration(startDate, endDate) {
  const elapsed = calendarDays(startDate);
  const contracted = Math.floor((Date.parse(`${endDate.slice(0, 10)}T00:00:00.000Z`) - Date.parse(`${startDate.slice(0, 10)}T00:00:00.000Z`)) / 86400000);
  const today = new Date().toISOString().slice(0, 10);
  if (today <= endDate.slice(0, 10)) return { contractDurationSpent: elapsed, extendedDuration: 0 };
  return { contractDurationSpent: contracted, extendedDuration: elapsed - contracted };
}

function route(request, response) {
  const url = new URL(request.url, 'http://127.0.0.1');
  const { pathname, searchParams } = url;

  if (request.method === 'POST' && pathname === '/v1/auth/login') {
    return json(response, 200, { token: initialToken });
  }

  if (pathname === '/v1/admin/company') {
    if (!isAuthenticated(request)) return json(response, 401, { error: 'Unauthorized' });
    return json(response, 200, { data: [{ id: companyId, name: 'Mock Company' }] });
  }

  if (request.method === 'PATCH' && pathname === '/v1/admin/company/selected') {
    if (!isAuthenticated(request)) return json(response, 401, { error: 'Unauthorized' });
    return json(response, 200, { token: refreshedToken });
  }

  if (!hasCompanyContext(request)) return json(response, 401, { error: 'Missing company context' });

  if (request.method === 'GET' && pathname === `/v1/company/${companyId}/dashboard/analytic`) {
    return json(response, 200, { data: { expired: 1, expiring: 1, confirmed: 2, vacant: 1 } });
  }

  if (request.method === 'GET' && pathname === `/v2/company/${companyId}/vessel-rank/master-planning-list`) {
    const records = filteredMasterPlanning(searchParams);
    const limit = Number(searchParams.get('limit') || 10);
    return json(response, 200, {
      data: {
        items: records,
        meta: {
          page: 1,
          limit,
          totalItems: records.length,
          totalPages: Math.ceil(records.length / limit)
        }
      }
    });
  }

  if (request.method === 'GET' && pathname === `/v1/company/${companyId}/dashboard/vessel-rank/rank-1`
    && searchParams.get('vesselPlanId') === 'vessel-plan-1') {
    const record = masterPlanning[0];
    return json(response, 200, {
      crewName: record.crewNames[0], crewId: record.crewId, vesselName: record.vesselName,
      rankName: record.rankName, status: record.status, startDate: record.startDate,
      expectedEndDate: record.expectedEndDate, ...planningDuration(record.startDate, record.expectedEndDate),
      relievers: [record.reliever]
    });
  }

  if (request.method === 'GET' && pathname === `/v1/company/${companyId}/rank`) {
    return json(response, 200, { data: [{ rankId: 'rank-1', rankName: 'Captain' }, { rankId: 'rank-2', rankName: 'Officer' }] });
  }

  if (request.method === 'GET' && pathname === `/v1/company/${companyId}/dashboard/filter/vessel`) {
    return json(response, 200, { data: [{ vesselId: 'vessel-1', name: 'Atlas' }, { vesselId: 'vessel-2', name: 'Borealis' }] });
  }

  if (request.method === 'GET' && pathname === `/v1/company/${companyId}/dashboard/filter/recruiter`) {
    return json(response, 200, { data: [{ key: 'recruiter-1', name: 'Alice' }, { key: 'recruiter-2', name: 'Bob' }] });
  }

  if (request.method === 'POST' && pathname === `/v1/company/${companyId}/crew/data`) {
    return json(response, 200, { data: [{ crewId: 'crew-1', fullName: 'Crew One' }] });
  }

  if (request.method === 'GET' && pathname === `/v1/company/${companyId}/crew/crew-1/contract/tabs`) {
    return json(response, 200, { data: [{ contractId: 'contract-1', status: 'ACTIVE' }] });
  }

  if (request.method === 'GET' && pathname.match(new RegExp(`^/v1/company/${companyId}/crew/crew-[12345]/contract/tabs$`))) {
    const crew = pathname.split('/')[5];
    return json(response, 200, { data: [{ contractId: `contract-${crew.slice(-1)}`, status: 'ACTIVE' }] });
  }

  if (request.method === 'GET' && pathname.match(new RegExp(`^/v1/company/${companyId}/crew/crew-[12345]/contract/contract-[12345]$`))) {
    const crew = pathname.split('/')[5];
    return json(response, 200, {
      data: crew === 'crew-5'
        ? { tourOfDuty: 30, tourOfDutyPeriod: 'DAY', tourOfDutyAdditional: null }
        : { tourOfDuty: 1, tourOfDutyPeriod: 'YEAR', tourOfDutyAdditional: null }
    });
  }

  if (request.method === 'GET' && pathname === `/v1/company/${companyId}/crew/crew-1/contract/contract-1/actual-timeline`) {
    return json(response, 200, { signOnDate: '2026-01-01', rotations: [] });
  }

  if (request.method === 'GET' && pathname.match(new RegExp(`^/v1/company/${companyId}/crew/crew-[23]/contract/contract-[23]/actual-timeline$`))) {
    const crew = pathname.split('/')[5];
    return json(response, 200, { events: [{ type: 'ACTUAL_SIGN_ON', date: crew === 'crew-2' ? '2026-01-01T00:00:00Z' : '2026-02-01T00:00:00Z' }] });
  }

  if (request.method === 'GET' && pathname.match(new RegExp(`^/v1/company/${companyId}/crew/crew-[45]/contract/contract-[45]/actual-timeline$`))) {
    const crew = pathname.split('/')[5];
    return json(response, 200, { events: [{ type: 'ACTUAL_SIGN_ON', date: crew === 'crew-4' ? calendarDayOffset(-366) : calendarDayOffset(-15) }] });
  }

  return json(response, 404, { error: `No mock route for ${request.method} ${pathname}` });
}

function startServer() {
  const server = http.createServer(route);

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') return reject(new Error('Mock server did not provide a TCP port.'));
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

function runCucumber(baseUrl) {
  const projectRoot = path.resolve(__dirname, '..');
  const cucumberBin = path.join(projectRoot, 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js');
  const environment = {
    ...process.env,
    CUCUMBER_REPORTS: 'false',
    TARGET_ENV: 'local',
    BASE_URL: baseUrl,
    API_EMAIL: 'mock@example.test',
    API_PASSWORD: 'mock-password',
    TARGET_COMPANY_ID: companyId,
    TARGET_COMPANY_NAME: 'Mock Company',
    COMPANY_ID_HEADER: 'x-company-id',
    EXPIRING_THRESHOLD_DAYS: '30',
    ENABLE_STATEFUL_PLANNING_TESTS: 'false'
  };

  return new Promise((resolve, reject) => {
    const cucumber = spawn(process.execPath, [cucumberBin], {
      cwd: projectRoot,
      env: environment,
      stdio: 'inherit'
    });
    cucumber.once('error', reject);
    cucumber.once('exit', code => resolve(code ?? 1));
  });
}

async function main() {
  const { server, baseUrl } = await startServer();

  try {
    const exitCode = await runCucumber(baseUrl);
    if (exitCode !== 0) process.exitCode = exitCode;
  } finally {
    await closeServer(server);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
