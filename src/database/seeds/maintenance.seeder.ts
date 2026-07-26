import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  MaintenanceRequest,
  MaintenanceStatus,
  Priority,
} from '../../maintenance/entities/maintenance-request.entity';
import { Property } from '../../properties/entities/property.entity';
import { Technician } from '../../technicians/entities/technician.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Unit } from '../../units/entities/unit.entity';
import type { Seeder } from './seed';

interface SeedRequest {
  code: string;
  unitCode: string;
  propertyCode: string;
  tenantCode: string | null;
  category: string;
  title: string;
  description: string;
  priority: Priority;
  status: MaintenanceStatus;
  assigneeCode: string | null;
  cost: number;
  createdAt: string;
  preferred: string;
}

/**
 * Ported verbatim from mentos-frontend/lib/seed.ts. `createdAt` is set
 * explicitly (overriding BaseEntity's auto "now" default) to preserve the
 * mock's historical spread — MR-01 doesn't exist in the source seed either
 * (an apparent gap, not an omission here).
 */
const REQUESTS: SeedRequest[] = [
  { code: 'MR-07', unitCode: 'U-101', propertyCode: 'P-01', tenantCode: 'T-01', category: 'Plumbing', title: 'Leaking kitchen sink', description: 'Water pools under the sink cabinet whenever the tap is used. Likely a worn washer or loose fitting.', priority: Priority.High, status: MaintenanceStatus.Open, assigneeCode: null, cost: 0, createdAt: '2026-06-30', preferred: 'Weekday mornings' },
  { code: 'MR-06', unitCode: 'U-301', propertyCode: 'P-03', tenantCode: 'T-04', category: 'Electrical', title: 'Power socket sparking', description: 'The socket near the study desk sparks when the laptop charger is plugged in. Tenant has stopped using it.', priority: Priority.Urgent, status: MaintenanceStatus.Assigned, assigneeCode: 'TECH-01', cost: 0, createdAt: '2026-06-29', preferred: 'As soon as possible' },
  { code: 'MR-05', unitCode: 'U-401', propertyCode: 'P-04', tenantCode: 'T-05', category: 'HVAC', title: 'AC not cooling — master bedroom', description: 'Unit runs but only blows warm air. Possibly low on refrigerant or a faulty compressor.', priority: Priority.Medium, status: MaintenanceStatus.InProgress, assigneeCode: 'TECH-03', cost: 180000, createdAt: '2026-06-27', preferred: 'Weekend' },
  { code: 'MR-04', unitCode: 'U-201', propertyCode: 'P-02', tenantCode: 'T-03', category: 'General', title: 'Replace broken window pane', description: 'Cracked pane in the reception area, likely from the recent storm. Needs replacing before the rains return.', priority: Priority.Low, status: MaintenanceStatus.Completed, assigneeCode: 'TECH-04', cost: 95000, createdAt: '2026-06-22', preferred: 'Any weekday' },
  { code: 'MR-03', unitCode: 'U-501', propertyCode: 'P-05', tenantCode: 'T-06', category: 'Security', title: 'Roller shutter jammed', description: 'Shutter gets stuck halfway when closing the shop at night — chain mechanism may need lubrication or realignment.', priority: Priority.High, status: MaintenanceStatus.Closed, assigneeCode: 'TECH-05', cost: 240000, createdAt: '2026-06-15', preferred: 'After business hours' },
  { code: 'MR-02', unitCode: 'U-102', propertyCode: 'P-01', tenantCode: 'T-02', category: 'Plumbing', title: 'Low water pressure in bathroom', description: 'Shower pressure has dropped noticeably over the past week; other taps in the unit seem unaffected.', priority: Priority.Medium, status: MaintenanceStatus.Open, assigneeCode: null, cost: 0, createdAt: '2026-06-30', preferred: 'Weekday afternoons' },
];

export const maintenanceSeeder: Seeder = {
  name: 'maintenance',
  async run(ds: DataSource): Promise<void> {
    const requestRepo = ds.getRepository(MaintenanceRequest);
    const unitRepo = ds.getRepository(Unit);
    const propertyRepo = ds.getRepository(Property);
    const tenantRepo = ds.getRepository(Tenant);
    const technicianRepo = ds.getRepository(Technician);
    const logger = new Logger('Seed:maintenance');

    for (const data of REQUESTS) {
      const existing = await requestRepo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const unit = await unitRepo.findOne({ where: { code: data.unitCode } });
      const property = await propertyRepo.findOne({ where: { code: data.propertyCode } });
      const tenant = data.tenantCode
        ? await tenantRepo.findOne({ where: { code: data.tenantCode } })
        : null;
      const assignee = data.assigneeCode
        ? await technicianRepo.findOne({ where: { code: data.assigneeCode } })
        : null;

      if (!unit || !property) {
        logger.warn(`Missing unit/property for ${data.code} — skipping.`);
        continue;
      }

      const request = new MaintenanceRequest();
      request.code = data.code;
      request.unitId = unit.id;
      request.propertyId = property.id;
      request.tenantId = tenant?.id ?? null;
      request.category = data.category;
      request.title = data.title;
      request.description = data.description;
      request.priority = data.priority;
      request.status = data.status;
      request.assigneeId = assignee?.id ?? null;
      request.cost = data.cost;
      request.preferred = data.preferred;
      request.createdAt = new Date(`${data.createdAt}T00:00:00Z`);

      await requestRepo.save(request);
    }

    logger.log(`${REQUESTS.length} maintenance requests created`);
  },
};
