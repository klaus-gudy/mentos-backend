import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Lease } from '../../leases/entities/lease.entity';
import { MaintenanceRequest } from '../../maintenance/entities/maintenance-request.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Unit } from '../../units/entities/unit.entity';
import { User } from '../../users/entities/user.entity';

/** Real file kind, derived from `mimeType` — the frontend's `AppDocument.type` is only ever these two. */
export enum DocumentFileType {
  Pdf = 'pdf',
  Img = 'img',
}

export enum DocumentGeneratedBy {
  Upload = 'upload',
  System = 'system',
}

/**
 * A file plus metadata, attached to exactly one owning entity. The frontend's
 * `AppDocument.owner` is a loose display string ("P-01 · A-12", "T-01",
 * "INV-1011") built from whichever real relation is set — see
 * DocumentResponseDto.from() for the exact per-owner-type format, reverse
 * engineered from mentos-frontend/lib/seed.ts's eight documents.
 *
 * Exactly one of the seven `*Id` columns is non-null — enforced in
 * DocumentsService, not by a DB constraint (Postgres CHECK constraints across
 * nullable columns are workable but this repo's other polymorphism-adjacent
 * cases, e.g. Lease linking Tenant+Unit+Property, all lean on app-level
 * invariants rather than SQL ones, so this stays consistent).
 *
 * Real file bytes live in object storage (StorageService/MinIO), not in
 * Postgres — this row is only ever metadata plus a `storageKey` pointer.
 */
@Entity('documents')
export class Document extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  category: string;

  // ---- polymorphic owner: exactly one of the following is set ----

  @Index()
  @Column({ type: 'uuid', nullable: true })
  propertyId: string | null;
  @ManyToOne(() => Property, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property: Property | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  unitId: string | null;
  @ManyToOne(() => Unit, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'unitId' })
  unit: Unit | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  tenantId: string | null;
  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  leaseId: string | null;
  @ManyToOne(() => Lease, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'leaseId' })
  lease: Lease | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  invoiceId: string | null;
  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  paymentId: string | null;
  @ManyToOne(() => Payment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  maintenanceRequestId: string | null;
  @ManyToOne(() => MaintenanceRequest, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maintenanceRequestId' })
  maintenanceRequest: MaintenanceRequest | null;

  // ---- file metadata ----

  /** Object storage key — the file itself lives in MinIO/S3, not this table. */
  @Column({ type: 'text' })
  storageKey: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  /** Null for system-generated documents (e.g. the lease agreement PDF). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  originalFileName: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'enum', enum: DocumentGeneratedBy, default: DocumentGeneratedBy.Upload })
  generatedBy: DocumentGeneratedBy;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  uploadedByUserId: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedByUser: User | null;

  get type(): DocumentFileType {
    return this.mimeType === 'application/pdf' ? DocumentFileType.Pdf : DocumentFileType.Img;
  }
}
