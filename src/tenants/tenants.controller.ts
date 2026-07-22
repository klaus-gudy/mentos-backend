import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  BlacklistTenantDto,
  CreateTenantDto,
  TenantResponseDto,
  UpdateTenantDto,
} from './dto/tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  @Permissions('tenant.create')
  @ApiOperation({
    summary: 'Onboard a prospective tenant',
    description:
      'Creates a tenant with status "prospective" and no unit — occupancy is set later by creating a lease.',
  })
  @ApiResponse({ status: 201, type: TenantResponseDto })
  create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenants.create(dto);
  }

  @Get()
  @Permissions('tenant.read')
  @ApiOperation({ summary: 'List all tenants' })
  @ApiResponse({ status: 200, type: [TenantResponseDto] })
  findAll(): Promise<TenantResponseDto[]> {
    return this.tenants.findAll();
  }

  @Get(':code')
  @Permissions('tenant.read')
  @ApiOperation({ summary: 'Get one tenant, with their unit/property if occupied' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  findOne(@Param('code') code: string): Promise<TenantResponseDto> {
    return this.tenants.findOne(code);
  }

  @Patch(':code')
  @Permissions('tenant.update')
  @ApiOperation({
    summary: 'Update contact & identity details',
    description: 'Name, status and unit assignment are not editable here.',
  })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  update(@Param('code') code: string, @Body() dto: UpdateTenantDto): Promise<TenantResponseDto> {
    return this.tenants.update(code, dto);
  }

  @Post(':code/blacklist')
  @Permissions('tenant.blacklist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Blacklist a tenant',
    description: 'Vacates their unit, if any, and marks the tenant blacklisted.',
  })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  blacklist(
    @Param('code') code: string,
    @Body() dto: BlacklistTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenants.blacklist(code, dto);
  }
}
