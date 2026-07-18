import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import dataSource from '../data-source';
import { seeders } from './seeders';

/**
 * Idempotent, dependency-ordered seed runner. Each seeder is safe to re-run:
 * it upserts by the entity's business `code` (see ARCHITECTURE.md §1).
 *
 * Seeders register themselves in ./seeders in dependency order. They land per
 * sprint as their entities are built — the runner itself is complete now.
 */
export interface Seeder {
  name: string;
  run(ds: DataSource): Promise<void>;
}

async function main() {
  const logger = new Logger('Seed');
  await dataSource.initialize();
  logger.log('Database connection established.');

  try {
    if (seeders.length === 0) {
      logger.warn('No seeders registered yet — entities land per sprint (see BACKEND_PLAN.md).');
    }
    for (const seeder of seeders) {
      const start = Date.now();
      await seeder.run(dataSource);
      logger.log(`✓ ${seeder.name} (${Date.now() - start}ms)`);
    }
    logger.log('Seed complete.');
  } catch (err) {
    logger.error('Seed failed.', err instanceof Error ? err.stack : String(err));
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

void main();
