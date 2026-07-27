import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditLog, AuditOutcome } from '../../audit/entities/audit-log.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { User } from '../../users/entities/user.entity';
import type { Seeder } from './seed';

interface SeedAuditEntry {
  code: string;
  actorEmail: string | null;
  actorNameFallback: string;
  resource: string;
  action: string;
  resourceId: string | null;
  description: string;
  icon: string;
  createdAt: string;
}

/**
 * Ported verbatim from mentos-frontend/lib/seed.ts. These are historical rows
 * inserted directly (not run back through AuditInterceptor) — hand-authored
 * narrative strings from before this table existed, same treatment as the
 * other seeders' pre-existing historical records (e.g. leases.seeder.ts's
 * L-07/L-08). New entries from here on are written automatically by
 * AuditInterceptor / PermissionsGuard.
 */
const ENTRIES: SeedAuditEntry[] = [
  { code: 'A-1', actorEmail: 'samira@nyumba.co.tz', actorNameFallback: 'Samira Mketo', resource: 'payment', action: 'create', resourceId: null, description: 'recorded a TSh 2,000,000 payment from Neema Joseph', icon: 'banknote', createdAt: '2026-07-04T10:24:00Z' },
  { code: 'A-2', actorEmail: 'khalid@nyumba.co.tz', actorNameFallback: 'Khalid Juma', resource: 'maintenance', action: 'assign', resourceId: 'MR-06', description: 'assigned MR-06 to Hamisi (Electrician)', icon: 'wrench', createdAt: '2026-07-03T16:02:00Z' },
  { code: 'A-3', actorEmail: 'samira@nyumba.co.tz', actorNameFallback: 'Samira Mketo', resource: 'lease', action: 'create', resourceId: 'L-06', description: 'created lease L-06 for Said Salim · Shop G-07', icon: 'file-text', createdAt: '2026-07-02T09:41:00Z' },
  { code: 'A-4', actorEmail: 'asha@nyumba.co.tz', actorNameFallback: 'Asha Ndizi', resource: 'invoice', action: 'update', resourceId: null, description: 'approved invoice batch for Jul 2026 (7 invoices)', icon: 'circle-check-big', createdAt: '2026-07-01T08:00:00Z' },
  { code: 'A-5', actorEmail: 'samira@nyumba.co.tz', actorNameFallback: 'Samira Mketo', resource: 'tenant', action: 'update', resourceId: 'T-07', description: 'set tenant Fatuma Abdallah to Notice given', icon: 'user-round', createdAt: '2026-06-28T14:12:00Z' },
];

export const auditSeeder: Seeder = {
  name: 'audit',
  async run(ds: DataSource): Promise<void> {
    const repo = ds.getRepository(AuditLog);
    const users = ds.getRepository(User);
    const tenants = ds.getRepository(Tenant);
    const logger = new Logger('Seed:audit');

    for (const data of ENTRIES) {
      const existing = await repo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const actor = data.actorEmail ? await users.findOne({ where: { email: data.actorEmail } }) : null;
      const resourceName =
        data.resourceId && data.resource === 'tenant'
          ? (await tenants.findOne({ where: { code: data.resourceId } }))?.name ?? null
          : null;

      const log = repo.create({
        code: data.code,
        actorUserId: actor?.id ?? null,
        actorName: actor?.fullName ?? data.actorNameFallback,
        actorEmail: actor?.email ?? data.actorEmail,
        resource: data.resource,
        action: data.action,
        resourceId: data.resourceId,
        resourceName,
        description: data.description,
        method: 'POST',
        path: `/api/${data.resource}s`,
        statusCode: 200,
        outcome: AuditOutcome.Success,
        ipAddress: null,
        userAgent: null,
        icon: data.icon,
        metadata: null,
      });
      await repo.save(log);
      await repo.update(log.id, { createdAt: new Date(data.createdAt) });
    }

    // The seeded codes (A-1..A-5) are hand-assigned, not drawn from
    // audit_log_code_seq — advance it past them so the first live entry
    // AuditInterceptor writes doesn't collide with a seeded code.
    await repo.query("SELECT setval('audit_log_code_seq', GREATEST((SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 3) AS INTEGER)), 0) FROM audit_logs), 1))");

    logger.log(`${ENTRIES.length} audit entries created`);
  },
};
