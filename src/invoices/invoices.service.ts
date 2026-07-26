import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Lease } from '../leases/entities/lease.entity';
import { InvoiceResponseDto, UpdateInvoiceDto } from './dto/invoice.dto';
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
   *
   * The MAX() is capped at 5000: the seed also includes one legacy invoice
   * (INV-9001, tied to Amina Hassan's ended prior lease L-08) whose number
   * belongs to an older, unrelated block. Without the cap, seeding it would
   * jump every subsequent invoice's numbering to 9002+.
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
      .where("CAST(SUBSTRING(invoice.code FROM 5) AS INTEGER) < 5000")
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

  /**
   * Replaces the line items and recomputes amount/balance — only while no
   * payment has been recorded yet (balance === amount), so an edit can never
   * silently rewrite an amount a tenant has already paid against.
   */
  async update(code: string, dto: UpdateInvoiceDto): Promise<InvoiceResponseDto> {
    const invoice = await this.findByCodeOrFail(code);

    if (invoice.status === InvoiceStatus.Void) {
      throw new BadRequestException('This invoice has been voided');
    }
    if (parseFloat(invoice.balance.toString()) !== parseFloat(invoice.amount.toString())) {
      throw new BadRequestException(
        'This invoice already has a payment recorded — void it and issue a new one instead',
      );
    }

    const items = InvoicesService.parseItems(dto.items);
    const amount = items.reduce((sum, item) => sum + item.amount, 0);

    await this.invoices.update(invoice.id, { items, amount, balance: amount });
    return this.findOne(code);
  }

  /** Voids an invoice — refused once any payment has been recorded against it. */
  async void(code: string): Promise<InvoiceResponseDto> {
    const invoice = await this.findByCodeOrFail(code);

    if (invoice.status === InvoiceStatus.Void) {
      throw new BadRequestException('This invoice has already been voided');
    }
    if (parseFloat(invoice.balance.toString()) !== parseFloat(invoice.amount.toString())) {
      throw new BadRequestException('Cannot void an invoice that already has a payment recorded');
    }

    await this.invoices.update(invoice.id, { status: InvoiceStatus.Void });
    return this.findOne(code);
  }

  /** Validates the `[string, number][]` wire shape and converts it to the stored object form. */
  private static parseItems(raw: [string, number][]): InvoiceLineItem[] {
    return raw.map((row, i) => {
      if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string' || typeof row[1] !== 'number') {
        throw new BadRequestException(`items[${i}] must be a [label, amount] tuple`);
      }
      if (row[1] < 0) {
        throw new BadRequestException(`items[${i}].amount must not be negative`);
      }
      return { label: row[0], amount: row[1] };
    });
  }
}
