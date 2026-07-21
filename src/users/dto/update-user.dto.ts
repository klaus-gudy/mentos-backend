import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

/**
 * Admin edit. Email is deliberately not editable here — changing a sign-in
 * identity needs its own verified flow rather than a silent field update.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Rehema Paul' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'role-acct', description: 'Role code from GET /api/roles' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  mfa?: boolean;
}
