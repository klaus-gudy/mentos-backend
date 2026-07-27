// Highest-risk flow #1: recording a payment against an invoice. Covers the
// balance math (capped at the invoice balance), the invoice status
// transition (due → partial/paid), and that the payment record itself is
// correctly linked back to the invoice and tenant.

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs } from './utils/test-app';
import { createActiveLease } from './utils/fixtures';

describe('Payments (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await createTestApp();
    token = await loginAs(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function findInvoiceForLease(leaseId: string) {
    const res = await request(app.getHttpServer())
      .get('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const invoices = res.body.data as {
      id: string;
      leaseId: string;
      amount: number;
      balance: number;
    }[];
    const invoice = invoices.find((i) => i.leaseId === leaseId);
    if (!invoice) throw new Error(`No invoice found for lease ${leaseId}`);
    return invoice;
  }

  it('a fresh lease generates a fully-unpaid invoice', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    expect(invoice.balance).toBe(invoice.amount);
    expect(invoice.balance).toBeGreaterThan(0);
  });

  it('a partial payment reduces the balance and flips the invoice to "partial"', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);
    const partialAmount = Math.floor(invoice.amount / 2);

    const res = await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: partialAmount, method: 'M-Pesa' })
      .expect(201);

    expect(res.body.data.invoiceId).toBe(invoice.id);
    expect(res.body.data.amount).toBe(partialAmount);

    const after = await findInvoiceForLease(lease.id);
    expect(after.balance).toBe(invoice.amount - partialAmount);

    const invoiceDetail = await request(app.getHttpServer())
      .get(`/api/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(invoiceDetail.body.data.status).toBe('partial');
  });

  it('paying the full remaining balance flips the invoice to "paid"', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: invoice.balance, method: 'Bank transfer' })
      .expect(201);

    const after = await findInvoiceForLease(lease.id);
    expect(after.balance).toBe(0);

    const invoiceDetail = await request(app.getHttpServer())
      .get(`/api/invoices/${invoice.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(invoiceDetail.body.data.status).toBe('paid');
  });

  it('an amount over the remaining balance is capped, not overpaid into a negative balance', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    const res = await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: invoice.balance + 1_000_000, method: 'Cash' })
      .expect(201);

    expect(res.body.data.amount).toBe(invoice.balance);

    const after = await findInvoiceForLease(lease.id);
    expect(after.balance).toBe(0);
  });

  it('rejects recording a payment against an already fully-paid invoice', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: invoice.balance, method: 'Cash' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/payments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, method: 'Cash' })
      .expect(400);
  });
});
