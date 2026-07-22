import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { Unit, UnitStatus } from '../../units/entities/unit.entity';
import type { Seeder } from './seed';

interface SeedUnit {
  code: string;
  propertyCode: string;
  no: string;
  floor: number;
  type: string;
  size: number;
  rent: number;
  deposit: number;
}

/**
 * Ported verbatim from mentos-frontend/lib/seed.ts (the `U()` helper's rows).
 * Every unit seeds `vacant` with no tenant — the leases seeder is the sole
 * writer of occupancy, exactly like the live API (LeasesService.create()).
 * The source seed's two dangling tenant references ("T-08x", "T-10x" on
 * U-203/U-601, which don't exist in the tenant roster) are simply absent
 * here, since nothing occupies those units.
 */
const UNITS: SeedUnit[] = [
  { code: 'U-101', propertyCode: 'P-01', no: 'A-12', floor: 1, type: '2BR', size: 62, rent: 520000, deposit: 1040000 },
  { code: 'U-102', propertyCode: 'P-01', no: 'A-08', floor: 1, type: '1BR', size: 46, rent: 420000, deposit: 840000 },
  { code: 'U-103', propertyCode: 'P-01', no: 'A-03', floor: 1, type: '2BR', size: 60, rent: 500000, deposit: 1000000 },
  { code: 'U-104', propertyCode: 'P-01', no: 'B-05', floor: 2, type: '2BR', size: 64, rent: 540000, deposit: 1080000 },
  { code: 'U-105', propertyCode: 'P-01', no: 'B-09', floor: 2, type: '3BR', size: 88, rent: 720000, deposit: 1440000 },
  { code: 'U-201', propertyCode: 'P-02', no: 'Suite 3B', floor: 3, type: 'Office', size: 110, rent: 1850000, deposit: 3700000 },
  { code: 'U-202', propertyCode: 'P-02', no: 'Suite 4A', floor: 4, type: 'Office', size: 140, rent: 2400000, deposit: 4800000 },
  { code: 'U-203', propertyCode: 'P-02', no: 'Suite 2C', floor: 2, type: 'Office', size: 85, rent: 1450000, deposit: 2900000 },
  { code: 'U-301', propertyCode: 'P-03', no: 'R-104', floor: 1, type: 'Studio', size: 18, rent: 210000, deposit: 210000 },
  { code: 'U-302', propertyCode: 'P-03', no: 'R-108', floor: 1, type: 'Studio', size: 18, rent: 210000, deposit: 210000 },
  { code: 'U-303', propertyCode: 'P-03', no: 'R-205', floor: 2, type: 'Studio', size: 20, rent: 240000, deposit: 240000 },
  { code: 'U-401', propertyCode: 'P-04', no: 'Villa 2', floor: 0, type: '3BR', size: 210, rent: 3800000, deposit: 7600000 },
  { code: 'U-402', propertyCode: 'P-04', no: 'Villa 5', floor: 0, type: '3BR', size: 230, rent: 4200000, deposit: 8400000 },
  { code: 'U-501', propertyCode: 'P-05', no: 'Shop G-07', floor: 0, type: 'Retail', size: 40, rent: 1200000, deposit: 2400000 },
  { code: 'U-502', propertyCode: 'P-05', no: 'Shop G-11', floor: 0, type: 'Retail', size: 55, rent: 1600000, deposit: 3200000 },
  { code: 'U-503', propertyCode: 'P-05', no: 'Shop F-03', floor: 1, type: 'Retail', size: 38, rent: 980000, deposit: 1960000 },
  { code: 'U-601', propertyCode: 'P-06', no: 'C-02', floor: 1, type: '1BR', size: 44, rent: 400000, deposit: 800000 },
  { code: 'U-602', propertyCode: 'P-06', no: 'C-06', floor: 1, type: '2BR', size: 58, rent: 500000, deposit: 1000000 },
  { code: 'U-603', propertyCode: 'P-06', no: 'D-04', floor: 2, type: '2BR', size: 60, rent: 520000, deposit: 1040000 },
];

/** type → beds, matching the seed's own `beds()` helper. */
function bedsFromType(type: string): number {
  const map: Record<string, number> = { Studio: 1, '1BR': 1, '2BR': 2, '3BR': 3 };
  return map[type] ?? 0;
}

export const unitsSeeder: Seeder = {
  name: 'units',
  async run(ds: DataSource): Promise<void> {
    const unitRepo = ds.getRepository(Unit);
    const propertyRepo = ds.getRepository(Property);
    const logger = new Logger('Seed:units');

    for (const data of UNITS) {
      const existing = await unitRepo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const property = await propertyRepo.findOne({ where: { code: data.propertyCode } });
      if (!property) {
        logger.warn(`Property "${data.propertyCode}" not found — skipping ${data.code}.`);
        continue;
      }

      const unit = new Unit();
      unit.code = data.code;
      unit.propertyId = property.id;
      unit.no = data.no;
      unit.floor = data.floor;
      unit.type = data.type;
      unit.size = data.size;
      unit.rent = data.rent;
      unit.deposit = data.deposit;
      unit.status = UnitStatus.Vacant;
      unit.tenantId = null;
      unit.beds = bedsFromType(data.type);
      unit.bathrooms = null;
      unit.block = null;
      unit.minTenure = null;
      unit.amenities = [];

      await unitRepo.save(unit);
    }

    logger.log(`${UNITS.length} units created`);
  },
};
