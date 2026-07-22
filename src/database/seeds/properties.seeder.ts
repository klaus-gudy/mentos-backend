import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Property, PropertyStatus, PropertyType } from '../../properties/entities/property.entity';
import type { Seeder } from './seed';

interface SeedProperty {
  code: string;
  name: string;
  type: PropertyType;
  area: string;
  city: string;
  owner: string;
}

/** Ported verbatim from mentos-frontend/lib/seed.ts. */
const PROPERTIES: SeedProperty[] = [
  { code: 'P-01', name: 'Mwenge Apartments', type: PropertyType.Apartment, area: 'Kinondoni', city: 'Dar es Salaam', owner: 'Aziz Holdings Ltd' },
  { code: 'P-02', name: 'Oyster Bay Office Park', type: PropertyType.Office, area: 'Oyster Bay', city: 'Dar es Salaam', owner: 'Coastal REIT' },
  { code: 'P-03', name: 'Mlimani City Hostel', type: PropertyType.Hostel, area: 'Ubungo', city: 'Dar es Salaam', owner: 'UDSM Estates' },
  { code: 'P-04', name: 'Masaki Garden Villas', type: PropertyType.House, area: 'Masaki', city: 'Dar es Salaam', owner: 'J. Mushi (Private)' },
  { code: 'P-05', name: 'Kariakoo Trade Plaza', type: PropertyType.Commercial, area: 'Ilala', city: 'Dar es Salaam', owner: 'Kariakoo Holdings' },
  { code: 'P-06', name: 'Tegeta Heights', type: PropertyType.Apartment, area: 'Kinondoni', city: 'Dar es Salaam', owner: 'Aziz Holdings Ltd' },
];

export const propertiesSeeder: Seeder = {
  name: 'properties',
  async run(ds: DataSource): Promise<void> {
    const repo = ds.getRepository(Property);
    const logger = new Logger('Seed:properties');

    for (const data of PROPERTIES) {
      const existing = await repo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const property = new Property();
      property.code = data.code;
      property.name = data.name;
      property.type = data.type;
      property.area = data.area;
      property.city = data.city;
      property.owner = data.owner;
      property.status = PropertyStatus.Active;
      property.description = null;
      property.amenities = [];

      await repo.save(property);
      logger.log(`created ${data.code} ${data.name}`);
    }
  },
};
