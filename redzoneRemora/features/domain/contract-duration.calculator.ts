import type { ContractPeriod, TourOfDuty } from '../contracts/crew-contract.contract';

export function calendarDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`Invalid ISO date: ${String(value)}.`);
  return date.toISOString().slice(0, 10);
}

export function expectedEndDate(actualSignOn: string, tour: TourOfDuty): string {
  let result = addPeriod(calendarDate(actualSignOn), tour.value, tour.period);
  if (tour.additionalValue !== undefined) {
    if (!tour.additionalPeriod) throw new Error('Additional Tour of Duty period is required when its value is supplied.');
    result = addPeriod(result, tour.additionalValue, tour.additionalPeriod);
  }
  return result;
}

export function addPeriod(date: string, value: number, period: ContractPeriod): string {
  const [year, month, day] = calendarDate(date).split('-').map(Number) as [number, number, number];
  if (period === 'DAY') return utcDate(year, month - 1, day + value);
  if (period === 'YEAR') return addMonths(year, month, day, value * 12);
  return addMonths(year, month, day, value);
}

export function contractDurationSpent(actualSignOn: string, today: Date = new Date()): number {
  const start = Date.parse(`${calendarDate(actualSignOn)}T00:00:00.000Z`);
  const end = Date.parse(`${calendarDate(today)}T00:00:00.000Z`);
  return Math.floor((end - start) / 86_400_000);
}

/** Master Planning presents contracted days and post-contract days separately.
 * The UI renders these as e.g. "365 Days + 42 Days". */
export function masterPlanningDuration(
  actualSignOn: string,
  expectedEndDate: string,
  today: Date = new Date()
): { contractDurationSpent: number; extendedDuration: number } {
  const elapsed = contractDurationSpent(actualSignOn, today);
  const contracted = contractDurationSpent(actualSignOn, new Date(`${calendarDate(expectedEndDate)}T00:00:00.000Z`));
  const todayDate = calendarDate(today);
  const endDate = calendarDate(expectedEndDate);
  if (todayDate <= endDate) return { contractDurationSpent: elapsed, extendedDuration: 0 };
  return { contractDurationSpent: contracted, extendedDuration: elapsed - contracted };
}

function addMonths(year: number, month: number, day: number, amount: number): string {
  const targetMonthIndex = month - 1 + amount;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12 + 1;
  return utcDate(targetYear, targetMonth - 1, Math.min(day, daysInMonth(targetYear, targetMonth)));
}

function daysInMonth(year: number, month: number): number { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
function utcDate(year: number, monthIndex: number, day: number): string { return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10); }
