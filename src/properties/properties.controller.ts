import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreatePropertyDto, PropertyResponseDto, UpdatePropertyDto } from './dto/property.dto';
import { PropertiesService } from './properties.service';

@ApiTags('properties')
@ApiBearerAuth()
@Controller('properties')
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

  @Post()
  @Permissions('property.create')
  @ApiOperation({ summary: 'Create a new property' })
  @ApiResponse({ status: 201, type: PropertyResponseDto })
  create(@Body() dto: CreatePropertyDto): Promise<PropertyResponseDto> {
    return this.properties.create(dto);
  }

  @Get()
  @Permissions('property.read')
  @ApiOperation({
    summary: 'List all properties',
    description:
      'Returns every property, including archived ones, without their units — use GET /{code} for details.',
  })
  @ApiResponse({ status: 200, type: [PropertyResponseDto] })
  findAll(): Promise<PropertyResponseDto[]> {
    return this.properties.findAll();
  }

  @Get(':code')
  @Permissions('property.read')
  @ApiOperation({
    summary: 'Get property details with all units',
    description: 'Includes the full list of units in this property, sorted by code.',
  })
  @ApiResponse({ status: 200, type: PropertyResponseDto })
  findOne(@Param('code') code: string): Promise<PropertyResponseDto> {
    return this.properties.findOne(code);
  }

  @Patch(':code')
  @Permissions('property.update')
  @ApiOperation({ summary: 'Update property details' })
  @ApiResponse({ status: 200, type: PropertyResponseDto })
  update(
    @Param('code') code: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<PropertyResponseDto> {
    return this.properties.update(code, dto);
  }

  @Post(':code/archive')
  @Permissions('property.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a property', description: 'Sets status to archived.' })
  archive(@Param('code') code: string): Promise<PropertyResponseDto> {
    return this.properties.archive(code);
  }
}
