/**
 * Maintenance categories double as the technician skill set — ported from
 * mentos-frontend/lib/api.ts `MAINTENANCE_CATEGORIES`. Shared by Technician
 * (skills) and MaintenanceRequest (category) so both validate against the
 * same closed list.
 */
export const MAINTENANCE_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Security',
  'General',
  'Structural',
] as const;

export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];
