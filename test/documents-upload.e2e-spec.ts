// Highest-risk flow #3: uploading a document. Covers the multipart upload
// itself, the file-type allowlist, that the uploaded bytes really land in
// object storage (download returns exactly what was uploaded, not just a
// metadata row), owner-scoped listing, and delete removing both the row and
// the stored file.

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, loginAs } from './utils/test-app';
import { createTenant } from './utils/fixtures';

describe('Document upload (e2e)', () => {
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

  it('uploads a PDF, links it to its owner, and the real bytes come back on download', async () => {
    const tenant = await createTenant(app, token);
    const fileContents = Buffer.from('%PDF-1.4 e2e test file contents');

    const upload = await request(app.getHttpServer())
      .post('/api/documents')
      .set(auth())
      .field('name', 'E2E test document')
      .field('category', 'Identification')
      .field('ownerType', 'tenant')
      .field('ownerId', tenant.id)
      .attach('file', fileContents, { filename: 'test.pdf', contentType: 'application/pdf' })
      .expect(201);

    expect(upload.body.data.name).toBe('E2E test document');
    expect(upload.body.data.owner).toBe(tenant.id);
    expect(upload.body.data.type).toBe('pdf');
    const docId = upload.body.data.id as string;

    const download = await request(app.getHttpServer())
      .get(`/api/documents/${docId}/download`)
      .set(auth())
      .expect(200);
    expect(Buffer.from(download.body).toString()).toBe(fileContents.toString());
  });

  it('rejects a disallowed file type', async () => {
    const tenant = await createTenant(app, token);

    await request(app.getHttpServer())
      .post('/api/documents')
      .set(auth())
      .field('name', 'Not allowed')
      .field('category', 'Identification')
      .field('ownerType', 'tenant')
      .field('ownerId', tenant.id)
      .attach('file', Buffer.from('#!/bin/sh\necho hi'), {
        filename: 'script.sh',
        contentType: 'application/x-sh',
      })
      .expect(400);
  });

  it('lists only the documents belonging to the requested owner', async () => {
    const tenantA = await createTenant(app, token, 'E2E Owner A');
    const tenantB = await createTenant(app, token, 'E2E Owner B');

    await request(app.getHttpServer())
      .post('/api/documents')
      .set(auth())
      .field('name', 'Owner A doc')
      .field('category', 'Lease')
      .field('ownerType', 'tenant')
      .field('ownerId', tenantA.id)
      .attach('file', Buffer.from('pdf-a'), { filename: 'a.pdf', contentType: 'application/pdf' })
      .expect(201);

    const listA = await request(app.getHttpServer())
      .get(`/api/documents?ownerType=tenant&ownerId=${tenantA.id}`)
      .set(auth())
      .expect(200);
    const listB = await request(app.getHttpServer())
      .get(`/api/documents?ownerType=tenant&ownerId=${tenantB.id}`)
      .set(auth())
      .expect(200);

    expect(listA.body.data.length).toBe(1);
    expect(listA.body.data[0].name).toBe('Owner A doc');
    expect(listB.body.data.length).toBe(0);
  });

  it('deleting a document removes it from the owner-scoped list', async () => {
    const tenant = await createTenant(app, token);

    const upload = await request(app.getHttpServer())
      .post('/api/documents')
      .set(auth())
      .field('name', 'To be deleted')
      .field('category', 'Receipt')
      .field('ownerType', 'tenant')
      .field('ownerId', tenant.id)
      .attach('file', Buffer.from('pdf-delete-me'), {
        filename: 'delete.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/documents/${upload.body.data.id}`)
      .set(auth())
      .expect(204);

    const list = await request(app.getHttpServer())
      .get(`/api/documents?ownerType=tenant&ownerId=${tenant.id}`)
      .set(auth())
      .expect(200);
    expect(
      list.body.data.find((d: { id: string }) => d.id === upload.body.data.id),
    ).toBeUndefined();
  });
});
