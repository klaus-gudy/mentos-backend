import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Unit } from '../../units/entities/unit.entity';

/** Matches mentos-frontend's `LeaseStatus` exactly (lib/types.ts). */
export enum LeaseStatus {
  Active = 'active',
  Ending = 'ending',
  Ended = 'ended',
}

/**
 * The authoritative record of who occupies a unit and when. `Unit.tenantId`/
 * `status` and `Tenant.unitId`/`propertyId`/`status` are derived from the
 * active lease — this entity is the single writer for occupancy, enforced by
 * LeasesService (create occupies, terminate vacates). See ARCHITECTURE.md §8.
 *
 * `propertyId` is denormalized from `unit.propertyId` at creation (read-only
 * thereafter) so list/filter queries don't need a join through Unit —
 * mirrors the frontend's flattened `Lease.propId`.
 *
 * `daysToExpiry` is intentionally not a column — it's derived from `end` and
 * "now", so it's computed in LeaseResponseDto per ARCHITECTURE.md §2.
 */
@Entity('leases')
export class Lease extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Index()
  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Index()
  @Column({ type: 'uuid' })
  unitId: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @Index()
  @Column({ type: 'uuid' })
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column({ type: 'date' })
  start: string;

  @Column({ type: 'date' })
  end: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  rent: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  deposit: number;

  /** Free text: "Monthly", "Quarterly"… */
  @Column({ type: 'varchar', length: 50 })
  frequency: string;

  @Column({ type: 'enum', enum: LeaseStatus, default: LeaseStatus.Active })
  status: LeaseStatus;

  @Column({ type: 'text', nullable: true })
  billing: string | null;

  @Column({ type: 'text', nullable: true })
  grace: string | null;

  @Column({ type: 'text', nullable: true })
  penalty: string | null;

  @Column({ type: 'text', nullable: true })
  renewal: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
