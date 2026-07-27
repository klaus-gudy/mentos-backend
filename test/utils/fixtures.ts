// Test fixtures — every helper creates brand-new rows via the real API
// (never reuses seeded or previously-created records), so the suite stays
// repeatable across runs without needing to reset the test database between
// them: business codes are always freshly sequential.

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createTenant(app: INestApplication, token: string, name = 'E2E Test Tenant') {
  const res = await request(app.getHttpServer())
    .post('/api/tenants')
    .set(auth(token))
    .send({ fullName: name, phone: '+255700000001' })
    .expect(201);
  return res.body.data as { id: string; name: string };
}

/** A fresh property with one vacant unit, ready to be leased. */
export async function createVacantUnit(app: INestApplication, token: string) {
  const prop = await request(app.getHttpServer())
    .post('/api/properties')
    .set(auth(token))
    .send({ name: 'E2E Test Property', type: 'apartment' })
    .expect(201);
  const propId = prop.body.data.id as string;

  const unit = await request(app.getHttpServer())
    .post(`/api/properties/${propId}/units`)
    .set(auth(token))
    .send({ no: 'E2E-1', rent: 300000 })
    .expect(201);

  return { propId, unitId: unit.body.data.id as string };
}

/** Tenant + property + unit + an active lease (which also generates the first invoice). */
export async function createActiveLease(app: INestApplication, token: string) {
  const tenant = await createTenant(app, token);
  const { unitId } = await createVacantUnit(app, token);

  const lease = await request(app.getHttpServer())
    .post('/api/leases')
    .set(auth(token))
    .send({ tenantId: tenant.id, unitId, start: '2026-01-01', duration: 12 })
    .expect(201);

  return { tenant, unitId, lease: lease.body.data as { id: string; status: string; rent: number } };
}
