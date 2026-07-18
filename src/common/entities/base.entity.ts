import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Shared columns for every domain entity (see ARCHITECTURE.md §1–§2):
 *   - `id`        UUID primary key (never leaked as a sequential number)
 *   - timestamps  real timestamptz, returned as ISO and formatted at the FE edge
 *
 * Business entities additionally declare a human-readable `code` column
 * (e.g. "P-01", "TECH-01") — kept per-entity because the sequence prefix differs.
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
