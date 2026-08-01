// Shared e2e test bootstrap — builds a real Nest application instance wired
// exactly like main.ts (global prefix, validation pipe, interceptors, filter)
// against the .env.test database, so tests exercise the actual HTTP/DI stack
// rather than mocking it away.

import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  // Matches main.ts — without this, `app.close()` in afterAll won't run
  // onApplicationShutdown, so BackgroundTaskTracker never gets a chance to
  // drain in-flight audit/notification writes before the pool closes (the
  // exact "Connection terminated" noise this whole mechanism exists to fix).
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  app.setGlobalPrefix(config.get<string>('apiPrefix') ?? 'api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}

/** Seeded via `npm run seed` — see src/database/seeds/users.seeder.ts. */
export const SEED_ADMIN = { email: 'samira@nyumba.co.tz', password: 'Nyumba#2026' };

export async function loginAs(
  app: INestApplication,
  creds: { email: string; password: string } = SEED_ADMIN,
): Promise<string> {
  const res = await request(app.getHttpServer()).post('/api/auth/login').send(creds).expect(200);
  return res.body.data.accessToken;
}
