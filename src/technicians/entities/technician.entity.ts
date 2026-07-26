import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/** Matches mentos-frontend's `TechnicianStatus` exactly. */
export enum TechnicianStatus {
  Active = 'active',
  OnLeave = 'on_leave',
  Inactive = 'inactive',
}

/**
 * A maintenance technician or vendor. `skills` are maintenance categories
 * (see common/maintenance-categories.ts) — the maintenance assignment screen
 * filters this directory by whether `skills` includes the request's category
 * (mentos-frontend/app/(app)/maintenance/[id]/page.tsx), client-side, against
 * the full list this module returns.
 *
 * No RBAC resource exists for technicians in the frontend's `permCatalog` —
 * endpoints are gated under the closest `maintenance.*` permissions instead
 * of inventing a new resource key (see ARCHITECTURE.md §9).
 */
@Entity('technicians')
export class Technician extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'jsonb' })
  skills: string[];

  @Column({ type: 'enum', enum: TechnicianStatus, default: TechnicianStatus.Active })
  status: TechnicianStatus;

  /** True for a company/vendor rather than an individual. */
  @Column({ type: 'boolean', default: false })
  company: boolean;

  @Column({ type: 'date' })
  since: string;
}
