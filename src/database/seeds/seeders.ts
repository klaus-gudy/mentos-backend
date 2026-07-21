import { rolesSeeder } from './roles.seeder';
import type { Seeder } from './seed';
import { usersSeeder } from './users.seeder';

/**
 * Dependency-ordered seeder registry. Entities land per sprint; append their
 * seeders here in FK order so the runner inserts parents before children:
 *
 *   roles → users            (S2)
 *   properties → units       (S3)
 *   tenants → leases         (S4)
 *   invoices → payments      (S5)
 *   technicians → maintenance(S6)
 *   documents, templates,    (S7)
 *   notifPrefs, notifications, audit
 *
 * Source data is ported from mentos-frontend/lib/seed.ts.
 */
export const seeders: Seeder[] = [rolesSeeder, usersSeeder];
