import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditOutcome } from '../../audit/entities/audit-log.entity';
import { User } from '../../users/entities/user.entity';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Enforces `@Permissions('resource.action')`. Runs after JwtAuthGuard, so the
 * request already carries a live User with its role eagerly loaded.
 *
 * Routes without the decorator are allowed — authentication alone is the bar.
 *
 * Denied attempts are logged here, not by AuditInterceptor: guards run
 * before interceptors in Nest's request lifecycle, so a rejection thrown
 * here never reaches an interceptor's `catchError` at all — this is the only
 * place that can see it.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const granted = req.user?.role?.perms ?? [];
    const missing = required.filter((perm) => !granted.includes(perm));

    if (missing.length > 0) {
      const [resource, action] = required[0].split('.');
      const rawIdParam = req.params?.code ?? req.params?.invoiceCode ?? req.params?.propertyCode;
      const idParam = typeof rawIdParam === 'string' ? rawIdParam : null;

      await this.audit.record({
        actorUserId: req.user?.id ?? null,
        actorName: req.user?.fullName ?? 'Anonymous',
        actorEmail: req.user?.email ?? null,
        resource,
        action,
        resourceId: idParam,
        description: `attempted to ${action} ${resource}${idParam ? ` ${idParam}` : ''} — missing permission: ${missing.join(', ')}`,
        method: req.method,
        path: req.route?.path ?? req.path,
        statusCode: 403,
        outcome: AuditOutcome.Denied,
        ipAddress: req.ip ?? null,
        userAgent: req.get?.('user-agent') ?? null,
        metadata: { missingPermissions: missing },
      });

      throw new ForbiddenException(`Missing permission: ${missing.join(', ')}`);
    }
    return true;
  }
}
