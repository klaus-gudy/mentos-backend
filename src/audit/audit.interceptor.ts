import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { BackgroundTaskTracker } from '../common/background-task-tracker.service';
import { User } from '../users/entities/user.entity';
import { AuditService } from './audit.service';
import { AUDIT_SKIP_KEY } from './decorators/audit-skip.decorator';
import { AuditOutcome } from './entities/audit-log.entity';

/**
 * `:code` is the target record on every GET/PATCH/DELETE-one route in this
 * codebase. Nested routes also carry a *parent*-scoping param
 * (`:propertyCode` on `POST /properties/:propertyCode/units`,
 * `:invoiceCode` on `POST /invoices/:invoiceCode/payments`) — deliberately
 * excluded here, since for a nested create that param names the parent, not
 * the record the request is actually about. The created record's own code
 * comes from the response body instead (see `extractId`).
 */
const ID_PARAM_CANDIDATES = ['code'];

/** `/api/auth/refresh` and `/api/auth/me` fire on every page load/token tick — not meaningful activity. */
const SKIPPED_AUTH_ACTIONS = new Set(['refresh', 'me']);

const VERBS: Record<string, string> = {
  create: 'created',
  update: 'updated',
  delete: 'deleted',
  read: 'viewed',
  terminate: 'terminated',
  blacklist: 'blacklisted',
  assign: 'assigned',
  close: 'closed',
  export: 'exported',
  void: 'voided',
  send: 'sent',
  configure: 'configured',
  login: 'signed in',
  register: 'registered',
  logout: 'signed out',
  logout_all: 'signed out of every device',
  forgot_password: 'requested a password reset',
  reset_password: 'reset their password',
  accept_invite: 'accepted an invite',
  change_password: 'changed their password',
};

interface ActionContext {
  resource: string;
  action: string;
  /** True for the handful of @Public() /auth/* routes with no @Permissions() metadata. */
  isAuthAction: boolean;
}

/**
 * Automatically logs every non-skipped authenticated request. Derives
 * resource+action from the SAME `@Permissions('resource.action')` metadata
 * already on every gated route — no per-controller instrumentation needed,
 * and it's retroactive across everything already built. See
 * ARCHITECTURE.md §11 for the full design and its deliberate gaps (guard-level
 * 401/403 denials are logged by PermissionsGuard itself, not here — see
 * that class for why an interceptor can't see them).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
    private readonly tracker: BackgroundTaskTracker,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const skip = this.reflector.getAllAndOverride<boolean>(AUDIT_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const res = context.switchToHttp().getResponse<Response>();

    const actionContext = this.resolveActionContext(context, req);
    if (!actionContext) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((value) => {
        this.tracker.track(
          this.logOutcome(
            req,
            res,
            actionContext,
            AuditOutcome.Success,
            AuditInterceptor.unwrap(value),
          ),
        );
      }),
      catchError((err: unknown) => {
        this.tracker.track(
          this.logOutcome(req, res, actionContext, AuditOutcome.Error, undefined, err),
        );
        throw err;
      }),
    );
  }

  /**
   * ResponseInterceptor (registered in main.ts) wraps every success payload
   * as `{success, data, timestamp}` before the client sees it. Interceptor
   * composition order means this one observes that already-wrapped value,
   * not the controller's raw return — so `value.id`/`value.name`/`value.user`
   * live one level deeper than they'd naively appear.
   */
  private static unwrap(value: unknown): unknown {
    if (value && typeof value === 'object' && 'success' in value && 'data' in value) {
      return (value as { data: unknown }).data;
    }
    return value;
  }

  /** Null return means "nothing meaningful to categorize" — the interceptor no-ops. */
  private resolveActionContext(context: ExecutionContext, req: Request): ActionContext | null {
    const perms = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (perms?.length) {
      const [resource, action] = perms[0].split('.');
      const hasIdParam = ID_PARAM_CANDIDATES.some((p) => Boolean(req.params?.[p]));
      // A permission-gated *list* GET (no target record) is routine browsing,
      // not an event worth a row — but every mutation and every single-record
      // read still gets one.
      if (req.method === 'GET' && !hasIdParam) {
        return null;
      }
      return { resource, action, isAuthAction: false };
    }

    // Every /auth/* route with no @Permissions() metadata — both the
    // @Public() ones (login, register…) and the authenticated-but-ungated
    // ones (change-password, logout-all). Path-based, not `@Public()`-based:
    // other @Public() routes (health) aren't auth actions and must fall
    // through to `return null` below instead.
    if (req.path.includes('/auth/')) {
      const segment = req.path.split('/').filter(Boolean).pop() ?? '';
      const action = segment.replace(/-/g, '_');
      if (!action || SKIPPED_AUTH_ACTIONS.has(action)) {
        return null;
      }
      return { resource: 'auth', action, isAuthAction: true };
    }

    return null;
  }

  private async logOutcome(
    req: Request & { user?: User },
    res: Response,
    ctx: ActionContext,
    outcome: AuditOutcome,
    value?: unknown,
    error?: unknown,
  ): Promise<void> {
    const resourceId = this.resolveResourceId(req, value);
    const actor = this.resolveActor(req, ctx, value);
    const statusCode =
      outcome === AuditOutcome.Success
        ? res.statusCode
        : error instanceof HttpException
          ? error.getStatus()
          : 500;

    const description = this.buildDescription(ctx, resourceId, value, error);

    await this.audit.record({
      actorUserId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      resource: ctx.resource,
      action: ctx.action,
      resourceId,
      resourceName: AuditInterceptor.extractName(value),
      description,
      method: req.method,
      path: req.route?.path ?? req.path,
      statusCode,
      outcome,
      ipAddress: req.ip ?? null,
      userAgent: req.get?.('user-agent') ?? null,
      metadata: error ? { error: AuditInterceptor.errorMessage(error) } : null,
    });
  }

  private resolveResourceId(req: Request, value: unknown): string | null {
    for (const param of ID_PARAM_CANDIDATES) {
      const v = req.params?.[param];
      if (typeof v === 'string' && v) return v;
    }
    // Newly-created records (POST with no route param) — the response body's `id` is the new code.
    return AuditInterceptor.extractId(value);
  }

  /**
   * `req.user` (set by JwtStrategy) covers every authenticated route except
   * the handful of @Public() auth actions that issue *new* identity
   * (register/login/accept-invite) — for those, req.user doesn't exist yet,
   * so the actor comes from the response body instead.
   */
  private resolveActor(
    req: Request & { user?: User },
    ctx: ActionContext,
    value: unknown,
  ): { id: string | null; name: string; email: string | null } {
    if (req.user) {
      return { id: req.user.id, name: req.user.fullName, email: req.user.email };
    }
    if (ctx.isAuthAction) {
      const body = value as { user?: { id?: string; name?: string; email?: string } } | undefined;
      const u = body?.user;
      if (u?.name) {
        return { id: null, name: u.name, email: u.email ?? null };
      }
    }
    return { id: null, name: 'Anonymous', email: null };
  }

  private buildDescription(
    ctx: ActionContext,
    resourceId: string | null,
    value: unknown,
    error?: unknown,
  ): string {
    const verb = VERBS[ctx.action] ?? ctx.action;

    if (ctx.isAuthAction) {
      return error
        ? `attempted to ${ctx.action.replace(/_/g, ' ')} — ${AuditInterceptor.errorMessage(error)}`
        : verb;
    }

    const target = resourceId ? `${ctx.resource} ${resourceId}` : ctx.resource;
    const name = AuditInterceptor.extractName(value);
    const suffix = name ? ` (${name})` : '';

    if (error) {
      // "attempted to" wants the infinitive ("terminate"), not VERBS' past
      // tense ("terminated") — the action key itself, underscores aside, is
      // already in that form ("create", "terminate", "blacklist"…).
      const infinitive = ctx.action.replace(/_/g, ' ');
      return `attempted to ${infinitive} ${target}${suffix} — ${AuditInterceptor.errorMessage(error)}`;
    }
    return `${verb} ${target}${suffix}`;
  }

  private static extractId(value: unknown): string | null {
    if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
      return value.id;
    }
    return null;
  }

  private static extractName(value: unknown): string | null {
    if (!value || typeof value !== 'object') return null;
    const v = value as Record<string, unknown>;
    if (typeof v.name === 'string') return v.name;
    if (typeof v.title === 'string') return v.title;
    return null;
  }

  private static errorMessage(error: unknown): string {
    if (error instanceof HttpException) {
      const res = error.getResponse();
      if (typeof res === 'string') return res;
      if (res && typeof res === 'object' && 'message' in res) {
        const m = (res as { message: unknown }).message;
        return Array.isArray(m) ? m.join('; ') : String(m);
      }
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
