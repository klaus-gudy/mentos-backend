import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateUnitDto, UnitResponseDto, UpdateUnitDto } from './dto/unit.dto';
import { UnitsService } from './units.service';

@ApiTags('units')
@ApiBearerAuth()
@Controller('properties/:propertyCode/units')
export class UnitsController {
  constructor(private readonly units: UnitsService) {}

  @Post()
  @Permissions('unit.create')
  @ApiOperation({
    summary: 'Create a unit in a property',
    description: 'The unit code is auto-generated per property (U-101, U-102, etc).',
  })
  @ApiResponse({ status: 201, type: UnitResponseDto })
  create(@Param('propertyCode') propertyCode: string, @Body() dto: CreateUnitDto): Promise<UnitResponseDto> {
    return this.units.create(propertyCode, dto);
  }

  @Get()
  @Permissions('unit.read')
  @ApiOperation({
    summary: 'List all units in a property',
    description: 'Sorted by unit code.',
  })
  @ApiResponse({ status: 200, type: [UnitResponseDto] })
  findByProperty(@Param('propertyCode') propertyCode: string): Promise<UnitResponseDto[]> {
    return this.units.findByPropertyCode(propertyCode);
  }

  @Get(':code')
  @Permissions('unit.read')
  @ApiOperation({ summary: 'Get one unit by code' })
  @ApiResponse({ status: 200, type: UnitResponseDto })
  findOne(@Param('code') code: string): Promise<UnitResponseDto> {
    return this.units.findOne(code);
  }

  @Patch(':code')
  @Permissions('unit.update')
  @ApiOperation({ summary: 'Update a unit' })
  @ApiResponse({ status: 200, type: UnitResponseDto })
  update(@Param('code') code: string, @Body() dto: UpdateUnitDto): Promise<UnitResponseDto> {
    return this.units.update(code, dto);
  }
}
