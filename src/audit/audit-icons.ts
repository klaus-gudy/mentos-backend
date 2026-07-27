import { permResources } from '../common/rbac/perm-catalog';

/**
 * resource → icon, built from the RBAC catalog's own `icon` field
 * (`common/rbac/perm-catalog.ts`) so audit entries use the same iconography
 * as the rest of the app, rather than a second hand-maintained mapping.
 * `technician` and `auth` have no catalog resource (see ARCHITECTURE.md §9's
 * note on why technicians piggyback on `maintenance.*` permissions) so they
 * get sensible fallbacks here instead.
 */
const FALLBACK_ICONS: Record<string, string> = {
  technician: 'hard-hat',
  auth: 'log-in',
};

const CATALOG_ICONS: Record<string, string> = Object.fromEntries(
  permResources.map((r) => [r.key, r.icon]),
);

export function iconForResource(resource: string): string {
  return CATALOG_ICONS[resource] ?? FALLBACK_ICONS[resource] ?? 'history';
}
