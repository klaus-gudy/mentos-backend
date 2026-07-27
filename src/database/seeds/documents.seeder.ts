import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { DataSource } from 'typeorm';
import { Document, DocumentGeneratedBy } from '../../documents/entities/document.entity';
import { Lease } from '../../leases/entities/lease.entity';
import { MaintenanceRequest } from '../../maintenance/entities/maintenance-request.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Property } from '../../properties/entities/property.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Unit } from '../../units/entities/unit.entity';
import type { Seeder } from './seed';

type OwnerRef =
  | { kind: 'property'; code: string }
  | { kind: 'unit'; code: string }
  | { kind: 'tenant'; code: string }
  | { kind: 'lease'; code: string }
  | { kind: 'payment'; code: string }
  | { kind: 'maintenance'; code: string };

interface SeedDocument {
  code: string;
  name: string;
  category: string;
  owner: OwnerRef;
  version: number;
  createdAt: string;
  isImage?: boolean;
}

/**
 * Ported verbatim from mentos-frontend/lib/seed.ts. The mock only ever
 * fabricates a random size string ("1.2 MB") with no real bytes behind it —
 * this seeder generates genuine small placeholder files (a one-page PDF, or
 * a 1×1 PNG for the one `img`-typed doc) and uploads them for real, so
 * `sizeBytes` and downloads are both honest rather than copying an invented
 * number that doesn't correspond to any actual content.
 */
const DOCUMENTS: SeedDocument[] = [
  { code: 'D-1', name: 'Lease agreement · L-01 Amina Hassan', category: 'Lease', owner: { kind: 'lease', code: 'L-01' }, version: 1, createdAt: '2024-03-01' },
  { code: 'D-2', name: 'NIDA copy · Amina Hassan', category: 'Identification', owner: { kind: 'tenant', code: 'T-01' }, version: 1, createdAt: '2024-03-01', isImage: true },
  { code: 'D-3', name: 'Move-in inspection · A-12', category: 'Inspection', owner: { kind: 'unit', code: 'U-101' }, version: 1, createdAt: '2024-03-01' },
  { code: 'D-4', name: 'Receipt · RC-1011 Grace Kileo', category: 'Receipt', owner: { kind: 'payment', code: 'RC-1011' }, version: 1, createdAt: '2026-07-02' },
  { code: 'D-5', name: 'Property insurance · Mwenge Apts', category: 'Insurance', owner: { kind: 'property', code: 'P-01' }, version: 2, createdAt: '2026-01-15' },
  { code: 'D-6', name: 'Maintenance invoice · MR-03', category: 'Maintenance', owner: { kind: 'maintenance', code: 'MR-03' }, version: 1, createdAt: '2026-06-16' },
  { code: 'D-7', name: 'Lease agreement · L-03 Kazi Tech Ltd', category: 'Lease', owner: { kind: 'lease', code: 'L-03' }, version: 1, createdAt: '2023-08-01' },
  { code: 'D-8', name: 'Title deed · Masaki Garden Villas', category: 'Insurance', owner: { kind: 'property', code: 'P-04' }, version: 1, createdAt: '2023-11-10' },
];

/** A minimal valid 1×1 transparent PNG — enough for a real, openable placeholder image. */
const PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function renderPlaceholderPdf(title: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  doc.fontSize(16).font('Helvetica-Bold').text(title);
  doc.moveDown();
  doc.fontSize(10).font('Helvetica').fillColor('#666').text('Seeded placeholder document.');
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  doc.end();
  return done;
}

/**
 * This standalone seed script never boots a Nest application (it drives
 * TypeORM's DataSource directly — see seed.ts), so StorageService (which
 * needs ConfigService/DI) isn't available. A minimal S3 client constructed
 * straight from env vars, mirroring config/configuration.ts's `storage.*`
 * keys, keeps this seeder self-contained like every other one.
 */
function buildS3Client(): { client: S3Client; bucket: string } {
  const env = (key: string, fallback: string) => process.env[key] || fallback;
  return {
    client: new S3Client({
      endpoint: env('S3_ENDPOINT', 'http://localhost:9000'),
      region: env('S3_REGION', 'us-east-1'),
      forcePathStyle: env('S3_FORCE_PATH_STYLE', 'true') === 'true',
      credentials: {
        accessKeyId: env('S3_ACCESS_KEY', 'nyumba'),
        secretAccessKey: env('S3_SECRET_KEY', 'nyumba-minio-secret'),
      },
    }),
    bucket: env('S3_BUCKET', 'nyumba-documents'),
  };
}

export const documentsSeeder: Seeder = {
  name: 'documents',
  async run(ds: DataSource): Promise<void> {
    const logger = new Logger('Seed:documents');
    const { client, bucket } = buildS3Client();

    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
      } catch (err) {
        logger.warn(
          `Could not reach or create bucket "${bucket}" — is MinIO running ` +
            `(docker compose up -d minio)? Skipping document seeding.`,
        );
        logger.warn(err instanceof Error ? err.message : String(err));
        return;
      }
    }

    const repo = ds.getRepository(Document);
    const properties = ds.getRepository(Property);
    const units = ds.getRepository(Unit);
    const tenants = ds.getRepository(Tenant);
    const leases = ds.getRepository(Lease);
    const payments = ds.getRepository(Payment);
    const maintenanceRequests = ds.getRepository(MaintenanceRequest);

    for (const data of DOCUMENTS) {
      const existing = await repo.findOne({ where: { code: data.code } });
      if (existing) {
        continue;
      }

      const ownerColumn = await (async (): Promise<Partial<Document> | null> => {
        switch (data.owner.kind) {
          case 'property': {
            const row = await properties.findOne({ where: { code: data.owner.code } });
            return row ? { propertyId: row.id } : null;
          }
          case 'unit': {
            const row = await units.findOne({ where: { code: data.owner.code } });
            return row ? { unitId: row.id } : null;
          }
          case 'tenant': {
            const row = await tenants.findOne({ where: { code: data.owner.code } });
            return row ? { tenantId: row.id } : null;
          }
          case 'lease': {
            const row = await leases.findOne({ where: { code: data.owner.code } });
            return row ? { leaseId: row.id } : null;
          }
          case 'payment': {
            const row = await payments.findOne({ where: { code: data.owner.code } });
            return row ? { paymentId: row.id } : null;
          }
          case 'maintenance': {
            const row = await maintenanceRequests.findOne({ where: { code: data.owner.code } });
            return row ? { maintenanceRequestId: row.id } : null;
          }
        }
      })();

      if (!ownerColumn) {
        logger.warn(`Owner ${data.owner.kind} "${data.owner.code}" not found — skipping ${data.code}.`);
        continue;
      }

      const fileName = data.isImage ? `${data.code}.png` : `${data.code}.pdf`;
      const buffer = data.isImage ? PLACEHOLDER_PNG : await renderPlaceholderPdf(data.name);
      const mimeType = data.isImage ? 'image/png' : 'application/pdf';
      const storageKey = `documents/${data.code}/${fileName}`;

      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: buffer, ContentType: mimeType }),
      );

      const document = repo.create({
        code: data.code,
        name: data.name,
        category: data.category,
        ...ownerColumn,
        storageKey,
        mimeType,
        sizeBytes: buffer.length,
        originalFileName: fileName,
        version: data.version,
        generatedBy: DocumentGeneratedBy.System,
        uploadedByUserId: null,
      });
      await repo.save(document);
      await repo.update(document.id, { createdAt: new Date(`${data.createdAt}T00:00:00Z`) });
    }

    logger.log(`${DOCUMENTS.length} documents created`);
  },
};
