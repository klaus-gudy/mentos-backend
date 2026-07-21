import { ApiProperty } from '@nestjs/swagger';
import { User, UserStatus } from '../entities/user.entity';

/**
 * The frontend-facing shape of a user (mentos-frontend `User`).
 *
 * Two bridges per ARCHITECTURE.md: the business `code` is serialized as `id`
 * (the UUID never leaves the server), and `last` is a real ISO timestamp —
 * the frontend renders "Online now" / "3 hrs ago" at its edge via lib/format.ts.
 */
export class UserResponseDto {
  @ApiProperty({ example: 'US-1', description: 'Business code, used as the id by the frontend' })
  id: string;

  @ApiProperty({ example: 'Samira Mketo' })
  name: string;

  @ApiProperty({ example: 'samira@nyumba.co.tz' })
  email: string;

  @ApiProperty({ example: 'Super Admin', description: 'Role display name' })
  role: string;

  @ApiProperty({ example: 'role-super', description: 'Role code, for edit forms' })
  roleId: string;

  @ApiProperty({ enum: UserStatus, example: UserStatus.Active })
  status: UserStatus;

  @ApiProperty({
    nullable: true,
    example: '2026-07-21T18:44:54.638Z',
    description: 'Last successful sign-in (ISO); null when the invite is still pending',
  })
  last: string | null;

  @ApiProperty({ example: false })
  mfa: boolean;

  static from(user: User): UserResponseDto {
    return {
      id: user.code,
      name: user.fullName,
      email: user.email,
      role: user.role?.name ?? '',
      roleId: user.role?.code ?? '',
      status: user.status,
      last: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      mfa: user.mfaEnabled,
    };
  }

  static fromMany(users: User[]): UserResponseDto[] {
    return users.map((u) => UserResponseDto.from(u));
  }
}
