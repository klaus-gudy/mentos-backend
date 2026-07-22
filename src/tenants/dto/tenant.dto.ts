import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Tenant, TenantStatus } from '../entities/tenant.entity';

/** Frontend-facing tenant shape — mirrors mentos-frontend's `Tenant` exactly. */
export class TenantResponseDto {
  @ApiProperty({ example: 'T-01', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'Amina Hassan' })
  name: string;

  @ApiProperty({ example: '+255 712 884 201' })
  phone: string;

  @ApiProperty({ example: 'amina.hassan@mail.co.tz' })
  email: string;

  @ApiProperty({ enum: TenantStatus, example: TenantStatus.Active })
  status: TenantStatus;

  @ApiProperty({
    example: '2024-03-01',
    description: 'Tenancy start date (ISO) — the frontend formats this to "Mar 2024" at its edge',
  })
  since: string;

  @ApiProperty({ nullable: true, example: 'U-101', description: "Occupied unit's code, or null" })
  unitId: string | null;

  @ApiProperty({ nullable: true, example: 'P-01', description: "That unit's property code, or null" })
  propId: string | null;

  @ApiProperty({ example: '', description: 'Company name for corporate tenants; blank for individuals' })
  org: string;

  @ApiProperty({ example: 'Pharmacist' })
  occupation: string;

  @ApiProperty({ example: 'Shoppers Plaza' })
  employer: string;

  @ApiProperty({ example: 'NIDA' })
  idType: string;

  @ApiProperty({ example: '19880412-00145-00001-12' })
  idNumber: string;

  @ApiProperty({ example: 'Juma Hassan · Brother', description: 'Next of kin, pre-joined' })
  kin: string;

  @ApiProperty({ example: 'SMS', description: 'Preferred contact channel' })
  comms: string;

  static from(tenant: Tenant): TenantResponseDto {
    return {
      id: tenant.code,
      name: tenant.name,
      phone: tenant.phone,
      email: tenant.email,
      status: tenant.status,
      since: tenant.since,
      unitId: tenant.unit?.code ?? null,
      propId: tenant.property?.code ?? null,
      org: tenant.org,
      occupation: tenant.occupation,
      employer: tenant.employer,
      idType: tenant.idType,
      idNumber: tenant.idNumber,
      kin: tenant.kin,
      comms: tenant.comms,
    };
  }

  static fromMany(tenants: Tenant[]): TenantResponseDto[] {
    return tenants.map((t) => TenantResponseDto.from(t));
  }
}

/**
 * Mirrors mentos-frontend's `NewTenantInput` exactly. Onboarding always
 * creates a `prospective` tenant with no unit — occupancy comes later from a
 * lease (Sprint 4), matching mentos-frontend's `onboardTenant`.
 */
export class CreateTenantDto {
  @ApiProperty({ example: 'Amina Hassan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName: string;

  @ApiProperty({ example: '+255 712 884 201' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone: string;

  @ApiProperty({ example: 'amina.hassan@mail.co.tz' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '19880412-00145-00001-12', description: 'NIDA number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idNumber: string;

  @ApiProperty({ example: 'Pharmacist' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  occupation: string;

  @ApiPropertyOptional({ example: 'Juma Hassan', description: 'Next-of-kin name' })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  emName?: string;

  @ApiPropertyOptional({ example: 'Brother', description: 'Next-of-kin relation' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  emRelation?: string;

  @ApiPropertyOptional({ example: '+255 700 000 000', description: 'Next-of-kin contact' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  emContact?: string;
}

/** Mirrors mentos-frontend's `UpdateTenantInput` — contact & identity fields only. */
export class UpdateTenantDto {
  @ApiPropertyOptional({ example: '+255 712 884 201' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'amina.hassan@mail.co.tz' })
  @IsEmail()
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Pharmacist' })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  occupation?: string;

  @ApiPropertyOptional({ example: 'Shoppers Plaza' })
  @IsString()
  @IsOptional()
  @MaxLength(160)
  employer?: string;

  @ApiPropertyOptional({ example: 'Kazi Tech Ltd', description: 'Company name, if corporate' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  org?: string;

  @ApiPropertyOptional({ example: 'NIDA' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  idType?: string;

  @ApiPropertyOptional({ example: '19880412-00145-00001-12' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  idNumber?: string;

  @ApiPropertyOptional({ example: 'Juma Hassan · Brother' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  kin?: string;

  @ApiPropertyOptional({ example: 'Email' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  comms?: string;
}

export class BlacklistTenantDto {
  @ApiPropertyOptional({ example: 'Repeated late payments and property damage.' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
