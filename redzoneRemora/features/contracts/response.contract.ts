import type { JsonRecord, Pagination } from '../support/world';

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function recordsFrom(payload: unknown): JsonRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (!isRecord(payload)) return [];

  const candidates = [
    payload.items,
    payload.data,
    payload.result,
    isRecord(payload.data) ? payload.data.items : undefined,
    isRecord(payload.data) ? payload.data.result : undefined,
    isRecord(payload.result) ? payload.result.items : undefined
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter(isRecord);
  }

  return [];
}

export function recordsAt(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

export function stringField(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = stringValue(record[key]);
    if (value) return value;
  }

  return undefined;
}

export function numberValue(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function paginationFrom(payload: unknown): Pagination | undefined {
  if (!isRecord(payload)) return undefined;

  const candidates = [
    payload.meta,
    isRecord(payload.data) ? payload.data.meta : undefined,
    payload.data,
    payload
  ];

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;

    const page = numberValue(candidate.page);
    const limit = numberValue(candidate.limit);
    const totalItems = numberValue(candidate.totalItems ?? candidate.total ?? candidate.count);
    const totalPages = numberValue(candidate.totalPages ?? candidate.pageCount);

    if (page !== undefined && limit !== undefined && totalItems !== undefined && totalPages !== undefined) {
      return { page, limit, totalItems, totalPages };
    }
  }

  return undefined;
}

export function normalized(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function apiEnum(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}
