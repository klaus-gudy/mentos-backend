import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { UnitResponseDto } from './dto/unit.dto';
import { UnitsService } from './units.service';

/**
 * Flat unit reads, mirroring the frontend's `api.units()` — it fetches every
 * unit in one call and filters by `propId` client-side (no server-side
 * pagination yet, per BACKEND_PLAN.md's scope-saver). Creation and per-property
 * listing live on UnitsController since they need a property in context.
 */
@ApiTags('units')
@ApiBearerAuth()
@Controller('units')
export class UnitsFlatController {
  constructor(private readonly units: UnitsService) {}

  @Get()
  @Permissions('unit.read')
  @ApiOperation({ summary: 'List every unit across all properties' })
  @ApiResponse({ status: 200, type: [UnitResponseDto] })
  findAll(): Promise<UnitResponseDto[]> {
    return this.units.findAll();
  }

  @Get(':code')
  @Permissions('unit.read')
  @ApiOperation({ summary: 'Get one unit by code' })
  @ApiResponse({ status: 200, type: UnitResponseDto })
  findOne(@Param('code') code: string): Promise<UnitResponseDto> {
    return this.units.findOne(code);
  }
}
