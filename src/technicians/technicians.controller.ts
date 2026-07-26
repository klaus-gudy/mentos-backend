import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateTechnicianDto, TechnicianResponseDto } from './dto/technician.dto';
import { TechniciansService } from './technicians.service';

/**
 * No `technician` resource exists in the frontend's RBAC catalog — gated
 * under the closest existing `maintenance.*` permissions instead of inventing
 * one (see ARCHITECTURE.md §9): `maintenance.assign` for creating a
 * technician (the point of adding one is to make them assignable),
 * `maintenance.read` for browsing the directory.
 */
@ApiTags('technicians')
@ApiBearerAuth()
@Controller('technicians')
export class TechniciansController {
  constructor(private readonly technicians: TechniciansService) {}

  @Post()
  @Permissions('maintenance.assign')
  @ApiOperation({ summary: 'Register a technician or vendor' })
  @ApiResponse({ status: 201, type: TechnicianResponseDto })
  create(@Body() dto: CreateTechnicianDto): Promise<TechnicianResponseDto> {
    return this.technicians.create(dto);
  }

  @Get()
  @Permissions('maintenance.read')
  @ApiOperation({ summary: 'List all technicians' })
  @ApiResponse({ status: 200, type: [TechnicianResponseDto] })
  findAll(): Promise<TechnicianResponseDto[]> {
    return this.technicians.findAll();
  }

  @Get(':code')
  @Permissions('maintenance.read')
  @ApiOperation({ summary: 'Get one technician' })
  @ApiResponse({ status: 200, type: TechnicianResponseDto })
  findOne(@Param('code') code: string): Promise<TechnicianResponseDto> {
    return this.technicians.findOne(code);
  }
}
