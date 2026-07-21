import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Admin invite payload — mirrors the frontend's `NewUserInput`. */
export class CreateUserDto {
  @ApiProperty({ example: 'Rehema Paul' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @ApiProperty({ example: 'rehema@nyumba.co.tz' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'role-pm', description: 'Role code from GET /api/roles' })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiPropertyOptional({ example: false, description: 'Require MFA for this user' })
  @IsBoolean()
  @IsOptional()
  mfa?: boolean;
}
