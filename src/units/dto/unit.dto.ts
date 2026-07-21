import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Unit, UnitStatus, UnitType } from '../entities/unit.entity';

export class UnitResponseDto {
  @ApiProperty({ example: 'U-101', description: 'Business code, used as id' })
  id: string;

  @ApiProperty({ example: 'U-101', description: 'Apartment 101' })
  unitNumber: string;

  @ApiProperty({ example: 'Spacious 2-bedroom unit with balcony' })
  description: string;

  @ApiProperty({ enum: UnitType, example: UnitType.TwoBedroom })
  type: UnitType;

  @ApiProperty({ example: '2 Bedroom', description: 'Display label' })
  typeLabel: string;

  @ApiProperty({ enum: UnitStatus, example: UnitStatus.Vacant })
  status: UnitStatus;

  @ApiProperty({ example: 'Vacant', description: 'Display label' })
  statusLabel: string;

  @ApiPropertyOptional({ example: 1500 })
  monthlyRent: number | null;

  @ApiPropertyOptional({ example: 3000 })
  deposit: number | null;

  @ApiPropertyOptional({ example: 1, description: 'Floor number, null if no floor info' })
  floorNumber: number | null;

  @ApiPropertyOptional({ example: true })
  hasBalcony: boolean;

  @ApiPropertyOptional({ example: true })
  hasParkingSpace: boolean;

  @ApiPropertyOptional({
    example: 'Air conditioning, Hot water, Furnished',
    description: 'Comma-separated amenities',
  })
  amenities: string | null;

  static from(unit: Unit): UnitResponseDto {
    return {
      id: unit.code,
      unitNumber: unit.unitNumber,
      description: unit.description || '',
      type: unit.type,
      typeLabel: unit.typeLabel,
      status: unit.status,
      statusLabel: unit.statusLabel,
      monthlyRent: unit.monthlyRent ? parseFloat(unit.monthlyRent.toString()) : null,
      deposit: unit.deposit ? parseFloat(unit.deposit.toString()) : null,
      floorNumber: unit.floorNumber,
      hasBalcony: unit.hasBalcony,
      hasParkingSpace: unit.hasParkingSpace,
      amenities: unit.amenities,
    };
  }

  static fromMany(units: Unit[]): UnitResponseDto[] {
    return units.map((u) => UnitResponseDto.from(u));
  }
}

export class CreateUnitDto {
  @ApiProperty({ example: 'Unit 101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  unitNumber: string;

  @ApiPropertyOptional({ example: 'Spacious 2-bedroom with balcony' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: UnitType, example: UnitType.TwoBedroom })
  @IsEnum(UnitType)
  type: UnitType;

  @ApiPropertyOptional({ example: 1500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyRent?: number;

  @ApiPropertyOptional({ example: 3000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  deposit?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @Min(0)
  @IsOptional()
  floorNumber?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasBalcony?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hasParkingSpace?: boolean;

  @ApiPropertyOptional({ example: 'Air conditioning, Hot water' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  amenities?: string;
}

export class UpdateUnitDto {
  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  unitNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: UnitType })
  @IsEnum(UnitType)
  @IsOptional()
  type?: UnitType;

  @ApiPropertyOptional({ enum: UnitStatus })
  @IsEnum(UnitStatus)
  @IsOptional()
  status?: UnitStatus;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyRent?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  deposit?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  floorNumber?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasBalcony?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasParkingSpace?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  amenities?: string;
}
