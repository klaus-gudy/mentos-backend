import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditLog, AuditOutcome } from '../entities/audit-log.entity';

/**
 * Frontend-facing shape — a superset of mentos-frontend's `AuditEntry`
 * (`{id, actor, action, time, icon}`, exactly what the current audit log
 * page renders). The extra fields are additive and ignored by that page
 * today, but are what "drill down per module" (the ask this module exists
 * for) is built on: filter `GET /audit` by `resource`/`resourceId` to get
 * every recorded action against one unit, one tenant, one lease, etc.
 */
export class AuditLogResponseDto {
  @ApiProperty({ example: 'A-142', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'Samira Mketo', description: 'Snapshotted at write time' })
  actor: string;

  @ApiProperty({ example: 'created lease L-06 for Said Salim · Shop G-07' })
  action: string;

  @ApiProperty({ example: '2026-07-27T10:24:00.000Z', description: 'ISO timestamp' })
  time: string;

  @ApiProperty({ example: 'file-text', description: 'Lucide icon name' })
  icon: string;

  @ApiProperty({ example: 'lease', description: 'Module this action belongs to' })
  resource: string;

  @ApiProperty({ example: 'create', description: 'The `<resource>.<action>` permission key\'s action half' })
  actionKey: string;

  @ApiProperty({ nullable: true, example: 'L-06', description: "The affected record's code, if any" })
  resourceId: string | null;

  @ApiProperty({ enum: AuditOutcome, example: AuditOutcome.Success })
  outcome: AuditOutcome;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({ example: '/api/leases' })
  path: string;

  @ApiPropertyOptional({ nullable: true, example: 201 })
  statusCode: number | null;

  @ApiPropertyOptional({ nullable: true, example: '203.0.113.7' })
  ipAddress: string | null;

  static from(log: AuditLog): AuditLogResponseDto {
    return {
      id: log.code,
      actor: log.actorName,
      action: log.description,
      time: log.createdAt.toISOString(),
      icon: log.icon,
      resource: log.resource,
      actionKey: log.action,
      resourceId: log.resourceId,
      outcome: log.outcome,
      method: log.method,
      path: log.path,
      statusCode: log.statusCode,
      ipAddress: log.ipAddress,
    };
  }

  static fromMany(logs: AuditLog[]): AuditLogResponseDto[] {
    return logs.map((l) => AuditLogResponseDto.from(l));
  }
}

/** Query filters for `GET /audit` — every field optional, combined with AND. */
export class QueryAuditLogDto {
  @ApiPropertyOptional({ example: 'unit', description: 'Module, e.g. "unit", "lease", "tenant"' })
  @IsString()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional({ example: 'create' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ example: 'U-104', description: "Filter to one record's history" })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ example: 'US-1', description: "Filter to one actor's activity" })
  @IsString()
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional({ enum: AuditOutcome })
  @IsIn(Object.values(AuditOutcome))
  @IsOptional()
  outcome?: AuditOutcome;

  @ApiPropertyOptional({ example: '2026-07-01', description: 'ISO date, inclusive' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2026-07-31', description: 'ISO date, inclusive' })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ example: 100, description: 'Default 200, max 1000' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number;
}
