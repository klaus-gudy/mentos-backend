import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { UnitResponseDto } from '../../units/dto/unit.dto';
import { Property, PropertyStatus, PropertyType } from '../entities/property.entity';

/** Frontend-facing property shape — mirrors mentos-frontend's `Property` exactly. */
export class PropertyResponseDto {
  @ApiProperty({ example: 'P-01', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'Mwenge Apartments' })
  name: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.Apartment })
  type: PropertyType;

  @ApiProperty({ example: 'Apartments', description: 'Display label derived from type' })
  typeLabel: string;

  @ApiProperty({ example: 'Residential', description: 'Residential/Commercial, derived from type' })
  cat: 'Residential' | 'Commercial';

  @ApiProperty({ example: 'Kinondoni', description: 'Neighborhood' })
  area: string;

  @ApiProperty({ example: 'Dar es Salaam' })
  city: string;

  @ApiProperty({ example: 'Aziz Holdings Ltd', description: "Landlord's display name" })
  owner: string;

  @ApiProperty({ enum: PropertyStatus, example: PropertyStatus.Active })
  status: PropertyStatus;

  @ApiPropertyOptional({ example: 'A modern apartment complex with 12 units' })
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['Parking', '24/7 security'] })
  amenities?: string[];

  @ApiPropertyOptional({
    type: [UnitResponseDto],
    description: 'Units in this property (only on the detail endpoint)',
  })
  units?: UnitResponseDto[];

  static from(property: Property, includeUnits = false): PropertyResponseDto {
    return {
      id: property.code,
      name: property.name,
      type: property.type,
      typeLabel: property.typeLabel,
      cat: property.cat,
      area: property.area,
      city: property.city,
      owner: property.owner,
      status: property.status,
      description: property.description ?? '',
      amenities: property.amenities,
      ...(includeUnits && property.units
        ? { units: property.units.map((u) => UnitResponseDto.from(u)) }
        : {}),
    };
  }

  static fromMany(properties: Property[]): PropertyResponseDto[] {
    return properties.map((p) => PropertyResponseDto.from(p));
  }
}

/** Mirrors mentos-frontend's `NewPropertyInput`. */
export class CreatePropertyDto {
  @ApiProperty({ example: 'Mwenge Apartments' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.Apartment })
  @IsEnum(PropertyType)
  type: PropertyType;

  @ApiPropertyOptional({ example: 'Kinondoni', description: 'Defaults to "—" if omitted' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({ example: 'Dar es Salaam', description: 'Defaults to "Dar es Salaam"' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Aziz Holdings Ltd', description: 'Defaults to "—" if omitted' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  owner?: string;

  @ApiPropertyOptional({ example: 'A modern apartment complex with 12 units' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Parking', '24/7 security'],
    description: 'Defaults to ["Parking", "24/7 security"] if omitted or empty',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  @Type(() => String)
  amenities?: string[];
}

/** Mirrors mentos-frontend's `UpdatePropertyInput`. */
export class UpdatePropertyDto {
  @ApiPropertyOptional({ example: 'Mwenge Apartments' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;

  @ApiPropertyOptional({ example: 'Kinondoni' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  area?: string;

  @ApiPropertyOptional({ example: 'Dar es Salaam' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Aziz Holdings Ltd' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  owner?: string;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ type: [String], example: ['Parking', 'Gym'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  amenities?: string[];
}
