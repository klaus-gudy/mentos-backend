import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Lease, LeaseStatus } from '../../leases/entities/lease.entity';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Unit, UnitStatus } from '../../units/entities/unit.entity';
import type { Seeder } from './seed';

interface SeedLease {
  code: string;
  tenantCode: string;
  unitCode: string;
  propertyCode: string;
  start: string;
  end: string;
  rent: number;
  deposit: number;
  frequency: string;
  status: LeaseStatus;
}

/**
 * Ported verbatim from mentos-frontend/lib/seed.ts. These are historical
 * records, not live `createLease` calls — status is seeded exactly as given
 * (including L-07's "ending" and L-08's "ended"), not derived.
 *
 * For each `active`/`ending` lease, this seeder directly wires the occupancy
 * pointers (Unit.tenantId/status, Tenant.unitId/propertyId) — bypassing
 * LeasesService/UnitsService/TenantsService's transactional methods, which
 * are for the live API path, not for inserting pre-existing historical state.
 * L-08 is `ended`, so its unit (U-602) and tenant (T-01, already occupying
 * U-101 via L-01) are correctly left untouched.
 */
const LEASES: SeedLease[] = [
  { code: 'L-01', tenantCode: 'T-01', unitCode: 'U-101', propertyCode: 'P-01', start: '2024-03-01', end: '2026-07-19', rent: 520000, deposit: 1040000, frequency: 'Monthly', status: LeaseStatus.Active },
  { code: 'L-02', tenantCode: 'T-02', unitCode: 'U-102', propertyCode: 'P-01', start: '2025-01-01', end: '2026-12-31', rent: 420000, deposit: 840000, frequency: 'Monthly', status: LeaseStatus.Active },
  { code: 'L-03', tenantCode: 'T-03', unitCode: 'U-201', propertyCode: 'P-02', start: '2023-08-01', end: '2026-08-14', rent: 1850000, deposit: 3700000, frequency: 'Quarterly', status: LeaseStatus.Active },
  { code: 'L-04', tenantCode: 'T-04', unitCode: 'U-301', propertyCode: 'P-03', start: '2025-09-01', end: '2026-08-31', rent: 210000, deposit: 210000, frequency: 'Monthly', status: LeaseStatus.Active },
  { code: 'L-05', tenantCode: 'T-05', unitCode: 'U-401', propertyCode: 'P-04', start: '2024-02-01', end: '2027-01-31', rent: 3800000, deposit: 7600000, frequency: 'Monthly', status: LeaseStatus.Active },
  { code: 'L-06', tenantCode: 'T-06', unitCode: 'U-501', propertyCode: 'P-05', start: '2024-11-01', end: '2026-10-31', rent: 1200000, deposit: 2400000, frequency: 'Monthly', status: LeaseStatus.Active },
  { code: 'L-07', tenantCode: 'T-07', unitCode: 'U-103', propertyCode: 'P-01', start: '2023-06-01', end: '2026-07-10', rent: 500000, deposit: 1000000, frequency: 'Monthly', status: LeaseStatus.Ending },
  // Amina Hassan's (T-01) prior tenancy, before she moved to Mwenge Apartments
  // (L-01) — exercises the "other leases" accordion / multi-lease history.
  { code: 'L-08', tenantCode: 'T-01', unitCode: 'U-602', propertyCode: 'P-06', start: '2022-01-01', end: '2024-02-29', rent: 500000, deposit: 1000000, frequency: 'Monthly', status: LeaseStatus.Ended },
];

export const leasesSeeder: Seeder = {
  name: 'leases',
  async run(ds: DataSource): Promise<void> {
    const leaseRepo = ds.getRepository(Lease);
    const tenantRepo = ds.getRepository(Tenant);
    const unitRepo = ds.getRepository(Unit);
    const propertyRepo = ds.getRepository(Property);
    const logger = new Logger('Seed:leases');

    for (const data of LEASES) {
      const existing = await leaseRepo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const tenant = await tenantRepo.findOne({ where: { code: data.tenantCode } });
      const unit = await unitRepo.findOne({ where: { code: data.unitCode } });
      const property = await propertyRepo.findOne({ where: { code: data.propertyCode } });
      if (!tenant || !unit || !property) {
        logger.warn(`Missing tenant/unit/property for ${data.code} — skipping.`);
        continue;
      }

      const lease = new Lease();
      lease.code = data.code;
      lease.tenantId = tenant.id;
      lease.unitId = unit.id;
      lease.propertyId = property.id;
      lease.start = data.start;
      lease.end = data.end;
      lease.rent = data.rent;
      lease.deposit = data.deposit;
      lease.frequency = data.frequency;
      lease.status = data.status;
      lease.billing = null;
      lease.grace = null;
      lease.penalty = null;
      lease.renewal = null;
      lease.notes = null;

      await leaseRepo.save(lease);

      if (data.status === LeaseStatus.Active || data.status === LeaseStatus.Ending) {
        await unitRepo.update(unit.id, { tenantId: tenant.id, status: UnitStatus.Occupied });
        await tenantRepo.update(tenant.id, { unitId: unit.id, propertyId: property.id });
      }

      logger.log(`created ${data.code} (${data.status})`);
    }
  },
};
