import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { moneyLabel } from '../common/money.util';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentResponseDto, RecordPaymentDto } from './dto/payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    private readonly invoices: InvoicesService,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<PaymentResponseDto[]> {
    const payments = await this.payments.find({
      relations: ['invoice', 'tenant'],
      order: { createdAt: 'ASC' },
    });
    return PaymentResponseDto.fromMany(payments);
  }

  async findByInvoiceCode(invoiceCode: string): Promise<PaymentResponseDto[]> {
    const invoice = await this.invoices.findByCodeOrFail(invoiceCode);
    const payments = await this.payments.find({
      where: { invoiceId: invoice.id },
      relations: ['invoice', 'tenant'],
      order: { createdAt: 'ASC' },
    });
    return PaymentResponseDto.fromMany(payments);
  }

  async findByCodeOrFail(code: string): Promise<Payment> {
    const payment = await this.payments.findOne({
      where: { code },
      relations: ['invoice', 'tenant'],
    });
    if (!payment) {
      throw new NotFoundException(`Payment "${code}" not found`);
    }
    return payment;
  }

  async findOne(code: string): Promise<PaymentResponseDto> {
    return PaymentResponseDto.from(await this.findByCodeOrFail(code));
  }

  /**
   * Records a receipt against an invoice: caps the amount at the remaining
   * balance, flips the invoice to paid/partial, and creates the payment row —
   * all in one transaction. Matches mentos-frontend's `recordPayment`, plus
   * validation the mock never does (voided/already-settled invoices).
   */
  async record(invoiceCode: string, dto: RecordPaymentDto): Promise<PaymentResponseDto> {
    const invoice = await this.invoices.findByCodeOrFail(invoiceCode);

    if (invoice.status === InvoiceStatus.Void) {
      throw new BadRequestException('This invoice has been voided');
    }
    if (invoice.balance <= 0) {
      throw new BadRequestException('This invoice is already fully paid');
    }

    const requested = dto.amount;
    const amount = Math.min(requested, parseFloat(invoice.balance.toString()));
    if (amount <= 0) {
      throw new BadRequestException('Enter a valid amount');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      await manager.query('LOCK TABLE payments IN SHARE ROW EXCLUSIVE MODE');

      // Same numbering caveat as invoices: excludes the legacy RC-9001 block.
      const row = await paymentRepo
        .createQueryBuilder('payment')
        .select('COALESCE(MAX(CAST(SUBSTRING(payment.code FROM 4) AS INTEGER)), 1014)', 'max')
        .where("CAST(SUBSTRING(payment.code FROM 4) AS INTEGER) < 5000")
        .getRawOne<{ max: string }>();
      const seq = parseInt(row?.max ?? '1014', 10) + 1;

      const payment = new Payment();
      payment.code = `RC-${seq}`;
      payment.invoiceId = invoice.id;
      payment.tenantId = invoice.tenantId;
      payment.amount = amount;
      payment.method = dto.method;
      payment.date = dto.date ?? new Date().toISOString().slice(0, 10);

      const saved = await paymentRepo.save(payment);

      const newBalance = parseFloat(invoice.balance.toString()) - amount;
      await manager.getRepository(Invoice).update(invoice.id, {
        balance: newBalance,
        status: newBalance <= 0 ? InvoiceStatus.Paid : InvoiceStatus.Partial,
      });

      saved.invoice = invoice;
      saved.tenant = invoice.tenant;
      return PaymentResponseDto.from(saved);
    });

    // Fired after commit — same fire-and-forget philosophy as the
    // tenant-onboarded / lease-created triggers.
    void this.notifications.fireTrigger(
      'payment-received',
      {
        tenant_name: invoice.tenant?.name ?? '',
        amount: moneyLabel(result.amount),
        property_name: invoice.property?.name ?? '',
      },
      NotificationType.Payment,
      'banknote',
    );

    return result;
  }
}
