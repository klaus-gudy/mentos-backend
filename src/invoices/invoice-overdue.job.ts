import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import { dayLabel } from '../common/date.util';
import { moneyLabel } from '../common/money.util';
import { NotificationType } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';

/**
 * "Overdue" has no stored transition to hook (InvoiceResponseDto computes it
 * at read time — see the entity's doc comment), so unlike every other
 * trigger this one can't fire from a service method. Instead: a daily job
 * finds invoices that are `due`/`partial` past their due date and haven't
 * been notified yet (`overdueNotifiedAt IS NULL`), fires once per invoice,
 * and stamps `overdueNotifiedAt` so it never fires again for that invoice —
 * without that guard this would re-notify every single day an invoice stays
 * overdue, which is exactly the kind of notification-spam bug worth naming
 * explicitly (see SPRINT_PLAN.md's Sprint 2 risk log).
 */
@Injectable()
export class InvoiceOverdueJob {
  private readonly logger = new Logger(InvoiceOverdueJob.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoices: Repository<Invoice>,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkOverdueInvoices(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const candidates = await this.invoices.find({
      where: {
        status: In([InvoiceStatus.Due, InvoiceStatus.Partial]),
        due: LessThan(today),
        overdueNotifiedAt: IsNull(),
      },
      relations: ['tenant', 'property'],
    });

    for (const invoice of candidates) {
      void this.notifications.fireTrigger(
        'invoice-overdue',
        {
          tenant_name: invoice.tenant?.name ?? '',
          amount: moneyLabel(invoice.balance),
          due_date: dayLabel(invoice.due),
          property_name: invoice.property?.name ?? '',
        },
        NotificationType.Billing,
        'triangle-alert',
      );
      await this.invoices.update(invoice.id, { overdueNotifiedAt: new Date() });
    }

    if (candidates.length > 0) {
      this.logger.log(`Fired overdue notifications for ${candidates.length} invoice(s).`);
    }
    return candidates.length;
  }
}
