// The `isOverdue` getter (Invoice entity) was pulled out of
// InvoiceResponseDto.from() so ReportsService could compute the same
// "overdue" definition without duplicating it — a report page silently
// disagreeing with the invoice detail page on "overdue" would be a
// confusing regression with no test to catch it otherwise. These tests
// confirm `GET /invoices/:code` and `GET /reports/rent_collection` (or
// `outstanding_balances`) always agree, across every edge the getter itself
// cares about: overdue, not-yet-due, paid, and voided.

import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { Invoice } from '../src/invoices/entities/invoice.entity';
import { createTestApp, loginAs } from './utils/test-app';
import { createActiveLease } from './utils/fixtures';

interface BuiltReport {
  columns: string[];
  rows: { cells: string[] }[];
}

describe('Invoice "overdue" consistency between the detail endpoint and Reports (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let invoiceRepo: Repository<Invoice>;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    token = await loginAs(app);
    invoiceRepo = app.get(getRepositoryToken(Invoice));
  });

  afterAll(async () => {
    await app.close();
  });

  async function findInvoiceForLease(leaseId: string) {
    const res = await request(app.getHttpServer()).get('/api/invoices').set(auth()).expect(200);
    const invoice = (res.body.data as { id: string; leaseId: string }[]).find(
      (i) => i.leaseId === leaseId,
    );
    if (!invoice) throw new Error(`No invoice found for lease ${leaseId}`);
    return invoice;
  }

  async function statusInReport(invoiceId: string): Promise<string | undefined> {
    const res = await request(app.getHttpServer())
      .get('/api/reports/outstanding_balances')
      .set(auth())
      .expect(200);
    const built = res.body.data as BuiltReport;
    const invoiceCol = built.columns.indexOf('Invoice');
    const statusCol = built.columns.indexOf('Status');
    const row = built.rows.find((r) => r.cells[invoiceCol] === invoiceId);
    return row?.cells[statusCol];
  }

  it('a past-due, unpaid invoice reads "overdue" on both the detail endpoint and in Reports', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);
    await invoiceRepo.update({ code: invoice.id }, { due: '2020-01-01' });

    const detail = await request(app.getHttpServer())
      .get(`/api/invoices/${invoice.id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('overdue');
    expect(await statusInReport(invoice.id)).toBe('Overdue');
  });

  it('a future-due invoice is "due" (not overdue) in both places', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    await invoiceRepo.update({ code: invoice.id }, { due: future.toISOString().slice(0, 10) });

    const detail = await request(app.getHttpServer())
      .get(`/api/invoices/${invoice.id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('due');
    // Not overdue, so it won't have a balance row difference — check via the detail endpoint's own status agrees with what a report row would show, using rent_collection instead since outstanding_balances only lists balance > 0 rows (this one still has balance > 0, so it's listed, just not "Overdue").
    expect(await statusInReport(invoice.id)).toBe('Due');
  });

  it('a paid invoice past its due date reads "paid", never "overdue", in either place', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);
    await invoiceRepo.update({ code: invoice.id }, { due: '2020-01-01' });

    const before = await request(app.getHttpServer())
      .get(`/api/invoices/${invoice.id}`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/payments`)
      .set(auth())
      .send({ amount: before.body.data.balance, method: 'Cash' })
      .expect(201);

    const detail = await request(app.getHttpServer())
      .get(`/api/invoices/${invoice.id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('paid');
    // Paid invoices have balance 0, so outstanding_balances excludes them entirely — that's consistent by construction (no row means no disagreement), verify via absence.
    expect(await statusInReport(invoice.id)).toBeUndefined();
  });

  it('a voided invoice past its due date reads "void", never "overdue", in either place', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);
    await invoiceRepo.update({ code: invoice.id }, { due: '2020-01-01' });

    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/void`)
      .set(auth())
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/invoices/${invoice.id}`)
      .set(auth())
      .expect(200);
    expect(detail.body.data.status).toBe('void');
    // Still has balance > 0 (nothing was ever paid), so it's listed in
    // outstanding_balances — but must read "Void", not "Overdue".
    expect(await statusInReport(invoice.id)).toBe('Void');
  });
});
