import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DOCUMENT_CATEGORIES } from '../../common/document-categories';
import { Document, DocumentFileType } from '../entities/document.entity';

/** Which entity a document is attached to — exactly one owner per document. */
export enum DocumentOwnerType {
  Property = 'property',
  Unit = 'unit',
  Tenant = 'tenant',
  Lease = 'lease',
  Invoice = 'invoice',
  Payment = 'payment',
  Maintenance = 'maintenance',
}

/** Frontend-facing shape — mirrors mentos-frontend's `AppDocument` exactly. */
export class DocumentResponseDto {
  @ApiProperty({ example: 'D-1', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'Lease agreement · L-01 Amina Hassan' })
  name: string;

  @ApiProperty({ enum: DOCUMENT_CATEGORIES, example: 'Lease' })
  cat: string;

  @ApiProperty({
    example: 'P-01 · A-12',
    description:
      'Computed display reference to the owning entity — property+unit for unit-scoped ' +
      'docs (leases, maintenance), tenant/invoice code otherwise, invoice code for payments',
  })
  owner: string;

  @ApiProperty({ example: '1.2 MB', description: 'Computed from the real stored byte count' })
  size: string;

  @ApiProperty({ example: '2026-07-26T00:00:00.000Z', description: 'ISO timestamp' })
  date: string;

  @ApiProperty({ enum: DocumentFileType, example: DocumentFileType.Pdf })
  type: DocumentFileType;

  @ApiProperty({ example: 'v1' })
  version: string;

  static from(document: Document): DocumentResponseDto {
    return {
      id: document.code,
      name: document.name,
      cat: document.category,
      owner: DocumentResponseDto.ownerDisplay(document),
      size: DocumentResponseDto.humanSize(document.sizeBytes),
      date: document.createdAt.toISOString(),
      type: document.type,
      version: `v${document.version}`,
    };
  }

  static fromMany(documents: Document[]): DocumentResponseDto[] {
    return documents.map((d) => DocumentResponseDto.from(d));
  }

  /**
   * Reverse-engineered from mentos-frontend/lib/seed.ts's eight documents:
   * unit-scoped owners (a direct unit, or a lease/maintenance request that
   * resolves to one) show "property · unit-no"; a bare property shows its own
   * code; tenant and invoice show their own code; a payment shows its
   * *invoice's* code (matching the seed's receipt example exactly).
   */
  private static ownerDisplay(document: Document): string {
    if (document.unit) {
      return `${document.unit.property?.code ?? '?'} · ${document.unit.no}`;
    }
    if (document.property) {
      return document.property.code;
    }
    if (document.tenant) {
      return document.tenant.code;
    }
    if (document.lease) {
      return `${document.lease.property?.code ?? '?'} · ${document.lease.unit?.no ?? '?'}`;
    }
    if (document.invoice) {
      return document.invoice.code;
    }
    if (document.payment) {
      return document.payment.invoice?.code ?? document.payment.code;
    }
    if (document.maintenanceRequest) {
      return `${document.maintenanceRequest.property?.code ?? '?'} · ${document.maintenanceRequest.unit?.no ?? '?'}`;
    }
    return '—';
  }

  private static humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  }
}

/**
 * Multipart upload metadata — the file itself arrives as a separate field
 * (`file`), handled by FileInterceptor, not part of this JSON-validated DTO.
 * Mirrors mentos-frontend's `NewDocumentInput` (`name`, `cat`) plus a
 * structured `ownerType`/`ownerId` in place of its free-text `owner` string —
 * the mock never actually links a document to a real record, just displays
 * whatever text the user typed.
 */
export class UploadDocumentDto {
  @ApiProperty({ example: 'NIDA copy · Amina Hassan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: DOCUMENT_CATEGORIES, example: 'Identification' })
  @IsString()
  @IsIn(DOCUMENT_CATEGORIES)
  category: string;

  @ApiProperty({ enum: DocumentOwnerType, example: DocumentOwnerType.Tenant })
  @IsString()
  @IsIn(Object.values(DocumentOwnerType))
  ownerType: DocumentOwnerType;

  @ApiProperty({ example: 'T-01', description: "The owning entity's business code" })
  @IsString()
  @IsNotEmpty()
  ownerId: string;
}
