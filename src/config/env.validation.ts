import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(65535)
  PORT = 4000;

  @IsString()
  @IsOptional()
  API_PREFIX = 'api';

  @IsString()
  @IsOptional()
  CORS_ORIGIN = '*';

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @Type(() => Number)
  @IsNumber()
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  APP_URL = 'http://localhost:4317';

  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(15)
  @IsOptional()
  BCRYPT_ROUNDS = 12;
}

/** Secrets that must never reach production with their development values. */
const PLACEHOLDER_SECRETS = [
  'change-me-access',
  'change-me-refresh',
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
];

export function validateEnv(config: Record<string, unknown>) {
  // Treat empty-string env vars as absent so class defaults apply. Some shells
  // export e.g. PORT="" which would otherwise shadow .env and fail validation.
  const cleaned = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== ''));
  const validated = plainToInstance(EnvironmentVariables, cleaned, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      'Invalid environment configuration:\n' +
        errors.map((e) => '  - ' + Object.values(e.constraints ?? {}).join(', ')).join('\n'),
    );
  }

  // Fail fast rather than signing production tokens with a public default.
  if (validated.NODE_ENV === Environment.Production) {
    const weak = (['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const).filter(
      (key) => !validated[key] || PLACEHOLDER_SECRETS.includes(validated[key]),
    );
    if (weak.length > 0) {
      throw new Error(
        `Invalid environment configuration:\n  - ${weak.join(', ')} must be set to a strong, non-default value in production`,
      );
    }
  }

  return validated;
}
