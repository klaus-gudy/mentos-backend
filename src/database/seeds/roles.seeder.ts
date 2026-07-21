import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BUILT_IN_ROLES } from '../../roles/built-in-roles';
import { Role } from '../../roles/entities/role.entity';
import type { Seeder } from './seed';

/**
 * Upserts the built-in roles by `code`. Re-running refreshes their permission
 * sets — which is what you want when a resource is added to the catalog — but
 * never touches custom roles created through the API.
 *
 * The definitions live in roles/built-in-roles.ts so that bootstrap
 * registration installs exactly the same set on an unseeded database.
 */
export const rolesSeeder: Seeder = {
  name: 'roles',
  async run(ds: DataSource): Promise<void> {
    const repo = ds.getRepository(Role);
    const logger = new Logger('Seed:roles');

    for (const data of BUILT_IN_ROLES) {
      const existing = await repo.findOne({ where: { code: data.code } });
      if (existing) {
        existing.name = data.name;
        existing.description = data.description;
        existing.perms = data.perms;
        existing.isSystem = true;
        await repo.save(existing);
      } else {
        await repo.save(repo.create({ ...data, isSystem: true }));
        logger.log(`created ${data.code} (${data.perms.length} perms)`);
      }
    }
  },
};
