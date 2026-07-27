// Highest-risk flow #2: terminating a lease. This is the exact flow behind
// the L-01 incident from manual testing earlier in the project (an
// accidental terminate call with no way to undo it) — these tests exist so a
// regression in the termination side effects (unit not vacated, tenant not
// released, double-terminate not blocked) gets caught by the suite instead
// of by someone poking around the UI.

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs } from './utils/test-app';
import { createActiveLease } from './utils/fixtures';

describe('Lease termination (e2e)', () => {
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

  it('creating a lease occupies the unit and activates the tenant', async () => {
    const { tenant, unitId, lease } = await createActiveLease(app, token);
    expect(lease.status).toBe('active');

    const unit = await request(app.getHttpServer())
      .get(`/api/units/${unitId}`)
      .set(auth())
      .expect(200);
    expect(unit.body.data.status).toBe('occupied');
    expect(unit.body.data.tenantId).toBe(tenant.id);

    const tenantRes = await request(app.getHttpServer())
      .get(`/api/tenants/${tenant.id}`)
      .set(auth())
      .expect(200);
    expect(tenantRes.body.data.status).toBe('active');
  });

  it('terminating a lease vacates the unit and releases the tenant', async () => {
    const { tenant, unitId, lease } = await createActiveLease(app, token);

    const terminated = await request(app.getHttpServer())
      .post(`/api/leases/${lease.id}/terminate`)
      .set(auth())
      .send({ reason: 'e2e test' })
      .expect(200);
    expect(terminated.body.data.status).toBe('ended');

    const unit = await request(app.getHttpServer())
      .get(`/api/units/${unitId}`)
      .set(auth())
      .expect(200);
    expect(unit.body.data.status).toBe('vacant');
    expect(unit.body.data.tenantId).toBeNull();

    const tenantRes = await request(app.getHttpServer())
      .get(`/api/tenants/${tenant.id}`)
      .set(auth())
      .expect(200);
    expect(tenantRes.body.data.status).toBe('vacated');
    expect(tenantRes.body.data.unitId).toBeNull();
  });

  it('refuses to terminate a lease that has already ended', async () => {
    const { lease } = await createActiveLease(app, token);

    await request(app.getHttpServer())
      .post(`/api/leases/${lease.id}/terminate`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/leases/${lease.id}/terminate`)
      .set(auth())
      .expect(400);
  });

  it('once vacated, the unit can be leased to a different tenant', async () => {
    const { unitId, lease } = await createActiveLease(app, token);
    await request(app.getHttpServer())
      .post(`/api/leases/${lease.id}/terminate`)
      .set(auth())
      .expect(200);

    const newTenant = await request(app.getHttpServer())
      .post('/api/tenants')
      .set(auth())
      .send({ fullName: 'E2E Second Tenant', phone: '+255700000002' })
      .expect(201);

    const newLease = await request(app.getHttpServer())
      .post('/api/leases')
      .set(auth())
      .send({ tenantId: newTenant.body.data.id, unitId, start: '2026-02-01', duration: 12 })
      .expect(201);

    expect(newLease.body.data.status).toBe('active');
    expect(newLease.body.data.unitId).toBe(unitId);
  });
});
