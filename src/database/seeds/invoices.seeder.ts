import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Invoice, InvoiceLineItem, InvoiceStatus } from '../../invoices/entities/invoice.entity';
import { Lease } from '../../leases/entities/lease.entity';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import type { Seeder } from './seed';

interface SeedInvoice {
  code: string;
  tenantCode: string;
  leaseCode: string;
  propertyCode: string;
  issued: string;
  due: string;
  amount: number;
  balance: number;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
}

/**
 * Ported verbatim from mentos-frontend/lib/seed.ts — one invoice per
 * currently-active/ending lease (L-01…L-07; L-08 is ended, no current
 * invoice). Numbering starts mid-sequence (1007…1014) because the mock's
 * `store.seq.inv` starts at 1015 — new invoices from `createLease` continue
 * from there (see InvoicesService.createForLease).
 */
const INVOICES: SeedInvoice[] = [
  { code: 'INV-1009', tenantCode: 'T-01', leaseCode: 'L-01', propertyCode: 'P-01', issued: '2026-07-01', due: '2026-07-05', amount: 520000, balance: 0, status: InvoiceStatus.Paid, items: [{ label: 'Rent · Jul 2026', amount: 520000 }] },
  { code: 'INV-1010', tenantCode: 'T-02', leaseCode: 'L-02', propertyCode: 'P-01', issued: '2026-07-01', due: '2026-07-05', amount: 420000, balance: 420000, status: InvoiceStatus.Due, items: [{ label: 'Rent · Jul 2026', amount: 420000 }] },
  { code: 'INV-1011', tenantCode: 'T-03', leaseCode: 'L-03', propertyCode: 'P-02', issued: '2026-07-01', due: '2026-07-05', amount: 1850000, balance: 0, status: InvoiceStatus.Paid, items: [{ label: 'Rent · Jul 2026', amount: 1850000 }] },
  { code: 'INV-1012', tenantCode: 'T-04', leaseCode: 'L-04', propertyCode: 'P-03', issued: '2026-06-01', due: '2026-06-05', amount: 210000, balance: 210000, status: InvoiceStatus.Due, items: [{ label: 'Rent · Jun 2026', amount: 210000 }] },
  { code: 'INV-1013', tenantCode: 'T-05', leaseCode: 'L-05', propertyCode: 'P-04', issued: '2026-07-01', due: '2026-07-05', amount: 3950000, balance: 1950000, status: InvoiceStatus.Partial, items: [{ label: 'Rent · Jul 2026', amount: 3800000 }, { label: 'Water charge', amount: 150000 }] },
  { code: 'INV-1014', tenantCode: 'T-06', leaseCode: 'L-06', propertyCode: 'P-05', issued: '2026-07-01', due: '2026-07-05', amount: 1320000, balance: 1320000, status: InvoiceStatus.Due, items: [{ label: 'Rent · Jul 2026', amount: 1200000 }, { label: 'Service charge', amount: 120000 }] },
  { code: 'INV-1007', tenantCode: 'T-07', leaseCode: 'L-07', propertyCode: 'P-01', issued: '2026-07-01', due: '2026-07-05', amount: 500000, balance: 0, status: InvoiceStatus.Paid, items: [{ label: 'Rent · Jul 2026', amount: 500000 }] },
];

export const invoicesSeeder: Seeder = {
  name: 'invoices',
  async run(ds: DataSource): Promise<void> {
    const invoiceRepo = ds.getRepository(Invoice);
    const tenantRepo = ds.getRepository(Tenant);
    const leaseRepo = ds.getRepository(Lease);
    const propertyRepo = ds.getRepository(Property);
    const logger = new Logger('Seed:invoices');

    for (const data of INVOICES) {
      const existing = await invoiceRepo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const tenant = await tenantRepo.findOne({ where: { code: data.tenantCode } });
      const lease = await leaseRepo.findOne({ where: { code: data.leaseCode } });
      const property = await propertyRepo.findOne({ where: { code: data.propertyCode } });
      if (!tenant || !lease || !property) {
        logger.warn(`Missing tenant/lease/property for ${data.code} — skipping.`);
        continue;
      }

      const invoice = new Invoice();
      invoice.code = data.code;
      invoice.tenantId = tenant.id;
      invoice.leaseId = lease.id;
      invoice.propertyId = property.id;
      invoice.issued = data.issued;
      invoice.due = data.due;
      invoice.amount = data.amount;
      invoice.balance = data.balance;
      invoice.status = data.status;
      invoice.items = data.items;

      await invoiceRepo.save(invoice);
    }

    logger.log(`${INVOICES.length} invoices created`);
  },
};
