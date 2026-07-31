// Voiding an invoice: allowed while untouched, refused once any payment has
// landed against it (checked via balance !== amount, not a separate flag —
// worth a direct test since that's an easy invariant to break silently), and
// refused a second time on an already-void invoice.

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs } from './utils/test-app';
import { createActiveLease } from './utils/fixtures';

describe('Invoice void (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    token = await loginAs(app);
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

  it('voids an untouched invoice', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    const res = await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/void`)
      .set(auth())
      .expect(200);

    expect(res.body.data.status).toBe('void');
  });

  it('refuses to void an invoice that already has a payment recorded, even a partial one', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/payments`)
      .set(auth())
      .send({ amount: 1000, method: 'Cash' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/void`)
      .set(auth())
      .expect(400);
  });

  it('refuses to void an invoice a second time', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/void`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/void`)
      .set(auth())
      .expect(400);
  });

  it('a voided invoice can no longer receive a payment', async () => {
    const { lease } = await createActiveLease(app, token);
    const invoice = await findInvoiceForLease(lease.id);

    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/void`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/invoices/${invoice.id}/payments`)
      .set(auth())
      .send({ amount: 1000, method: 'Cash' })
      .expect(400);
  });
});
