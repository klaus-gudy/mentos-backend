import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * One row per issued refresh token, stored as a SHA-256 hash — a database leak
 * must not yield usable tokens.
 *
 * Refresh is rotating: redeeming a token revokes it and records the successor
 * in `replacedByTokenHash`. If a already-revoked token is presented again, the
 * whole family is assumed stolen and every session for that user is revoked.
 */
@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  tokenHash: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  replacedByTokenHash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  get isUsable(): boolean {
    return this.revokedAt === null && this.expiresAt.getTime() > Date.now();
  }
}
