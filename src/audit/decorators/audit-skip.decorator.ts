import { SetMetadata } from '@nestjs/common';

export const AUDIT_SKIP_KEY = 'auditSkip';

/**
 * Opts a route out of automatic audit logging entirely — for routes that are
 * either meaningless to log (health checks) or already covered elsewhere.
 * Audit logging is on by default for every authenticated route; this is the
 * explicit exception, mirroring how `@Public()` is the explicit exception to
 * "authenticated by default".
 */
export const AuditSkip = () => SetMetadata(AUDIT_SKIP_KEY, true);
