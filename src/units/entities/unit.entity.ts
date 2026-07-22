import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/** Only two states in the frontend contract — occupancy is derived from `tenantId`. */
export enum UnitStatus {
  Vacant = 'vacant',
  Occupied = 'occupied',
}

/**
 * A rentable unit within a property. `type` is free text in the frontend
 * contract ("Studio", "1BR", "2BR", "Office", "Retail"…), not a closed enum.
 *
 * `tenantId` is the occupancy pointer — set by createLease (Sprint 4), not by
 * this module. `status` is kept in sync with it rather than edited directly
 * (ARCHITECTURE.md §3 denormalization pattern): occupied iff tenantId is set.
 *
 * `deposit` is always 2× `rent`, computed server-side — the frontend never
 * accepts a client-supplied deposit for units (see addUnit/updateUnit in
 * mentos-frontend/lib/api.ts).
 */
@Entity('units')
@Unique(['propertyId', 'no'])
export class Unit extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Index()
  @Column({ type: 'uuid' })
  propertyId: string;

  @ManyToOne(() => Property, (property) => property.units, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  /** Unit label as shown on the door / lease, e.g. "A-12", "Suite 3B". */
  @Column({ type: 'varchar', length: 100 })
  no: string;

  @Column({ type: 'int' })
  floor: number;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  /** Floor area in square meters. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  size: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  rent: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  deposit: number;

  @Column({ type: 'enum', enum: UnitStatus, default: UnitStatus.Vacant })
  status: UnitStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant | null;

  @Column({ type: 'int', nullable: true })
  beds: number | null;

  @Column({ type: 'int', nullable: true })
  bathrooms: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  block: string | null;

  /** Minimum tenure in months. */
  @Column({ type: 'int', nullable: true })
  minTenure: number | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  amenities: string[];
}
