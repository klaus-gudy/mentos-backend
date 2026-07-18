import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

loadEnv();

/**
 * Single source of truth for the TypeORM connection — consumed both by the Nest
 * TypeOrmModule (see database.module.ts) and by the TypeORM CLI for migrations.
 *
 * `synchronize` is intentionally OFF everywhere: schema changes go through
 * generated migrations only (see ARCHITECTURE.md §5).
 */
export const dataSourceOptions: PostgresConnectionOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'nyumba',
  password: process.env.DB_PASSWORD ?? 'nyumba',
  database: process.env.DB_NAME ?? 'nyumba',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
