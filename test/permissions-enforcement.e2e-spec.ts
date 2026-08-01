// Role/permission enforcement — a request from a role missing the required
// permission gets 403 with the specific missing key named in the response,
// not just a generic "forbidden". Uses the seeded Maintenance Staff account
// (role-maint: property.read, unit.read, maintenance.*, notification.read —
// see src/roles/built-in-roles.ts), which already shows up denied in the
// audit log from earlier manual testing — this locks that behavior down
// with a real test instead of relying on someone noticing it in the log.

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs } from './utils/test-app';

const MAINTENANCE_STAFF = { email: 'hamisi@nyumba.co.tz', password: 'Nyumba#2026' };

describe('Permission enforcement (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let maintToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await loginAs(app);
    maintToken = await loginAs(app, MAINTENANCE_STAFF);
  });

  afterAll(async () => {
    await app.close();
  });

  it('a role with the permission succeeds', async () => {
    await request(app.getHttpServer())
      .get('/api/maintenance')
      .set('Authorization', `Bearer ${maintToken}`)
      .expect(200);
  });

  it('a role missing the permission gets 403 naming the specific missing key', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/tenants')
      .set('Authorization', `Bearer ${maintToken}`)
      .send({ fullName: 'Should Not Be Created', phone: '+255700000099' })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('tenant.create');
  });

  it('is enforced independently per permission — maintenance staff can read maintenance but not the audit log', async () => {
    await request(app.getHttpServer())
      .get('/api/maintenance')
      .set('Authorization', `Bearer ${maintToken}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/audit')
      .set('Authorization', `Bearer ${maintToken}`)
      .expect(403);
    expect(res.body.error.message).toContain('audit.read');
  });

  it('a role with every permission (Super Admin) is never blocked by the same checks', async () => {
    await request(app.getHttpServer())
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/tenants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Admin Created Tenant', phone: '+255700000098' })
      .expect(201);
  });

  it('an unauthenticated request is rejected before permissions are even checked', async () => {
    await request(app.getHttpServer()).get('/api/tenants').expect(401);
  });
});
