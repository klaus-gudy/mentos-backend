import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { daysUntil } from '../../common/date.util';
import { Lease, LeaseStatus } from '../entities/lease.entity';

/** Frontend-facing lease shape — mirrors mentos-frontend's `Lease` exactly. */
export class LeaseResponseDto {
  @ApiProperty({ example: 'L-01', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'T-01' })
  tenantId: string;

  @ApiProperty({ example: 'U-101' })
  unitId: string;

  @ApiProperty({ example: 'P-01' })
  propId: string;

  @ApiProperty({ example: '2024-03-01', description: 'ISO date' })
  start: string;

  @ApiProperty({ example: '2026-07-19', description: 'ISO date' })
  end: string;

  @ApiProperty({ example: 520000 })
  rent: number;

  @ApiProperty({ example: 1040000 })
  deposit: number;

  @ApiProperty({ example: 'Monthly' })
  frequency: string;

  @ApiProperty({
    example: 18,
    description: 'Days from today until `end` — computed, not stored; negative once past due',
  })
  daysToExpiry: number;

  @ApiProperty({ enum: LeaseStatus, example: LeaseStatus.Active })
  status: LeaseStatus;

  @ApiPropertyOptional({ example: 'Bank transfer to Acc #1234' })
  billing?: string;

  @ApiPropertyOptional({ example: '5 days' })
  grace?: string;

  @ApiPropertyOptional({ example: '5% of monthly rent' })
  penalty?: string;

  @ApiPropertyOptional({ example: 'Auto-renews unless 60-day notice given' })
  renewal?: string;

  @ApiPropertyOptional({ example: 'Tenant requested a ground-floor unit if available at renewal.' })
  notes?: string;

  static from(lease: Lease): LeaseResponseDto {
    return {
      id: lease.code,
      tenantId: lease.tenant?.code ?? '',
      unitId: lease.unit?.code ?? '',
      propId: lease.property?.code ?? '',
      start: lease.start,
      end: lease.end,
      rent: parseFloat(lease.rent.toString()),
      deposit: parseFloat(lease.deposit.toString()),
      frequency: lease.frequency,
      daysToExpiry: daysUntil(lease.end),
      status: lease.status,
      billing: lease.billing ?? undefined,
      grace: lease.grace ?? undefined,
      penalty: lease.penalty ?? undefined,
      renewal: lease.renewal ?? undefined,
      notes: lease.notes ?? undefined,
    };
  }

  static fromMany(leases: Lease[]): LeaseResponseDto[] {
    return leases.map((l) => LeaseResponseDto.from(l));
  }
}

/** Mirrors mentos-frontend's `NewLeaseInput`. */
export class CreateLeaseDto {
  @ApiProperty({ example: 'T-10', description: 'Must not already hold another active lease' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'U-104', description: 'Must currently be vacant' })
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({ example: '2026-08-01', description: 'ISO date' })
  @IsDateString()
  start: string;

  @ApiProperty({ example: 12, description: 'Lease term in months' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  duration: number;

  @ApiPropertyOptional({ example: 540000, description: "Defaults to the unit's rent if omitted" })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  rent?: number;

  @ApiPropertyOptional({ example: 1080000, description: "Defaults to the unit's deposit if omitted" })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  deposit?: number;

  @ApiPropertyOptional({ example: 'Monthly', description: 'Defaults to "Monthly" if omitted' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  frequency?: string;

  @ApiPropertyOptional({ example: 'Bank transfer to Acc #1234' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  billing?: string;

  @ApiPropertyOptional({ example: '5 days' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  grace?: string;

  @ApiPropertyOptional({ example: '5% of monthly rent' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  penalty?: string;

  @ApiPropertyOptional({ example: 'Auto-renews unless 60-day notice given' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  renewal?: string;

  @ApiPropertyOptional({ example: 'First-time renter, referred by John Mushi.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

/** Lease term edits only — mirrors the `lease.update` permission ("Edit lease terms"). */
export class UpdateLeaseDto {
  @ApiPropertyOptional({ example: 550000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  rent?: number;

  @ApiPropertyOptional({ example: 1100000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  deposit?: number;

  @ApiPropertyOptional({ example: 'Quarterly' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  frequency?: string;

  @ApiPropertyOptional({ example: 'Mobile money to +255 700 000 000' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  billing?: string;

  @ApiPropertyOptional({ example: '3 days' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  grace?: string;

  @ApiPropertyOptional({ example: '10% of monthly rent' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  penalty?: string;

  @ApiPropertyOptional({ example: 'Renews annually by mutual agreement' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  renewal?: string;

  @ApiPropertyOptional({ example: 'Rent revised at 12-month mark.' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class TerminateLeaseDto {
  @ApiPropertyOptional({ example: 'Tenant relocating out of the city.' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
