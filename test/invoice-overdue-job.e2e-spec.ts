// The invoice-overdue trigger is the risky one flagged in SPRINT_PLAN.md's
// Sprint 2 risk log: "overdue" has no stored transition to hook, so it's a
// scheduled job instead of an event hook — and without the
// `overdueNotifiedAt` guard, it would re-fire a notification every single
// day an invoice stays overdue. These tests exist specifically to catch that
// class of bug: fires exactly once per invoice, never twice.

import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { Invoice } from '../src/invoices/entities/invoice.entity';
import { InvoiceOverdueJob } from '../src/invoices/invoice-overdue.job';
import { createTestApp, loginAs } from './utils/test-app';
import { createActiveLease } from './utils/fixtures';

describe('Invoice overdue job (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let job: InvoiceOverdueJob;
  let invoiceRepo: Repository<Invoice>;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    token = await loginAs(app);
    job = app.get(InvoiceOverdueJob);
    invoiceRepo = app.get(getRepositoryToken(Invoice));

    await request(app.getHttpServer())
      .post('/api/notification-templates')
      .set(auth())
      .send({
        nameEn: 'Overdue notice',
        triggerKey: 'invoice-overdue',
        subjectEn: 'Invoice overdue',
        bodyEn: 'Hi {{tenant_name}}, {{amount}} was due {{due_date}}.',
        subjectSw: 'Ankara imepitwa na muda',
        bodySw: 'Habari {{tenant_name}}, {{amount}} ilitakiwa {{due_date}}.',
      })
      .expect(201);
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

  it('fires a notification for an invoice that is due in the past and unpaid', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    // Backdate the due date directly (no API creates an already-overdue
    // invoice) so the job has something to find.
    await invoiceRepo.update({ code: invoice.id }, { due: '2020-01-01' });

    const fired = await job.checkOverdueInvoices();
    expect(fired).toBeGreaterThanOrEqual(1);

    const notifications = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(auth())
      .expect(200);
    const match = notifications.body.data.find((n: { body: string }) => n.body.includes('2020'));
    expect(match).toBeDefined();
    expect(match.title).toBe('Invoice overdue');
  });

  it('never fires twice for the same invoice, even across repeated runs', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);
    await invoiceRepo.update({ code: invoice.id }, { due: '2020-06-15' });

    const firstRun = await job.checkOverdueInvoices();
    expect(firstRun).toBeGreaterThanOrEqual(1);

    const secondRun = await job.checkOverdueInvoices();
    const thirdRun = await job.checkOverdueInvoices();
    expect(secondRun).toBe(0);
    expect(thirdRun).toBe(0);

    const stored = await invoiceRepo.findOne({ where: { code: invoice.id } });
    expect(stored?.overdueNotifiedAt).not.toBeNull();
  });

  it('does not fire for an invoice that is not yet due', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    await invoiceRepo.update({ code: invoice.id }, { due: future.toISOString().slice(0, 10) });

    const before = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(auth())
      .expect(200);
    await job.checkOverdueInvoices();
    const after = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(auth())
      .expect(200);

    expect(after.body.data.length).toBe(before.body.data.length);
  });

  it('does not fire for an invoice that is already paid, even if its due date has passed', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    const detail = await request(app.getHttpServer())
      .get(`/api/invoices/${invoice.id}`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/payments`)
      .set(auth())
      .send({ amount: detail.body.data.balance, method: 'Cash' })
      .expect(201);
    await invoiceRepo.update({ code: invoice.id }, { due: '2020-01-01' });

    const before = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(auth())
      .expect(200);
    await job.checkOverdueInvoices();
    const after = await request(app.getHttpServer())
      .get('/api/notifications')
      .set(auth())
      .expect(200);

    expect(after.body.data.length).toBe(before.body.data.length);
  });
});
