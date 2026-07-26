import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import type { Seeder } from './seed';

interface SeedPayment {
  code: string;
  invoiceCode: string;
  tenantCode: string;
  amount: number;
  method: string;
  date: string;
}

/** Ported verbatim from mentos-frontend/lib/seed.ts. */
const PAYMENTS: SeedPayment[] = [
  { code: 'RC-1009', invoiceCode: 'INV-1009', tenantCode: 'T-01', amount: 520000, method: 'M-Pesa', date: '2026-07-03' },
  { code: 'RC-1011', invoiceCode: 'INV-1011', tenantCode: 'T-03', amount: 1850000, method: 'Bank transfer', date: '2026-07-02' },
  { code: 'RC-1013', invoiceCode: 'INV-1013', tenantCode: 'T-05', amount: 2000000, method: 'Bank transfer', date: '2026-07-04' },
  { code: 'RC-1007', invoiceCode: 'INV-1007', tenantCode: 'T-07', amount: 500000, method: 'M-Pesa', date: '2026-07-01' },
  // Against the legacy invoice (INV-9001) — see invoices.seeder.ts.
  { code: 'RC-9001', invoiceCode: 'INV-9001', tenantCode: 'T-01', amount: 500000, method: 'Bank transfer', date: '2024-02-03' },
];

export const paymentsSeeder: Seeder = {
  name: 'payments',
  async run(ds: DataSource): Promise<void> {
    const paymentRepo = ds.getRepository(Payment);
    const invoiceRepo = ds.getRepository(Invoice);
    const tenantRepo = ds.getRepository(Tenant);
    const logger = new Logger('Seed:payments');

    for (const data of PAYMENTS) {
      const existing = await paymentRepo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const invoice = await invoiceRepo.findOne({ where: { code: data.invoiceCode } });
      const tenant = await tenantRepo.findOne({ where: { code: data.tenantCode } });
      if (!invoice || !tenant) {
        logger.warn(`Missing invoice/tenant for ${data.code} — skipping.`);
        continue;
      }

      const payment = new Payment();
      payment.code = data.code;
      payment.invoiceId = invoice.id;
      payment.tenantId = tenant.id;
      payment.amount = data.amount;
      payment.method = data.method;
      payment.date = data.date;

      await paymentRepo.save(payment);
    }

    logger.log(`${PAYMENTS.length} payments created`);
  },
};
