import { isRecord, normalized, numberValue, recordsAt, recordsFrom, stringField, stringValue } from './response.contract';
import type { JsonRecord } from '../support/world';

export type ContractPeriod = 'DAY' | 'MONTH' | 'YEAR';

export interface CrewContract {
  raw: JsonRecord;
  id: string;
  status: string;
}

export interface TourOfDuty {
  value: number;
  period: ContractPeriod;
  additionalValue?: number;
  additionalPeriod?: ContractPeriod;
}

const inactiveStatuses = new Set(['draft', 'cancelled', 'completed', 'terminated', 'inactive']);

export function crewContracts(payload: unknown): CrewContract[] {
  return recordsFrom(payload).flatMap(raw => {
    const id = stringField(raw, ['contractId', 'contract_id', 'id', 'uuid']);
    const status = stringField(raw, ['status', 'contractStatus', 'contract_status']);
    return id && status ? [{ raw, id, status }] : [];
  });
}

export function findActiveContract(contracts: CrewContract[]): CrewContract {
  const active = contracts.filter(contract => normalized(contract.status) === 'active');
  if (active.length === 1) return active[0]!;
  if (active.length === 0) {
    const statuses = [...new Set(contracts.map(contract => contract.status))].join(', ') || 'none';
    throw new Error(`No active contract was found. Available contract statuses: ${statuses}.`);
  }
  throw new Error(`Ambiguous active contracts: ${active.map(contract => contract.id).sort().join(', ')}.`);
}

export function assertKnownContractStatuses(contracts: CrewContract[]): void {
  for (const contract of contracts) {
    if (!contract.status.trim()) throw new Error(`Contract ${contract.id} has an empty status.`);
    // Kept as an explicit reader rule: non-active statuses are never selected by findActiveContract.
    if (inactiveStatuses.has(normalized(contract.status))) continue;
  }
}

export function tourOfDutyFrom(payload: unknown): TourOfDuty {
  const source = detailRecord(payload);
  const value = numberValue(source.tourOfDuty ?? source.tour_of_duty);
  const period = periodFrom(source.tourOfDutyPeriod ?? source.tour_of_duty_period, 'Tour of Duty period');
  if (!Number.isFinite(value) || !Number.isInteger(value) || value! <= 0) {
    throw new Error(`Tour of Duty must be a positive integer. Received: ${String(source.tourOfDuty ?? source.tour_of_duty)}.`);
  }

  const additionalRaw = source.tourOfDutyAdditional ?? source.tour_of_duty_additional;
  if (additionalRaw === null || additionalRaw === undefined || additionalRaw === '') return { value: value!, period };
  const additionalValue = numberValue(additionalRaw);
  if (!Number.isFinite(additionalValue) || !Number.isInteger(additionalValue) || additionalValue! <= 0) {
    throw new Error(`Additional Tour of Duty must be a positive integer when supplied. Received: ${String(additionalRaw)}.`);
  }
  const additionalPeriod = periodFrom(
    source.tourOfDutyAdditionalPeriod ?? source.tour_of_duty_additional_period,
    'Additional Tour of Duty period'
  );
  return { value: value!, period, additionalValue: additionalValue!, additionalPeriod };
}

export function actualSignOnFrom(payload: unknown): string {
  const candidates = timelineRecords(payload);
  const event = candidates.find(row => {
    const type = normalized(stringField(row, ['type', 'eventType', 'event_type', 'activityType', 'activity_type']));
    return type === 'actualsignon' || type === 'signonactual';
  });
  const value = event && stringField(event, ['actualSignOn', 'actual_sign_on', 'date', 'eventDate', 'event_date']);
  if (value) return value;

  const body = detailRecord(payload);
  const direct = stringField(body, ['actualSignOn', 'actual_sign_on', 'signOnDate', 'sign_on_date']);
  if (direct) return direct;
  throw new Error('Actual sign-on was not found in the contract actual timeline; planned sign-on is not accepted.');
}

function detailRecord(payload: unknown): JsonRecord {
  if (!isRecord(payload)) throw new Error('Contract response must be an object.');
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function timelineRecords(payload: unknown): JsonRecord[] {
  const body = detailRecord(payload);
  return [body.events, body.timeline, body.data, ...recordsAt(body.rotations)].flatMap(value => recordsAt(value));
}

function periodFrom(value: unknown, label: string): ContractPeriod {
  const normalizedValue = normalized(stringValue(value));
  if (normalizedValue === 'day') return 'DAY';
  if (normalizedValue === 'month') return 'MONTH';
  if (normalizedValue === 'year') return 'YEAR';
  throw new Error(`${label} must be DAY, MONTH, or YEAR. Received: ${String(value)}.`);
}
