import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InvoicesService } from '../invoices/invoices.service';
import { Lease } from '../leases/entities/lease.entity';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { PaymentsService } from '../payments/payments.service';
import { Property } from '../properties/entities/property.entity';
import { PropertiesService } from '../properties/properties.service';
import { StorageService, StoredObject } from '../storage/storage.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantsService } from '../tenants/tenants.service';
import { Unit } from '../units/entities/unit.entity';
import { UnitsService } from '../units/units.service';
import { DocumentOwnerType, DocumentResponseDto, UploadDocumentDto } from './dto/document.dto';
import { Document, DocumentGeneratedBy } from './entities/document.entity';
import { renderLeaseAgreementPdf } from './lease-agreement.pdf';

const RELATIONS = [
  'property',
  'unit',
  'unit.property',
  'tenant',
  'lease',
  'lease.property',
  'lease.unit',
  'invoice',
  'payment',
  'payment.invoice',
  'maintenanceRequest',
  'maintenanceRequest.property',
  'maintenanceRequest.unit',
];

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documents: Repository<Document>,
    private readonly storage: StorageService,
    private readonly properties: PropertiesService,
    private readonly units: UnitsService,
    private readonly tenants: TenantsService,
    private readonly invoices: InvoicesService,
    private readonly payments: PaymentsService,
    private readonly maintenance: MaintenanceService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filter?: {
    ownerType?: DocumentOwnerType;
    ownerId?: string;
  }): Promise<DocumentResponseDto[]> {
    if (filter?.ownerType && filter?.ownerId) {
      return this.findByOwner(filter.ownerType, filter.ownerId);
    }
    const documents = await this.documents.find({
      relations: RELATIONS,
      order: { createdAt: 'DESC' },
    });
    return DocumentResponseDto.fromMany(documents);
  }

  async findByOwner(ownerType: DocumentOwnerType, ownerId: string): Promise<DocumentResponseDto[]> {
    const entityId = await this.resolveOwnerEntityId(ownerType, ownerId);
    const documents = await this.documents.find({
      where: { [DocumentsService.ownerColumn(ownerType)]: entityId },
      relations: RELATIONS,
      order: { createdAt: 'DESC' },
    });
    return DocumentResponseDto.fromMany(documents);
  }

  async findByCodeOrFail(code: string): Promise<Document> {
    const document = await this.documents.findOne({ where: { code }, relations: RELATIONS });
    if (!document) {
      throw new NotFoundException(`Document "${code}" not found`);
    }
    return document;
  }

  async findOne(code: string): Promise<DocumentResponseDto> {
    return DocumentResponseDto.from(await this.findByCodeOrFail(code));
  }

  /** Streams the real file bytes from object storage. */
  async download(code: string): Promise<{ document: Document; file: StoredObject }> {
    const document = await this.findByCodeOrFail(code);
    const file = await this.storage.download(document.storageKey);
    return { document, file };
  }

  async upload(
    dto: UploadDocumentDto,
    file: Express.Multer.File,
    uploadedByUserId: string,
  ): Promise<DocumentResponseDto> {
    if (!file || file.size === 0) {
      throw new BadRequestException('A file is required');
    }

    const entityId = await this.resolveOwnerEntityId(dto.ownerType, dto.ownerId);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Document);
      const code = await DocumentsService.nextCode(repo);
      const storageKey = `documents/${code}/${file.originalname}`;

      await this.storage.upload(storageKey, file.buffer, file.mimetype);

      const document = repo.create({
        code,
        name: dto.name,
        category: dto.category,
        [DocumentsService.ownerColumn(dto.ownerType)]: entityId,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        originalFileName: file.originalname,
        version: 1,
        generatedBy: DocumentGeneratedBy.Upload,
        uploadedByUserId,
      });

      await repo.save(document);

      // Re-read through `manager` (not `this.findOne`, which queries via the
      // class-level repository on a separate connection — that would run
      // before this transaction commits and see nothing, since the row isn't
      // visible outside it yet).
      const withRelations = await repo.findOne({ where: { code }, relations: RELATIONS });
      return DocumentResponseDto.from(withRelations!);
    });
  }

  /** Matches the frontend's `deleteDocument` — removes both the row and the stored file. */
  async remove(code: string): Promise<void> {
    const document = await this.findByCodeOrFail(code);
    await this.documents.remove(document);
    await this.storage.delete(document.storageKey);
  }

  /**
   * Auto-generates the lease agreement PDF — called from LeasesService.create()
   * within its transaction, so the document row commits or rolls back with
   * the lease/invoice/occupancy writes. Matches the frontend seed's naming
   * convention exactly: "Lease agreement · L-01 Amina Hassan".
   */
  async generateLeaseAgreement(
    manager: EntityManager,
    lease: Lease,
    tenant: Tenant,
    unit: Unit,
    property: Property,
  ): Promise<void> {
    const repo = manager.getRepository(Document);
    const code = await DocumentsService.nextCode(repo);
    const pdf = await renderLeaseAgreementPdf({ lease, tenant, unit, property });
    const storageKey = `documents/${code}/lease-agreement.pdf`;

    await this.storage.upload(storageKey, pdf, 'application/pdf');

    const document = repo.create({
      code,
      name: `Lease agreement · ${lease.code} ${tenant.name}`,
      category: 'Lease',
      leaseId: lease.id,
      storageKey,
      mimeType: 'application/pdf',
      sizeBytes: pdf.length,
      originalFileName: null,
      version: 1,
      generatedBy: DocumentGeneratedBy.System,
      uploadedByUserId: null,
    });

    await repo.save(document);
  }

  private static async nextCode(repo: Repository<Document>): Promise<string> {
    await repo.query('LOCK TABLE documents IN SHARE ROW EXCLUSIVE MODE');
    const row = await repo
      .createQueryBuilder('document')
      .select('COALESCE(MAX(CAST(SUBSTRING(document.code FROM 3) AS INTEGER)), 0)', 'max')
      .getRawOne<{ max: string }>();
    const seq = parseInt(row?.max ?? '0', 10) + 1;
    return `D-${seq}`;
  }

  private static ownerColumn(ownerType: DocumentOwnerType): string {
    const columns: Record<DocumentOwnerType, string> = {
      [DocumentOwnerType.Property]: 'propertyId',
      [DocumentOwnerType.Unit]: 'unitId',
      [DocumentOwnerType.Tenant]: 'tenantId',
      [DocumentOwnerType.Lease]: 'leaseId',
      [DocumentOwnerType.Invoice]: 'invoiceId',
      [DocumentOwnerType.Payment]: 'paymentId',
      [DocumentOwnerType.Maintenance]: 'maintenanceRequestId',
    };
    return columns[ownerType];
  }

  /** Resolves an owner's business code to its internal uuid, validating it exists. */
  private async resolveOwnerEntityId(ownerType: DocumentOwnerType, ownerId: string): Promise<string> {
    switch (ownerType) {
      case DocumentOwnerType.Property:
        return (await this.properties.findByCodeOrFail(ownerId)).id;
      case DocumentOwnerType.Unit:
        return (await this.units.findByCodeOrFail(ownerId)).id;
      case DocumentOwnerType.Tenant:
        return (await this.tenants.findByCodeOrFail(ownerId)).id;
      case DocumentOwnerType.Lease: {
        const lease = await this.dataSource
          .getRepository(Lease)
          .findOne({ where: { code: ownerId } });
        if (!lease) {
          throw new NotFoundException(`Lease "${ownerId}" not found`);
        }
        return lease.id;
      }
      case DocumentOwnerType.Invoice:
        return (await this.invoices.findByCodeOrFail(ownerId)).id;
      case DocumentOwnerType.Payment:
        return (await this.payments.findByCodeOrFail(ownerId)).id;
      case DocumentOwnerType.Maintenance:
        return (await this.maintenance.findByCodeOrFail(ownerId)).id;
    }
  }
}
