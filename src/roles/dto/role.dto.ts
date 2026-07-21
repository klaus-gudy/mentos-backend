import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '../entities/role.entity';

/** Frontend-facing role shape (mentos-frontend `Role`), with `code` as `id`. */
export class RoleResponseDto {
  @ApiProperty({ example: 'role-pm' })
  id: string;

  @ApiProperty({ example: 'Property Manager' })
  name: string;

  @ApiProperty({ example: 'Runs day-to-day operations across assigned properties.' })
  desc: string;

  @ApiProperty({ type: [String], example: ['dashboard.read', 'property.read'] })
  perms: string[];

  @ApiProperty({ example: true, description: 'Built-in roles cannot be deleted' })
  isSystem: boolean;

  @ApiProperty({ example: 3, description: 'How many users currently hold this role' })
  userCount: number;

  static from(role: Role, userCount = 0): RoleResponseDto {
    return {
      id: role.code,
      name: role.name,
      desc: role.description,
      perms: role.perms,
      isSystem: role.isSystem,
      userCount,
    };
  }
}

/** Mirrors the frontend's `NewRoleInput`. */
export class CreateRoleDto {
  @ApiProperty({ example: 'Regional Supervisor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: 'Oversees a cluster of properties.' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['dashboard.read', 'property.read'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  perms?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Regional Supervisor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Oversees a cluster of properties.' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class SetRolePermsDto {
  @ApiProperty({
    type: [String],
    example: ['dashboard.read', 'property.read', 'property.create'],
    description: 'Full replacement set; every key must exist in the permission catalog',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  perms: string[];
}
