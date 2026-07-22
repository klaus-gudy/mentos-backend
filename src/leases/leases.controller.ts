import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  CreateLeaseDto,
  LeaseResponseDto,
  TerminateLeaseDto,
  UpdateLeaseDto,
} from './dto/lease.dto';
import { LeasesService } from './leases.service';

@ApiTags('leases')
@ApiBearerAuth()
@Controller('leases')
export class LeasesController {
  constructor(private readonly leases: LeasesService) {}

  @Post()
  @Permissions('lease.create')
  @ApiOperation({
    summary: 'Create a lease',
    description:
      'Occupies the unit and activates the tenant in one transaction, and generates the first invoice. ' +
      'Fails if the unit is already occupied or the tenant already holds an active lease.',
  })
  @ApiResponse({ status: 201, type: LeaseResponseDto })
  @ApiResponse({ status: 409, description: 'Unit already occupied, or tenant already leased' })
  create(@Body() dto: CreateLeaseDto): Promise<LeaseResponseDto> {
    return this.leases.create(dto);
  }

  @Get()
  @Permissions('lease.read')
  @ApiOperation({ summary: 'List all leases' })
  @ApiResponse({ status: 200, type: [LeaseResponseDto] })
  findAll(): Promise<LeaseResponseDto[]> {
    return this.leases.findAll();
  }

  @Get(':code')
  @Permissions('lease.read')
  @ApiOperation({ summary: 'Get one lease' })
  @ApiResponse({ status: 200, type: LeaseResponseDto })
  findOne(@Param('code') code: string): Promise<LeaseResponseDto> {
    return this.leases.findOne(code);
  }

  @Patch(':code')
  @Permissions('lease.update')
  @ApiOperation({
    summary: 'Edit lease terms',
    description: 'Rent, deposit, frequency and the free-text terms. Not the tenant, unit or dates.',
  })
  @ApiResponse({ status: 200, type: LeaseResponseDto })
  update(@Param('code') code: string, @Body() dto: UpdateLeaseDto): Promise<LeaseResponseDto> {
    return this.leases.update(code, dto);
  }

  @Post(':code/terminate')
  @Permissions('lease.terminate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Terminate a lease early',
    description: 'Vacates the unit and reverts the tenant to "vacated".',
  })
  @ApiResponse({ status: 200, type: LeaseResponseDto })
  terminate(
    @Param('code') code: string,
    @Body() dto: TerminateLeaseDto,
  ): Promise<LeaseResponseDto> {
    return this.leases.terminate(code, dto);
  }
}
