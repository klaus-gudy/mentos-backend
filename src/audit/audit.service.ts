import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { iconForResource } from './audit-icons';
import { AuditLogResponseDto, QueryAuditLogDto } from './dto/audit-log.dto';
import { AuditLog, AuditOutcome } from './entities/audit-log.entity';

export interface RecordAuditEntry {
  actorUserId?: string | null;
  actorName?: string;
  actorEmail?: string | null;
  resource: string;
  action: string;
  resourceId?: string | null;
  resourceName?: string | null;
  description: string;
  method: string;
  path: string;
  statusCode?: number | null;
  outcome?: AuditOutcome;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * The single write/read path for audit history. Written to almost entirely by
 * AuditInterceptor (automatic, on every non-skipped request) and, for denied
 * attempts, by PermissionsGuard — see ARCHITECTURE.md §11. Services can also
 * call `record()` directly for a hand-crafted entry when the auto-generated
 * description isn't rich enough, but nothing requires that; coverage is
 * retroactive across every existing permission-gated route.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly logs: Repository<AuditLog>,
  ) {}

  async record(entry: RecordAuditEntry): Promise<void> {
    try {
      const code = await this.nextCode();
      await this.logs.save(
        this.logs.create({
          code,
          actorUserId: entry.actorUserId ?? null,
          actorName: entry.actorName ?? 'System',
          actorEmail: entry.actorEmail ?? null,
          resource: entry.resource,
          action: entry.action,
          resourceId: entry.resourceId ?? null,
          resourceName: entry.resourceName ?? null,
          description: entry.description,
          method: entry.method,
          path: entry.path,
          statusCode: entry.statusCode ?? null,
          outcome: entry.outcome ?? AuditOutcome.Success,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent?.slice(0, 255) ?? null,
          icon: iconForResource(entry.resource),
          metadata: entry.metadata ?? null,
        }),
      );
    } catch (err) {
      // Auditing must never break the request it's observing.
      this.logger.error(
        `Failed to write audit entry for ${entry.method} ${entry.path}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async findAll(query: QueryAuditLogDto): Promise<AuditLogResponseDto[]> {
    const qb = this.logs.createQueryBuilder('log').leftJoin('log.actorUser', 'actor');

    if (query.resource) qb.andWhere('log.resource = :resource', { resource: query.resource });
    if (query.action) qb.andWhere('log.action = :action', { action: query.action });
    if (query.resourceId) qb.andWhere('log.resourceId = :resourceId', { resourceId: query.resourceId });
    if (query.outcome) qb.andWhere('log.outcome = :outcome', { outcome: query.outcome });
    if (query.actorId) qb.andWhere('actor.code = :actorId', { actorId: query.actorId });
    if (query.from) qb.andWhere('log.createdAt >= :from', { from: query.from });
    if (query.to) qb.andWhere('log.createdAt < (:to::date + INTERVAL \'1 day\')', { to: query.to });

    qb.orderBy('log.createdAt', 'DESC').take(query.limit ?? 200);

    const logs = await qb.getMany();
    return AuditLogResponseDto.fromMany(logs);
  }

  async findByCodeOrFail(code: string): Promise<AuditLog> {
    const log = await this.logs.findOne({ where: { code } });
    if (!log) {
      throw new NotFoundException(`Audit entry "${code}" not found`);
    }
    return log;
  }

  async findOne(code: string): Promise<AuditLogResponseDto> {
    return AuditLogResponseDto.from(await this.findByCodeOrFail(code));
  }

  /**
   * "A-{n}", matching the frontend seed — but via a real Postgres SEQUENCE
   * (`audit_log_code_seq`, created in the migration), not the MAX(code)+1 +
   * table lock pattern every other module uses. That pattern is fine for
   * leases/tenants/etc. (created rarely), but this table gets written on
   * every single request; locking it per-write would serialize all API
   * traffic through one lock. A sequence increments atomically with no lock.
   */
  private async nextCode(): Promise<string> {
    const [{ nextval }] = await this.logs.query<[{ nextval: string }]>(
      "SELECT nextval('audit_log_code_seq') AS nextval",
    );
    return `A-${nextval}`;
  }
}
