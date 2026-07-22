const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-07-01" → "Jul 2026". */
export function monthLabel(iso: string): string {
  const [year, month] = iso.split('-').map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

/**
 * Adds `months` to an ISO date and subtracts one day — the standard lease-term
 * convention (a 12-month lease starting Jan 1 ends Dec 31, not Jan 1 next
 * year). Ported from mentos-frontend/lib/format.ts `addMonths`.
 */
export function addMonthsMinusDay(startIso: string, months: number): string {
  const [y, m, d] = startIso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Whole days from today (UTC midnight) until an ISO date — negative once past. */
export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T00:00:00Z`);
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - todayUtc) / 86_400_000);
}
