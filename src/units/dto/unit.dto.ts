import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { Unit, UnitStatus } from '../entities/unit.entity';

/** Frontend-facing unit shape — mirrors mentos-frontend's `Unit` exactly. */
export class UnitResponseDto {
  @ApiProperty({ example: 'U-101', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'P-01', description: "The owning property's code" })
  propId: string;

  @ApiProperty({ example: 'A-12', description: 'Unit label as shown on the door / lease' })
  no: string;

  @ApiProperty({ example: 1 })
  floor: number;

  @ApiProperty({ example: '2BR', description: 'Free text: Studio, 1BR, 2BR, Office, Retail…' })
  type: string;

  @ApiProperty({ example: 62, description: 'Floor area in square meters' })
  size: number;

  @ApiProperty({ example: 520000 })
  rent: number;

  @ApiProperty({ example: 1040000, description: 'Always 2× rent, computed server-side' })
  deposit: number;

  @ApiProperty({ enum: UnitStatus, example: UnitStatus.Vacant })
  status: UnitStatus;

  @ApiProperty({ nullable: true, example: null, description: "Occupying tenant's code, or null" })
  tenantId: string | null;

  @ApiPropertyOptional({ example: 2 })
  beds?: number | null;

  @ApiPropertyOptional({ example: 1 })
  bathrooms?: number | null;

  @ApiPropertyOptional({ example: 'B', nullable: true })
  block?: string | null;

  @ApiPropertyOptional({ example: 12, description: 'Minimum tenure in months' })
  minTenure?: number | null;

  @ApiPropertyOptional({ type: [String], example: ['Air conditioning', 'Hot water'] })
  amenities?: string[];

  static from(unit: Unit): UnitResponseDto {
    return {
      id: unit.code,
      propId: unit.property?.code ?? '',
      no: unit.no,
      floor: unit.floor,
      type: unit.type,
      size: parseFloat(unit.size.toString()),
      rent: parseFloat(unit.rent.toString()),
      deposit: parseFloat(unit.deposit.toString()),
      status: unit.status,
      tenantId: unit.tenant?.code ?? null,
      beds: unit.beds,
      bathrooms: unit.bathrooms,
      block: unit.block,
      minTenure: unit.minTenure,
      amenities: unit.amenities,
    };
  }

  static fromMany(units: Unit[]): UnitResponseDto[] {
    return units.map((u) => UnitResponseDto.from(u));
  }
}

/**
 * Mirrors mentos-frontend's `NewUnitInput`, with server-side defaults matching
 * mentos-frontend/lib/api.ts `addUnit` in place of its blank-string fallbacks.
 * `deposit` is intentionally absent — it's always 2× rent, computed server-side.
 */
export class CreateUnitDto {
  @ApiProperty({ example: 'A-12', description: 'Unit label as shown on the door / lease' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  no: string;

  @ApiPropertyOptional({ example: 1, description: 'Defaults to 1 if omitted' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  floor?: number;

  @ApiPropertyOptional({ example: '2BR', description: 'Free text. Defaults to "1BR"' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ example: 62, description: 'Square meters. Defaults to 100' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  size?: number;

  @ApiProperty({ example: 520000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rent: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Defaults from type (Studio/1BR→1, 2BR→2, 3BR→3, else 0) if omitted',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  beds?: number;

  @ApiPropertyOptional({ example: 1, description: 'Defaults to 1 if omitted' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  bathrooms?: number;

  @ApiPropertyOptional({ example: 'B' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  block?: string;

  @ApiPropertyOptional({ example: 12, description: 'Months. Defaults to 12 if omitted' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minTenure?: number;

  @ApiPropertyOptional({ type: [String], example: ['Air conditioning', 'Hot water'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  amenities?: string[];
}

/** Mirrors mentos-frontend's `UpdateUnitInput`. `status`/`tenantId` are not editable here — they change only via lease actions (Sprint 4). */
export class UpdateUnitDto {
  @ApiPropertyOptional({ example: 'A-12' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  no?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  floor?: number;

  @ApiPropertyOptional({ example: '2BR' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({ example: 62 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  size?: number;

  @ApiPropertyOptional({ example: 540000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  rent?: number;

  @ApiPropertyOptional({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  beds?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  bathrooms?: number;

  @ApiPropertyOptional({ example: 'B' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  block?: string;

  @ApiPropertyOptional({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minTenure?: number;

  @ApiPropertyOptional({ type: [String], example: ['Air conditioning', 'Hot water', 'Balcony'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  amenities?: string[];
}
