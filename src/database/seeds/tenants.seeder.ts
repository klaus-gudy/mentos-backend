import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Tenant, TenantStatus } from '../../tenants/entities/tenant.entity';
import type { Seeder } from './seed';

interface SeedTenant {
  code: string;
  name: string;
  phone: string;
  email: string;
  status: TenantStatus;
  since: string;
  org: string;
  occupation: string;
  employer: string;
  idType: string;
  idNumber: string;
  kin: string;
  comms: string;
}

/**
 * Ported verbatim from mentos-frontend/lib/seed.ts. `unitId`/`propertyId` are
 * never set here — the leases seeder is the sole writer of occupancy, exactly
 * like the live API (LeasesService.create/terminate). `status` is seeded as
 * given even for occupied tenants: it isn't purely lease-derived (T-07 is
 * "notice" while still leased — that's a broader lifecycle state a lease
 * only sometimes drives, same as blacklist()).
 */
const TENANTS: SeedTenant[] = [
  { code: 'T-01', name: 'Amina Hassan', phone: '+255 712 884 201', email: 'amina.hassan@mail.co.tz', status: TenantStatus.Active, since: '2024-03-01', org: '', occupation: 'Pharmacist', employer: 'Shoppers Plaza', idType: 'NIDA', idNumber: '19880412-00145-00001-12', kin: 'Juma Hassan · Brother', comms: 'SMS' },
  { code: 'T-02', name: 'John Mushi', phone: '+255 754 110 938', email: 'j.mushi@mail.co.tz', status: TenantStatus.Active, since: '2025-01-01', org: '', occupation: 'Accountant', employer: 'NMB Bank', idType: 'NIDA', idNumber: '19910223-11045-00007-08', kin: 'Neema Mushi · Spouse', comms: 'Email' },
  { code: 'T-03', name: 'Grace Kileo', phone: '+255 786 552 014', email: 'grace@kazitech.co.tz', status: TenantStatus.Active, since: '2023-08-01', org: 'Kazi Tech Ltd', occupation: 'Operations Lead', employer: 'Kazi Tech Ltd', idType: 'Passport', idNumber: 'TZ4490217', kin: 'Kazi Tech HR', comms: 'Email' },
  { code: 'T-04', name: 'Baraka Mwakyusa', phone: '+255 689 447 720', email: 'baraka.m@student.udsm.ac.tz', status: TenantStatus.Active, since: '2025-09-01', org: '', occupation: 'Student', employer: 'UDSM', idType: 'Student ID', idNumber: '2025-04-08812', kin: 'Anna Mwakyusa · Mother', comms: 'SMS' },
  { code: 'T-05', name: 'Neema Joseph', phone: '+255 713 290 551', email: 'neema.joseph@mail.co.tz', status: TenantStatus.Active, since: '2024-02-01', org: '', occupation: 'Surgeon', employer: 'Aga Khan Hospital', idType: 'NIDA', idNumber: '19850901-22014-00003-05', kin: 'David Joseph · Spouse', comms: 'In-app' },
  { code: 'T-06', name: 'Said Salim', phone: '+255 778 661 003', email: 'said.salim@biz.co.tz', status: TenantStatus.Active, since: '2024-11-01', org: 'Salim Traders', occupation: 'Retailer', employer: 'Self-employed', idType: 'NIDA', idNumber: '19790715-30077-00009-01', kin: 'Rukia Salim · Spouse', comms: 'SMS' },
  { code: 'T-07', name: 'Fatuma Abdallah', phone: '+255 715 002 884', email: 'fatuma.a@mail.co.tz', status: TenantStatus.Notice, since: '2023-06-01', org: '', occupation: 'Teacher', employer: 'Feza Schools', idType: 'NIDA', idNumber: '19900304-40021-00002-07', kin: 'Hawa Abdallah · Sister', comms: 'SMS' },
  { code: 'T-08', name: 'Daniel Otieno', phone: '+255 762 339 110', email: 'd.otieno@mail.co.tz', status: TenantStatus.Vacated, since: '2022-01-01', org: '', occupation: 'Engineer', employer: 'Geita Gold', idType: 'Passport', idNumber: 'KE7741120', kin: 'Mary Otieno · Spouse', comms: 'Email' },
  { code: 'T-09', name: 'Peter Komba', phone: '+255 717 880 442', email: 'p.komba@mail.co.tz', status: TenantStatus.Blacklisted, since: '2023-01-01', org: '', occupation: 'Trader', employer: '—', idType: 'NIDA', idNumber: '19870622-50033-00001-09', kin: '—', comms: 'SMS' },
];

export const tenantsSeeder: Seeder = {
  name: 'tenants',
  async run(ds: DataSource): Promise<void> {
    const tenantRepo = ds.getRepository(Tenant);
    const logger = new Logger('Seed:tenants');

    for (const data of TENANTS) {
      const existing = await tenantRepo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const tenant = new Tenant();
      tenant.code = data.code;
      tenant.name = data.name;
      tenant.phone = data.phone;
      tenant.email = data.email;
      tenant.status = data.status;
      tenant.since = data.since;
      tenant.unitId = null;
      tenant.propertyId = null;
      tenant.org = data.org;
      tenant.occupation = data.occupation;
      tenant.employer = data.employer;
      tenant.idType = data.idType;
      tenant.idNumber = data.idNumber;
      tenant.kin = data.kin;
      tenant.comms = data.comms;

      await tenantRepo.save(tenant);
      logger.log(`created ${data.code} ${data.name}`);
    }
  },
};
