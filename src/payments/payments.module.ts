import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesModule } from '../invoices/invoices.module';
import { Payment } from './entities/payment.entity';
import { PaymentsFlatController } from './payments-flat.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), InvoicesModule],
  controllers: [PaymentsController, PaymentsFlatController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
