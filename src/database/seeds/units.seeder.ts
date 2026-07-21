import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { Unit, UnitStatus, UnitType } from '../../units/entities/unit.entity';
import type { Seeder } from './seed';

interface SeedUnit {
  propertyCode: string;
  unitNumber: string;
  type: UnitType;
  description: string;
  monthlyRent: number;
  deposit: number;
  floorNumber: number;
  hasBalcony: boolean;
  hasParkingSpace: boolean;
  amenities: string;
  status: UnitStatus;
}

/** Sample units for the seeded properties. */
const UNITS: SeedUnit[] = [
  // Riverside Apartments units
  {
    propertyCode: 'P-1',
    unitNumber: '101',
    type: UnitType.TwoBedroom,
    description: 'Spacious 2-bedroom apartment with balcony',
    monthlyRent: 1500,
    deposit: 3000,
    floorNumber: 1,
    hasBalcony: true,
    hasParkingSpace: true,
    amenities: 'Air conditioning, Hot water, Furnished kitchen',
    status: UnitStatus.Occupied,
  },
  {
    propertyCode: 'P-1',
    unitNumber: '102',
    type: UnitType.OneBedroom,
    description: 'Cozy 1-bedroom apartment',
    monthlyRent: 1000,
    deposit: 2000,
    floorNumber: 1,
    hasBalcony: false,
    hasParkingSpace: true,
    amenities: 'Air conditioning, Hot water',
    status: UnitStatus.Vacant,
  },
  {
    propertyCode: 'P-1',
    unitNumber: '201',
    type: UnitType.ThreeBedroom,
    description: 'Luxurious 3-bedroom suite on the 2nd floor',
    monthlyRent: 2500,
    deposit: 5000,
    floorNumber: 2,
    hasBalcony: true,
    hasParkingSpace: true,
    amenities: 'Air conditioning, Hot water, Furnished, Balcony with river view',
    status: UnitStatus.Occupied,
  },
  {
    propertyCode: 'P-1',
    unitNumber: '202',
    type: UnitType.Studio,
    description: 'Compact studio apartment',
    monthlyRent: 600,
    deposit: 1200,
    floorNumber: 2,
    hasBalcony: false,
    hasParkingSpace: false,
    amenities: 'Air conditioning',
    status: UnitStatus.Vacant,
  },

  // Downtown Plaza office units
  {
    propertyCode: 'P-2',
    unitNumber: 'A1',
    type: UnitType.Office,
    description: 'Ground floor office space',
    monthlyRent: 800,
    deposit: 1600,
    floorNumber: 0,
    hasBalcony: false,
    hasParkingSpace: true,
    amenities: 'Central air, High-speed internet ready',
    status: UnitStatus.Vacant,
  },
  {
    propertyCode: 'P-2',
    unitNumber: 'A2',
    type: UnitType.Commercial,
    description: 'Retail space with street frontage',
    monthlyRent: 2000,
    deposit: 4000,
    floorNumber: 0,
    hasBalcony: false,
    hasParkingSpace: true,
    amenities: 'Large windows, Display area',
    status: UnitStatus.Occupied,
  },
  {
    propertyCode: 'P-2',
    unitNumber: 'B1',
    type: UnitType.Office,
    description: 'Second floor office suite',
    monthlyRent: 1200,
    deposit: 2400,
    floorNumber: 1,
    hasBalcony: true,
    hasParkingSpace: true,
    amenities: 'Central air, Kitchenette, Balcony',
    status: UnitStatus.Occupied,
  },
];

export const unitsSeeder: Seeder = {
  name: 'units',
  async run(ds: DataSource): Promise<void> {
    const propertyRepo = ds.getRepository(Property);
    const unitRepo = ds.getRepository(Unit);
    const logger = new Logger('Seed:units');

    for (const data of UNITS) {
      const property = await propertyRepo.findOne({ where: { code: data.propertyCode } });
      if (!property) {
        logger.warn(`Property "${data.propertyCode}" not found — skipping units.`);
        continue;
      }

      // Check if a unit with this number already exists (uniqueness is per property)
      const existing = await unitRepo.findOne({
        where: {
          propertyId: property.id,
          unitNumber: data.unitNumber,
        },
      });
      if (existing) {
        continue;
      }

      // Generate code: U-{propertySeq}{unitSeq}
      // e.g. P-1 → U-101, U-102, etc
      const propSeq = data.propertyCode.replace(/^\D+/, '').padStart(2, '0');
      const unitSeq = String(
        (
          await unitRepo.count({
            where: { propertyId: property.id },
          })
        ) + 1,
      ).padStart(2, '0');

      const unit = unitRepo.create({
        code: `U-${propSeq}${unitSeq}`,
        propertyId: property.id,
        unitNumber: data.unitNumber,
        description: data.description,
        type: data.type,
        status: data.status,
        monthlyRent: data.monthlyRent,
        deposit: data.deposit,
        floorNumber: data.floorNumber,
        hasBalcony: data.hasBalcony,
        hasParkingSpace: data.hasParkingSpace,
        amenities: data.amenities,
      });

      await unitRepo.save(unit);
    }

    // Recalculate unitCount for each property
    for (const property of await propertyRepo.find()) {
      const count = await unitRepo.count({ where: { propertyId: property.id } });
      property.unitCount = count;
      await propertyRepo.save(property);
    }

    logger.log(`${UNITS.length} units created and unitCount denormalized`);
  },
};
