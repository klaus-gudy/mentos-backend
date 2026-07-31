import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Invoice } from './entities/invoice.entity';
import { InvoiceOverdueJob } from './invoice-overdue.job';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice]), NotificationsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceOverdueJob],
  exports: [InvoicesService, InvoiceOverdueJob],
})
export class InvoicesModule {}
