import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum UserTokenPurpose {
  /** Emailed when an admin invites a user; redeeming it sets the first password. */
  Invite = 'invite',
  /** Emailed on forgot-password; redeeming it replaces the password. */
  PasswordReset = 'password_reset',
}

/**
 * Single-use, expiring token for out-of-band flows (invite acceptance, password
 * reset). Stored as a SHA-256 hash for the same reason as refresh tokens: the
 * plaintext exists only in the email we send.
 */
@Entity('user_tokens')
export class UserToken extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  tokenHash: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: UserTokenPurpose })
  purpose: UserTokenPurpose;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  get isUsable(): boolean {
    return this.usedAt === null && this.expiresAt.getTime() > Date.now();
  }
}
