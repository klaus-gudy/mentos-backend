import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from '../../roles/entities/role.entity';

export enum UserStatus {
  Active = 'active',
  Invited = 'invited',
  Suspended = 'suspended',
}

/**
 * A person who can sign in. Mirrors the frontend `User` contract, with the
 * display-only fields (`last`, `role` name) computed in UserResponseDto —
 * see ARCHITECTURE.md §3.
 *
 * `passwordHash` is nullable: invited users have no password until they accept
 * the invite and set one.
 */
@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32 })
  code: string;

  @Column({ type: 'varchar', length: 160 })
  fullName: string;

  /** Stored lower-cased; lookups normalize the input the same way. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, (role) => role.users, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.Invited })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  mfaEnabled: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  /**
   * Bumped whenever every existing session must die (password change/reset,
   * suspension). Access tokens carry this value and are rejected once stale,
   * which closes the window where a short-lived access token outlives a reset.
   */
  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  get isActive(): boolean {
    return this.status === UserStatus.Active;
  }
}
