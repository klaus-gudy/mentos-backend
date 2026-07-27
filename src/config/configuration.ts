// Treat empty-string env vars as absent so defaults apply (some shells export
// e.g. PORT="" which is not nullish and would otherwise win over the default).
const env = (key: string, fallback: string): string => {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
};

export default () => ({
  nodeEnv: env('NODE_ENV', 'development'),
  port: parseInt(env('PORT', '4000'), 10),
  apiPrefix: env('API_PREFIX', 'api'),
  corsOrigin: env('CORS_ORIGIN', '*'),
  database: {
    host: env('DB_HOST', 'localhost'),
    port: parseInt(env('DB_PORT', '5432'), 10),
    username: env('DB_USERNAME', 'nyumba'),
    password: env('DB_PASSWORD', 'nyumba'),
    name: env('DB_NAME', 'nyumba'),
    logging: env('DB_LOGGING', 'false') === 'true',
  },
  jwt: {
    accessSecret: env('JWT_ACCESS_SECRET', 'change-me-access'),
    refreshSecret: env('JWT_REFRESH_SECRET', 'change-me-refresh'),
    accessTtl: env('JWT_ACCESS_TTL', '900s'),
    refreshTtl: env('JWT_REFRESH_TTL', '7d'),
  },
  auth: {
    bcryptRounds: parseInt(env('BCRYPT_ROUNDS', '12'), 10),
    /** Refresh-token lifetime, in days. */
    refreshTtlDays: parseInt(env('REFRESH_TTL_DAYS', '7'), 10),
    /** Invite links stay valid for a week by default. */
    inviteTtlMinutes: parseInt(env('INVITE_TTL_MINUTES', '10080'), 10),
    /** Password-reset links are short-lived. */
    resetTtlMinutes: parseInt(env('RESET_TTL_MINUTES', '60'), 10),
  },
  /** Base URL of the frontend, used to build invite and reset links. */
  appUrl: env('APP_URL', 'http://localhost:4317'),
  /** S3-compatible object storage (MinIO in dev) for uploaded/generated documents. */
  storage: {
    endpoint: env('S3_ENDPOINT', 'http://localhost:9000'),
    region: env('S3_REGION', 'us-east-1'),
    bucket: env('S3_BUCKET', 'nyumba-documents'),
    accessKeyId: env('S3_ACCESS_KEY', 'nyumba'),
    secretAccessKey: env('S3_SECRET_KEY', 'nyumba-minio-secret'),
    // MinIO needs path-style bucket addressing (bucket.endpoint/key resolves
    // nowhere for it); real AWS S3 would use virtual-hosted style instead.
    forcePathStyle: env('S3_FORCE_PATH_STYLE', 'true') === 'true',
  },
});
