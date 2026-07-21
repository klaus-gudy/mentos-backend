import 'reflect-metadata';
import { ValidationPipe, ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const apiPrefix = config.get<string>('apiPrefix') ?? 'api';
  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: config.get<string>('corsOrigin') ?? '*',
    credentials: true,
  });

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nyumba PMS API')
    .setDescription(
      'Backend for the Mentos / Nyumba property management system.\n\n' +
        '**Signing in:** `POST /api/auth/login` (seeded accounts use password `Nyumba#2026`), ' +
        'then paste the returned `accessToken` into **Authorize** above. ' +
        'On an empty database use `POST /api/auth/register` to create the first Super Admin.\n\n' +
        'Invite and password-reset tokens are logged to the server console and returned as ' +
        '`devToken` outside production, so those flows can be completed here.',
    )
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    // Keeps the pasted token across reloads so a simulation run isn't
    // interrupted by re-authorizing after every refresh.
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port);
  logger.log(`API ready on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger on http://localhost:${port}/docs`);
}

void bootstrap();
