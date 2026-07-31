// Regression coverage for a real bug fixed earlier in this project: onboarding
// used to require email/idNumber/occupation, rejecting the frontend's
// minimal name+phone flow. `@IsOptional()` alone doesn't skip validation for
// `""` (only null/undefined), so the fix used `@ValidateIf` for the email
// format check specifically — these tests exist so a future edit to
// CreateTenantDto can't silently reintroduce that regression.

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs } from './utils/test-app';

describe('Tenant onboarding validation (e2e)', () => {
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

  it('onboards a tenant with only a full name and phone number', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/tenants')
      .set(auth())
      .send({ fullName: 'Minimal Tenant', phone: '+255700000010' })
      .expect(201);

    expect(res.body.data.name).toBe('Minimal Tenant');
    expect(res.body.data.status).toBe('prospective');
    expect(res.body.data.email).toBe('');
  });

  it('rejects a missing full name', async () => {
    await request(app.getHttpServer())
      .post('/api/tenants')
      .set(auth())
      .send({ phone: '+255700000011' })
      .expect(400);
  });

  it('rejects a missing phone number', async () => {
    await request(app.getHttpServer())
      .post('/api/tenants')
      .set(auth())
      .send({ fullName: 'No Phone Tenant' })
      .expect(400);
  });

  it('accepts an explicitly empty email rather than rejecting it as an invalid format', async () => {
    await request(app.getHttpServer())
      .post('/api/tenants')
      .set(auth())
      .send({ fullName: 'Empty Email Tenant', phone: '+255700000012', email: '' })
      .expect(201);
  });

  it('rejects a malformed (non-empty) email', async () => {
    await request(app.getHttpServer())
      .post('/api/tenants')
      .set(auth())
      .send({ fullName: 'Bad Email Tenant', phone: '+255700000013', email: 'not-an-email' })
      .expect(400);
  });

  it('accepts a valid, fully-populated onboarding payload too', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/tenants')
      .set(auth())
      .send({
        fullName: 'Full Tenant',
        phone: '+255700000014',
        email: 'full.tenant@example.com',
        idNumber: '19900101-00001-00001-01',
        occupation: 'Engineer',
        emName: 'Next Kin',
        emRelation: 'Sibling',
        emContact: '+255700000015',
      })
      .expect(201);

    expect(res.body.data.email).toBe('full.tenant@example.com');
  });
});
