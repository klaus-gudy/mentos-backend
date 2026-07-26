import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Property } from '../../properties/entities/property.entity';
import { Technician } from '../../technicians/entities/technician.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Unit } from '../../units/entities/unit.entity';

/** Matches mentos-frontend's `MaintenanceStatus` exactly — the state machine BACKEND_PLAN.md calls for. */
export enum MaintenanceStatus {
  Open = 'open',
  Assigned = 'assigned',
  InProgress = 'in_progress',
  Completed = 'completed',
  Closed = 'closed',
}

/** Matches mentos-frontend's `Priority` exactly. */
export enum Priority {
  Urgent = 'urgent',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

/**
 * A maintenance request against a unit. `propertyId` is denormalized from
 * `unit.propertyId` at submission (same pattern as Lease/Invoice); `tenantId`
 * is whoever occupies the unit *at submission time* (`unit.tenantId`, nullable
 * — a request can be logged against a vacant unit), not re-derived later if
 * the tenant changes.
 *
 * State machine (open → assigned → in_progress → completed → closed) is
 * enforced by MaintenanceService, not left to the client like the frontend
 * mock's unguarded status writes.
 */
@Entity('maintenance_requests')
export class MaintenanceRequest extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

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

  @Index()
  @Column({ type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant | null;

  /** One of common/maintenance-categories.ts. */
  @Column({ type: 'varchar', length: 20 })
  category: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: Priority })
  priority: Priority;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.Open })
  status: MaintenanceStatus;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => Technician, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee: Technician | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'varchar', length: 100, default: 'Any time' })
  preferred: string;
}
