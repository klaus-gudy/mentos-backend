import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/** Whether the action actually succeeded — a denied/failed attempt is still worth recording. */
export enum AuditOutcome {
  Success = 'success',
  Denied = 'denied',
  Error = 'error',
}

/**
 * One row per tracked request: who, what, on which record, when, and whether
 * it succeeded. This is the single table behind "explain who did what at
 * what time" for every module — see AuditInterceptor for how rows get here
 * automatically, and ARCHITECTURE.md §11 for the full design rationale.
 *
 * `actorName`/`actorEmail` are snapshotted at write time (not just a FK) so
 * the log still reads correctly if the account is later renamed — this
 * table is a historical record, not a live view.
 */
@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser: User | null;

  /** Snapshotted display name — "System" for unauthenticated/system-initiated actions. */
  @Column({ type: 'varchar', length: 160, default: 'System' })
  actorName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorEmail: string | null;

  /**
   * `<resource>.<action>` — reuses the exact same taxonomy as the RBAC
   * permission catalog (`unit.create`, `lease.terminate`, `tenant.blacklist`…)
   * rather than inventing a parallel one, so every permission-gated route
   * gets a matching audit category for free.
   */
  @Index()
  @Column({ type: 'varchar', length: 40 })
  resource: string;

  @Index()
  @Column({ type: 'varchar', length: 40 })
  action: string;

  /** The affected record's business code (e.g. "U-104"), when there is a single one. */
  @Index()
  @Column({ type: 'varchar', length: 32, nullable: true })
  resourceId: string | null;

  /** Denormalized human label for that record (e.g. a tenant's name), when available. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  resourceName: string | null;

  /** The human-readable sentence rendered in the UI, e.g. "created lease L-06 for Said Salim · Shop G-07". */
  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 255 })
  path: string;

  @Column({ type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ type: 'enum', enum: AuditOutcome, default: AuditOutcome.Success })
  outcome: AuditOutcome;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  /** Lucide icon name for the UI — derived from `resource`, matching the RBAC catalog's own icons. */
  @Column({ type: 'varchar', length: 40, default: 'history' })
  icon: string;

  /**
   * Free-form extra context — e.g. a before/after diff for a status change,
   * or the validation errors for a failed request. Never required; a place
   * to hang richer detail without a schema change for every new scenario.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
