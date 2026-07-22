import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Lease } from '../leases/entities/lease.entity';
import { InvoiceResponseDto } from './dto/invoice.dto';
import { Invoice, InvoiceLineItem, InvoiceStatus } from './entities/invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoices: Repository<Invoice>,
  ) {}

  async findAll(): Promise<InvoiceResponseDto[]> {
    const invoices = await this.invoices.find({
      relations: ['tenant', 'lease', 'property'],
      order: { createdAt: 'ASC' },
    });
    return InvoiceResponseDto.fromMany(invoices);
  }

  async findByCodeOrFail(code: string): Promise<Invoice> {
    const invoice = await this.invoices.findOne({
      where: { code },
      relations: ['tenant', 'lease', 'property'],
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice "${code}" not found`);
    }
    return invoice;
  }

  async findOne(code: string): Promise<InvoiceResponseDto> {
    return InvoiceResponseDto.from(await this.findByCodeOrFail(code));
  }

  /**
   * Allocates the next `INV-n` code and creates the invoice, within the
   * caller's transaction (LeasesService.create). Numbering starts at 1015 to
   * continue the frontend seed's existing sequence (INV-1007…1014).
   */
  async createForLease(
    manager: EntityManager,
    lease: Lease,
    items: InvoiceLineItem[],
    issued: string,
    due: string,
  ): Promise<Invoice> {
    const repo = manager.getRepository(Invoice);
    await manager.query('LOCK TABLE invoices IN SHARE ROW EXCLUSIVE MODE');

    const row = await repo
      .createQueryBuilder('invoice')
      .select('COALESCE(MAX(CAST(SUBSTRING(invoice.code FROM 5) AS INTEGER)), 1014)', 'max')
      .getRawOne<{ max: string }>();
    const seq = parseInt(row?.max ?? '1014', 10) + 1;

    const amount = items.reduce((sum, item) => sum + item.amount, 0);

    const invoice = new Invoice();
    invoice.code = `INV-${seq}`;
    invoice.tenantId = lease.tenantId;
    invoice.leaseId = lease.id;
    invoice.propertyId = lease.propertyId;
    invoice.issued = issued;
    invoice.due = due;
    invoice.amount = amount;
    invoice.balance = amount;
    invoice.status = InvoiceStatus.Due;
    invoice.items = items;

    return repo.save(invoice);
  }
}
