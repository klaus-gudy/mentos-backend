import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  AssignMaintenanceDto,
  CompleteMaintenanceDto,
  CreateMaintenanceRequestDto,
  MaintenanceRequestResponseDto,
} from './dto/maintenance-request.dto';
import { MaintenanceService } from './maintenance.service';

/**
 * State machine: open → assigned → in_progress → completed → closed.
 * Permission mapping follows the catalog's own labels: `maintenance.assign`
 * ("Assign staff") gates assign+start; `maintenance.close` ("Close with
 * cost" — which is exactly what completing a request does) gates
 * complete+close.
 */
@ApiTags('maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Post()
  @Permissions('maintenance.create')
  @ApiOperation({ summary: 'Submit a maintenance request' })
  @ApiResponse({ status: 201, type: MaintenanceRequestResponseDto })
  create(@Body() dto: CreateMaintenanceRequestDto): Promise<MaintenanceRequestResponseDto> {
    return this.maintenance.create(dto);
  }

  @Get()
  @Permissions('maintenance.read')
  @ApiOperation({ summary: 'List all maintenance requests' })
  @ApiResponse({ status: 200, type: [MaintenanceRequestResponseDto] })
  findAll(): Promise<MaintenanceRequestResponseDto[]> {
    return this.maintenance.findAll();
  }

  @Get(':code')
  @Permissions('maintenance.read')
  @ApiOperation({ summary: 'Get one maintenance request' })
  @ApiResponse({ status: 200, type: MaintenanceRequestResponseDto })
  findOne(@Param('code') code: string): Promise<MaintenanceRequestResponseDto> {
    return this.maintenance.findOne(code);
  }

  @Post(':code/assign')
  @Permissions('maintenance.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign a technician',
    description: 'The technician must be active and cover the request’s category.',
  })
  @ApiResponse({ status: 200, type: MaintenanceRequestResponseDto })
  assign(
    @Param('code') code: string,
    @Body() dto: AssignMaintenanceDto,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenance.assign(code, dto);
  }

  @Post(':code/start')
  @Permissions('maintenance.assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark work as in progress', description: 'Must already be assigned.' })
  @ApiResponse({ status: 200, type: MaintenanceRequestResponseDto })
  start(@Param('code') code: string): Promise<MaintenanceRequestResponseDto> {
    return this.maintenance.start(code);
  }

  @Post(':code/complete')
  @Permissions('maintenance.close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete the work and record its cost', description: 'Must be in progress.' })
  @ApiResponse({ status: 200, type: MaintenanceRequestResponseDto })
  complete(
    @Param('code') code: string,
    @Body() dto: CompleteMaintenanceDto,
  ): Promise<MaintenanceRequestResponseDto> {
    return this.maintenance.complete(code, dto);
  }

  @Post(':code/close')
  @Permissions('maintenance.close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close the request', description: 'Must already be completed.' })
  @ApiResponse({ status: 200, type: MaintenanceRequestResponseDto })
  close(@Param('code') code: string): Promise<MaintenanceRequestResponseDto> {
    return this.maintenance.close(code);
  }
}
