import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'stream';

export interface StoredObject {
  stream: Readable;
  contentType: string | undefined;
  contentLength: number | undefined;
}

/**
 * Thin wrapper around the S3-compatible client (MinIO in dev, swappable for
 * real AWS S3 later — same interface, just different endpoint/credentials).
 * Every other module talks to documents through DocumentsService, which is
 * the only consumer of this class — the storage backend is an implementation
 * detail behind that one seam, same pattern as MailService.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('storage.bucket') ?? 'nyumba-documents';
    this.client = new S3Client({
      endpoint: this.config.get<string>('storage.endpoint'),
      region: this.config.get<string>('storage.region'),
      forcePathStyle: this.config.get<boolean>('storage.forcePathStyle'),
      credentials: {
        accessKeyId: this.config.get<string>('storage.accessKeyId') ?? '',
        secretAccessKey: this.config.get<string>('storage.secretAccessKey') ?? '',
      },
    });
  }

  /** Creates the bucket on first boot if it doesn't exist yet — no separate init step needed. */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created bucket "${this.bucket}"`);
      } catch (err) {
        this.logger.error(
          `Could not reach or create bucket "${this.bucket}" — is MinIO running? ` +
            `(docker compose up -d minio)`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async download(key: string): Promise<StoredObject> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      stream: result.Body as Readable,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
