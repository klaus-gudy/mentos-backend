import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Lease } from '../../leases/entities/lease.entity';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Stored subset of mentos-frontend's `InvoiceStatus`. "overdue" is not stored —
 * it's `due`/`partial` whose due date has passed, computed in
 * InvoiceResponseDto (ARCHITECTURE.md §2), so nothing has to flip it on a timer.
 */
export enum InvoiceStatus {
  Due = 'due',
  Partial = 'partial',
  Paid = 'paid',
}

export interface InvoiceLineItem {
  label: string;
  amount: number;
}

/**
 * Minimal invoice support for Sprint 4: just enough for `createLease` to
 * auto-generate the first invoice, matching the frontend's `createLease`
 * side effect. The full Invoices/Payments module (recording payments, voiding,
 * multi-item billing) is Sprint 5 — built on this same table.
 *
 * `items` is `[string, number][]` in the frontend contract — stored as JSONB
 * and mapped to tuples in the response DTO, per ARCHITECTURE.md §3.
 */
@Entity('invoices')
export class Invoice extends BaseEntity {
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
  leaseId: string;

  @ManyToOne(() => Lease, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'leaseId' })
  lease: Lease;

  @Index()
  @Column({ type: 'uuid' })
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Column({ type: 'date' })
  issued: string;

  @Column({ type: 'date' })
  due: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balance: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.Due })
  status: InvoiceStatus;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  items: InvoiceLineItem[];
}
