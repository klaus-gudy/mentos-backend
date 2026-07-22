import { invoicesSeeder } from './invoices.seeder';
import { leasesSeeder } from './leases.seeder';
import { propertiesSeeder } from './properties.seeder';
import { rolesSeeder } from './roles.seeder';
import type { Seeder } from './seed';
import { tenantsSeeder } from './tenants.seeder';
import { unitsSeeder } from './units.seeder';
import { usersSeeder } from './users.seeder';

/**
 * Dependency-ordered seeder registry. Entities land per sprint; append their
 * seeders here in FK order so the runner inserts parents before children:
 *
 *   roles → users                            (S2)
 *   properties → tenants → units → leases →  (S3, S4)
 *     invoices
 *     Tenants and units seed with no occupancy links; the leases seeder is
 *     the sole writer of Unit.tenantId/status and Tenant.unitId/propertyId,
 *     mirroring the live API (LeasesService.create/terminate) — see
 *     leases.seeder.ts for why it writes those directly rather than via the
 *     service-layer transactional methods.
 *   technicians → maintenance                (S6)
 *   documents, templates,                     (S7)
 *   notifPrefs, notifications, audit
 *
 * Source data is ported from mentos-frontend/lib/seed.ts.
 */
export const seeders: Seeder[] = [
  rolesSeeder,
  usersSeeder,
  propertiesSeeder,
  tenantsSeeder,
  unitsSeeder,
  leasesSeeder,
  invoicesSeeder,
];
