import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Technician, TechnicianStatus } from '../../technicians/entities/technician.entity';
import type { Seeder } from './seed';

interface SeedTechnician {
  code: string;
  name: string;
  phone: string;
  email: string;
  skills: string[];
  status: TechnicianStatus;
  company: boolean;
  since: string;
}

/** Ported verbatim from mentos-frontend/lib/seed.ts. */
const TECHNICIANS: SeedTechnician[] = [
  { code: 'TECH-01', name: 'Hamisi Kibo', phone: '+255 713 447 218', email: 'hamisi.kibo@fixit.co.tz', skills: ['Electrical'], status: TechnicianStatus.Active, company: false, since: '2024-02-01' },
  { code: 'TECH-02', name: "Baraka Mng'ong'o", phone: '+255 754 902 116', email: 'baraka.plumb@fixit.co.tz', skills: ['Plumbing'], status: TechnicianStatus.Active, company: false, since: '2024-05-01' },
  { code: 'TECH-03', name: 'CoolAir Services', phone: '+255 22 550 1180', email: 'dispatch@coolair.co.tz', skills: ['HVAC'], status: TechnicianStatus.Active, company: true, since: '2023-08-01' },
  { code: 'TECH-04', name: 'Juma Petro', phone: '+255 689 331 705', email: 'juma.handyman@mail.co.tz', skills: ['General', 'Structural'], status: TechnicianStatus.Active, company: false, since: '2023-01-01' },
  { code: 'TECH-05', name: 'SecureFix Ltd', phone: '+255 22 761 4409', email: 'ops@securefix.co.tz', skills: ['Security'], status: TechnicianStatus.Active, company: true, since: '2023-03-01' },
  { code: 'TECH-06', name: 'Salma Rashid', phone: '+255 767 220 884', email: 'salma.rashid@fixit.co.tz', skills: ['Electrical', 'HVAC'], status: TechnicianStatus.Active, company: false, since: '2024-09-01' },
  { code: 'TECH-07', name: 'Omary Nchimbi', phone: '+255 715 660 042', email: 'omary.n@mail.co.tz', skills: ['Plumbing', 'General'], status: TechnicianStatus.OnLeave, company: false, since: '2024-11-01' },
  { code: 'TECH-08', name: 'BuildRight Contractors', phone: '+255 22 288 3311', email: 'info@buildright.co.tz', skills: ['Structural', 'General'], status: TechnicianStatus.Active, company: true, since: '2023-06-01' },
];

export const techniciansSeeder: Seeder = {
  name: 'technicians',
  async run(ds: DataSource): Promise<void> {
    const repo = ds.getRepository(Technician);
    const logger = new Logger('Seed:technicians');

    for (const data of TECHNICIANS) {
      const existing = await repo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const technician = new Technician();
      technician.code = data.code;
      technician.name = data.name;
      technician.phone = data.phone;
      technician.email = data.email;
      technician.skills = data.skills;
      technician.status = data.status;
      technician.company = data.company;
      technician.since = data.since;

      await repo.save(technician);
    }

    logger.log(`${TECHNICIANS.length} technicians created`);
  },
};
