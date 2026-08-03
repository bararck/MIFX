import { isRecord, normalized, numberValue, recordsAt, stringField, stringValue } from './response.contract';
import type { FilterName, JsonRecord, MovementType } from '../support/world';

export interface MasterPlanningRecord {
  raw: JsonRecord;
  stableId: string;
  rankId?: string;
  vesselPlanId?: string;
  rankName?: string;
  vesselId?: string;
  vesselName?: string;
  status?: string;
  recruiterNames: string[];
  crewNames: string[];
  movement?: MovementType;
  crewId?: string;
  hasActiveCrew: boolean;
  reliever?: unknown;
  totalReliever?: number;
  startDate?: string;
  expectedEndDate?: string;
  contractDurationSpent?: number;
  extendedDuration?: number;
}

export interface FilterReference {
  raw: JsonRecord;
  queryValue: string;
  label: string;
}

export interface MasterPlanningDetail {
  crewId?: string;
  crewName?: string;
  vesselName?: string;
  rankName?: string;
  status?: string;
  startDate?: string;
  expectedEndDate?: string;
  contractDurationSpent?: number;
  extendedDuration?: number;
  reliever?: unknown;
}

export function masterPlanningRecords(records: JsonRecord[]): MasterPlanningRecord[] {
  return records.map(toMasterPlanningRecord);
}

export function toMasterPlanningRecord(raw: JsonRecord): MasterPlanningRecord {
  const recruiterNames = recordsAt(raw.recruiter)
    .map(recruiter => stringField(recruiter, ['name', 'fullName', 'label']))
    .filter((name): name is string => Boolean(name));
  const crewNames = Array.isArray(raw.crewNames)
    ? raw.crewNames.map(stringValue).filter((name): name is string => Boolean(name))
    : [];
  const rankName = stringField(raw, ['rankName', 'rank_name', 'rank']);
  const vesselId = stringField(raw, ['vesselId', 'vessel_id']);
  const vesselName = stringField(raw, ['vesselName', 'vessel_name']);
  const status = stringField(raw, ['status', 'currentStatus', 'vesselStatus']);
  const crew = isRecord(raw.crew) ? raw.crew : isRecord(raw.activeCrew) ? raw.activeCrew : undefined;
  const assignment = isRecord(raw.assignment) ? raw.assignment : isRecord(raw.crewAssignment) ? raw.crewAssignment : undefined;
  const crewId = stringField(raw, ['crewId', 'crew_id', 'activeCrewId'])
    ?? (crew && stringField(crew, ['id', 'uuid', 'crewId', 'crew_id']))
    ?? (assignment && stringField(assignment, ['crewId', 'crew_id', 'id', 'uuid']));
  const hasActiveCrew = Boolean(crewId || crewNames.length > 0)
    && normalized(stringField(raw, ['crewStatus', 'crew_status', 'assignmentStatus', 'assignment_status']) ?? 'active')
      !== 'inactive';

  return {
    raw,
    stableId: stringField(raw, ['vesselPlanId', 'vessel_plan_id', 'id', 'uuid', 'masterPlanningId', 'master_planning_id'])
      ?? [rankName, vesselId, status, crewNames.join('|')].map(normalized).join('|'),
    rankId: stringField(raw, ['vesselRankId', 'vessel_rank_id', 'rankId', 'rank_id', 'positionId']),
    vesselPlanId: stringField(raw, ['vesselPlanId', 'vessel_plan_id']),
    rankName,
    vesselId,
    vesselName,
    status,
    recruiterNames,
    crewNames,
    movement: movementFrom(raw),
    crewId,
    hasActiveCrew,
    reliever: raw.relievers ?? raw.reliever ?? raw.relieverCrew ?? raw.reliever_crew,
    totalReliever: numberValue(raw.totalReliever ?? raw.total_reliever),
    startDate: stringField(raw, ['startDate', 'start_date']),
    expectedEndDate: stringField(raw, ['expectedEndDate', 'expected_end_date']),
    contractDurationSpent: numberValue(raw.contractDurationSpent ?? raw.contract_duration_spent),
    extendedDuration: numberValue(raw.extendedDuration ?? raw.extended_duration)
  };
}

/** The vessel-rank detail endpoint returns a single row directly (some API
 * versions wrap it in data). Keep this separate from list parsing so list and
 * detail contracts cannot accidentally mask each other. */
export function masterPlanningDetail(payload: unknown): MasterPlanningDetail {
  const raw = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
  if (!isRecord(raw)) throw new Error('Master Planning vessel-rank detail response must be an object.');

  return {
    crewId: stringField(raw, ['crewId', 'crew_id', 'activeCrewId']),
    crewName: stringField(raw, ['crewName', 'crew_name', 'fullName', 'name']),
    vesselName: stringField(raw, ['vesselName', 'vessel_name']),
    rankName: stringField(raw, ['rankName', 'rank_name', 'rank']),
    status: stringField(raw, ['status', 'currentStatus', 'vesselStatus']),
    startDate: stringField(raw, ['startDate', 'start_date']),
    expectedEndDate: stringField(raw, ['expectedEndDate', 'expected_end_date']),
    contractDurationSpent: numberValue(raw.contractDurationSpent ?? raw.contract_duration_spent),
    extendedDuration: numberValue(raw.extendedDuration ?? raw.extended_duration),
    reliever: raw.relievers ?? raw.reliever ?? raw.relieverCrew ?? raw.reliever_crew
  };
}

export function filterReferences(filter: Exclude<FilterName, 'status'>, records: JsonRecord[]): FilterReference[] {
  return records.flatMap(record => {
    const reference = toFilterReference(filter, record);
    return reference ? [reference] : [];
  });
}

export function toFilterReference(
  filter: Exclude<FilterName, 'status'>,
  raw: JsonRecord
): FilterReference | undefined {
  const fields = {
    rank: {
      query: ['rankId', 'rank_id', 'id', 'uuid'],
      label: ['rankName', 'rank_name', 'name', 'label']
    },
    vessel: {
      query: ['vesselId', 'vessel_id', 'id', 'uuid'],
      label: ['vesselName', 'vessel_name', 'name', 'label', 'vesselId']
    },
    recruiter: {
      query: ['key', 'recruiterId', 'recruiter_id', 'id', 'uuid'],
      label: ['name', 'fullName', 'label']
    }
  } as const;
  const definition = fields[filter];
  const queryValue = stringField(raw, [...definition.query]);
  const label = stringField(raw, [...definition.label]);

  return queryValue && label ? { raw, queryValue, label } : undefined;
}

export function movementFrom(record: JsonRecord): MovementType | undefined {
  const crewStatus = stringField(record, ['crewStatus', 'crew_status']);
  if (normalized(crewStatus) === 'onboard') return 'SIGN_ON';
  if (normalized(crewStatus) === 'rotation') return 'ROTATIONAL';

  for (const [key, value] of Object.entries(record)) {
    if (!/sign.?on|rotat|movement|type|status/i.test(key)) continue;

    const movement = normalized(value);
    if (movement.includes('signon')) return 'SIGN_ON';
    if (movement.includes('rotat')) return 'ROTATIONAL';
  }

  return undefined;
}

export function contractIdFrom(record: JsonRecord): string | undefined {
  return stringField(record, ['contractId', 'contract_id', 'contractUuid', 'contractUUID', 'id', 'uuid']);
}

export function crewIdFrom(record: JsonRecord): string | undefined {
  return stringField(record, ['crewId', 'crew_id', 'crewUuid', 'crewUUID', 'id', 'uuid']);
}

export function crewNameFrom(record: JsonRecord): string | undefined {
  const directName = stringField(record, ['name', 'crewName', 'fullName']);
  if (directName) return directName;

  const profileRows = recordsAt(record.data);
  return profileRows
    .filter(row => normalized(row.column) === 'fullname')
    .map(row => stringValue(row.value))
    .find((value): value is string => Boolean(value));
}

export function activeContract(records: JsonRecord[]): JsonRecord | undefined {
  return records.find(record => normalized(record.status) === 'active');
}

export function actualTimelineMovement(payload: unknown): MovementType | undefined {
  if (!isRecord(payload)) return undefined;

  if (recordsAt(payload.rotations).length > 0) return 'ROTATIONAL';
  return stringValue(payload.signOnDate ?? payload.sign_on_date) ? 'SIGN_ON' : undefined;
}
