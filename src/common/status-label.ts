/**
 * status → display label, ported from mentos-frontend/lib/format.ts
 * `STATUS_META` (label half only — "tone"/color is a frontend rendering
 * concern with no backend use). Covers every status enum across every
 * module, since report rows need a human label regardless of which
 * entity's status they're showing.
 */
const LABELS: Record<string, string> = {
  active: 'Active',
  prospective: 'Prospective',
  notice: 'Notice given',
  vacated: 'Vacated',
  blacklisted: 'Blacklisted',
  occupied: 'Occupied',
  vacant: 'Vacant',
  paid: 'Paid',
  due: 'Due',
  overdue: 'Overdue',
  partial: 'Partial',
  void: 'Void',
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  closed: 'Closed',
  invited: 'Invited',
  suspended: 'Suspended',
  ending: 'Ending',
  ended: 'Ended',
  on_leave: 'On leave',
  inactive: 'Inactive',
};

export function statusLabel(status: string): string {
  return LABELS[status] ?? status;
}
