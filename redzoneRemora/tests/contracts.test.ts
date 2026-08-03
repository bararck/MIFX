import assert from 'node:assert/strict';
import test from 'node:test';
import { actualTimelineMovement, filterReferences, masterPlanningDetail, masterPlanningRecords, movementFrom } from '../features/contracts/master-planning.contract';
import { paginationFrom, recordsFrom } from '../features/contracts/response.contract';
import { actualSignOnFrom, crewContracts, findActiveContract, tourOfDutyFrom } from '../features/contracts/crew-contract.contract';
import { calendarDate, contractDurationSpent, expectedEndDate, masterPlanningDuration } from '../features/domain/contract-duration.calculator';
import { classifyPlanningStatus, hasValidReliever } from '../features/domain/master-planning.classifier';

test('reads common list and pagination response shapes without unsafe casts', () => {
  const payload = {
    data: {
      items: [{ id: 'one' }, { id: 'two' }],
      meta: { page: 1, limit: 10, totalItems: 12, totalPages: 2 }
    }
  };

  assert.deepEqual(recordsFrom(payload), [{ id: 'one' }, { id: 'two' }]);
  assert.deepEqual(paginationFrom(payload), { page: 1, limit: 10, totalItems: 12, totalPages: 2 });
});

test('creates only usable filter references and preserves stable query values', () => {
  const references = filterReferences('rank', [
    { rankId: 'rank-1', rankName: 'Captain' },
    { rankName: 'Missing ID' }
  ]);

  assert.deepEqual(references.map(reference => ({ queryValue: reference.queryValue, label: reference.label })), [
    { queryValue: 'rank-1', label: 'Captain' }
  ]);
});

test('normalises master planning records and movement semantics', () => {
  const [record] = masterPlanningRecords([
    {
      id: 'master-1',
      vesselPlanId: 'vessel-plan-1',
      rankName: 'Captain',
      vesselId: 'vessel-1',
      vesselName: 'Atlas',
      crewStatus: 'ONBOARD',
      recruiter: [{ name: 'Ari' }],
      crewNames: ['Sam'],
      startDate: '2026-01-01T00:00:00Z',
      expectedEndDate: '2026-07-01T00:00:00Z',
      totalReliever: 2
    }
  ]);

  assert.ok(record);
  assert.equal(record.stableId, 'vessel-plan-1');
  assert.equal(record.vesselPlanId, 'vessel-plan-1');
  assert.equal(record.vesselName, 'Atlas');
  assert.equal(record.movement, 'SIGN_ON');
  assert.deepEqual(record.recruiterNames, ['Ari']);
  assert.equal(record.startDate, '2026-01-01T00:00:00Z');
  assert.equal(record.expectedEndDate, '2026-07-01T00:00:00Z');
  assert.equal(record.totalReliever, 2);
  assert.equal(movementFrom({ crewStatus: 'ROTATION' }), 'ROTATIONAL');
});

test('reads vessel-rank detail independently from a Master Planning list row', () => {
  const detail = masterPlanningDetail({
    data: {
      crewName: 'Sam', crewId: 'crew-1', vesselName: 'Atlas', rankName: 'Captain', status: 'CONFIRMED',
      startDate: '2026-01-01T00:00:00Z', expectedEndDate: '2026-07-01T00:00:00Z',
      contractDurationSpent: 181, extendedDuration: 0, relievers: [{ crewId: 'reliever-1' }]
    }
  });

  assert.deepEqual(detail, {
    crewId: 'crew-1', crewName: 'Sam', vesselName: 'Atlas', rankName: 'Captain', status: 'CONFIRMED',
    startDate: '2026-01-01T00:00:00Z', expectedEndDate: '2026-07-01T00:00:00Z',
    contractDurationSpent: 181, extendedDuration: 0, reliever: [{ crewId: 'reliever-1' }]
  });
  assert.throws(() => masterPlanningDetail([]), /must be an object/);
});

test('derives timeline movement from the API contract', () => {
  assert.equal(actualTimelineMovement({ signOnDate: '2026-01-01', rotations: [] }), 'SIGN_ON');
  assert.equal(actualTimelineMovement({ signOnDate: '2026-01-01', rotations: [{ id: 'rotation-1' }] }), 'ROTATIONAL');
  assert.equal(actualTimelineMovement({ rotations: [] }), undefined);
});

test('finds the active contract by backend status rather than array position', () => {
  const contracts = crewContracts({ data: [
    { contractId: 'draft', status: 'DRAFT' }, { contractId: 'active', status: 'ACTIVE' }, { contractId: 'done', status: 'COMPLETED' }
  ] });
  assert.equal(findActiveContract(contracts).id, 'active');
  assert.throws(() => findActiveContract(crewContracts({ data: [{ contractId: 'one', status: 'ACTIVE' }, { contractId: 'two', status: 'ACTIVE' }] })), /Ambiguous/);
  assert.throws(() => findActiveContract(crewContracts({ data: [{ contractId: 'draft', status: 'DRAFT' }] })), /No active/);
});

test('reads actual sign-on by event type and rejects planned sign-on', () => {
  assert.equal(actualSignOnFrom({ events: [{ type: 'PLANNED_SIGN_ON', date: '2026-01-01' }, { type: 'ACTUAL_SIGN_ON', date: '2026-01-02' }] }), '2026-01-02');
  assert.throws(() => actualSignOnFrom({ events: [{ type: 'PLANNED_SIGN_ON', date: '2026-01-01' }] }), /Actual sign-on/);
});

test('calculates Tour of Duty with calendar arithmetic and validates additional periods', () => {
  assert.equal(expectedEndDate('2026-03-19T23:00:00-07:00', tourOfDutyFrom({ tourOfDuty: 6, tourOfDutyPeriod: 'MONTH', tourOfDutyAdditional: null })), '2026-09-20');
  assert.equal(expectedEndDate('2026-01-31', tourOfDutyFrom({ tourOfDuty: 1, tourOfDutyPeriod: 'MONTH', tourOfDutyAdditional: 15, tourOfDutyAdditionalPeriod: 'DAY' })), '2026-03-15');
  assert.equal(expectedEndDate('2024-02-29', tourOfDutyFrom({ tourOfDuty: 1, tourOfDutyPeriod: 'YEAR', tourOfDutyAdditional: 1, tourOfDutyAdditionalPeriod: 'MONTH' })), '2025-03-28');
  assert.throws(() => tourOfDutyFrom({ tourOfDuty: 1, tourOfDutyPeriod: 'MONTH', tourOfDutyAdditional: 1 }), /Additional Tour of Duty period/);
  assert.throws(() => tourOfDutyFrom({ tourOfDuty: 1, tourOfDutyPeriod: 'WEEK' }), /DAY, MONTH, or YEAR/);
});

test('calculates duration against an injected calendar day, including overdue days', () => {
  assert.equal(contractDurationSpent('2026-03-19', new Date('2026-07-31T12:00:00Z')), 134);
  assert.deepEqual(
    masterPlanningDuration('2025-06-19', '2026-06-19', new Date('2026-07-31T12:00:00Z')),
    { contractDurationSpent: 365, extendedDuration: 42 }
  );
  assert.equal(calendarDate('2026-03-19T23:30:00-07:00'), '2026-03-20');
});

test('classifies mutually exclusive planning statuses', () => {
  const base = { hasActiveCrew: true, hasActiveContract: true, expectedEndDate: '2026-07-31', today: '2026-07-31', expiringThresholdDays: 30 };
  assert.equal(classifyPlanningStatus({ ...base, hasActiveCrew: false, hasValidReliever: false }), 'VACANT');
  assert.equal(classifyPlanningStatus({ ...base, hasValidReliever: true }), 'CONFIRMED');
  assert.equal(classifyPlanningStatus({ ...base, hasValidReliever: false, expectedEndDate: '2026-07-30' }), 'EXPIRED');
  assert.equal(classifyPlanningStatus({ ...base, hasValidReliever: false }), 'EXPIRING');
  assert.equal(classifyPlanningStatus({ ...base, hasValidReliever: false, expectedEndDate: '2026-09-01' }), 'ON_TRACK');
  assert.equal(hasValidReliever({ crewId: 'reliever-1', name: 'Assigned' }), true);
  assert.equal(hasValidReliever('reliever-reference-1'), true);
  assert.equal(hasValidReliever(['', 'reliever-reference-1', 'reliever-reference-2']), true);
  assert.equal(hasValidReliever(['', '   ']), false);
  assert.equal(hasValidReliever([], 2), true);
  assert.equal(hasValidReliever({}), false);
  assert.equal(hasValidReliever([]), false);
  assert.throws(() => classifyPlanningStatus({ ...base, hasActiveContract: false, hasValidReliever: false }), /active contract/);
});
