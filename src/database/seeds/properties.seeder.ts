import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Property, PropertyStatus, PropertyType } from '../../properties/entities/property.entity';
import type { Seeder } from './seed';

interface SeedProperty {
  code: string;
  name: string;
  description: string;
  address: string;
  city: string;
  zipCode: string;
  type: PropertyType;
}

/** Ported from mentos-frontend/lib/seed.ts; the first two properties with their details. */
const PROPERTIES: SeedProperty[] = [
  {
    code: 'P-1',
    name: 'Riverside Apartments',
    description: 'A modern apartment complex with 12 units, situated near the riverside.',
    address: '123 Main Street',
    city: 'Dar es Salaam',
    zipCode: '10101',
    type: PropertyType.Residential,
  },
  {
    code: 'P-2',
    name: 'Downtown Plaza',
    description: 'Commercial office spaces and retail units in the heart of the city.',
    address: '456 Commerce Avenue',
    city: 'Dar es Salaam',
    zipCode: '10102',
    type: PropertyType.Commercial,
  },
];

export const propertiesSeeder: Seeder = {
  name: 'properties',
  async run(ds: DataSource): Promise<void> {
    const repo = ds.getRepository(Property);
    const logger = new Logger('Seed:properties');

    for (const data of PROPERTIES) {
      const existing = await repo.findOne({ where: { code: data.code } });
      if (existing) {
        continue; // Skip if already exists
      }

      await repo.save(
        repo.create({
          ...data,
          status: PropertyStatus.Active,
          unitCount: 0, // Will be updated as units are created
        }),
      );
      logger.log(`created ${data.code} ${data.name}`);
    }
  },
};
