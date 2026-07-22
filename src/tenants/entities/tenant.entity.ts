import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Property } from '../../properties/entities/property.entity';
import { Unit } from '../../units/entities/unit.entity';

/** Matches mentos-frontend's `TenantStatus` exactly (lib/types.ts). */
export enum TenantStatus {
  Active = 'active',
  Prospective = 'prospective',
  Notice = 'notice',
  Vacated = 'vacated',
  Blacklisted = 'blacklisted',
}

/**
 * A person (or, via `org`, a company) renting a unit. `unitId`/`propertyId`
 * are null until a lease occupies them (mentos-frontend's `createLease`,
 * Sprint 4) — onboarding alone never sets them, matching the frontend's
 * `onboardTenant` which always creates a `prospective` tenant with no unit.
 *
 * `since` is a real date per ARCHITECTURE.md §2: the frontend's display
 * string ("Mar 2024") is formatted at its edge, not stored here.
 */
@Entity('tenants')
export class Tenant extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.Prospective })
  status: TenantStatus;

  @Column({ type: 'date' })
  since: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  unitId: string | null;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unitId' })
  unit: Unit | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  /** Company name for corporate tenants; blank for individuals. */
  @Column({ type: 'varchar', length: 255, default: '' })
  org: string;

  @Column({ type: 'varchar', length: 160 })
  occupation: string;

  @Column({ type: 'varchar', length: 160, default: '' })
  employer: string;

  /** Free text: "NIDA", "Passport", "Student ID"… */
  @Column({ type: 'varchar', length: 50 })
  idType: string;

  @Column({ type: 'varchar', length: 100 })
  idNumber: string;

  /** Next-of-kin, pre-joined as "Name · Relation" per the frontend contract. */
  @Column({ type: 'text', default: '—' })
  kin: string;

  /** Preferred contact channel: "SMS" | "Email" | "In-app" (free text). */
  @Column({ type: 'varchar', length: 20, default: 'SMS' })
  comms: string;
}
