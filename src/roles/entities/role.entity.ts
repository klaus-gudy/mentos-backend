import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * A named permission set. `perms` holds `<resource>.<action>` keys from the
 * RBAC catalog (see common/rbac/perm-catalog.ts).
 *
 * `code` is the frontend-facing slug ("role-super", "role-pm") serialized as
 * the `id` the frontend expects — see ARCHITECTURE.md §1.
 */
@Entity('roles')
export class Role extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  perms: string[];

  /**
   * Built-in roles seeded from the frontend catalog. They cannot be deleted —
   * only their permission sets are editable.
   */
  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  has(perm: string): boolean {
    return this.perms.includes(perm);
  }
}
