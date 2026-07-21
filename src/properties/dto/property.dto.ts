import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Property, PropertyStatus, PropertyType } from '../entities/property.entity';
import { UnitResponseDto } from '../../units/dto/unit.dto';

/** Frontend-facing property shape (mentos-frontend `Property`). */
export class PropertyResponseDto {
  @ApiProperty({ example: 'P-1', description: 'Business code, used as id by frontend' })
  id: string;

  @ApiProperty({ example: 'Riverside Apartments' })
  name: string;

  @ApiProperty({ example: 'A modern apartment complex with 12 units' })
  description: string;

  @ApiProperty({ example: '123 Main Street' })
  address: string;

  @ApiProperty({ example: 'Dar es Salaam' })
  city: string;

  @ApiProperty({ example: '10101' })
  zipCode: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.Residential })
  type: PropertyType;

  @ApiProperty({ example: 'Residential', description: 'Display label derived from type' })
  typeLabel: string;

  @ApiProperty({ enum: PropertyStatus, example: PropertyStatus.Active })
  status: PropertyStatus;

  @ApiProperty({ example: 12, description: 'Count of units in this property' })
  unitCount: number;

  @ApiPropertyOptional({
    type: [UnitResponseDto],
    description: 'Units in this property (only in detail endpoint)',
  })
  units?: UnitResponseDto[];

  static from(property: Property, includeUnits = false): PropertyResponseDto {
    return {
      id: property.code,
      name: property.name,
      description: property.description || '',
      address: property.address,
      city: property.city || '',
      zipCode: property.zipCode || '',
      type: property.type,
      typeLabel: property.typeLabel,
      status: property.status,
      unitCount: property.unitCount,
      ...(includeUnits && property.units
        ? { units: property.units.map((u) => UnitResponseDto.from(u)) }
        : {}),
    };
  }

  static fromMany(properties: Property[]): PropertyResponseDto[] {
    return properties.map((p) => PropertyResponseDto.from(p));
  }
}

export class CreatePropertyDto {
  @ApiProperty({ example: 'Riverside Apartments' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'A modern apartment complex' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;

  @ApiPropertyOptional({ example: 'Dar es Salaam' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: '10101' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ enum: PropertyType, example: PropertyType.Residential })
  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;
}

export class UpdatePropertyDto {
  @ApiPropertyOptional({ example: 'Updated Name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;
}
