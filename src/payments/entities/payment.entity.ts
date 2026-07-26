import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * A receipt against an invoice. `tenantId` is denormalized from the invoice
 * at creation (read-only thereafter) — same pattern as Lease/Invoice
 * flattening `propId`, so payment lists don't need a join through Invoice.
 *
 * `period` isn't a column — the frontend's `Payment.period` always matches
 * its invoice's billing period, so it's computed in PaymentResponseDto from
 * `invoice.issued` (ARCHITECTURE.md §2/§3), same as InvoiceResponseDto.period.
 */
@Entity('payments')
export class Payment extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Index()
  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Index()
  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  /** Free text, one of the frontend's fixed dropdown values — see CreatePaymentDto. */
  @Column({ type: 'varchar', length: 30 })
  method: string;

  @Column({ type: 'date' })
  date: string;
}
